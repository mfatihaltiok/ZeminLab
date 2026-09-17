/**
 * Advanced geotechnical calculation services migrated from the legacy ZeminLab engine.
 *
 * These functions are calculation engines. Method, assumptions and source are
 * returned so the UI/report can expose the engineering basis.
 */

export type StressSpreadMethod = '2:1'

export interface StressSpreadInput { q: number; B: number; L: number; z: number }
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

/** Winkler modulus from direct q/s or an elastic half-space approximation. */
export function subgradeReaction(i: SubgradeReactionInput): SubgradeReactionResult {
  const B = Math.max(i.B, 1e-9)
  if (i.method === 'q/s' && i.q != null && i.settlement != null && i.settlement > 0) {
    return { ks: i.q / i.settlement, method: 'q/s', source: 'Project load/settlement definition of Winkler modulus', formula: 'ks = q/s' }
  }
  if (i.Es == null || i.nu == null || i.Es <= 0) throw new Error('Elastic ks requires positive Es and nu.')
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
 * Layer-by-layer settlement. Uses mv where supplied, otherwise an
 * oedometer Cc/e0 formulation with optional preconsolidation stress, otherwise
 * elastic Es. This keeps the calculation deterministic and auditable.
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

    if (H <= 0 || ds <= 0) {
      details.push({ settlement: 0, type })
      continue
    }

    if (l.mv != null && l.mv >= 0) {
      s = H * l.mv * ds
      consolidation += s
      type = 'oedometer'
    } else if (l.Cc != null && l.e0 != null && l.sigma0 > 0 && l.Cc >= 0 && l.e0 > -1) {
      const sigma1 = l.sigma0 + ds
      const spc = l.sigmaPc ?? l.sigma0
      const Cr = Math.max(0, l.Cr ?? l.Cc)
      if (spc > l.sigma0 && sigma1 > l.sigma0) {
        const sigmaA = Math.min(sigma1, spc)
        const sigmaB = Math.max(sigma1, spc)
        let strain = 0
        if (sigmaA > l.sigma0) strain += Cr * Math.log10(sigmaA / l.sigma0)
        if (sigmaB > sigmaA) strain += l.Cc * Math.log10(sigmaB / sigmaA)
        s = H / (1 + l.e0) * Math.max(0, strain)
      } else {
        s = H * l.Cc / (1 + l.e0) * Math.max(0, Math.log10(sigma1 / l.sigma0))
      }
      consolidation += s
      type = 'oedometer'
    } else if (l.Es != null && l.Es > 0) {
      s = H * ds / l.Es
      immediate += s
    }
    details.push({ settlement: Math.max(0, s), type })
  }
  return { immediate, consolidation, total: immediate + consolidation, layers: details }
}

export interface SchmertmannLayer { thickness: number; Es: number; Iz: number }

/** Schmertmann-style strain integration: s = C1 C2 q Σ(Iz/Es)Δz. */
export function schmertmannSettlement(q: number, layers: SchmertmannLayer[], C1 = 1, C2 = 1) {
  const settlement = Math.max(0, C1) * Math.max(0, C2) * Math.max(0, q) * layers.reduce((sum, l) => {
    return sum + Math.max(0, l.Iz) * Math.max(0, l.thickness) / Math.max(l.Es, 1e-9)
  }, 0)
  return {
    settlement,
    formula: 's = C1·C2·q·Σ(Iz/Es)Δz',
    method: 'Schmertmann strain-integration framework'
  }
}

export type JetGroutLayout = 'square' | 'triangular'

export interface JetGroutAdvancedInput {
  columnDiameter: number
  spacing: number
  layout?: JetGroutLayout
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
  layout: JetGroutLayout
}

/**
 * Unit-cell composite model for jet-grout columns.
 *
 * The square/triangular unit-cell geometry is explicit. No Priebe factor is
 * silently applied here: Priebe's original framework is associated with
 * granular column/vibro-replacement systems and must not be presented as a
 * TBDY jet-grout coefficient without a project-specific validated adaptation.
 */
export function jetGroutAdvanced(i: JetGroutAdvancedInput): JetGroutAdvancedResult {
  const d = Math.max(i.columnDiameter, 1e-9)
  const s = Math.max(i.spacing, d)
  const layout: JetGroutLayout = i.layout ?? 'square'
  const Ac = Math.PI * d * d / 4
  const cellArea = layout === 'triangular' ? Math.sqrt(3) * s * s / 2 : s * s
  const ar = Math.min(0.99, Ac / cellArea)
  const qSoil = Math.max(0, i.qSoil)
  const qColumn = Math.max(0, i.qColumn)
  const compositeCapacity = ar * qColumn + (1 - ar) * qSoil
  const compositeModulus = i.EsSoil != null && i.EsColumn != null && i.EsSoil > 0 && i.EsColumn > 0
    ? ar * i.EsColumn + (1 - ar) * i.EsSoil
    : undefined
  const n = i.EsSoil != null && i.EsColumn != null && i.EsSoil > 0 && i.EsColumn > 0
    ? Math.max(1, i.EsColumn / i.EsSoil)
    : undefined
  const columnLoadShare = n != null ? Math.min(0.98, (n * ar) / (1 + (n - 1) * ar)) : ar
  const soilLoadShare = 1 - columnLoadShare
  const treatedSettlementFactor = n != null ? 1 / (1 + (n - 1) * ar) : undefined
  const capacityFS = i.load != null && i.foundationArea != null && i.foundationArea > 0
    ? compositeCapacity * i.foundationArea / Math.max(i.load, 1e-9)
    : undefined

  return {
    areaColumn: Ac,
    cellArea,
    areaReplacementRatio: ar,
    compositeCapacity,
    compositeModulus,
    columnLoadShare,
    soilLoadShare,
    untreatedCapacity: qSoil,
    treatedCapacity: compositeCapacity,
    capacityFS,
    settlementReductionFactor: n,
    treatedSettlementFactor,
    layout
  }
}
