export type SeismicSpectrumInput = {
  ss: number
  s1: number
  fs: number
  f1: number
}

export type SeismicSpectrumPoint = {
  period: number
  acceleration: number
}

const positive = (value: number) => Number.isFinite(value) && value > 0 ? value : 0

export function designSpectrum(input: SeismicSpectrumInput) {
  const ss = positive(input.ss)
  const s1 = positive(input.s1)
  const fs = positive(input.fs)
  const f1 = positive(input.f1)
  const sds = ss * fs
  const sd1 = s1 * f1
  const ta = sds > 0 ? 0.2 * sd1 / sds : 0
  const tb = sds > 0 ? sd1 / sds : 0
  const tl = 6

  const accelerationAt = (period: number) => {
    const t = Math.max(0, period)
    if (sds === 0) return 0
    if (t <= ta) return sds * (0.4 + 0.6 * (t / Math.max(ta, Number.EPSILON)))
    if (t <= tb) return sds
    if (t <= tl) return sd1 / Math.max(t, Number.EPSILON)
    return sd1 * tl / Math.max(t * t, Number.EPSILON)
  }

  return { ss, s1, fs, f1, sds, sd1, ta, tb, tl, accelerationAt }
}

export function spectrumTable(input: SeismicSpectrumInput, maxPeriod = 10, step = 0.05): SeismicSpectrumPoint[] {
  const spectrum = designSpectrum(input)
  const count = Math.max(1, Math.ceil(maxPeriod / step))
  return Array.from({ length: count + 1 }, (_, index) => {
    const period = Math.min(maxPeriod, Number((index * step).toFixed(6)))
    return { period, acceleration: spectrum.accelerationAt(period) }
  })
}
