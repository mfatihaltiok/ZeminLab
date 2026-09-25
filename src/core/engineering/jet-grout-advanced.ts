import { jetGroutAdvanced, type JetGroutAdvancedInput, type JetGroutAdvancedResult } from './advanced-geotech'

export interface PriebeScreeningInput { areaReplacementRatio: number; columnFrictionAngle: number; soilPoissonRatio?: number; columnModulus?: number; soilModulus?: number }
export interface PriebeScreeningResult { n0: number; n1: number; activeEarthPressureCoefficient: number; areaReplacementRatio: number; modulusLimit?: number; formula: string; warning: string }

/** Priebe 1995 is retained only as a clearly labelled stone-column/vibro-replacement screening check. */
export function priebeScreening(i: PriebeScreeningInput): PriebeScreeningResult {
  if(!Number.isFinite(i.areaReplacementRatio)||i.areaReplacementRatio<=0||i.areaReplacementRatio>=1) throw new Error('Alan değiştirme oranı 0<Ar<1 olmalıdır.')
  if(!Number.isFinite(i.columnFrictionAngle)||i.columnFrictionAngle<0||i.columnFrictionAngle>60) throw new Error('Kolon φ geçerli 0–60° aralığında olmalıdır.')
  const ar = i.areaReplacementRatio
  const phi = i.columnFrictionAngle * Math.PI / 180
  if (i.soilPoissonRatio == null || !Number.isFinite(i.soilPoissonRatio) || i.soilPoissonRatio < 0 || i.soilPoissonRatio >= 0.5) throw new Error('Priebe ön kontrolü için zemin ν açıkça girilmelidir.')
  const mu = i.soilPoissonRatio
  const ka = Math.pow(Math.tan(Math.PI / 4 - phi / 2), 2)
  const f = ((1 - mu) * (1 - ar)) / Math.max(1 - 2 * mu + ar, 1e-9)
  const n0 = 1 + ar * ((1 + f / Math.max(ka, 1e-9)) / Math.max(f, 1e-9) - 1)
  const modulusLimit = i.columnModulus != null && i.soilModulus != null && i.soilModulus > 0 ? i.columnModulus / i.soilModulus : undefined
  const n1 = modulusLimit != null ? Math.min(n0, Math.max(1, modulusLimit)) : n0
  return { n0, n1, activeEarthPressureCoefficient: ka, areaReplacementRatio: ar, modulusLimit, formula: 'n₀ = 1 + (Ac/A)[(1 + f/Ka)/f − 1]', warning: 'Priebe 1995 taş kolon/vibro-replacement içindir; Jet Grout tasarım katsayısı olarak kullanılmaz.' }
}

export interface VirtualRaftInput { load: number; area: number; treatedThickness: number; untreatedModulus: number; treatedModulus: number; poissonRatio?: number }
export interface VirtualRaftResult { q: number; untreatedSettlement: number; treatedSettlement: number; reductionRatio: number; reductionPercent: number; formula: string }
export function virtualRaftSettlement(i: VirtualRaftInput): VirtualRaftResult {
  if(!Number.isFinite(i.area)||i.area<=0||!Number.isFinite(i.treatedThickness)||i.treatedThickness<0||!Number.isFinite(i.untreatedModulus)||i.untreatedModulus<=0||!Number.isFinite(i.treatedModulus)||i.treatedModulus<=0||!Number.isFinite(i.load)||i.load<0) throw new Error('Sanal radye için alan, iyileştirme kalınlığı, E değerleri ve yük geçerli olmalıdır.')
  const A = i.area, H = i.treatedThickness, Es = i.untreatedModulus, Ec = i.treatedModulus
  if (i.poissonRatio == null || !Number.isFinite(i.poissonRatio) || i.poissonRatio < 0 || i.poissonRatio >= 0.5) throw new Error('Sanal radye karşılaştırması için ν açıkça girilmelidir.')
  const nu = i.poissonRatio, q = Math.max(0, i.load) / A, factor = 1 - nu * nu
  const untreatedSettlement = q * H * factor / Es, treatedSettlement = q * H * factor / Ec
  const reductionRatio = untreatedSettlement > 0 ? treatedSettlement / untreatedSettlement : 0
  return { q, untreatedSettlement, treatedSettlement, reductionRatio, reductionPercent: Math.max(0, 1 - reductionRatio) * 100, formula: 's = q·H·(1−ν²)/E; treated/untreated equivalent-layer comparison' }
}

