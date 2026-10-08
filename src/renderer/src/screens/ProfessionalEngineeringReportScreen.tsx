import { useMemo } from 'react'
import { useProjectInfo } from '../../../core/state/project-store'
import { forceToBase, stressToBase, unitWeightToBase, momentToBase } from '../../../core/units/project-units'
import { bearingCapacity, tbdyBearingCapacity, foundationChecks, settlement, liquefactionProfile, jetGroutAdvanced, subgradeReaction } from '../../../core/calculations/engineering'
import { EngineeringReportProfessional, type ReportSection, type ReportCalculationStep } from '../components/EngineeringReportProfessional'
import { TechnicalSection, type TechnicalSectionLayer, type TechnicalSectionMarker } from '../components/TechnicalSection'
import type { BoreholeRecord, LaboratoryRecord } from '../../../core/models/field-data'
import type { IdealizedSoilProfile } from '../../../core/models/idealized-soil-profile'
import '../assets/engineering-report-pro.css'

type Props = {
  boreholes: BoreholeRecord[]
  labs: LaboratoryRecord[]
  profile?: IdealizedSoilProfile
}

const fmt = (v: number | undefined, d = 2) => v == null || !Number.isFinite(v) ? '—' : v.toFixed(d)

function buildBearingSection(p: ReturnType<typeof useProjectInfo>, profile?: IdealizedSoilProfile): ReportSection | null {
  const f = p.foundationParameters
  const soil = p.soilParameters
  const B = f.footingWidth, L = f.footingLength, Df = f.footingDepth
  const gamma = unitWeightToBase(soil.unitWeight, p.unitSystem)
  const c = stressToBase(soil.cohesion, p.unitSystem)
  const phi = soil.frictionAngle

  if (!(B > 0 && L > 0 && Df >= 0 && gamma > 0 && phi >= 0)) return null

  try {
    const result = tbdyBearingCapacity({
      B, L, Df, gamma1: gamma, gamma2: unitWeightToBase(soil.saturatedUnitWeight, p.unitSystem),
      c, phi,
      verticalLoad: forceToBase(f.structuralWeight, p.unitSystem),
      horizontalLoad: forceToBase(f.horizontalLoad, p.unitSystem),
      momentX: momentToBase(f.momentX, p.unitSystem),
      momentY: momentToBase(f.momentY, p.unitSystem),
      groundSlope: soil.surfaceSlope,
      baseSlope: soil.foundationBaseSlope,
      resistanceFactor: f.resistanceFactorRv,
      foundationType: f.foundationType,
      groundwaterDepth: soil.groundwaterDepth,
      layers: profile?.layers.map(x => ({
        topDepth: x.topDepth,
        bottomDepth: x.bottomDepth,
        gamma: unitWeightToBase(x.gamma ?? soil.unitWeight, p.unitSystem),
        gammaSat: unitWeightToBase(x.gammaSat ?? x.gamma ?? soil.saturatedUnitWeight, p.unitSystem),
        cohesion: stressToBase(x.cohesion ?? soil.cohesion, p.unitSystem),
        phi: x.frictionAngle ?? soil.frictionAngle
      }))
    })

    const steps: ReportCalculationStep[] = result.steps.map((s, i) => ({
      index: i + 1,
      symbol: s.symbol,
      title: s.title,
      formula: s.formula,
      value: s.value ?? '—',
      unit: s.unit ?? '',
      note: s.note
    }))

    return {
      id: '1',
      title: 'Yüzeysel Temel Taşıma Gücü',
      subtitle: 'TBDY 2018 Denklem 16.8',
      method: 'TBDY 2018',
      source: 'TBDY 2018 Bölüm 16.8.3; Terzaghi, Meyerhof, Hansen, Vesic bağıntıları',
      inputs: [
        { label: 'Temel Genişliği (B)', value: fmt(B), unit: 'm' },
        { label: 'Temel Uzunluğu (L)', value: fmt(L), unit: 'm' },
        { label: 'Temel Derinliği (Df)', value: fmt(Df), unit: 'm' },
        { label: 'Birim Hacim Ağırlık (γ)', value: fmt(gamma), unit: 'kN/m³' },
        { label: 'Kohezyon (c)', value: fmt(c), unit: 'kPa' },
        { label: 'Sürtünme Açısı (φ)', value: fmt(phi), unit: '°' },
        { label: 'Direnç Katsayısı (γRv)', value: fmt(f.resistanceFactorRv, 1), unit: '' },
        { label: 'Temel Tipi', value: f.foundationType, unit: '' }
      ],
      steps,
      results: [
        { label: 'Karakteristik Taşıma Gücü (qk)', value: fmt(result.value.qk), unit: 'kPa' },
        { label: 'Tasarım Taşıma Gücü (qt)', value: fmt(result.value.qt), unit: 'kPa' },
        { label: 'Uygulanan Basınç (q₀)', value: fmt(result.value.qo), unit: 'kPa' },
        { label: 'Kullanım Oranı (η)', value: fmt(result.value.utilization * 100, 1), unit: '%', status: result.value.utilization <= 1 ? 'ok' : 'fail' },
        { label: 'Yeterlilik', value: result.value.adequate ? 'UYGUN' : 'UYGUN DEĞİL', unit: '', status: result.value.adequate ? 'ok' : 'fail' }
      ],
      notes: result.warnings
    }
  } catch {
    return null
  }
}

