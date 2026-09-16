import { useMemo, useState } from 'react'
import { designSpectrum, spectrumTable } from '../../../core/calculations/seismic'
import { Card, Field, Frame, Metric, Source, Table } from '../workspace/WorkspaceShell'

function SpectrumChart({ points, ta, tb, tl }: { points: { period: number; acceleration: number }[]; ta: number; tb: number; tl: number }) {
  const width = 860
  const height = 300
  const pad = { left: 58, right: 22, top: 18, bottom: 42 }
  const maxX = Math.max(10, points.at(-1)?.period ?? 10)
  const maxY = Math.max(0.1, ...points.map((point) => point.acceleration)) * 1.08
  const x = (value: number) => pad.left + (value / maxX) * (width - pad.left - pad.right)
  const y = (value: number) => height - pad.bottom - (value / maxY) * (height - pad.top - pad.bottom)
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.period).toFixed(2)} ${y(point.acceleration).toFixed(2)}`).join(' ')
  const xTicks = [0, 1, 2, 4, 6, 8, 10].filter((value) => value <= maxX)
  const yStep = maxY <= 1 ? 0.2 : maxY <= 2 ? 0.5 : 1
  const yTicks = Array.from({ length: Math.ceil(maxY / yStep) + 1 }, (_, index) => Number((index * yStep).toFixed(2))).filter((value) => value <= maxY)

  return <div className="spectrum-chart-wrap">
    <svg className="spectrum-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="TBDY yatay elastik tasarım spektrumu">
      {yTicks.map((value) => <g key={`y-${value}`}><line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} className="chart-grid" /><text x={pad.left - 9} y={y(value) + 3} textAnchor="end" className="chart-label">{value.toFixed(1)}</text></g>)}
      {xTicks.map((value) => <g key={`x-${value}`}><line x1={x(value)} x2={x(value)} y1={pad.top} y2={height - pad.bottom} className="chart-grid" /><text x={x(value)} y={height - 17} textAnchor="middle" className="chart-label">{value}</text></g>)}
      {ta > 0 && <line x1={x(ta)} x2={x(ta)} y1={pad.top} y2={height - pad.bottom} className="chart-limit" />}
      {tb > 0 && <line x1={x(tb)} x2={x(tb)} y1={pad.top} y2={height - pad.bottom} className="chart-limit" />}
      {tl <= maxX && <line x1={x(tl)} x2={x(tl)} y1={pad.top} y2={height - pad.bottom} className="chart-limit" />}
      <path d={path} className="chart-spectrum-line" />
      <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} className="chart-axis" />
      <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} className="chart-axis" />
      <text x={width / 2} y={height - 3} textAnchor="middle" className="chart-unit">T (s)</text>
      <text x="15" y={height / 2} textAnchor="middle" transform={`rotate(-90 15 ${height / 2})`} className="chart-unit">Saᵉ (g)</text>
    </svg>
  </div>
}

export function EarthquakeScreen() {
  const [ss, setSs] = useState(1.0)
  const [s1, setS1] = useState(0.30)
  const [fs, setFs] = useState(1.0)
  const [f1, setF1] = useState(1.0)
  const [maxPeriod, setMaxPeriod] = useState(10)
  const spectrum = useMemo(() => designSpectrum({ ss, s1, fs, f1 }), [ss, s1, fs, f1])
  const points = useMemo(() => spectrumTable({ ss, s1, fs, f1 }, maxPeriod, 0.05), [ss, s1, fs, f1, maxPeriod])

  return <Frame screen="earthquake">
    <Source>TBDY 2018 Bölüm 2.3.2–2.3.4, Denk. 2.2–2.3. Ss ve S1 tehlike haritasından; FS ve F1 yerel zemin etkisi katsayılarından girilir. TL = 6 s alınır. citeturn0search12</Source>
    <div className="seismic-layout">
      <div>
        <Card title="TASARIM SPEKTRUMU GİRDİLERİ">
          <div className="form-grid">
            <Field label="Ss (g)" value={ss} onChange={(v) => setSs(Number(v))} />
            <Field label="S1 (g)" value={s1} onChange={(v) => setS1(Number(v))} />
            <Field label="FS" value={fs} onChange={(v) => setFs(Number(v))} />
            <Field label="F1" value={f1} onChange={(v) => setF1(Number(v))} />
            <Field label="Grafik üst sınırı T (s)" value={maxPeriod} onChange={(v) => setMaxPeriod(Math.max(1, Number(v)))} />
          </div>
        </Card>
        <Card title="YATAY ELASTİK TASARIM SPEKTRUMU">
          <SpectrumChart points={points} ta={spectrum.ta} tb={spectrum.tb} tl={spectrum.tl} />
        </Card>
      </div>
      <div>
        <div className="metric-strip seismic-metrics">
          <Metric label="SDS" value={spectrum.sds.toFixed(3)} unit="g" tone="primary" />
          <Metric label="SD1" value={spectrum.sd1.toFixed(3)} unit="g" tone="primary" />
          <Metric label="TA" value={spectrum.ta.toFixed(3)} unit="s" />
          <Metric label="TB" value={spectrum.tb.toFixed(3)} unit="s" />
          <Metric label="TL" value={spectrum.tl.toFixed(2)} unit="s" />
        </div>
        <Card title="KIRILMA PERİYOTLARI">
          <Table headers={['Parametre', 'Değer', 'Açıklama']} rows={[
            ['TA', spectrum.ta.toFixed(3), 'Kısa periyot geçişi'],
            ['TB', spectrum.tb.toFixed(3), 'Sabit ivme → sabit yerdeğiştirme geçişi'],
            ['TL', spectrum.tl.toFixed(2), 'Sabit yerdeğiştirme bölgesi başlangıcı']
          ]} />
        </Card>
        <Card title="SPEKTRUM TABLOSU">
          <div className="seismic-table-scroll"><Table headers={['T (s)', 'Saᵉ (g)']} rows={points.filter((_, index) => index % 5 === 0 || index === points.length - 1).map((point) => [point.period.toFixed(2), point.acceleration.toFixed(4)])} /></div>
        </Card>
      </div>
    </div>
  </Frame>
}
