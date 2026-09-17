import { useMemo, useState } from 'react'
import { foundationChecks, liquefaction, SOURCE_NOTES, jetGroutAdvanced } from '../../core/calculations/engineering'
import { settlement as settlementEngine, type CalculationStep } from '../../core/engineering/calculation-engine'
import { defaultElasticModulusMethod, estimateElasticModulus } from '../../core/engineering/correlation-registry'
import type { BoreholeRecord, LaboratoryRecord } from '../../core/models/field-data'
import { deriveSptValues } from '../../core/engineering/field-calculations'
import { liquefactionProfile, type LiquefactionSptRecord } from '../../core/engineering/liquefaction-profile'
import { forceToBase, stressToBase, stressFromBase, PROJECT_UNIT_LABELS } from '../../core/units/project-units'
import { useProjectInfo } from '../../core/state/project-store'
import { Card, Field, Frame, Metric, Source, type ScreenId } from '../workspace/WorkspaceShell'
import { CalculationTrace } from '../components/CalculationTrace'

const finite = (v: number) => Number.isFinite(v) && v !== 0

export function Dashboard({ onNavigate }: { onNavigate: (id: ScreenId) => void }) {
  const p = useProjectInfo()
  const items: [string, string, ScreenId][] = [
    ['01', 'Proje bilgileri', 'project-info'], ['02', 'Sondaj / SPT / Laboratuvar', 'field'],
    ['03', 'Sondaj logları', 'borehole-log'], ['04', 'Zemin profili', 'profile'],
    ['05', 'Taşıma gücü', 'bearing-capacity'], ['06', 'Oturma', 'settlement'],
    ['07', 'Sıvılaşma', 'liquefaction'], ['08', 'Temel tasarımı', 'foundation'],
    ['09', 'Jet Grout', 'jet-grout'], ['10', 'Mühendislik raporu', 'report']
  ]
  return (
    <Frame screen="dashboard">
      <div className="dashboard-grid">
        <Card title="PROJE DURUMU">
          <div className="form-grid">
            <Metric label="Proje" value={p.title || 'Yeni Proje'} />
            <Metric label="Proje No" value={p.projectNo || '—'} />
            <Metric label="Birim Sistemi" value={p.unitSystem} />
            <Metric label="Jeofizik sınıf" value={p.geophysical.soilGroup || '—'} />
          </div>
        </Card>
        <Card title="MÜHENDİSLİK İŞ AKIŞI">
          <div className="workflow">
            {items.map(([n, label, id]) => <button key={id} onClick={() => onNavigate(id)}><b>{n}</b><span>{label}</span></button>)}
          </div>
        </Card>
      </div>
    </Frame>
  )
}

