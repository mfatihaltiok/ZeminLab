import { jetGroutAdvanced, type JetGroutAdvancedInput, type JetGroutAdvancedResult } from './advanced-geotech'

export interface PriebeScreeningInput { areaReplacementRatio: number; columnFrictionAngle: number; soilPoissonRatio: number; columnModulus?: number; soilModulus?: number }
export interface PriebeScreeningResult { n0: number; n1: number; activeEarthPressureCoefficient: number; areaReplacementRatio: number; modulusLimit?: number; formula: string; warning: string }

/** Priebe 1995 is retained only as a clearly labelled stone-column/vibro-replacement screening check. */
export function priebeScreening(i: PriebeScreeningInput): PriebeScreeningResult {
  const ar = Math.min(0.95, Math.max(1e-6, i.areaReplacementRatio))
  const phi = Math.max(0, Math.min(60, i.columnFrictionAngle)) * Math.PI / 180
  if (!Number.isFinite(i.soilPoissonRatio) || i.soilPoissonRatio <= -1 || i.soilPoissonRatio >= 0.5) throw new Error('Priebe referans kontrolü için zemin ν değeri açıkça girilmelidir (-1 < ν < 0.5).')
  const mu = i.soilPoissonRatio
  const ka = Math.pow(Math.tan(Math.PI / 4 - phi / 2), 2)
  const f = ((1 - mu) * (1 - ar)) / Math.max(1 - 2 * mu + ar, 1e-9)
  const n0 = 1 + ar * ((1 + f / Math.max(ka, 1e-9)) / Math.max(f, 1e-9) - 1)
  const modulusLimit = i.columnModulus != null && i.soilModulus != null && i.soilModulus > 0 ? i.columnModulus / i.soilModulus : undefined
  const n1 = modulusLimit != null ? Math.min(n0, Math.max(1, modulusLimit)) : n0
  return { n0, n1, activeEarthPressureCoefficient: ka, areaReplacementRatio: ar, modulusLimit, formula: 'n₀ = 1 + (Ac/A)[(1 + f/Ka)/f − 1]', warning: 'Priebe 1995 taş kolon/vibro-replacement içindir; Jet Grout tasarım katsayısı olarak kullanılmaz.' }
}

export interface VirtualRaftInput { load: number; area: number; treatedThickness: number; untreatedModulus: number; treatedModulus: number; poissonRatio: number }
export interface VirtualRaftResult { q: number; untreatedSettlement: number; treatedSettlement: number; reductionRatio: number; reductionPercent: number; formula: string }
export function virtualRaftSettlement(i: VirtualRaftInput): VirtualRaftResult {
  const A = Math.max(i.area, 1e-9), H = Math.max(i.treatedThickness, 0), Es = Math.max(i.untreatedModulus, 1e-9), Ec = Math.max(i.treatedModulus, 1e-9)
  if (!Number.isFinite(i.poissonRatio) || i.poissonRatio <= -1 || i.poissonRatio >= 0.5) throw new Error('Sanal radye karşılaştırması için ν açıkça girilmelidir (-1 < ν < 0.5).')
  const nu = i.poissonRatio, q = Math.max(0, i.load) / A, factor = 1 - nu * nu
  const untreatedSettlement = q * H * factor / Es, treatedSettlement = q * H * factor / Ec
  const reductionRatio = untreatedSettlement > 0 ? treatedSettlement / untreatedSettlement : 0
  return { q, untreatedSettlement, treatedSettlement, reductionRatio, reductionPercent: Math.max(0, 1 - reductionRatio) * 100, formula: 's = q·H·(1−ν²)/E; treated/untreated equivalent-layer comparison' }
}

export interface ShearSafetyInput { verticalLoad: number; horizontalLoad: number; area: number; cohesion: number; frictionAngle: number; effectiveNormalStress: number }
export interface ShearSafetyResult { shearStress: number; shearResistance: number; FS: number; formula: string }
export function jetGroutShearSafety(i: ShearSafetyInput): ShearSafetyResult {
  const A = Math.max(i.area, 1e-9), tau = Math.max(0, i.horizontalLoad) / A, sigma = Math.max(0, i.effectiveNormalStress)
  const phi = Math.max(0, i.frictionAngle) * Math.PI / 180, resistance = Math.max(0, i.cohesion) + sigma * Math.tan(phi)
  return { shearStress: tau, shearResistance: resistance, FS: tau > 0 ? resistance / tau : 99, formula: 'FS = [c′ + σ′n·tanφ′] / τ, τ = H/A' }
}

