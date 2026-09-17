import { calculateSpt, type SptEngineInput, type SptTraceStep } from './spt/spt-engine'

export interface LiquefactionSoilLayer {
  top: number
  bottom: number
  gamma: number
  gammaSat: number
  soil?: string
}

export interface LiquefactionSptRecord {
  depth: number
  nField: number
  fineContent?: number
  energyRatio?: number
  boreholeDiameterMm?: number
  sampler?: SptEngineInput['sampler']
  rodLengthM?: number
}

export interface LiquefactionProfileInput {
  Mw: number
  Sds: number
  gwt: number
  layers: LiquefactionSoilLayer[]
  spt: LiquefactionSptRecord[]
  gammaW?: number
  applyDilatancy?: boolean
}

export interface LiquefactionProfileRow {
  depth: number
  soil?: string
  fineContent?: number
  sigmaV: number
  porePressure: number
  sigmaVPrime: number
  ce: number
  cb: number
  cs: number
  cr: number
  cn: number
  n60: number
  n1_60: number
  alpha: number
  beta: number
  n1_60f: number
  crrM75?: number
  CM?: number
  tauResistance?: number
  rd: number
  tauEarthquake?: number
  FS?: number
  liquefactionCheck: 'evaluate' | 'not-evaluable'
  trace: SptTraceStep[]
}

export interface LiquefactionProfileResult {
  rows: LiquefactionProfileRow[]
  method: string
  source: string
  warnings: string[]
}

function stressAtDepth(depth: number, layers: LiquefactionSoilLayer[], gwt: number, gammaW: number) {
  let sigmaV = 0
  for (const layer of [...layers].sort((a, b) => a.top - b.top)) {
    const z0 = Math.max(0, layer.top)
    const z1 = Math.min(depth, layer.bottom)
    if (z1 <= z0) continue
    const dry = Math.max(0, Math.min(z1, gwt) - z0)
    const sat = Math.max(0, z1 - z0 - dry)
    sigmaV += dry * layer.gamma + sat * layer.gammaSat
  }
  const u = Math.max(0, depth - gwt) * gammaW
  return { sigmaV, u, sigmaVPrime: Math.max(0.01, sigmaV - u) }
}

function finesCorrection(fines: number) {
  if (fines <= 5) return { alpha: 0, beta: 1 }
  if (fines < 35) return {
    alpha: Math.exp(1.76 - 190 / (fines * fines)),
    beta: 0.99 + Math.pow(fines, 1.5) / 1000
  }
  return { alpha: 5, beta: 1.2 }
}

function rdAtDepth(z: number) {
  const depth = Math.max(z, 0.01)
  return Math.exp(-1.012 - 0.01126 * depth + 0.5133 / depth)
}

function magnitudeCorrection(Mw: number) {
  return Math.pow(10, 2.24 / Math.pow(Math.max(Mw, 4), 2.56))
}

/**
 * TBDY 2018 Ek 16B SPT-based liquefaction profile calculation.
 * This service intentionally returns every depth row and calculation trace.
 */
