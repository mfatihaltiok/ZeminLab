/**
 * Jet Grout Zemin İyileştirme Mühendislik Modülü
 * 
 * Bu modül, Erol & Çekinmez Bayram (2018) referans kitabına dayalı olarak
 * Jet Grout zemin iyileştirme yönteminin tüm mühendislik hesaplamalarını içerir.
 * 
 * Kaynak: Erol, A. O. & Çekinmez Bayram, Z. (2018), Jet Enjeksiyon Yöntemi,
 *         Yüksel Proje Uluslararası A.Ş., Ankara
 */

import { jetGroutAdvanced, type JetGroutAdvancedInput, type JetGroutAdvancedResult } from './advanced-geotech'
import { bearingCapacity } from './calculation-engine'
import { 
  jetGroutEngineering, 
  jetGroutShearSafety, 
  virtualRaftSettlement,
  type JetGroutEngineeringInput,
  type JetGroutEngineeringResult,
  type JetGroutAxialInput,
  type JetGroutAxialResult,
  type ShearSafetyInput,
  type ShearSafetyResult,
  type VirtualRaftInput,
  type VirtualRaftResult
} from './jet-grout-advanced'

// Re-export types
export type { 
  JetGroutAdvancedInput, 
  JetGroutAdvancedResult,
  JetGroutEngineeringInput,
  JetGroutEngineeringResult,
  JetGroutAxialInput,
  JetGroutAxialResult,
  ShearSafetyInput,
  ShearSafetyResult,
  VirtualRaftInput,
  VirtualRaftResult
}

/**
 * Jet Grout Tasarım Parametreleri
 */
export interface JetGroutDesignParameters {
  // Kolon geometrisi
  columnDiameter: number        // m
  spacing: number               // m
  layout: 'square' | 'triangular'
  columnLength?: number         // m
  
  // Zemin parametreleri
  soilUnitWeight: number        // kN/m³
  soilCohesion: number          // kPa
  soilFrictionAngle: number     // derece
  soilEs?: number               // kPa (elastisite modülü)
  soilNu?: number               // Poisson oranı
  
  // Kolon parametreleri
  columnStrength: number        // kPa (serbest basılma dayanımı)
  columnEs?: number             // kPa (kolon elastisite modülü)
  columnUnitWeight?: number     // kN/m³
  
  // Temel parametreleri
  foundationWidth?: number      // m
  foundationLength?: number     // m
  foundationDepth?: number      // m
  verticalLoad: number          // kN
  horizontalLoad?: number       // kN
  momentX?: number              // kN·m
  momentY?: number              // kN·m
  
  // Güvenlik katsayıları
  safetyFactorBearing: number   // taşıma gücü için
  safetyFactorSliding: number   // kayma için
}

/**
 * Jet Grout Tasarım Sonuçları
 */
export interface JetGroutDesignResult {
  // Kompozit zemin parametreleri
  areaReplacementRatio: number      // ρ = Ac/A
  compositeBearingCapacity: number  // kPa
  compositeEs?: number              // kPa
  compositeCohesion?: number        // kPa
  
  // Yük paylaşımı
  columnLoadShare: number           // %
  soilLoadShare: number             // %
  stressConcentrationFactor: number // β
  
  // Taşıma gücü kontrolü
  appliedStress: number             // kPa
  bearingCapacityUtilization: number // %
  bearingCapacitySafe: boolean
  screeningOnly: true
  designEligible: false
  
  // Oturma kontrolü
  untreatedSettlement?: number      // m
  treatedSettlement?: number        // m
  settlementReduction?: number      // %
  
  // Kayma kontrolü
  slidingResistance?: number        // kN
  slidingDemand?: number            // kN
  slidingSafetyFactor?: number
  slidingSafe?: boolean
  
  // Eksenel kapasite (tek kolon)
  axialCapacity?: {
    shaftCapacity: number           // kN
    tipCapacity: number             // kN
    totalCapacity: number           // kN
    designCapacity: number          // kN
    groupEfficiency: number         // %
    governingMode: 'individual' | 'block'
  }
  
  // Geometri kontrolleri
  columnArea: number                // m²
  cellArea: number                  // m²
  numberOfColumns?: number
  
