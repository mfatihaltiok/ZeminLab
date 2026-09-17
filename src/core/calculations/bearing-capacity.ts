import type {
  BearingCapacityInput,
  BearingCapacityResult
} from '../models/bearing-capacity'

export function calculateBearingCapacity(
  input: BearingCapacityInput
): BearingCapacityResult {
  const {
    footingWidth: B,
    footingDepth: Df,
    unitWeight: gamma,
    cohesion: c,
    frictionAngle,
    safetyFactor
  } = input

  if (B <= 0) {
    throw new Error('Temel genişliği B sıfırdan büyük olmalıdır.')
  }

  if (Df < 0) {
    throw new Error('Temel derinliği Df negatif olamaz.')
  }

  if (gamma <= 0) {
    throw new Error('Birim hacim ağırlık γ sıfırdan büyük olmalıdır.')
  }

  if (c < 0) {
    throw new Error('Kohezyon c negatif olamaz.')
  }

  if (frictionAngle < 0 || frictionAngle >= 45) {
    throw new Error('Bu ön hesap için φ değeri 0° ile 45° arasında olmalıdır.')
  }

  if (safetyFactor <= 0) {
    throw new Error('Güvenlik katsayısı sıfırdan büyük olmalıdır.')
  }

  let Nq: number
  let Nc: number
  let Ngamma: number

  if (frictionAngle === 0) {
    Nq = 1
    Nc = 5.7
    Ngamma = 0
  } else {
    const phi = (frictionAngle * Math.PI) / 180

    Nq =
      Math.exp(Math.PI * Math.tan(phi)) *
      Math.pow(
        Math.tan(Math.PI / 4 + phi / 2),
        2
      )

    Nc = (Nq - 1) / Math.tan(phi)

    Ngamma = 2 * (Nq - 1) * Math.tan(phi)
  }

  const surcharge = gamma * Df

  const ultimateBearingCapacity =
    c * Nc +
    surcharge * Nq +
    0.5 * gamma * B * Ngamma

  const netUltimateBearingCapacity =
    ultimateBearingCapacity - surcharge

  const allowableNetBearingCapacity =
    netUltimateBearingCapacity / safetyFactor

  const allowableGrossBearingCapacity =
    allowableNetBearingCapacity + surcharge

  return {
    Nq,
    Nc,
    Ngamma,
    surcharge,
    ultimateBearingCapacity,
    netUltimateBearingCapacity,
    allowableGrossBearingCapacity,
    allowableNetBearingCapacity
  }
}
