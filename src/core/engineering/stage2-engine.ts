import { EROL_SOURCE_KEYS } from '../provenance/erol-sources'

export type Stage2BearingMethod = 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'
export type Stage2BearingDesign = 'classical-allowable' | 'tbdy-2018'
export type Stage2SettlementMethod = 'elastic' | '2:1' | 'janbu' | 'schmertmann' | 'consolidation'

export interface Stage2Step { symbol: string; title: string; formula: string; value?: number; unit?: string; source?: string; note?: string }
export interface Stage2Result<T> { value: T; steps: Stage2Step[]; method: string; source: string; warnings: string[] }

const rad = (deg: number) => deg * Math.PI / 180
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const positive = (v: number | undefined, fallback = 0) => Number.isFinite(v) ? Math.max(v as number, 0) : fallback

export interface BearingLayer { thickness: number; c: number; phi: number; gamma: number }
export interface Stage2BearingInput {
  B: number; L: number; Df: number; gamma: number; c: number; phi: number
  FS?: number
  method: Stage2BearingMethod
  design?: Stage2BearingDesign
  waterTableDepth?: number
  surcharge?: number
  loadV?: number
  loadH?: number
  momentX?: number
  momentY?: number
  soilSlope?: number
  baseSlope?: number
  layers?: BearingLayer[]
}

function factors(phiDeg: number) {
  const phi = clamp(phiDeg, 0, 89.9)
  const t = Math.tan(rad(phi))
  const Nq = Math.exp(Math.PI * t) * Math.pow(Math.tan(rad(45 + phi / 2)), 2)
  const Nc = phi === 0 ? 5.14 : (Nq - 1) / t
  const NgammaV = 2 * (Nq + 1) * t
  const NgammaM = (Nq - 1) * Math.tan(rad(1.4 * phi))
  return { phi, t, Nq, Nc, NgammaV, NgammaM }
}

function waterTableGamma(i: Stage2BearingInput, B: number) {
  const gw = i.waterTableDepth
  if (gw == null || !Number.isFinite(gw)) return { gamma: i.gamma, note: 'Yeraltı su seviyesi girilmedi.' }
  const z = gw - i.Df
  if (z <= 0) return { gamma: Math.max(1e-6, i.gamma - 9.81), note: 'Su seviyesi temel tabanı üzerinde/aynı seviyede: γ′ kullanıldı.' }
  if (z >= B) return { gamma: i.gamma, note: 'Su seviyesi temel tabanından B kadar veya daha derinde: q altındaki γ değişmedi.' }
  const gammaSub = Math.max(1e-6, i.gamma - 9.81)
  const ratio = z / B
  return { gamma: ratio * i.gamma + (1 - ratio) * gammaSub, note: 'Su seviyesi temel tabanı ile B arasında: γ etkin aralık için ağırlıklandırıldı.' }
}

function methodFactors(method: Stage2BearingMethod, B: number, L: number, phi: number, Df: number) {
  const ratio = clamp(B / Math.max(L, 1e-9), 0, 1)
  const t = Math.tan(rad(phi))
  const depth = Df / Math.max(B, 1e-9)
  if (method === 'Terzaghi') return { sc: 1, sq: 1, sgamma: 1, dc: 1, dq: 1, dgamma: 1, source: 'Terzaghi klasik bağıntıları' }
  if (method === 'Meyerhof') return {
    sc: 1 + 0.2 * ratio, sq: 1 + 0.1 * ratio, sgamma: 1 - 0.4 * ratio,
    dc: 1 + 0.2 * depth, dq: 1 + 0.1 * depth, dgamma: 1,
    source: 'Meyerhof sığ temel düzeltme bağıntıları'
  }
  if (method === 'Hansen') return {
    sc: 1 + (B / Math.max(L, 1e-9)) * (Math.sin(rad(phi)) / Math.max(Math.cos(rad(phi)), 1e-9)),
    sq: 1 + ratio * t,
    sgamma: 1 - 0.4 * ratio,
    dc: 1 + 0.4 * depth,
    dq: 1 + 2 * depth * t * Math.pow(1 - Math.sin(rad(phi)), 2),
    dgamma: 1,
    source: 'Hansen genel taşıma gücü düzeltme bağıntıları'
  }
  return {
    sc: 1 + ratio * t,
    sq: 1 + ratio * t,
    sgamma: 1 - 0.4 * ratio,
    dc: 1 + 0.4 * depth,
    dq: 1 + 2 * depth * t * Math.pow(1 - Math.sin(rad(phi)), 2),
    dgamma: 1,
    source: 'Vesic genel taşıma gücü düzeltme bağıntıları'
  }
}

