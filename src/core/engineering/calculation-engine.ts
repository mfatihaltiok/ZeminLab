import { calculateSurfaceFoundation } from './surface-foundation'
import { calculateFoundationSliding } from './foundation-sliding'
import type { SptEngineInput } from './spt/spt-engine'
import { calculateSpt, fineContentCorrection, soilBehaviorFromCode } from './spt/spt-engine'

export type BearingMethod='Terzaghi'|'Meyerhof'|'Hansen'|'Vesic'
export interface CalculationStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string;source?:string}
export interface CalculationResult<T>{value:T;steps:CalculationStep[];method:string;source:string;warnings?:string[]}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x)
const requireNumber=(x:unknown,name:string,min=-Infinity)=>{if(!finite(x)||x<min)throw new Error(name+' geçerli bir sayı olmalıdır.');return x}

export interface BearingInput{B:number;L:number;Df:number;gamma:number;c:number;phi:number;FS:number;method:BearingMethod;waterReduction?:number}

function classicalFactors(i:BearingInput){
  const B=i.B,L=i.L,Df=i.Df,phi=i.phi,ratio=Math.min(B,L)/Math.max(B,L),t=Math.tan(rad(phi)),Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2,Nc=phi===0?5.14:(Nq-1)/Math.max(t,1e-12)
  let Ngamma=0,sc=1,sq=1,sg=1,dc=1,dq=1,dg=1
  const Nphi=Math.tan(Math.PI/4+rad(phi)/2)**2
  if(phi>0){
    if(i.method==='Terzaghi'){
      const Kp=Math.pow(Math.tan(Math.PI/4+rad(phi)/2),2)
      Ngamma=1.5*(Kp-1)*t
      sc=Math.abs(B-L)<1e-12?1.3:1
      sg=Math.abs(B-L)<1e-12?0.8:1
    }else if(i.method==='Meyerhof'){
      Ngamma=(Nq-1)*Math.tan(rad(1.4*phi))
      sc=1+0.2*Nphi*ratio
      sq=phi>10?1+0.1*Nphi*ratio:1
      sg=phi>10?sq:1
      dc=1+0.2*Math.sqrt(Nphi)*(Df/Math.max(B,1e-12))
      dq=phi>10?1+0.1*Math.sqrt(Nphi)*(Df/Math.max(B,1e-12)):1
    }else if(i.method==='Hansen'){
      Ngamma=1.5*(Nq-1)*t
      sc=1+(Nq/Nc)*ratio
      sq=1+ratio*t
      sg=Math.max(0.6,1-0.4*ratio)
      const k=Math.atan(Df/Math.max(B,1e-12))
      dc=1+0.4*k
      dq=1+2*k*t*(1-Math.sin(rad(phi)))**2
    }else{
      Ngamma=2*(Nq-1)*t
      sc=1+(Nq/Nc)*ratio
      sq=1+ratio*t
      sg=Math.max(0.6,1-0.4*ratio)
      const k=Math.atan(Df/Math.max(B,1e-12))
      dc=1+0.4*k
      dq=1+2*k*t*(1-Math.sin(rad(phi)))**2
    }
  }else{
    if(i.method==='Terzaghi'&&Math.abs(B-L)<1e-12){sc=1.3;sg=0.8}
  }
  return{Nq,Nc,Ngamma,sc,sq,sg,dc,dq,dg}
}

