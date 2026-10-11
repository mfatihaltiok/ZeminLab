import { calculateSubgradeReaction as authoritativeSubgradeReaction } from './subgrade-reaction'
/**
 * Advanced geotechnical calculation services migrated from the legacy ZeminLab engine.
 *
 * Jet Grout composite calculations use the published Erol & Çekinmez Bayram
 * (2018) reference as the project calculation basis where applicable.
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
  if (![i.q,i.B,i.L,i.z].every(Number.isFinite) || i.q < 0 || i.B <= 0 || i.L <= 0 || i.z < 0) throw new Error('2:1 gerilme yayılımında q≥0, B/L>0 ve z≥0 sonlu olmalıdır.')
  const B = i.B
  const L = i.L
  const z = i.z
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
  L?: number
  q?: number
  settlement?: number
  method?: 'elastic' | 'q/s'
}
export interface SubgradeReactionResult {
  ks: number
  method: 'elastic' | 'q/s'
  source: string
  formula: string
  unit: string
  assumptions: string[]
}

export function subgradeReaction(i: SubgradeReactionInput): SubgradeReactionResult {
  const r=authoritativeSubgradeReaction({...i,method:i.method??'elastic'})
  return {ks:r.ks,method:r.method==='q/s'?'q/s':'elastic',source:r.source,formula:r.formula,unit:r.unit,assumptions:r.assumptions}
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
  warnings: string[]
}

export function layerSettlement(layers: LayerSettlementInput[]): LayerSettlementResult {
  let immediate = 0
  let consolidation = 0
  const details: LayerSettlementResult['layers'] = []
  const warnings: string[] = []
  for (const [index,l] of layers.entries()) {
    const values=[l.thickness,l.sigma0,l.deltaSigma,l.Es,l.mv,l.Cc,l.e0,l.Cr,l.sigmaPc]
    if(values.some(v=>v!==undefined&&!Number.isFinite(v)))throw new Error('Oturma katmanı '+(index+1)+': parametreler sonlu olmalıdır.')
    if(l.thickness<=0||l.deltaSigma<0||l.Es!=null&&l.Es<=0||l.mv!=null&&l.mv<0||l.Cc!=null&&l.Cc<0||l.e0!=null&&l.e0<0||l.Cr!=null&&l.Cr<0||l.sigmaPc!=null&&l.sigmaPc<=0||l.sigma0!=null&&l.sigma0<=0)throw new Error('Oturma katmanı '+(index+1)+': fiziksel olmayan parametre.')
    if((l.Cc!=null)!==(l.e0!=null))throw new Error('Oturma katmanı '+(index+1)+': Cc ve e0 birlikte girilmelidir.')
    if(l.Cr!=null&&l.Cc==null)throw new Error('Oturma katmanı '+(index+1)+': Cr girildiyse Cc de gereklidir.')
    if(l.Cc!=null&&l.sigma0==null)throw new Error('Oturma katmanı '+(index+1)+': Cc/e0 konsolidasyonu için σ′v0 gereklidir.')
    if(l.sigmaPc!=null&&l.sigma0!=null&&l.sigmaPc<l.sigma0)throw new Error('Oturma katmanı '+(index+1)+': σpc, başlangıç efektif gerilmesinden küçük olamaz.')
    const H = l.thickness
    const ds = l.deltaSigma
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
    } else if (l.Cc != null && l.e0 != null && l.sigma0 > 0 && l.Cc >= 0 && l.e0 >= 0) {
      const sigma1 = l.sigma0 + ds
      const spc = l.sigmaPc ?? l.sigma0
      if(l.sigmaPc==null)warnings.push('Katman '+(index+1)+': σpc girilmedi; normal konsolide davranış varsayıldı.')
      if(spc>l.sigma0&&l.Cr==null)throw new Error('Aşırı konsolide katmanda σpc>σ′v0 olduğunda Cr açıkça girilmelidir; Cc yerine varsayılamaz.')
      const Cr = l.Cr ?? l.Cc
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
    } else {
      warnings.push('Katman '+(index+1)+': pozitif Es veya mv ya da eksiksiz Cc/e0/σ′v0 parametreleri yok; katman oturması hesaplanmadı.')
    }
    details.push({ settlement: Math.max(0, s), type })
  }
  return { immediate, consolidation, total: immediate + consolidation, layers: details, warnings }
}

export interface SchmertmannLayer { thickness: number; Es: number; Iz: number }
export function schmertmannSettlement(q: number, layers: SchmertmannLayer[], C1 = 1, C2 = 1) {
  if(![q,C1,C2].every(Number.isFinite)||q<0||C1<=0||C2<=0)throw new Error('Schmertmann hesabında q≥0 ve C1/C2>0 sonlu olmalıdır.')
  for(const [index,l] of layers.entries())if(![l.thickness,l.Es,l.Iz].every(Number.isFinite)||l.thickness<=0||l.Es<=0||l.Iz<0)throw new Error('Schmertmann katmanı '+(index+1)+': kalınlık/Es pozitif, Iz negatif olmayan sonlu değer olmalıdır.')
  const settlement = C1 * C2 * q * layers.reduce((sum, l) => {
    return sum + l.Iz * l.thickness / l.Es
  }, 0)
  return { settlement, formula: 's = C1·C2·q·Σ(Iz/Es)Δz', method: 'Schmertmann strain-integration framework' }
}

export type JetGroutLayout = 'square' | 'triangular'

export interface JetGroutAdvancedInput {
  columnDiameter: number
  spacing: number
  layout?: JetGroutLayout
  qSoil: number
  qColumn: number
  cSoil?: number
  cColumn?: number
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
  compositeCohesion?: number
  columnLoadShare: number
  soilLoadShare: number
  untreatedCapacity: number
  treatedCapacity: number
  capacityFS?: number
  settlementReductionFactor?: number
  treatedSettlementFactor?: number
  layout: JetGroutLayout
  source: string
  sourceNote: string
}

/**
 * Erol & Çekinmez Bayram (2018) composite-material approach:
 * soil and jet-grout column properties are combined using the replacement
 * area ratio. This is intentionally kept separate from Priebe, which is not
 * silently applied to Jet Grout.
 */
