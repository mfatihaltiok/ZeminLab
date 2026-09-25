export type IdealizedProfileStatus = 'TASLAK' | 'SABİTLENDİ'
export type ParameterSourceType = 'LABORATUVAR' | 'SPT_KORELASYONU' | 'LİTOLOJİ' | 'KULLANICI'
export type ConsolidationState = 'NC' | 'OC' | 'UNKNOWN'

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
  /** c' and phi' only. UU strength is stored separately in undrainedCohesion. */
  cohesion?: number
  frictionAngle?: number
  undrainedCohesion?: number
  compressionIndexCc?: number
  recompressionIndexCr?: number
  initialVoidRatio?: number
  preconsolidationPressure?: number
  consolidationState?: ConsolidationState
  /** Young's modulus Es. */
  elasticModulus?: number
  /** Constrained/oedometer modulus M. Never populated from Es automatically. */
  constrainedModulus?: number
  oedometricModulus?: number
  poissonRatio?: number
  /** Janbu tangent-modulus parameters; no automatic correlation is permitted. */
  janbuModulusNumber?: number
  janbuStressExponent?: number
  parameterSources: Record<string, IdealizedParameterSource>
  userOverride: boolean
  sourceBoreholeId?: string
  sourceSptRecordId?: string
  sourceLaboratoryRecordId?: string
  thickness?: number
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
  /** All engineering values in layers are stored in kN, kPa, kN/m³ and kN·m compatible base units. */
  parameterUnitSystem: 'kN-m'
  notes?: string
}

export function createEmptyIdealizedProfile(): IdealizedSoilProfile {
  return {
    id: crypto.randomUUID(),
    version: 2,
    status: 'TASLAK',
    targetLayerCount: 3,
    generatedAt: new Date().toISOString(),
    sourceBoreholeIds: [],
    sourceLaboratoryIds: [],
    layers: [],
    parameterUnitSystem:'kN-m',
    methodology: 'Katman sınırları mühendis tarafından tanımlanır; SPT deneyleri kaynak olarak seçilir ve kalınlık kullanıcı tarafından girilir. Efektif dayanım parametreleri yalnız uygun laboratuvar deneylerinden alınır; UU parametreleri c′/φ′ yerine kullanılmaz. Es ve M/oedometer birbirinden bağımsız tutulur.'
  }
}
