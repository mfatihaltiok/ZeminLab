export type BearingMethod = 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'

export interface CalculationStep {
  symbol: string
  title: string
  formula: string
  value?: number
  unit?: string
  note?: string
}

export interface CalculationResult<T> {
  value: T
  steps: CalculationStep[]
  method: string
  source: string
}

const rad = (deg: number) => deg * Math.PI / 180
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))

export interface BearingInput {
  B: number; L: number; Df: number; gamma: number; c: number; phi: number; FS: number
  method: BearingMethod; waterReduction?: number
}

export function bearingCapacity(i: BearingInput): CalculationResult<{
  Nq: number; Nc: number; Ngamma: number; sc: number; sq: number; sg: number
  ultimate: number; netUltimate: number; allowableGross: number; allowableNet: number
}> {
  const phi = clamp(i.phi, 0, 89.9)
  const t = Math.tan(rad(phi))
  const Nq = Math.exp(Math.PI * t) * Math.tan(Math.PI / 4 + rad(phi) / 2) ** 2
  const Nc = phi < 1e-8 ? 5.14 : (Nq - 1) / t
  const Ngamma = i.method === 'Terzaghi' ? 2 * (Nq + 1) * t : 2 * (Nq - 1) * t
  const ratio = Math.min(i.B, i.L) / Math.max(i.B, i.L, 1e-9)
  const sc = i.method === 'Terzaghi' ? 1 : 1 + 0.2 * ratio
  const sq = i.method === 'Terzaghi' ? 1 : 1 + 0.1 * ratio
  const sg = i.method === 'Terzaghi' ? 1 : Math.max(0.6, 1 - 0.4 * ratio)
  const ultimate = i.c * Nc * sc + i.gamma * i.Df * Nq * sq + 0.5 * i.gamma * i.B * Ngamma * sg * (i.waterReduction ?? 1)
  const netUltimate = ultimate - i.gamma * i.Df
  const value = {
    Nq, Nc, Ngamma, sc, sq, sg, ultimate, netUltimate,
    allowableGross: ultimate / Math.max(i.FS, 1e-9),
    allowableNet: netUltimate / Math.max(i.FS, 1e-9)
  }
  return {
    value,
    method: i.method,
    source: 'Seçilen literatür taşıma gücü yöntemi; TBDY 2018 Denklem 16.8 için kullanılan düzeltme katsayıları ayrıca raporlanır.',
    steps: [
      { symbol: 'Nq', title: 'Taşıma gücü katsayısı', formula: 'Nq = e^(π tanφ) · tan²(45° + φ/2)', value: Nq },
      { symbol: 'Nc', title: 'Kohezyon katsayısı', formula: 'Nc = (Nq − 1) / tanφ', value: Nc },
      { symbol: 'Nγ', title: 'Birim hacim ağırlık katsayısı', formula: 'Nγ = seçilen yönteme göre', value: Ngamma },
      { symbol: 'qᵤ', title: 'Nihai taşıma gücü', formula: 'qᵤ = cNcsc + γDfNqsq + 0.5γBNγsγ', value: ultimate },
      { symbol: 'qₙ,allow', title: 'İzin verilen net değer', formula: 'qₙ,allow = (qᵤ − γDf) / FS', value: value.allowableNet }
    ]
  }
}

export interface TbdyBearingInput {
  B: number; L: number; Df: number; gamma1: number; gamma2: number; c: number; phi: number
  verticalLoad: number; horizontalLoad: number; momentX: number; momentY: number
  groundSlope: number; baseSlope: number; resistanceFactor: number
}