export function jetGroutAdvanced(i: JetGroutAdvancedInput): JetGroutAdvancedResult {
  for(const [name,value] of [['qSoil',i.qSoil],['qColumn',i.qColumn]] as const)if(!Number.isFinite(value)||value<0)throw new Error(name+' sonlu ve negatif olmayan bir değer olmalıdır.')
  for(const [name,value] of [['cSoil',i.cSoil],['cColumn',i.cColumn],['EsSoil',i.EsSoil],['EsColumn',i.EsColumn],['load',i.load],['foundationArea',i.foundationArea],['FS',i.FS]] as const)if(value!==undefined&&!Number.isFinite(value))throw new Error(name+' sonlu olmalıdır.')
  if(i.cSoil!=null&&i.cSoil<0||i.cColumn!=null&&i.cColumn<0||i.EsSoil!=null&&i.EsSoil<=0||i.EsColumn!=null&&i.EsColumn<=0||i.load!=null&&i.load<0||i.foundationArea!=null&&i.foundationArea<=0||i.FS!=null&&i.FS<=0)throw new Error('Jet Grout kompozit parametreleri fiziksel sınırlar dışında.')
  if (!Number.isFinite(i.columnDiameter) || i.columnDiameter <= 0) throw new Error('Jet Grout kolon çapı d > 0 olmalıdır.')
  if (!Number.isFinite(i.spacing) || i.spacing <= 0) throw new Error('Jet Grout aks aralığı s > 0 olmalıdır.')
  if (i.spacing < i.columnDiameter) throw new Error('Aks aralığı kolon çapından küçük olamaz; örtüşen kolon geometrisi bu modelde desteklenmez.')
  const d = i.columnDiameter
  const s = i.spacing
  const layout: JetGroutLayout = i.layout ?? 'square'
  const Ac = Math.PI * d * d / 4
  const cellArea = layout === 'triangular' ? Math.sqrt(3) * s * s / 2 : s * s
  const ar = Ac / cellArea
  if (ar >= 1) throw new Error('Jet Grout alan değiştirme oranı 1.0 veya üzeri olamaz.')
  const qSoil = i.qSoil
  const qColumn = i.qColumn
  const compositeCapacity = ar * qColumn + (1 - ar) * qSoil
  const compositeModulus = i.EsSoil != null && i.EsColumn != null && i.EsSoil > 0 && i.EsColumn > 0
    ? ar * i.EsColumn + (1 - ar) * i.EsSoil
    : undefined
  const compositeCohesion = i.cSoil != null && i.cColumn != null
    ? ar * i.cColumn + (1 - ar) * i.cSoil
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
    compositeCohesion,
    columnLoadShare,
    soilLoadShare,
    untreatedCapacity: qSoil,
    treatedCapacity: compositeCapacity,
    capacityFS,
    settlementReductionFactor: n,
    treatedSettlementFactor,
    layout,
    source: 'Erol & Çekinmez Bayram (2018), Jet Enjeksiyon Yöntemi, Yüksel Proje, Ankara',
    sourceNote: 'Kompozit parametreler alan oranı üzerinden değerlendirilir. Kolon kapasitesi ve nihai tasarım, imalat doğrulaması/zemin tabakası bazlı kontroller ile ayrıca ele alınmalıdır.'
  }
}
