import { useMemo } from 'react'
import { useProjectInfo } from '../../../core/state/project-store'
import { forceToBase, stressToBase, unitWeightToBase, momentToBase } from '../../../core/units/project-units'
import { bearingCapacity, tbdyBearingCapacity, foundationChecks } from '../../../core/calculations/engineering'
import { jetGroutEngineering, verifyJetGroutQC } from '../../../core/engineering/jet-grout-advanced'
import { calculateSubgradeReaction } from '../../../core/engineering/subgrade-reaction'
import { liquefactionProfile, type LiquefactionSptRecord } from '../../../core/engineering/liquefaction/liquefaction-profile'
import { calculateIdealizedSettlement } from '../../../core/engineering/idealized-settlement-engine'
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
        gammaSat: x.gammaSat == null && soil.saturatedUnitWeight == null ? undefined : unitWeightToBase(x.gammaSat ?? soil.saturatedUnitWeight, p.unitSystem),
        cohesion: stressToBase(x.cohesion ?? soil.cohesion, p.unitSystem),
        phi: x.frictionAngle ?? soil.frictionAngle
      }))
    })

    const designEligible = result.finalDesignEligible && !(p.geophysical.soilGroup === 'ZF' && !p.geophysical.siteSpecificResponseAnalysisCompleted)
    const designWarnings = [...result.warnings, ...(p.geophysical.soilGroup === 'ZF' && !p.geophysical.siteSpecificResponseAnalysisCompleted ? ['ZF zemin grubu için TBDY 16.5.1.3 sahaya özel zemin davranış analizi tamamlanmadan nihai tasarım uygunluğu verilemez.'] : [])]
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
        { label: 'Kullanım Oranı (η)', value: fmt(result.value.utilization * 100, 1), unit: '%', status: designEligible ? (result.value.utilization <= 1 ? 'ok' : 'fail') : 'warning' },
        { label: 'Tasarım durumu', value: designEligible ? (result.value.adequate ? 'UYGUN' : 'UYGUN DEĞİL') : 'ÖN DEĞERLENDİRME — NİHAİ TASARIM DEĞİL', unit: '', status: designEligible ? (result.value.adequate ? 'ok' : 'fail') : 'warning' }
      ],
      notes: designWarnings
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
      cu: soil.undrainedCohesion == null ? undefined : stressToBase(soil.undrainedCohesion, p.unitSystem),
      groundwaterDepth: soil.groundwaterDepth,
      foundationDepth: f.footingDepth,
      passiveResistanceCharacteristic: forceToBase(f.passiveResistanceCharacteristic, p.unitSystem),
      usePassiveResistance: f.usePassiveResistance,
      seismic: true,
      interfaceType: f.foundationInterface
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
        { label: 'Kayma Güvenlik Oranı', value: result.evaluable ? fmt(result.slidingFS) : 'VERİ EKSİK', unit: '', status: !result.evaluable ? 'warning' : result.slidingSafeResultant ? 'ok' : 'fail' },
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


