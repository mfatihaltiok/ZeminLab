export type UnitSystem = 'ton-m' | 'kgf-cm' | 'tf-m' | 'lb-ft'
export type SoilClassificationSystem = 'TS EN ISO 14688-2' | 'TBDY 2018'
export type SoilClassificationCode = 'CIL' | 'CIM' | 'CIH' | 'SiL' | 'SiM' | 'SiH' | 'ZA' | 'ZB' | 'ZC' | 'ZD' | 'ZE' | 'ZF'

export interface ProjectVisualDocuments {
  aerialPhoto?: string
  layoutPlan?: string
  architecturalSection?: string
  foundationPlan?: string
  foundationStress?: string
}

export interface GeophysicalParameters {
  vs30?: number
  soilGroup?: 'ZA' | 'ZB' | 'ZC' | 'ZD' | 'ZE' | 'ZF'
  source?: string
  notes?: string
}

export interface SeismicParameters {
  ss?: number
  s1?: number
  fs?: number
  f1?: number
  sds?: number
  sd1?: number
  ta?: number
  tb?: number
  tl?: number
}

export interface SoilClassification {
  system: SoilClassificationSystem
  code?: SoilClassificationCode
}

export interface SoilParameters {
  unitWeight?: number
  saturatedUnitWeight?: number
  cohesion?: number
  frictionAngle?: number
  groundwaterDepth?: number
  surfaceSlope?: number
  foundationBaseSlope?: number
  finesContent?: number
  classification?: SoilClassification
}

export interface FoundationParameters {
  footingWidth?: number
  footingLength?: number
  footingDepth?: number
  safetyFactor?: number
  verticalLoad?: number
  horizontalLoad?: number
  momentX?: number
  momentY?: number
  resistanceFactorRv?: number
}

export interface ProjectInfo {
  id: string
  title: string
  projectNo: string
  date: string
  location: string
  province: string
  district: string
  address: string
  parcelInfo: string
  engineer: string
  clientName: string
  firmName: string
  buildingType: string
  basementCount?: number
  normalFloorCount?: number
  unitSystem: UnitSystem
  geophysical: GeophysicalParameters
  seismic: SeismicParameters
  soilParameters: SoilParameters
  foundationParameters: FoundationParameters
  visualDocuments: ProjectVisualDocuments
}

export const defaultProjectInfo: ProjectInfo = {
  id: '', title: '', projectNo: '', date: '', location: '', province: '', district: '', address: '', parcelInfo: '', engineer: '', clientName: '', firmName: '', buildingType: '',
  basementCount: undefined, normalFloorCount: undefined, unitSystem: 'ton-m', geophysical: {}, seismic: {}, soilParameters: {}, foundationParameters: {}, visualDocuments: {}
}

/** TBDY 2018 Table 16.1 style Vs30 boundaries. ZF is a special site class and is not inferred from Vs30 alone. */
export function classifyVs30(vs30?: number): GeophysicalParameters['soilGroup'] {
  if (vs30 === undefined || !Number.isFinite(vs30) || vs30 <= 0) return undefined
  if (vs30 >= 1500) return 'ZA'
  if (vs30 >= 760) return 'ZB'
  if (vs30 >= 360) return 'ZC'
  if (vs30 >= 180) return 'ZD'
  return 'ZE'
}
