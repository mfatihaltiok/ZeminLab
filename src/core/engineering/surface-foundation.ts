import type { FoundationType } from '../models/project'
import { TBDY_GAMMA_RV } from '../models/project'

export type SurfaceFoundationMethod='TBDY-2018'

export interface SurfaceFoundationLayer{
  topDepth:number
  bottomDepth:number
  gamma:number
  gammaSat?:number
  cohesion:number
  phi:number
  name?:string
}

export interface SurfaceFoundationInput{
  B:number
  L:number
  Df:number
  gamma1:number
  gamma2?:number
  c:number
  phi:number
  verticalLoad:number
  /** Resultant horizontal load when no directional components are supplied. */
  horizontalLoad?:number
  /** Horizontal actions parallel to the B and L axes. */
  horizontalLoadB?:number
  horizontalLoadL?:number
  momentX?:number
  momentY?:number
  groundSlope?:number
  baseSlope?:number
  resistanceFactor?:number
  method?:SurfaceFoundationMethod
  safetyFactor?:number
  undrainedCu?:number
  foundationType?:FoundationType
  groundwaterDepth?:number
  layers?:SurfaceFoundationLayer[]
  soilGroup?:'ZA'|'ZB'|'ZC'|'ZD'|'ZE'|'ZF'
  siteSpecificResponseAnalysisCompleted?:boolean
}

export interface SurfaceFoundationStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string;source?:string}

export interface SurfaceFoundationLayerCheck{
  top:number
  bottom:number
  c:number
  phi:number
  gamma:number
  gammaEffective:number
  qk:number
  controlling:boolean
}

export interface SurfaceFoundationResult{
  Nq:number;Nc:number;Ngamma:number
  sc:number;sq:number;sg:number
  dc:number;dq:number;dg:number
  ic:number;iq:number;ig:number
  gc:number;gq:number;gg:number
  bc:number;bq:number;bg:number
  surcharge:number;gammaBelow:number
  ex:number;ey:number;Be:number;Le:number;effectiveArea:number
  qk:number;qt:number;qo:number;utilization:number;adequate:boolean;effectiveDepth:number
  representativeC:number;representativePhi:number;representativeGamma:number
  ultimateClassical?:number;allowableClassical?:number;undrainedQk?:number
  layeredScreeningOnly:boolean;finalDesignEligible:boolean
  layerChecks:SurfaceFoundationLayerCheck[]
  warnings:string[]
  method:SurfaceFoundationMethod
  foundationType:FoundationType
  source:string
  steps:SurfaceFoundationStep[]
  value:{
    Nq:number;Nc:number;Ngamma:number;sc:number;sq:number;sg:number;dc:number;dq:number;dg:number
    ic:number;iq:number;ig:number;gc:number;gq:number;gg:number;bc:number;bq:number;bg:number
    surcharge:number;gammaBelow:number;ex:number;ey:number;Be:number;Le:number;effectiveArea:number
    qk:number;qt:number;qo:number;utilization:number;adequate:boolean;effectiveDepth:number
  }
}

const gammaW=9.80665
const rad=(deg:number)=>deg*Math.PI/180
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)

function factors(phiDeg:number){
  if(!finite(phiDeg)||phiDeg<0||phiDeg>=90)throw new Error('φ′ 0° ile 90° arasında olmalıdır.')
  const phi=phiDeg
  const t=Math.tan(rad(phi))
  const Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2
  const Nc=phi===0?5.14:(Nq-1)/t
  const Ngamma=phi===0?0:2*(Nq-1)*t
  return{phi,t,Nq,Nc,Ngamma}
}

function effectiveBaseStress(Df:number,gamma1:number,gammaSat:number|undefined,gwt:number|undefined){
  if(!finite(gwt))return gamma1*Df
  if(gwt<0)throw new Error('YASS negatif olamaz.')
  if(Df<=gwt)return gamma1*Df
  if(!finite(gammaSat)||gammaSat<=gammaW)throw new Error('YASS temel altında ise γsat > γw verilmelidir.')
  return gamma1*gwt+(gammaSat-gammaW)*(Df-gwt)
}

function gammaBelowForBearing(gamma1:number,gammaSat:number|undefined,gwt:number|undefined,Df:number,B:number){
  if(!finite(gwt)||gwt>=Df+B)return gamma1
  if(gwt<0)throw new Error('YASS negatif olamaz.')
  if(!finite(gammaSat)||gammaSat<=gammaW)throw new Error('YASS temel etki zonuna giriyorsa γsat > γw verilmelidir.')
  const gammaSub=gammaSat-gammaW
  if(gwt<=Df)return gammaSub
  const satLength=Df+B-gwt
  return (gamma1*(B-satLength)+gammaSub*satLength)/Math.max(B,1e-12)
}

