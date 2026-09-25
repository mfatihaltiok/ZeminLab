import type { UnitSystem } from './project'

export type FieldDataSource = 'manual' | 'imported'
export type ProvenanceKind = 'MEASURED' | 'IMPORTED' | 'USER_ENTERED' | 'CORRELATED' | 'DEFAULT' | 'MISSING'
export interface DataProvenance { kind: ProvenanceKind; source?: string; sourceId?: string; approved: boolean; note?: string; capturedAt?: string }
export function manualProvenance(note?:string):DataProvenance{return {kind:'USER_ENTERED',approved:true,note,capturedAt:new Date().toISOString()}}
export function importedProvenance(source:string,sourceId?:string,approved=false):DataProvenance{return {kind:'IMPORTED',source,sourceId,approved,capturedAt:new Date().toISOString()}}

export type BoreholeId = string
export type SptTestType = 'SPT' | 'UD'
export type LithologyColorClass = 'fill' | 'clay' | 'silt' | 'sand' | 'gravel' | 'rock'
export interface SptCorrectionConfig {
  energyRatio?:number
  boreholeCorrection?:number
  samplerCorrection?:number
  rodLengthCorrection?:number
  applyOverburdenCorrection:boolean
  applyDilatancyCorrection:boolean
  fineContent?:number
  rodLengthM?:number
  hammerType?:'donut'|'safety'|'automatic'|'measured'
  sampler?:'standard'|'without-liner'|'liner'
}
export interface SptRecord { id:string; depth:number; depthTo?:number; testType:SptTestType; n1?:number; n2?:number; n3?:number; soilCode?:string; soilDescription?:string; correction?:SptCorrectionConfig; laboratoryLinked?:boolean; notes?:string; source:FieldDataSource; confirmed:boolean; provenance?:DataProvenance }
export interface LithologyLayer { id:string; from:number; to:number; code:string; description:string; colorClass:LithologyColorClass; unitWeight?:number; saturatedUnitWeight?:number; cohesion?:number; frictionAngle?:number; finesContent?:number; liquidLimit?:number; plasticLimit?:number; plasticityIndex?:number; userOverride?:boolean; notes?:string; provenance?:DataProvenance }
export interface BoreholeLogObservation { id:string; depth:number; depthTo?:number; type:'sample'|'water'|'drilling'|'remark'|'refusal'|'rock'; text:string; source:FieldDataSource; confirmed:boolean; provenance?:DataProvenance }
export interface BoreholeLogSettings { scale:50|100|200; showSpt:boolean; showLaboratory:boolean; showGroundwater:boolean; showSamples:boolean; showRemarks:boolean }
export interface BoreholeRecord { id:BoreholeId; name:string; firstSptDepth:number; totalDepth:number; groundwaterDepth?:number; elevation?:number; location?:string; drillingMethod?:string; drillingDiameter?:number; casingDiameter?:number; startDate?:string; endDate?:string; operator?:string; lithology:LithologyLayer[]; spt:SptRecord[]; logObservations?:BoreholeLogObservation[]; logSettings?:BoreholeLogSettings; provenance?:DataProvenance }
export interface LaboratoryRecord {
  id:string; boreholeId:BoreholeId; sampleId:string; depth:number; depthTo?:number; sampleType:'UD'|'SPT'|'Other'; soilCode?:string; soilDescription?:string;
  waterContent?:number; sieve10Passing?:number; sieve200Passing?:number; liquidLimit?:number; plasticLimit?:number; plasticityIndex?:number; consistencyDensity?:string;
  pointLoadIs50?:number; unitWeight?:number; saturatedUnitWeight?:number; uniaxialRockStrength?:number; uuC?:number; uuPhi?:number;
  consolidationCc?:number; consolidationCs?:number; elasticModulus?:number; oedometricModulus?:number; poissonRatio?:number;
  hydrometer075?:number; hydrometer002?:number; density?:number; porosity?:number; voidRatio?:number;
  directShearC?:number; directShearPhi?:number; c?:number; phi?:number; finesContent?:number;
  source:FieldDataSource; confirmed:boolean; notes?:string; provenance?:DataProvenance;
  /** New records and migrated records store engineering values in kN/kPa base units. */
  engineeringUnitSystem?:'kN-m'
}
export const DEFAULT_BOREHOLE_LOG_SETTINGS:BoreholeLogSettings={scale:100,showSpt:true,showLaboratory:true,showGroundwater:true,showSamples:true,showRemarks:true}
