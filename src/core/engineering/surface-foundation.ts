import type { FoundationType, UnitSystem } from '../models/project'

export type SurfaceFoundationMethod = 'TBDY-2018' | 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'

export interface SurfaceFoundationLayer {
  topDepth: number
  bottomDepth: number
  gamma: number
  gammaSat?: number
  cohesion: number
  phi: number
  name?: string
}

export interface SurfaceFoundationInput {
  B: number
  L: number
  Df: number
  gamma1: number
  gamma2?: number
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

export interface SurfaceFoundationStep {
  symbol: string
  title: string
  formula: string
  value?: number
  unit?: string
  note?: string
  source?: string
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
  layerChecks:Array<{top:number;bottom:number;c:number;phi:number;gamma:number;qk:number;controlling:boolean}>
  warnings:string[]
  method:SurfaceFoundationMethod; foundationType:FoundationType
  source:string
  steps:SurfaceFoundationStep[]
  value: {
    Nq:number; Nc:number; Ngamma:number; sc:number; sq:number; sg:number; dc:number; dq:number; dg:number
    ic:number; iq:number; ig:number; gc:number; gq:number; gg:number; bc:number; bq:number; bg:number
    surcharge:number; gammaBelow:number; ex:number; ey:number; Be:number; Le:number; effectiveArea:number
    qk:number; qt:number; qo:number; utilization:number; adequate:boolean; effectiveDepth:number
  }
}

const gammaW=9.80665
const rad=(deg:number)=>deg*Math.PI/180
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x))

function factors(phiDeg:number, method:SurfaceFoundationMethod){
  const phi=clamp(phiDeg,0,50)
  const t=Math.tan(rad(phi))
  const Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2
  const Nc=phi===0?5.14:(Nq-1)/Math.max(t,1e-12)
  let Ngamma=0
  if(phi>0){
    if(method==='Meyerhof') Ngamma=(Nq-1)*Math.tan(rad(1.4*phi))
    else if(method==='Hansen') Ngamma=1.5*(Nq-1)*t
    else if(method==='Vesic') Ngamma=2*(Nq+1)*t
    else Ngamma=2*(Nq-1)*t
  }
  return {phi,t,Nq,Nc,Ngamma}
}

function groundwater(Df:number,B:number,gammaNatural:number,gammaSat?:number,gwt?:number){
  const gs=Math.max((finite(gammaSat)?gammaSat:gammaNatural)-gammaW,0.001)
  if(!finite(gwt)||gwt!<0)return{surcharge:gammaNatural*Df,gammaBelow:gammaNatural}
  if(gwt<=Df){
    return{surcharge:gammaNatural*Math.max(gwt,0)+gs*Math.max(Df-Math.max(gwt,0),0),gammaBelow:gs}
  }
  if(gwt<=Df+B){
    const z=gwt-Df
    return{surcharge:gammaNatural*Df,gammaBelow:gs+(z/B)*(gammaNatural-gs)}
  }
  return{surcharge:gammaNatural*Df,gammaBelow:gammaNatural}
}

function methodFactors(method:SurfaceFoundationMethod,B:number,L:number,Df:number,phi:number,Nq:number,Nc:number,H:number,N:number,c:number){
  const r=B/Math.max(L,1e-9),t=Math.tan(rad(phi)),sin=Math.sin(rad(phi))
  if(method==='Terzaghi')return{sc:Math.abs(B-L)<1e-9?1.3:1,sq:1,sg:Math.abs(B-L)<1e-9?.8:1,dc:1,dq:1,dg:1,ic:1,iq:1,ig:1,gc:1,gq:1,gg:1,bc:1,bq:1,bg:1}
  const Nphi=Math.tan(Math.PI/4+rad(phi)/2)**2
  const sc=method==='Meyerhof'?1+0.2*Nphi*r:1+(Nq/Math.max(Nc,1e-9))*r
  const sq=method==='Meyerhof'?(phi>10?1+0.1*Nphi*r:1):1+r*t
  const sg=method==='Meyerhof'?(phi>10?sq:1):Math.max(.6,1-.4*r)
  const k=Df/Math.max(B,1e-9),kk=k<=1?k:Math.atan(k)
  const dc=method==='Meyerhof'?1+0.2*Math.sqrt(Nphi)*k:1+.4*kk
  const dq=method==='Meyerhof'?(phi>10?1+.1*Math.sqrt(Nphi)*k:1):1+2*t*(1-sin)**2*kk
  let ic=1,iq=1,ig=1
  if(H>0&&N>0){
    const denom=N+Math.max(B*L*c/Math.max(t,1e-9),0)
    const ratio=Math.min(.999999,H/Math.max(denom,1e-9))
    const m=(2+r)/(1+r)
    iq=Math.max(0,(1-ratio)**m)
    ic=phi===0?Math.max(0,1-H/Math.max(B*L*c*Nc,1e-9)):Math.max(0,iq-(1-iq)/Math.max(Nq-1,1e-9))
    ig=phi===0?0:Math.max(0,(1-ratio)**(m+1))
  }
  const beta=Math.abs(0),eta=Math.abs(0)
  void beta; void eta
  return{sc,sq,sg,dc,dq,dg:1,ic,iq,ig,gc:1,gq:1,gg:1,bc:1,bq:1,bg:1}
}

