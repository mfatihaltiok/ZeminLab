import { calculateSurfaceFoundation, compressionContact } from './surface-foundation'
import { effectiveStressAtDepth } from './stress-profile'

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
  if(!Number.isFinite(i.depth)||i.depth<0||!Number.isFinite(i.N160f)||i.N160f<=0||i.N160f>=34)throw new Error('N1,60f değeri Ek 16B CRR bağıntısının 0<N1,60f<34 geçerlilik aralığında olmalıdır.')
  if(!Number.isFinite(i.Mw)||i.Mw<=0||!Number.isFinite(i.Sds)||i.Sds<0||!Number.isFinite(i.sigmaV)||i.sigmaV<0||!Number.isFinite(i.sigmaVPrime)||i.sigmaVPrime<=0)throw new Error('Sıvılaşma gerilme ve deprem girdileri geçerli olmalıdır.')
  const z=i.depth,rd=z<=9.15?1-.00765*z:z<=23?1.174-.0267*z:z<=30?.744-.008*z:.5,N=i.N160f
  const CRRM75=1/(34-N)+N/135+50/(10*N+45)**2-1/200
  const CM=10**2.24/i.Mw**2.56,Rtau=CRRM75*CM*i.sigmaVPrime,tau=.65*.4*i.Sds*i.sigmaV*rd,ratio=tau>0?Rtau/tau:Infinity
  return{value:{rd,CRRM75,CM,Rtau,tau,ratio,safe:ratio>=1.1},method:'TBDY 2018 Ek 16B',source:'Ek 16B tetiklenme zinciri; ana uygulama liquefaction-profile.ts üzerinden yapılmalıdır.',steps:[
    {symbol:'rd',title:'Gerilme azaltma',formula:'Ek 16B derinlik bağıntısı',value:rd},
    {symbol:'CRR7.5',title:'Çevrimsel dayanım',formula:'Ek 16B',value:CRRM75},
    {symbol:'FS',title:'Sıvılaşma güvenlik oranı',formula:'FS=Rτ/τdeprem',value:ratio}
  ]}
}