function buildLiquefactionSection(
  p: ReturnType<typeof useProjectInfo>,
  b: BoreholeRecord | undefined,
  labs: LaboratoryRecord[],
  index: number
): ReportSection {
  const sds = p.seismic.sds
  const spt = b ? b.spt.filter(x => x.testType === 'SPT' && Number.isFinite(x.n2) && Number.isFinite(x.n3)).sort((a, z) => a.depth - z.depth) : []
  const gammaSatComplete = Boolean(b && b.lithology.length > 0 && b.lithology.every(l =>
    unitWeightToBase(l.saturatedUnitWeight ?? p.soilParameters.saturatedUnitWeight ?? 0, p.unitSystem) > 9.80665
  ))
  const missing = [
    !b ? 'sondaj' : undefined,
    b && b.groundwaterDepth == null ? 'YASS' : undefined,
    sds == null ? 'SDS' : undefined,
    p.seismic.magnitude == null ? 'Mw' : undefined,
    spt.length === 0 ? 'SPT' : undefined,
    !gammaSatComplete ? 'γsat' : undefined
  ].filter((x): x is string => Boolean(x))
  if (missing.length) {
    return {
      id: '5-'+index, title: 'Sıvılaşma ve Sıvılaşma Sonrası Etkiler',
      subtitle: 'TBDY 2018 Bölüm 16.6 ve Ek 16B',
      method: 'SPT tabanlı tetiklenme kontrolü',
      source: 'TBDY 2018 16.6.1–16.6.10 ve Ek 16B',
      inputs: [
        { label: 'Sondaj', value: b?.name ?? '—', unit: '' },
        { label: 'DTS / Zemin Grubu', value: (p.seismic.dts ?? '—') + ' / ' + (p.geophysical.soilGroup ?? '—'), unit: '' },
        { label: 'Eksik girdiler', value: missing.join(', '), unit: '' }
      ],
      steps: [],
      results: [{ label: 'Hesap durumu', value: 'VERİ EKSİK — NİHAİ SONUÇ ÜRETİLMEDİ', unit: '', status: 'warning' }],
      notes: ['Sıvılaşma hesabı için YASS, SDS, Mw, γsat ve SPT verileri gerekir. Test-zamanı σv0/u0/σ′v0 snapshotı olmayan satırlar nihai tetiklenme sonucu olarak kabul edilmez.']
    }
  }

  try {
    const rows: LiquefactionSptRecord[] = spt.map(record => {
      const lab = labs.filter(x => x.boreholeId === b!.id)
        .filter(x => record.depth >= x.depth && record.depth <= (x.depthTo ?? x.depth + 0.5))
        .sort((x, y) => Math.abs(x.depth - record.depth) - Math.abs(y.depth - record.depth))[0]
      const layer = b!.lithology.find(x => record.depth >= x.from && record.depth < x.to)
      return {
        depth: record.depth, depthTo: record.depthTo, nField: record.n2! + record.n3!,
        soil: record.soilCode ?? layer?.code,
        fineContent: lab?.finesContent ?? lab?.sieve200Passing ?? layer?.finesContent,
        plasticityIndex: lab?.plasticityIndex ?? (lab?.liquidLimit != null && lab?.plasticLimit != null ? lab.liquidLimit - lab.plasticLimit : undefined) ?? layer?.plasticityIndex,
        clayContent: lab?.hydrometer002, waterContent: lab?.waterContent,
        rodLengthM: record.rodLengthM, stressSnapshot: record.testStressSnapshot
      }
    })
    const result = liquefactionProfile({
      Mw: p.seismic.magnitude!, Sds: sds!, gwt: b!.groundwaterDepth!,
      layers: b!.lithology.map(l => ({
        top: l.from, bottom: l.to,
        gamma: unitWeightToBase(l.unitWeight ?? p.soilParameters.unitWeight, p.unitSystem),
        gammaSat: unitWeightToBase(l.saturatedUnitWeight ?? p.soilParameters.saturatedUnitWeight ?? 0, p.unitSystem),
        soil: l.code, finesContent: l.finesContent, plasticityIndex: l.plasticityIndex
      })),
      spt: rows, sptCorrection: p.sptCorrections, dts: p.seismic.dts,
      soilGroup: p.geophysical.soilGroup,
      continuousOrThickLens: p.soilParameters.liquefactionContinuousOrThickLens,
      foundationDepth: p.foundationParameters.footingDepth
    })
    const evaluated = result.rows.filter(row => Number.isFinite(row.FS))
    const minimumFS = evaluated.length ? Math.min(...evaluated.map(row => row.FS!)) : undefined
    const postRequired = result.rows.filter(row => row.postLiquefactionEvaluation === 'required').length
    const postReview = result.rows.some(row => row.postLiquefactionEvaluation === 'review')
    const postNotEvaluable = result.rows.some(row => row.postLiquefactionEvaluation === 'not-evaluable')
    const postStatus = postRequired > 0 ? 'GEREKLİ' : postReview ? 'ETKİLERİ İNCELE' : postNotEvaluable ? 'VERİ EKSİK' : 'KAPSAM DIŞI'
    const firstTrace = result.rows[0]?.trace ?? []
    return {
      id: '5-'+index, title: 'Sıvılaşma ve Sıvılaşma Sonrası Etkiler',
      subtitle: 'TBDY 2018 Bölüm 16.6 ve Ek 16B',
      method: result.method, source: result.source,
      inputs: [
        { label: 'Sondaj', value: b?.name ?? '—', unit: '' },
        { label: 'DTS / Zemin Grubu', value: (p.seismic.dts ?? '—') + ' / ' + (p.geophysical.soilGroup ?? '—'), unit: '' },
        { label: 'SDS / Mw', value: fmt(sds) + ' / ' + fmt(p.seismic.magnitude), unit: '' },
        { label: 'YASS', value: fmt(b?.groundwaterDepth), unit: 'm' },
        { label: 'SPT satırı', value: String(result.rows.length), unit: '' }
      ],
      steps: firstTrace.slice(0, 12).map((step, i) => ({
        index: i + 1, symbol: step.symbol, title: step.title, formula: step.formula,
        value: step.value ?? '—', unit: step.unit ?? '', note: step.note
      })),
      results: [
        { label: 'En düşük hesaplanan FS', value: fmt(minimumFS, 3), unit: '', status: minimumFS == null ? 'warning' : minimumFS < 1.10 ? 'fail' : 'ok' },
        { label: 'FS<1.10 satırı', value: String(postRequired), unit: 'adet', status: postRequired > 0 ? 'fail' : 'ok' },
        { label: 'Sıvılaşma sonrası inceleme', value: postStatus, unit: '', status: postRequired > 0 || postNotEvaluable ? 'warning' : 'ok' },
        { label: 'Veri durumu', value: result.rows.some(row => row.liquefactionCheck === 'not-evaluable') ? 'KISMEN / VERİ EKSİK' : 'SATIRLAR DEĞERLENDİRİLDİ', unit: '', status: result.rows.some(row => row.liquefactionCheck === 'not-evaluable') ? 'warning' : 'ok' }
      ],
      notes: [
        ...result.warnings,
        'Bu bölüm tetiklenme güvenliğini hesaplar; sıvılaşma sonrası kalıcı oturma, yanal yayılma ve artık dayanım hesabı üretmez. FS<1.10 durumunda TBDY 16.6.7, 16.6.9 ve 16.6.10 için proje özelinde ek değerlendirme gerekir.'
      ]
    }
  } catch (error) {
    return {
      id: '5-'+index, title: 'Sıvılaşma ve Sıvılaşma Sonrası Etkiler',
      subtitle: 'Hesap üretilemedi', method: 'TBDY 2018 Bölüm 16.6 + Ek 16B',
      source: 'ZeminLab sıvılaşma motoru',
      inputs: [{ label: 'Sondaj', value: b?.name ?? '—', unit: '' }],
      steps: [], results: [{ label: 'Hesap durumu', value: 'VERİ EKSİK / GEÇERSİZ', unit: '', status: 'warning' }],
      notes: [error instanceof Error ? error.message : 'Sıvılaşma girdileri doğrulanamadı.']
    }
  }
}

