import { calculateSurfaceFoundation } from './surface-foundation'
import { crrM75, magnitudeCorrection, rdAtDepth } from './liquefaction/liquefaction-formulas'
export { foundationChecks } from './foundation-sliding'
export type { FoundationCheckInput } from './foundation-sliding'

export type BearingMethod='Terzaghi'|'Meyerhof'|'Hansen'|'Vesic'
export interface CalculationStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string;source?:string}
export interface CalculationResult<T>{value:T;steps:CalculationStep[];method:string;source:string;warnings?:string[]}
const rad=(d:number)=>d*Math.PI/180
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))

export interface BearingInput{B:number;L:number;Df:number;gamma:number;c:number;phi:number;FS:number;method:BearingMethod;waterReduction?:number}
function factors(phiDeg:number,method:BearingMethod){
  const phi=clamp(phiDeg,0,50),t=Math.tan(rad(phi))
  const Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2
  const Nc=phi===0?5.14:(Nq-1)/Math.max(t,1e-12)
  let Ngamma=0
  if(phi>0){
    if(method==='Terzaghi'){const Kpy=3*(1+Math.sin(rad(phi)))/Math.max(1-Math.sin(rad(phi)),1e-9);Ngamma=.5*t*(Kpy/Math.cos(rad(phi))**2-1)}
    else if(method==='Meyerhof')Ngamma=(Nq-1)*Math.tan(rad(1.4*phi))
    else if(method==='Hansen')Ngamma=1.5*(Nq-1)*t
    else Ngamma=2*(Nq+1)*t
  }
  return{phi,t,Nq,Nc,Ngamma}
}
function classicalFactors(method:BearingMethod,B:number,L:number,Df:number,phi:number,Nq:number,Nc:number){
  const r=Math.min(B,L)/Math.max(B,L,1e-9),t=Math.tan(rad(phi)),Nphi=Math.tan(Math.PI/4+rad(phi)/2)**2
  if(method==='Terzaghi')return{sc:Math.abs(B-L)<1e-9?1.3:1,sq:1,sg:Math.abs(B-L)<1e-9?.8:1,dc:1,dq:1,dg:1,ic:1,iq:1,ig:1,gc:1,gq:1,gg:1,bc:1,bq:1,bg:1}
  const sc=method==='Meyerhof'?1+.2*Nphi*r:1+(Nq/Math.max(Nc,1e-9))*r
  const sq=method==='Meyerhof'?(phi>10?1+.1*Nphi*r:1):1+r*t
  const sg=method==='Meyerhof'?(phi>10?sq:1):Math.max(.6,1-.4*r)
  const k=Df/Math.max(B,1e-9),kk=k<=1?k:Math.atan(k)
  const dc=method==='Meyerhof'?1+.2*Math.sqrt(Nphi)*k:1+.4*kk
  const dq=method==='Meyerhof'?(phi>10?1+.1*Math.sqrt(Nphi)*k:1):1+2*t*(1-Math.sin(rad(phi)))**2*kk
  return{sc,sq,sg,dc,dq,dg:1,ic:1,iq:1,ig:1,gc:1,gq:1,gg:1,bc:1,bq:1,bg:1}
}
export function bearingCapacity(i:BearingInput):CalculationResult<any>{
  if(i.B<=0||i.L<=0||i.Df<0||i.gamma<=0||i.c<0||i.FS<=0)throw new Error('Taşıma gücü girdileri geçersiz.')
  const f=factors(i.phi,i.method),m=classicalFactors(i.method,i.B,i.L,i.Df,f.phi,f.Nq,f.Nc),q=i.gamma*i.Df,gammaTerm=i.waterReduction??1
  const ultimate=i.c*f.Nc*m.sc*m.dc*m.ic*m.gc*m.bc+q*f.Nq*m.sq*m.dq*m.iq*m.gq*m.bq+.5*i.gamma*i.B*f.Ngamma*m.sg*m.dg*m.ig*m.gg*m.bg*gammaTerm
  const netUltimate=ultimate-q
  const value={Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,sc:m.sc,sq:m.sq,sg:m.sg,dc:m.dc,dq:m.dq,dg:m.dg,ultimate,netUltimate,allowableGross:ultimate/i.FS,allowableNet:netUltimate/i.FS}
  return{value,method:i.method,source:'Klasik taşıma gücü literatür bağıntıları; sonuçlar TBDY tasarım direnci yerine klasik izin verilebilir değerler olarak raporlanır.',steps:[
    {symbol:'Nq',title:'Taşıma gücü katsayısı',formula:'Nq=exp(πtanφ)·tan²(45°+φ/2)',value:f.Nq},
    {symbol:'Nc',title:'Kohezyon katsayısı',formula:'Nc=(Nq−1)cotφ',value:f.Nc},
    {symbol:'Nγ',title:'Birim hacim ağırlığı katsayısı',formula:'Seçilen yöntemin Nγ bağıntısı',value:f.Ngamma},
    {symbol:'q',title:'Sürşarj',formula:'q=γDf',value:q,unit:'kPa'},
    {symbol:'qult',title:'Nihai taşıma gücü',formula:'Klasik genel taşıma gücü denklemi',value:ultimate,unit:'kPa'},
    {symbol:'qallow',title:'İzin verilen gross',formula:'qult/FS',value:value.allowableGross,unit:'kPa'}
  ]}
}

