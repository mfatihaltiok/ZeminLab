export interface BearingCapacityInput {
  footingWidth: number
  footingDepth: number
  unitWeight: number
  cohesion: number
  frictionAngle: number
  safetyFactor: number
}

export interface BearingCapacityResult {
  Nq: number
  Nc: number
  Ngamma: number
  surcharge: number
  ultimateBearingCapacity: number
  netUltimateBearingCapacity: number
  allowableGrossBearingCapacity: number
  allowableNetBearingCapacity: number
}
