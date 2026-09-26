export type SptHammerType='donut'|'safety'|'automatic'|'measured'
export type SptSamplerType='standard'|'without-liner'|'liner'

export interface SptEngineInput{
  nField:number
  ce?:number
  cb?:number
  cs?:number
  energyRatio?:number
  hammerType?:SptHammerType
  boreholeDiameterMm?:number
  sampler?:SptSamplerType
  samplerCorrection?:number
  rodLengthM?:number
  sptDepthM?:number
  effectiveStress?:number
  fineContent?:number
  claySoil?:boolean
  claySoilSource?:string
  applyOverburden?:boolean
  applyDilatancy?:boolean
}
export interface SptTraceStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string}
export interface SptEngineResult{
  nField:number;ce:number;cb:number;cs:number;cr:number;cn:number;n60:number;n1_60:number
  n1_60_dilatancy?:number;alpha?:number;beta?:number;n1_60f?:number;dilatancyApplied:boolean;hasAssumptions:boolean;trace:SptTraceStep[];warnings:string[]
}

function finitePositive(value:number|undefined){return value!==undefined&&Number.isFinite(value)&&value>0}

function resolveEnergyRatio(input:SptEngineInput){
  if(finitePositive(input.energyRatio))return {value:input.energyRatio!,source:'ölçülmüş/girilen enerji oranı',assumption:false}
  if(input.hammerType==='automatic')return {value:90,source:'otomatik darbeli tokmak için TBDY Tablo 16B.1 alt sınırı %90 varsayımı',assumption:true}
  if(input.hammerType==='donut')return {value:45,source:'donut şahmerdan için proje varsayımı %45',assumption:true}
  if(input.hammerType==='safety')return {value:60,source:'safety şahmerdan için proje varsayımı %60',assumption:true}
  return {value:60,source:'enerji oranı girilmedi; %60 proje varsayımı',assumption:true}
}