export function tbdyBearingCapacity(i: TbdyBearingInput): CalculationResult<{
  Nq: number; Nc: number; Ngamma: number; sc: number; sq: number; sg: number
  dc: number; dq: number; dg: number; ic: number; iq: number; ig: number
  gc: number; gq: number; gg: number; bc: number; bq: number; bg: number; surcharge: number
  ex: number; ey: number; Be: number; Le: number
  qk: number; qt: number; qo: number; utilization: number; adequate: boolean
}> {
  const phi = clamp(i.phi, 0, 89.9)
  const t = Math.tan(rad(phi))
  const Nq = Math.exp(Math.PI * t) * Math.tan(Math.PI / 4 + rad(phi) / 2) ** 2
  const Nc = phi < 1e-8 ? 5.14 : (Nq - 1) / t
  const Ngamma = 2 * (Nq - 1) * t
  const P = Math.max(Math.abs(i.verticalLoad), 1e-9)
  const V = Math.abs(i.horizontalLoad)
  const ex = i.momentY / P
  const ey = i.momentX / P
  const Be = Math.max(i.B - 2 * Math.abs(ex), 1e-9)
  const Le = Math.max(i.L - 2 * Math.abs(ey), 1e-9)
  const Bp = Math.min(Be, Le)
  const Lp = Math.max(Be, Le)
  const ratio = Bp / Math.max(Lp, 1e-9)
  const sc = 1 + ratio * (Nq / Math.max(Nc, 1e-9))
  const sq = 1 + ratio * t
  const sg = Math.max(0, 1 - 0.4 * ratio)
  const k = Math.atan2(i.Df, Math.max(i.B, 1e-9))
  const dc = 1 + 0.4 * k
  const dq = 1 + 2 * k * t * (1 - Math.sin(rad(phi))) ** 2
  const dg = 1
  const loadRatio = Math.min(1, V / P)
  const m = (2 + ratio) / (1 + ratio)
  const common = Math.max(0, 1 - loadRatio)
  const ic = phi < 1e-8 ? 1 : Math.max(0, 1 - V / Math.max(i.B * i.L * i.c * Nc, 1e-9))
  const iq = phi < 1e-8 ? 1 : common ** m
  const ig = phi < 1e-8 ? 1 : common ** (m + 1)
  const beta = rad(Math.abs(i.groundSlope))
  const eta = rad(Math.abs(i.baseSlope))
  const gq = Math.max(0, (1 - Math.tan(beta) ** 2) ** 2)
  const gc = Math.max(0, 1 - Math.abs(i.groundSlope) / 147)
  const gg = gc
  const bq = Math.max(0, (1 - Math.tan(eta) * t) ** 2)
  const bc = Math.max(0, 1 - Math.abs(i.baseSlope) / 147)
  const bg = bq
  const surcharge = Math.max(0, i.Df * i.gamma1)
  const qk = i.c * Nc * sc * dc * ic * gc * bc + surcharge * Nq * sq * dq * iq * gq * bq + 0.5 * i.gamma2 * Bp * Ngamma * sg * dg * ig * gg * bg
  const qt = qk / Math.max(i.resistanceFactor, 1e-9)
  const qo = P / Math.max(Be * Le, 1e-9)
  const utilization = qo / Math.max(qt, 1e-9)
  const value = { Nq, Nc, Ngamma, sc, sq, sg, dc, dq, dg, ic, iq, ig, gc, gq, gg, bc, bq, bg, surcharge, ex, ey, Be, Le, qk, qt, qo, utilization, adequate: qo <= qt }
  return {
    value,
    method: 'TBDY 2018 Denklem 16.8 tabanlı yüzeysel temel taşıma gücü',
    source: 'TBDY 2018 Bölüm 16.8.3.2 / Denklem 16.8. Düzeltme katsayıları literatür bağıntıları olarak açıkça raporlanır.',
    steps: [
      { symbol: 'eₓ', title: 'Yük eksantrikliği', formula: 'eₓ = Mᵧ / N', value: ex, unit: 'm' },
      { symbol: 'eᵧ', title: 'Yük eksantrikliği', formula: 'eᵧ = Mₓ / N', value: ey, unit: 'm' },
      { symbol: 'Bₑ,Lₑ', title: 'Etkin temel boyutları', formula: 'Bₑ = B − 2|eₓ| ; Lₑ = L − 2|eᵧ|', value: Math.min(Be, Le), unit: 'm' },
      { symbol: 's', title: 'Şekil katsayıları', formula: 's꜀, sq, sᵧ', value: sc },
      { symbol: 'd', title: 'Derinlik katsayıları', formula: 'd꜀, dq, dᵧ', value: dc },
      { symbol: 'i', title: 'Yük eğikliği katsayıları', formula: 'i꜀, iq, iᵧ', value: ic },
      { symbol: 'g', title: 'Zemin eğimi katsayıları', formula: 'g꜀, gq, gᵧ', value: gc },
      { symbol: 'b', title: 'Temel tabanı eğimi katsayıları', formula: 'b꜀, bq, bᵧ', value: bc },
      { symbol: 'q', title: 'Sürşarj', formula: 'q = Df · γ₁', value: surcharge },
      { symbol: 'qₖ', title: 'Karakteristik taşıma gücü', formula: 'Denklem 16.8 katsayılarıyla', value: qk },
      { symbol: 'qₜ', title: 'Tasarım taşıma gücü', formula: 'qₜ = qₖ / γRv', value: qt },
      { symbol: 'q₀', title: 'Temel tabanındaki tasarım etkisi', formula: 'q₀ = N / (BₑLₑ)', value: qo },
      { symbol: 'η', title: 'Kullanım oranı', formula: 'η = q₀ / qₜ', value: utilization }
    ]
  }
}

