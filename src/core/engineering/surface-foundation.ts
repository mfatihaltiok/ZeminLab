export type SurfaceFoundationMethod = 'TBDY-2018' | 'Terzaghi' | 'Meyerhof' | 'Hansen' | 'Vesic'

export interface SurfaceFoundationInput {
  B: number
  L: number
  Df: number
  gamma1: number
  gamma2: number
  c: number
  phi: number
  verticalLoad: number
  horizontalLoad?: number
  momentX?: number
  momentY?: number
  groundSlope?: number
  baseSlope?: number
  resistanceFactor?: number
  method?: SurfaceFoundationMethod
  safetyFactor?: number
  undrainedCu?: number
}

export interface SurfaceFoundationResult {
  Nq: number; Nc: number; Ngamma: number
  sc: number; sq: number; sg: number; dc: number; dq: number; dg: number
  ic: number; iq: number; ig: number; gc: number; gq: number; gg: number
  bc: number; bq: number; bg: number
  surcharge: number; ex: number; ey: number; Be: number; Le: number
  effectiveArea: number; qk: number; qt: number; qo: number
  utilization: number; adequate: boolean
  ultimateClassical?: number; allowableClassical?: number; undrainedQk?: number
  warnings: string[]
}

const rad = (deg: number) => deg * Math.PI / 180
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x))

