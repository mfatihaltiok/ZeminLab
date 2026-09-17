export type SptHammerType = 'donut' | 'safety' | 'automatic' | 'measured'
export type SptSamplerType = 'standard' | 'without-liner' | 'liner'

export interface SptEngineInput {
  nField: number
  energyRatio?: number
  hammerType?: SptHammerType
  boreholeDiameterMm?: number
  sampler?: SptSamplerType
  samplerCorrection?: number
  rodLengthM?: number
  effectiveStress?: number
  fineContent?: number
  applyOverburden?: boolean
  applyDilatancy?: boolean
}

export interface SptTraceStep { symbol: string; title: string; formula: string; value?: number; unit?: string; note?: string }
export interface SptEngineResult {
  nField: number
  ce: number
  cb: number
  cs: number
  cr: number
  cn: number
  n60: number
  n1_60: number
  n1_60_dilatancy?: number
  dilatancyApplied: boolean
  trace: SptTraceStep[]
}

function finitePositive(value: number | undefined) { return value !== undefined && Number.isFinite(value) && value > 0 }

function energyRatio(input: SptEngineInput) {
  if (finitePositive(input.energyRatio)) return input.energyRatio!
  if (input.hammerType === 'automatic') return 80
  if (input.hammerType === 'donut') return 45
  if (input.hammerType === 'safety') return 60
  return 60
}

function boreholeFactor(diameter?: number) {
  if (!finitePositive(diameter)) return 1
  if (diameter! <= 115) return 1
  if (diameter! <= 150) return 1.05
  if (diameter! <= 200) return 1.15
  return 1.15
}

function samplerFactor(input: SptEngineInput) {
  if (input.sampler !== 'without-liner') return 1
  const requested = input.samplerCorrection
  if (requested !== undefined) {
    if (!Number.isFinite(requested) || requested < 1.10 || requested > 1.30) {
      throw new Error('İç tüpsüz numune alıcı için Cₛ değeri 1.10–1.30 aralığında olmalıdır.')
    }
    return requested
  }
  return 1.10
}

function rodFactor(length?: number) {
  if (!finitePositive(length)) return 1
  if (length < 4) return 0.75
  if (length < 6) return 0.85
  if (length < 10) return 0.95
  return 1
}

export function fineContentCorrection(fines: number) {
  const fc = Math.max(0, fines)
  if (fc <= 5) return { alpha: 0, beta: 1 }
  if (fc < 35) return { alpha: Math.exp(1.76 - 190 / (fc * fc)), beta: 0.99 + Math.pow(fc, 1.5) / 1000 }
  return { alpha: 5, beta: 1.2 }
}

/** Central SPT correction path used by field tables, liquefaction and correlations. */
export function calculateSpt(input: SptEngineInput): SptEngineResult {
  if (!Number.isFinite(input.nField) || input.nField < 0) throw new Error('SPT N değeri geçerli olmalıdır.')
  const er = energyRatio(input)
  if (!Number.isFinite(er) || er <= 0) throw new Error('SPT enerji oranı pozitif olmalıdır.')
  const ce = er / 60
  const cb = boreholeFactor(input.boreholeDiameterMm)
  const cs = samplerFactor(input)
  const cr = rodFactor(input.rodLengthM)
  const n60 = input.nField * ce * cb * cs * cr
  const sigma = input.effectiveStress
  const applyOverburden = input.applyOverburden ?? true
  const cn = applyOverburden && finitePositive(sigma) ? Math.min(1.7, Math.sqrt(100 / sigma!)) : 1
  const n1_60 = n60 * cn
  const fines = input.fineContent ?? 0
  const dilatancyApplied = Boolean(input.applyDilatancy && fines < 35 && finitePositive(sigma) && n1_60 > 15)
  const n1_60_dilatancy = dilatancyApplied ? 15 + 0.5 * (n1_60 - 15) : undefined
  const trace: SptTraceStep[] = [
    { symbol: 'N', title: 'Ham SPT değeri', formula: 'N = N₂ + N₃', value: input.nField, note: 'Sahada ölçülen ham değer.' },
    { symbol: 'Cₑ', title: 'Enerji düzeltmesi', formula: 'Cₑ = ER / 60', value: ce, note: `Enerji oranı ER = ${er.toFixed(1)} %` },
    { symbol: 'Cᵦ', title: 'Sondaj çapı düzeltmesi', formula: 'Cᵦ = f(D)', value: cb, note: input.boreholeDiameterMm ? `Sondaj çapı = ${input.boreholeDiameterMm} mm` : 'Çap girilmedi; 1.00 kullanıldı.' },
    { symbol: 'Cₛ', title: 'Numune alıcı düzeltmesi', formula: 'Cₛ = f(sampler)', value: cs, note: input.sampler === 'without-liner' ? 'İç tüpsüz numune alıcı; varsayılan Cₛ=1.10.' : 'Standart iç tüplü numune alıcı; Cₛ=1.00.' },
    { symbol: 'Cᵣ', title: 'Rod boyu düzeltmesi', formula: 'Cᵣ = f(L)', value: cr, note: input.rodLengthM ? `Rod boyu = ${input.rodLengthM} m` : 'Rod boyu girilmedi; 1.00 kullanıldı.' },
    { symbol: 'N₆₀', title: 'Standartlaştırılmış SPT', formula: 'N₆₀ = N · Cₑ · Cᵦ · Cₛ · Cᵣ', value: n60 },
    { symbol: 'Cᴺ', title: 'Örtü basıncı düzeltmesi', formula: 'Cᴺ = min(1.70, √(100/σ′ᵥ₀))', value: cn, note: finitePositive(sigma) ? `σ′ᵥ₀ = ${sigma!.toFixed(3)} kPa` : 'Etkin düşey gerilme verilmediği için uygulanmadı.' },
    { symbol: '(N₁)₆₀', title: 'Normalize SPT', formula: '(N₁)₆₀ = Cᴺ · N₆₀', value: n1_60 }
  ]
  if (dilatancyApplied) trace.push({ symbol: '(N₁)₆₀,d', title: 'Dilatansi düzeltmesi', formula: '15 + 0.5[(N₁)₆₀ − 15]', value: n1_60_dilatancy, note: 'Bu seçenek yalnızca proje metodolojisi açıkça gerektiriyorsa kullanılmalıdır.' })
  return { nField: input.nField, ce, cb, cs, cr, cn, n60, n1_60, n1_60_dilatancy, dilatancyApplied, trace }
}