function directCoefficient(name:string,value:number|undefined,min:number,max:number,allowed?:number[]){
  if(value===undefined)return undefined
  if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} katsayısı ${min}–${max} aralığında olmalıdır.`)
  if(allowed&&!allowed.some(x=>Math.abs(x-value)<1e-9))throw new Error(`${name} için geçerli değer seçilmelidir.`)
  return{value,source:'kullanıcı seçimi',assumption:false}
}

function boreholeFactor(diameter?:number){
  if(diameter===undefined)return 1
  if(!Number.isFinite(diameter)||!((diameter>=65&&diameter<=115)||diameter===150||diameter===200))throw new Error('CB için yalnız TBDY Tablo 16B.1’deki çap sınıfları kullanılabilir: 65–115 mm, 150 mm veya 200 mm.')
  if(diameter>=65&&diameter<=115)return 1
  if(diameter===150)return 1.05
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

export function rodLengthCorrectionTBDY2018(length:number):number{
  if(!Number.isFinite(length)||length<3)throw new Error('TBDY Tablo 16B.1 için toplam tij boyu 3 m veya daha büyük olmalıdır; 3 m’den küçük uzunlukta CR tanımlı değildir.')
  if(length<4)return .75
  if(length<6)return .85
  if(length<=10)return .95
  return 1
}

function rodFactor(length?:number){
  if(length===undefined)return 1
  return rodLengthCorrectionTBDY2018(length)
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
  if(input.rodLengthM!==undefined&&input.sptDepthM!==undefined&&input.rodLengthM<input.sptDepthM)throw new Error('Toplam tij boyu SPT deney derinliğinden kısa olamaz.')
  const ceResolved=input.ce!==undefined?directCoefficient('CE',input.ce,.45,1.60)!:(()=>{const er=resolveEnergyRatio(input);if(er.value<=0||er.value>100)throw new Error('SPT enerji oranı %0–100 arasında olmalıdır.');return{value:er.value/60,source:er.source,assumption:er.assumption}})()
  const cbResolved=input.cb!==undefined?directCoefficient('CB',input.cb,1,1.15,[1,1.05,1.15])!: {value:boreholeFactor(input.boreholeDiameterMm),source:'sondaj çapından',assumption:false}
  const csResolved=input.cs!==undefined?directCoefficient('CS',input.cs,1,1.30)!: {value:samplerFactor(input),source:'numune alıcıdan',assumption:false}
  const crResolved=input.rodLengthM!==undefined
    ? {value:rodFactor(input.rodLengthM),source:'TBDY Tablo 16B.1 toplam tij boyundan',assumption:false}
    : {value:1,source:'toplam tij boyu girilmedi; geçici CR=1.00',assumption:true}
  if(ceResolved.assumption)warnings.push('CE için otomatik enerji oranı kullanıldı; proje-geneli CE seçimi yapıldığında bu varsayım kaldırılır. '+ceResolved.source)
  const ce=ceResolved.value,cb=cbResolved.value,cs=csResolved.value,cr=crResolved.value
  const assumptions:string[]=[]
  if(input.cb===undefined&&input.boreholeDiameterMm===undefined)assumptions.push('CB: proje-geneli CB seçimi ve sondaj çapı verilmedi; CB=1 varsayıldı.')
  if(input.rodLengthM===undefined)assumptions.push('CR: toplam tij boyu girilmedi; TBDY Tablo 16B.1’e göre CR otomatik hesaplanması için her SPT deneyinde tij boyu girilmelidir.')
  if(input.cs===undefined&&input.sampler==='without-liner'&&input.samplerCorrection===undefined)assumptions.push('CS: iç tüpsüz numune alıcı için CS=1.10 varsayıldı.')
  const n60=input.nField*ce*cb*cs*cr
  const sigma=input.effectiveStress
  const applyOverburden=input.applyOverburden??true
  const claySoil=input.claySoil===true
  let cn=1
  if(applyOverburden){
    if(claySoil){
      cn=1
    }else if(finitePositive(sigma)){
      cn=Math.min(1.70,9.78/Math.sqrt(sigma!))
    }else{
      warnings.push('Etkin düşey gerilme verilmediği için CN uygulanmadı; (N1)60 yalnız N60 olarak raporlanır.')
    }
  }
  const n1_60=n60*cn
  const fines=input.fineContent
  const fc=fines!==undefined&&Number.isFinite(fines)&&fines>=0&&fines<=100?fineContentCorrection(fines):undefined
  const alpha=fc?.alpha
  const beta=fc?.beta
  const n1_60f=fc?alpha!+beta!*n1_60:undefined
  if(fines!==undefined&&(!Number.isFinite(fines)||fines<0||fines>100))throw new Error('İnce dane oranı 0–100% arasında olmalıdır.')
  const dilatancyApplied=Boolean(input.applyDilatancy&&fines<35&&finitePositive(sigma)&&n1_60>15)
  const n1_60_dilatancy=dilatancyApplied?15+.5*(n1_60-15):undefined
  const trace:SptTraceStep[]=[
    {symbol:'N',title:'Ham SPT',formula:'N=N₂+N₃',value:input.nField,note:'Sahada ölçülen 30 cm penetrasyon vuruş sayısı.'},
    {symbol:'CE',title:'Enerji düzeltmesi',formula:'CE=ER/60 veya proje katsayısı',value:ce,note:ceResolved.source},
    {symbol:'CB',title:'Sondaj çapı düzeltmesi',formula:'CB=f(D) veya proje katsayısı',value:cb,note:cbResolved.source},
    {symbol:'CS',title:'Numune alıcı düzeltmesi',formula:'CS=f(sampler) veya proje katsayısı',value:cs,note:csResolved.source},
    {symbol:'CR',title:'Tij boyu düzeltmesi',formula:input.rodLengthM!==undefined?'CR=f(L) · TBDY 16B.1':'CR=tij boyu verilmedi',value:cr,note:crResolved.source},
    {symbol:'N60',title:'Standartlaştırılmış SPT',formula:'N60=N·CE·CB·CS·CR',value:n60},
    {symbol:'CN',title:'Örtü basıncı düzeltmesi',formula:claySoil?'CN=1.00 (killi/kohezyonlu zemin)':'CN=min(1.70,9.78/√σ′v0)',value:cn,note:claySoil?(input.claySoilSource??'Killi zemin'):finitePositive(sigma)?'σ′v0='+sigma!.toFixed(2)+' kPa':'Uygulanmadı'},
    {symbol:'(N1)60',title:'Normalize SPT',formula:'(N1)60=CN·N60',value:n1_60}
  ]
  if(fc){
    trace.push({symbol:'α',title:'İnce dane katsayısı',formula:'α=f(IDI)',value:alpha!,note:'FC='+fines!.toFixed(2)+' %'})
    trace.push({symbol:'β',title:'İnce dane katsayısı',formula:'β=f(IDI)',value:beta!})
    trace.push({symbol:'(N1)60f',title:'İnce dane düzeltilmiş SPT',formula:'(N1)60f=α+β(N1)60',value:n1_60f!})
  }
  if(dilatancyApplied){
    trace.push({symbol:'(N1)60,d',title:'Dilatansi düzeltmesi',formula:'15+0.5[(N1)60−15]',value:n1_60_dilatancy,note:'Yalnız yöntem açıkça gerektiriyorsa kullanılmalıdır.'})
  }
  warnings.push(...assumptions)
  return{nField:input.nField,ce,cb,cs,cr,cn,n60,n1_60,n1_60_dilatancy,alpha,beta,n1_60f,dilatancyApplied,hasAssumptions:ceResolved.assumption||assumptions.length>0,trace,warnings}
}