export interface TbdyBearingInput{
  B:number;L:number;Df:number;gamma1:number;gamma2:number;c:number;phi:number;verticalLoad:number;horizontalLoad:number;momentX:number;momentY:number
  groundSlope:number;baseSlope:number;resistanceFactor:number;foundationType?:'tekil'|'surekli'|'radye';groundwaterDepth?:number;layers?:Parameters<typeof calculateSurfaceFoundation>[0]['layers'];undrainedCu?:number
}
export function tbdyBearingCapacity(i:TbdyBearingInput):CalculationResult<any>{
  const r=calculateSurfaceFoundation({B:i.B,L:i.L,Df:i.Df,gamma1:i.gamma1,gamma2:i.gamma2,c:i.c,phi:i.phi,verticalLoad:i.verticalLoad,horizontalLoad:i.horizontalLoad,momentX:i.momentX,momentY:i.momentY,groundSlope:i.groundSlope,baseSlope:i.baseSlope,resistanceFactor:i.resistanceFactor,method:'TBDY-2018',foundationType:i.foundationType,groundwaterDepth:i.groundwaterDepth,layers:i.layers,undrainedCu:i.undrainedCu})
  return{value:r,steps:r.steps,method:r.method,source:r.source,warnings:r.warnings}
}

export interface SettlementInput{B:number;q:number;Es:number;nu:number;layers?:{thickness:number;Cc?:number;e0?:number;sigma0?:number;dSigma?:number}[]}
export function settlement(i:SettlementInput):CalculationResult<{immediate:number;consolidation:number;total:number}>{
  if(i.B<=0||i.q<0||i.Es<=0||i.nu<=-1||i.nu>=.5)throw new Error('Oturma girdileri geçersiz.')
  const immediate=i.q*i.B*(1-i.nu*i.nu)/i.Es
  const consolidation=(i.layers??[]).reduce((sum,l)=>l.Cc!=null&&l.e0!=null&&l.sigma0!=null&&l.dSigma!=null&&l.sigma0>0&&l.Cc>=0&&l.e0>-1?sum+Math.max(0,l.thickness)*l.Cc/(1+l.e0)*Math.log10(Math.max(l.sigma0+l.dSigma,l.sigma0)/l.sigma0):sum,0)
  return{value:{immediate,consolidation,total:immediate+consolidation},method:'Basit elastik + açık konsolidasyon parametreleri',source:'Parametre eksikleri sessizce varsayılmaz.',steps:[
    {symbol:'si',title:'Elastik oturma',formula:'s=qB(1−ν²)/Es',value:immediate,unit:'m'},
    {symbol:'sc',title:'Konsolidasyon',formula:'ΣH·Cc/(1+e0)·log10(σ1/σ0)',value:consolidation,unit:'m'},
    {symbol:'st',title:'Toplam',formula:'st=si+sc',value:immediate+consolidation,unit:'m'}
  ]}
}

