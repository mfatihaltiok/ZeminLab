import type { FoundationType, UnitSystem } from '../models/project'

export type SurfaceFoundationMethod = 'TBDY-2018' | 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'

export interface SurfaceFoundationLayer {
  topDepth: number
  bottomDepth: number
  gamma: number
  gammaSat?: number
  cohesion: number
  phi: number
}

export interface SurfaceFoundationInput {
  B: number
  L: number
  Df: number
  gamma1: number
  gamma2: number
  c: number
  phi: number
  verticalLoad: number
  horizontalLoad?: number
  momentX?: number
  momentY?: number
  groundSlope?: number
  baseSlope?: number
  resistanceFactor?: number
  method?: SurfaceFoundationMethod
  safetyFactor?: number
  undrainedCu?: number
  foundationType?: FoundationType
  unitSystem?: UnitSystem
  groundwaterDepth?: number
  layers?: SurfaceFoundationLayer[]
}

export interface SurfaceFoundationResult {
  Nq:number; Nc:number; Ngamma:number
  sc:number; sq:number; sg:number; dc:number; dq:number; dg:number
  ic:number; iq:number; ig:number; gc:number; gq:number; gg:number
  bc:number; bq:number; bg:number
  surcharge:number; gammaBelow:number
  ex:number; ey:number; Be:number; Le:number; effectiveArea:number
  qk:number; qt:number; qo:number; utilization:number; adequate:boolean
  effectiveDepth:number
  representativeC:number; representativePhi:number; representativeGamma:number
  ultimateClassical?:number; allowableClassical?:number; undrainedQk?:number
  method:SurfaceFoundationMethod; foundationType:FoundationType
  warnings:string[]
}

const rad=(deg:number)=>deg*Math.PI/180
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x))
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const gammaW=9.80665

function bearingFactors(phi:number, method:SurfaceFoundationMethod){
  const t=Math.tan(rad(phi))
  const Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2
  const Nc=phi===0?5.14:(Nq-1)/t
  let Ngamma=phi===0?0:2*(Nq-1)*t
  if(method==='Terzaghi') Ngamma=phi===0?0:2*(Nq+1)*t
  if(method==='Meyerhof') Ngamma=phi===0?0:(Nq-1)*Math.tan(1.4*rad(phi))
  if(method==='Hansen') Ngamma=phi===0?0:1.5*(Nq-1)*t
  if(method==='Vesic') Ngamma=phi===0?0:2*(Nq+1)*t
  return {Nq,Nc,Ngamma,t,sinPhi:Math.sin(rad(phi))}
}

function groundwaterCorrection(Df:number,B:number,gammaNatural:number,gammaSat:number,gwt?:number){
  const gammaSub=Math.max(gammaSat-gammaW,0.001)
  if(!finite(gwt)||gwt!>=0) return {surcharge:gammaNatural*Df,gammaBelow:gammaNatural}
  if(gwt<=Df){
    const surcharge=gammaNatural*Math.max(gwt,0)+gammaSub*Math.max(Df-Math.max(gwt,0),0)
    return {surcharge,gammaBelow:gammaSub}
  }
  if(gwt<=Df+B){
    const surcharge=gammaNatural*Df
    const d=gwt-Df
    const gammaBelow=gammaSub+(d/B)*(gammaNatural-gammaSub)
    return {surcharge,gammaBelow:Math.max(gammaSub,Math.min(gammaNatural,gammaBelow))}
  }
  return {surcharge:gammaNatural*Df,gammaBelow:gammaNatural}
}

function layerEquivalent(
  layers:SurfaceFoundationLayer[]|undefined,
  Df:number,
  B:number,
  fallback:{c:number;phi:number;gamma:number}
){
  if(!layers?.length) return {c:fallback.c,phi:fallback.phi,gamma:fallback.gamma,effectiveDepth:2*B,used:false}
  const top=Df
  const bottom=Df+2*B
  let total=0,c=0,tanPhi=0,gamma=0
  for(const layer of layers){
    const h=Math.max(0,Math.min(layer.bottomDepth,bottom)-Math.max(layer.topDepth,top))
    if(h<=0) continue
    if(!finite(layer.cohesion)||!finite(layer.phi)||!finite(layer.gamma)) continue
    total+=h
    c+=h*Math.max(0,layer.cohesion)
    tanPhi+=h*Math.tan(rad(clamp(layer.phi,0,50)))
    gamma+=h*Math.max(layer.gamma,0)
  }
  if(total<=0) return {c:fallback.c,phi:fallback.phi,gamma:fallback.gamma,effectiveDepth:2*B,used:false}
  return {c:c/total,phi:(Math.atan(tanPhi/total)*180/Math.PI),gamma:gamma/total,effectiveDepth:2*B,used:true}
}