function buildFoundationCheckSection(p: ReturnType<typeof useProjectInfo>): ReportSection | null {
  const f = p.foundationParameters
  const soil = p.soilParameters
  const B = f.footingWidth, L = f.footingLength
  const N = forceToBase(f.structuralWeight, p.unitSystem)
  const Vx = forceToBase(f.vtX, p.unitSystem)
  const Vy = forceToBase(f.vtY, p.unitSystem)
  const Mx = momentToBase(f.momentX, p.unitSystem)
  const My = momentToBase(f.momentY, p.unitSystem)

  if (!(B > 0 && L > 0 && N > 0)) return null

  try {
    const result = foundationChecks({
      B, L, N, Vx, Vy, Mx, My,
      cu: soil.undrainedCohesion,
      groundwaterDepth: soil.groundwaterDepth,
      foundationDepth: f.footingDepth,
      passiveResistanceCharacteristic: forceToBase(f.passiveResistanceCharacteristic, p.unitSystem),
      usePassiveResistance: f.usePassiveResistance
    })

    const steps: ReportCalculationStep[] = [
      { index: 1, symbol: 'ex', title: 'x yönünde eksantrisite', formula: 'ex = My / N', value: result.ex, unit: 'm' },
      { index: 2, symbol: 'ey', title: 'y yönünde eksantrisite', formula: 'ey = Mx / N', value: result.ey, unit: 'm' },
      { index: 3, symbol: 'B\'', title: 'Etkin genişlik', formula: 'B\' = B - 2|ex|', value: B - 2 * Math.abs(result.ex), unit: 'm' },
      { index: 4, symbol: 'L\'', title: 'Etkin uzunluk', formula: 'L\' = L - 2|ey|', value: L - 2 * Math.abs(result.ey), unit: 'm' },
      { index: 5, symbol: 'Rth', title: 'Sürtünme direnci', formula: 'Rth = N·tanδ / γRh', value: result.slidingCapacityResultant, unit: 'kN' },
      { index: 6, symbol: 'Vh', title: 'Yatay yük sonucu', formula: 'Vh = √(Vx² + Vy²)', value: result.horizontalResultant, unit: 'kN' }
    ]

    return {
      id: '2',
      title: 'Temel Kayma ve Stabilite Kontrolü',
      subtitle: 'TBDY 2018 Madde 16.8.4',
      method: 'TBDY 2018',
      source: 'TBDY 2018 Bölüm 16.7–16.8; γRh=1.10, γRp=1.40',
      inputs: [
        { label: 'Düşey Yük (N)', value: fmt(N), unit: 'kN' },
        { label: 'Yatay Yük (Vx)', value: fmt(Vx), unit: 'kN' },
        { label: 'Moment (Mx)', value: fmt(Mx), unit: 'kN·m' },
        { label: 'Moment (My)', value: fmt(My), unit: 'kN·m' }
      ],
      steps,
      results: [
        { label: 'Kayma Güvenlik Oranı', value: fmt(result.slidingFS), unit: '', status: result.slidingSafeResultant ? 'ok' : 'fail' },
        { label: 'Kayma Kapasitesi', value: fmt(result.slidingCapacityResultant), unit: 'kN' },
        { label: 'Yatay Yük Sonucu', value: fmt(result.horizontalResultant), unit: 'kN' },
        { label: 'Temas Durumu', value: result.contactArea > 0 ? 'TAM KISMI TEMAS' : 'TEMAS YOK', unit: '', status: result.contactArea > 0 ? 'ok' : 'fail' }
      ],
      notes: result.warnings
    }
  } catch {
    return null
  }
}

