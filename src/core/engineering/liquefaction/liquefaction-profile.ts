import { calculateSpt, fineContentCorrection, type SptEngineInput } from '../spt/spt-engine'

export interface SoilLayerStressInput { top:number; bottom:number; gamma:number; gammaSat:number; finesContent?:number; plasticityIndex?:number; liquidLimit?:number; waterContent?:number }
export interface LiquefactionSptRecord extends SptEngineInput { depth:number; fines?:number; fineContent?:number; id?:string; soilType?:string; plasticityIndex?:number; liquidLimit?:number; waterContent?:number; unitWeightTPerM3?:number; testType?:'SPT'|'UD' }
export interface LiquefactionProfileInput { Mw:number; Sds:number; groundwaterDepth:number; layers:SoilLayerStressInput[]; spt:LiquefactionSptRecord[] }
export interface LiquefactionProfileRow { id?:string; depth:number; soilType:string; nField:number; sigmaV:number; sigmaVPrime:number; u:number; ce:number; cb:number; cs:number; cr:number; cn:number; n60:number; n1_60:number; n1_60_dilatancy:number; fines:number; alpha:number; beta:number; n1_60f:number; rd:number; csr:number; crr:number; msf:number; gsL:number; fsL:number; tauResistance:number; tauEarthquake:number; sds:number; isCohesive:boolean; claySofteningRisk:'YÜKSEK'|'ORTA'|'DÜŞÜK'|'VERİ YOK'; clayLL?:number; clayW?:number; clayExplanation?:string; conclusion:'SIVILAŞMA VAR'|'SIVILAŞMA YOK'; isLiquefiable:'YÜKSEK'|'ORTA'|'SIVILAŞMA YOK'; explanation:string }
export interface LiquefactionProfileResult { rows:LiquefactionProfileRow[]; source:string; method:string }

function isCohesiveSoil(soilType:string){const code=(soilType||'').trim().toUpperCase().replace(/İ/g,'I');if(!code)return false;if(['GR','SAGR','SIGR','CLGR','SA','GRSA','SISA','CLSA','GP','GW','SP','SW','SM','SC'].includes(code))return false;if(['SI','GRSI','SASI','CLSI','CL','CH','CIL','CIM','CIH','SIL','SIM','SIH','ML','MH','OR','PE','MG'].includes(code))return true;if(code.includes('KILLI KUM')||code.includes('SILTLI KUM')||code.includes('CAKILLI KUM')||code.includes('KILLI CAKIL')||code.includes('SILTLI CAKIL'))return false;return code.includes('KIL')||code.includes('CLAY')||code.includes('SILT')||code.includes('ORGANIK')||code.includes('TURBA')||code.includes('BALCIK')}
function sortedLayers(layers:SoilLayerStressInput[]){return [...layers].filter(x=>x.bottom>x.top).sort((a,b)=>a.top-b.top)}
function layerAt(depth:number,layers:SoilLayerStressInput[]){const ls=sortedLayers(layers);return ls.find(l=>depth>=l.top&&depth<l.bottom)??ls[ls.length-1]}
function effectiveStressAtDepth(depth:number,layers:SoilLayerStressInput[],gwt:number){
  const ls=sortedLayers(layers); let sigmaV=0, z=0
  for(const layer of ls){
    if(z>=depth) break
    const a=Math.max(z,layer.top), b=Math.min(depth,layer.bottom)
    if(b<=a) continue
    const segment=b-a
    const sat=b>gwt
    const gammaTotal=(sat?layer.gammaSat:layer.gamma)
    sigmaV += Math.max(0,gammaTotal)*segment
    z=b
  }
  if(z<depth){
    const fallback=ls.length?ls[ls.length-1].gamma:17
    sigmaV += Math.max(0,fallback)*(depth-z)
  }
  const u=depth>gwt?9.81*(depth-gwt):0
  return {sigmaV,sigmaVPrime:Math.max(0.1,sigmaV-u),u}
}
function stress(depth:number,record:LiquefactionSptRecord,layers:SoilLayerStressInput[],gwt:number){
  if(record.unitWeightTPerM3!=null&&record.unitWeightTPerM3>0){
    const gamma=record.unitWeightTPerM3*9.81
    const sigmaV=depth*gamma, u=depth>gwt?9.81*(depth-gwt):0
    return{sigmaV,sigmaVPrime:Math.max(.1,sigmaV-u),u,gammaK:gamma}
  }
  const s=effectiveStressAtDepth(depth,layers,gwt)
  return{...s,gammaK:depth>0?s.sigmaV/depth:17}
}

function rd(depth:number){if(depth<=9.15)return 1-.00765*depth;if(depth<=23)return 1.174-.0267*depth;if(depth<=30)return .744-.008*depth;return .5}
function crrM75(n1_60f:number){if(n1_60f>=29.9)return 2;const n=Math.max(0,n1_60f);return Math.max(.01,1/(34-n)+n/135+50/Math.pow(10*n+45,2)-1/200)}
function cM(Mw:number){return Math.pow(10,2.24)/Math.pow(Math.max(Mw,1e-9),2.56)}

