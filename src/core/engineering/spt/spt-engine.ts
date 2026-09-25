export type SptHammerType='donut'|'safety'|'automatic'|'measured'
export type SptSamplerType='standard'|'without-liner'|'liner'
export interface SptEngineInput{nField:number;energyRatio?:number;hammerType?:SptHammerType;boreholeDiameterMm?:number;sampler?:SptSamplerType;samplerCorrection?:number;rodLengthM?:number;effectiveStress?:number;fineContent?:number;applyOverburden?:boolean;applyDilatancy?:boolean}
export interface SptTraceStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string}
export interface SptEngineResult{nField:number;ce:number;cb:number;cs:number;cr:number;cn:number;n60:number;n1_60:number;n1_60_dilatancy?:number;dilatancyApplied:boolean;correctionReady:boolean;normalizationReady:boolean;missingCorrections:string[];trace:SptTraceStep[];warnings:string[]}
const finitePositive=(value:number|undefined)=>value!==undefined&&Number.isFinite(value)&&value>0
function resolveEnergyRatio(input:SptEngineInput){if(finitePositive(input.energyRatio))return{value:input.energyRatio!,source:'Girilen enerji oranı'};if(input.hammerType==='automatic')return{value:80,source:'Seçilen automatic şahmerdan için %80'};if(input.hammerType==='safety')return{value:60,source:'Seçilen safety şahmerdan için %60'};if(input.hammerType==='donut')return{value:45,source:'Seçilen donut şahmerdan için %45'};return{value:undefined,source:'Enerji oranı veya şahmerdan tipi seçilmedi.'}}
function boreholeFactor(diameter:number|undefined){if(diameter===undefined)return{value:undefined,source:'Sondaj çapı girilmedi.'};if(!Number.isFinite(diameter)||diameter<65||diameter>200)throw new Error('TBDY Tablo 16B.1 dışındaki sondaj çapı için CB açıkça belirlenmelidir; 65–200 mm aralığında geçerli çap giriniz.');if(diameter<=115)return{value:1,source:'115 mm ve altı'};if(diameter<=150)return{value:1.05,source:'116–150 mm'};return{value:1.15,source:'151–200 mm'}}
function samplerFactor(input:SptEngineInput){if(input.sampler==='standard'||input.sampler==='liner')return{value:1,source:input.sampler==='standard'?'Standart numune alıcı':'İç tüplü numune alıcı'};if(input.sampler==='without-liner'){if(input.samplerCorrection===undefined)return{value:undefined,source:'İç tüpsüz numune alıcı için CS girilmedi.'};if(!Number.isFinite(input.samplerCorrection)||input.samplerCorrection<1.10||input.samplerCorrection>1.30)throw new Error('İç tüpsüz numune alıcı için CS değeri 1.10–1.30 aralığında olmalıdır.');return{value:input.samplerCorrection,source:'Girilen CS'}}return{value:undefined,source:'Numune alıcı tipi seçilmedi.'}}
function rodFactor(length:number|undefined){if(length===undefined)return{value:undefined,source:'Rod boyu girilmedi.'};if(!Number.isFinite(length)||length<3)throw new Error('TBDY Tablo 16B.1 için rod boyu 3 m’den küçükse CR tanımlı değildir.');if(length<4)return{value:.75,source:'3–4 m'};if(length<6)return{value:.85,source:'4–6 m'};if(length<10)return{value:.95,source:'6–10 m'};return{value:1,source:'≥10 m'}}
export function fineContentCorrection(fines:number){const fc=Math.max(0,Math.min(100,fines));if(fc<=5)return{alpha:0,beta:1};if(fc<35)return{alpha:Math.exp(1.76-190/(fc*fc)),beta:.99+Math.pow(fc,1.5)/1000};return{alpha:5,beta:1.2}}
export function calculateSpt(input:SptEngineInput):SptEngineResult{
  if(!Number.isFinite(input.nField)||input.nField<0)throw new Error('SPT N değeri geçerli olmalıdır.')
  const warnings:string[]=[],missing:string[]=[]
  const er=resolveEnergyRatio(input);if(er.value===undefined)missing.push(er.source)
  const cbInfo=boreholeFactor(input.boreholeDiameterMm);if(cbInfo.value===undefined)missing.push(cbInfo.source)
  const csInfo=samplerFactor(input);if(csInfo.value===undefined)missing.push(csInfo.source)
  const crInfo=rodFactor(input.rodLengthM);if(crInfo.value===undefined)missing.push(crInfo.source)
  if(er.value!==undefined&&input.energyRatio===undefined)warnings.push(er.source)
  const ce=er.value===undefined?0:er.value/60,cb=cbInfo.value??0,cs=csInfo.value??0,cr=crInfo.value??0
  const correctionReady=missing.length===0
  const n60=correctionReady?input.nField*ce*cb*cs*cr:0
  const sigma=input.effectiveStress,applyOverburden=input.applyOverburden
  let cn=1,n1_60=0,normalizationReady=false
  if(applyOverburden===true){if(finitePositive(sigma)){cn=Math.min(1.70,9.78/Math.sqrt(sigma!));normalizationReady=true}else warnings.push('CN için etkin düşey gerilme verilmedi.')}else if(applyOverburden===false){normalizationReady=true}else warnings.push('CN / (N1)60 uygulanıp uygulanmayacağı seçilmedi.')
  if(correctionReady&&normalizationReady)n1_60=n60*cn
  else if(correctionReady)warnings.push('N60 hesaplandı; (N1)60 için CN ayarı/girdi tamamlanmadı.')
  const fines=Math.max(0,Math.min(100,input.fineContent??0))
  const dilatancyApplied=Boolean(input.applyDilatancy===true&&correctionReady&&normalizationReady&&fines<35&&finitePositive(sigma)&&n1_60>15)
  const n1_60_dilatancy=dilatancyApplied?15+.5*(n1_60-15):undefined
  const trace:SptTraceStep[]=[
    {symbol:'N',title:'Ham SPT',formula:'N=N₂+N₃',value:input.nField,note:'Sahada ölçülen 30 cm penetrasyon vuruş sayısı.'},
    {symbol:'CE',title:'Enerji düzeltmesi',formula:'CE=ER/60',value:er.value,note:er.value!==undefined?'ER='+er.value.toFixed(1)+' %':er.source},
    {symbol:'CB',title:'Sondaj çapı düzeltmesi',formula:'CB=f(D)',value:cbInfo.value,note:cbInfo.source},
    {symbol:'CS',title:'Numune alıcı düzeltmesi',formula:'CS=f(sampler)',value:csInfo.value,note:csInfo.source},
    {symbol:'CR',title:'Rod boyu düzeltmesi',formula:'CR=f(L)',value:crInfo.value,note:crInfo.source},
    {symbol:'N60',title:'Standartlaştırılmış SPT',formula:'N60=N·CE·CB·CS·CR',value:correctionReady?n60:undefined,note:correctionReady?'Tamam':'Düzeltme verileri eksik'},
    {symbol:'CN',title:'Örtü basıncı düzeltmesi',formula:'CN=min(1.70,9.78/√σ′v0)',value:applyOverburden===true&&normalizationReady?cn:undefined,note:applyOverburden===false?'Uygulanmadı':normalizationReady?'σ′v0='+sigma!.toFixed(2)+' kPa':'Eksik veri'},
    {symbol:'(N1)60',title:'Normalize SPT',formula:'(N1)60=CN·N60',value:correctionReady&&normalizationReady?n1_60:undefined}
  ]
  if(dilatancyApplied)trace.push({symbol:'(N1)60,d',title:'Dilatansi düzeltmesi',formula:'15+0.5[(N1)60−15]',value:n1_60_dilatancy,note:'Yalnız ilgili yöntem açıkça gerektiriyorsa kullanılmalıdır.'})
  return{nField:input.nField,ce,cb,cs,cr,cn,n60,n1_60,n1_60_dilatancy,dilatancyApplied,correctionReady,normalizationReady,missingCorrections:missing,trace,warnings}
}