  // Uyarılar ve notlar
  warnings: string[]
  notes: string[]
  
  // Kaynak referansları
  sources: Array<{
    key: string
    title: string
    reference: string
    section?: string
  }>
}

/**
 * Tam Jet Grout Tasarım Hesaplaması
 * 
 * Bu fonksiyon tüm Jet Grout mühendislik kontrollerini tek seferde yapar:
 * 1. Kompozit zemin parametreleri
 * 2. Taşıma gücü kontrolü
 * 3. Oturma azaltma hesabı
 * 4. Kayma güvenliği kontrolü
 * 5. Eksenel kolon kapasitesi
 */
export function calculateJetGroutDesign(params: JetGroutDesignParameters): JetGroutDesignResult {
  const warnings: string[] = [
    'Bu eski birleşik Jet Grout fonksiyonu yalnız ön taramadır; nihai TBDY tasarımı değildir.',
    'Yeraltı suyu, gerçek tabaka bazlı efektif gerilmeler, kolon sürekliliği ve saha kalite kontrolü bu girdi modelinde bulunmadığından eksenel kolon/grup kapasitesi üretilmez.'
  ]
  const notes: string[] = []
  const required = [
    params.columnDiameter, params.spacing, params.soilUnitWeight, params.soilCohesion,
    params.soilFrictionAngle, params.columnStrength, params.verticalLoad,
    params.safetyFactorBearing, params.safetyFactorSliding,
    params.foundationWidth, params.foundationLength, params.foundationDepth
  ]
  if (required.some(v => v == null || !Number.isFinite(v))) {
    throw new Error('Jet Grout ön taraması için kolon, zemin, yük, güvenlik katsayıları ve temel B/L/Df girdileri eksiksiz olmalıdır.')
  }
  if (params.columnDiameter <= 0 || params.spacing <= 0 || params.spacing < params.columnDiameter) throw new Error('Kolon çapı ve aralığı geçerli olmalı; aralık çapından küçük olamaz.')
  if (params.soilUnitWeight <= 0 || params.soilCohesion < 0 || params.soilFrictionAngle < 0 || params.soilFrictionAngle > 50 || params.columnStrength <= 0 || params.verticalLoad <= 0) throw new Error('Jet Grout zemin, kolon dayanımı veya düşey yük girdileri fiziksel sınırlar dışında.')
  if (params.foundationWidth! <= 0 || params.foundationLength! <= 0 || params.foundationDepth! < 0) throw new Error('Temel genişliği/uzunluğu pozitif, temel derinliği negatif olmayan değer olmalıdır.')
  if (params.safetyFactorBearing <= 0 || params.safetyFactorSliding <= 0 || !Number.isFinite(params.safetyFactorBearing) || !Number.isFinite(params.safetyFactorSliding)) throw new Error('Jet Grout güvenlik katsayıları pozitif ve sonlu olmalıdır.')
  for (const [name, value] of [['Es zemin', params.soilEs], ['Es kolon', params.columnEs], ['Poisson oranı', params.soilNu], ['kolon uzunluğu', params.columnLength], ['yatay yük', params.horizontalLoad], ['kolon birim hacim ağırlığı', params.columnUnitWeight], ['Mx', params.momentX], ['My', params.momentY]] as const) {
    if (value !== undefined && !Number.isFinite(value)) throw new Error(name + ' sonlu bir sayı olmalıdır.')
  }
  if (params.soilEs != null && params.soilEs <= 0 || params.columnEs != null && params.columnEs <= 0 || params.columnLength != null && params.columnLength <= 0 || params.horizontalLoad != null && params.horizontalLoad < 0 || params.soilNu != null && (params.soilNu <= -1 || params.soilNu >= 0.5)) throw new Error('Jet Grout elastisite, uzunluk, yatay yük veya Poisson girdisi geçersiz.')

  const foundationArea = params.foundationWidth! * params.foundationLength!
  const soilCapacity = bearingCapacity({
    B: params.foundationWidth!, L: params.foundationLength!, Df: params.foundationDepth!,
    gamma: params.soilUnitWeight, c: params.soilCohesion, phi: params.soilFrictionAngle,
    FS: params.safetyFactorBearing, method: 'Meyerhof'
  })
  const compositeResult = jetGroutAdvanced({
    columnDiameter: params.columnDiameter,
    spacing: params.spacing,
    layout: params.layout,
    qSoil: soilCapacity.value.ultimate,
    qColumn: params.columnStrength,
    cSoil: params.soilCohesion,
    EsSoil: params.soilEs,
    EsColumn: params.columnEs,
    load: params.verticalLoad,
    foundationArea,
    FS: params.safetyFactorBearing
  })
  const appliedStress = params.verticalLoad / foundationArea
  const bearingCapacityUtilization = compositeResult.compositeCapacity > 0
    ? (appliedStress / compositeResult.compositeCapacity) * 100
    : Number.POSITIVE_INFINITY
  const bearingCapacitySafe = bearingCapacityUtilization <= 100 / params.safetyFactorBearing
  warnings.push('Bu API girdisinde YASS parametresi bulunmadığından yeraltı suyu düzeltmesi yapılmamıştır.')
  if (bearingCapacityUtilization > 80) warnings.push('Ön tarama kullanım oranı %80 üzerindedir; geometri ve iyileştirme tasarımı yeniden değerlendirilmelidir.')
  let untreatedSettlement: number | undefined
  let treatedSettlement: number | undefined
  let settlementReduction: number | undefined
  if (params.soilEs && params.columnEs && params.columnLength) {
    const virtualRaft = virtualRaftSettlement({
      load: params.verticalLoad, area: foundationArea, treatedThickness: params.columnLength,
      untreatedModulus: params.soilEs, treatedModulus: compositeResult.compositeModulus ?? params.columnEs,
      poissonRatio: params.soilNu
    })
    untreatedSettlement = virtualRaft.untreatedSettlement
    treatedSettlement = virtualRaft.treatedSettlement
    settlementReduction = virtualRaft.reductionPercent
    warnings.push('Oturma azaltma sonucu eşdeğer tabaka/sanal radye taramasıdır; katman bazlı oturma analizinin yerine geçmez.')
  }
  let slidingResistance: number | undefined
  let slidingDemand: number | undefined
  let slidingSafetyFactor: number | undefined
  let slidingSafe: boolean | undefined
  if (params.horizontalLoad != null && params.horizontalLoad > 0) {
    const shearCheck = jetGroutShearSafety({
      verticalLoad: params.verticalLoad, horizontalLoad: params.horizontalLoad, area: foundationArea,
      cohesion: params.soilCohesion, frictionAngle: params.soilFrictionAngle
    })
    slidingResistance = shearCheck.shearResistance * foundationArea
    slidingDemand = params.horizontalLoad
    slidingSafetyFactor = shearCheck.FS
    slidingSafe = slidingSafetyFactor >= params.safetyFactorSliding
  }
  if (params.columnLength != null) notes.push('Eksenel kolon/grup kapasitesi hesaplanmadı: bu eski API gerçek efektif gerilme profili ve yeraltı suyu girdisi almıyor.')
  const sources = [
    { key: 'EROL-CHEKINMEZ-BAYRAM-2018', title: 'Jet Enjeksiyon Yöntemi', reference: 'Erol, A. O. & Çekinmez Bayram, Z. (2018)', section: 'Kompozit parametreler; saha deneyleri ve kalite kontrolle doğrulanmalıdır' },
    { key: 'TBDY-2018-16', title: 'TBDY 2018 Bölüm 16', reference: 'Türkiye Bina Deprem Yönetmeliği 2018', section: 'Nihai tasarım için ilgili temel ve zemin iyileştirme kontrolleri ayrıca yapılmalıdır' }
  ]
  return {
    areaReplacementRatio: compositeResult.areaReplacementRatio,
    compositeBearingCapacity: compositeResult.compositeCapacity,
    compositeEs: compositeResult.compositeModulus,
    compositeCohesion: compositeResult.compositeCohesion,
    columnLoadShare: compositeResult.columnLoadShare,
    soilLoadShare: compositeResult.soilLoadShare,
    stressConcentrationFactor: compositeResult.areaReplacementRatio > 0 ? compositeResult.columnLoadShare / compositeResult.areaReplacementRatio : 0,
    appliedStress, bearingCapacityUtilization, bearingCapacitySafe,
    screeningOnly: true, designEligible: false,
    untreatedSettlement, treatedSettlement, settlementReduction,
    slidingResistance, slidingDemand, slidingSafetyFactor, slidingSafe,
    axialCapacity: undefined,
    columnArea: compositeResult.areaColumn, cellArea: compositeResult.cellArea,
    numberOfColumns: Math.ceil(params.foundationWidth! / params.spacing) * Math.ceil(params.foundationLength! / params.spacing),
    warnings, notes, sources
  }
}