export type FoundationInterface='cast-in-place-soil'|'precast-soil'|'concrete-concrete'|'concrete-bedrock'
export interface FoundationCheckInput{
  B:number;L:number;N:number;Vx?:number;Vy?:number;V?:number;Mx:number;My:number;deltaTan?:number;cu?:number;area?:number
  groundwaterDepth?:number;foundationDepth?:number;passiveResistanceCharacteristic?:number;usePassiveResistance?:boolean;gammaRh?:number;gammaRp?:number
  seismic?:boolean;interfaceType?:FoundationInterface
}
export function foundationChecks(i:FoundationCheckInput){
  if(i.B<=0||i.L<=0)throw new Error('Temel boyutları pozitif olmalıdır.')
  if(!Number.isFinite(i.N)||i.N<0)throw new Error('Düşey temel yükü N sıfır veya pozitif olmalıdır.')
  const N=i.N,ex=N>0?i.My/N:0,ey=N>0?i.Mx/N:0
  const qAvg=N/(i.B*i.L)
  const contact=compressionContact(i.B,i.L,N,i.Mx,i.My)
  const qMax=contact.qMax,qMin=contact.qMin
  const effectiveLength=Math.max(0,i.L-2*Math.abs(ey)),effectiveWidth=Math.max(0,i.B-2*Math.abs(ex))
  const geometricEffectiveArea=effectiveWidth*effectiveLength
  const contactArea=i.area!=null?Math.max(0,i.area):contact.area
  const rh=i.gammaRh??1.10,rp=i.gammaRp??1.40
  if(rh<=0||rp<=0)throw new Error('γRh ve γRp pozitif olmalıdır.')
  const interfaceLimits:Record<FoundationInterface,number>={
    'cast-in-place-soil':.60,
    'precast-soil':.40,
    'concrete-concrete':.50,
    'concrete-bedrock':.50
  }
  const interfaceType=i.interfaceType
  if(!interfaceType)throw new Error('Temel-zemin ara yüzü seçilmelidir; tanδ değeri ara yüzü belirtilmeden varsayılamaz.')
  const tanLimit=interfaceLimits[interfaceType]
  const rawTan=i.deltaTan??tanLimit
  if(rawTan<0||!Number.isFinite(rawTan))throw new Error('tanδ sıfır veya pozitif ve sonlu olmalıdır.')
  const deltaTan=Math.min(tanLimit,rawTan)
  const warnings:string[]=[]
  if(i.deltaTan==null)warnings.push('tanδ girilmedi; seçilen arayüz için TBDY Tablo 16.3 üst sınırı kullanıldı. Proje özelinde deney/veri varsa doğrudan girilmelidir.')
  if(rawTan>tanLimit)warnings.push('Girilen tanδ, TBDY Tablo 16.3 seçilen arayüz üst sınırını aştığı için sınırlandırıldı.')
  if(rh!==1.10)warnings.push('TBDY 2018 Tablo 16.2 için γRh=1.10 kullanılmalıdır.')
  if(rp!==1.40)warnings.push('TBDY 2018 Tablo 16.2 için γRp=1.40 kullanılmalıdır.')
  const submerged=i.groundwaterDepth!=null&&i.foundationDepth!=null&&i.groundwaterDepth<=i.foundationDepth
  const seismic=Boolean(i.seismic)
  let rth=0
  let slidingMode:'undrained-cu'|'drained-interface'|'data-missing'='drained-interface'
  if(seismic&&submerged){
    slidingMode='undrained-cu'
    if(i.cu!=null&&Number.isFinite(i.cu)&&i.cu>0){
      rth=contactArea*i.cu/rh
    }else{
      slidingMode='data-missing'
      warnings.push('Temel tabanı YASS altında/aynı kotta ve deprem durumu seçili. TBDY 16.8.4.6 gereği sürtünme direnci drenajsız cu ile hesaplanmalıdır; cu girilmeden sürtünme direnci kredilendirilmedi.')
    }
  }else{
    rth=N*deltaTan/rh
    if(seismic&&submerged===false&&i.groundwaterDepth!=null)warnings.push('Deprem sürtünme kontrolünde temel tabanı YASS altında olmadığı için drenajlı arayüz yaklaşımı kullanıldı.')
  }
  const rpk=Math.max(0,i.passiveResistanceCharacteristic??0)
  const rpt=i.usePassiveResistance?rpk/rp:0
  if(rpk>0&&!i.usePassiveResistance)warnings.push('Karakteristik pasif direnç girilmiş ancak pasif direnç kredilendirmesi kapalıdır.')
  if(i.usePassiveResistance&&rpk<=0)warnings.push('Pasif direnç kullanımı açık ancak karakteristik pasif direnç pozitif girilmemiştir.')
  const designResistance=rth+.30*rpt
  const vx=i.Vx??(i.V??0),vy=i.Vy??0
  const vh=Math.hypot(vx,vy)
  const utilizationX=designResistance>0?Math.abs(vx)/designResistance:Infinity
  const utilizationY=designResistance>0?Math.abs(vy)/designResistance:Infinity
  const utilizationResultant=designResistance>0?vh/designResistance:Infinity
  const safeX=designResistance>0&&Math.abs(vx)<=designResistance,safeY=designResistance>0&&Math.abs(vy)<=designResistance
  const safeResultant=designResistance>0&&vh<=designResistance
  if(N===0&&(i.Mx!==0||i.My!==0))warnings.push('N=0 iken momentten eksantrisite hesaplanamaz.')
  if(Math.abs(ex)>i.B/6||Math.abs(ey)>i.L/6)warnings.push('Eksantrisite çekirdek dışına çıkıyor; kayma için sürtünme direncinde yalnızca gerçek basınçlı temas alanı esas alınmalıdır.')
  if(contactArea<=0)warnings.push('Temas alanı sıfırdır; sürtünme direnci ve temel temas kontrolleri geçersizdir.')
  const requiredData=slidingMode==='data-missing'||(i.usePassiveResistance&&rpk<=0)
  return{
    ex,ey,qAvg,qMax,qMin,contactArea,effectiveWidth,effectiveLength,
    horizontalResultant:vh,slidingFS:vh>0?designResistance/vh:Infinity,
    slidingCapacityX:designResistance,slidingCapacityY:designResistance,slidingCapacityResultant:designResistance,
    slidingUtilizationX:utilizationX,slidingUtilizationY:utilizationY,slidingUtilizationResultant:utilizationResultant,
    slidingSafeX:safeX,slidingSafeY:safeY,slidingSafeResultant:safeResultant,
    slidingResistanceFactor:rh,passiveResistanceDesign:rpt,passiveResistanceCharacteristic:rpk,slidingTanDelta:deltaTan,
    slidingTanDeltaLimit:tanLimit,slidingInterface:interfaceType,slidingMode,evaluable:!requiredData,warnings
  }
}

export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number}){
  const Ac=Math.PI*i.columnDiameter**2/4,ratio=Math.min(1,Ac/Math.max(i.spacing**2,1e-9)),composite=(1-ratio)*i.qultSoil+ratio*i.qultColumn*i.improvementFactor
  return{value:{Ac,ratio,composite,allowable:composite/Math.max(i.FS,1e-9),columnLoad:Ac*i.columnStrength/Math.max(i.FS,1e-9)},steps:[{symbol:'Ac',title:'Kolon kesit alanı',formula:'πd²/4',value:Ac},{symbol:'ρ',title:'İyileştirme oranı',formula:'Ac/Acell',value:ratio}],method:'Jet Grout ön model',source:'Proje kaynak paketi'}
}

export { effectiveStressAtDepth as stressAtDepth }
export const SOURCE_NOTES={
  investigation:'TBDY 2018 Bölüm 16 ve Ek 16A.',
  liquefaction:'TBDY 2018 Bölüm 16.6 ve Ek 16B.',
  bearing:'TBDY 2018 Bölüm 16.8.2–16.8.3; klasik yöntemler Terzaghi, Meyerhof, Hansen ve Vesic.',
  settlement:'TBDY 2018 Bölüm 16.8.3.4; oturma yöntemi ayrıca kaynaklandırılmalı ve deprem/liquefaction oturması ayrı değerlendirilmelidir.',
  foundation:'TBDY 2018 16.7.3.3 ve 16.8.4; γRv=1.40, γRh=1.10, γRp=1.40.',
  jetGroutAdvanced:'Jet Grout kompozit yaklaşımı; proje deneyleri ve kalite kontrol ile doğrulanmalıdır.'
}