export interface JetGroutLayer {
  thickness: number
  gamma: number
  cohesion: number
  frictionAngle: number
  effectiveStressAtTop?: number
  effectiveStressAtBottom?: number
  interfaceAlpha:number
  interfaceDelta:number
}
export interface JetGroutAxialInput {
  diameter: number
  layers: JetGroutLayer[]
  columnStrength?: number
  columnLength?: number
  foundationLoad?: number
  numberOfColumns?: number
  groupRows?: number
  groupColumns?: number
  groupSpacing?: number
  groupLayout?: 'square' | 'triangular'
  resistanceFactor?: number
}
export interface JetGroutAxialResult {
  shaftCharacteristic: number
  tipCharacteristic: number
  columnCharacteristic: number
  groupCharacteristic: number
  designCapacity: number
  groupEfficiency: number
  governingMode: 'individual' | 'block'
  layerTrace: Array<{ index: number; thickness: number; shaft: number; averageEffectiveStress: number }>
  source: string
}

/**
 * Layer-based axial check. The shaft/tip equations are deliberately exposed as
 * general geotechnical capacity equations; Erol & Çekinmez Bayram (2018) is the
 * Jet Grout design/QC source, while project/code-approved interface parameters
 * remain explicit inputs instead of being guessed from the book.
 */
export function jetGroutAxialCapacity(i: JetGroutAxialInput): JetGroutAxialResult {
  const d = Math.max(i.diameter, 1e-6), Ab = Math.PI * d * d / 4, perimeter = Math.PI * d
  let shaftCharacteristic = 0
  const layerTrace = i.layers.map((layer, index) => {
    const H = Math.max(0, layer.thickness)
    const sigmaTop = Math.max(0, layer.effectiveStressAtTop ?? 0)
    const sigmaBottom = Math.max(sigmaTop, layer.effectiveStressAtBottom ?? sigmaTop + Math.max(layer.gamma, 0) * H)
    const sigmaAvg = (sigmaTop + sigmaBottom) / 2
    const alpha = Math.max(0, Math.min(1, layer.interfaceAlpha))
    const delta = Math.max(0, Math.min(89, layer.interfaceDelta)) * Math.PI / 180
    const tau = Math.max(0, alpha * layer.cohesion + sigmaAvg * Math.tan(delta))
    const shaft = tau * perimeter * H
    shaftCharacteristic += shaft
    return { index, thickness: H, shaft, averageEffectiveStress: sigmaAvg }
  })
  if (!i.layers.length) throw new Error('Eksenel Jet Grout hesabı için en az bir zemin tabakası gerekir.')
  const base = i.layers[i.layers.length - 1]
  const sigmaBase = base ? Math.max(0, base.effectiveStressAtBottom ?? 0) : 0
  const phiBase = base ? Math.max(0, Math.min(89, base.frictionAngle)) * Math.PI / 180 : 0
  const Nq = Math.exp(Math.PI * Math.tan(phiBase)) * Math.pow(Math.tan(Math.PI / 4 + phiBase / 2), 2)
  const tipSoil = base ? Math.max(0, base.cohesion) * ((Nq - 1) / Math.max(Math.tan(phiBase), 1e-9)) + sigmaBase * Nq : 0
  const tipCharacteristic = Math.max(0, tipSoil * Ab)
  const materialLimit = i.columnStrength != null ? Math.max(0, i.columnStrength) * Ab : Number.POSITIVE_INFINITY
  const columnCharacteristic = Math.min(materialLimit, shaftCharacteristic + tipCharacteristic)
  if (i.numberOfColumns == null || !Number.isFinite(i.numberOfColumns) || i.numberOfColumns < 1) throw new Error('Kolon sayısı açıkça girilmelidir.')
  if (i.groupRows == null || i.groupColumns == null || i.groupSpacing == null) throw new Error('Grup satır/sütun sayısı ve aks aralığı açıkça girilmelidir.')
  const n = Math.max(1, Math.round(i.numberOfColumns)), rows = Math.max(1, Math.round(i.groupRows)), cols = Math.max(1, Math.round(i.groupColumns))
  const spacing = i.groupSpacing
  const groupWidth = Math.max(d, (cols - 1) * spacing + d), groupLength = Math.max(d, (rows - 1) * spacing + d)
  const blockPerimeter = 2 * (groupWidth + groupLength)
  const blockArea = groupWidth * groupLength
  const blockBase = Math.max(0, tipSoil * blockArea)
  const blockShaft = i.layers.reduce((sum, layer) => {
    const H = Math.max(0, layer.thickness), sigmaTop = Math.max(0, layer.effectiveStressAtTop ?? 0), sigmaBottom = Math.max(sigmaTop, layer.effectiveStressAtBottom ?? sigmaTop + Math.max(layer.gamma, 0) * H)
    const sigmaAvg = (sigmaTop + sigmaBottom) / 2, alpha = Math.max(0, Math.min(1, layer.interfaceAlpha)), delta = Math.max(0, Math.min(89, layer.interfaceDelta)) * Math.PI / 180
    return sum + Math.max(0, alpha * layer.cohesion + sigmaAvg * Math.tan(delta)) * blockPerimeter * H
  }, 0)
  const blockCharacteristic = blockBase + blockShaft
  const groupCharacteristic = Math.min(columnCharacteristic * n, blockCharacteristic)
  const governingMode = columnCharacteristic * n <= blockCharacteristic ? 'individual' : 'block'
  const groupEfficiency = columnCharacteristic * n > 0 ? groupCharacteristic / (columnCharacteristic * n) : 0
  if (i.resistanceFactor == null || !Number.isFinite(i.resistanceFactor) || i.resistanceFactor < 1) throw new Error('Jet Grout eksenel grup tasarımı için direnç katsayısı açıkça girilmelidir (≥1).')
  const resistanceFactor = i.resistanceFactor
  return { shaftCharacteristic, tipCharacteristic, columnCharacteristic, groupCharacteristic, designCapacity: groupCharacteristic / resistanceFactor, groupEfficiency, governingMode, layerTrace, source: 'Erol & Çekinmez Bayram (2018) Jet Enjeksiyon Yöntemi; kapasite alt kontrolleri genel geoteknik uç/şaft dayanımı bağıntılarıyla ve açık kullanıcı girdileriyle yürütülür.' }
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
  axial?: JetGroutAxialInput
}
export interface JetGroutEngineeringResult extends JetGroutAdvancedResult { stressConcentrationFactor: number; virtualRaft?: VirtualRaftResult; shearSafety?: ShearSafetyResult; priebeScreening?: PriebeScreeningResult; axial?: JetGroutAxialResult }