function correctionFactors(method:SurfaceFoundationMethod,phi:number,Bp:number,Lp:number,Df:number,H:number,N:number,c:number,Nc:number,Nq:number,t:number,groundSlope:number,baseSlope:number){
  const ratio=Bp/Math.max(Lp,1e-9)
  const Kp=Math.tan(Math.PI/4+rad(phi)/2)**2
  let sc=1,sq=1,sg=1,dc=1,dq=1,dg=1
  if(method==='Terzaghi'){
    sc=1+0.3*ratio
    sq=1
    sg=Math.max(0.6,1-0.2*ratio)
    if(Math.abs(Bp-Lp)<1e-9){sc=1.3;sg=0.8}
    if(Bp/Lp<0.1) {sc=1;sg=1}
  }else if(method==='Meyerhof'){
    sc=1+0.2*Kp*ratio
    sq=phi>10?1+0.1*Kp*ratio:1
    sg=phi>10?1+0.1*Kp*ratio:1
    const k=Math.min(Df/Math.max(Bp,1e-9),1)
    dc=1+0.2*Math.sqrt(Kp)*k
    dq=phi>10?1+0.1*Math.sqrt(Kp)*k:1
  }else{
    sc=1+ratio*(Nq/Math.max(Nc,1e-9))
    sq=1+ratio*t
    sg=Math.max(0.6,1-0.4*ratio)
    const k=Df/Math.max(Bp,1e-9)
    const a=k<=1?k:Math.atan(k)
    dc=phi===0?1+0.4*a:1+0.4*a
    dq=phi===0?1:1+2*t*(1-Math.sin(rad(phi)))**2*a
  }

  let ic=1,iq=1,ig=1
  if(H>0&&N>0){
    if(phi===0){
      ic=Math.max(0,1-H/Math.max(Bp*Lp*c*Nc,1e-9))
      iq=1; ig=1
    }else{
      const denom=N+Bp*Lp*c/Math.max(t,1e-9)
      const ratioH=Math.min(0.999999,H/Math.max(denom,1e-9))
      const m=(2+ratio)/(1+ratio)
      iq=Math.max(0,1-ratioH)**m
      ic=Math.max(0,iq-(1-iq)/(Nc*t))
      ig=Math.max(0,1-ratioH)**(m+1)
    }
  }

  let gc=1,gq=1,gg=1,bc=1,bq=1,bg=1
  if(method==='Hansen'||method==='Vesic'||method==='TBDY-2018'){
    const beta=Math.abs(groundSlope)
    const eta=Math.abs(baseSlope)
    if(beta>0){
      if(phi===0){gc=Math.max(0,1-beta/147);gq=1;gg=1}
      else{gq=Math.max(0,(1-Math.tan(rad(beta)))**2);gg=gq;gc=Math.max(0,gq-(1-gq)/(Nc*t))}
    }
    if(eta>0){
      if(phi===0){bc=Math.max(0,1-eta/147);bq=1;bg=1}
      else{bq=Math.max(0,(1-Math.tan(rad(eta))*t)**2);bg=bq;bc=Math.max(0,bq-(1-bq)/(Nc*t))}
    }
  }
  return {sc,sq,sg,dc,dq,dg,ic,iq,ig,gc,gq,gg,bc,bq,bg}
}