/**
 * Jet Grout Kolon Sayısı Hesaplama
 */
export function calculateNumberOfColumns(
  foundationWidth: number,
  foundationLength: number,
  spacing: number,
  layout: 'square' | 'triangular' = 'square'
): number {
  const colsX = Math.ceil(foundationWidth / spacing) + 1
  const colsY = Math.ceil(foundationLength / spacing) + 1
  
  if (layout === 'triangular') {
    // Üçgen düzen: her ikinci sıra kaydırılmış
    return colsX * colsY
  } else {
    // Kare düzen
    return colsX * colsY
  }
}

/**
 * Jet Grout İyileştirme Oranı Hesaplama
 */
export function calculateImprovementRatio(
  columnDiameter: number,
  spacing: number,
  layout: 'square' | 'triangular' = 'square'
): number {
  const columnArea = Math.PI * (columnDiameter / 2) ** 2
  
  if (layout === 'square') {
    const cellArea = spacing * spacing
    return columnArea / cellArea
  } else {
    // Üçgen düzen
    const cellArea = (Math.sqrt(3) / 2) * spacing * spacing
    return columnArea / cellArea
  }
}

/**
 * Jet Grout Tahmini Kolon Çapı (zemin tipine göre)
 * 
 * Erol & Çekinmez Bayram (2018) Tablo 4.1'den alınan tipik değerler
 */
