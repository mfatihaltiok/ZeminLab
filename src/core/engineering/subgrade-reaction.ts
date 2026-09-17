import type { UnitSystem } from '../models/project'

export type SubgradeReactionMethod = 'q/s' | 'elastic' | 'erol-plate'
export type SubgradeSoilType = 'cohesive' | 'cohesionless'

export interface SubgradeReactionInput {
  B: number
  L?: number
  Es?: number
  nu?: number
  q?: number
  settlement?: number
  method?: SubgradeReactionMethod
  unitSystem?: UnitSystem
  Kv1?: number
  soilType?: SubgradeSoilType
}

export interface SubgradeReactionResult {
  ks: number
  method: SubgradeReactionMethod
  unit: string
  formula: string
  source: string
  assumptions: string[]
}

export function calculateSubgradeReaction(i: SubgradeReactionInput): SubgradeReactionResult {
  if (!Number.isFinite(i.B) || i.B <= 0) throw new Error('Temel genişliği B m cinsinden sıfırdan büyük olmalıdır.')
  const L = i.L ?? i.B
  if (!Number.isFinite(L) || L <= 0) throw new Error('Temel uzunluğu L m cinsinden sıfırdan büyük olmalıdır.')

  const unit = i.unitSystem === 'kN-m' ? 'kN/m³' : 'tonf/m³'
  const stressUnit = i.unitSystem === 'kN-m' ? 'kN/m²' : 'tonf/m²'

  if (i.method === 'q/s') {
    if (i.q == null || !Number.isFinite(i.q) || i.q < 0) {
      throw new Error(`q/s hesabında q ${stressUnit} cinsinden sıfır veya pozitif olmalıdır.`)
    }
    if (i.settlement == null || !Number.isFinite(i.settlement) || i.settlement <= 0) {
      throw new Error('q/s hesabında oturma s m cinsinden sıfırdan büyük olmalıdır.')
    }
    return {
      ks: i.q / i.settlement,
      method: 'q/s',
      unit,
      formula: 'ks = q / s',
      source: 'Winkler tanımı: temel taban basıncı / karşılık gelen oturma.',
      assumptions: [`q = ${stressUnit}`, 's = m', `ks = ${unit}`]
    }
  }

  if (i.method === 'elastic') {
    if (i.Es == null || !Number.isFinite(i.Es) || i.Es <= 0) {
      throw new Error(`Elastik ks hesabı için Es > 0 ${stressUnit} gereklidir.`)
    }
    if (i.nu == null || !Number.isFinite(i.nu) || i.nu <= -1 || i.nu >= 0.5) {
      throw new Error('ν için -1 < ν < 0.5 aralığında değer gereklidir.')
    }
    const equivalentWidth = Math.sqrt(i.B * L)
    const ks = i.Es / (equivalentWidth * (1 - i.nu * i.nu))
    return {
      ks,
      method: 'elastic',
      unit,
      formula: 'ks ≈ Es / [√(B·L)·(1−ν²)]',
      source: 'Elastik yarı-uzaydan eşdeğer Winkler yaklaşımı; TBDY 2018 tarafından tek başına zorunlu bir ks değeri olarak verilmez.',
      assumptions: [`Es = ${stressUnit}`, 'B,L = m', 'Dikdörtgen temel için eşdeğer genişlik √(B·L) kullanılır.', 'Tabaka kalınlığı, temel rijitliği ve yükleme şekli ayrıca değerlendirilmelidir.']
    }
  }

  // Erol & Çekinmez (2014), Bölüm 6.8.1, Denk. 6.15a, 6.15b ve 6.16.
  // Kv1, 30 cm x 30 cm plaka yükleme deneyinden elde edilen düşey yatak katsayısıdır.
  if (i.Kv1 == null || !Number.isFinite(i.Kv1) || i.Kv1 <= 0) {
    throw new Error(`Erol & Çekinmez yönteminde Kv1 > 0 ${unit} girilmelidir. Kv1, 30×30 cm plaka yükleme deneyinden alınır.`)
  }
  if (i.soilType !== 'cohesive' && i.soilType !== 'cohesionless') {
    throw new Error('Erol & Çekinmez yönteminde zemin tipi kohezyonlu veya kohezyonsuz olarak seçilmelidir.')
  }

  const ratio = L / i.B
  let ks: number
  let formula: string

  if (i.soilType === 'cohesive') {
    if (Math.abs(L - i.B) <= 1e-9) {
      ks = i.Kv1 / i.B
      formula = 'Kv = Kv1 / B  (Denk. 6.15a)'
    } else {
      ks = i.Kv1 * (ratio + 0.5) / (1.5 * ratio * i.B)
      formula = 'Kv = Kv1·(mB + 0.5)/(1.5·mB·B)  (Denk. 6.15b)'
    }
  } else {
    ks = i.Kv1 * Math.pow(i.B + 1, 2) / (4 * Math.pow(i.B, 2))
    formula = 'Kv = Kv1·(B + 1)²/(4·B²)  (Denk. 6.16)'
  }

  return {
    ks,
    method: 'erol-plate',
    unit,
    formula,
    source: 'Erol & Çekinmez (2014), Geoteknik Mühendisliğinde Saha Deneyleri, Bölüm 6.8.1, Denk. 6.15a–6.16, s.272.',
    assumptions: [`Kv1 = ${unit}`, 'Kv1, 30 cm × 30 cm plaka yükleme deneyinden alınır.', `Zemin tipi: ${i.soilType === 'cohesive' ? 'kohezyonlu' : 'kohezyonsuz'}`, 'B ve L = m']
  }
}
