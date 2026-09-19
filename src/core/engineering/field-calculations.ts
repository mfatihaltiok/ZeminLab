import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../models/field-data'
import { calculateSpt, type SptEngineResult } from './spt/spt-engine'

export type PlasticityClass = 'CIL' | 'CIM' | 'CIH' | 'SiL' | 'SiM' | 'SiH'
export interface SoilClassificationResult { code: PlasticityClass; description: string; plasticityGroup: 'Düşük' | 'Orta' | 'Yüksek'; isClay: boolean; aLinePi: number }
export function classifyFineSoil(liquidLimit?: number, plasticityIndex?: number): SoilClassificationResult | null { if (!Number.isFinite(liquidLimit) || !Number.isFinite(plasticityIndex) || liquidLimit! <= 0) return null; const ll=liquidLimit!; const pi=plasticityIndex!; const aLinePi=.73*(ll-20); const isClay=pi>=aLinePi&&pi>=4; const group=ll<35?'Düşük':ll<=50?'Orta':'Yüksek'; const code=`${isClay?'CI':'Si'}${group==='Düşük'?'L':group==='Orta'?'M':'H'}` as PlasticityClass; return {code,description:`${group} Plastisiteli ${isClay?'Kil':'Silt'} (${code})`,plasticityGroup:group,isClay,aLinePi} }
export function laboratoryPlasticityIndex(record: LaboratoryRecord): number | undefined { if (Number.isFinite(record.plasticityIndex)) return record.plasticityIndex; if (Number.isFinite(record.liquidLimit)&&Number.isFinite(record.plasticLimit)) return record.liquidLimit!-record.plasticLimit!; return undefined }
export function fieldN(record: SptRecord): number | undefined { if (Number.isFinite(record.n2)&&Number.isFinite(record.n3)) return record.n2!+record.n3!; return undefined }
export type SptDerivedValues = Omit<SptEngineResult,'nField'> & { nField?: number; verticalStress?: number; effectiveStress?: number; overburdenCorrection: number; n60DilatancyCorrected?: number }
function layerAtDepth(borehole: BoreholeRecord, depth: number) { return borehole.lithology.find((layer)=>depth>=layer.from&&depth<layer.to) ?? borehole.lithology.find((layer)=>depth>=layer.from&&depth<=layer.to) }
function labGammaInLayer(laboratories: LaboratoryRecord[], boreholeId: string, top: number, bottom: number) {
  const values=laboratories.filter(x=>x.boreholeId===boreholeId&&x.depth>=top&&x.depth<bottom&&Number.isFinite(x.unitWeight)&&x.unitWeight!>0).map(x=>x.unitWeight!)
  if(!values.length)return undefined
  const ordered=[...values].sort((x,y)=>x-y),m=Math.floor(ordered.length/2)
  return ordered.length%2?ordered[m]:(ordered[m-1]+ordered[m])/2
}
function stressAtDepth(borehole: BoreholeRecord, depth: number, laboratories: LaboratoryRecord[] = []) {
  const z=Math.max(0,depth), gwt=borehole.groundwaterDepth
  if(!borehole.lithology.length)return {verticalStress:undefined,effectiveStress:undefined,source:'Litoloji profili eksik; σ′v0 hesaplanmadı.'}
  const ordered=[...borehole.lithology].filter(x=>x.to>0&&x.from<x.to&&x.from<z).sort((a,b)=>a.from-b.from)
  let cursor=0,sigmaV=0,complete=true
  for(const layer of ordered){
    const top=Math.max(cursor,layer.from),bottom=Math.min(z,layer.to)
    if(bottom<=top)continue
    if(top>cursor+1e-6){complete=false;break}
    const gamma=Number.isFinite(layer.unitWeight)&&layer.unitWeight!>0?layer.unitWeight!:labGammaInLayer(laboratories,borehole.id,top,bottom)
    const gammaSat=Number.isFinite(layer.saturatedUnitWeight)&&layer.saturatedUnitWeight!>0?layer.saturatedUnitWeight!:gamma
    if(gamma==null||gamma<=0){complete=false;break}
    const above=gwt===undefined?bottom-top:Math.max(0,Math.min(bottom,gwt)-top)
    const below=(bottom-top)-above
    sigmaV+=above*gamma+below*(gammaSat??gamma)
    cursor=bottom
    if(cursor>=z-1e-6)break
  }
  if(cursor<z-1e-6)complete=false
  if(!complete)return {verticalStress:undefined,effectiveStress:undefined,source:'Deney derinliğine kadar γ/γsat profili eksik; CN uygulanmadı.'}
  const porePressure=gwt!==undefined&&z>gwt?(z-gwt)*9.80665:0
  return {verticalStress:sigmaV,effectiveStress:Math.max(0,sigmaV-porePressure),source:'Litoloji + laboratuvar γ'}
}

export function deriveSptValues(borehole:BoreholeRecord,record:SptRecord,laboratories:LaboratoryRecord[] = []):SptDerivedValues { const nField=fieldN(record); if(nField===undefined) return {nField,ce:1,cb:1,cs:1,cr:1,cn:1,n60:0,n1_60:0,dilatancyApplied:false,trace:[],overburdenCorrection:1}; const stress=stressAtDepth(borehole,record.depth,laboratories); const cfg=record.correction??{}; const result=calculateSpt({nField,energyRatio:cfg.energyRatio,effectiveStress:stress.effectiveStress,fineContent:cfg.fineContent??layerAtDepth(borehole,record.depth)?.finesContent,applyOverburden:cfg.applyOverburdenCorrection??true,applyDilatancy:cfg.applyDilatancyCorrection??false}); return {...result,verticalStress:stress.verticalStress,effectiveStress:stress.effectiveStress,overburdenCorrection:result.cn,n60DilatancyCorrected:result.n1_60_dilatancy} }
export function classifyLaboratoryRecord(record: LaboratoryRecord): SoilClassificationResult | null { return classifyFineSoil(record.liquidLimit, laboratoryPlasticityIndex(record)) }
