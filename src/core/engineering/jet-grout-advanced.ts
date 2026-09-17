import { jetGroutAdvanced, type JetGroutAdvancedInput, type JetGroutAdvancedResult } from './advanced-geotech'

export interface PriebeScreeningInput {
  areaReplacementRatio: number
  columnFrictionAngle: number
  soilPoissonRatio?: number
  columnModulus?: number
  soilModulus?: number
}

export interface PriebeScreeningResult {
  n0: number
  n1: number
  activeEarthPressureCoefficient: number
  areaReplacementRatio: number
  modulusLimit?: number
  formula: string
  warning: string
}

/**
 * Priebe (1995) screening calculation for vibro-replacement/stone columns.
 * It is deliberately NOT applied to jet-grout results because Priebe's method
 * was developed for granular column replacement systems.
 */
export function priebeScreening(i: PriebeScreeningInput): PriebeScreeningResult {
  const ar = Math.min(0.95, Math.max(1e-6, i.areaReplacementRatio))
  const phi = Math.max(0, Math.min(60, i.columnFrictionAngle)) * Math.PI / 180
  const mu = i.soilPoissonRatio == null ? 1 / 3 : Math.max(0, Math.min(0.49, i.soilPoissonRatio))
  const ka = Math.pow(Math.tan(Math.PI / 4 - phi / 2), 2)
  const f = ((1 - mu) * (1 - ar)) / (1 - 2 * mu + ar)
  const n0 = 1 + ar * ((1 + f / ka) / Math.max(f, 1e-9) - 1)
  const modulusLimit = i.columnModulus != null && i.soilModulus != null && i.soilModulus > 0 ? i.columnModulus / i.soilModulus : undefined
  const n1 = modulusLimit != null ? Math.min(n0, Math.max(1, modulusLimit)) : n0
  return {
    n0,
    n1,
    activeEarthPressureCoefficient: ka,
    areaReplacementRatio: ar,
    modulusLimit,
    formula: 'n₀ = 1 + (Ac/A)[(1 + f/Ka)/f − 1],  f=[(1−μs)(1−Ac/A)]/(1−2μs+Ac/A); n₁ ≤ Ec/Es',
    warning: 'Priebe 1995 taş kolon/vibro-replacement yöntemi içindir; bu değer Jet Grout tasarım katsayısı olarak kullanılmaz.'
  }
}

export interface VirtualRaftInput {
  load: number
  area: number
  treatedThickness: number
  untreatedModulus: number
  treatedModulus: number
  poissonRatio?: number
}

export interface VirtualRaftResult {
  q: number
  untreatedSettlement: number
  treatedSettlement: number
  reductionRatio: number
  reductionPercent: number
  formula: string
}

/** Equivalent-layer/virtual-raft screening settlement comparison. */
export function virtualRaftSettlement(i: VirtualRaftInput): VirtualRaftResult {
  const A = Math.max(i.area, 1e-9)
  const H = Math.max(i.treatedThickness, 0)
  const Es = Math.max(i.untreatedModulus, 1e-9)
  const Ec = Math.max(i.treatedModulus, 1e-9)
  const nu = Math.max(0, Math.min(0.49, i.poissonRatio ?? 0.30))
  const q = Math.max(0, i.load) / A
  const factor = 1 - nu * nu
  const untreatedSettlement = q * H * factor / Es
  const treatedSettlement = q * H * factor / Ec
  const reductionRatio = untreatedSettlement > 0 ? treatedSettlement / untreatedSettlement : 0
  return {
    q,
    untreatedSettlement,
    treatedSettlement,
    reductionRatio,
    reductionPercent: Math.max(0, 1 - reductionRatio) * 100,
    formula: 's = q·H·(1−ν²)/E; virtual raft compares untreated and treated equivalent layers'
  }
}

export interface ShearSafetyInput {
  verticalLoad: number
  horizontalLoad: number
  area: number
  cohesion: number
  frictionAngle: number
  effectiveNormalStress?: number
}

export interface ShearSafetyResult {
  shearStress: number
  shearResistance: number
  FS: number
  formula: string
}

/** Direct-interface shear screening for a treated foundation block. */
export function jetGroutShearSafety(i: ShearSafetyInput): ShearSafetyResult {
  const A = Math.max(i.area, 1e-9)
  const tau = Math.max(0, i.horizontalLoad) / A
  const sigma = i.effectiveNormalStress != null ? Math.max(0, i.effectiveNormalStress) : Math.max(0, i.verticalLoad) / A
  const phi = Math.max(0, i.frictionAngle) * Math.PI / 180
  const resistance = Math.max(0, i.cohesion) + sigma * Math.tan(phi)
  return {
    shearStress: tau,
    shearResistance: resistance,
    FS: tau > 0 ? resistance / tau : 99,
    formula: 'FS = [c′ + σ′n·tanφ′] / τ,  τ = H/A'
  }
}

export interface JetGroutEngineeringInput extends JetGroutAdvancedInput {
  columnFrictionAngle?: number
  soilPoissonRatio?: number
  foundationThickness?: number
  cohesion?: number
  frictionAngle?: number
  verticalLoad?: number
  horizontalLoad?: number
  shearNormalStress?: number
}

export interface JetGroutEngineeringResult extends JetGroutAdvancedResult {
  stressConcentrationFactor: number
  virtualRaft?: VirtualRaftResult
  shearSafety?: ShearSafetyResult
  priebeScreening?: PriebeScreeningResult
}

export function jetGroutEngineering(i: JetGroutEngineeringInput): JetGroutEngineeringResult {
  const base = jetGroutAdvanced(i)
  const beta = base.areaReplacementRatio > 0 ? base.columnLoadShare / base.areaReplacementRatio : 1
  const virtualRaft = i.load != null && i.foundationArea != null && i.foundationArea > 0 && i.EsSoil != null && i.EsColumn != null && i.foundationThickness != null
    ? virtualRaftSettlement({ load: i.load, area: i.foundationArea, treatedThickness: i.foundationThickness, untreatedModulus: i.EsSoil, treatedModulus: base.compositeModulus ?? i.EsColumn, poissonRatio: i.soilPoissonRatio })
    : undefined
  const shearSafety = i.verticalLoad != null && i.horizontalLoad != null && i.foundationArea != null && i.cohesion != null && i.frictionAngle != null
    ? jetGroutShearSafety({ verticalLoad: i.verticalLoad, horizontalLoad: i.horizontalLoad, area: i.foundationArea, cohesion: i.cohesion, frictionAngle: i.frictionAngle, effectiveNormalStress: i.shearNormalStress })
    : undefined
  const priebe = i.columnFrictionAngle != null
    ? priebeScreening({ areaReplacementRatio: base.areaReplacementRatio, columnFrictionAngle: i.columnFrictionAngle, soilPoissonRatio: i.soilPoissonRatio, columnModulus: i.EsColumn, soilModulus: i.EsSoil })
    : undefined
  return { ...base, stressConcentrationFactor: beta, virtualRaft, shearSafety, priebeScreening: priebe }
}
