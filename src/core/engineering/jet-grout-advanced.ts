import { jetGroutAdvanced, type JetGroutAdvancedInput, type JetGroutAdvancedResult } from './advanced-geotech'

export interface PriebeScreeningInput { areaReplacementRatio: number; columnFrictionAngle: number; soilPoissonRatio?: number; columnModulus?: number; soilModulus?: number }
export interface PriebeScreeningResult { n0: number; n1: number; activeEarthPressureCoefficient: number; areaReplacementRatio: number; modulusLimit?: number; formula: string; warning: string }

/** Priebe 1995 is retained only as a clearly labelled stone-column/vibro-replacement screening check. */
export function priebeScreening(i: PriebeScreeningInput): PriebeScreeningResult {
  if(!Number.isFinite(i.areaReplacementRatio)||i.areaReplacementRatio<=0||i.areaReplacementRatio>=1)throw new Error('Priebe tarama hesabında alan değiştirme oranı 0<ar<1 olmalıdır.')
  if(!Number.isFinite(i.columnFrictionAngle)||i.columnFrictionAngle<0||i.columnFrictionAngle>=90)throw new Error('Taş kolon sürtünme açısı 0°≤φ<90° olmalıdır.')
  if(i.soilPoissonRatio!=null&&(!Number.isFinite(i.soilPoissonRatio)||i.soilPoissonRatio<0||i.soilPoissonRatio>=0.5))throw new Error('Poisson oranı 0≤ν<0.5 olmalıdır.')
  if(i.columnModulus!=null&&(!Number.isFinite(i.columnModulus)||i.columnModulus<=0)||i.soilModulus!=null&&(!Number.isFinite(i.soilModulus)||i.soilModulus<=0))throw new Error('Modül oranı için Es değerleri pozitif olmalıdır.')
  const ar = i.areaReplacementRatio
  const phi = i.columnFrictionAngle * Math.PI / 180
  const mu = i.soilPoissonRatio ?? 1 / 3
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
  if(![i.load,i.area,i.treatedThickness,i.untreatedModulus,i.treatedModulus].every(Number.isFinite)||i.load<0||i.area<=0||i.treatedThickness<=0||i.untreatedModulus<=0||i.treatedModulus<=0)throw new Error('Sanal radye hesabında yük negatif olmayan, alan/kalınlık/modüller pozitif sonlu olmalıdır.')
  if(i.poissonRatio!=null&&(!Number.isFinite(i.poissonRatio)||i.poissonRatio<=-1||i.poissonRatio>=0.5))throw new Error('Poisson oranı -1<ν<0.5 aralığında olmalıdır.')
  const A = i.area, H = i.treatedThickness, Es = i.untreatedModulus, Ec = i.treatedModulus
  const nu = i.poissonRatio ?? 0.30, q = i.load / A, factor = 1 - nu * nu
  const untreatedSettlement = q * H * factor / Es, treatedSettlement = q * H * factor / Ec
  const reductionRatio = untreatedSettlement > 0 ? treatedSettlement / untreatedSettlement : 0
  return { q, untreatedSettlement, treatedSettlement, reductionRatio, reductionPercent: Math.max(0, 1 - reductionRatio) * 100, formula: 's = q·H·(1−ν²)/E; treated/untreated equivalent-layer comparison' }
}