export interface ShearSafetyInput { verticalLoad: number; horizontalLoad: number; area: number; cohesion: number; frictionAngle: number; effectiveNormalStress?: number }
export interface ShearSafetyResult { shearStress: number; shearResistance: number; FS: number; formula: string }
export function jetGroutShearSafety(i: ShearSafetyInput): ShearSafetyResult {
  if(!Number.isFinite(i.area)||i.area<=0||!Number.isFinite(i.horizontalLoad)||i.horizontalLoad<0||!Number.isFinite(i.verticalLoad)||i.verticalLoad<0||!Number.isFinite(i.cohesion)||i.cohesion<0||!Number.isFinite(i.frictionAngle)||i.frictionAngle<0||i.frictionAngle>=90) throw new Error('Jet Grout kayma güvenliği girdileri geçersiz.')
  const A=i.area, tau=i.horizontalLoad/A, sigma=i.effectiveNormalStress!=null?i.effectiveNormalStress:i.verticalLoad/A
  if(!Number.isFinite(sigma)||sigma<0) throw new Error('Efektif normal gerilme geçerli ve negatif olmayan bir değer olmalıdır.')
  const phi = i.frictionAngle * Math.PI / 180, resistance = i.cohesion + sigma * Math.tan(phi)
  return { shearStress: tau, shearResistance: resistance, FS: tau > 0 ? resistance / tau : 99, formula: 'FS = [c′ + σ′n·tanφ′] / τ, τ = H/A' }
}

