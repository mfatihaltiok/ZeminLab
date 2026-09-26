import type { UnitSystem } from '../models/project'
import { unitWeightToBase } from '../units/project-units'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../models/field-data'
import { calculateSpt, type SptEngineResult } from './spt/spt-engine'
import { effectiveStressAtDepth } from './stress-profile'

export type PlasticityClass='CIL'|'CIM'|'CIH'|'SiL'|'SiM'|'SiH'
export interface SoilClassificationResult{code:PlasticityClass;description:string;plasticityGroup:'Düşük'|'Orta'|'Yüksek';isClay:boolean;aLinePi:number}

export function classifyFineSoil(liquidLimit?:number,plasticityIndex?:number):SoilClassificationResult|null{
  if(!Number.isFinite(liquidLimit)||!Number.isFinite(plasticityIndex)||liquidLimit!<=0)return null
  const ll=liquidLimit!,pi=plasticityIndex!,aLinePi=.73*(ll-20),isClay=pi>=aLinePi&&pi>=4,group=ll<35?'Düşük':ll<=50?'Orta':'Yüksek'
  const code=(isClay?'CI':'Si')+(group==='Düşük'?'L':group==='Orta'?'M':'H') as PlasticityClass
  return{code,description:`${group} Plastisiteli ${isClay?'Kil':'Silt'} (${code})`,plasticityGroup:group,isClay,aLinePi}
}
export function laboratoryPlasticityIndex(record:LaboratoryRecord):number|undefined{
  if(Number.isFinite(record.plasticityIndex)&&record.plasticityIndex!>=0)return record.plasticityIndex
  if(Number.isFinite(record.liquidLimit)&&Number.isFinite(record.plasticLimit)&&record.liquidLimit!>=record.plasticLimit!){
    return record.liquidLimit!-record.plasticLimit!
  }
  return undefined
}
export function fieldN(record:SptRecord):number|undefined{
  if(Number.isFinite(record.n2)&&Number.isFinite(record.n3))return record.n2!+record.n3!
  return undefined
}
export type SptDerivedValues=Omit<SptEngineResult,'nField'>&{nField?:number;verticalStress?:number;effectiveStress?:number;stressSource?:string;overburdenCorrection:number;overburdenCorrectionApplied:boolean;n60DilatancyCorrected?:number}

function layerAtDepth(borehole:BoreholeRecord,depth:number){return borehole.lithology.find(layer=>depth>=layer.from&&depth<layer.to)??borehole.lithology.find(layer=>depth>=layer.from&&depth<=layer.to)}
function linkedLabForSpt(laboratories:LaboratoryRecord[],boreholeId:string,sptId:string,depth:number){
  return laboratories.find(x=>x.id==='LAB-'+boreholeId+'-'+sptId)??laboratories.find(x=>x.boreholeId===boreholeId&&Math.abs(x.depth-depth)<0.01)
}
function median(values:number[]):number|undefined{
  if(!values.length)return undefined
  const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2)
  return a.length%2?a[m]:(a[m-1]+a[m])/2
}
function stressAtDepth(borehole:BoreholeRecord,depth:number,laboratories:LaboratoryRecord[],unitSystem:UnitSystem){
  const z=Math.max(0,depth)
  if(!borehole.lithology.length)return{verticalStress:undefined,effectiveStress:undefined,source:'Litoloji profili eksik; σ′v0 hesaplanmadı.'}
  const layers=borehole.lithology
    .filter(x=>x.to>x.from&&x.to>0)
    .sort((a,b)=>a.from-b.from)
    .map(layer=>{
      const labGamma=median(laboratories.filter(x=>x.boreholeId===borehole.id&&x.depth>=layer.from&&x.depth<layer.to&&Number.isFinite(x.unitWeight)&&x.unitWeight!>0).map(x=>x.unitWeight!))
      const gamma=Number.isFinite(layer.unitWeight)&&layer.unitWeight!>0?unitWeightToBase(layer.unitWeight!,unitSystem):labGamma==null?undefined:unitWeightToBase(labGamma,unitSystem)
      return{top:layer.from,bottom:layer.to,gamma:gamma??NaN,gammaSat:Number.isFinite(layer.saturatedUnitWeight)&&layer.saturatedUnitWeight!>0?unitWeightToBase(layer.saturatedUnitWeight!,unitSystem):gamma??NaN}
    })
  if(layers.some(x=>!Number.isFinite(x.gamma)||x.gamma<=0||!Number.isFinite(x.gammaSat)||x.gammaSat<=0))return{verticalStress:undefined,effectiveStress:undefined,source:'Deney derinliğine kadar γ/γsat profili eksik; CN uygulanmadı.'}
  try{
    const result=effectiveStressAtDepth(z,layers,borehole.groundwaterDepth??1e9)
    const coveredTo=layers.reduce((max,layer)=>layer.top<=max+1e-6?Math.max(max,Math.min(z,layer.bottom)):max,0)
    if(coveredTo<z-1e-6||result.covered<z-1e-6)return{verticalStress:undefined,effectiveStress:undefined,source:'Deney derinliğine kadar γ/γsat profili eksik; CN uygulanmadı.'}
    return{verticalStress:result.sigmaV,effectiveStress:result.sigmaVPrime,source:'Merkezi σv/σ′v profili · litoloji + laboratuvar γ'}
  }catch{
    return{verticalStress:undefined,effectiveStress:undefined,source:'σv/σ′v profili hesaplanamadı; CN uygulanmadı.'}
  }
}

export function deriveSptValues(borehole:BoreholeRecord,record:SptRecord,laboratories:LaboratoryRecord[]=[],unitSystem:UnitSystem='kN-m'):SptDerivedValues{
  const nField=fieldN(record)
  if(nField===undefined)return{nField,ce:1,cb:1,cs:1,cr:1,cn:1,n60:0,n1_60:0,dilatancyApplied:false,trace:[],overburdenCorrection:1,overburdenCorrectionApplied:false,warnings:[],hasAssumptions:false}
  const stress=stressAtDepth(borehole,record.depth,laboratories,unitSystem)
  const cfg=record.correction??{}
  const lab=linkedLabForSpt(laboratories,borehole.id,record.id,record.depth)
  const layer=layerAtDepth(borehole,record.depth)
  const fineContent=cfg.fineContent??lab?.finesContent??lab?.sieve200Passing??layer?.finesContent
  const result=calculateSpt({
    nField,
    energyRatio:cfg.energyRatio,
    hammerType:cfg.hammerType,
    boreholeDiameterMm:borehole.drillingDiameter,
    sampler:cfg.sampler,
    samplerCorrection:cfg.samplerCorrection,
    rodLengthM:cfg.rodLengthM,
    effectiveStress:stress.effectiveStress,
    fineContent,
    applyOverburden:cfg.applyOverburdenCorrection??true,
    applyDilatancy:cfg.applyDilatancyCorrection??false
  })
  return{...result,verticalStress:stress.verticalStress,effectiveStress:stress.effectiveStress,stressSource:stress.source,overburdenCorrection:result.cn,overburdenCorrectionApplied:stress.effectiveStress!=null,n60DilatancyCorrected:result.n1_60_dilatancy}
}
export function classifyLaboratoryRecord(record:LaboratoryRecord):SoilClassificationResult|null{return classifyFineSoil(record.liquidLimit,laboratoryPlasticityIndex(record))}
