import type { UnitSystem } from '../models/project'
import { unitWeightToBase } from '../units/project-units'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../models/field-data'
import type { SptCorrectionParameters } from '../models/project'
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
function stressAtDepth(
  borehole:BoreholeRecord,
  depth:number,
  laboratories:LaboratoryRecord[],
  unitSystem:UnitSystem,
  fallback?:{unitWeight?:number;saturatedUnitWeight?:number;groundwaterDepth?:number}
){
  const z=Math.max(0,depth)
  const boreholeLabs=laboratories.filter(x=>x.boreholeId===borehole.id)
  const labGamma=median(boreholeLabs.filter(x=>Number.isFinite(x.unitWeight)&&x.unitWeight!>0).map(x=>x.unitWeight!))
  const fallbackGamma=Number.isFinite(fallback?.unitWeight)&&fallback!.unitWeight!>0?fallback!.unitWeight!:undefined
  const fallbackGammaSat=Number.isFinite(fallback?.saturatedUnitWeight)&&fallback!.saturatedUnitWeight!>0?fallback!.saturatedUnitWeight!:undefined
  const gwt=borehole.groundwaterDepth??fallback?.groundwaterDepth??1e9

  const sourceParts:string[]=[]
  let layers:{top:number;bottom:number;gamma:number;gammaSat:number}[]=[]
  if(borehole.lithology.length){
    layers=borehole.lithology
      .filter(x=>x.to>x.from&&x.to>0)
      .sort((a,b)=>a.from-b.from)
      .map(layer=>{
        const localLabGamma=median(boreholeLabs
          .filter(x=>x.depth>=layer.from&&x.depth<layer.to&&Number.isFinite(x.unitWeight)&&x.unitWeight!>0)
          .map(x=>x.unitWeight!))
        const gammaValue=Number.isFinite(layer.unitWeight)&&layer.unitWeight!>0?layer.unitWeight!:localLabGamma??labGamma??fallbackGamma
        const gammaSatValue=Number.isFinite(layer.saturatedUnitWeight)&&layer.saturatedUnitWeight!>0
          ?layer.saturatedUnitWeight!
          :localLabGamma??labGamma??fallbackGammaSat??gammaValue
        return {
          top:layer.from,
          bottom:layer.to,
          gamma:gammaValue==null?NaN:unitWeightToBase(gammaValue,unitSystem),
          gammaSat:gammaSatValue==null?NaN:unitWeightToBase(gammaSatValue,unitSystem)
        }
      })
    if(layers.some(x=>!Number.isFinite(x.gamma)||x.gamma<=0||!Number.isFinite(x.gammaSat)||x.gammaSat<=0)){
      return{verticalStress:undefined,effectiveStress:undefined,source:'Deney derinliğine kadar γ/γsat bulunamadı; CN uygulanmadı.'}
    }
    sourceParts.push('litoloji')
  }else{
    const gamma=labGamma??fallbackGamma
    const gammaSat=labGamma??fallbackGammaSat??gamma
    if(gamma==null||gammaSat==null)return{verticalStress:undefined,effectiveStress:undefined,source:'γ/γsat bulunamadı; CN uygulanmadı.'}
    layers=[{top:0,bottom:Math.max(z,1e-6),gamma:unitWeightToBase(gamma,unitSystem),gammaSat:unitWeightToBase(gammaSat,unitSystem)}]
    sourceParts.push(labGamma!=null?'laboratuvar γ':'proje γ/γsat')
  }

  try{
    const result=effectiveStressAtDepth(z,layers,gwt)
    if(result.covered<z-1e-6){
      return{verticalStress:undefined,effectiveStress:undefined,source:'Deney derinliğine kadar sürekli γ/γsat profili yok; CN uygulanmadı.'}
    }
    if(sourceParts[0]==='litoloji')sourceParts.push(labGamma!=null?'LAB yedek değeri':'proje γ/γsat yedek değeri')
    return{
      verticalStress:result.sigmaV,
      effectiveStress:result.sigmaVPrime,
      source:'Merkezi σv/σ′v profili · '+sourceParts.join(' + ')
    }
  }catch{
    return{verticalStress:undefined,effectiveStress:undefined,source:'σv/σ′v profili hesaplanamadı; CN uygulanmadı.'}
  }
}

export function deriveSptValues(borehole:BoreholeRecord,record:SptRecord,laboratories:LaboratoryRecord[]=[],unitSystem:UnitSystem='kN-m',fallback?:{unitWeight?:number;saturatedUnitWeight?:number;groundwaterDepth?:number},correction:SptCorrectionParameters={ce:1,cb:1,cs:1,cr:1}):SptDerivedValues{
  const nField=fieldN(record)
  if(nField===undefined)return{nField,ce:1,cb:1,cs:1,cr:1,cn:1,n60:0,n1_60:0,dilatancyApplied:false,trace:[],overburdenCorrection:1,overburdenCorrectionApplied:false,warnings:[],hasAssumptions:false}
  const stress=stressAtDepth(borehole,record.depth,laboratories,unitSystem,fallback)
  const cfg=correction
  const lab=linkedLabForSpt(laboratories,borehole.id,record.id,record.depth)
  const layer=layerAtDepth(borehole,record.depth)
  const soilCode=record.soilCode??layer?.code
  const labClassification=lab?classifyLaboratoryRecord(lab):null
  const explicitSoilCode=soilCode!=null&&soilCode.trim().length>0
  const claySoil=isClaySoilCode(soilCode)||(!explicitSoilCode&&labClassification?.isClay===true)
  const claySoilSource=claySoil?(isClaySoilCode(soilCode)?`Zemin sınıfı ${soilCode}`:'Laboratuvar Atterberg sınıflandırması'):undefined
  const fineContent=lab?.finesContent??lab?.sieve200Passing??layer?.finesContent
  const result=calculateSpt({
    nField,
    ce:cfg.ce,cb:cfg.cb,cs:cfg.cs,cr:cfg.cr,
    effectiveStress:stress.effectiveStress,
    fineContent,
    claySoil,
    claySoilSource,
    applyOverburden:true,
    applyDilatancy:false
  })
  return{...result,verticalStress:stress.verticalStress,effectiveStress:stress.effectiveStress,stressSource:stress.source,overburdenCorrection:result.cn,overburdenCorrectionApplied:stress.effectiveStress!=null||claySoil,n60DilatancyCorrected:result.n1_60_dilatancy}
}
export function classifyLaboratoryRecord(record:LaboratoryRecord):SoilClassificationResult|null{return classifyFineSoil(record.liquidLimit,laboratoryPlasticityIndex(record))}

export function isClaySoilCode(code?:string):boolean{
  const c=(code??'').trim().toUpperCase().replace(/İ/g,'I')
  return ['CL','CI','CH','CIL','CIM','CIH','CVL','CEH','SACL','GRCL','ANCL'].includes(c)
}
