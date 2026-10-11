import { calculateSurfaceFoundation, compressionContact } from './surface-foundation'
import { effectiveStressAtDepth } from './stress-profile'

export type BearingMethod='Terzaghi'|'Meyerhof'|'Hansen'|'Vesic'
export interface CalculationStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string;source?:string}
export interface CalculationResult<T>{value:T;steps:CalculationStep[];method:string;source:string;warnings?:string[]}
const rad=(d:number)=>d*Math.PI/180
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))

export interface BearingInput{B:number;L:number;Df:number;gamma:number;c:number;phi:number;FS:number;method:BearingMethod;waterReduction?:number;surcharge?:number;gammaBearing?:number}
function factors(phiDeg:number,method:BearingMethod){
  const phi=clamp(phiDeg,0,50),t=Math.tan(rad(phi))
  const Nq=phi===0?1:Math.exp(Math.PI*t)*Math.tan(Math.PI/4+rad(phi)/2)**2
  const Nc=phi===0?5.14:(Nq-1)/Math.max(t,1e-12)
  let Ngamma=0
  if(phi>0){
    if(method==='Terzaghi')Ngamma=2*(Nq-1)*t
    else if(method==='Meyerhof')Ngamma=(Nq-1)*Math.tan(rad(1.4*phi))
    else if(method==='Hansen')Ngamma=1.5*(Nq-1)*t
    else Ngamma=2*(Nq+1)*t
  }
  return{phi,t,Nq,Nc,Ngamma}
}
function classicalFactors(method:BearingMethod,B:number,L:number,Df:number,phi:number,Nq:number,Nc:number){
  const r=Math.min(B,L)/Math.max(B,L,1e-9),t=Math.tan(rad(phi)),Nphi=Math.tan(Math.PI/4+rad(phi)/2)**2
  if(method==='Terzaghi')return{sc:1+.3*r,sq:1,sg:1-.2*r,dc:1,dq:1,dg:1,ic:1,iq:1,ig:1,gc:1,gq:1,gg:1,bc:1,bq:1,bg:1}
  const sc=method==='Meyerhof'?1+.2*Nphi*r:1+(Nq/Math.max(Nc,1e-9))*r
  const sq=method==='Meyerhof'?(phi>10?1+.1*Nphi*r:1):1+r*t
  const sg=method==='Meyerhof'?(phi>10?sq:1):Math.max(.6,1-.4*r)
  const k=Df/Math.max(B,1e-9),kk=k<=1?k:Math.atan(k)
  const dc=method==='Meyerhof'?1+.2*Math.sqrt(Nphi)*k:1+.4*kk
  const dq=method==='Meyerhof'?(phi>10?1+.1*Math.sqrt(Nphi)*k:1):1+2*t*(1-Math.sin(rad(phi)))**2*kk
  return{sc,sq,sg,dc,dq,dg:1,ic:1,iq:1,ig:1,gc:1,gq:1,gg:1,bc:1,bq:1,bg:1}
}
export function bearingCapacity(i:BearingInput):CalculationResult<any>{
  if(![i.B,i.L,i.Df,i.gamma,i.c,i.phi,i.FS].every(Number.isFinite))throw new Error('Taşıma gücü girdileri sonlu sayılar olmalıdır.')
  if(i.B<=0||i.L<=0||i.Df<0||i.gamma<=0||i.c<0||i.FS<=0||i.phi<0||i.phi>50)throw new Error('Taşıma gücü girdileri fiziksel sınırlar dışında.')
  if(!['Terzaghi','Meyerhof','Hansen','Vesic'].includes(i.method))throw new Error('Desteklenmeyen klasik taşıma gücü yöntemi.')
  const gammaTerm=i.waterReduction??1
  if(!Number.isFinite(gammaTerm)||gammaTerm<0||gammaTerm>1)throw new Error('Su düzeltme katsayısı 0 ile 1 arasında olmalıdır.')
  if(i.surcharge!=null&&(!Number.isFinite(i.surcharge)||i.surcharge<0))throw new Error('Taşıma gücü sürşarjı negatif olmayan sonlu değer olmalıdır.')
  if(i.gammaBearing!=null&&(!Number.isFinite(i.gammaBearing)||i.gammaBearing<=0))throw new Error('Taşıma gücü terimi için efektif birim hacim ağırlık pozitif olmalıdır.')
  const f=factors(i.phi,i.method),m=classicalFactors(i.method,i.B,i.L,i.Df,f.phi,f.Nq,f.Nc),q=i.surcharge??i.gamma*i.Df,gammaBearing=i.gammaBearing??i.gamma
  const ultimate=i.c*f.Nc*m.sc*m.dc*m.ic*m.gc*m.bc+q*f.Nq*m.sq*m.dq*m.iq*m.gq*m.bq+.5*gammaBearing*i.B*f.Ngamma*m.sg*m.dg*m.ig*m.gg*m.bg*gammaTerm
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
  if(![i.B,i.q,i.Es,i.nu].every(Number.isFinite)||i.B<=0||i.q<0||i.Es<=0||i.nu<=-1||i.nu>=.5)throw new Error('Oturma girdileri geçersiz; B/Es pozitif, q negatif olmayan ve -1<ν<0.5 olmalıdır.')
  for(const [index,l] of (i.layers??[]).entries()){
    if(!Number.isFinite(l.thickness)||l.thickness<0)throw new Error('Oturma katmanı '+(index+1)+': kalınlık negatif olmayan sonlu bir değer olmalıdır.')
    for(const [name,value] of [['Cc',l.Cc],['e0',l.e0],['sigma0',l.sigma0],['dSigma',l.dSigma]] as const)if(value!==undefined&&!Number.isFinite(value))throw new Error('Oturma katmanı '+(index+1)+': '+name+' sonlu olmalıdır.')
    if(l.Cc!=null&&l.Cc<0||l.e0!=null&&l.e0<0||l.sigma0!=null&&l.sigma0<=0||l.dSigma!=null&&l.dSigma<0)throw new Error('Oturma katmanı '+(index+1)+': konsolidasyon parametreleri geçersiz.')
  }
  const immediate=i.q*i.B*(1-i.nu*i.nu)/i.Es
  const consolidation=(i.layers??[]).reduce((sum,l)=>l.Cc!=null&&l.e0!=null&&l.sigma0!=null&&l.dSigma!=null&&l.sigma0>0&&l.Cc>=0&&l.e0>-1?sum+ l.thickness*l.Cc/(1+l.e0)*Math.log10((l.sigma0+l.dSigma)/l.sigma0):sum,0)
  return{value:{immediate,consolidation,total:immediate+consolidation},method:'Basit elastik + açık konsolidasyon parametreleri',source:'Parametre eksikleri sessizce varsayılmaz.',steps:[
    {symbol:'si',title:'Elastik oturma',formula:'s=qB(1−ν²)/Es',value:immediate,unit:'m'},
    {symbol:'sc',title:'Konsolidasyon',formula:'ΣH·Cc/(1+e0)·log10(σ1/σ0)',value:consolidation,unit:'m'},
    {symbol:'st',title:'Toplam',formula:'st=si+sc',value:immediate+consolidation,unit:'m'}
  ]}
}

