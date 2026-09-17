export type Stage2BearingMethod = 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'

export interface Stage2Step {
  symbol: string
  title: string
  formula: string
  value?: number
  unit?: string
  source?: string
  note?: string
}

export interface Stage2Result<T> {
  value: T
  steps: Stage2Step[]
  method: string
  source: string
  warnings: string[]
}

const rad = (deg: number) => deg * Math.PI / 180
const finitePositive = (v: number, fallback = 0) => Number.isFinite(v) ? Math.max(v, fallback) : fallback

export interface Stage2BearingInput {
  B: number
  L: number
  Df: number
  gamma: number
  c: number
  phi: number
  FS?: number
  method: Stage2BearingMethod
  waterTableDepth?: number
  surcharge?: number
  loadV?: number
  loadH?: number
  momentX?: number
  momentY?: number
}

function factors(phiDeg: number) {
  const phi = Math.max(0, Math.min(phiDeg, 89.0))
  const t = Math.tan(rad(phi))
  const Nq = Math.exp(Math.PI * t) * Math.tan(rad(45 + phi / 2)) ** 2
  const Nc = phi < 1e-8 ? 5.14 : (Nq - 1) / t
  const NgammaVesic = 2 * (Nq + 1) * t
  const NgammaMeyerhof = (Nq - 1) * Math.tan(rad(1.4 * phi))
  return { phi, t, Nq, Nc, NgammaVesic, NgammaMeyerhof }
}

function waterAdjustedGamma(input: Stage2BearingInput) {
  const z = input.waterTableDepth
  if (z == null || !Number.isFinite(z)) return { gamma: input.gamma, reduction: 1, note: 'Yeraltı su seviyesi tanımlı değil.' }
  if (z <= input.Df) return { gamma: input.gamma * 0.5, reduction: 0.5, note: 'Su seviyesi temel tabanı seviyesinde/üstünde; efektif birim hacim ağırlık için γ/2 ön değerlendirmesi.' }
  if (z >= input.Df + input.B) return { gamma: input.gamma, reduction: 1, note: 'Su seviyesi temel tabanından B kadar aşağıda veya daha derinde; taşıma gücü yayılım zonunu etkilemiyor.' }
  const ratio = (z - input.Df) / Math.max(input.B, 1e-9)
  const reduction = 0.5 + 0.5 * ratio
  return { gamma: input.gamma * reduction, reduction, note: 'Su seviyesi temel tabanı ile B derinliği arasında; γ etkisi doğrusal ara değer olarak uygulanmıştır.' }
}