/** ZeminLab units: m, kN, kN/m² (kPa), kN/m³ and kN·m. */
export function calculateSurfaceFoundation(i: SurfaceFoundationInput): SurfaceFoundationResult {
  if (i.B <= 0 || i.L <= 0) throw new Error('Temel B ve L boyutları m cinsinden sıfırdan büyük olmalıdır.')
  if (i.Df < 0) throw new Error('Df negatif olamaz.')
  if (i.gamma1 <= 0 || i.gamma2 <= 0) throw new Error('γ değerleri kN/m³ cinsinden pozitif olmalıdır.')
  if (i.c < 0) throw new Error('Kohezyon c negatif olamaz.')
  if (i.verticalLoad <= 0) throw new Error('Düşey temel yükü N pozitif kN olmalıdır.')

  const phi = clamp(i.phi, 0, 45)
  const t = Math.tan(rad(phi))
  const sinPhi = Math.sin(rad(phi))
  const Nq = phi === 0 ? 1 : Math.exp(Math.PI * t) * Math.tan(Math.PI / 4 + rad(phi) / 2) ** 2
  const Nc = phi === 0 ? 5.14 : (Nq - 1) / t
  const Ngamma = 2 * (Nq + 1) * t

  const N = i.verticalLoad
  const H = Math.abs(i.horizontalLoad ?? 0)
  const ex = (i.momentY ?? 0) / N
  const ey = (i.momentX ?? 0) / N
  const Be = i.B - 2 * Math.abs(ex)
  const Le = i.L - 2 * Math.abs(ey)
  const effectiveArea = Math.max(0, Be) * Math.max(0, Le)
  const warnings: string[] = []

  if (Be <= 0 || Le <= 0) warnings.push('Eksantrisite nedeniyle etkin temel boyutlarından biri sıfır veya negatiftir.')
  if (Math.abs(ex) > i.B / 6 || Math.abs(ey) > i.L / 6) warnings.push('Eksantrisite B/6 veya L/6 sınırını aşıyor; tabanda çekme oluşabilir ve ayrıca gerilme dağılımı kontrolü gerekir.')

  const Bp = Math.min(Math.max(Be, 1e-9), Math.max(Le, 1e-9))
  const Lp = Math.max(Math.max(Be, 1e-9), Math.max(Le, 1e-9))
  const ratio = Bp / Lp
  const method = i.method ?? 'TBDY-2018'

  let sc = 1 + ratio * (Nq / Math.max(Nc, 1e-9))
  let sq = 1 + ratio * t
  let sg = Math.max(0.6, 1 - 0.4 * ratio)
  let dc = 1 + 0.4 * (i.Df / Math.max(Bp, 1e-9))
  let dq = 1 + 2 * (i.Df / Math.max(Bp, 1e-9)) * t * (1 - sinPhi) ** 2
  let dg = 1

  if (method === 'Terzaghi') {
    sc = i.B === i.L ? 1.3 : 1 + 0.2 * ratio
    sq = 1
    sg = i.B === i.L ? 0.8 : 1 - 0.2 * ratio
    dc = dq = dg = 1
  } else if (method === 'Meyerhof') {
    const Kp = Math.tan(Math.PI / 4 + rad(phi) / 2) ** 2
    sc = 1 + 0.2 * Kp * ratio
    sq = phi > 10 ? 1 + 0.1 * Kp * ratio : 1
    sg = sq
    dc = 1 + 0.2 * Math.sqrt(Kp) * i.Df / Math.max(Bp, 1e-9)
    dq = phi > 10 ? 1 + 0.1 * Math.sqrt(Kp) * i.Df / Math.max(Bp, 1e-9) : 1
    dg = dq
  } else if (method === 'Hansen') {
    sc = 1 + (Nq / Math.max(Nc, 1e-9)) * ratio
    sq = 1 + ratio * sinPhi
    sg = Math.max(0.6, 1 - 0.4 * ratio)
    dc = 1 + 0.4 * i.Df / Math.max(Bp, 1e-9)
    dq = 1 + 2 * i.Df / Math.max(Bp, 1e-9) * t * (1 - sinPhi) ** 2
    dg = 1
  }

  const loadRatio = Math.min(0.999999, H / Math.max(N, 1e-9))
  const m = (2 + ratio) / (1 + ratio)
  const common = Math.max(0, 1 - loadRatio)
  const iq = common ** m
  const ig = common ** (m + 1)
  const ic = phi === 0 ? 1 : Math.max(0, 1 - H / Math.max(i.B * i.L * i.c * Nc, 1e-9))

  const beta = Math.abs(rad(i.groundSlope ?? 0))
  const eta = Math.abs(rad(i.baseSlope ?? 0))
  const gq = Math.max(0, (1 - Math.tan(beta)) ** 2)
  const gc = Math.max(0, 1 - Math.abs(i.groundSlope ?? 0) / 147)
  const gg = gc
  const bq = Math.max(0, (1 - Math.tan(eta) * t) ** 2)
  const bc = Math.max(0, 1 - Math.abs(i.baseSlope ?? 0) / 147)
  const bg = bq

  const surcharge = i.Df * i.gamma1
  const qk = i.c * Nc * sc * dc * ic * gc * bc + surcharge * Nq * sq * dq * iq * gq * bq + 0.5 * i.gamma2 * Bp * Ngamma * sg * dg * ig * gg * bg
  const resistanceFactor = i.resistanceFactor ?? 1.4
  const qt = qk / resistanceFactor
  const qo = effectiveArea > 0 ? N / effectiveArea : Number.POSITIVE_INFINITY
  const utilization = qt > 0 ? qo / qt : Number.POSITIVE_INFINITY

  const ultimateClassical = i.c * Nc * sc * dc + surcharge * Nq * sq * dq + 0.5 * i.gamma2 * Bp * Ngamma * sg * dg
  const allowableClassical = i.safetyFactor && i.safetyFactor > 0 ? ultimateClassical / i.safetyFactor : undefined

  let undrainedQk: number | undefined
  if (i.undrainedCu != null && i.undrainedCu >= 0) {
    const scu = 1 + 0.2 * ratio
    const dcu = 1 + 0.2 * i.Df / Math.max(Bp, 1e-9)
    undrainedQk = i.undrainedCu * 5.14 * scu * dcu + surcharge
  }

  if (resistanceFactor !== 1.4 && method === 'TBDY-2018') warnings.push('TBDY yüzeysel temel taşıma gücü için varsayılan γRv = 1.40 kullanılmalıdır.')

  return {
    Nq, Nc, Ngamma, sc, sq, sg, dc, dq, dg, ic, iq, ig, gc, gq, gg, bc, bq, bg,
    surcharge, ex, ey, Be, Le, effectiveArea, qk, qt, qo, utilization,
    adequate: qo <= qt && Be > 0 && Le > 0,
    ultimateClassical, allowableClassical, undrainedQk, warnings
  }
}
