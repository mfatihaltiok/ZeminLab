import type { FoundationType, UnitSystem } from '../models/project'

export type SurfaceFoundationMethod = 'TBDY-2018' | 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'
export interface SurfaceFoundationInput {
  B: number; L: number; Df: number; gamma1: number; gamma2: number; c: number; phi: number
  verticalLoad: number; horizontalLoad?: number; momentX?: number; momentY?: number
  groundSlope?: number; baseSlope?: number; resistanceFactor?: number; method?: SurfaceFoundationMethod
  safetyFactor?: number; undrainedCu?: number; foundationType?: FoundationType; unitSystem?: UnitSystem
}
export interface SurfaceFoundationResult {
  Nq:number; Nc:number; Ngamma:number; sc:number; sq:number; sg:number; dc:number; dq:number; dg:number
  ic:number; iq:number; ig:number; gc:number; gq:number; gg:number; bc:number; bq:number; bg:number
  surcharge:number; ex:number; ey:number; Be:number; Le:number; effectiveArea:number
  qk:number; qt:number; qo:number; utilization:number; adequate:boolean
  ultimateClassical?:number; allowableClassical?:number; undrainedQk?:number
  method:SurfaceFoundationMethod; foundationType:FoundationType; warnings:string[]
}

const rad=(deg:number)=>deg*Math.PI/180
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x))

/**
 * TBDY 2018 Denk. 16.8a-16.8b ve literatürde verilen genel düzeltme katsayıları.
 * Kapasite qk, yapısal yükten bağımsız zemin/temel kapasitesidir; verticalLoad yalnızca
 * etkin taban basıncı qo ve eksantrisite kontrolü için kullanılır.
 */