export interface JetGroutLayer {
  thickness: number
  gamma: number
  cohesion: number
  frictionAngle: number
  effectiveStressAtTop?: number
  effectiveStressAtBottom?: number
  interfaceAlpha?: number
  interfaceDelta?: number
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
  if(!Number.isFinite(i.diameter)||i.diameter<=0||!Number.isFinite(i.resistanceFactor??1)||((i.resistanceFactor??1)<=0)) throw new Error('Jet Grout eksenel kapasite çapı ve direnç katsayısı geçerli olmalıdır.')
  const d = i.diameter, Ab = Math.PI * d * d / 4, perimeter = Math.PI * d
  let shaftCharacteristic = 0
  const layerTrace = i.layers.map((layer, index) => {
    if(!Number.isFinite(layer.thickness)||layer.thickness<0||!Number.isFinite(layer.gamma)||layer.gamma<=0||!Number.isFinite(layer.cohesion)||layer.cohesion<0||!Number.isFinite(layer.frictionAngle)||layer.frictionAngle<0||layer.frictionAngle>=89) throw new Error('Jet Grout tabakalarında H, γ, c ve φ açıkça geçerli girilmelidir.')
    if(layer.effectiveStressAtTop==null||!Number.isFinite(layer.effectiveStressAtTop)||layer.effectiveStressAtTop<0||layer.effectiveStressAtBottom==null||!Number.isFinite(layer.effectiveStressAtBottom)||layer.effectiveStressAtBottom<layer.effectiveStressAtTop) throw new Error('Jet Grout tabakalarında σ′ üst ve alt değerleri açıkça verilmelidir.')
    const H = layer.thickness
    const sigmaTop = layer.effectiveStressAtTop
    const sigmaBottom = layer.effectiveStressAtBottom
    const sigmaAvg = (sigmaTop + sigmaBottom) / 2
    if (layer.interfaceAlpha == null || !Number.isFinite(layer.interfaceAlpha) || layer.interfaceAlpha < 0 || layer.interfaceAlpha > 1) throw new Error('Jet Grout şaft hesabında arayüz α açıkça verilmelidir.')
    if (layer.interfaceDelta == null || !Number.isFinite(layer.interfaceDelta) || layer.interfaceDelta < 0 || layer.interfaceDelta >= 90) throw new Error('Jet Grout şaft hesabında arayüz δ açıkça verilmelidir.')
    const alpha = layer.interfaceAlpha
    const delta = layer.interfaceDelta * Math.PI / 180
    const tau = Math.max(0, alpha * layer.cohesion + sigmaAvg * Math.tan(delta))
    const shaft = tau * perimeter * H
    shaftCharacteristic += shaft
    return { index, thickness: H, shaft, averageEffectiveStress: sigmaAvg }
  })
  if(i.layers.length===0) throw new Error('Jet Grout eksenel kapasite için en az bir zemin tabakası gerekir.')
  const base = i.layers[i.layers.length - 1]
  if(!Number.isFinite(base.effectiveStressAtBottom)||base.effectiveStressAtBottom!<0||!Number.isFinite(base.frictionAngle)||base.frictionAngle<0||base.frictionAngle>=89) throw new Error('Uç tabaka için σ′ ve φ geçerli olmalıdır.')
  const sigmaBase = base.effectiveStressAtBottom!, phiBase = base.frictionAngle * Math.PI / 180
  const Nq = Math.exp(Math.PI * Math.tan(phiBase)) * Math.pow(Math.tan(Math.PI / 4 + phiBase / 2), 2)
  const Nc = phiBase===0 ? 5.14 : (Nq - 1) / Math.tan(phiBase)
  const tipSoil = base.cohesion * Nc + sigmaBase * Nq
  const tipCharacteristic = Math.max(0, tipSoil * Ab)
  if(i.columnStrength!=null&&(!Number.isFinite(i.columnStrength)||i.columnStrength<0))throw new Error('Jet Grout kolon dayanımı geçerli ve negatif olmayan bir değer olmalıdır.')
  const materialLimit = i.columnStrength != null ? i.columnStrength * Ab : Number.POSITIVE_INFINITY
  const columnCharacteristic = Math.min(materialLimit, shaftCharacteristic + tipCharacteristic)
  if(!Number.isFinite(i.numberOfColumns)||i.numberOfColumns!<1||!Number.isFinite(i.groupRows)||i.groupRows!<1||!Number.isFinite(i.groupColumns)||i.groupColumns!<1||!Number.isFinite(i.groupSpacing)||i.groupSpacing!<d) throw new Error('Grup hesabı için kolon sayısı, satır/sütun sayısı ve aks aralığı açıkça girilmelidir.')
  const n=Math.round(i.numberOfColumns!),rows=Math.round(i.groupRows!),cols=Math.round(i.groupColumns!),spacing=i.groupSpacing!
  const groupWidth = Math.max(d, (cols - 1) * spacing + d), groupLength = Math.max(d, (rows - 1) * spacing + d)
  const blockPerimeter = 2 * (groupWidth + groupLength)
  const blockArea = groupWidth * groupLength
  const blockBase = Math.max(0, tipSoil * blockArea)
  const blockShaft = i.layers.reduce((sum, layer) => {
    const H = Math.max(0, layer.thickness), sigmaTop = Math.max(0, layer.effectiveStressAtTop ?? 0), sigmaBottom = Math.max(sigmaTop, layer.effectiveStressAtBottom ?? sigmaTop + Math.max(layer.gamma, 0) * H)
    if (layer.interfaceAlpha == null || !Number.isFinite(layer.interfaceAlpha) || layer.interfaceAlpha < 0 || layer.interfaceAlpha > 1) throw new Error('Jet Grout blok şaft hesabında arayüz α açıkça verilmelidir.')
    if (layer.interfaceDelta == null || !Number.isFinite(layer.interfaceDelta) || layer.interfaceDelta < 0 || layer.interfaceDelta >= 90) throw new Error('Jet Grout blok şaft hesabında arayüz δ açıkça verilmelidir.')
    const sigmaAvg = (sigmaTop + sigmaBottom) / 2, alpha = layer.interfaceAlpha, delta = layer.interfaceDelta * Math.PI / 180
    return sum + Math.max(0, alpha * layer.cohesion + sigmaAvg * Math.tan(delta)) * blockPerimeter * H
  }, 0)
  const blockCharacteristic = blockBase + blockShaft
  const groupCharacteristic = Math.min(columnCharacteristic * n, blockCharacteristic)
  const governingMode = columnCharacteristic * n <= blockCharacteristic ? 'individual' : 'block'
  const groupEfficiency = columnCharacteristic * n > 0 ? groupCharacteristic / (columnCharacteristic * n) : 0
  if(i.resistanceFactor==null||!Number.isFinite(i.resistanceFactor)||i.resistanceFactor<=0) throw new Error('Jet Grout tasarım kapasitesi için direnç katsayısı açıkça girilmelidir.')
  const resistanceFactor=i.resistanceFactor
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
  const shearSafety = i.verticalLoad != null && i.horizontalLoad != null && i.foundationArea != null && i.foundationArea > 0 && i.cohesion != null && i.frictionAngle != null
    ? jetGroutShearSafety({ verticalLoad: i.verticalLoad, horizontalLoad: i.horizontalLoad, area: i.foundationArea, cohesion: i.cohesion, frictionAngle: i.frictionAngle, effectiveNormalStress: i.shearNormalStress }) : undefined
  const priebe = i.columnFrictionAngle != null && i.soilPoissonRatio != null ? priebeScreening({ areaReplacementRatio: base.areaReplacementRatio, columnFrictionAngle: i.columnFrictionAngle, soilPoissonRatio: i.soilPoissonRatio, columnModulus: i.EsColumn, soilModulus: i.EsSoil }) : undefined
  const axial = i.axial ? jetGroutAxialCapacity(i.axial) : undefined
  return { ...base, stressConcentrationFactor: beta, virtualRaft, shearSafety, priebeScreening: priebe, axial }
}
