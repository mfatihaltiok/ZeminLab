export type CorrelationDomain = 'phi' | 'elastic-modulus'

export interface CorrelationInput {
  n60?: number
  n1_60?: number
  effectiveStress?: number
  soilType?: 'sand' | 'sand-with-fines' | 'gravel' | 'clay' | 'unknown'
}

export interface CorrelationResult {
  id: string
  domain: CorrelationDomain
  name: string
  author: string
  value: number
  unit: 'deg' | 'stress'
  formula: string
  applicability: string
  source: string
  secondarySources?: string[]
}

const valid = (v: number | undefined): v is number => v !== undefined && Number.isFinite(v) && v >= 0

/**
 * Published SPT correlations are selectable methods rather than hidden defaults.
 * Erol & Çekinmez (2014) is retained as a primary project reference for the
 * SPT/correlation workflow and as the report cross-reference for these methods.
 */
export const SPT_CORRELATIONS = {
  phi: [
    {
      id: 'kulhawy-mayne-1990', name: 'Kulhawy & Mayne', author: 'Kulhawy & Mayne (1990)',
      requires: 'N60 + effective vertical stress', source: 'FHWA-NHI-10-016, Eq. 3-7',
      calculate: ({ n60, effectiveStress }: CorrelationInput) => {
        if (!valid(n60) || !valid(effectiveStress) || effectiveStress <= 0) return undefined
        const pa = 100
        const phi = Math.atan(Math.pow(n60 / (12.2 + 20.3 * (effectiveStress / pa)), 0.34)) * 180 / Math.PI
        return Math.max(0, Math.min(50, phi))
      }
    },
    {
      id: 'kulhawy-chen-2007', name: 'Kulhawy & Chen', author: 'Kulhawy & Chen (2007)',
      requires: '(N1)60', source: 'FHWA-NHI-10-016, Eq. 3-8',
      calculate: ({ n1_60 }: CorrelationInput) => valid(n1_60) && n1_60 > 0 ? 27.5 + 9.2 * Math.log10(n1_60) : undefined
    },
    {
      id: 'hatanaka-uchida-1996', name: 'Hatanaka & Uchida', author: 'Hatanaka & Uchida (1996)',
      requires: '(N1)60', source: 'FHWA-NHI-10-016, Eq. 3-6',
      calculate: ({ n1_60 }: CorrelationInput) => valid(n1_60) ? Math.sqrt(20 * n1_60) + 20 : undefined
    },
    {
      id: 'peck-hanson-thornburn-1974', name: 'Peck, Hanson & Thornburn', author: 'Peck, Hanson & Thornburn (1974), Wolff approximation',
      requires: 'N60', source: 'FHWA / Groundhog SPT correlation documentation',
      calculate: ({ n60 }: CorrelationInput) => valid(n60) ? 27.1 + 0.3 * n60 - 0.00054 * n60 * n60 : undefined
    }
  ],
  elasticModulus: [
    { id: 'kulhawy-mayne-sand-fines', name: 'K&M first-order estimate, sand with fines', author: 'Kulhawy & Mayne (1990)', multiplier: 5, source: 'FHWA NHI-05-037', applicability: 'Sands with fines' },
    { id: 'kulhawy-mayne-clean-sand', name: 'K&M first-order estimate, clean sand', author: 'Kulhawy & Mayne (1990)', multiplier: 10, source: 'FHWA NHI-05-037', applicability: 'Clean, normally consolidated sands' },
    { id: 'kulhawy-mayne-oc-sand', name: 'K&M first-order estimate, overconsolidated sand', author: 'Kulhawy & Mayne (1990)', multiplier: 15, source: 'FHWA NHI-05-037', applicability: 'Clean, overconsolidated sands' }
  ]
} as const

const EROL_FIELD_SOURCE = 'Erol & Çekinmez (2014), Geoteknik Mühendisliğinde Saha Deneyleri, Yüksel Proje Yayınları No: 14-01'

export function estimateFrictionAngle(methodId: string, input: CorrelationInput): CorrelationResult | undefined {
  const method = SPT_CORRELATIONS.phi.find(x => x.id === methodId)
  if (!method) return undefined
  const value = method.calculate(input)
  if (value === undefined) return undefined
  return { id: method.id, domain: 'phi', name: method.name, author: method.author, value, unit: 'deg', formula: method.requires, applicability: method.requires, source: method.source, secondarySources: [EROL_FIELD_SOURCE] }
}

export function estimateElasticModulus(methodId: string, n60: number): CorrelationResult | undefined {
  if (!Number.isFinite(n60) || n60 < 0) return undefined
  const method = SPT_CORRELATIONS.elasticModulus.find(x => x.id === methodId)
  if (!method) return undefined
  return { id: method.id, domain: 'elastic-modulus', name: method.name, author: method.author, value: method.multiplier * n60, unit: 'stress', formula: `Eₛ / pₐ ≈ ${method.multiplier}·N₆₀`, applicability: method.applicability, source: method.source, secondarySources: [EROL_FIELD_SOURCE] }
}

export function defaultElasticModulusMethod(soilType: CorrelationInput['soilType']): string {
  if (soilType === 'sand-with-fines') return 'kulhawy-mayne-sand-fines'
  if (soilType === 'sand') return 'kulhawy-mayne-clean-sand'
  return 'kulhawy-mayne-sand-fines'
}