export function Settlement({ boreholes = [] }: { boreholes?: BoreholeRecord[] }) {
  const p = useProjectInfo()
  const s = p.soilParameters
  const f = p.foundationParameters
  const [selected, setSelected] = useState(boreholes[0]?.id ?? '')
  const b = boreholes.find(x => x.id === selected) ?? boreholes[0]
  const spt = b?.spt.find(x => x.testType === 'SPT' && Number.isFinite(x.n2) && Number.isFinite(x.n3))
  const derived = b && spt ? deriveSptValues(b, spt) : undefined
  const soilType = b && s.finesContent >= 15 ? 'sand-with-fines' : 'sand'
  const correlationId = defaultElasticModulusMethod(soilType)
  const correlation = derived ? estimateElasticModulus(correlationId, derived.n60) : undefined
  const q = finite(f.verticalLoad) && finite(f.footingWidth)
    ? stressToBase(forceToBase(f.verticalLoad, p.unitSystem) / Math.max(f.footingWidth * f.footingLength, 1e-9), p.unitSystem)
    : 0
  const Es = correlation ? correlation.value * 98.0665 : 0
  const ready = !!correlation && q > 0 && f.footingWidth > 0
  const result = useMemo(() => ready ? settlementEngine({ B: f.footingWidth, q, Es, nu: 0.3 }) : undefined, [ready, f.footingWidth, q, Es])
  const trace: CalculationStep[] = result ? [
    { symbol: 'N₆₀', title: 'SPT ile düzeltilmiş değer', formula: 'N₆₀ = N·Cₑ·Cᵦ·Cₛ·Cᵣ', value: derived!.n60 },
    { symbol: 'Eₛ', title: `Korelasyondan elastisite modülü · ${correlation!.name}`, formula: correlation!.formula, value: Es, unit: 'base stress' },
    { symbol: 'q', title: 'Temel etkime basıncı', formula: 'q = N / (B·L)', value: stressFromBase(q, p.unitSystem), unit: PROJECT_UNIT_LABELS.stress },
    { symbol: 'sᵢ', title: 'Elastik oturma', formula: 'sᵢ = q·B·(1−ν²)/Eₛ', value: result.value.immediate * 1000, unit: 'mm' },
    { symbol: 'sₜ', title: 'Toplam mevcut oturma', formula: 'sₜ = sᵢ + s꜀ ; s꜀ = 0 çünkü Cc/e₀/σ′₀/Δσ′ verisi seçilmedi', value: result.value.total * 1000, unit: 'mm' }
  ] : []

  return (
    <Frame screen="settlement">
      <Source>{SOURCE_NOTES.settlement} Korelasyonlar gizli varsayım olarak değil, seçilebilir ve raporlanabilir kaynak olarak kullanılır.</Source>
      {boreholes.length > 0 && (
        <Card title="SAHA VERİSİ">
          <label>Sondaj<select value={b?.id ?? ''} onChange={e => setSelected(e.target.value)}>{boreholes.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          {spt && <div className="metric-strip"><Metric label="SPT" value={`${spt.depth.toFixed(2)} m`} /><Metric label="N60" value={derived!.n60.toFixed(2)} /><Metric label="Eₛ korelasyonu" value={correlation?.name ?? '—'} /></div>}
        </Card>
      )}
      {!ready ? (
        <Card title="HESAP İÇİN VERİ DURUMU"><div className="inline-empty">Elastik oturma için yük, temel geometrisi ve SPT'den türetilen elastisite parametresi gereklidir. Uygulanan korelasyon: {correlation?.name ?? 'SPT verisi bekleniyor'}.</div></Card>
      ) : (
        <>
          <div className="metric-strip"><Metric label="Elastik" value={(result!.value.immediate * 1000).toFixed(2)} unit="mm" /><Metric label="Toplam" value={(result!.value.total * 1000).toFixed(2)} unit="mm" tone="primary" /></div>
          <CalculationTrace title="Oturma hesap zinciri" rows={trace} source={`${correlation!.source} · ${SOURCE_NOTES.settlement}`} />
        </>
      )}
    </Frame>
  )
}

export function Liquefaction({ boreholes = [], labs = [] }: { boreholes?: BoreholeRecord[]; labs?: LaboratoryRecord[] }) {
  const p = useProjectInfo()
  const [selected, setSelected] = useState(boreholes[0]?.id ?? '')
  const b = boreholes.find(x => x.id === selected) ?? boreholes[0]
  const sds = p.seismic.ss != null && p.seismic.fs != null ? p.seismic.ss * p.seismic.fs : undefined
  const validSpt = useMemo(() => (b?.spt ?? [])
    .filter(x => x.testType === 'SPT' && Number.isFinite(x.n2) && Number.isFinite(x.n3))
    .sort((a, c) => a.depth - c.depth), [b])
  const profileInput = useMemo(() => {
    if (!b || !p.seismic.magnitude || sds == null || validSpt.length === 0) return undefined
    const rows: LiquefactionSptRecord[] = validSpt.map(record => {
      const lab = labs
        .filter(x => x.boreholeId === b.id)
        .filter(x => record.depth >= x.depth && record.depth <= (x.depthTo ?? x.depth + 0.5))
        .sort((x, y) => Math.abs(x.depth - record.depth) - Math.abs(y.depth - record.depth))[0]
      const layer = b.lithology.find(x => record.depth >= x.from && record.depth <= x.to)
      const cfg = record.correction ?? {}
      return {
        depth: record.depth,
        nField: record.n2! + record.n3!,
        fineContent: cfg.fineContent ?? lab?.finesContent ?? layer?.finesContent,
        energyRatio: cfg.energyRatio,
        boreholeDiameterMm: b.drillingDiameter,
        sampler: cfg.samplerCorrection === 1.2 ? 'without-liner' : 'standard',
        rodLengthM: undefined
      }
    })
    return liquefactionProfile({
      Mw: p.seismic.magnitude,
      Sds: sds,
      gwt: b.groundwaterDepth ?? Number.POSITIVE_INFINITY,
      layers: b.lithology.map(l => ({ top: l.from, bottom: l.to, gamma: l.unitWeight ?? 0, gammaSat: l.saturatedUnitWeight ?? l.unitWeight ?? 0, soil: l.code })),
      spt: rows,
      applyDilatancy: false
    })
  }, [b, labs, p.seismic.magnitude, sds, validSpt])

  return (
    <Frame screen="liquefaction">
      <Source>{SOURCE_NOTES.liquefaction} Hesap artık seçilen sondajdaki tüm geçerli SPT seviyelerini birlikte değerlendirir. Sonuçlar proje verisi ve TBDY 2018 Ek 16B hesap zinciri üzerinden raporlanır.</Source>
      {!b ? (
        <Card title="SONDAJ VERİSİ BEKLENİYOR"><div className="inline-empty">Sıvılaşma hesabı için en az bir sondaj ve hesaplanabilir SPT kaydı gerekir.</div></Card>
      ) : (
        <>
          <Card title="HESAP KATMANI">
            <div className="form-grid">
              <label>Sondaj<select value={b.id} onChange={e => setSelected(e.target.value)}>{boreholes.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
              <Metric label="SPT noktası" value={validSpt.length} />
              <Metric label="Laboratuvar" value={labs.filter(x => x.boreholeId === b.id).length} />
              <Metric label="Yeraltı suyu" value={Number.isFinite(b.groundwaterDepth) ? `${b.groundwaterDepth!.toFixed(2)} m` : '—'} />
              <Metric label="Mw" value={p.seismic.magnitude ?? '—'} />
              <Metric label="SDS" value={sds != null ? sds.toFixed(3) : '—'} />
            </div>
          </Card>
          {!profileInput ? (
            <Card title="HESAP İÇİN EKSİK VERİ"><div className="inline-empty">Sondaj, SPT, deprem büyüklüğü ve SDS birlikte sağlanmalıdır. Geçerli SPT noktası bulunamadıysa önce saha verisi tamamlanmalıdır.</div></Card>
          ) : (
            <>
              {profileInput.warnings.length > 0 && <Card title="VERİ UYARILARI"><div className="inline-empty">{profileInput.warnings.join(' ')}</div></Card>}
              <Card title="DERİNLİK PROFİLİ">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>z (m)</th><th>Zemin</th><th>IDI %</th><th>σv (kPa)</th><th>σ′v (kPa)</th><th>N60</th><th>(N1)60</th><th>(N1)60f</th><th>CRR7.5</th><th>τdeprem</th><th>FS</th></tr></thead>
                    <tbody>{profileInput.rows.map((row, i) => <tr key={`${row.depth}-${i}`}>
                      <td>{row.depth.toFixed(2)}</td><td>{row.soil ?? '—'}</td><td>{row.fineContent != null ? row.fineContent.toFixed(1) : '—'}</td>
                      <td>{row.sigmaV.toFixed(2)}</td><td>{row.sigmaVPrime.toFixed(2)}</td><td>{row.n60.toFixed(2)}</td><td>{row.n1_60.toFixed(2)}</td><td>{row.n1_60f.toFixed(2)}</td>
                      <td>{row.crrM75 != null ? row.crrM75.toFixed(4) : '—'}</td><td>{row.tauEarthquake != null ? row.tauEarthquake.toFixed(2) : '—'}</td>
                      <td>{row.FS != null ? row.FS.toFixed(3) : '—'}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </Card>
              {profileInput.rows.length > 0 && (
                <CalculationTrace title="Seçili ilk SPT için ayrıntılı hesap zinciri" source={profileInput.source} rows={profileInput.rows[0].trace} />
              )}
            </>
          )}
        </>
      )}
    </Frame>
  )
}

export function Foundation() {
  const p = useProjectInfo()
  const f = p.foundationParameters
  const ready = finite(f.footingWidth) && finite(f.footingLength) && finite(f.verticalLoad)
  const r = ready ? foundationChecks({ B: f.footingWidth, L: f.footingLength, N: forceToBase(f.verticalLoad, p.unitSystem), V: forceToBase(f.horizontalLoad, p.unitSystem), Mx: forceToBase(f.momentX, p.unitSystem), My: forceToBase(f.momentY, p.unitSystem) }) : undefined
  return (
    <Frame screen="foundation">
      <Source>{SOURCE_NOTES.foundation}</Source>
      {!ready ? (
        <Card title="TEMEL VERİSİ BEKLENİYOR"><div className="inline-empty">Geometri ve yükler Proje Bilgileri / temel tanımından bağlanmalıdır.</div></Card>
      ) : (
        <>
          <div className="metric-strip">
            <Metric label="eX" value={r!.ex.toFixed(3)} unit="m" />
            <Metric label="eY" value={r!.ey.toFixed(3)} unit="m" />
            <Metric label="qort" value={stressFromBase(r!.qAvg, p.unitSystem).toFixed(3)} unit={PROJECT_UNIT_LABELS.stress} />
            <Metric label="qmax" value={stressFromBase(r!.qMax, p.unitSystem).toFixed(3)} unit={PROJECT_UNIT_LABELS.stress} />
            <Metric label="qmin" value={stressFromBase(r!.qMin, p.unitSystem).toFixed(3)} unit={PROJECT_UNIT_LABELS.stress} />
          </div>
          <CalculationTrace title="Temel gerilme ve eksantriklik hesabı" source={SOURCE_NOTES.foundation} rows={[
            { symbol: 'eₓ', title: 'Eksantriklik', formula: 'eₓ = Mᵧ / N', value: r!.ex, unit: 'm' },
            { symbol: 'eᵧ', title: 'Eksantriklik', formula: 'eᵧ = Mₓ / N', value: r!.ey, unit: 'm' },
            { symbol: 'q̄', title: 'Ortalama taban gerilmesi', formula: 'q̄ = N / (B·L)', value: stressFromBase(r!.qAvg, p.unitSystem), unit: PROJECT_UNIT_LABELS.stress },
            { symbol: 'qmax', title: 'Maksimum taban gerilmesi', formula: 'qmax = q̄[1 + 6eₓ/L + 6eᵧ/B]', value: stressFromBase(r!.qMax, p.unitSystem), unit: PROJECT_UNIT_LABELS.stress },
            { symbol: 'qmin', title: 'Minimum taban gerilmesi', formula: 'qmin = q̄[1 − 6eₓ/L − 6eᵧ/B]', value: stressFromBase(r!.qMin, p.unitSystem), unit: PROJECT_UNIT_LABELS.stress },
            { symbol: 'FSv', title: 'Kayma güvenliği', formula: 'FS = R / V', value: r!.slidingFS }
          ]} />
        </>
      )}
    </Frame>
  )
}

export function JetGrout() {
  const [d, setD] = useState('')
  const [spacing, setSpacing] = useState('')
  const [soil, setSoil] = useState('')
  const [column, setColumn] = useState('')
  const [soilEs, setSoilEs] = useState('')
  const [columnEs, setColumnEs] = useState('')
  const [layout, setLayout] = useState<'square' | 'triangular'>('square')
  const [load, setLoad] = useState('')
  const [area, setArea] = useState('')
  const ready = [d, spacing, soil, column].every(x => x !== '' && Number(x) > 0)
  const r = ready ? jetGroutAdvanced({
    columnDiameter: Number(d), spacing: Number(spacing), layout,
    qSoil: Number(soil), qColumn: Number(column),
    EsSoil: Number(soilEs) > 0 ? Number(soilEs) : undefined,
    EsColumn: Number(columnEs) > 0 ? Number(columnEs) : undefined,
    load: Number(load) > 0 ? Number(load) : undefined,
    foundationArea: Number(area) > 0 ? Number(area) : undefined
  }) : undefined
  return (
    <Frame screen="jet-grout">
      <Source>{SOURCE_NOTES.jetGroutAdvanced}</Source>
      <Card title="JET GROUT BİRİM HÜCRESİ">
        <div className="form-grid">
          <Field label="Kolon çapı (m)" value={d} onChange={setD} />
          <Field label="Aks aralığı (m)" value={spacing} onChange={setSpacing} />
          <label>Yerleşim<select value={layout} onChange={e => setLayout(e.target.value as 'square' | 'triangular')}><option value="square">Kare</option><option value="triangular">Üçgen</option></select></label>
          <Field label="Zemin taşıma kapasitesi" value={soil} onChange={setSoil} />
          <Field label="Jet grout kolon kapasitesi" value={column} onChange={setColumn} />
          <Field label="Zemin Es (opsiyonel)" value={soilEs} onChange={setSoilEs} />
          <Field label="Kolon Es (opsiyonel)" value={columnEs} onChange={setColumnEs} />
          <Field label="Temel yükü (opsiyonel)" value={load} onChange={setLoad} />
          <Field label="Temel alanı (opsiyonel)" value={area} onChange={setArea} />
        </div>
      </Card>
      {!r ? (
        <Card title="HESAP İÇİN VERİ DURUMU"><div className="inline-empty">Birim hücre hesabı için kolon çapı, aks aralığı, zemin kapasitesi ve kolon kapasitesi gereklidir.</div></Card>
      ) : (
        <>
          <div className="metric-strip">
            <Metric label="A꜀" value={r.areaColumn.toFixed(4)} unit="m²" />
            <Metric label="Hücre alanı" value={r.cellArea.toFixed(4)} unit="m²" />
            <Metric label="Alan oranı" value={(r.areaReplacementRatio * 100).toFixed(2)} unit="%" />
            <Metric label="Kompozit kapasite" value={r.compositeCapacity.toFixed(3)} />
            <Metric label="Kolon yük payı" value={(r.columnLoadShare * 100).toFixed(1)} unit="%" />
          </div>
          <CalculationTrace title="Jet Grout kompozit hesap zinciri" source={SOURCE_NOTES.jetGroutAdvanced} rows={[
            { symbol: 'A꜀', title: 'Kolon kesit alanı', formula: 'A꜀ = πd²/4', value: r.areaColumn, unit: 'm²' },
            { symbol: 'Acell', title: `${layout === 'triangular' ? 'Üçgen' : 'Kare'} birim hücre alanı`, formula: layout === 'triangular' ? 'Acell = √3·s²/2' : 'Acell = s²', value: r.cellArea, unit: 'm²' },
            { symbol: 'ρ', title: 'Alan değiştirme oranı', formula: 'ρ = A꜀/Acell', value: r.areaReplacementRatio },
            { symbol: 'qcomp', title: 'Kompozit taşıma kapasitesi', formula: 'qcomp = ρ·qcolumn + (1−ρ)·qsoil', value: r.compositeCapacity },
            { symbol: 'ηL', title: 'Kolon yük payı', formula: 'Es oranından birim hücre yük paylaşımı', value: r.columnLoadShare },
            ...(r.compositeModulus != null ? [{ symbol: 'Ecomp', title: 'Kompozit elastisite modülü', formula: 'Ecomp = ρ·Es,column + (1−ρ)·Es,soil', value: r.compositeModulus }] : []),
            ...(r.capacityFS != null ? [{ symbol: 'FS', title: 'Temel yüküne göre kapasite güvenliği', formula: 'FS = qcomp·A / P', value: r.capacityFS }] : []),
            ...(r.treatedSettlementFactor != null ? [{ symbol: 'Rₛ', title: 'İyileştirilmiş oturma katsayısı', formula: 'Rₛ = 1/[1+(n−1)ρ]', value: r.treatedSettlementFactor }] : [])
          ]} />
        </>
      )}
    </Frame>
  )
}