/** Vesic-family correction factors used by the TBDY general bearing-capacity equation. */
function groundFactors(betaDeg:number,phi:number,Nq:number){
  const beta=Math.abs(betaDeg)
  if(!finite(betaDeg)||beta>=45)throw new Error('Arazi eğimi β için 0° ≤ β < 45° gerekir.')
  if(beta===0)return{gc:1,gq:1,gg:1}
  if(phi===0)return{gc:Math.max(0,1-2*rad(beta)/(Math.PI+2)),gq:1,gg:1}
  const gq=Math.max(0,(1-Math.tan(rad(beta)))**2)
  const gc=Math.max(0,gq-(1-gq)/Math.max(Nq-1,1e-12))
  return{gc,gq,gg:gq}
}

function baseFactors(thetaDeg:number,phi:number,Nq:number){
  const theta=Math.abs(thetaDeg)
  if(!finite(thetaDeg)||theta>=45)throw new Error('Temel tabanı eğimi θ için 0° ≤ θ < 45° gerekir.')
  if(theta===0)return{bc:1,bq:1,bg:1}
  if(phi===0)return{bc:Math.max(0,1-2*rad(theta)/(Math.PI+2)),bq:1,bg:1}
  const bq=Math.max(0,(1-rad(theta)*Math.tan(rad(phi)))**2)
  const bc=Math.max(0,bq-(1-bq)/Math.max(Nq-1,1e-12))
  return{bc,bq,bg:bq}
}

function directionalInclination(
  B:number,L:number,c:number,N:number,H:number,phi:number,Nq:number,direction:'B'|'L'
){
  if(H<=0||N<=0)return{ic:1,iq:1,ig:1}
  const area=B*L
  if(phi===0){
    return{ic:c>0?Math.max(0,1-H/Math.max(area*c*5.14,1e-12)):0,iq:1,ig:0}
  }
  const ratio=direction==='B'?B/L:L/B
  const m=(2+ratio)/(1+ratio)
  const denom=N+area*c/Math.tan(rad(phi))
  const hRatio=Math.min(0.999999999,Math.max(0,H/Math.max(denom,1e-12)))
  const base=Math.max(0,1-hRatio)
  const iq=Math.pow(base,m)
  const ic=Math.max(0,iq-(1-iq)/Math.max(Nq-1,1e-12))
  const ig=Math.pow(base,m+1)
  return{ic,iq,ig}
}

function inclinationFactors(
  B:number,L:number,c:number,N:number,H:number,phi:number,Nq:number,hB:number,hL:number
){
  if(H<=0||N<=0)return{ic:1,iq:1,ig:1,note:'Yatay yük yok; eğik yük katsayıları 1.00.'}
  const candidates:Array<{r:{ic:number;iq:number;ig:number};name:'B'|'L'}>=[]
  if(hB>0)candidates.push({r:directionalInclination(B,L,c,N,H,phi,Nq,'B'),name:'B'})
  if(hL>0)candidates.push({r:directionalInclination(B,L,c,N,H,phi,Nq,'L'),name:'L'})
  if(!candidates.length){
    candidates.push({r:directionalInclination(B,L,c,N,H,phi,Nq,'B'),name:'B'})
  }
  const r=candidates.length===1?candidates[0]:candidates.reduce((worst,current)=>{
    return current.r.iq<worst.r.iq?current:worst
  })
  return{...r.r,note:candidates.length===2?'Vx/Vy birlikte mevcut; iki yönlü Vesic katsayılarından daha küçük iq (daha elverişsiz) kullanıldı.':'Yatay yük yönü B/L doğrultusunda açık girdiden belirlendi.'}
}

function shapeFactors(B:number,L:number,foundationType:FoundationType,phi:number,Nq:number,Nc:number){
  if(foundationType==='surekli')return{sc:1,sq:1,sg:1,ratio:0}
  const ratio=Math.min(B,L)/Math.max(B,L,1e-12)
  const t=Math.tan(rad(phi))
  return{
    sc:1+ratio*(Nq/Math.max(Nc,1e-12)),
    sq:1+ratio*t,
    sg:Math.max(0.6,1-0.4*ratio),
    ratio
  }
}

function depthFactors(Df:number,B:number,phi:number){
  const k=Math.atan(Df/Math.max(B,1e-12))
  return{dc:1+0.4*k,dq:1+2*k*Math.tan(rad(phi))*(1-Math.sin(rad(phi)))**2,dg:1}
}

