/**
 * Advanced geotechnical calculation services migrated from the legacy ZeminLab engine.
 *
 * IMPORTANT: these are calculation engines, not a substitute for project-specific
 * geotechnical judgement. Every result carries its method/source so the UI/report
 * can expose the engineering basis instead of hiding assumptions.
 */

export type StressSpreadMethod = '2:1'

export interface StressSpreadInput {
  q: number
  B: number
  L: number
  z: number
}

export interface StressSpreadResult {
  deltaSigma: number
  influenceArea: number
  method: StressSpreadMethod
  formula: string
}

/** 2:1 vertical stress spread below a rectangular loaded area. */
export function stressSpread21(i: StressSpreadInput): StressSpreadResult {
  const B = Math.max(i.B, 1e-9)
  const L = Math.max(i.L, 1e-9)
  const z = Math.max(i.z, 0)
  const area = (B + z) * (L + z)
  return {
    deltaSigma: Math.max(0, i.q) * B * L / area,
    influenceArea: area,
    method: '2:1',
    formula: 'Δσz = q·B·L / [(B+z)(L+z)]'
  }
}

export interface SubgradeReactionInput {
  Es?: number
  nu?: number
  B: number
  q?: number
  settlement?: number
  method?: 'elastic' | 'q/s'
}

export interface SubgradeReactionResult {
  ks: number
  method: 'elastic' | 'q/s'
  source: string
  formula: string
}

/**
 * Elastic estimate of Winkler subgrade modulus. If measured/accepted settlement
 * is supplied, q/s is retained as the direct project-specific route.
 */
export function subgradeReaction(i: SubgradeReactionInput): SubgradeReactionResult {
  const B = Math.max(i.B, 1e-9)
  if (i.method === 'q/s' && i.q != null && i.settlement != null && i.settlement > 0) {
    return {
      ks: i.q / i.settlement,
      method: 'q/s',
      source: 'Project load/settlement definition of Winkler modulus',
      formula: 'ks = q/s'
    }
  }
  if (i.Es == null || i.nu == null) throw new Error('Elastic ks requires Es and nu.')
  const nu = Math.min(0.499, Math.max(-0.49, i.nu))
  return {
    ks: i.Es / (B * (1 - nu * nu)),
    method: 'elastic',
    source: 'Elastic half-space approximation; project-specific plate/foundation calibration may govern.',
    formula: 'ks ≈ Es / [B(1−ν²)]'
  }
}

export interface LayerSettlementInput {
  thickness: number
  sigma0: number
  deltaSigma: number
  Es?: number
  mv?: number
  Cc?: number
  e0?: number
  Cr?: number
  sigmaPc?: number
}

export interface LayerSettlementResult {
  immediate: number
  consolidation: number
  total: number
  layers: Array<{ settlement: number; type: 'elastic' | 'oedometer' }>
}

/**
 * Layer-by-layer settlement service. Elastic layers use ΔσH/Es. Oedometer
 * layers use the standard normally-consolidated/recompression logarithmic form.
 */
export function layerSettlement(layers: LayerSettlementInput[]): LayerSettlementResult {
  let immediate = 0
  let consolidation = 0
  const details: LayerSettlementResult['layers'] = []
  for (const l of layers) {
    const H = Math.max(0, l.thickness)
    const ds = Math.max(0, l.deltaSigma)
    let s = 0
    let type: 'elastic' | 'oedometer' = 'elastic'
    if (l.mv != null) {
      s = H * l.mv * ds
      consolidation += s
      type = 'oedometer'
    } else if (l.Cc != null && l.e0 != null && l.sigma0 > 0) {
      const sigma1 = l.sigma0 + ds
      const spc = l.sigmaPc ?? l.sigma0
      const Cr = l.Cr ?? l.Cc
      const first = Math.min(sigma1, spc)
      const second = Math.max(sigma1, spc)
      if (first > l.sigma0 && second > first && spc > l.sigma0) {
        s = H / (1 + l.e0) * (Cr * Math.log10(first / l.sigma0) + l.Cc * Math.log10(second / first))
      } else {
        s = H * l.Cc / (1 + l.e0) * Math.log10(sigma1 / l.sigma0)
      }
      consolidation += Math.max(0, s)
      type = 'oedometer'
    } else if (l.Es != null && l.Es > 0) {
      s = H * ds / l.Es
      immediate += Math.max(0, s)
    }
    details.push({ settlement: Math.max(0, s), type })
  }
  return { immediate, consolidation, total: immediate + consolidation, layers: details }
}

export interface SchmertmannLayer {
  thickness: number
  Es: number
  Iz: number
}

/** Schmertmann-style strain integration: s = C1 C2 q Σ(Iz/Es)Δz. */
export function schmertmannSettlement(q: number, layers: SchmertmannLayer[], C1 = 1, C2 = 1) {
  const settlement = Math.max(0, C1) * Math.max(0, C2) * Math.max(0, q) * layers.reduce((s, l) => {
    return s + Math.max(0, l.Iz) * Math.max(0, l.thickness) / Math.max(l.Es, 1e-9)
  }, 0)
  return {
    settlement,
    formula: 's = C1·C2·q·Σ(Iz/Es)Δz',
    method: 'Schmertmann strain-integration framework'
  }
}

export interface JetGroutAdvancedInput {
  columnDiameter: number
  spacing: number
  qSoil: number
  qColumn: number
  EsSoil?: number
  EsColumn?: number
  load?: number
  foundationArea?: number
  FS?: number
}

export interface JetGroutAdvancedResult {
  areaColumn: number
  cellArea: number
  areaReplacementRatio: number
  compositeCapacity: number
  compositeModulus?: number
  columnLoadShare: number
  soilLoadShare: number
  untreatedCapacity: number
  treatedCapacity: number
  capacityFS?: number
  settlementReductionFactor?: number
  treatedSettlementFactor?: number
}

/**
 * Unit-cell composite model for jet-grout columns. Priebe-style improvement
 * factor is exposed only when the user supplies a column friction angle in the
 * UI layer; this core function deliberately does not invent that parameter.
 */
export function jetGroutAdvanced(i: JetGroutAdvancedInput): JetGroutAdvancedResult {
  const d = Math.max(i.columnDiameter, 1e-9)
  const s = Math.max(i.spacing, d)
  const Ac = Math.PI * d * d / 4
  const A = s * s
  const ar = Math.min(0.99, Ac / A)
  const compositeCapacity = ar * i.qColumn + (1 - ar) * i.qSoil
  const compositeModulus = i.EsSoil != null && i.EsColumn != null
    ? ar * i.EsColumn + (1 - ar) * i.EsSoil
    : undefined
  const n = i.EsSoil && i.EsColumn && i.EsSoil > 0 ? Math.max(1, i.EsColumn / i.EsSoil) : undefined
  const columnLoadShare = n != null ? Math.min(0.98, (n * ar) / (1 + (n - 1) * ar)) : ar
  const soilLoadShare = 1 - columnLoadShare
  const treatedSettlementFactor = n != null ? 1 / (1 + (n - 1) * ar) : undefined
  const capacityFS = i.load != null && i.foundationArea && i.foundationArea > 0
    ? compositeCapacity * i.foundationArea / Math.max(i.load, 1e-9)
    : undefined
  return {
    areaColumn: Ac,
    cellArea: A,
    areaReplacementRatio: ar,
    compositeCapacity,
    compositeModulus,
    columnLoadShare,
    soilLoadShare,
    untreatedCapacity: i.qSoil,
    treatedCapacity: compositeCapacity,
    capacityFS,
    settlementReductionFactor: n,
    treatedSettlementFactor
  }
}