export function estimateColumnDiameter(
  soilType: 'clay' | 'silt' | 'sand' | 'gravel',
  method: 'single' | 'double' | 'triple' = 'double'
): { min: number; typical: number; max: number } {
  const table: Record<string, Record<string, { min: number; typical: number; max: number }>> = {
    clay: {
      single: { min: 0.3, typical: 0.5, max: 0.7 },
      double: { min: 0.5, typical: 0.8, max: 1.2 },
      triple: { min: 0.8, typical: 1.2, max: 1.8 }
    },
    silt: {
      single: { min: 0.3, typical: 0.5, max: 0.7 },
      double: { min: 0.5, typical: 0.8, max: 1.1 },
      triple: { min: 0.7, typical: 1.0, max: 1.5 }
    },
    sand: {
      single: { min: 0.3, typical: 0.5, max: 0.7 },
      double: { min: 0.5, typical: 0.7, max: 1.0 },
      triple: { min: 0.7, typical: 0.9, max: 1.3 }
    },
    gravel: {
      single: { min: 0.2, typical: 0.4, max: 0.6 },
      double: { min: 0.4, typical: 0.6, max: 0.9 },
      triple: { min: 0.6, typical: 0.8, max: 1.1 }
    }
  }
  
  return table[soilType][method]
}

/**
 * Jet Grout Tahmini Kolon Dayanımı
 * 
 * Erol & Çekinmez Bayram (2018) Tablo 6.1'den alınan tipik değerler
 */
export function estimateColumnStrength(
  soilType: 'clay' | 'silt' | 'sand' | 'gravel',
  cementContent?: number // kg/m³
): { min: number; typical: number; max: number } {
  // Tipik değerler (cement content ~300 kg/m³)
  const baseTable: Record<string, { min: number; typical: number; max: number }> = {
    clay: { min: 1000, typical: 2500, max: 5000 },
    silt: { min: 1500, typical: 3000, max: 6000 },
    sand: { min: 2000, typical: 4000, max: 8000 },
    gravel: { min: 2500, typical: 5000, max: 10000 }
  }
  
  const base = baseTable[soilType]
  
  // Çimento içeriği düzeltmesi
  if (cementContent !== undefined) {
    const factor = cementContent / 300 // 300 kg/m³ referans
    return {
      min: base.min * factor,
      typical: base.typical * factor,
      max: base.max * factor
    }
  }
  
  return base
}