function buildSettlementSection(p: ReturnType<typeof useProjectInfo>, profile: IdealizedSoilProfile | undefined, boreholes: BoreholeRecord[]): ReportSection | null {
  const f = p.foundationParameters
  const profileBorehole=boreholes.find(x=>x.id===profile?.settlementGroundwaterBoreholeId)??boreholes.find(x=>profile?.sourceBoreholeIds.includes(x.id))??boreholes[0]
  const B = f.footingWidth, L = f.footingLength, Df = f.footingDepth
  if (!profile || profile.status !== 'SABİTLENDİ' || !(B > 0 && L > 0 && Df >= 0)) return null

  try {
    const qGross = forceToBase(f.structuralWeight, p.unitSystem) / (B * L)
    const settlementMethod=profile.settlementMethod??'burland-burbidge'
    const result = calculateIdealizedSettlement({
      profile, method: settlementMethod, B, L, Df, qGross,
      groundwaterDepth: profileBorehole?.groundwaterDepth??p.soilParameters.groundwaterDepth,
      timeYears:profile.settlementTimeYears,secondaryStartTimeYears:profile.secondaryStartTimeYears
    })
    const stressFormula=result.method==='boussinesq'?'Boussinesq dikdörtgen alan integrasyonu':result.method==='schmertmann'?'Schmertmann Iz gerinim integrasyonu':result.method==='burland-burbidge'?'Burland & Burbidge N60 tabanlı bağıntı':'2:1: Δσz=q·B·L/[(B+z)(L+z)]'
    const immediateFormula=result.method==='schmertmann'?'si=C1·C2·C3·qnet·Iz·H/Es':result.method==='burland-burbidge'?'Burland & Burbidge korelasyonu; kohezyonlu katman konsolidasyonu ayrıca eklenir':'si=Σ(Δσz·H/M)'
    const steps: ReportCalculationStep[] = result.layers.flatMap((layer, index) => ([
      { index: index * 4 + 1, symbol: 'Δσz', title: 'Katman ' + (index + 1) + ' gerilme artışı', formula: stressFormula, value: layer.deltaSigma, unit: 'kPa', note: layer.note ?? layer.status },
      { index: index * 4 + 2, symbol: 'si', title: 'Katman ' + (index + 1) + ' ani oturma', formula: immediateFormula, value: layer.immediateSettlement, unit: 'mm', note: layer.status },
      { index: index * 4 + 3, symbol: 'sc', title: 'Katman ' + (index + 1) + ' konsolidasyon oturması', formula: 'Cc/Cr, e0, σ′pc ve efektif gerilmelerle', value: layer.consolidationSettlement, unit: 'mm', note: layer.status },
      { index: index * 4 + 4, symbol: 'ssec', title: 'Katman ' + (index + 1) + ' ikincil oturma', formula: 'Cα·H/(1+e0)·log10(t/t₁)', value: layer.secondarySettlement, unit: 'mm', note: layer.status }
    ]))

    return {
      id: '3',
      title: 'Oturma Hesabı',
      subtitle: 'Katman bazlı 2:1 gerilme dağılımı + elastik ve konsolidasyon bileşenleri',
      method: 'İdealize Zemin Profili · Elastik tabaka integrasyonu',
      source: result.source,
      inputs: [
        { label: 'Temel Genişliği (B)', value: fmt(B), unit: 'm' },
        { label: 'Temel Uzunluğu (L)', value: fmt(L), unit: 'm' },
        { label: 'Temel Derinliği (Df)', value: fmt(Df), unit: 'm' },
        { label: 'Brüt temel basıncı (q)', value: fmt(qGross), unit: 'kPa' },
        { label: 'Yeraltı suyu derinliği', value: fmt(profileBorehole?.groundwaterDepth??p.soilParameters.groundwaterDepth), unit: 'm' },
        { label: 'Hesap yöntemi', value: settlementMethod, unit: '' },
        { label: 'Hesap süresi t', value: fmt(profile.settlementTimeYears), unit: 'yıl' },
        { label: 'İkincil oturma başlangıcı t₁', value: fmt(profile.secondaryStartTimeYears), unit: 'yıl' },
        { label: 'Zemin profili', value: profile.status, unit: '' }
      ],
      steps,
      results: [
        { label: 'Ani oturma', value: fmt(result.totalImmediate, 2), unit: 'mm', status: result.ready ? 'ok' : 'warning' },
        { label: 'Konsolidasyon oturması', value: fmt(result.totalConsolidation, 2), unit: 'mm', status: result.ready ? 'ok' : 'warning' },
        { label: 'İkincil oturma', value: fmt(result.totalSecondary, 2), unit: 'mm', status: result.ready ? 'ok' : 'warning' },
        { label: 'Toplam oturma', value: fmt(result.totalSettlement, 2), unit: 'mm', status: result.ready && result.totalSettlement < 25 ? 'ok' : 'warning' },
        { label: 'Hesap durumu', value: result.ready ? 'GİRDİLER TAMAM' : 'VERİ EKSİK — NİHAİ SONUÇ DEĞİL', unit: '', status: result.ready ? 'ok' : 'warning' }
      ],
      notes: result.warnings
    }
  } catch (error) {
    return {
      id: '3', title: 'Oturma Hesabı', subtitle: 'Hesap üretilemedi',
      method: 'İdealize Zemin Profili', source: 'ZeminLab oturma motoru',
      inputs: [{ label: 'Temel B/L/Df', value: [B, L, Df].map(v => fmt(v)).join(' / '), unit: 'm' }],
      steps: [], results: [{ label: 'Hesap durumu', value: 'VERİ EKSİK / GEÇERSİZ', unit: '', status: 'warning' }],
      notes: [error instanceof Error ? error.message : 'Oturma girdileri doğrulanamadı.']
    }
  }
}


