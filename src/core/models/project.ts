export type UnitSystem = 'kN-m' | 'ton-m' | 'kPa-m'
export type SoilClassificationSystem = 'TS EN ISO 14688-2' | 'TBDY 2018'
export type SoilClassificationCode = 'CIL' | 'CIM' | 'CIH' | 'SiL' | 'SiM' | 'SiH' | 'ZA' | 'ZB' | 'ZC' | 'ZD' | 'ZE' | 'ZF'

export interface ProjectVisualDocuments {
  aerialPhoto?: string
  layoutPlan?: string
  architecturalSection?: string
  foundationPlan?: string
  foundationStress?: string
}

export interface SoilClassification {
  system: SoilClassificationSystem
  code: SoilClassificationCode
}

export interface SoilParameters {
  unitWeight: number
  saturatedUnitWeight: number
  cohesion: number
  frictionAngle: number
  groundwaterDepth?: number
  surfaceSlope: number
  foundationBaseSlope: number
  finesContent: number
  classification: SoilClassification
}

export interface FoundationParameters {
  footingWidth: number
  footingLength: number
  footingDepth: number
  safetyFactor: number
  verticalLoad: number
  horizontalLoad: number
  momentX: number
  momentY: number
  resistanceFactorRv: number
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
  basementCount: number
  normalFloorCount: number
  unitSystem: UnitSystem
  soilParameters: SoilParameters
  foundationParameters: FoundationParameters
  visualDocuments: ProjectVisualDocuments
}

export const defaultProjectInfo: ProjectInfo = {
  id: 'proj_default_01',
  title: '',
  projectNo: '',
  date: '',
  location: '',
  province: '',
  district: '',
  address: '',
  parcelInfo: '',
  engineer: '',
  clientName: '',
  firmName: '',
  buildingType: '',
  basementCount: 0,
  normalFloorCount: 0,
  unitSystem: 'kN-m',
  soilParameters: {
    unitWeight: 0,
    saturatedUnitWeight: 0,
    cohesion: 0,
    frictionAngle: 0,
    groundwaterDepth: undefined,
    surfaceSlope: 0,
    foundationBaseSlope: 0,
    finesContent: 0,
    classification: { system: 'TS EN ISO 14688-2', code: 'CIL' }
  },
  foundationParameters: {
    footingWidth: 0,
    footingLength: 0,
    footingDepth: 0,
    safetyFactor: 0,
    verticalLoad: 0,
    horizontalLoad: 0,
    momentX: 0,
    momentY: 0,
    resistanceFactorRv: 0
  },
  visualDocuments: {}
}
