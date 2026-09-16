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
  /** Experiment start depth. Kept as depth for calculation compatibility. */
  depth: number
  /** Experiment end depth. SPT = depth + 0.45 m, UD = depth + 0.50 m. */
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
  {
    id: 'BH-01', name: 'Sondaj-01', firstSptDepth: 1.5, totalDepth: 15, groundwaterDepth: 6.2, elevation: 1012.4,
    lithology: [
      { id: 'l1', from: 0, to: 1.5, code: 'Mg', description: 'Dolgu', colorClass: 'fill' },
      { id: 'l2', from: 1.5, to: 5, code: 'CIL', description: 'Düşük plastisiteli kil', colorClass: 'clay' },
      { id: 'l3', from: 5, to: 9, code: 'siSa', description: 'Siltli kum', colorClass: 'silt' },
      { id: 'l4', from: 9, to: 15, code: 'Sa', description: 'Kum', colorClass: 'sand' }
    ],
    spt: [
      { id: 'bh1-s1', depth: 1.5, depthTo: 1.95, testType: 'SPT', n1: 4, n2: 6, n3: 8, soilCode: 'CIL', soilDescription: 'Düşük plastisiteli Kil', source: 'imported', confirmed: true },
      { id: 'bh1-s2', depth: 3, depthTo: 3.45, testType: 'SPT', n1: 5, n2: 7, n3: 9, soilCode: 'CIL', soilDescription: 'Düşük plastisiteli Kil', source: 'imported', confirmed: true },
      { id: 'bh1-s3', depth: 6, depthTo: 6.45, testType: 'SPT', n1: 6, n2: 9, n3: 11, soilCode: 'siSa', soilDescription: 'Siltli Kum', source: 'imported', confirmed: true },
      { id: 'bh1-s4', depth: 9, depthTo: 9.45, testType: 'SPT', n1: 8, n2: 12, n3: 14, soilCode: 'Sa', soilDescription: 'Kum', source: 'imported', confirmed: true },
      { id: 'bh1-s5', depth: 12, depthTo: 12.45, testType: 'SPT', n1: 14, n2: 20, n3: 22, soilCode: 'Sa', soilDescription: 'Kum', source: 'imported', confirmed: true }
    ]
  },
  {
    id: 'BH-02', name: 'Sondaj-02', firstSptDepth: 2, totalDepth: 12, groundwaterDepth: 5.4, elevation: 1011.9,
    lithology: [
      { id: 'l5', from: 0, to: 2, code: 'Mg', description: 'Dolgu', colorClass: 'fill' },
      { id: 'l6', from: 2, to: 6, code: 'CIM', description: 'Orta plastisiteli kil', colorClass: 'clay' },
      { id: 'l7', from: 6, to: 12, code: 'Sa', description: 'Orta sıkı kum', colorClass: 'sand' }
    ],
    spt: [
      { id: 'bh2-s1', depth: 2, depthTo: 2.45, testType: 'SPT', n1: 4, n2: 5, n3: 7, soilCode: 'CIM', soilDescription: 'Orta plastisiteli Kil', source: 'imported', confirmed: true },
      { id: 'bh2-s2', depth: 5, depthTo: 5.45, testType: 'SPT', n1: 6, n2: 8, n3: 10, soilCode: 'CIM', soilDescription: 'Orta plastisiteli Kil', source: 'imported', confirmed: true },
      { id: 'bh2-s3', depth: 8, depthTo: 8.45, testType: 'SPT', n1: 9, n2: 12, n3: 14, soilCode: 'Sa', soilDescription: 'Kum', source: 'imported', confirmed: true }
    ]
  }
]

export const demoLaboratory: LaboratoryRecord[] = [
  { id: 'LAB-01', boreholeId: 'BH-01', sampleId: 'UD-01', depth: 2.2, sampleType: 'UD', waterContent: 18.4, unitWeight: 18.2, liquidLimit: 38, plasticLimit: 21, plasticityIndex: 17, c: 18, phi: 24, source: 'imported', confirmed: true },
  { id: 'LAB-02', boreholeId: 'BH-01', sampleId: 'UD-02', depth: 5.4, sampleType: 'UD', waterContent: 22.1, unitWeight: 18.7, liquidLimit: 42, plasticLimit: 23, plasticityIndex: 19, c: 20, phi: 22, source: 'imported', confirmed: true },
  { id: 'LAB-03', boreholeId: 'BH-02', sampleId: 'UD-01', depth: 3.1, sampleType: 'UD', waterContent: 19.8, unitWeight: 18.5, liquidLimit: 35, plasticLimit: 20, plasticityIndex: 15, c: 16, phi: 25, source: 'imported', confirmed: true }
]