export interface LiquefactionInput{Mw:number;Sds:number;depth:number;N160f:number;sigmaV:number;sigmaVPrime:number}
export function liquefaction(i:LiquefactionInput):CalculationResult<any>{
  const rd=rdAtDepth(i.depth),N=i.N160f
  const CRRM75=crrM75(N)
  if(CRRM75===undefined)throw new Error('(N1)60f değeri CRR7.5 bağıntısının uygulanabilir aralığı dışındadır.')
  const CM=magnitudeCorrection(i.Mw),Rtau=CRRM75*CM*Math.max(i.sigmaVPrime,0),tau=.65*.4*Math.max(i.Sds,0)*Math.max(i.sigmaV,0)*Math.max(rd,0),ratio=Rtau/Math.max(tau,1e-9)
  return{value:{rd,CRRM75,CM,Rtau,tau,ratio,safe:ratio>=1.1},method:'TBDY 2018 Ek 16B',source:'Ek 16B tetiklenme zinciri; ana uygulama liquefaction-profile.ts üzerinden yapılmalıdır.',steps:[
    {symbol:'rd',title:'Gerilme azaltma',formula:'Ek 16B derinlik bağıntısı',value:rd},
    {symbol:'CRR7.5',title:'Çevrimsel dayanım',formula:'Ek 16B',value:CRRM75},
    {symbol:'FS',title:'Sıvılaşma güvenlik oranı',formula:'FS=Rτ/τdeprem',value:ratio}
  ]}
}

export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number}){
  const Ac=Math.PI*i.columnDiameter**2/4,ratio=Math.min(1,Ac/Math.max(i.spacing**2,1e-9)),composite=(1-ratio)*i.qultSoil+ratio*i.qultColumn*i.improvementFactor
  return{value:{Ac,ratio,composite,allowable:composite/Math.max(i.FS,1e-9),columnLoad:Ac*i.columnStrength/Math.max(i.FS,1e-9)},steps:[{symbol:'Ac',title:'Kolon kesit alanı',formula:'πd²/4',value:Ac},{symbol:'ρ',title:'İyileştirme oranı',formula:'Ac/Acell',value:ratio}],method:'Jet Grout ön model',source:'Proje kaynak paketi'}
}

export function stressAtDepth(depth:number,layers:{top:number;bottom:number;gamma:number;gammaSat:number}[],gwt:number){
  let sigmaV=0
  for(const layer of [...layers].filter(x=>x.bottom>x.top).sort((a,b)=>a.top-b.top)){
    const z0=Math.max(0,layer.top),z1=Math.min(depth,layer.bottom)
    if(z1<=z0)continue
    const dry=gwt>=0?Math.max(0,Math.min(z1,gwt)-z0):z1-z0,sat=Math.max(0,z1-z0-dry)
    sigmaV+=dry*layer.gamma+sat*layer.gammaSat
  }
  const u=gwt>=0&&depth>gwt?9.80665*(depth-gwt):0
  return{sigmaV,sigmaVPrime:Math.max(0,sigmaV-u),u}
}

export const SOURCE_NOTES={
  investigation:'TBDY 2018 Bölüm 16 ve Ek 16A.',
  liquefaction:'TBDY 2018 Bölüm 16.6 ve Ek 16B.',
  bearing:'TBDY 2018 Bölüm 16.8.2–16.8.3; klasik yöntemler Terzaghi, Meyerhof, Hansen ve Vesic.',
  settlement:'TBDY 2018 Bölüm 16.7.3.4 ve 16.8.3.4; yöntem kaynakları ayrıca raporlanır.',
  foundation:'TBDY 2018 16.7.3.3 ve 16.8.4; γRv=1.40, γRh=1.10, γRp=1.40.',
  jetGroutAdvanced:'Jet Grout kompozit yaklaşımı; proje deneyleri ve kalite kontrol ile doğrulanmalıdır.'
}