function buildSubgradeReactionSection(p: ReturnType<typeof useProjectInfo>, profile?: IdealizedSoilProfile): ReportSection {
  const f=p.foundationParameters,B=f.footingWidth,L=f.footingLength
  const layer=profile?.layers.find(x=>x.topDepth<=f.footingDepth&&x.bottomDepth>f.footingDepth)??profile?.layers.find(x=>x.bottomDepth>f.footingDepth),Es=layer?.elasticModulus,nu=layer?.poissonRatio
  const inputs=[
    {label:'Temel genişliği B',value:fmt(B),unit:'m'},
    {label:'Temel uzunluğu L',value:fmt(L),unit:'m'},
    {label:'Young modülü Es',value:Es==null?'—':fmt(stressToBase(Es,profile?.unitSystem??p.unitSystem)),unit:'kPa'},
    {label:'Poisson oranı ν',value:fmt(nu),unit:''}
  ]
  if(!profile||profile.status!=='SABİTLENDİ'||!(B>0&&L>0)||Es==null||nu==null){
    return {id:'6',title:'Yatak Katsayısı (ks)',subtitle:'Elastik yarı-uzay eşdeğeri',method:'Es ve ν ile elastik yaklaşım',source:'Elastik yarı-uzay yaklaşımı; nihai modelleme girdisi değildir',inputs,steps:[],results:[{label:'Hesap durumu',value:'VERİ EKSİK — Es, ν ve sabitlenmiş profil gerekir',unit:'',status:'warning'}],notes:['Yatak katsayısı temel geometrisine, zemin rijitliğine ve seçilen modele bağlıdır; evrensel bir zemin sabiti değildir. M veya Moed, Es yerine kullanılamaz.']}
  }
  try{
    const result=calculateSubgradeReaction({B,L,Es:stressToBase(Es,profile.unitSystem??p.unitSystem),nu,method:'elastic',unitSystem:'kN-m'})
    return {id:'6',title:'Yatak Katsayısı (ks)',subtitle:'Elastik yarı-uzay eşdeğeri',method:result.method,source:result.source,inputs,steps:[{index:1,symbol:'ks',title:'Eşdeğer yatak katsayısı',formula:result.formula,value:result.ks,unit:'kN/m³'}],results:[{label:'Eşdeğer ks',value:fmt(result.ks),unit:'kN/m³',status:'warning'}],notes:[...result.assumptions,'Bu sonuç, SAP2000/Winkler yayları için ön değerlendirme değeridir; temel boyutuna ve seçilen idealizasyona duyarlıdır.']}
  }catch(error){
    return {id:'6',title:'Yatak Katsayısı (ks)',subtitle:'Hesap üretilemedi',method:'Elastik yaklaşım',source:'ZeminLab yatak katsayısı motoru',inputs,steps:[],results:[{label:'Hesap durumu',value:'VERİ EKSİK / GEÇERSİZ',unit:'',status:'warning'}],notes:[error instanceof Error?error.message:'Yatak katsayısı girdileri doğrulanamadı.']}
  }
}

