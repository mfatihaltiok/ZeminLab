export type UnitSystem = 'kN-m' | 'ton-m' | 'kPa-m'

export interface ProjectVisualDocuments {
  aerialPhoto?: string
  layoutPlan?: string
  architecturalSection?: string
  foundationPlan?: string
  foundationStress?: string
}

export interface SoilParameters {
  unitWeight: number
  cohesion: number
  frictionAngle: number
}

export interface FoundationParameters {
  footingWidth: number
  footingDepth: number
  safetyFactor: number
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
  title: 'Zemin Etüdü Projesi',
  projectNo: '',
  date: new Date().toISOString().slice(0, 10),
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
    unitWeight: 18,
    cohesion: 10,
    frictionAngle: 30
  },
  foundationParameters: {
    footingWidth: 2,
    footingDepth: 1,
    safetyFactor: 3
  },
  visualDocuments: {}
}