function localLayerCheck(layer:SurfaceFoundationLayer,B:number,Df:number,baseQ:number,method:SurfaceFoundationMethod){
  const phi=layer.phi
  const f=factors(phi)
  const d=depthFactors(Df,B,phi)
  const qk=Math.max(0,layer.cohesion)*f.Nc*d.dc+Math.max(0,baseQ)*f.Nq*d.dq+0.5*Math.max(0,layer.gammaSat!=null?layer.gammaSat-gammaW:layer.gamma)*B*f.Ngamma
  return{top:layer.topDepth,bottom:layer.bottomDepth,c:layer.cohesion,phi,gamma:layer.gamma,gammaEffective:layer.gammaSat!=null?Math.max(0,layer.gammaSat-gammaW):layer.gamma,qk,controlling:false}
}

export function calculateSurfaceFoundation(i:SurfaceFoundationInput):SurfaceFoundationResult{
  if(!finite(i.B)||i.B<=0||!finite(i.L)||i.L<=0||!finite(i.Df)||i.Df<0)throw new Error('B ve L pozitif, Df negatif olmayan geçerli değerler olmalıdır.')
  if(!finite(i.gamma1)||i.gamma1<=0)throw new Error('γ doğal birim hacim ağırlığı pozitif olmalıdır.')
  if(!finite(i.c)||i.c<0)throw new Error('c negatif olamaz.')
  if(!finite(i.verticalLoad)||i.verticalLoad<0)throw new Error('Düşey yük negatif olamaz.')
  if(i.horizontalLoad!=null&&(!finite(i.horizontalLoad)||i.horizontalLoad<0))throw new Error('Yatay yük negatif olamaz.')
  if(i.horizontalLoadB!=null&&(!finite(i.horizontalLoadB)||i.horizontalLoadB<0))throw new Error('B doğrultusundaki yatay yük geçersiz.')
  if(i.horizontalLoadL!=null&&(!finite(i.horizontalLoadL)||i.horizontalLoadL<0))throw new Error('L doğrultusundaki yatay yük geçersiz.')
  if(i.groundSlope!=null&&!finite(i.groundSlope))throw new Error('Arazi eğimi β geçersiz.')
  if(i.baseSlope!=null&&!finite(i.baseSlope))throw new Error('Temel tabanı eğimi θ geçersiz.')

  const method=i.method??'TBDY-2018'
  if(method!=='TBDY-2018')throw new Error('Klasik Terzaghi/Meyerhof/Hansen/Vesic hesabı ayrı kanonik taşıma gücü motorunda yürütülür.')
  const foundationType=i.foundationType??'tekil'
  const N=i.verticalLoad
  const hB=Math.abs(i.horizontalLoadB??0)
  const hL=Math.abs(i.horizontalLoadL??0)
  const H= hB>0||hL>0 ? Math.hypot(hB,hL) : Math.max(0,i.horizontalLoad??0)
  const groundSlope=Math.abs(i.groundSlope??0)
  const baseSlope=Math.abs(i.baseSlope??0)
  const warnings:string[]=[]

  if(i.groundwaterDepth==null)warnings.push('YASS girilmedi; qk ön hesaplanabilir ancak nihai tasarım uygunluğu işaretlenmez.')
  if(i.groundSlope==null)warnings.push('Arazi eğimi girilmedi; β=0° kabul edilmedi, nihai hesap için açıkça 0° girilmesi önerilir.')
  if(i.baseSlope==null)warnings.push('Temel tabanı eğimi girilmedi; θ=0° kabul edilerek ön hesap yapılır.')

  const ex=N>0?(i.momentY??0)/N:0
  const ey=N>0?(i.momentX??0)/N:0
  const Be=i.B-2*Math.abs(ex)
  const Le=i.L-2*Math.abs(ey)
  const effectiveArea=Math.max(0,Be)*Math.max(0,Le)
  const outsideKern=Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6

  if(N===0&&(i.momentX!==0||i.momentY!==0))warnings.push('N=0 iken eksantrisite e=M/N tanımsızdır; momentli sıfır düşey yük durumu bu motorla değerlendirilemez.')
  if(Be<=0||Le<=0)warnings.push('Eksantrisite etkin temel boyutunu tüketiyor; q0 tanımsızdır.')
  if(outsideKern)warnings.push('Eksantrisite çekirdek dışına çıkıyor (e>B/6 veya e>L/6); temel tabanında çekme/temas kaybı riski nedeniyle sonuç yeterli kabul edilmez.')

  const Bp=Math.max(Math.min(Be,Le),1e-12)
  const Lp=Math.max(Be,Le)
  const f=factors(i.phi,method)
  const d=depthFactors(i.Df,Bp,i.phi,method)
  const qBase=effectiveBaseStress(i.Df,i.gamma1,i.gamma2,i.groundwaterDepth)
  const gammaBelow=gammaBelowForBearing(i.gamma1,i.gamma2,i.groundwaterDepth,i.Df,Bp)
  const s=shapeFactors(Bp,Lp,foundationType,i.phi,f.Nq,f.Nc)
  const incl=inclinationFactors(Bp,Lp,i.c,N,H,f.phi,f.Nq,hB,hL)
  const g=groundFactors(groundSlope,f.phi,f.Nq)
  const b=baseFactors(baseSlope,f.phi,f.Nq)

  const qk=i.c*f.Nc*s.sc*d.dc*incl.ic*g.gc*b.bc
    +qBase*f.Nq*s.sq*d.dq*incl.iq*g.gq*b.bq
    +0.5*gammaBelow*Bp*f.Ngamma*s.sg*d.dg*incl.ig*g.gg*b.bg

  const resistanceFactor=method==='TBDY-2018'?TBDY_GAMMA_RV:1
  if(method==='TBDY-2018'&&i.resistanceFactor!=null&&Math.abs(i.resistanceFactor-TBDY_GAMMA_RV)>1e-9)warnings.push('TBDY 2018 için γRv kullanıcı değeri yok sayıldı; sabit γRv=1.40 uygulanır.')
  const qt=qk/Math.max(resistanceFactor,1e-12)
  const qo=effectiveArea>0?N/effectiveArea:Infinity
  const utilization=qt>0?qo/qt:Infinity

  const checks=(i.layers??[])
    .filter(l=>finite(l.topDepth)&&finite(l.bottomDepth)&&l.bottomDepth>l.topDepth&&l.bottomDepth>i.Df&&l.topDepth<i.Df+2*Bp&&finite(l.cohesion)&&finite(l.phi)&&finite(l.gamma))
    .map(l=>localLayerCheck(l,Bp,i.Df,qBase))
  const layeredScreeningOnly=checks.length>0
  if(layeredScreeningOnly)warnings.push('16.8.3.3 kapsamındaki değişken/tabakalı zemin bulundu. Katman sonuçları yalnız ayrı ekran taramasıdır; kanonik homojen qk değerinin yerine geçirilmez ve nihai tasarım için tabakalı-zemin mekanizması ayrıca doğrulanmalıdır.')

  const zfBlocked=i.soilGroup==='ZF'&&!i.siteSpecificResponseAnalysisCompleted
  if(zfBlocked)warnings.push('ZF için saha özel zemin davranış analizi tamamlanmadan nihai tasarım uygunluğu işaretlenmez.')

  const finalDesignEligible=!layeredScreeningOnly&&!zfBlocked&&i.groundwaterDepth!=null&&!outsideKern&&Be>0&&Le>0&&N>0
  const adequate=finalDesignEligible&&qo<=qt&&Number.isFinite(qt)

  if(groundSlope>0)warnings.push('Arazi eğimi katsayısı g, literatürdeki Vesic-tipi bağıntıyla uygulanmıştır.')
  if(baseSlope>0)warnings.push('Temel tabanı eğimi katsayısı b, literatürdeki Vesic-tipi bağıntıyla uygulanmıştır.')
  if(H>0)warnings.push(incl.note)
  if(foundationType==='radye')warnings.push('Radye temel için taşıma gücü yanında toplam ve farklı oturma ayrıca kontrol edilmelidir.')

  const undrainedCu=finite(i.undrainedCu)&&i.undrainedCu>=0?i.undrainedCu:undefined
  const undrainedShape=foundationType==='surekli'?1:1+(Bp/Lp)*(1/5.14)
  const undrainedDepth=1+0.4*Math.atan(i.Df/Math.max(Bp,1e-12))
  const undrainedInclination=undrainedCu!=null&&H>0&&undrainedCu>0?Math.max(0,1-H/Math.max((Bp*Lp)*undrainedCu*5.14,1e-12)):undrainedCu!=null?(H>0?0:1):1
  const undrainedGround=groundFactors(groundSlope,0,1).gc,undrainedBase=baseFactors(baseSlope,0,1).bc
  const undrainedQk=undrainedCu==null?undefined:undrainedCu*5.14*undrainedShape*undrainedDepth*undrainedInclination*undrainedGround*undrainedBase+qBase

  const steps:SurfaceFoundationStep[]=[
    {symbol:'ex/ey',title:'Yük eksantrislikleri',formula:'ex=My/N ; ey=Mx/N',value:Math.max(Math.abs(ex),Math.abs(ey)),unit:'m'},
    {symbol:'B′/L′',title:'Etkin temel boyutları',formula:'B′=B−2|ex| ; L′=L−2|ey|',value:Math.min(Math.max(Be,0),Math.max(Le,0)),unit:'m'},
    {symbol:'q′',title:'Temel seviyesinde efektif gerilme',formula:'q′=σ′v0(Df)=ΣγH−u',value:qBase,unit:'kPa'},
    {symbol:'Nq/Nc/Nγ',title:'Taşıma gücü katsayıları',formula:'Nq=e^(πtanφ′)tan²(45°+φ′/2); Nc=(Nq−1)cotφ′; Nγ=2(Nq−1)tanφ′',value:f.Nq},
    {symbol:'s',title:'Temel şekil katsayıları',formula:'sc=1+(B′/L′)(Nq/Nc); sq=1+(B′/L′)tanφ′; sγ=1−0.4(B′/L′)',value:s.sc,note:foundationType==='surekli'?'Sürekli temel için B′/L′→0 sınırı kullanıldı.':''},
    {symbol:'d',title:'Derinlik katsayıları',formula:'k=atan(Df/B′); dc=1+0.4k; dq=1+2k·tanφ′·(1−sinφ′)^2; dγ=1',value:d.dc},
    {symbol:'i',title:'Eğimli yük katsayıları',formula:'Vesic: iq=[1−H/(N+A c cotφ′)]^m; ic=iq−(1−iq)/(Nq−1); iγ=[…]^(m+1)',value:incl.iq,note:incl.note},
    {symbol:'g',title:'Arazi eğimi katsayıları',formula:'gq=(1−tanβ)^2; gc=gq−(1−gq)/(Nq−1); gγ=gq',value:g.gq},
    {symbol:'b',title:'Temel tabanı eğimi katsayıları',formula:'bq=(1−θrad·tanφ′)^2; bc=bq−(1−bq)/(Nq−1); bγ=bq',value:b.bq},
    {symbol:'qk',title:'Karakteristik taşıma gücü',formula:'qk=cNc sc dc ic gc bc + q′Nq sq dq iq gq bq + 0.5γ′B′Nγ sγ dγ iγ gγ bγ',value:qk,unit:'kPa'},
    {symbol:'qt',title:'Tasarım taşıma gücü',formula:'qt=qk/γRv',value:qt,unit:'kPa'},
    {symbol:'q0',title:'Temel tabanındaki düşey basınç',formula:'q0=N/(B′L′)',value:qo,unit:'kPa'},
    {symbol:'η',title:'Kullanım oranı',formula:'η=q0/qt',value:utilization}
  ]

  const resultBase={
    Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,sc:s.sc,sq:s.sq,sg:s.sg,dc:d.dc,dq:d.dq,dg:d.dg,ic:incl.ic,iq:incl.iq,ig:incl.ig,
    gc:g.gc,gq:g.gq,gg:g.gg,bc:b.bc,bq:b.bq,bg:b.bg,surcharge:qBase,gammaBelow,ex,ey,Be,Le,effectiveArea,qk,qt,qo,utilization,adequate,effectiveDepth:2*Bp,
    representativeC:i.c,representativePhi:f.phi,representativeGamma:gammaBelow,ultimateClassical:qk,
    allowableClassical:finite(i.safetyFactor)&&i.safetyFactor>0?qk/i.safetyFactor:undefined,undrainedQk,layeredScreeningOnly,finalDesignEligible,
    layerChecks:checks,warnings,method,foundationType
  }

  return{
    ...resultBase,
    source:'TBDY 2018 16.8.3.2 Denk. 16.8; boyutsuz düzeltme katsayıları literatürde genel kabul görmüş bağıntılarla açıkça hesaplanır. Tabakalı zemin ayrı tarama olarak raporlanır.',
    steps,
    value:{
      Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,sc:s.sc,sq:s.sq,sg:s.sg,dc:d.dc,dq:d.dq,dg:d.dg,ic:incl.ic,iq:incl.iq,ig:incl.ig,gc:g.gc,gq:g.gq,gg:g.gg,bc:b.bc,bq:b.bq,bg:b.bg,
      surcharge:qBase,gammaBelow,ex,ey,Be,Le,effectiveArea,qk,qt,qo,utilization,adequate,effectiveDepth:2*Bp
    }
  }
}