function buildJetGroutSection(p: ReturnType<typeof useProjectInfo>): ReportSection {
  const j = p.jetGrout
  const qcInput={
    requiredUcs:j.qcRequiredUcs==null?undefined:stressToBase(j.qcRequiredUcs,p.unitSystem),
    measuredUcs:j.qcMeasuredUcs==null?undefined:stressToBase(j.qcMeasuredUcs,p.unitSystem),
    requiredDiameter:j.qcRequiredDiameter,measuredDiameter:j.qcMeasuredDiameter,
    requiredCoreSamples:j.qcRequiredCoreSamples,measuredCoreSamples:j.qcMeasuredCoreSamples,
    continuityVerified:j.qcContinuityVerified,constructionLogsVerified:j.qcConstructionLogsVerified,testReportReviewed:j.qcTestReportReviewed
  }
  const designInputsComplete=Boolean(j.columnDiameter&&j.columnDiameter>0&&j.spacing&&j.spacing>0&&j.qSoil&&j.qSoil>0&&j.qColumn&&j.qColumn>0&&p.foundationParameters.footingWidth>0&&p.foundationParameters.footingLength>0&&p.foundationParameters.structuralWeight>0)
  if(!designInputsComplete){
    const qc=verifyJetGroutQC(qcInput)
    return {id:'4',title:'Jet Grout Zemin İyileştirme ve Saha Kalite Kontrolü',subtitle:'Kompozit tasarım girdileri ve saha doğrulaması',method:'Ön değerlendirme / proje kabul kriterleri',source:'Erol & Çekinmez Bayram (2018); proje kalite kontrol şartnamesi',inputs:[{label:'Kolon çapı',value:fmt(j.columnDiameter),unit:'m'},{label:'Kolon aralığı',value:fmt(j.spacing),unit:'m'}],steps:[],results:[{label:'Kompozit hesap',value:'GİRDİ EKSİK',unit:'',status:'warning'},{label:'Saha kalite kontrolü',value:qc.status==='pass'?'UYGUN':qc.status==='fail'?'UYGUN DEĞİL':'VERİ EKSİK',unit:'',status:qc.status==='pass'?'ok':qc.status==='fail'?'fail':'warning'}],notes:qc.warnings}
  }
  try {
    const result = jetGroutEngineering({
      columnDiameter: j.columnDiameter,
      spacing: j.spacing,
      layout: j.layout ?? 'square',
      qSoil: stressToBase(j.qSoil, p.unitSystem),
      qColumn: stressToBase(j.qColumn, p.unitSystem),
      cSoil: j.cSoil == null ? undefined : stressToBase(j.cSoil, p.unitSystem),
      cColumn: j.cColumn == null ? undefined : stressToBase(j.cColumn, p.unitSystem),
      EsSoil: j.EsSoil == null ? undefined : stressToBase(j.EsSoil, p.unitSystem),
      EsColumn: j.EsColumn == null ? undefined : stressToBase(j.EsColumn, p.unitSystem),
      load:forceToBase(p.foundationParameters.structuralWeight,p.unitSystem),
      foundationArea:p.foundationParameters.footingWidth*p.foundationParameters.footingLength,
      foundationThickness:j.foundationThickness,soilPoissonRatio:j.soilPoissonRatio,
      verticalLoad:forceToBase(p.foundationParameters.structuralWeight,p.unitSystem),
      horizontalLoad:Math.hypot(forceToBase(p.foundationParameters.vtX,p.unitSystem),forceToBase(p.foundationParameters.vtY,p.unitSystem)),
      cohesion:j.interfaceCohesion==null?undefined:stressToBase(j.interfaceCohesion,p.unitSystem),frictionAngle:j.interfaceFrictionAngle,
      qc:qcInput
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
        { label: 'Zemin Taşıma Gücü', value: fmt(stressToBase(j.qSoil, p.unitSystem)), unit: 'kPa' },
        { label: 'Kolon Taşıma Gücü', value: fmt(stressToBase(j.qColumn, p.unitSystem)), unit: 'kPa' }
      ],
      steps,
      results: [
        { label: 'Alan Değiştirme Oranı', value: fmt(result.areaReplacementRatio * 100, 1), unit: '%' },
        { label: 'Kompozit Taşıma Gücü', value: fmt(result.compositeCapacity), unit: 'kPa' },
        { label: 'Kompozit Modül', value: result.compositeModulus ? fmt(result.compositeModulus) : '—', unit: result.compositeModulus ? 'kPa' : '' },
        { label: 'Kolon Yük Paylaşımı', value: fmt(result.columnLoadShare * 100, 1), unit: '%' },
        { label: 'Zemin Yük Paylaşımı', value: fmt(result.soilLoadShare * 100, 1), unit: '%' },
        { label: 'Saha kalite kontrolü', value: result.qcVerification.status==='pass'?'UYGUN':result.qcVerification.status==='fail'?'UYGUN DEĞİL':'VERİ EKSİK', unit: '', status: result.qcVerification.status==='pass'?'ok':result.qcVerification.status==='fail'?'fail':'warning' }
      ],
      notes: [...result.warnings, 'Kompozit parametreler ön tasarım/screening niteliğindedir. Nihai tasarım için saha deneyleri ve kalite kontrol gereklidir.']
    }
  } catch {
    return null
  }
}

export function ProfessionalEngineeringReport({ profile }: Props) {
  const p = useProjectInfo()

  const sections = useMemo(() => {
    const result: ReportSection[] = []
    const bearing = buildBearingSection(p, profile)
    if (bearing) result.push(bearing)
    
    const foundation = buildFoundationCheckSection(p)
    if (foundation) result.push(foundation)
    
    const settlement = buildSettlementSection(p, profile, boreholes)
    if (settlement) result.push(settlement)

    const liquefactionSections = boreholes.length ? boreholes.map((borehole, index) => buildLiquefactionSection(p, borehole, labs, index)) : [buildLiquefactionSection(p, undefined, labs, 0)]
    result.push(...liquefactionSections)

    const jetGrout = buildJetGroutSection(p)
    result.push(jetGrout)
    result.push(buildSubgradeReactionSection(p, profile))

    return result
  }, [p, profile, boreholes, labs])

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
