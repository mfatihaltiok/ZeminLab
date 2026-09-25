import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../models/field-data'
import { calculateSpt, isCohesionlessSoilCode, type SptEngineResult } from './spt/spt-engine'
export type PlasticityClass='CIL'|'CIM'|'CIH'|'SiL'|'SiM'|'SiH'
export interface SoilClassificationResult{code:PlasticityClass;description:string;plasticityGroup:'Düşük'|'Orta'|'Yüksek';isClay:boolean;aLinePi:number}
export function classifyFineSoil(liquidLimit?:number,plasticityIndex?:number):SoilClassificationResult|null{
  if(!Number.isFinite(liquidLimit)||!Number.isFinite(plasticityIndex)||liquidLimit!<=0)return null
  const ll=liquidLimit!,pi=plasticityIndex!,aLinePi=.73*(ll-20),isClay=pi>=aLinePi&&pi>=4,group=ll<35?'Düşük':ll<=50?'Orta':'Yüksek'
  const code=(isClay?'CI':'Si')+(group==='Düşük'?'L':group==='Orta'?'M':'H') as PlasticityClass
  return{code,description:group+' Plastisiteli '+(isClay?'Kil':'Silt')+' ('+code+')',plasticityGroup:group,isClay,aLinePi}
}
export function laboratoryPlasticityIndex(record:LaboratoryRecord):number|undefined{
  if(Number.isFinite(record.plasticityIndex))return record.plasticityIndex
  if(Number.isFinite(record.liquidLimit)&&Number.isFinite(record.plasticLimit))return record.liquidLimit!-record.plasticLimit!
  return undefined
}
export function fieldN(record:SptRecord):number|undefined{return Number.isFinite(record.n2)&&Number.isFinite(record.n3)&&record.n2!>=0&&record.n3!>=0?record.n2!+record.n3!:undefined}
function layerAtDepth(borehole:BoreholeRecord,depth:number){return borehole.lithology.find(layer=>depth>=layer.from&&depth<layer.to)??borehole.lithology.find(layer=>depth>=layer.from&&depth<=layer.to)}
function linkedLabForSpt(laboratories:LaboratoryRecord[],boreholeId:string,sptId:string,depth:number){return laboratories.find(x=>x.id==='LAB-'+boreholeId+'-'+sptId&&hasMeasuredLabData(x))??laboratories.find(x=>x.boreholeId===boreholeId&&Math.abs(x.depth-depth)<0.01&&hasMeasuredLabData(x))}
export function hasMeasuredLabData(record:LaboratoryRecord){const keys:(keyof LaboratoryRecord)[]=['waterContent','sieve10Passing','sieve200Passing','liquidLimit','plasticLimit','pointLoadIs50','unitWeight','uniaxialRockStrength','uuC','uuPhi','consolidationCc','consolidationCs','elasticModulus','oedometricModulus','poissonRatio','hydrometer075','hydrometer002','density','porosity','voidRatio','directShearC','directShearPhi','finesContent'];return keys.some(k=>Number.isFinite(record[k] as number))}
function labGammaInLayer(laboratories:LaboratoryRecord[],boreholeId:string,top:number,bottom:number){const values=laboratories.filter(x=>x.boreholeId===boreholeId&&x.depth>=top&&x.depth<bottom&&Number.isFinite(x.unitWeight)&&x.unitWeight!>0).map(x=>x.unitWeight!);if(!values.length)return undefined;const ordered=[...values].sort((x,y)=>x-y),m=Math.floor(ordered.length/2);return ordered.length%2?ordered[m]:(ordered[m-1]+ordered[m])/2}
function stressAtDepth(borehole:BoreholeRecord,depth:number,laboratories:LaboratoryRecord[]){
  const z=Math.max(0,depth),gwt=borehole.groundwaterDepth
  if(!borehole.lithology.length)return{verticalStress:undefined,effectiveStress:undefined,source:'Litoloji profili eksik; σ′v0 hesaplanmadı.'}
  const ordered=[...borehole.lithology].filter(x=>x.to>0&&x.from<x.to&&x.from<z).sort((a,b)=>a.from-b.from)
  let cursor=0,sigmaV=0
  for(const layer of ordered){
    const top=Math.max(cursor,layer.from),bottom=Math.min(z,layer.to)
    if(bottom<=top)continue
    if(top>cursor+1e-6)return{verticalStress:undefined,effectiveStress:undefined,source:'Deney derinliğine kadar γ profili süreksiz; σ′v0 hesaplanmadı.'}
    const gamma=Number.isFinite(layer.unitWeight)&&layer.unitWeight!>0?layer.unitWeight!:labGammaInLayer(laboratories,borehole.id,top,bottom)
    if(gamma==null||gamma<=0)return{verticalStress:undefined,effectiveStress:undefined,source:'Deney derinliğine kadar γ profili eksik; σ′v0 hesaplanmadı.'}
    const belowGroundwater=borehole.groundwaterDepth!=null&&bottom>borehole.groundwaterDepth
    const gammaSat=Number.isFinite(layer.saturatedUnitWeight)&&layer.saturatedUnitWeight!>0?layer.saturatedUnitWeight!:undefined
    if(belowGroundwater&&gammaSat==null)return{verticalStress:undefined,effectiveStress:undefined,source:'YASS altındaki katmanda γsat eksik; σ′v0 hesaplanmadı.'}
    const dry=Math.max(0,Math.min(bottom,borehole.groundwaterDepth??bottom)-top),sat=(bottom-top)-dry
    sigmaV+=dry*gamma+sat*(gammaSat??gamma)
    cursor=bottom
    if(cursor>=z-1e-6)break
  }
  if(cursor<z-1e-6)return{verticalStress:undefined,effectiveStress:undefined,source:'Deney derinliğine kadar γ profili eksik; σ′v0 hesaplanmadı.'}
  if(gwt==null)return{verticalStress:sigmaV,effectiveStress:undefined,source:'γ profili tamam; YASS girilmediği için σ′v0 bilinmiyor.'}
  if(!Number.isFinite(gwt)||gwt<0)return{verticalStress:sigmaV,effectiveStress:undefined,source:'YASS geçersiz; σ′v0 hesaplanmadı.'}
  const porePressure=z>gwt?(z-gwt)*9.80665:0
  return{verticalStress:sigmaV,effectiveStress:Math.max(0,sigmaV-porePressure),source:'Litoloji/LAB γ + ölçülen YASS'}
}
export type SptDerivedValues=Omit<SptEngineResult,'nField'>&{nField?:number;verticalStress?:number;effectiveStress?:number;stressSource?:string;overburdenCorrection?:number;overburdenCorrectionApplied:boolean;n60DilatancyCorrected?:number;cohesionless?:boolean}
export function deriveSptValues(borehole:BoreholeRecord,record:SptRecord,laboratories:LaboratoryRecord[]=[]):SptDerivedValues{
  const nField=fieldN(record)
  if(nField===undefined)return{nField,ce:undefined,cb:undefined,cs:undefined,cr:undefined,cn:undefined,n60:undefined,n1_60:undefined,n1_60_dilatancy:undefined,dilatancyApplied:false,trace:[],overburdenCorrection:undefined,overburdenCorrectionApplied:false,warnings:['n2 ve n3 olmadan N30 oluşmaz.'],ready:false,n60Ready:false,n1_60Ready:false}
  const stress=stressAtDepth(borehole,record.depth,laboratories),cfg=record.correction??{},lab=linkedLabForSpt(laboratories,borehole.id,record.id,record.depth),layer=layerAtDepth(borehole,record.depth),soilCode=record.soilCode??layer?.code
  const behavior=isCohesionlessSoilCode(soilCode)?'cohesionless':soilCode?'cohesive':'unknown'
  const fineContent=cfg.fineContent??lab?.finesContent??lab?.sieve200Passing??layer?.finesContent
  const result=calculateSpt({nField,energyRatio:cfg.energyRatio,boreholeDiameterMm:borehole.drillingDiameter,sampler:cfg.sampler,samplerCorrection:cfg.samplerCorrection,rodLengthM:cfg.rodLengthM,effectiveStress:stress.effectiveStress,fineContent,soilBehavior:behavior,applyOverburden:cfg.applyOverburdenCorrection??true,applyDilatancy:cfg.applyDilatancyCorrection??false,hammerType:cfg.hammerType})
  return{...result,verticalStress:stress.verticalStress,effectiveStress:stress.effectiveStress,stressSource:stress.source,overburdenCorrection:result.cn,overburdenCorrectionApplied:result.n1_60Ready,n60DilatancyCorrected:result.n1_60_dilatancy,cohesionless:behavior==='cohesionless'}
}
export function classifyLaboratoryRecord(record:LaboratoryRecord):SoilClassificationResult|null{return classifyFineSoil(record.liquidLimit,laboratoryPlasticityIndex(record))}
