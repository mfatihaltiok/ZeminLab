export type SptHammerType='donut'|'safety'|'automatic'|'measured'
export type SptSamplerType='standard'|'without-liner'|'liner'

export interface SptEngineInput{
  nField:number
  energyRatio?:number
  hammerType?:SptHammerType
  boreholeDiameterMm?:number
  sampler?:SptSamplerType
  samplerCorrection?:number
  rodLengthM?:number
  effectiveStress?:number
  fineContent?:number
  applyOverburden?:boolean
  applyDilatancy?:boolean
}
export interface SptTraceStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string}
export interface SptEngineResult{
  nField:number;ce:number;cb:number;cs:number;cr:number;cn:number;n60:number;n1_60:number
  n1_60_dilatancy?:number;dilatancyApplied:boolean;hasAssumptions:boolean;trace:SptTraceStep[];warnings:string[]
}

function finitePositive(value:number|undefined){return value!==undefined&&Number.isFinite(value)&&value>0}

function resolveEnergyRatio(input:SptEngineInput){
  if(finitePositive(input.energyRatio))return {value:input.energyRatio!,source:'ölçülmüş/girilen enerji oranı',assumption:false}
  if(input.hammerType==='automatic')return {value:80,source:'otomatik şahmerdan için proje varsayımı %80',assumption:true}
  if(input.hammerType==='donut')return {value:45,source:'donut şahmerdan için proje varsayımı %45',assumption:true}
  if(input.hammerType==='safety')return {value:60,source:'safety şahmerdan için proje varsayımı %60',assumption:true}
  return {value:60,source:'enerji oranı girilmedi; %60 proje varsayımı',assumption:true}
}

function boreholeFactor(diameter?:number){
  if(diameter===undefined)return 1
  if(!Number.isFinite(diameter)||diameter<65||diameter>200)throw new Error('TBDY Tablo 16B.1 dışındaki sondaj çapı için CB belirlenmelidir; 65–200 mm aralığında veri giriniz.')
  if(diameter<=115)return 1
  if(diameter<=150)return 1.05
  return 1.15
}

function samplerFactor(input:SptEngineInput){
  if(input.sampler!=='without-liner')return 1
  const requested=input.samplerCorrection
  if(requested!==undefined){
    if(!Number.isFinite(requested)||requested<1.10||requested>1.30)throw new Error('İç tüpsüz numune alıcı için CS değeri 1.10–1.30 aralığında olmalıdır.')
    return requested
  }
  return 1.10
}

function rodFactor(length?:number){
  if(length===undefined)return 1
  if(!Number.isFinite(length)||length<3)throw new Error('TBDY Tablo 16B.1 için rod boyu 3 m’den küçükse CR tanımlı değildir.')
  if(length<4)return .75
  if(length<6)return .85
  if(length<10)return .95
  return 1
}

export function fineContentCorrection(fines:number){
  if(!Number.isFinite(fines)||fines<0||fines>100)throw new Error('FC 0-100 araliginda olmalidir.')
  const fc=fines
  if(fc<=5)return{alpha:0,beta:1}
  if(fc<35)return{alpha:Math.exp(1.76-190/(fc*fc)),beta:.99+Math.pow(fc,1.5)/1000}
  return{alpha:5,beta:1.2}
}

export function calculateSpt(input:SptEngineInput):SptEngineResult{
  if(!Number.isFinite(input.nField)||input.nField<0)throw new Error('SPT N değeri geçerli olmalıdır.')
  const warnings:string[]=[]
  const er=resolveEnergyRatio(input)
  if(er.value<=0||er.value>100)throw new Error('SPT enerji oranı %0–100 arasında olmalıdır.')
  if(er.assumption)warnings.push('CE için kullanılan enerji oranı TBDY Tablo 16B.1 içindeki olası aralıktan seçilmiş bir proje varsayımıdır; ölçülmüş ER varsa girilmelidir. '+er.source)
  const ce=er.value/60
  const cb=boreholeFactor(input.boreholeDiameterMm)
  const cs=samplerFactor(input)
  const cr=rodFactor(input.rodLengthM)
  const assumptions:string[]=[]
  if(input.boreholeDiameterMm===undefined)assumptions.push('CB: sondaj çapı girilmedi, CB=1 varsayıldı.')
  if(input.rodLengthM===undefined)assumptions.push('CR: tij boyu girilmedi, CR=1 varsayıldı.')
  if(input.sampler==='without-liner'&&input.samplerCorrection===undefined)assumptions.push('CS: iç tüpsüz numune alıcı için CS=1.10 varsayıldı.')
  const n60=input.nField*ce*cb*cs*cr
  const sigma=input.effectiveStress
  const applyOverburden=input.applyOverburden??true
  let cn=1
  if(applyOverburden){
    if(finitePositive(sigma))cn=Math.min(1.70,9.78/Math.sqrt(sigma!))
    else warnings.push('Etkin düşey gerilme verilmediği için CN uygulanmadı; (N1)60 yalnız N60 olarak raporlanır.')
  }
  const n1_60=n60*cn
  const fines=input.fineContent
  if(fines!==undefined&&(!Number.isFinite(fines)||fines<0||fines>100))throw new Error('İnce dane oranı 0–100% arasında olmalıdır.')
  const dilatancyApplied=Boolean(input.applyDilatancy&&fines<35&&finitePositive(sigma)&&n1_60>15)
  const n1_60_dilatancy=dilatancyApplied?15+.5*(n1_60-15):undefined
  const trace:SptTraceStep[]=[
    {symbol:'N',title:'Ham SPT',formula:'N=N₂+N₃',value:input.nField,note:'Sahada ölçülen 30 cm penetrasyon vuruş sayısı.'},
    {symbol:'CE',title:'Enerji düzeltmesi',formula:'CE=ER/60',value:ce,note:'ER='+er.value.toFixed(1)+' %'},
    {symbol:'CB',title:'Sondaj çapı düzeltmesi',formula:'CB=f(D)',value:cb},
    {symbol:'CS',title:'Numune alıcı düzeltmesi',formula:'CS=f(sampler)',value:cs},
    {symbol:'CR',title:'Rod boyu düzeltmesi',formula:'CR=f(L)',value:cr},
    {symbol:'N60',title:'Standartlaştırılmış SPT',formula:'N60=N·CE·CB·CS·CR',value:n60},
    {symbol:'CN',title:'Örtü basıncı düzeltmesi',formula:'CN=min(1.70,9.78/√σ′v0)',value:cn,note:finitePositive(sigma)?'σ′v0='+sigma!.toFixed(2)+' kPa':'Uygulanmadı'},
    {symbol:'(N1)60',title:'Normalize SPT',formula:'(N1)60=CN·N60',value:n1_60}
  ]
  if(dilatancyApplied){
    trace.push({symbol:'(N1)60,d',title:'Dilatansi düzeltmesi',formula:'15+0.5[(N1)60−15]',value:n1_60_dilatancy,note:'Yalnız yöntem açıkça gerektiriyorsa kullanılmalıdır.'})
  }
  warnings.push(...assumptions)
  return{nField:input.nField,ce,cb,cs,cr,cn,n60,n1_60,n1_60_dilatancy,dilatancyApplied,hasAssumptions:er.assumption||assumptions.length>0,trace,warnings}
}