export interface SettlementInput {
  B: number; q: number; Es: number; nu: number
  layers?: { thickness: number; Cc?: number; e0?: number; sigma0?: number; dSigma?: number }[]
}

export function settlement(i: SettlementInput): CalculationResult<{ immediate: number; consolidation: number; total: number }> {
  const immediate = i.q * i.B * (1 - i.nu * i.nu) / Math.max(i.Es, 1)
  const consolidation = (i.layers ?? []).reduce((sum, layer) => {
    if (layer.Cc == null || layer.e0 == null || layer.sigma0 == null || layer.dSigma == null || layer.sigma0 <= 0) return sum
    return sum + layer.thickness * layer.Cc / (1 + layer.e0) * Math.log10((layer.sigma0 + layer.dSigma) / layer.sigma0)
  }, 0)
  const value = { immediate, consolidation, total: immediate + consolidation }
  return {
    value,
    method: 'Elastik + konsolidasyon',
    source: 'Eksik konsolidasyon parametreleri mevcut değilse yalnızca hesaplanabilir elastik bileşen gösterilir.',
    steps: [
      { symbol: 'sᵢ', title: 'Elastik oturma', formula: 'sᵢ = q·B·(1−ν²) / Eₛ', value: immediate, unit: 'm' },
      { symbol: 's꜀', title: 'Konsolidasyon oturması', formula: 'Σ H·Cc/(1+e₀)·log₁₀[(σ′₀+Δσ′)/σ′₀]', value: consolidation, unit: 'm' },
      { symbol: 'sₜ', title: 'Toplam oturma', formula: 'sₜ = sᵢ + s꜀', value: value.total, unit: 'm' }
    ]
  }
}

export interface LiquefactionInput {
  Mw: number; Sds: number; depth: number; N160f: number; sigmaV: number; sigmaVPrime: number
}