export function bearingCapacity(i:BearingInput):CalculationResult<any>{
  requireNumber(i.B,'B',Number.EPSILON);requireNumber(i.L,'L',Number.EPSILON);requireNumber(i.Df,'Df',0);requireNumber(i.gamma,'γ',Number.EPSILON);requireNumber(i.c,'c',0);requireNumber(i.phi,'φ',0);requireNumber(i.FS,'FS',Number.EPSILON)
  if(i.phi>=90)throw new Error('φ 90° veya daha büyük olamaz.')
  const waterReduction=i.waterReduction??1
  if(!finite(waterReduction)||waterReduction<0||waterReduction>1)throw new Error('Su azaltma katsayısı 0–1 aralığında olmalıdır.')
  const f=classicalFactors(i)
  const surcharge=i.gamma*i.Df
  const gammaTerm=.5*i.gamma*i.B*f.Ngamma*f.sg*f.dg*f.ig
  const ultimate=(i.c*f.Nc*f.sc*f.dc)+(surcharge*f.Nq*f.sq*f.dq)+(gammaTerm*waterReduction)
  const netUltimate=ultimate-surcharge
  const value={Nq:f.Nq,Nc:f.Nc,Ngamma:f.Ngamma,sc:f.sc,sq:f.sq,sg:f.sg,dc:f.dc,dq:f.dq,dg:f.dg,ultimate,netUltimate,allowableGross:ultimate/i.FS,allowableNet:netUltimate/i.FS}
  return{value,method:i.method,source:'Klasik taşıma gücü karşılaştırma motoru. TBDY yüzeysel temel motorundan bağımsızdır; düzeltme katsayıları yöntem bazında açıkça seçilir.',steps:[
    {symbol:'Nq',title:'Taşıma gücü katsayısı',formula:'Nq=e^(πtanφ)·tan²(45°+φ/2)',value:f.Nq},
    {symbol:'Nc',title:'Kohezyon katsayısı',formula:'Nc=(Nq−1)cotφ',value:f.Nc},
    {symbol:'Nγ',title:'Birim hacim ağırlığı katsayısı',formula:'Seçilen yöntemin Nγ bağıntısı',value:f.Ngamma},
    {symbol:'s',title:'Şekil katsayıları',formula:'sc, sq, sγ',value:f.sc},
    {symbol:'d',title:'Derinlik katsayıları',formula:'dc, dq, dγ',value:f.dc},
    {symbol:'qult',title:'Nihai taşıma gücü',formula:'cNcscdc + qNqsqdq + 0.5γBNγsγdγ',value:ultimate,unit:'kPa'},
    {symbol:'qallow',title:'İzin verilen gross',formula:'qult/FS',value:value.allowableGross,unit:'kPa'}],warnings:['Bu sonuçlar TBDY qk/qt tasarım zincirinin yerine geçmez.']}
}

export interface TbdyBearingInput{
 B:number;L:number;Df:number;gamma1:number;gamma2:number;c:number;phi:number;verticalLoad:number;horizontalLoad:number;momentX:number;momentY:number
 groundSlope:number;baseSlope:number;resistanceFactor:number;foundationType?:'tekil'|'surekli'|'radye';groundwaterDepth?:number;layers?:Parameters<typeof calculateSurfaceFoundation>[0]['layers'];undrainedCu?:number
}
export function tbdyBearingCapacity(i:TbdyBearingInput):CalculationResult<any>{
 const r=calculateSurfaceFoundation({...i,method:'TBDY-2018',foundationType:i.foundationType,groundwaterDepth:i.groundwaterDepth,layers:i.layers,undrainedCu:i.undrainedCu})
 return{value:r,steps:r.steps,method:r.method,source:r.source,warnings:r.warnings}
}

export interface SettlementInput{B:number;q:number;Es:number;nu:number;layers?:{thickness:number;Cc?:number;e0?:number;sigma0?:number;dSigma?:number}[]}
export function settlement(i:SettlementInput):CalculationResult<{immediate:number;consolidation:number;total:number}>{
 requireNumber(i.B,'B',Number.EPSILON);requireNumber(i.q,'q',0);requireNumber(i.Es,'Es',Number.EPSILON);requireNumber(i.nu,'ν',0);if(i.nu>=.5)throw new Error('ν 0.5 veya daha büyük olamaz.')
 const immediate=i.q*i.B*(1-i.nu*i.nu)/i.Es;let consolidation=0
 for(const l of i.layers??[]){
  if(!finite(l.thickness)||l.thickness<0)throw new Error('Konsolidasyon tabaka kalınlığı geçersiz.')
  const has=([l.Cc,l.e0,l.sigma0,l.dSigma] as unknown[]).some(v=>v!==undefined)
  if(!has)continue
  if(!finite(l.Cc)||!finite(l.e0)||!finite(l.sigma0)||!finite(l.dSigma)||l.Cc<0||l.e0<=-1||l.sigma0<=0||l.dSigma<0)throw new Error('Konsolidasyon tabakasında Cc, e0, σ′0 ve Δσ birlikte geçerli verilmelidir.')
  consolidation+=l.thickness*l.Cc/(1+l.e0)*Math.log10((l.sigma0+l.dSigma)/l.sigma0)
 }
 return{value:{immediate,consolidation,total:immediate+consolidation},method:'Basit elastik + açık konsolidasyon parametreleri',source:'Uyumluluk API; üretim oturma hesabı İdealize Zemin Profili kanonik motorundan yapılır.',steps:[
  {symbol:'si',title:'Elastik oturma',formula:'s=qB(1−ν²)/Es',value:immediate,unit:'m'},
  {symbol:'sc',title:'Konsolidasyon',formula:'ΣH·Cc/(1+e0)·log10(σ1/σ0)',value:consolidation,unit:'m'},
  {symbol:'st',title:'Toplam',formula:'st=si+sc',value:immediate+consolidation,unit:'m'}]}
}

