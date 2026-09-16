export type BoreholeId = string

export type SptTestType = 'SPT' | 'UD'
export type FieldDataSource = 'manual' | 'image-review' | 'imported'
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

export const demoBoreholes: BoreholeRecord[] = [
  { id: 'BH-01', name: 'Sondaj-01', firstSptDepth: 1.5, totalDepth: 15, groundwaterDepth: 6.2, elevation: 1012.4, lithology: [], spt: [
    { id: 'bh1-s1', depth: 1.5, depthTo: 1.95, testType: 'SPT', n1: 4, n2: 6, n3: 8, soilCode: 'CIL', soilDescription: 'Düşük plastisiteli Kil', source: 'imported', confirmed: true },
    { id: 'bh1-s2', depth: 3, depthTo: 3.45, testType: 'SPT', n1: 5, n2: 7, n3: 9, soilCode: 'CIL', soilDescription: 'Düşük plastisiteli Kil', source: 'imported', confirmed: true }
  ] },
  { id: 'BH-02', name: 'Sondaj-02', firstSptDepth: 2, totalDepth: 12, groundwaterDepth: 5.4, elevation: 1011.9, lithology: [], spt: [
    { id: 'bh2-s1', depth: 2, depthTo: 2.45, testType: 'SPT', n1: 4, n2: 5, n3: 7, soilCode: 'CIM', soilDescription: 'Orta plastisiteli Kil', source: 'imported', confirmed: true }
  ] }
]

export const demoLaboratory: LaboratoryRecord[] = []