export function stage2BearingCapacity(i: Stage2BearingInput): Stage2Result<any> {
  const B = Math.max(i.B, 0.01), L = Math.max(i.L, B), Df = Math.max(i.Df, 0)
  const c = Math.max(i.c, 0), phi = factors(i.phi), V = Math.max(Math.abs(i.loadV ?? 0), 1e-9)
  const ex = (i.momentY ?? 0) / V, ey = (i.momentX ?? 0) / V
  const Be = Math.max(B - 2 * Math.abs(ex), B * 0.01), Le = Math.max(L - 2 * Math.abs(ey), L * 0.01)
  const effectiveB = Math.min(Be, Le), effectiveL = Math.max(Be, Le)
  const mf = methodFactors(i.method, effectiveB, effectiveL, phi.phi, Df)
  const wg = waterTableGamma(i, effectiveB)
  const q = i.surcharge != null ? Math.max(0, i.surcharge) : wg.gamma * Df
  const Ngamma = i.method === 'Meyerhof' ? phi.NgammaM : phi.NgammaV
  const H = Math.abs(i.loadH ?? 0)
  const loadRatio = clamp(H / V, 0, 0.999999)
  const m = (2 + effectiveB / effectiveL) / (1 + effectiveB / effectiveL)
  const ic = Math.pow(1 - loadRatio, m)
  const iq = Math.pow(1 - loadRatio, m)
  const igamma = Math.pow(1 - loadRatio, m + 1)
  const slopeC = clamp(Math.abs(i.soilSlope ?? 0), 0, 45)
  const slopeQ = Math.pow(Math.max(0, 1 - Math.tan(rad(slopeC)) / Math.max(Math.tan(rad(45 + phi.phi / 2)), 1e-9)), 2)
  const slopeGamma = slopeQ
  const baseSlope = clamp(Math.abs(i.baseSlope ?? 0), 0, 45)
  const bq = Math.max(0, 1 - Math.tan(rad(baseSlope)) * phi.t)
  const bgamma = bq
  const bc = bq
  const characteristic = c * phi.Nc * mf.sc * mf.dc * ic * bc
    + q * phi.Nq * mf.sq * mf.dq * iq * slopeQ
    + 0.5 * wg.gamma * effectiveB * Ngamma * mf.sgamma * mf.dgamma * igamma * slopeGamma * bgamma
  const resistanceFactor = i.design === 'tbdy-2018' ? 1.4 : undefined
  const designResistance = resistanceFactor ? characteristic / resistanceFactor : undefined
  const FS = Math.max(i.FS ?? 3, 0.1)
  const allowable = characteristic / FS
  const qApplied = V / Math.max(Be * Le, 1e-9) + 6 * Math.abs(i.momentX ?? 0) / Math.max(Be * Le * Le, 1e-9) + 6 * Math.abs(i.momentY ?? 0) / Math.max(Le * Be * Be, 1e-9)
  const warnings: string[] = []
  if (Math.abs(ex) > B / 6 || Math.abs(ey) > L / 6) warnings.push('Eksantriklik çekirdek dışına taşıyor; etkin alan yöntemiyle birlikte temas basıncı ayrıca kontrol edilmelidir.')
  if (i.design === 'tbdy-2018') warnings.push('TBDY yolu izin verilen gerilme yöntemi değildir: 16.8.2 gereği Rγ=1.4 ile karakteristik taşıma gücünden tasarım dayanımı üretilir.')
  if (i.layers?.length) warnings.push('Tabakalı zemin tanımlandı. 16.8.3.3 için etkili derinlik içindeki tabakalar ayrı katman hesabına dönüştürülmelidir; tek eşdeğer parametre sonucu nihai tasarım yerine geçmez.')
  return {
    value: {
      Nq: phi.Nq, Nc: phi.Nc, Ngamma, sc: mf.sc, sq: mf.sq, sgamma: mf.sgamma,
      dc: mf.dc, dq: mf.dq, dgamma: mf.dgamma, ic, iq, igamma,
      characteristic, designResistance, allowableGross: allowable, qApplied,
      BEffective: Be, LEffective: Le, ex, ey, qSurcharge: q, resistanceFactor
    },
    method: i.design === 'tbdy-2018' ? `${i.method} / TBDY 2018` : i.method,
    source: i.design === 'tbdy-2018'
      ? 'TBDY 2018 Bölüm 16, Denk.(16.4)-(16.8), Tablo 16.2; klasik katsayı bağıntıları literatürden. Erol & Çekinmez (2014) saha deneyi korelasyonları gerektiğinde ikincil kaynak olarak kullanılmalıdır.'
      : `${mf.source}; Erol & Çekinmez (2014) saha deneyleri ve parametre seçimi için ikincil kaynak.`,
    warnings,
    steps: [
      { symbol: 'Nq', title: 'Taşıma gücü katsayısı', formula: 'Nq = exp(π tanφ′) · tan²(45°+φ′/2)', value: phi.Nq, source: 'TBDY 2018 16.8.3.2 / Denk.(16.8b)' },
      { symbol: 'Nc', title: 'Kohezyon katsayısı', formula: 'Nc = (Nq−1)cotφ′', value: phi.Nc, source: 'TBDY 2018 16.8.3.2 / Denk.(16.8b)' },
      { symbol: 'Nγ', title: 'Birim hacim ağırlığı katsayısı', formula: i.method === 'Meyerhof' ? 'Meyerhof Nγ bağıntısı' : 'Seçilen yöntemin Nγ bağıntısı', value: Ngamma, source: mf.source },
      { symbol: 'e', title: 'Eksantriklikler', formula: 'ex=M_y/V, ey=M_x/V', value: Math.max(Math.abs(ex), Math.abs(ey)), unit: 'm' },
      { symbol: 'B′,L′', title: 'Etkin boyutlar', formula: 'B′=B−2|ex|, L′=L−2|ey|', value: Math.min(Be, Le), unit: 'm' },
      { symbol: 'qk', title: 'Karakteristik taşıma gücü', formula: 'cNcscdcic + qNqsqdqiq + 0.5γ′B′Nγsγdγiγ', value: characteristic, unit: 'kPa', source: 'TBDY 2018 16.8.3.2 / Denk.(16.8a)' },
      ...(resistanceFactor ? [{ symbol: 'qt', title: 'TBDY tasarım taşıma gücü', formula: 'qt = qk / Rγ, Rγ=1.4', value: designResistance, unit: 'kPa', source: 'TBDY 2018 16.7.4, 16.8.2, Denk.(16.7)' }] : [{ symbol: 'qallow', title: 'İzin verilen brüt taşıma gücü', formula: 'qallow=qk/FS', value: allowable, unit: 'kPa', note: 'Klasik allowable-stress değerlendirmesi; TBDY tasarım yolu değildir.' }])
    ]
  }
}