function buildSettlementSection(p: ReturnType<typeof useProjectInfo>, profile?: IdealizedSoilProfile): ReportSection | null {
  const f = p.foundationParameters
  const soil = p.soilParameters
  const B = f.footingWidth, L = f.footingLength

  if (!profile || profile.status !== 'SABİTLENDİ' || !(B > 0 && L > 0)) return null

  try {
    const qGross = forceToBase(f.structuralWeight, p.unitSystem) / (B * L)
    const result = settlement({
      B, L, q: qGross,
      Es: profile.layers[0]?.constrainedModulus ?? profile.layers[0]?.oedometricModulus ?? 10000,
      nu: profile.layers[0]?.poissonRatio ?? 0.3
    })

    const steps: ReportCalculationStep[] = result.steps.map((s, i) => ({
      index: i + 1,
      symbol: s.symbol,
      title: s.title,
      formula: s.formula,
      value: s.value ?? '—',
      unit: s.unit ?? ''
    }))

    return {
      id: '3',
      title: 'Oturma Hesabı',
      subtitle: 'Elastik + Konsolidasyon',
      method: 'Elastik Teori',
      source: 'TBDY 2018 Bölüm 16.8.3.4',
      inputs: [
        { label: 'Temel Genişliği (B)', value: fmt(B), unit: 'm' },
        { label: 'Net Oturma Basıncı (q)', value: fmt(qGross), unit: 'kPa' },
        { label: 'Elastisite Modülü (Es)', value: fmt(result.value.immediate > 0 ? qGross * B * (1 - 0.3 * 0.3) / result.value.immediate : 0), unit: 'kPa' }
      ],
      steps,
      results: [
        { label: 'Ani (Elastik) Oturma', value: fmt(result.value.immediate * 1000, 1), unit: 'mm' },
        { label: 'Konsolidasyon Oturması', value: fmt(result.value.consolidation * 1000, 1), unit: 'mm' },
        { label: 'Toplam Oturma', value: fmt(result.value.total * 1000, 1), unit: 'mm', status: result.value.total * 1000 < 25 ? 'ok' : 'warning' }
      ],
      notes: result.value.total * 1000 > 50 ? ['Toplam oturma 50 mm sınırını aşıyor. Zemin iyileştirme veya derin temel düşünülmelidir.'] : undefined
    }
  } catch {
    return null
  }
}

function buildJetGroutSection(p: ReturnType<typeof useProjectInfo>): ReportSection | null {
  const j = p.jetGrout
  if (!(j.columnDiameter && j.columnDiameter > 0 && j.spacing && j.spacing > 0 && j.qSoil && j.qSoil > 0 && j.qColumn && j.qColumn > 0)) return null

  try {
    const result = jetGroutAdvanced({
      columnDiameter: j.columnDiameter,
      spacing: j.spacing,
      layout: j.layout ?? 'square',
      qSoil: j.qSoil,
      qColumn: j.qColumn,
      cSoil: j.cSoil,
      cColumn: j.cColumn,
      EsSoil: j.EsSoil,
      EsColumn: j.EsColumn,
      FS: 3
    })

    const steps: ReportCalculationStep[] = [
      { index: 1, symbol: 'Ac', title: 'Kolon kesit alanı', formula: 'Ac = π·d²/4', value: result.areaColumn, unit: 'm²' },
      { index: 2, symbol: 'Acell', title: 'Birim hücre alanı', formula: result.layout === 'square' ? 'Acell = s²' : 'Acell = √3/2·s²', value: result.cellArea, unit: 'm²' },
      { index: 3, symbol: 'ρ', title: 'Alan değiştirme oranı', formula: 'ρ = Ac/Acell', value: (result.areaReplacementRatio * 100), unit: '%' },
      { index: 4, symbol: 'qcomp', title: 'Kompozit taşıma gücü', formula: 'qcomp = ρ·qcol + (1-ρ)·qsoil', value: result.compositeCapacity, unit: 'kPa' },
      { index: 5, symbol: 'Ecomp', title: 'Kompozit modül', formula: 'Ecomp = ρ·Ecol + (1-ρ)·Esoil', value: result.compositeModulus ?? '—', unit: result.compositeModulus ? 'kPa' : '' },
      { index: 6, symbol: 'β', title: 'Gerilme konsantrasyonu', formula: 'β = (kolon yükü/ρ)', value: result.columnLoadShare / result.areaReplacementRatio, unit: '' }
    ]

    return {
      id: '4',
      title: 'Jet Grout Zemin İyileştirme',
      subtitle: 'Kompozit Zemin Yaklaşımı',
      method: 'Erol & Çekinmez Bayram (2018)',
      source: 'Erol & Çekinmez Bayram (2018), Jet Enjeksiyon Yöntemi, Bölüm 4-6',
      inputs: [
        { label: 'Kolon Çapı', value: fmt(j.columnDiameter), unit: 'm' },
        { label: 'Kolon Aralığı', value: fmt(j.spacing), unit: 'm' },
        { label: 'Yerleşim Düzeni', value: j.layout ?? 'square', unit: '' },
        { label: 'Zemin Taşıma Gücü', value: fmt(j.qSoil), unit: 'kPa' },
        { label: 'Kolon Taşıma Gücü', value: fmt(j.qColumn), unit: 'kPa' }
      ],
      steps,
      results: [
        { label: 'Alan Değiştirme Oranı', value: fmt(result.areaReplacementRatio * 100, 1), unit: '%' },
        { label: 'Kompozit Taşıma Gücü', value: fmt(result.compositeCapacity), unit: 'kPa' },
        { label: 'Kompozit Modül', value: result.compositeModulus ? fmt(result.compositeModulus) : '—', unit: result.compositeModulus ? 'kPa' : '' },
        { label: 'Kolon Yük Paylaşımı', value: fmt(result.columnLoadShare * 100, 1), unit: '%' },
        { label: 'Zemin Yük Paylaşımı', value: fmt(result.soilLoadShare * 100, 1), unit: '%' }
      ],
      notes: ['Kompozit parametreler ön tasarım/screening niteliğindedir. Nihai tasarım için saha deneyleri ve kalite kontrol gereklidir.']
    }
  } catch {
    return null
  }
}

