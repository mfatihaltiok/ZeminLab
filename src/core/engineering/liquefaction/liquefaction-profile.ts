import { calculateSpt, fineContentCorrection, isCohesionlessSoilCode, type SptEngineInput, type SptTraceStep } from '../spt/spt-engine'
import type { EarthquakeDesignClass } from '../../models/project'

export type LiquefactionSoilGroup='ZA'|'ZB'|'ZC'|'ZD'|'ZE'|'ZF'
export interface LiquefactionSoilLayer{top:number;bottom:number;gamma:number;gammaSat:number;soil?:string;finesContent?:number;plasticityIndex?:number;clayContent?:number}
export interface LiquefactionSptRecord{depth:number;nField:number;fineContent?:number;energyRatio?:number;hammerType?:SptEngineInput['hammerType'];boreholeDiameterMm?:number;sampler?:SptEngineInput['sampler'];samplerCorrection?:number;rodLengthM?:number;plasticityIndex?:number;waterContent?:number;clayContent?:number;soil?:string}
export interface LiquefactionProfileInput{
 Mw:number;Sds:number;gwt:number;layers:LiquefactionSoilLayer[];spt:LiquefactionSptRecord[];gammaW?:number;applyDilatancy?:boolean
 dts?:EarthquakeDesignClass;soilGroup?:LiquefactionSoilGroup;continuousOrThickLens?:boolean;foundationDepth?:number;siteSpecificResponseAnalysisCompleted?:boolean
}
export interface LiquefactionProfileRow{
 depth:number;soil?:string;fineContent?:number;plasticityIndex?:number;clayContent?:number;waterContent?:number
 sigmaV:number;porePressure:number;sigmaVPrime:number;ce?:number;cb?:number;cs?:number;cr?:number;cn?:number;n60?:number;n1_60?:number;alpha?:number;beta?:number;n1_60f?:number
 crrM75?:number;CM?:number;tauResistance?:number;rd:number;tauEarthquake?:number;FS?:number
 saturated:boolean;potentiallyLiquefiable:boolean;mandatoryAnalysis:boolean;triggerRequired:boolean;postLiquefactionRequired:boolean
 status:'ANALİZ GEREKLİ'|'ANALİZ GEREKMİYOR'|'TETİKLENME DEĞERLENDİRMESİ'|'VERİ EKSİK'
 conclusion:'SIVILAŞMA RİSKİ VAR'|'SIVILAŞMA RİSKİ YOK'|'DEĞERLENDİRİLMEDİ'|'VERİ EKSİK'
 liquefactionCheck:'evaluate'|'not-evaluable';trace:SptTraceStep[]
}
export interface LiquefactionProfileResult{rows:LiquefactionProfileRow[];method:string;source:string;warnings:string[];mandatoryByProject:boolean;postLiquefactionRequired:boolean}
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x),clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x))
function stressAtDepth(depth:number,layers:LiquefactionSoilLayer[],gwt:number,gammaW:number){
 let sigmaV=0,covered=0
 for(const layer of [...layers].filter(x=>x.bottom>x.top).sort((a,b)=>a.top-b.top)){const z0=Math.max(0,layer.top),z1=Math.min(depth,layer.bottom);if(z1<=z0)continue;if(z0>covered+1e-9){} covered+=z1-z0;const dry=Math.max(0,Math.min(z1,gwt)-z0),sat=(z1-z0)-dry;sigmaV+=dry*Math.max(layer.gamma,0)+sat*Math.max(layer.gammaSat,0)}
 const u=Math.max(0,depth-gwt)*gammaW;return{sigmaV,porePressure:u,sigmaVPrime:sigmaV-u,covered}
}
function rdAtDepth(z:number){const d=Math.max(z,0);return d<=9.15?1-.00765*d:d<=23?1.174-.0267*d:d<=30?.744-.008*d:.5}
function magnitudeCorrection(Mw:number){return Math.pow(10,2.24)/Math.pow(Mw,2.56)}
function soilIsPotential(code:string,pi:number|undefined){
 const c=code.trim().toUpperCase().replace(/İ/g,'I');if(pi!=null&&pi>=12)return false
 return c==='SA'||c==='GRSA'||c==='SISA'||c==='CLSA'||c==='SM'||c==='SI'||c==='ML'||c==='SP'||c==='SW'||c.includes('KUM')||c.includes('SAND')
}
function mandatoryDts(dts:EarthquakeDesignClass|undefined){return dts==='1'||dts==='1a'||dts==='2'||dts==='2a'}
function mandatorySoilGroup(group:LiquefactionSoilGroup|undefined){return group==='ZD'||group==='ZE'||group==='ZF'}
function exceptionDts4(dts:EarthquakeDesignClass|undefined,pi?:number,clay?:number,fines?:number,n1?:number){
 if(dts!=='4')return false
 const a=clay!=null&&pi!=null&&clay>20&&pi>10
 const b=fines!=null&&fines>35&&n1!=null&&n1>20
 return a||b
}
export function liquefactionProfile(input:LiquefactionProfileInput):LiquefactionProfileResult{
 if(!finite(input.Mw)||input.Mw<=0)throw new Error('Mw geçerli olmalıdır.')
 if(!finite(input.Sds)||input.Sds<0)throw new Error('SDS geçerli olmalıdır.')
 if(!finite(input.gwt)||input.gwt<0)throw new Error('Sıvılaşma değerlendirmesi için YASS girilmelidir.')
 const gammaW=input.gammaW??9.80665;if(!finite(gammaW)||gammaW<=0)throw new Error('Su birim hacim ağırlığı pozitif olmalıdır.')
 const warnings:string[]=[],CM=magnitudeCorrection(input.Mw),scopeComplete=input.dts!==undefined&&input.soilGroup!==undefined&&input.continuousOrThickLens!==undefined
 const mandatoryByProject=scopeComplete&&mandatoryDts(input.dts)&&mandatorySoilGroup(input.soilGroup)&&input.continuousOrThickLens===true
 if(!scopeComplete)warnings.push('DTS, TBDY zemin grubu ve 16.6.1 sürekli tabaka/kalın mercek bilgisi eksik; sıvılaşma zorunluluğu kesinleştirilemedi.')
 if(input.soilGroup==='ZF'&&!input.siteSpecificResponseAnalysisCompleted)warnings.push('ZF için saha özel zemin davranış analizi tamamlanmadan deprem tasarım zinciri tamamlanmış sayılmaz.')
 const rows=input.spt.filter(x=>finite(x.depth)&&x.depth>=0).sort((a,b)=>a.depth-b.depth).map((record):LiquefactionProfileRow=>{
  const layer=input.layers.find(l=>record.depth>=l.top&&record.depth<l.bottom),stress=stressAtDepth(record.depth,input.layers,input.gwt,gammaW),soil=record.soil??layer?.soil
  const fineContent=record.fineContent??layer?.finesContent,pi=record.plasticityIndex??layer?.plasticityIndex,clayContent=record.clayContent??layer?.clayContent,waterContent=record.waterContent
  const behavior=isCohesionlessSoilCode(soil),npt=finite(stress.sigmaVPrime)&&stress.sigmaVPrime>0?calculateSpt({nField:record.nField,energyRatio:record.energyRatio,hammerType:record.hammerType,boreholeDiameterMm:record.boreholeDiameterMm,sampler:record.sampler,samplerCorrection:record.samplerCorrection,rodLengthM:record.rodLengthM,effectiveStress:stress.sigmaVPrime,fineContent,soilBehavior:behavior?'cohesionless':'unknown',applyOverburden:true,applyDilatancy:false}):calculateSpt({nField:record.nField,energyRatio:record.energyRatio,hammerType:record.hammerType,boreholeDiameterMm:record.boreholeDiameterMm,sampler:record.sampler,samplerCorrection:record.samplerCorrection,rodLengthM:record.rodLengthM,effectiveStress:undefined,fineContent,soilBehavior:behavior?'cohesionless':'unknown',applyOverburden:false,applyDilatancy:false})
  const saturated=record.depth>input.gwt+1e-9,within20=record.depth<=20+1e-9,belowFoundation=record.depth>(input.foundationDepth??0)+1e-9,potentiallyLiquefiable=saturated&&within20&&belowFoundation&&soilIsPotential(soil??'',pi),exemption=exceptionDts4(input.dts,pi,clayContent,fineContent,npt.n1_60)
  const mandatoryAnalysis=potentiallyLiquefiable&&mandatoryByProject&&!exemption,researchDataComplete=fineContent!=null&&pi!=null&&waterContent!=null,n1Valid=npt.n1_60!=null&&Number.isFinite(npt.n1_60)
  const base={depth:record.depth,soil,fineContent,plasticityIndex:pi,clayContent,waterContent,...stress,ce:npt.ce,cb:npt.cb,cs:npt.cs,cr:npt.cr,cn:npt.cn,n60:npt.n60,n1_60:npt.n1_60,rd:rdAtDepth(record.depth),saturated,potentiallyLiquefiable,mandatoryAnalysis,triggerRequired:false,postLiquefactionRequired:false}
  const trace:SptTraceStep[]=[...npt.trace]
  const noEval=(status:LiquefactionProfileRow['status'],conclusion:LiquefactionProfileRow['conclusion'],note:string)=>({...base,status,conclusion,liquefactionCheck:'not-evaluable' as const,trace:[...trace,{symbol:'Kapsam',title:'TBDY kapsam / veri kontrolü',formula:'16.6.1–16.6.9',value:0,note}]})
  if(stress.covered<record.depth-1e-9)return noEval('VERİ EKSİK','VERİ EKSİK','SPT derinliğine kadar sürekli zemin katmanı/γ profili tanımlı değil.')
  if(!saturated||!within20||!belowFoundation||!potentiallyLiquefiable||exemption)return noEval('ANALİZ GEREKMİYOR','DEĞERLENDİRİLMEDİ',!saturated?'SPT noktası YASS üzerinde.':!within20?'20 m dışında.':!belowFoundation?'Temel tabanı üstünde.':exemption?'DTS=4 istisnası uygulanıyor.':'Zemin 16.6 potansiyel koşulunda değil.')
  if(!scopeComplete)return noEval('VERİ EKSİK','VERİ EKSİK','DTS, zemin grubu veya sürekli tabaka/kalın mercek verisi eksik.')
  if(!mandatoryAnalysis)return noEval('ANALİZ GEREKMİYOR','DEĞERLENDİRİLMEDİ','Proje kapsamı sıvılaşma zorunluluğunu tetiklemedi.')
  if(input.soilGroup==='ZF'&&!input.siteSpecificResponseAnalysisCompleted)return noEval('VERİ EKSİK','VERİ EKSİK','ZF saha özel zemin davranış analizi tamamlanmadan sonuç üretilemez.')
  if(!researchDataComplete)return noEval('VERİ EKSİK','VERİ EKSİK','16.6.3 asgari araştırma verileri: ince dane, PI ve doğal su içeriği tamamlanmalıdır.')
  if(!npt.n1_60Ready||!n1Valid)return noEval('VERİ EKSİK','VERİ EKSİK','N60/(N1)60 için SPT düzeltme girdileri ve σ′v0 tamamlanmalıdır.')
  if(npt.n1_60!>=30)return noEval('ANALİZ GEREKLİ','DEĞERLENDİRİLMEDİ','(N1)60 ≥ 30 olduğundan 16.6.5 tetiklenme değerlendirmesi uygulanmadı.')
  const fines=clamp(fineContent!,0,100),fc=fineContentCorrection(fines),n1f=fc.alpha+fc.beta*npt.n1_60!
  trace.push({symbol:'α',title:'İnce dane katsayısı',formula:'Ek 16B.2.2',value:fc.alpha,note:'IDI='+fines.toFixed(2)+' %'},{symbol:'β',title:'İnce dane katsayısı',formula:'Ek 16B.2.2',value:fc.beta},{symbol:'(N1)60f',title:'İnce dane düzeltilmiş SPT',formula:'α+β(N1)60',value:n1f})
  if(n1f>=34)return{...base,alpha:fc.alpha,beta:fc.beta,n1_60f:n1f,status:'ANALİZ GEREKLİ',conclusion:'DEĞERLENDİRİLMEDİ',liquefactionCheck:'not-evaluable',triggerRequired:false,postLiquefactionRequired:false,trace:[...trace,{symbol:'(N1)60f',title:'CRR bağıntı sınırı',formula:'(N1)60f<34',value:n1f,note:'CRR bağıntısı uygulanmadı.'}]}
  const crrM75=1/(34-n1f)+n1f/135+50/Math.pow(10*n1f+45,2)-.005,rd=rdAtDepth(record.depth),tauResistance=crrM75*CM*stress.sigmaVPrime,tauEarthquake=.65*.4*input.Sds*stress.sigmaV*rd,FS=tauEarthquake>0?tauResistance/tauEarthquake:Infinity
  const liquefies=FS<1.10
  const result={...base,alpha:fc.alpha,beta:fc.beta,n1_60f:n1f,crrM75,CM,tauResistance,tauEarthquake,FS,triggerRequired:true,postLiquefactionRequired:liquefies,status:'TETİKLENME DEĞERLENDİRMESİ' as const,conclusion:liquefies?'SIVILAŞMA RİSKİ VAR' as const:'SIVILAŞMA RİSKİ YOK' as const,liquefactionCheck:'evaluate' as const,trace:[...trace,
    {symbol:'CRR7.5',title:'Çevrimsel dayanım oranı',formula:'Ek 16B.3.2',value:crrM75},{symbol:'CM',title:'Deprem büyüklüğü düzeltmesi',formula:'CM=10^2.24/Mw^2.56',value:CM},{symbol:'Rτ',title:'Sıvılaşma direnci',formula:'CRR7.5·CM·σ′v0',value:tauResistance,unit:'kPa'},{symbol:'rd',title:'Gerilme azaltma',formula:'Ek 16B.4.1',value:rd},{symbol:'τdeprem',title:'Deprem kayma gerilmesi',formula:'0.65·0.4·SDS·σv0·rd',value:tauEarthquake,unit:'kPa'},{symbol:'FS',title:'Sıvılaşma güvenlik oranı',formula:'Rτ/τdeprem',value:FS,note:'FS≥1.10 kontrolü'}]}
  return result
 })
 if(!input.spt.length)warnings.push('SPT kaydı yok.')
 if(!input.layers.length)warnings.push('Zemin katmanı yok.')
 if(rows.some(x=>x.postLiquefactionRequired))warnings.push('Tetiklenme oluşan tabakalarda sıvılaşma sonrası taşıma gücü/oturma/yanal yayılma kontrolleri ayrıca yapılmalıdır.')
 return{rows,method:'TBDY 2018 Bölüm 16.6 + Ek 16B SPT tabanlı sıvılaşma',source:'TBDY 2018 16.6.1–16.6.10 ve Ek 16B.2–16B.4',warnings,mandatoryByProject,postLiquefactionRequired:rows.some(x=>x.postLiquefactionRequired)}
}