export function stage2BearingCapacity(i: Stage2BearingInput): Stage2Result<{
  Nq: number; Nc: number; Ngamma: number
  sc: number; sq: number; sgamma: number
  dc: number; dq: number; dgamma: number
  ic: number; iq: number; igamma: number
  ultimate: number; netUltimate: number
  allowableGross: number; allowableNet: number
  qSurcharge: number; BEffective: number; LEffective: number
  ex: number; ey: number
}> {
  const B = finitePositive(i.B, 0.01)
  const L = finitePositive(i.L, B)
  const Df = finitePositive(i.Df)
  const c = finitePositive(i.c)
  const { phi, t, Nq, Nc, NgammaVesic, NgammaMeyerhof } = factors(i.phi)
  const method = i.method
  const Ngamma = method === 'Terzaghi' ? 2 * (Nq + 1) * t : method === 'Meyerhof' ? NgammaMeyerhof : NgammaVesic
  const V = Math.max(Math.abs(i.loadV ?? 0), 1e-9)
  const ex = (i.momentY ?? 0) / V
  const ey = (i.momentX ?? 0) / V
  const Be = Math.max(B - 2 * Math.abs(ex), B * 0.01)
  const Le = Math.max(L - 2 * Math.abs(ey), L * 0.01)
  const ratio = Math.min(Be, Le) / Math.max(Be, Le)
  const shape = {
    sc: method === 'Terzaghi' ? 1 : 1 + (Nq / Math.max(Nc, 1e-9)) * ratio,
    sq: method === 'Terzaghi' ? 1 : 1 + Math.tan(rad(phi)) * ratio,
    sgamma: method === 'Terzaghi' ? 1 : Math.max(0.6, 1 - 0.4 * ratio)
  }
  const depthRatio = Df / Math.max(Math.min(Be, Le), 1e-9)
  const depth = {
    dc: method === 'Terzaghi' ? 1 : 1 + 0.4 * depthRatio,
    dq: method === 'Terzaghi' ? 1 : 1 + 2 * depthRatio * t * (1 - Math.sin(rad(phi))) ** 2,
    dgamma: 1
  }
  const H = Math.abs(i.loadH ?? 0)
  const m = (2 + ratio) / (1 + ratio)
  const common = Math.max(0, 1 - H / V)
  const inclination = {
    ic: phi === 0 ? 1 : Math.max(0, 1 - H / Math.max(Be * Le * c * Nc, 1e-9)),
    iq: phi === 0 ? 1 : common ** m,
    igamma: phi === 0 ? 1 : common ** (m + 1)
  }
  const water = waterAdjustedGamma(i)
  const q = finitePositive(i.surcharge, water.gamma * Df)
  const ultimate = c * Nc * shape.sc * depth.dc * inclination.ic + q * Nq * shape.sq * depth.dq * inclination.iq + 0.5 * water.gamma * Math.min(Be, Le) * Ngamma * shape.sgamma * depth.dgamma * inclination.igamma
  const netUltimate = ultimate - q
  const FS = Math.max(finitePositive(i.FS, 3), 1)
  const value = {
    Nq, Nc, Ngamma, ...shape, ...depth, ...inclination,
    ultimate, netUltimate,
    allowableGross: ultimate / FS,
    allowableNet: netUltimate / FS,
    qSurcharge: q, BEffective: Be, LEffective: Le, ex, ey
  }
  const warnings: string[] = []
  if (Math.abs(ex) >= B / 6 || Math.abs(ey) >= L / 6) warnings.push('Eksantriklik çekirdek dışına taşıyor; etkin alan yaklaşımı mühendislik kontrolü gerektirir.')
  if ((i.waterTableDepth ?? Infinity) < 0) warnings.push('Yeraltı su seviyesi derinliği negatif tanımlanmış; veri kontrolü gerekir.')
  return {
    value,
    method,
    source: 'Terzaghi/Meyerhof/Hansen/Vesic taşıma gücü bağıntıları; yöntem seçimine göre katsayılar ayrı izlenir. TBDY 2018 16.8.3.2 için ayrıca kod doğrulaması yapılmalıdır.',
    warnings,
    steps: [
      { symbol: 'Nq', title: 'Taşıma gücü katsayısı', formula: 'Nq = exp(π tanφ) tan²(45°+φ/2)', value: Nq, source: 'Klasik sığ temel taşıma gücü bağıntısı' },
      { symbol: 'Nc', title: 'Kohezyon katsayısı', formula: 'Nc = (Nq−1)/tanφ; φ=0 için 5.14', value: Nc, source: 'Klasik sığ temel taşıma gücü bağıntısı' },
      { symbol: 'Nγ', title: 'Birim hacim ağırlığı katsayısı', formula: 'Yönteme göre Terzaghi/Meyerhof/Vesic bağıntısı', value: Ngamma, source: method },
      { symbol: 'e', title: 'Eksantriklikler', formula: 'eₓ=Mᵧ/V, eᵧ=Mₓ/V', value: Math.max(Math.abs(ex), Math.abs(ey)), unit: 'm' },
      { symbol: 'B′,L′', title: 'Etkin boyutlar', formula: 'B′=B−2|eₓ|, L′=L−2|eᵧ|', value: Math.min(Be, Le), unit: 'm' },
      { symbol: 's', title: 'Şekil katsayıları', formula: 's꜀, sq, sγ', value: shape.sc },
      { symbol: 'd', title: 'Derinlik katsayıları', formula: 'd꜀, dq, dγ', value: depth.dc },
      { symbol: 'i', title: 'Yük eğikliği katsayıları', formula: 'i꜀, iq, iγ', value: inclination.ic },
      { symbol: 'qᵤ', title: 'Nihai taşıma gücü', formula: 'cNcscdcic + qNqsqdqiq + 0.5γBNγsγdγiγ', value: ultimate, unit: 'kPa' },
      { symbol: 'qallow', title: 'İzin verilen brüt taşıma gücü', formula: 'qallow=qᵤ/FS', value: value.allowableGross, unit: 'kPa' }
    ]
  }
}

