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

  const unitSystem=i.unitSystem??'kN-m'
  const unit = unitSystem === 'kN-m' ? 'kN/m³' : 'tonf/m³'
  const stressUnit = unitSystem === 'kN-m' ? 'kN/m²' : 'tonf/m²'

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
    const EsBase=unitSystem==='ton-m'?i.Es*9.80665:i.Es
    const equivalentWidth = Math.sqrt(i.B * L)
    const ksBase = EsBase / (equivalentWidth * (1 - i.nu * i.nu))
    const ks=unitSystem==='ton-m'?ksBase/9.80665:ksBase
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

  // Erol & Çekinmez 6.15–6.16 bağıntılarındaki B/L sayısal olarak ft tabanındadır.
  // Girdiler metre olduğundan yalnız geometri ft'ye çevrilir; Kv1 ve çıktı birimi değişmez.
  const Bft=i.B/0.3048,Lft=L/0.3048
  const ratio = Lft / Bft
  const Kv1Base=unitSystem==='ton-m'?i.Kv1*9.80665:i.Kv1
  let ksBase: number
  let formula: string

  if (i.soilType === 'cohesive') {
    if (Math.abs(L - i.B) <= 1e-9) {
      ksBase = Kv1Base / Bft
      formula = 'Kv = Kv1 / B  (Denk. 6.15a)'
    } else {
      ksBase = Kv1Base * (ratio + 0.5) / (1.5 * ratio * Bft)
      formula = 'Kv = Kv1·(m+0.5)/(1.5·m·Bft)  (Denk. 6.15b)'
    }
  } else {
    ksBase = Kv1Base * Math.pow(Bft + 1, 2) / (4 * Math.pow(Bft, 2))
    formula = 'Kv = Kv1·(Bft + 1)²/(4·Bft²)  (Denk. 6.16)'
  }

  const ks=unitSystem==='ton-m'?ksBase/9.80665:ksBase
  return {
    ks,
    method: 'erol-plate',
    unit,
    formula,
    source: 'Erol & Çekinmez (2014), Geoteknik Mühendisliğinde Saha Deneyleri, Bölüm 6.8.1, Denk. 6.15a–6.16, s.272.',
    assumptions: [`Kv1 = ${unit}`, 'Kv1, 30 cm × 30 cm plaka yükleme deneyinden alınır.', `Zemin tipi: ${i.soilType === 'cohesive' ? 'kohezyonlu' : 'kohezyonsuz'}`, 'B ve L girdileri m; Erol & Çekinmez ölçek bağıntıları için ft değerine dönüştürülür.']
  }
}