export interface LiquefactionInput{Mw:number;Sds:number;depth:number;N160f:number;sigmaV:number;sigmaVPrime:number}
export function liquefaction(i:LiquefactionInput):CalculationResult<any>{
 requireNumber(i.Mw,'Mw',Number.EPSILON);requireNumber(i.Sds,'SDS',0);requireNumber(i.depth,'z',0);requireNumber(i.N160f,'(N1)60f',0.000001);requireNumber(i.sigmaV,'σv0',0);requireNumber(i.sigmaVPrime,'σ′v0',Number.EPSILON)
 if(i.N160f>=34)throw new Error('(N1)60f ≥ 34 için bu CRR bağıntısı kullanılmaz.')
 const z=i.depth,N=i.N160f,rd=z<=9.15?1-.00765*z:z<=23?1.174-.0267*z:z<=30?.744-.008*z:.5,CRRM75=1/(34-N)+N/135+50/(10*N+45)**2-.005,CM=10**2.24/i.Mw**2.56,Rtau=CRRM75*CM*i.sigmaVPrime,tau=.65*.4*i.Sds*i.sigmaV*rd,ratio=tau>0?Rtau/tau:Number.POSITIVE_INFINITY
 return{value:{rd,CRRM75,CM,Rtau,tau,ratio,safe:ratio>=1.1},method:'TBDY 2018 Ek 16B',source:'Tek nokta uyumluluk API; proje kapsamı ve veri yeterliliği liquefaction-profile.ts üzerinden yönetilir.',warnings:['Bu tek nokta API proje düzeyindeki zorunluluk/kapsam kararının yerine geçmez.'],steps:[
  {symbol:'rd',title:'Gerilme azaltma',formula:'Ek 16B derinlik bağıntısı',value:rd},{symbol:'CRR7.5',title:'Çevrimsel dayanım',formula:'Ek 16B',value:CRRM75},{symbol:'FS',title:'Sıvılaşma güvenlik oranı',formula:'FS=Rτ/τdeprem',value:ratio}]}
}

export type FoundationCheckInput=Parameters<typeof calculateFoundationSliding>[0]
export function foundationChecks(i:FoundationCheckInput){return calculateFoundationSliding(i)}

export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number}){
 requireNumber(i.columnDiameter,'Kolon çapı',Number.EPSILON);requireNumber(i.spacing,'Aks aralığı',Number.EPSILON);requireNumber(i.qultSoil,'Zemin qult',0);requireNumber(i.qultColumn,'Kolon qult',0);requireNumber(i.improvementFactor,'İyileştirme katsayısı',0);requireNumber(i.FS,'FS',Number.EPSILON);requireNumber(i.columnStrength,'Kolon dayanımı',0)
 const Ac=Math.PI*i.columnDiameter**2/4,ratio=Ac/(i.spacing**2);if(ratio<=0||ratio>1)throw new Error('Jet Grout iyileştirme oranı 0<ρ≤1 olmalıdır.')
 const composite=(1-ratio)*i.qultSoil+ratio*i.qultColumn*i.improvementFactor
 return{value:{Ac,ratio,composite,allowable:composite/i.FS,columnLoad:Ac*i.columnStrength/i.FS},steps:[{symbol:'Ac',title:'Kolon kesit alanı',formula:'πd²/4',value:Ac},{symbol:'ρ',title:'İyileştirme oranı',formula:'Ac/Acell',value:ratio}],method:'Jet Grout ön model',source:'Uyumluluk API; ileri Jet Grout motorunun yerine geçmez.',warnings:['Basitleştirilmiş ön model.']}
}

export function stressAtDepth(depth:number,layers:{top:number;bottom:number;gamma:number;gammaSat:number}[],gwt:number){
 requireNumber(depth,'Derinlik',0);requireNumber(gwt,'YASS',0)
 let sigmaV=0,cursor=0
 for(const layer of [...layers].filter(x=>x.bottom>x.top).sort((a,b)=>a.top-b.top)){
  if(layer.top>cursor+1e-9&&layer.top<depth-1e-9)throw new Error('Gerilme profili süreksiz.')
  const z0=Math.max(cursor,layer.top),z1=Math.min(depth,layer.bottom);if(z1<=z0)continue
  requireNumber(layer.gamma,'γ',Number.EPSILON);requireNumber(layer.gammaSat,'γsat',Number.EPSILON)
  const dry=Math.max(0,Math.min(z1,gwt)-z0),sat=(z1-z0)-dry;sigmaV+=dry*layer.gamma+sat*layer.gammaSat;cursor=z1;if(cursor>=depth-1e-9)break
 }
 if(cursor<depth-1e-9)throw new Error('Gerilme profili hesap derinliğine kadar tamamlanmamış.')
 const u=depth>gwt?(depth-gwt)*9.80665:0
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
