export type SubgradeReactionMethod = 'q/s' | 'elastic'

export interface SubgradeReactionInput {
  B: number
  L?: number
  Es?: number
  nu?: number
  q?: number
  settlement?: number
  method?: SubgradeReactionMethod
}

export interface SubgradeReactionResult {
  ks: number
  method: SubgradeReactionMethod
  unit: 'kN/m³'
  formula: string
  source: string
  assumptions: string[]
}

/**
 * Winkler subgrade modulus.
 * ZeminLab units: B,L,s [m], q and Es [kN/m²], ks [kN/m³].
 */
export function calculateSubgradeReaction(i: SubgradeReactionInput): SubgradeReactionResult {
  if (i.B <= 0) throw new Error('Temel genişliği B m cinsinden sıfırdan büyük olmalıdır.')
  const L = i.L ?? i.B
  if (L <= 0) throw new Error('Temel uzunluğu L m cinsinden sıfırdan büyük olmalıdır.')

  if (i.method === 'q/s') {
    if (i.q == null || i.q < 0) throw new Error('q/s hesabında q kN/m² cinsinden sıfır veya pozitif olmalıdır.')
    if (i.settlement == null || i.settlement <= 0) throw new Error('q/s hesabında oturma s m cinsinden sıfırdan büyük olmalıdır.')
    return {
      ks: i.q / i.settlement,
      method: 'q/s',
      unit: 'kN/m³',
      formula: 'ks = q / s',
      source: 'Winkler tanımı: temel taban basıncı / karşılık gelen oturma.',
      assumptions: ['q = kN/m²', 's = m', 'ks = kN/m³']
    }
  }

  if (i.Es == null || i.Es <= 0) throw new Error('Elastik ks hesabı için Es > 0 kN/m² gereklidir.')
  if (i.nu == null || i.nu <= -1 || i.nu >= 0.5) throw new Error('ν için -1 < ν < 0.5 aralığında değer gereklidir.')

  const equivalentWidth = Math.sqrt(i.B * L)
  const ks = i.Es / (equivalentWidth * (1 - i.nu * i.nu))
  return {
    ks,
    method: 'elastic',
    unit: 'kN/m³',
    formula: 'ks ≈ Es / [√(B·L)·(1−ν²)]',
    source: 'Elastik yarı-uzaydan eşdeğer Winkler yaklaşımı; yönetmelik tarafından tek başına zorunlu bir ks değeri değildir.',
    assumptions: [
      'Es = kN/m²',
      'B,L = m',
      'Dikdörtgen temel için eşdeğer genişlik √(B·L) kullanılır',
      'Tabaka kalınlığı, temel rijitliği ve yükleme şekli ayrıca değerlendirilmelidir'
    ]
  }
}