export function liquefaction(i: LiquefactionInput): CalculationResult<{
  rd: number; CRRM75: number; CM: number; Rtau: number; tau: number; ratio: number; safe: boolean
}> {
  const z = Math.max(i.depth, 0.01)
  const rd = Math.exp(-1.012 - 0.01126 * z + 0.5133 / z)
  const N = clamp(i.N160f, 0.1, 33.9)
  const CRRM75 = 1 / (34 - N) + N / 135 + 50 / (10 * N + 45) ** 2 - 1 / 200
  const CM = 10 ** (2.24 / Math.max(i.Mw, 4) ** 2.56)
  const Rtau = CRRM75 * CM * Math.max(i.sigmaVPrime, 0)
  const tau = 0.65 * (0.4 * i.Sds) * i.sigmaV * rd
  const ratio = Rtau / Math.max(tau, 1e-9)
  const value = { rd, CRRM75, CM, Rtau, tau, ratio, safe: ratio >= 1.1 }
  return {
    value,
    method: 'TBDY 2018 Ek 16B SPT tabanlı sıvılaşma ön değerlendirmesi',
    source: 'TBDY 2018 Ek 16B.3–16B.5: N1,60f, CRRM7.5, CM ve deprem kayma gerilmesi bağıntıları. İnce dane düzeltmesi ve SPT düzeltmeleri merkezi SPT motorundan gelmelidir.',
    steps: [
      { symbol: 'rᵈ', title: 'Gerilme azaltma katsayısı', formula: 'rᵈ = exp(−1.012 − 0.01126z + 0.5133/z)', value: rd },
      { symbol: 'CRR₇.₅', title: 'Çevrimsel dayanım oranı', formula: 'Denklem 16B.4b', value: CRRM75 },
      { symbol: 'Cᴹ', title: 'Deprem büyüklüğü düzeltmesi', formula: 'Cᴹ = 10^(2.24/Mw^2.56)', value: CM },
      { symbol: 'τᴿ', title: 'Sıvılaşma direnci', formula: 'τᴿ = CRR₇.₅·Cᴹ·σ′ᵥ₀', value: Rtau },
      { symbol: 'τdeprem', title: 'Deprem kayma gerilmesi', formula: 'τdeprem = 0.65·(0.4SDS)·σᵥ₀·rᵈ', value: tau },
      { symbol: 'FS', title: 'Sıvılaşma güvenlik oranı', formula: 'FS = τᴿ / τdeprem ≥ 1.1', value: ratio }
    ]
  }
}

export interface FoundationInput {
  B: number; L: number; N: number; V: number; Mx: number; My: number
  delta?: number; cu?: number; area?: number
}

export function foundationChecks(i: FoundationInput) {
  const N = Math.max(Math.abs(i.N), 1e-9)
  const ex = i.My / N
  const ey = i.Mx / N
  const qAvg = i.N / Math.max(i.B * i.L, 1e-9)
  const qMax = qAvg * (1 + 6 * Math.abs(ex) / Math.max(i.L, 1e-9) + 6 * Math.abs(ey) / Math.max(i.B, 1e-9))
  const qMin = qAvg * (1 - 6 * Math.abs(ex) / Math.max(i.L, 1e-9) - 6 * Math.abs(ey) / Math.max(i.B, 1e-9))
  const delta = i.delta ?? 0
  const resistance = Math.max(0, i.N) * Math.tan(delta) + (i.cu ?? 0) * (i.area ?? i.B * i.L)
  const contactRatio = qMin >= 0 ? 1 : Math.max(0, 1 - 6 * Math.abs(ex) / Math.max(i.L, 1e-9)) * Math.max(0, 1 - 6 * Math.abs(ey) / Math.max(i.B, 1e-9))
  return {
    value: { ex, ey, qAvg, qMax, qMin, contactRatio, slidingFS: Math.abs(i.V) > 0 ? resistance / Math.abs(i.V) : Infinity },
    steps: [
      { symbol: 'eₓ', title: 'Eksantriklik', formula: 'eₓ = Mᵧ / N', value: ex, unit: 'm' },
      { symbol: 'eᵧ', title: 'Eksantriklik', formula: 'eᵧ = Mₓ / N', value: ey, unit: 'm' },
      { symbol: 'q̄', title: 'Ortalama taban gerilmesi', formula: 'q̄ = N/(B·L)', value: qAvg },
      { symbol: 'qmax', title: 'Maksimum taban gerilmesi', formula: 'qmax = q̄(1+6eₓ/L+6eᵧ/B)', value: qMax },
      { symbol: 'qmin', title: 'Minimum taban gerilmesi', formula: 'qmin = q̄(1−6eₓ/L−6eᵧ/B)', value: qMin }
    ],
    method: 'Temel gerilme / eksantriklik kontrolü',
    source: 'TBDY 2018 Bölüm 16.7–16.8 temel tasarım kontrolleri.'
  }
}