export function calculateSurfaceFoundation(i:SurfaceFoundationInput):SurfaceFoundationResult{
  if(i.B<=0||i.L<=0) throw new Error('Temel B ve L boyutları m cinsinden sıfırdan büyük olmalıdır.')
  if(i.Df<0) throw new Error('Df negatif olamaz.')
  if(i.gamma1<=0||i.gamma2<=0) throw new Error('γ değerleri pozitif olmalıdır.')
  if(i.c<0) throw new Error('Kohezyon c negatif olamaz.')
  if(i.verticalLoad<0) throw new Error('Düşey temel yükü negatif olamaz.')

  const method=i.method??'TBDY-2018'
  const foundationType=i.foundationType??'tekil'
  const N=i.verticalLoad
  const H=Math.abs(i.horizontalLoad??0)
  const warnings:string[]=[]
  const ex=N>0?(i.momentY??0)/N:0
  const ey=N>0?(i.momentX??0)/N:0
  if(N===0&&((i.momentX??0)!==0||(i.momentY??0)!==0)) warnings.push('Düşey yük sıfır olduğu için momentten eksantrisite hesaplanamadı.')
  const Be=Math.max(0,i.B-2*Math.abs(ex))
  const Le=Math.max(0,i.L-2*Math.abs(ey))
  const Bp=Math.min(Be,Le)
  const Lp=Math.max(Be,Le)
  const effectiveArea=Be*Le
  if(Be<=0||Le<=0) warnings.push('Eksantrisite nedeniyle etkin temel boyutlarından biri sıfır veya negatiftir.')
  if(Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6) warnings.push('Eksantrisite B/6 veya L/6 sınırını aşıyor; tabanda çekme oluşabilir.')
  if(N===0&&H>0) warnings.push('Düşey yük sıfır olduğu için yatay yük etkisi q₀ kullanım oranına bağlanamadı.')

  const fallback={c:i.c,phi:clamp(i.phi,0,50),gamma:i.gamma2}
  const eq=layerEquivalent(i.layers,i.Df,Math.max(Bp,1e-9),fallback)
  if(eq.used) warnings.push('TBDY 2018 16.8.3.3 kapsamında temel altındaki 2B etkin derinlikteki katmanlar ağırlıklı eşdeğer c ve tanφ ile hesaba katıldı.')
  else if(i.layers?.length) warnings.push('Tabakalı profil mevcut ancak etkin derinlikte gerekli c-φ-γ verileri eksik; hesap tek tabaka proje parametreleriyle sürdürüldü.')

  const phi=clamp(eq.phi,0,50)
  const {Nq,Nc,Ngamma,t,sinPhi}=bearingFactors(phi,method)
  const water=groundwaterCorrection(i.Df,Math.max(Bp,1e-9),i.gamma1,i.gamma2,i.groundwaterDepth)
  if(finite(i.groundwaterDepth)&&i.groundwaterDepth!<=i.Df+Math.max(Bp,1e-9)) warnings.push('YASS, temel tabanı ile Df+B′ aralığında olduğundan taşıma gücünün γ terimi efektif/submerged birim hacim ağırlıkla düzeltildi.')
  const factors=correctionFactors(method,phi,Math.max(Bp,1e-9),Math.max(Lp,1e-9),i.Df,H,N,eq.c,Nc,Nq,t, i.groundSlope??0,i.baseSlope??0)

  const qk=eq.c*Nc*factors.sc*factors.dc*factors.ic*factors.gc*factors.bc
    +water.surcharge*Nq*factors.sq*factors.dq*factors.iq*factors.gq*factors.bq
    +0.5*water.gammaBelow*Bp*Ngamma*factors.sg*factors.dg*factors.ig*factors.gg*factors.bg

  const resistanceFactor=i.resistanceFactor??1.4
  const qt=method==='TBDY-2018'?qk/Math.max(resistanceFactor,1e-9):qk
  const qo=effectiveArea>0?N/effectiveArea:0
  const utilization=qt>0?qo/qt:0
  const ultimateClassical=eq.c*Nc*factors.sc*factors.dc+water.surcharge*Nq*factors.sq*factors.dq+0.5*water.gammaBelow*Bp*Ngamma*factors.sg*factors.dg
  const allowableClassical=i.safetyFactor&&i.safetyFactor>0?ultimateClassical/i.safetyFactor:undefined
  const undrainedQk=i.undrainedCu!=null&&i.undrainedCu>=0?i.undrainedCu*5.14*factors.sc*factors.dc*factors.ic+water.surcharge:undefined

  if(method==='TBDY-2018'&&Math.abs(resistanceFactor-1.4)>1e-9) warnings.push('TBDY 2018 Tablo 16.2 yüzeysel temel taşıma gücü için γRv = 1.40 kullanılmalıdır.')
  if(method==='TBDY-2018'&&foundationType==='radye') warnings.push('Radye temel için taşıma gücü kontrolüne ek olarak TBDY 16.8.3.4 yerdeğiştirme/oturma koşulu ayrıca değerlendirilmelidir.')
  if(phi>=50) warnings.push('φ değeri 50° ile sınırlandırıldı; daha yüksek değerler için zemin parametresi ayrıca doğrulanmalıdır.')

  return {Nq,Nc,Ngamma,...factors,surcharge:water.surcharge,gammaBelow:water.gammaBelow,ex,ey,Be,Le,effectiveArea,qk,qt,qo,utilization,adequate:qo<=qt&&Be>0&&Le>0,effectiveDepth:eq.effectiveDepth,representativeC:eq.c,representativePhi:phi,representativeGamma:eq.gamma,ultimateClassical,allowableClassical,undrainedQk,method,foundationType,warnings}
}