export function liquefactionProfile(input: LiquefactionProfileInput): LiquefactionProfileResult {
  if (!Number.isFinite(input.Mw) || input.Mw <= 0) throw new Error('Mw geçerli olmalıdır.')
  if (!Number.isFinite(input.Sds) || input.Sds < 0) throw new Error('SDS geçerli olmalıdır.')
  const gammaW = input.gammaW ?? 9.81
  const CM = magnitudeCorrection(input.Mw)
  const warnings: string[] = []

  const rows = [...input.spt]
    .sort((a, b) => a.depth - b.depth)
    .map((record): LiquefactionProfileRow => {
      const stress = stressAtDepth(record.depth, input.layers, input.gwt, gammaW)
      const spt = calculateSpt({
        nField: record.nField,
        energyRatio: record.energyRatio,
        boreholeDiameterMm: record.boreholeDiameterMm,
        sampler: record.sampler,
        rodLengthM: record.rodLengthM,
        effectiveStress: stress.sigmaVPrime,
        fineContent: record.fineContent,
        applyOverburden: true,
        applyDilatancy: input.applyDilatancy ?? false
      })

      const fines = Math.max(0, record.fineContent ?? 0)
      const { alpha, beta } = finesCorrection(fines)
      const n1_60f = alpha + beta * spt.n1_60
      const rd = rdAtDepth(record.depth)
      const trace: SptTraceStep[] = [...spt.trace,
        { symbol: 'α', title: 'İnce dane katsayısı', formula: 'Denk. 16B.3b', value: alpha, note: `IDI = ${fines.toFixed(2)} %` },
        { symbol: 'β', title: 'İnce dane katsayısı', formula: 'Denk. 16B.3b', value: beta },
        { symbol: '(N₁)₆₀f', title: 'İnce dane düzeltilmiş SPT', formula: '(N₁)₆₀f = α + β(N₁)₆₀', value: n1_60f }
      ]

      if (n1_60f >= 34) {
        return {
          depth: record.depth, soil: input.layers.find(l => record.depth >= l.top && record.depth <= l.bottom)?.soil,
          fineContent: record.fineContent, ...stress, ce: spt.ce, cb: spt.cb, cs: spt.cs, cr: spt.cr, cn: spt.cn,
          n60: spt.n60, n1_60: spt.n1_60, alpha, beta, n1_60f, rd, liquefactionCheck: 'not-evaluable', trace
        }
      }

      const crrM75 = 1 / (34 - n1_60f) + n1_60f / 135 + 50 / Math.pow(10 * n1_60f + 45, 2) - 1 / 200
      const tauResistance = crrM75 * CM * stress.sigmaVPrime
      const tauEarthquake = 0.65 * (0.4 * input.Sds) * stress.sigmaV * rd
      const FS = tauResistance / Math.max(tauEarthquake, 1e-9)
      trace.push(
        { symbol: 'CRR₇.₅', title: 'Çevrimsel dayanım oranı', formula: 'Denk. 16B.4b', value: crrM75 },
        { symbol: 'Cᴹ', title: 'Deprem büyüklüğü düzeltmesi', formula: 'Denk. 16B.4c', value: CM },
        { symbol: 'τᴿ', title: 'Sıvılaşma direnci', formula: 'τᴿ = CRR₇.₅·Cᴹ·σ′ᵥ₀', value: tauResistance, unit: 'kPa' },
        { symbol: 'rᵈ', title: 'Gerilme azaltma katsayısı', formula: 'rᵈ = exp(−1.012−0.01126z+0.5133/z)', value: rd },
        { symbol: 'τdeprem', title: 'Deprem kayma gerilmesi', formula: 'τdeprem = 0.65·(0.4SDS)·σᵥ₀·rᵈ', value: tauEarthquake, unit: 'kPa' },
        { symbol: 'FS', title: 'Sıvılaşmaya karşı güvenlik', formula: 'FS = τᴿ/τdeprem', value: FS, note: 'TBDY 2018 Denk. 16.3 güvenlik koşulu: FS ≥ 1.10.' }
      )

      return {
        depth: record.depth, soil: input.layers.find(l => record.depth >= l.top && record.depth <= l.bottom)?.soil,
        fineContent: record.fineContent, ...stress, ce: spt.ce, cb: spt.cb, cs: spt.cs, cr: spt.cr, cn: spt.cn,
        n60: spt.n60, n1_60: spt.n1_60, alpha, beta, n1_60f, crrM75, CM, tauResistance, rd, tauEarthquake, FS,
        liquefactionCheck: 'evaluate', trace
      }
    })

  if (!input.spt.length) warnings.push('SPT kaydı bulunmadığı için profil hesabı üretilemedi.')
  if (input.spt.some(x => x.fineContent == null)) warnings.push('Bazı SPT noktalarında ince dane içeriği yok; IDI = 0 kabul edilmiştir. Laboratuvar verisi geldiğinde satırlar yeniden hesaplanmalıdır.')
  return {
    rows,
    method: 'TBDY 2018 Ek 16B SPT tabanlı sıvılaşma değerlendirmesi',
    source: 'TBDY 2018 Ek 16B.2–16B.4; Denk. 16B.1, 16B.2, 16B.3a-b, 16B.4a-c ve Bölüm 16.6.',
    warnings
  }
}