export function liquefactionProfile(i:LiquefactionProfileInput):LiquefactionProfileResult{
 if(!Number.isFinite(i.Mw)||i.Mw<=0)throw new Error('Mw geçerli olmalıdır.')
 if(!Number.isFinite(i.Sds)||i.Sds<0)throw new Error('SDS geçerli olmalıdır.')
 const CM=cM(i.Mw), layers=sortedLayers(i.layers)
 const rows=[...i.spt].filter(x=>x.testType!=='UD'&&Number.isFinite(x.depth)&&x.depth>0&&Number.isFinite(x.nField)&&x.nField>=0).sort((a,b)=>a.depth-b.depth).map(record=>{
  const layer=layerAt(record.depth,layers),soilType=record.soilType||'',cohesive=isCohesiveSoil(soilType),st=stress(record.depth,record,layers,i.groundwaterDepth)
  const belowGwt=i.groundwaterDepth>=0&&record.depth>=i.groundwaterDepth
  const spt=calculateSpt({...record, effectiveStress:st.sigmaVPrime, fineContent:record.fines??record.fineContent??layer?.finesContent, applyOverburden:!cohesive, applyDilatancy:false})
  const cn=spt.cn, n60=spt.n60, n1_60=spt.n1_60
  const n1_60_dilatancy=n1_60
  const fines=record.fines??record.fineContent??layer?.finesContent??0,fine=fineContentCorrection(fines),rr=rd(record.depth)
  const csr=.65*(.4*i.Sds)*(st.sigmaV/Math.max(.1,st.sigmaVPrime))*rr,crr=crrM75(fine.n1_60f)
  const tauEarthquake=.65*(.4*i.Sds)*st.sigmaV*rr,tauResistance=crr*CM*st.sigmaVPrime,fsL=tauEarthquake>0?tauResistance/tauEarthquake:9.9
  let claySofteningRisk:LiquefactionProfileRow['claySofteningRisk']='VERİ YOK',clayExplanation='';const w=record.waterContent??layer?.waterContent,ll=record.liquidLimit??layer?.liquidLimit
  if(cohesive){if(ll&&ll>0&&w&&w>0){const ratio=w/ll;if(ll<37&&ratio>.85){claySofteningRisk='YÜKSEK';clayExplanation=`Bray & Sancio (2006) YÜKSEK: LL (${ll}%) < 37 & w/LL (${ratio.toFixed(2)}) > 0.85.`}else if(ll<=47&&ratio>=.8){claySofteningRisk='ORTA';clayExplanation=`Bray & Sancio (2006) GEÇİŞ (ORTA): LL (${ll}%) ≤ 47 & w/LL (${ratio.toFixed(2)}) ≥ 0.80.`}else{claySofteningRisk='DÜŞÜK';clayExplanation=`Bray & Sancio (2006) DÜŞÜK: LL (${ll}%) > 47 veya w/LL (${ratio.toFixed(2)}) düşük.`}}else clayExplanation='Kil/silt yumuşaması için LL ve doğal su muhtevası eksik.'}
  const codeUpper=soilType.toUpperCase().replace(/İ/g,'I'),isSandySoil=['SA','SISA','CLSA','GRSA'].includes(codeUpper)||codeUpper.includes('KUM')||!cohesive
  let conclusion:LiquefactionProfileRow['conclusion']='SIVILAŞMA YOK',explanation=''
  if(!belowGwt)explanation='Yeraltı su seviyesinin üzerinde.';else if(record.depth>20)explanation='20 m sınırının altında.';else if(cohesive){const soft=claySofteningRisk==='YÜKSEK'||claySofteningRisk==='ORTA';explanation=soft?`Kohezyonlu zeminde yumuşama riski: ${clayExplanation}`:'Kohezyonlu zemin; SPT sıvılaşma tetiklenmesi uygulanmadı.'}
  else if(fsL<1.1){conclusion='SIVILAŞMA VAR';explanation=`Rτ/τdeprem = ${fsL.toFixed(3)} < 1.10.`}
  else if(fine.n1_60f>=30)explanation=`(N1)60f = ${fine.n1_60f.toFixed(1)} ≥ 30.`
  else if(isSandySoil&&fines>35&&n1_60>20)explanation=`İnce dane > 35% ve (N1)60 > 20.`
  else explanation=`Rτ/τdeprem = ${fsL.toFixed(3)} ≥ 1.10.`
  let isLiquefiable:LiquefactionProfileRow['isLiquefiable']='SIVILAŞMA YOK';if(conclusion==='SIVILAŞMA VAR')isLiquefiable='YÜKSEK';else if(fsL<1.3)isLiquefiable='ORTA'
  return{id:record.id,depth:record.depth,soilType,nField:record.nField,sigmaV:st.sigmaV,sigmaVPrime:st.sigmaVPrime,u:st.u,ce:f.ce,cb:f.cb,cs:f.cs,cr:f.cr,cn,n60,n1_60,n1_60_dilatancy,fines,alpha:fine.alpha,beta:fine.beta,n1_60f:fine.n1_60f,rd:rr,csr,crr,msf:CM,gsL:fsL,fsL,tauResistance,tauEarthquake,sds:i.Sds,isCohesive:cohesive,claySofteningRisk,clayLL:ll,clayW:w,clayExplanation,conclusion,isLiquefiable,explanation}
 })
 return{rows,method:'TBDY 2018 Ek 16B · SPT düzeltmeleri → N1,60 → IDI düzeltmesi → CRR_M7.5 → CM → Rτ → τdeprem → Rτ/τdeprem',source:'TBDY 2018 Bölüm 16.6 ve Ek 16B.2-Ek 16B.4; resmi AFAD yönetmelik metni.'}
}