export function jetGroutEngineering(i: JetGroutEngineeringInput): JetGroutEngineeringResult {
  const base = jetGroutAdvanced(i)
  const beta = base.areaReplacementRatio > 0 ? base.columnLoadShare / base.areaReplacementRatio : 1
  const virtualRaft = i.load != null && i.foundationArea != null && i.foundationArea > 0 && i.EsSoil != null && i.EsColumn != null && i.foundationThickness != null && i.soilPoissonRatio != null
    ? virtualRaftSettlement({ load: i.load, area: i.foundationArea, treatedThickness: i.foundationThickness, untreatedModulus: i.EsSoil, treatedModulus: base.compositeModulus ?? i.EsColumn, poissonRatio: i.soilPoissonRatio }) : undefined
  const shearSafety = i.verticalLoad != null && i.horizontalLoad != null && i.foundationArea != null && i.foundationArea > 0 && i.cohesion != null && i.frictionAngle != null && i.shearNormalStress != null
    ? jetGroutShearSafety({ verticalLoad: i.verticalLoad, horizontalLoad: i.horizontalLoad, area: i.foundationArea, cohesion: i.cohesion, frictionAngle: i.frictionAngle, effectiveNormalStress: i.shearNormalStress }) : undefined
  const priebe = i.columnFrictionAngle != null && i.soilPoissonRatio != null ? priebeScreening({ areaReplacementRatio: base.areaReplacementRatio, columnFrictionAngle: i.columnFrictionAngle, soilPoissonRatio: i.soilPoissonRatio, columnModulus: i.EsColumn, soilModulus: i.EsSoil }) : undefined
  const axial = i.axial ? jetGroutAxialCapacity(i.axial) : undefined
  return { ...base, stressConcentrationFactor: beta, virtualRaft, shearSafety, priebeScreening: priebe, axial }
}
