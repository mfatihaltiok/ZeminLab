export type SptHammerType='donut'|'safety'|'automatic'|'measured'
export type SptSamplerType='standard'|'without-liner'|'liner'
export type SptSoilBehavior='cohesionless'|'cohesive'|'unknown'
export interface SptEngineInput{nField:number;energyRatio?:number;hammerType?:SptHammerType;boreholeDiameterMm?:number;sampler?:SptSamplerType;samplerCorrection?:number;rodLengthM?:number;effectiveStress?:number;fineContent?:number;soilBehavior?:SptSoilBehavior;applyOverburden?:boolean;applyDilatancy?:boolean}
export interface SptTraceStep{symbol:string;title:string;formula:string;value?:number;unit?:string;note?:string}
export interface SptEngineResult{nField:number;ce?:number;cb?:number;cs?:number;cr?:number;cn?:number;n60?:number;n1_60?:number;n1_60_dilatancy?:number;dilatancyApplied:boolean;trace:SptTraceStep[];warnings:string[];ready:boolean;n60Ready:boolean;n1_60Ready:boolean}
const finite=(v:number|undefined)=>v!==undefined&&Number.isFinite(v)
function boreholeFactor(diameter?:number){if(!finite(diameter))return undefined;if(diameter!<65||diameter!>200)throw new Error('TBDY Tablo 16B.1 dışındaki sondaj çapı için CB belirlenmelidir; 65–200 mm aralığında veri giriniz.');if(diameter!<=115)return 1;if(diameter!<=150)return 1.05;return 1.15}
function samplerFactor(sampler?:SptSamplerType,correction?:number){if(sampler===undefined)return undefined;if(sampler==='without-liner'){if(!finite(correction)||correction!<1.10||correction!>1.30)throw new Error('İç tüpsüz numune alıcı için CS değeri açıkça 1.10–1.30 aralığında girilmelidir.');return correction!}if(correction!==undefined&&(!Number.isFinite(correction)||correction<=0))throw new Error('CS geçerli bir pozitif değer olmalıdır.');return correction??1}
function rodFactor(length?:number){if(!finite(length))return undefined;if(length!<3)throw new Error('TBDY Tablo 16B.1 için rod boyu 3 m’den küçükse CR tanımlı değildir.');if(length!<4)return .75;if(length!<6)return .85;if(length!<10)return .95;return 1}
export type SoilBehavior='cohesionless'|'cohesive'|'unknown'
export function soilBehaviorFromCode(code?:string):SoilBehavior{
  if(!code)return'unknown'
  const raw=code.trim().replace(/\s+/g,'')
  const upper=raw.toUpperCase().replace(/İ/g,'I')
  if(/(CL|CI|CH|ML|MH|SI)$/.test(upper)||/^(CI|CL|CH|ML|MH|SI)/.test(upper)||/PT$/.test(upper))return'cohesive'
  if(/^(SM|SA|GR|SP|SW|GW|GP|GM)/.test(upper)||/(SA|GR)$/.test(upper)||upper.includes('SAND')||upper.includes('KUM')||upper.includes('CAKIL'))return'cohesionless'
  return'unknown'
}
export function isCohesionlessSoilCode(code?:string){return soilBehaviorFromCode(code)==='cohesionless'}
export function fineContentCorrection(fines:number){if(!Number.isFinite(fines))throw new Error('İnce dane oranı geçerli olmalıdır.');const fc=Math.max(0,Math.min(100,fines));if(fc<=5)return{alpha:0,beta:1};if(fc<35)return{alpha:Math.exp(1.76-190/(fc*fc)),beta:.99+Math.pow(fc,1.5)/1000};return{alpha:5,beta:1.2}}
export function calculateSpt(input:SptEngineInput):SptEngineResult{
  if(!Number.isFinite(input.nField)||input.nField<0)throw new Error('SPT N değeri geçerli olmalıdır.')
  const warnings:string[]=[];const trace:SptTraceStep[]=[{symbol:'N',title:'Ham SPT',formula:'N=N₂+N₃',value:input.nField,note:'Sahada ölçülen 30 cm penetrasyon vuruş sayısı.'}]
  const rawEr=input.energyRatio
  let er: number|undefined = rawEr!==undefined&&Number.isFinite(rawEr)&&rawEr>0&&rawEr<=160?rawEr:undefined
  if(er!==undefined&&input.hammerType==='donut'&&(er<45||er>100)) throw new Error('Halkalı/donut tokmak için ER 45–100 % aralığında olmalıdır.')
  if(er!==undefined&&input.hammerType==='safety'&&(er<60||er>117)) throw new Error('Güvenli/safety tokmak için ER 60–117 % aralığında olmalıdır.')
  if(er!==undefined&&input.hammerType==='automatic'&&(er<90||er>160)) throw new Error('Otomatik tokmak için ER 90–160 % aralığında olmalıdır.')
  if(rawEr!==undefined&&!Number.isFinite(rawEr)) er=undefined
  if(er===undefined)warnings.push('ER (enerji oranı) girilmeden CE hesaplanmaz; hammerType tek başına sayısal CE üretmez.')
  const cb=boreholeFactor(input.boreholeDiameterMm);if(cb===undefined)warnings.push('Sondaj çapı bilinmiyor; CB hesaplanmadı.')
  const cs=samplerFactor(input.sampler,input.samplerCorrection);if(cs===undefined)warnings.push('Numune alıcı tipi seçilmedi; CS hesaplanmadı.')
  const cr=rodFactor(input.rodLengthM);if(cr===undefined)warnings.push('Rod boyu bilinmiyor; CR hesaplanmadı.')
  const ce=er===undefined?undefined:er/60
  trace.push({symbol:'CE',title:'Enerji düzeltmesi',formula:'CE=ER/60',value:ce,note:er===undefined?'ER eksik':('ER='+er.toFixed(1)+' %')})
  trace.push({symbol:'CB',title:'Sondaj çapı düzeltmesi',formula:'CB=f(D)',value:cb})
  trace.push({symbol:'CS',title:'Numune alıcı düzeltmesi',formula:'CS=f(sampler)',value:cs})
  trace.push({symbol:'CR',title:'Rod boyu düzeltmesi',formula:'CR=f(L)',value:cr})
  const n60Ready=er!==undefined&&cb!==undefined&&cs!==undefined&&cr!==undefined
  const n60=n60Ready?input.nField*ce!*cb!*cs!*cr!:undefined
  if(n60Ready)trace.push({symbol:'N60',title:'Standartlaştırılmış SPT',formula:'N·CE·CB·CS·CR',value:n60});else warnings.push('N60 için ER, CB, CS ve CR girdileri eksiksiz olmalıdır.')
  let cn:number|undefined,n1_60:number|undefined
  const behavior=input.soilBehavior??'unknown',applyOverburden=input.applyOverburden??true
  if(!n60Ready){warnings.push('(N1)60 için önce N60 tamamlanmalıdır.')}
  else if(applyOverburden&&behavior==='cohesionless'){
    if(finite(input.effectiveStress)&&input.effectiveStress!>0){cn=Math.min(1.70,9.78/Math.sqrt(input.effectiveStress!));n1_60=n60!*cn;trace.push({symbol:'CN',title:'Örtü basıncı düzeltmesi',formula:'CN=min(1.70,9.78/√σ′v0)',value:cn,note:'Kohezyonsuz zemin.'});trace.push({symbol:'(N1)60',title:'Normalize SPT',formula:'CN·N60',value:n1_60})}
    else warnings.push('Kohezyonsuz zemin için σ′v0 bilinmeden CN/(N1)60 hesaplanmaz.')
  }else if(behavior==='cohesive'){trace.push({symbol:'CN',title:'Örtü basıncı düzeltmesi',formula:'CN uygulanmaz',note:'Zemin kohezyonlu olarak sınıflandı.'})}
  else if(behavior==='unknown')warnings.push('Zemin davranışı kohezyonsuz/kohezyonlu olarak belirlenmeden CN/(N1)60 hesaplanmaz.')
  else if(!applyOverburden)warnings.push('CN kullanıcı tarafından kapatıldı.')
  const fines=Math.max(0,Math.min(100,input.fineContent??0))
  const dilatancyApplied=Boolean(n1_60!==undefined&&input.applyDilatancy&&behavior==='cohesionless'&&fines<35&&finite(input.effectiveStress)&&input.effectiveStress!>0&&n1_60!>15)
  const n1_60_dilatancy=dilatancyApplied?15+.5*(n1_60!-15):undefined
  if(dilatancyApplied)trace.push({symbol:'(N1)60,d',title:'Dilatansi düzeltmesi',formula:'15+0.5[(N1)60−15]',value:n1_60_dilatancy})
  return{nField:input.nField,ce,cb,cs,cr,cn,n60,n1_60,n1_60_dilatancy,dilatancyApplied,trace,warnings,ready:n60Ready,n60Ready,n1_60Ready:n1_60!==undefined}
}