export function jetGrout(i: {
  columnDiameter: number; spacing: number; qultSoil: number; qultColumn: number
  improvementFactor: number; FS: number; columnStrength: number
}) {
  const Ac = Math.PI * i.columnDiameter ** 2 / 4
  const ratio = Math.min(1, Ac / Math.max(i.spacing ** 2, 1e-9))
  const composite = (1 - ratio) * i.qultSoil + ratio * i.qultColumn * i.improvementFactor
  return {
    value: { Ac, ratio, composite, allowable: composite / Math.max(i.FS, 1e-9), columnLoad: Ac * i.columnStrength / Math.max(i.FS, 1e-9) },
    steps: [
      { symbol: 'A꜀', title: 'Kolon alanı', formula: 'A꜀ = πd²/4', value: Ac, unit: 'm²' },
      { symbol: 'ρ', title: 'İyileştirme oranı', formula: 'ρ = A꜀/s²', value: ratio },
      { symbol: 'qcomp', title: 'Kompozit model', formula: '(1−ρ)qsoil + ρ·qcolumn·η', value: composite },
      { symbol: 'qallow', title: 'İzin verilen değer', formula: 'qallow = qcomp/FS', value: composite / Math.max(i.FS, 1e-9) }
    ],
    method: 'Jet Grout kompozit ön model',
    source: 'TBDY 2018 Bölüm 16 / Ek 16D; proje deneyleri ile doğrulama gerekir.'
  }
}

export function stressAtDepth(depth: number, layers: { top: number; bottom: number; gamma: number; gammaSat: number }[], gwt: number) {
  let sigmaV = 0
  for (const layer of [...layers].sort((a, b) => a.top - b.top)) {
    const z0 = Math.max(layer.top, 0)
    const z1 = Math.min(layer.bottom, depth)
    if (z1 <= z0) continue
    const dryThickness = Math.max(0, Math.min(z1, gwt) - z0)
    const saturatedThickness = Math.max(0, z1 - z0 - dryThickness)
    sigmaV += dryThickness * layer.gamma + saturatedThickness * layer.gammaSat
  }
  const porePressure = Math.max(0, depth - gwt) * 9.80665
  return { sigmaV, sigmaVPrime: Math.max(0.01, sigmaV - porePressure), u: porePressure }
}

export const SOURCE_NOTES = {
  investigation: 'TBDY 2018 Bölüm 16 ve Ek 16A: zemin araştırmaları, SPT/laboratuvar verileri ve raporlama.',
  liquefaction: 'TBDY 2018 Bölüm 16.6 ve Ek 16B: sıvılaşma değerlendirmesi. Yöntem ve varsayımlar hesap izinde ayrıca gösterilir.',
  bearing: 'TBDY 2018 Bölüm 16.8.3.2 ve Denklem 16.8: yüzeysel temel taşıma gücü.',
  settlement: 'TBDY 2018 Bölüm 16: taşıma gücü ve yerdeğiştirme koşulları birlikte değerlendirilir.',
  foundation: 'TBDY 2018 Bölüm 16.7–16.8: temel tasarımı ve taban gerilmesi kontrolleri.',
  jetGrout: 'TBDY 2018 Bölüm 16 / Ek 16D: zemin iyileştirmesi; proje deneyleri ile doğrulama gerekir.'
}
