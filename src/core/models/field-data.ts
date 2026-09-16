export type BoreholeId = string
export type SptTestType = 'SPT' | 'UD'
export type FieldDataSource = 'manual' | 'imported'
export type LithologyColorClass = 'fill' | 'clay' | 'silt' | 'sand' | 'gravel' | 'rock'

export interface SptCorrectionConfig {
  energyRatio: number
  boreholeCorrection: number
  samplerCorrection: number
  rodLengthCorrection: number
  applyOverburdenCorrection: boolean
  applyDilatancyCorrection: boolean
  fineContent?: number
}

export interface SptRecord {
  id: string
  depth: number
  depthTo?: number
  testType: SptTestType
  n1?: number
  n2?: number
  n3?: number
  soilCode?: string
  soilDescription?: string
  correction?: Partial<SptCorrectionConfig>
  notes?: string
  source: FieldDataSource
  confirmed: boolean
}

export interface LithologyLayer {
  id: string
  from: number
  to: number
  code: string
  description: string
  colorClass: LithologyColorClass
  unitWeight?: number
  saturatedUnitWeight?: number
  cohesion?: number
  frictionAngle?: number
  finesContent?: number
  liquidLimit?: number
  plasticLimit?: number
  plasticityIndex?: number
}

export interface BoreholeRecord {
  id: BoreholeId
  name: string
  firstSptDepth: number
  totalDepth: number
  groundwaterDepth?: number
  elevation?: number
  location?: string
  lithology: LithologyLayer[]
  spt: SptRecord[]
}

export interface LaboratoryRecord {
  id: string
  boreholeId: BoreholeId
  sampleId: string
  depth: number
  depthTo?: number
  sampleType: 'UD' | 'SPT' | 'Other'
  soilCode?: string
  soilDescription?: string
  waterContent?: number
  sieve10Passing?: number
  sieve200Passing?: number
  liquidLimit?: number
  plasticLimit?: number
  plasticityIndex?: number
  consistencyDensity?: string
  pointLoadIs50?: number
  unitWeight?: number
  uniaxialRockStrength?: number
  uuC?: number
  uuPhi?: number
  consolidationCc?: number
  consolidationCs?: number
  elasticModulus?: number
  poissonRatio?: number
  hydrometer075?: number
  hydrometer002?: number
  directShearC?: number
  directShearPhi?: number
  density?: number
  porosity?: number
  voidRatio?: number
  c?: number
  phi?: number
  finesContent?: number
  source: FieldDataSource
  confirmed: boolean
  notes?: string
}