export interface LiquefactionInput{Mw:number;Sds:number;depth:number;N160f:number;sigmaV:number;sigmaVPrime:number}
export function liquefaction(i:LiquefactionInput):CalculationResult<any>{
  if(![i.depth,i.N160f,i.Mw,i.Sds,i.sigmaV,i.sigmaVPrime].every(Number.isFinite))throw new Error('Sıvılaşma girdileri sonlu sayılar olmalıdır.')
  if(i.depth<0||i.N160f<=0||i.N160f>=34)throw new Error('N1,60f değeri Ek 16B CRR bağıntısının 0<N1,60f<34 geçerlilik aralığında olmalıdır.')
  if(i.Mw<=0||i.Sds<0||i.sigmaV<=0||i.sigmaVPrime<=0||i.sigmaVPrime>i.sigmaV)throw new Error('Sıvılaşma gerilme ve deprem girdileri geçerli olmalıdır; 0<σ′v0≤σv0.')
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
  if(![i.B,i.L,i.N,i.Mx,i.My].every(Number.isFinite)||i.B<=0||i.L<=0)throw new Error('Temel boyutları, yükler ve momentler sonlu; B/L pozitif olmalıdır.')
  if(i.N<0)throw new Error('Düşey temel yükü N sıfır veya pozitif olmalıdır.')
  for(const [name,value] of [['Vx',i.Vx],['Vy',i.Vy],['V',i.V],['tanδ',i.deltaTan],['Cu',i.cu],['alan',i.area],['YASS',i.groundwaterDepth],['temel derinliği',i.foundationDepth],['pasif direnç',i.passiveResistanceCharacteristic],['γRh',i.gammaRh],['γRp',i.gammaRp]] as const)if(value!==undefined&&!Number.isFinite(value))throw new Error(name+' sonlu bir sayı olmalıdır.')
  if(i.area!=null&&i.area<=0)throw new Error('Temel alanı pozitif olmalıdır.')
  if(i.cu!=null&&i.cu<0)throw new Error('Cu negatif olamaz.')
  if(i.groundwaterDepth!=null&&i.groundwaterDepth<0||i.foundationDepth!=null&&i.foundationDepth<0)throw new Error('YASS ve temel derinliği negatif olamaz.')
  const N=i.N,ex=N>0?i.My/N:0,ey=N>0?i.Mx/N:0
  const qAvg=N/(i.B*i.L)
  const contact=compressionContact(i.B,i.L,N,i.Mx,i.My)
  const qMax=contact.qMax,qMin=contact.qMin
  const effectiveLength=Math.max(0,i.L-2*Math.abs(ey)),effectiveWidth=Math.max(0,i.B-2*Math.abs(ex))
  const geometricEffectiveArea=effectiveWidth*effectiveLength
  const contactArea=i.area!=null?Math.min(i.area,contact.area):contact.area
  const rh=i.gammaRh??1.10,rp=i.gammaRp??1.40
  if(Math.abs(rh-1.10)>1e-9||Math.abs(rp-1.40)>1e-9)throw new Error('TBDY 2018 Tablo 16.2 için γRh=1.10 ve γRp=1.40 kullanılmalıdır.')
  const interfaceLimits:Record<FoundationInterface,number>={
    'cast-in-place-soil':.60,
    'precast-soil':.40,
    'concrete-concrete':.50,
    'concrete-bedrock':.50
  }
  const interfaceProvided=i.interfaceType!=null
  const interfaceType=i.interfaceType??'cast-in-place-soil'
  const tanLimit=interfaceProvided?interfaceLimits[interfaceType]:0
  const rawTan=i.deltaTan??(interfaceProvided?tanLimit:0)
  if(rawTan<0||!Number.isFinite(rawTan))throw new Error('tanδ sıfır veya pozitif ve sonlu olmalıdır.')
  if(interfaceProvided&&rawTan>tanLimit+1e-9)throw new Error('Girilen tanδ, TBDY Tablo 16.3 seçilen arayüz üst sınırını aşamaz.')
  const deltaTan=rawTan
  const warnings:string[]=[]
  if(!interfaceProvided)warnings.push('Temel-zemin arayüzü seçilmedi; arayüz dayanımı kredilendirilmedi ve nihai kontrol veri eksik olarak işaretlendi.')
  if(i.deltaTan==null&&interfaceProvided)warnings.push('tanδ girilmedi; seçilen arayüz için TBDY Tablo 16.3 üst sınırı kullanıldı. Proje özelinde deney/veri varsa doğrudan girilmelidir.')
  const submerged=i.groundwaterDepth!=null&&i.foundationDepth!=null&&i.groundwaterDepth<=i.foundationDepth
  const seismic=Boolean(i.seismic)
  const groundwaterKnown=i.groundwaterDepth!=null&&i.foundationDepth!=null
  let rth=0
  let slidingMode:'undrained-cu'|'drained-interface'|'data-missing'='drained-interface'
  if(seismic&&!groundwaterKnown){
    slidingMode='data-missing'
    warnings.push('Deprem kayma kontrolünde YASS ve temel derinliği açıkça tanımlanmalıdır; su koşulu belirlenmeden sürtünme direnci kredilendirilmedi.')
  }else if(seismic&&submerged){
    slidingMode='undrained-cu'
    if(i.cu!=null&&Number.isFinite(i.cu)&&i.cu>0){
      rth=contactArea*i.cu/rh
    }else{
      slidingMode='data-missing'
      warnings.push('Temel tabanı YASS altında/aynı kotta ve deprem durumu seçili. TBDY 16.8.4.6 gereği sürtünme direnci drenajsız cu ile hesaplanmalıdır; cu girilmeden sürtünme direnci kredilendirilmedi.')
    }
  }else{
    rth=contactArea>0?N*deltaTan/rh:0
    if(seismic&&submerged===false)warnings.push('Deprem sürtünme kontrolünde temel tabanı YASS altında olmadığı için drenajlı arayüz yaklaşımı kullanıldı.')
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
  const requiredData=slidingMode==='data-missing'||!interfaceProvided||(i.usePassiveResistance&&rpk<=0)
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

export function jetGrout(i:{columnDiameter:number;spacing:number;qultSoil:number;qultColumn:number;improvementFactor:number;FS:number;columnStrength:number;}){
  if(!Number.isFinite(i.columnDiameter)||i.columnDiameter<=0)throw new Error('Jet Grout kolon çapı pozitif olmalıdır.')
  if(!Number.isFinite(i.spacing)||i.spacing<=0)throw new Error('Jet Grout aks aralığı pozitif olmalıdır.')
  if(!Number.isFinite(i.FS)||i.FS<=0)throw new Error('Jet Grout güvenlik katsayısı pozitif olmalıdır.')
  if(!Number.isFinite(i.qultSoil)||i.qultSoil<0||!Number.isFinite(i.qultColumn)||i.qultColumn<0||!Number.isFinite(i.columnStrength)||i.columnStrength<0)throw new Error('Jet Grout dayanım girdileri geçerli olmalıdır.')
  if(!Number.isFinite(i.improvementFactor)||i.improvementFactor<0)throw new Error('Jet Grout iyileştirme katsayısı negatif olamaz.')
  const Ac=Math.PI*i.columnDiameter**2/4,cell=i.spacing**2,ratio=Ac/Math.max(cell,1e-9)
  if(ratio>1)throw new Error('Kolon kesit alanı hücre alanını aşamaz; çap/aks aralığını kontrol edin.')
  const composite=(1-ratio)*i.qultSoil+ratio*i.qultColumn*i.improvementFactor
  const warnings=['Bu hesap kompozit ön modeldir; jet grout nihai tasarımı kolon geometrisi, kalite kontrol, dayanım deneyleri, süreklilik ve saha doğrulaması ile ayrıca doğrulanmalıdır.']
  return{value:{Ac,ratio,composite,allowable:composite/i.FS,columnLoad:Ac*i.columnStrength/i.FS,screeningOnly:true},steps:[{symbol:'Ac',title:'Kolon kesit alanı',formula:'πd²/4',value:Ac},{symbol:'ρ',title:'İyileştirme oranı',formula:'Ac/Acell',value:ratio},{symbol:'qcomp',title:'Kompozit taşıma modeli',formula:'(1−ρ)qsoil+ρ·qcolumn·I',value:composite}],method:'Jet Grout ön model',source:'Proje kaynak paketi',warnings}
}

export function stressAtDepth(depth:number,layers:{top:number;bottom:number;gamma:number;gammaSat:number}[],gwt:number){const r=effectiveStressAtDepth(depth,layers,gwt);return{sigmaV:r.sigmaV,sigmaVPrime:r.sigmaVPrime,u:r.porePressure}}
export const SOURCE_NOTES={
  investigation:'TBDY 2018 Bölüm 16 ve Ek 16A.',
  liquefaction:'TBDY 2018 Bölüm 16.6 ve Ek 16B.',
  bearing:'TBDY 2018 Bölüm 16.8.2–16.8.3; klasik yöntemler Terzaghi, Meyerhof, Hansen ve Vesic.',
  settlement:'TBDY 2018 Bölüm 16.8.3.4; oturma yöntemi ayrıca kaynaklandırılmalı ve deprem/liquefaction oturması ayrı değerlendirilmelidir.',
  foundation:'TBDY 2018 16.7.3.3 ve 16.8.4; γRv=1.40, γRh=1.10, γRp=1.40.',
  jetGroutAdvanced:'Jet Grout kompozit yaklaşımı; proje deneyleri ve kalite kontrol ile doğrulanmalıdır.'
}