export interface Stage2SettlementLayer {
  thickness: number
  sigmaV0: number
  deltaSigma: number
  Es?: number
  nu?: number
  M?: number
  mv?: number
  Cc?: number
  e0?: number
  Cr?: number
  sigmaPc?: number
  Iz?: number
}
export interface Stage2SettlementInput {
  B: number
  L?: number
  q: number
  qNet?: number
  layers: Stage2SettlementLayer[]
  method?: Stage2SettlementMethod
  schmertmannC1?: number
  schmertmannC2?: number
  timeYears?: number
}

function stress21(q: number, B: number, L: number, z: number) {
  return Math.max(0, q) * B * L / Math.max((B + z) * (L + z), 1e-9)
}
function schmertmannIz(z: number, B: number) {
  if (z < 0 || z > 2 * B) return 0
  if (z <= 0.5 * B) return z / Math.max(0.5 * B, 1e-9)
  return Math.max(0, (2 * B - z) / (1.5 * B))
}

export function stage2Settlement(i: Stage2SettlementInput): Stage2Result<any> {
  const B = Math.max(i.B, 0.01), L = Math.max(i.L ?? i.B, 0.01), q = Math.max(i.q, 0)
  const method = i.method ?? 'elastic'
  const C1 = i.schmertmannC1 ?? clamp(1 - 0.5 * (i.qNet ?? q) / Math.max(i.layers[0]?.sigmaV0 ?? 1, 1e-6), 0.5, 1)
  const C2 = i.schmertmannC2 ?? (i.timeYears != null ? 1 + 0.2 * Math.log10(Math.max(i.timeYears, 0.1) / 0.1) : 1)
  let immediate = 0, consolidation = 0, depth = 0
  const layerResults: any[] = []
  for (const [index, layer] of i.layers.entries()) {
    const H = Math.max(0, layer.thickness)
    const top = depth, bottom = depth + H, zmid = (top + bottom) / 2
    const ds = method === '2:1' ? stress21(q, B, L, zmid) : Math.max(0, layer.deltaSigma)
    let s = 0, type = 'none'
    if (H > 0 && ds > 0) {
      if (method === 'elastic') {
        const nu = clamp(layer.nu ?? 0.30, 0, 0.49)
        s = ds * H * (1 - nu * nu) / Math.max(layer.Es ?? 0, 1e-9)
        immediate += s; type = 'elastic'
      } else if (method === '2:1') {
        const nu = clamp(layer.nu ?? 0.30, 0, 0.49)
        s = ds * H * (1 - nu * nu) / Math.max(layer.Es ?? 0, 1e-9)
        immediate += s; type = '2:1 + elastic'
      } else if (method === 'janbu') {
        const M = Math.max(layer.M ?? layer.Es ?? 0, 1e-9)
        s = ds * H / M
        immediate += s; type = 'Janbu M integration'
      } else if (method === 'schmertmann') {
        const Iz = layer.Iz ?? schmertmannIz(zmid, B)
        s = C1 * C2 * q * Math.max(0, Iz) * H / Math.max(layer.Es ?? 0, 1e-9)
        immediate += s; type = 'Schmertmann'
      } else if (method === 'consolidation') {
        const sigma0 = Math.max(layer.sigmaV0, 1e-6), sigma1 = sigma0 + ds
        if (layer.mv != null && layer.mv >= 0) {
          s = H * layer.mv * ds
        } else if (layer.Cc != null && layer.e0 != null && layer.e0 > -1) {
          const pc = Math.max(layer.sigmaPc ?? sigma0, sigma0)
          const Cr = Math.max(0, layer.Cr ?? layer.Cc)
          if (sigma1 <= pc) s = H * Cr / (1 + layer.e0) * Math.log10(sigma1 / sigma0)
          else s = H * Cr / (1 + layer.e0) * Math.log10(pc / sigma0) + H * layer.Cc / (1 + layer.e0) * Math.log10(sigma1 / pc)
        }
        consolidation += Math.max(0, s); type = 'oedometer'
      }
    }
    layerResults.push({ index, top, bottom, zmid, deltaSigma: ds, Iz: method === 'schmertmann' ? layer.Iz ?? schmertmannIz(zmid, B) : undefined, settlement: Math.max(0, s), type })
    depth = bottom
  }
  const warnings: string[] = []
  if (!i.layers.length) warnings.push('Katman tanımlanmadı.')
  if (method === 'elastic' || method === '2:1') warnings.push('Elastik modül yaklaşımı için Es değerlerinin saha/laboratuvar korelasyonlarıyla doğrulanması gerekir. Erol & Çekinmez (2014) parametre seçimi kaynağı olarak rapora eklenebilir.')
  if (method === 'janbu' && i.layers.some(x => x.M == null && x.Es == null)) warnings.push('Janbu hesabında M veya Es verilmemiş katmanlar sıfır katkı verir.')
  if (method === 'schmertmann') warnings.push('Schmertmann yöntemi tabaka bazında Iz integrasyonu ile uygulanır; şekilsel Iz dağılımı, temel geometrisi ve zaman düzeltmesi rapor izinde gösterilir.')
  return {
    value: { immediate, consolidation, total: immediate + consolidation, layerResults, C1, C2 },
    method,
    source: `${method} settlement framework; Erol & Çekinmez (2014) field-test correlations are registered as secondary parameter-selection provenance (${EROL_SOURCE_KEYS.fieldTests}).`,
    warnings,
    steps: [
      { symbol: 'Δσ', title: 'Katman gerilme artışı', formula: method === '2:1' ? 'Δσ=qBL/[(B+z)(L+z)]' : 'Katman verisi / Schmertmann etkilenim katsayısı', unit: 'kPa' },
      { symbol: 'sᵢ', title: 'Anlık oturma', formula: 'Katman integrasyonu', value: immediate, unit: 'm' },
      { symbol: 's꜀', title: 'Konsolidasyon oturması', formula: 'mv·Δσ·H veya Cc/Cr logaritmik bağıntısı', value: consolidation, unit: 'm' },
      { symbol: 'sₜ', title: 'Toplam oturma', formula: 'sₜ=sᵢ+s꜀', value: immediate + consolidation, unit: 'm' }
    ]
  }
}
