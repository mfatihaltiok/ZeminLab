export type IdealizedProfileStatus = 'TASLAK' | 'SABİTLENDİ'
export type ParameterSourceType = 'LABORATUVAR' | 'SPT_KORELASYONU' | 'LİTOLOJİ' | 'KULLANICI'

export interface IdealizedParameterSource {
  type: ParameterSourceType
  method?: string
  sampleIds?: string[]
  boreholeIds?: string[]
  note?: string
}

export interface IdealizedSoilLayer {
  id: string
  order: number
  topDepth: number
  bottomDepth: number
  soilName: string
  soilCode: string
  boreholeIds: string[]
  sptRecordIds: string[]
  laboratoryRecordIds: string[]
  representativeSptN?: number
  representativeN60?: number
  gamma?: number
  gammaSat?: number
  waterContent?: number
  liquidLimit?: number
  plasticLimit?: number
  plasticityIndex?: number
  finesContent?: number
  cohesion?: number
  frictionAngle?: number
  compressionIndexCc?: number
  recompressionIndexCr?: number
  preconsolidationPressure?: number
  constrainedModulus?: number
  oedometricModulus?: number
  poissonRatio?: number
  parameterSources: Record<string, IdealizedParameterSource>
  userOverride: boolean
  notes?: string
}

export interface IdealizedSoilProfile {
  id: string
  version: number
  status: IdealizedProfileStatus
  targetLayerCount: number
  generatedAt: string
  frozenAt?: string
  sourceBoreholeIds: string[]
  sourceLaboratoryIds: string[]
  layers: IdealizedSoilLayer[]
  methodology: string
  notes?: string
}

export function createEmptyIdealizedProfile(): IdealizedSoilProfile {
  return {
    id: crypto.randomUUID(),
    version: 1,
    status: 'TASLAK',
    targetLayerCount: 3,
    generatedAt: new Date().toISOString(),
    sourceBoreholeIds: [],
    sourceLaboratoryIds: [],
    layers: [],
    methodology: 'TBDY 2018 + Türk mevzuatı ve ilgili TS/TS EN/TS EN ISO standartları esas alınır. Katman sınırları; litoloji, SPT, laboratuvar verileri ve mühendislik değerlendirmesi birlikte dikkate alınarak oluşturulur.'
  }
}