function layerChecks(layers:SurfaceFoundationLayer[]|undefined,Df:number,influence:number,baseQ:number,mf:ReturnType<typeof methodFactors>,method:SurfaceFoundationMethod){
  if(!layers?.length)return[]
  const active=layers.filter(l=>l.bottomDepth>Df&&l.topDepth<Df+influence&&l.bottomDepth>l.topDepth&&finite(l.cohesion)&&finite(l.phi)&&finite(l.gamma))
  return active.map(l=>{
    const phi=clamp(l.phi,0,50), ff=factors(phi,method)
    const gamma=l.gammaSat!=null?Math.max(l.gammaSat-gammaW,.001):Math.max(l.gamma,.001)
    const qk=Math.max(0,l.cohesion)*ff.Nc*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc
      +baseQ*ff.Nq*mf.sq*mf.dq*mf.iq*mf.gq*mf.bq
      +0.5*gamma*Math.max(0.01,Math.min(1e3,influence))*ff.Ngamma*mf.sg*mf.dg*mf.ig*mf.gg*mf.bg
    return{top:l.topDepth,bottom:l.bottomDepth,c:l.cohesion,phi,gamma,qk,controlling:false}
  })
}

export function calculateSurfaceFoundation(i:SurfaceFoundationInput):SurfaceFoundationResult{
  if(i.B<=0||i.L<=0||i.Df<0)throw new Error('Temel B ve L boyutları pozitif, Df negatif olmayan değer olmalıdır.')
  if(i.gamma1<=0)throw new Error('γ doğal birim hacim ağırlığı pozitif olmalıdır.')
  if(finite(i.groundwaterDepth)&&i.groundwaterDepth!>=0&&(!finite(i.gamma2)||i.gamma2!<=0))throw new Error('YASS tanımlandıysa γsat pozitif olmalıdır.')
  if(i.c<0||i.verticalLoad<0)throw new Error('c negatif, düşey yük ise negatif olamaz.')
  const method=i.method??'TBDY-2018',foundationType=i.foundationType??'tekil',N=i.verticalLoad,H=Math.abs(i.horizontalLoad??0)
  const warnings:string[]=[]
  const ex=N>0?(i.momentY??0)/N:0,ey=N>0?(i.momentX??0)/N:0
  if(N===0&&(i.momentX!==0||i.momentY!==0))warnings.push('N=0 iken momentten eksantrisite hesaplanamaz.')
  const Be=i.B-2*Math.abs(ex),Le=i.L-2*Math.abs(ey),effectiveArea=Math.max(0,Be)*Math.max(0,Le)
  if(Be<=0||Le<=0)warnings.push('Eksantrisite temel boyutunu tüketiyor; q0 tasarım kontrolü geçerli değildir.')
  if(Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6)warnings.push('Eksantrisite çekirdek dışına çıkıyor; qmin<0 ve gerçek temas alanı ayrıca değerlendirilmelidir.')
  const Bp=Math.min(Math.max(Be,1e-9),Math.max(Le,1e-9)),Lp=Math.max(Be,Le)
  const f=factors(i.phi,method),water=groundwater(i.Df,Bp,i.gamma1,i.gamma2,i.groundwaterDepth)
  const mf=methodFactors(method,Bp,Lp,i.Df,f.phi,f.Nq,f.Nc,H,N,i.c)
  const qk=i.c*f.Nc*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+water.surcharge*f.Nq*mf.sq*mf.dq*mf.iq*mf.gq*mf.bq+0.5*water.gammaBelow*Bp*f.Ngamma*mf.sg*mf.dg*mf.ig*mf.gg*mf.bg
  const resistanceFactor=method==='TBDY-2018'?i.resistanceFactor??1.4:1
  const qt=qk/Math.max(resistanceFactor,1e-9)
  const qo=effectiveArea>0?N/effectiveArea:0
  const utilization=qt>0?qo/qt:Infinity
  const checks=layerChecks(i.layers,i.Df,2*Bp,water.surcharge,mf,method)
  if(checks.length){
    const min=Math.min(...checks.map(x=>x.qk))
    checks.forEach(x=>x.controlling=Math.abs(x.qk-min)<1e-9)
    warnings.push('Tabakalı profil: etkin derinlikteki tabakalar tek bir ortalama parametreye gizlenmedi. Her aktif tabaka ayrıca kontrol edildi; kontrol eden en düşük qk raporlandı.')
  }
  const controlling=checks.length?Math.min(qk,...checks.map(x=>x.qk)):qk
  const designQk=controlling
  const designQt=designQk/Math.max(resistanceFactor,1e-9)
  const adequate=qo<=designQt&&Be>0&&Le>0
  if(method==='TBDY-2018'&&Math.abs((i.resistanceFactor??1.4)-1.4)>1e-9)warnings.push('TBDY 2018 Tablo 16.2 yüzeysel temel için γRv=1.40 kullanılmalıdır; verilen değer yalnız açık kullanıcı override olarak kabul edildi.')
  if(finite(i.groundwaterDepth)&&i.groundwaterDepth!<=i.Df+Bp)warnings.push('YASS, temel tabanı çevresinde olduğundan γsat−γw ve/veya ağırlıklı γ kullanıldı.')
  if(foundationType==='radye')warnings.push('Radye temel için taşıma gücü yanında oturma/yerdeğiştirme koşulları ayrıca kontrol edilmelidir.')
  const resultBase={
    Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,...mf,surcharge:water.surcharge,gammaBelow:water.gammaBelow,ex,ey,Be,Le,effectiveArea,
    qk:designQk,qt:designQt,qo,utilization:qo/Math.max(designQt,1e-9),adequate,effectiveDepth:2*Bp,
    representativeC:i.c,representativePhi:f.phi,representativeGamma:water.gammaBelow,ultimateClassical:qk,allowableClassical:qk/Math.max(i.safetyFactor??3,1e-9),
    undrainedQk:i.undrainedCu!=null?i.undrainedCu*5.14*mf.sc*mf.dc*mf.ic*mf.gc*mf.bc+water.surcharge:undefined,
    layerChecks:checks,warnings,method,foundationType
  }
  const steps:SurfaceFoundationStep[]=[
    {symbol:'eₓ/eᵧ',title:'Yük eksantriklikleri',formula:'eₓ=Mᵧ/N ; eᵧ=Mₓ/N',value:Math.max(Math.abs(ex),Math.abs(ey)),unit:'m'},
    {symbol:'B′/L′',title:'Etkin boyutlar',formula:'B′=B−2|eₓ| ; L′=L−2|eᵧ|',value:Math.min(Be,Le),unit:'m'},
    {symbol:'Nq/Nc/Nγ',title:'Taşıma gücü katsayıları',formula:'TBDY 2018 Denk. 16.8b',value:f.Nq},
    {symbol:'q',title:'Sürşarj',formula:'q=γ·Df (YASS düzeltmeli)',value:water.surcharge,unit:'kPa'},
    {symbol:'qk',title:'Karakteristik taşıma gücü',formula:'cNcscdcicgc bc + qNqsqdqiqgq bq + 0.5γ′B′Nγsγdγiγgγbγ',value:designQk,unit:'kPa'},
    {symbol:'qt',title:'Tasarım taşıma gücü',formula:'qt=qk/γRv ; γRv=1.40',value:designQt,unit:'kPa'},
    {symbol:'q0',title:'Tasarım etkisi',formula:'q0=N/(B′L′)',value:qo,unit:'kPa'},
    {symbol:'η',title:'Kullanım oranı',formula:'η=q0/qt',value:utilization}
  ]
  const value={Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,sc:mf.sc,sq:mf.sq,sg:mf.sg,dc:mf.dc,dq:mf.dq,dg:mf.dg,ic:mf.ic,iq:mf.iq,ig:mf.ig,gc:mf.gc,gq:mf.gq,gg:mf.gg,bc:mf.bc,bq:mf.bq,bg:mf.bg,surcharge:water.surcharge,gammaBelow:water.gammaBelow,ex,ey,Be,Le,effectiveArea,qk:designQk,qt:designQt,qo,utilization,adequate,effectiveDepth:2*Bp}
  return {...resultBase,source:'TBDY 2018 Bölüm 16.8.3.2 / Denklem 16.8; katmanlı zemin kontrolü için 16.8.3.3.',steps,value}
}
