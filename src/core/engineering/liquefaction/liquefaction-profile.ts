import { calculateSpt, type SptEngineInput } from '../spt/spt-engine'
import { stressAtDepth, type SoilLayerStressInput } from '../stress/stress-profile'

export interface LiquefactionSptRecord extends SptEngineInput {
  depth: number
  fines?: number
  id?: string
}

export interface LiquefactionProfileInput {
  Mw: number
  Sds: number
  groundwaterDepth: number
  layers: SoilLayerStressInput[]
  spt: LiquefactionSptRecord[]
}

export interface LiquefactionProfileRow {
  id?: string
  depth: number
  sigmaV: number
  sigmaVPrime: number
  u: number
  nField: number
  ce: number
  cb: number
  cs: number
  cr: number
  cn: number
  n60: number
  n1_60: number
  fines: number
  alpha: number
  beta: number
  n1_60f: number
  rd: number
  crrM75: number
  cm: number
  tauResistance: number
  tauEarthquake: number
  fs: number
  liquefiable: boolean
  note?: string
}

export interface LiquefactionProfileResult {
  rows: LiquefactionProfileRow[]
  source: string
  method: string
}

function finesCorrection(n1_60: number, fines = 0) {
  const fc = Math.max(0, fines)
  if (fc <= 5) return { alpha: 0, beta: 1, n1_60f: n1_60 }
  if (fc < 35) {
    const alpha = Math.exp(1.76 - (190 / (fc * fc)))
    const beta = 0.99 + Math.pow(fc, 1.5) / 1000
    return { alpha, beta, n1_60f: alpha + beta * n1_60 }
  }
  return { alpha: 5, beta: 1.2, n1_60f: 5 + 1.2 * n1_60 }
}

function rd(z: number) {
  const depth = Math.max(z, 0.01)
  return Math.exp(-1.012 - 0.01126 * depth + 0.5133 / depth)
}

function crrM75(n1_60f: number) {
  const n = Math.min(30, Math.max(0.1, n1_60f))
  return 1 / (34 - n) + n / 135 + 50 / Math.pow(10 * n + 45, 2) - 1 / 200
}

function magnitudeCorrection(mw: number) {
  return Math.pow(10, 2.24 / Math.pow(Math.max(mw, 4), 2.56))
}

/**
 * TBDY 2018 Ek 16B SPT profile calculation.
 * Stress state is evaluated at each SPT depth and all correction factors remain visible.
 */
export function liquefactionProfile(i: LiquefactionProfileInput): LiquefactionProfileResult {
  if (!Number.isFinite(i.Mw) || i.Mw <= 0) throw new Error('Mw geçerli olmalıdır.')
  if (!Number.isFinite(i.Sds) || i.Sds < 0) throw new Error('SDS geçerli olmalıdır.')

  const rows = [...i.spt]
    .filter(x => Number.isFinite(x.depth) && x.depth > 0 && Number.isFinite(x.nField) && x.nField >= 0)
    .sort((a, b) => a.depth - b.depth)
    .map(x => {
      const stress = stressAtDepth(x.depth, i.layers, i.groundwaterDepth)
      const spt = calculateSpt({ ...x, effectiveStress: stress.sigmaVPrime, fineContent: x.fines, applyOverburden: true, applyDilatancy: false })
      const correction = finesCorrection(spt.n1_60, x.fines)
      const r = rd(x.depth)
      const crr = crrM75(correction.n1_60f)
      const cm = magnitudeCorrection(i.Mw)
      const tauResistance = crr * cm * stress.sigmaVPrime
      const tauEarthquake = 0.65 * (0.4 * i.Sds) * stress.sigmaV * r
      const fs = tauResistance / Math.max(tauEarthquake, 1e-9)
      return {
        id: x.id,
        depth: x.depth,
        sigmaV: stress.sigmaV,
        sigmaVPrime: stress.sigmaVPrime,
        u: stress.u,
        nField: x.nField,
        ce: spt.ce,
        cb: spt.cb,
        cs: spt.cs,
        cr: spt.cr,
        cn: spt.cn,
        n60: spt.n60,
        n1_60: spt.n1_60,
        fines: x.fines ?? 0,
        alpha: correction.alpha,
        beta: correction.beta,
        n1_60f: correction.n1_60f,
        rd: r,
        crrM75: crr,
        cm,
        tauResistance,
        tauEarthquake,
        fs,
        liquefiable: fs < 1.1,
        note: (x.fines ?? 0) >= 35 ? 'IDI ≥ %35: TBDY Ek 16B ince dane düzeltmesi uygulandı.' : undefined
      }
    })

  return {
    rows,
    method: 'TBDY 2018 Ek 16B · SPT tabanlı basitleştirilmiş sıvılaşma değerlendirmesi',
    source: 'TBDY 2018 Ek 16B.2–16B.4; güvenlik koşulu Denk. 16.3: τR / τdeprem ≥ 1.10. Sıvılaşma sonrası dayanım, rijitlik ve yerdeğiştirmeler ayrıca değerlendirilmelidir.'
  }
}