export interface ShearSafetyInput { verticalLoad: number; horizontalLoad: number; area: number; cohesion: number; frictionAngle: number; effectiveNormalStress?: number }
export interface ShearSafetyResult { shearStress: number; shearResistance: number; FS: number; formula: string }
export function jetGroutShearSafety(i: ShearSafetyInput): ShearSafetyResult {
  if(![i.verticalLoad,i.horizontalLoad,i.area,i.cohesion,i.frictionAngle].every(Number.isFinite)||i.verticalLoad<0||i.horizontalLoad<0||i.area<=0||i.cohesion<0||i.frictionAngle<0||i.frictionAngle>50)throw new Error('Jet Grout kayma girdileri geçersiz.')
  if(i.effectiveNormalStress!=null&&(!Number.isFinite(i.effectiveNormalStress)||i.effectiveNormalStress<0))throw new Error('Efektif normal gerilme negatif olmayan sonlu değer olmalıdır.')
  const A = i.area, tau = i.horizontalLoad / A, sigma = i.effectiveNormalStress != null ? i.effectiveNormalStress : i.verticalLoad / A
  const phi = i.frictionAngle * Math.PI / 180, resistance = i.cohesion + sigma * Math.tan(phi)
  return { shearStress: tau, shearResistance: resistance, FS: tau > 0 ? resistance / tau : Number.POSITIVE_INFINITY, formula: 'FS = [c′ + σ′n·tanφ′] / τ, τ = H/A' }
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
  if(!Number.isFinite(i.diameter)||i.diameter<=0)throw new Error('Jet Grout kolon çapı pozitif olmalıdır.')
  if(!Array.isArray(i.layers)||i.layers.length===0)throw new Error('Jet Grout eksenel kapasitesi için zemin tabakaları gereklidir.')
  if(i.columnStrength==null||!Number.isFinite(i.columnStrength)||i.columnStrength<=0)throw new Error('Jet Grout kolon malzeme dayanımı pozitif ve açıkça girilmelidir.')
  if(i.numberOfColumns!=null&&(!Number.isInteger(i.numberOfColumns)||i.numberOfColumns<1))throw new Error('Kolon sayısı pozitif tamsayı olmalıdır.')
  if(i.groupRows!=null&&(!Number.isInteger(i.groupRows)||i.groupRows<1)||i.groupColumns!=null&&(!Number.isInteger(i.groupColumns)||i.groupColumns<1))throw new Error('Grup satır/sütun sayıları pozitif tamsayı olmalıdır.')
  if(i.numberOfColumns!=null&&i.numberOfColumns>1&&(i.groupRows==null||i.groupColumns==null||i.groupSpacing==null))throw new Error('Çok kolonlu grup kapasitesi için satır, sütun ve aks aralığı açıkça girilmelidir.')
  if(i.groupSpacing!=null&&(!Number.isFinite(i.groupSpacing)||i.groupSpacing<=0))throw new Error('Grup aks aralığı pozitif olmalıdır.')
  if(i.resistanceFactor!=null&&(!Number.isFinite(i.resistanceFactor)||i.resistanceFactor<=0))throw new Error('Direnç katsayısı pozitif olmalıdır.')
  for(const [index,l] of i.layers.entries())if(![l.thickness,l.gamma,l.cohesion,l.frictionAngle].every(Number.isFinite)||l.thickness<=0||l.gamma<=0||l.cohesion<0||l.frictionAngle<0||l.frictionAngle>50||(l.effectiveStressAtTop!=null&&(!Number.isFinite(l.effectiveStressAtTop)||l.effectiveStressAtTop<0))||(l.effectiveStressAtBottom!=null&&(!Number.isFinite(l.effectiveStressAtBottom)||l.effectiveStressAtBottom<0))||(l.interfaceAlpha!=null&&(!Number.isFinite(l.interfaceAlpha)||l.interfaceAlpha<0||l.interfaceAlpha>1))||(l.interfaceDelta!=null&&(!Number.isFinite(l.interfaceDelta)||l.interfaceDelta<0||l.interfaceDelta>50)))throw new Error('Jet Grout tabaka '+(index+1)+' parametreleri geçersiz.')
  for(const [index,l] of i.layers.entries())if(l.effectiveStressAtTop==null||l.effectiveStressAtBottom==null||l.interfaceAlpha==null||l.interfaceDelta==null||l.effectiveStressAtBottom<l.effectiveStressAtTop)throw new Error('Jet Grout tabaka '+(index+1)+': efektif gerilmeler ve arayüz α/δ parametreleri açıkça girilmelidir.')
  const d = i.diameter, Ab = Math.PI * d * d / 4, perimeter = Math.PI * d
  let shaftCharacteristic = 0
  const layerTrace = i.layers.map((layer, index) => {
    const H = layer.thickness
    const sigmaTop = layer.effectiveStressAtTop!
    const sigmaBottom = layer.effectiveStressAtBottom!
    const sigmaAvg = (sigmaTop + sigmaBottom) / 2
    const alpha = layer.interfaceAlpha!
    const delta = layer.interfaceDelta! * Math.PI / 180
    const tau = Math.max(0, alpha * layer.cohesion + sigmaAvg * Math.tan(delta))
    const shaft = tau * perimeter * H
    shaftCharacteristic += shaft
    return { index, thickness: H, shaft, averageEffectiveStress: sigmaAvg }
  })
  const base = i.layers.length ? i.layers[i.layers.length - 1] : undefined
  const sigmaBase = base ? base.effectiveStressAtBottom! : 0
  const phiBase = base ? base.frictionAngle * Math.PI / 180 : 0
  const Nq = Math.exp(Math.PI * Math.tan(phiBase)) * Math.pow(Math.tan(Math.PI / 4 + phiBase / 2), 2)
  const tipSoil = base ? Math.max(0, base.cohesion) * ((Nq - 1) / Math.max(Math.tan(phiBase), 1e-9)) + sigmaBase * Nq : 0
  const tipCharacteristic = Math.max(0, tipSoil * Ab)
  const materialLimit = i.columnStrength != null ? Math.max(0, i.columnStrength) * Ab : Number.POSITIVE_INFINITY
  const columnCharacteristic = Math.min(materialLimit, shaftCharacteristic + tipCharacteristic)
  const n = Math.max(1, Math.round(i.numberOfColumns ?? 1))
  const rows = Math.max(1, Math.round(i.groupRows ?? Math.sqrt(n))), cols = Math.max(1, Math.round(i.groupColumns ?? Math.ceil(n / rows)))
  const spacing = Math.max(i.groupSpacing ?? d, d)
  const staggerOffset = i.groupLayout === 'triangular' && rows > 1 ? spacing / 2 : 0
  const groupWidth = Math.max(d, (cols - 1) * spacing + d + staggerOffset), groupLength = Math.max(d, (rows - 1) * spacing + d)
  const blockPerimeter = 2 * (groupWidth + groupLength)
  const blockArea = groupWidth * groupLength
  const blockBase = Math.max(0, tipSoil * blockArea)
  const blockShaft = i.layers.reduce((sum, layer) => {
    const H = layer.thickness, sigmaTop = layer.effectiveStressAtTop!, sigmaBottom = layer.effectiveStressAtBottom!
    const sigmaAvg = (sigmaTop + sigmaBottom) / 2, alpha = layer.interfaceAlpha!, delta = layer.interfaceDelta! * Math.PI / 180
    return sum + (alpha * layer.cohesion + sigmaAvg * Math.tan(delta)) * blockPerimeter * H
  }, 0)
  const blockCharacteristic = blockBase + blockShaft
  const groupCharacteristic = Math.min(columnCharacteristic * n, blockCharacteristic)
  const governingMode = columnCharacteristic * n <= blockCharacteristic ? 'individual' : 'block'
  const groupEfficiency = columnCharacteristic * n > 0 ? groupCharacteristic / (columnCharacteristic * n) : 0
  const resistanceFactor = i.resistanceFactor ?? 1
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
export interface JetGroutEngineeringResult extends JetGroutAdvancedResult { stressConcentrationFactor:number; virtualRaft?:VirtualRaftResult; shearSafety?:ShearSafetyResult; priebeScreening?:PriebeScreeningResult; axial?:JetGroutAxialResult; screeningOnly:boolean; warnings:string[] }

export function jetGroutEngineering(i: JetGroutEngineeringInput): JetGroutEngineeringResult {
  const base = jetGroutAdvanced(i)
  const beta = base.areaReplacementRatio > 0 ? base.columnLoadShare / base.areaReplacementRatio : 1
  const virtualRaft = i.load != null && i.foundationArea != null && i.foundationArea > 0 && i.EsSoil != null && i.EsColumn != null && i.foundationThickness != null && i.soilPoissonRatio != null
    ? virtualRaftSettlement({ load: i.load, area: i.foundationArea, treatedThickness: i.foundationThickness, untreatedModulus: i.EsSoil, treatedModulus: base.compositeModulus ?? i.EsColumn, poissonRatio: i.soilPoissonRatio }) : undefined
  const shearSafety = i.verticalLoad != null && i.horizontalLoad != null && i.foundationArea != null && i.foundationArea > 0 && i.cohesion != null && i.frictionAngle != null
    ? jetGroutShearSafety({ verticalLoad: i.verticalLoad, horizontalLoad: i.horizontalLoad, area: i.foundationArea, cohesion: i.cohesion, frictionAngle: i.frictionAngle, effectiveNormalStress: i.shearNormalStress }) : undefined
  const axial = i.axial ? jetGroutAxialCapacity(i.axial) : undefined
  const warnings=['Jet Grout kompozit sonuçları ön tasarım/screening niteliğindedir. Nihai kapasite ve oturma için saha deneyleri, kolon sürekliliği, dayanım/kalite kontrolü ve uygun grup/blok kontrolü ayrıca doğrulanmalıdır.']
  if(i.load!=null&&i.foundationArea!=null&&i.EsSoil!=null&&i.EsColumn!=null&&i.foundationThickness!=null&&i.soilPoissonRatio==null)warnings.push('Sanal radye oturması hesaplanmadı: Poisson oranı ν açıkça girilmelidir.')
  if(i.columnFrictionAngle!=null)warnings.push('Priebe bağıntısı taş kolon/vibro-replacement içindir; Jet Grout sonucu olarak uygulanmadı.')
  return { ...base, stressConcentrationFactor: beta, virtualRaft, shearSafety, priebeScreening: undefined, axial, screeningOnly: true, warnings }
}