export function ProfessionalEngineeringReport({ boreholes, labs, profile }: Props) {
  const p = useProjectInfo()

  const sections = useMemo(() => {
    const result: ReportSection[] = []
    const bearing = buildBearingSection(p, profile)
    if (bearing) result.push(bearing)
    
    const foundation = buildFoundationCheckSection(p)
    if (foundation) result.push(foundation)
    
    const settlement = buildSettlementSection(p, profile)
    if (settlement) result.push(settlement)
    
    const jetGrout = buildJetGroutSection(p)
    if (jetGrout) result.push(jetGrout)
    
    return result
  }, [p, profile])

  const reportData = {
    projectName: p.title,
    projectNo: p.projectNo,
    date: p.date,
    engineer: p.engineer,
    client: p.clientName,
    location: p.location,
    sections
  }

  const layers: TechnicalSectionLayer[] = useMemo(() => {
    if (!profile) return []
    return profile.layers.map(l => ({
      topDepth: l.topDepth,
      bottomDepth: l.bottomDepth,
      code: l.soilCode,
      name: l.soilName,
      colorClass: l.soilCode.toUpperCase().includes('CL') || l.soilCode.toUpperCase().includes('KI') ? 'clay' as const
        : l.soilCode.toUpperCase().includes('SA') || l.soilCode.toUpperCase().includes('KU') ? 'sand' as const
        : l.soilCode.toUpperCase().includes('SI') ? 'silt' as const
        : l.soilCode.toUpperCase().includes('GR') || l.soilCode.toUpperCase().includes('ÇA') ? 'gravel' as const
        : 'sand' as const,
      gamma: l.gamma,
      gammaSat: l.gammaSat,
      cohesion: l.cohesion,
      frictionAngle: l.frictionAngle,
      sptN: l.representativeN60
    }))
  }, [profile])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="professional-report">
      {/* Teknik Kesit Önizleme */}
      {layers.length > 0 && (
        <div className="report-section-preview">
          <h2>Zemin Profili Teknik Kesiti</h2>
          <TechnicalSection
            variant="profile"
            title="İdealize Zemin Profili"
            subtitle={profile?.methodology}
            totalDepth={profile?.layers[profile.layers.length - 1]?.bottomDepth ?? 10}
            layers={layers}
            groundwaterDepth={p.soilParameters.groundwaterDepth}
            foundationDepth={p.foundationParameters.footingDepth}
            footingWidth={p.foundationParameters.footingWidth}
          />
        </div>
      )}

      {/* Profesyonel Rapor */}
      <EngineeringReportProfessional data={reportData} onPrint={handlePrint} />
    </div>
  )
}

export default ProfessionalEngineeringReport
