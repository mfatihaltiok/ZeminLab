import { useMemo } from 'react'
import { tbdyBearingCapacity, SOURCE_NOTES } from '../../../core/calculations/engineering'
import { useProjectInfo } from '../../../core/state/project-store'
import { Card, Frame, Metric, Source, Table } from '../workspace/WorkspaceShell'

export function BearingCapacityScreen() {
  const p = useProjectInfo()
  const soil = p.soilParameters
  const f = p.foundationParameters
  const result = useMemo(() => tbdyBearingCapacity({
    B: f.footingWidth, L: f.footingLength, Df: f.footingDepth,
    gamma1: soil.unitWeight, gamma2: Math.max(soil.saturatedUnitWeight - 9.81, 0),
    c: soil.cohesion, phi: soil.frictionAngle, verticalLoad: f.verticalLoad,
    horizontalLoad: f.horizontalLoad, momentX: f.momentX, momentY: f.momentY,
    groundSlope: soil.surfaceSlope, baseSlope: soil.foundationBaseSlope,
    resistanceFactor: f.resistanceFactorRv
  }), [soil, f])

  return <Frame screen="bearing-capacity">
    <Source>{SOURCE_NOTES.bearing}</Source>
    <div className="metric-strip">
      <Metric label="qk · karakteristik" value={result.qk.toFixed(1)} unit="kPa" tone="primary" />
      <Metric label="qt · tasarım dayanımı" value={result.qt.toFixed(1)} unit="kPa" tone="primary" />
      <Metric label="q0 · temel basıncı" value={result.qo.toFixed(1)} unit="kPa" />
      <Metric label="Kullanım oranı" value={(result.utilization * 100).toFixed(1)} unit="%" />
      <Metric label="Sonuç" value={result.adequate ? 'UYGUN' : 'YETERSİZ'} tone={result.adequate ? 'primary' : undefined} />
    </div>
    <div className="dashboard-grid">
      <div>
        <Card title="PROJE VERİSİ · SADECE OKUMA"><Table headers={['Girdi', 'Değer', 'Birim']} rows={[
          ['B', f.footingWidth.toFixed(3), 'm'], ['L', f.footingLength.toFixed(3), 'm'], ['Df', f.footingDepth.toFixed(3), 'm'],
          ['γ doğal', soil.unitWeight.toFixed(3), 'kN/m³'], ['γsat', soil.saturatedUnitWeight.toFixed(3), 'kN/m³'],
          ['c / cu', soil.cohesion.toFixed(3), 'kPa'], ['φ′', soil.frictionAngle.toFixed(3), '°'],
          ['Fz', f.verticalLoad.toFixed(3), 'kN'], ['V', f.horizontalLoad.toFixed(3), 'kN'], ['Mx / My', `${f.momentX.toFixed(3)} / ${f.momentY.toFixed(3)}`, 'kNm']
        ]} /></Card>
        <Card title="TBDY 16.8 HESAP AKIŞI"><Table headers={['Adım', 'Hesaplanan büyüklük', 'Değer']} rows={[
          ['01', 'Eksantriklik ex / ey', `${result.ex.toFixed(4)} / ${result.ey.toFixed(4)} m`],
          ['02', 'Etkin temel boyutları B′ / L′', `${result.Be.toFixed(3)} / ${result.Le.toFixed(3)} m`],
          ['03', 'Nc / Nq / Nγ', `${result.Nc.toFixed(3)} / ${result.Nq.toFixed(3)} / ${result.Ngamma.toFixed(3)}`],
          ['04', 'sc / sq / sγ', `${result.sc.toFixed(3)} / ${result.sq.toFixed(3)} / ${result.sg.toFixed(3)}`],
          ['05', 'dc / dq / dγ', `${result.dc.toFixed(3)} / ${result.dq.toFixed(3)} / ${result.dg.toFixed(3)}`],
          ['06', 'ic / iq / iγ', `${result.ic.toFixed(3)} / ${result.iq.toFixed(3)} / ${result.ig.toFixed(3)}`],
          ['07', 'gc / gq / gγ', `${result.gc.toFixed(3)} / ${result.gq.toFixed(3)} / ${result.gg.toFixed(3)}`],
          ['08', 'bc / bq / bγ', `${result.bc.toFixed(3)} / ${result.bq.toFixed(3)} / ${result.bg.toFixed(3)}`],
          ['09', 'Sürşarj q', `${result.surcharge.toFixed(3)} kPa`], ['10', 'Karakteristik dayanım qk', `${result.qk.toFixed(3)} kPa`],
          ['11', 'Tasarım dayanımı qt', `${result.qt.toFixed(3)} kPa`], ['12', 'Temel taban basıncı q0', `${result.qo.toFixed(3)} kPa`]
        ]} /></Card>
      </div>
      <div>
        <Card title="TBDY 2018 · DENKLEM 16.8"><div className="formula-large">qk = c·Nc·sc·dc·ic·gc·bc + q·Nq·sq·dq·iq·gq·bq + ½·γ₂·B′·Nγ·sγ·dγ·iγ·gγ·bγ</div><Source>{SOURCE_NOTES.bearing}</Source></Card>
        <Card title="TASARIM KONTROLÜ"><Table headers={['Kontrol', 'Değer', 'Durum']} rows={[
          ['q0 ≤ qt', `${result.qo.toFixed(2)} ≤ ${result.qt.toFixed(2)} kPa`, result.adequate ? 'UYGUN' : 'YETERSİZ'],
          ['γRv', f.resistanceFactorRv.toFixed(3), 'Proje verisi'], ['Etkin alan B′·L′', `${(result.Be * result.Le).toFixed(2)} m²`, 'Hesaplandı'],
          ['Sürşarj q = Df·γ', `${result.surcharge.toFixed(2)} kPa`, 'Hesaplandı']
        ]} /></Card>
      </div>
    </div>
  </Frame>
}