export interface Stage2SettlementLayer {
  thickness: number
  sigmaV0: number
  deltaSigma: number
  Es?: number
  nu?: number
  Cc?: number
  e0?: number
  Cr?: number
  sigmaPc?: number
  mv?: number
}

export interface Stage2SettlementInput {
  B: number
  q: number
  layers: Stage2SettlementLayer[]
  method?: 'elastic' | '2:1' | 'janbu' | 'schmertmann' | 'consolidation'
}

export function stage2Settlement(i: Stage2SettlementInput): Stage2Result<{
  immediate: number
  consolidation: number
  total: number
  layerResults: Array<{ index: number; deltaSigma: number; settlement: number }>
}> {
  const B = finitePositive(i.B, 0.01)
  const q = finitePositive(i.q)
  const method = i.method ?? 'elastic'
  let immediate = 0
  let consolidation = 0
  const layerResults: Array<{ index: number; deltaSigma: number; settlement: number }> = []
  i.layers.forEach((layer, index) => {
    const H = finitePositive(layer.thickness)
    const sigma0 = Math.max(finitePositive(layer.sigmaV0), 1e-6)
    const ds = Math.max(finitePositive(layer.deltaSigma), 0)
    let s = 0
    if ((method === 'elastic' || method === '2:1') && layer.Es) {
      const nu = Math.min(Math.max(layer.nu ?? 0.3, 0), 0.49)
      const Iz = method === '2:1' ? (B / Math.max(B + Math.sqrt(H * H), B)) ** 2 : 1
      s = ds * H * (1 - nu * nu) / Math.max(layer.Es, 1e-9) * Iz
      immediate += s
    } else if (method === 'janbu' && layer.Es) {
      const M = Math.max(layer.Es, 1e-9)
      s = ds * H / M
      immediate += s
    } else if (method === 'schmertmann' && layer.Es) {
      const Iz = 0.2 + 0.1 * Math.min(2, H / B)
      s = ds * Iz * H / Math.max(layer.Es, 1e-9)
      immediate += s
    } else if (method === 'consolidation' && layer.Cc != null && layer.e0 != null) {
      const pc = Math.max(layer.sigmaPc ?? sigma0, sigma0)
      const final = sigma0 + ds
      if (final <= pc) {
        s = H * (layer.Cr ?? layer.Cc) / (1 + layer.e0) * Math.log10(final / sigma0)
      } else {
        const recompression = H * (layer.Cr ?? layer.Cc) / (1 + layer.e0) * Math.log10(pc / sigma0)
        const virgin = H * layer.Cc / (1 + layer.e0) * Math.log10(final / pc)
        s = recompression + virgin
      }
      consolidation += s
    }
    layerResults.push({ index, deltaSigma: ds, settlement: s })
  })
  const total = immediate + consolidation
  const warnings: string[] = []
  if (!i.layers.length) warnings.push('Katman tanımlanmadığı için oturma hesabı üretilemedi.')
  if (i.layers.some(x => x.sigmaV0 <= 0)) warnings.push('Bazı katmanlarda başlangıç efektif gerilmesi sıfır/negatif; veri kontrolü gerekir.')
  return {
    value: { immediate, consolidation, total, layerResults },
    method,
    source: 'Katman bazlı elastik, 2:1, Janbu, Schmertmann ve konsolidasyon hesapları. Yöntem varsayımları hesap izinde açıkça gösterilir.',
    warnings,
    steps: [
      { symbol: 'Δσ′', title: 'Katman gerilme artışı', formula: 'Katman girdisinden alınır veya 2:1 dağılım ile ayrıca hesaplanır.', value: i.layers.reduce((s, x) => s + Math.max(x.deltaSigma, 0), 0), unit: 'kPa' },
      { symbol: 'sᵢ', title: 'Anlık/primer deformasyon', formula: 'Seçilen yöntemin katman toplamı', value: immediate, unit: 'm' },
      { symbol: 's꜀', title: 'Konsolidasyon oturması', formula: 'Cc/Cr ve efektif gerilme oranlarıyla', value: consolidation, unit: 'm' },
      { symbol: 'sₜ', title: 'Toplam oturma', formula: 'sₜ=sᵢ+s꜀', value: total, unit: 'm' }
    ]
  }
}