export function calculateSurfaceFoundation(i:SurfaceFoundationInput):SurfaceFoundationResult{
  if(i.B<=0||i.L<=0)throw new Error('Temel B ve L boyutları m cinsinden sıfırdan büyük olmalıdır.')
  if(i.Df<0)throw new Error('Df negatif olamaz.')
  if(i.gamma1<=0||i.gamma2<=0)throw new Error('γ değerleri proje biriminde pozitif olmalıdır.')
  if(i.c<0)throw new Error('Kohezyon c negatif olamaz.')
  if(i.verticalLoad<0)throw new Error('Düşey temel yükü negatif olamaz.')

  const phi=clamp(i.phi,0,50), t=Math.tan(rad(phi)), sinPhi=Math.sin(rad(phi))
  const method=i.method??'TBDY-2018', foundationType=i.foundationType??'tekil'
  const Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2
  const Nc=phi===0?5.14:(Nq-1)/t

  // TBDY 2018 Denk. 16.8b: Nγ = 2(Nq−1)tanφ′
  let Ngamma=phi===0?0:2*(Nq-1)*t
  if(method==='Meyerhof')Ngamma=phi===0?0:(Nq-1)*Math.tan(1.4*rad(phi))
  if(method==='Hansen')Ngamma=phi===0?0:1.5*(Nq-1)*t
  if(method==='Vesic')Ngamma=phi===0?0:2*(Nq+1)*t

  const N=i.verticalLoad
  const H=Math.abs(i.horizontalLoad??0)
  const warnings:string[]=[]
  const ex=N>0?(i.momentY??0)/N:0
  const ey=N>0?(i.momentX??0)/N:0
  if(N===0&&((i.momentX??0)!==0||(i.momentY??0)!==0))warnings.push('Düşey yük sıfır olduğu için momentten eksantrisite hesaplanamadı.')
  if(N===0&&H>0)warnings.push('Düşey yük sıfır olduğu için yatay yük etkisi taşıma gücü kullanım oranına bağlanamadı.')

  // TBDY/JMO gösterimindeki etkin boyutlar: B′ kısa, L′ uzun kenardır.
  const Be=Math.max(0,i.B-2*Math.abs(ex))
  const Le=Math.max(0,i.L-2*Math.abs(ey))
  const Bp=Math.min(Be,Le)
  const Lp=Math.max(Be,Le)
  const effectiveArea=Be*Le
  if(Be<=0||Le<=0)warnings.push('Eksantrisite nedeniyle etkin temel boyutlarından biri sıfır veya negatiftir.')
  if(Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6)warnings.push('Eksantrisite B/6 veya L/6 sınırını aşıyor; tabanda çekme oluşabilir.')

  const ratio=Lp>0?Bp/Lp:1
  const isStrip=foundationType==='surekli'
  const isSquare=foundationType==='tekil'&&Math.abs(Be-Le)<=1e-9
  let sc=1,sq=1,sg=1,dc=1,dq=1,dg=1

  if(method==='Terzaghi'){
    sc=isStrip?1:isSquare?1.3:1+0.3*ratio
    sq=1
    sg=isStrip?1:isSquare?0.8:1-0.2*ratio
  }else if(method==='Meyerhof'){
    const Kp=Math.tan(Math.PI/4+rad(phi)/2)**2
    sc=isStrip?1:1+0.2*Kp*ratio
    sq=isStrip?1:phi>10?1+0.1*Kp*ratio:1
    sg=isStrip?1:phi>10?1+0.1*Kp*ratio:1
    const k=Math.min(i.Df/Math.max(Bp,1e-9),1)
    dc=1+0.2*Math.sqrt(Kp)*k
    dq=phi>10?1+0.1*Math.sqrt(Kp)*k:1
  }else{
    sc=isStrip?1:1+ratio*(Nq/Math.max(Nc,1e-9))
    sq=isStrip?1:1+ratio*(method==='Vesic'||method==='TBDY-2018'?t:sinPhi)
    sg=isStrip?1:Math.max(0.6,1-0.4*ratio)
    const k=Math.min(i.Df/Math.max(Bp,1e-9),1)
    dc=1+0.4*k
    dq=1+2*k*t*(1-sinPhi)**2
  }

  let ic=1,iq=1,ig=1
  if(method!=='Terzaghi'&&N>0){
    const loadRatio=Math.min(0.999999,H/Math.max(N,1e-9))
    const m=(2+ratio)/(1+ratio)
    const common=Math.max(0,1-loadRatio)
    iq=common**m
    ig=common**(m+1)
    ic=phi===0?1:Math.max(0,1-H/Math.max(i.B*i.L*i.c*Nc,1e-9))
  }

  let gc=1,gq=1,gg=1,bc=1,bq=1,bg=1
  if(method==='Hansen'||method==='Vesic'||method==='TBDY-2018'){
    const beta=Math.abs(i.groundSlope??0),eta=Math.abs(i.baseSlope??0)
    if(beta>0){gq=Math.max(0,(1-Math.tan(rad(beta)))**2);gc=Math.max(0,1-beta/147);gg=gc}
    if(eta>0){bq=Math.max(0,(1-Math.tan(rad(eta))*t)**2);bc=Math.max(0,1-eta/147);bg=bq}
  }

  const surcharge=i.Df*i.gamma1
  const qk=i.c*Nc*sc*dc*ic*gc*bc
    +surcharge*Nq*sq*dq*iq*gq*bq
    +0.5*i.gamma2*Bp*Ngamma*sg*dg*ig*gg*bg

  const resistanceFactor=i.resistanceFactor??1.4
  const qt=method==='TBDY-2018'?qk/resistanceFactor:qk
  const qo=effectiveArea>0?N/effectiveArea:0
  const utilization=qt>0?qo/qt:0
  const ultimateClassical=i.c*Nc*sc*dc+surcharge*Nq*sq*dq+0.5*i.gamma2*Bp*Ngamma*sg*dg
  const allowableClassical=i.safetyFactor&&i.safetyFactor>0?ultimateClassical/i.safetyFactor:undefined
  let undrainedQk:number|undefined
  if(i.undrainedCu!=null&&i.undrainedCu>=0)undrainedQk=i.undrainedCu*5.14*sc*dc+surcharge

  if(method==='TBDY-2018'&&resistanceFactor!==1.4)warnings.push('TBDY 2018 Tablo 16.2 yüzeysel temel taşıma gücü için γRv = 1.40 kullanılmalıdır.')
  if(method==='TBDY-2018'&&foundationType==='radye')warnings.push('Radye temel için taşıma gücü kontrolüne ek olarak TBDY 16.8.3.4 yerdeğiştirme/oturma koşulu ayrıca değerlendirilmelidir.')

  return{Nq,Nc,Ngamma,sc,sq,sg,dc,dq,dg,ic,iq,ig,gc,gq,gg,bc,bq,bg,surcharge,ex,ey,Be,Le,effectiveArea,qk,qt,qo,utilization,adequate:qo<=qt&&Be>0&&Le>0,ultimateClassical,allowableClassical,undrainedQk,method,foundationType,warnings}
}
