import { useMemo } from 'react'
import { Frame } from '../workspace/WorkspaceShell'
import type { BoreholeRecord, LaboratoryRecord } from '../../../core/models/field-data'
import { useProjectInfo } from '../../../core/state/project-store'
import { deriveSptValues } from '../../../core/engineering/field-calculations'
import { tbdyBearingCapacity } from '../../../core/engineering/calculation-engine'
import { liquefactionProfile, type LiquefactionProfileResult } from '../../../core/calculations/engineering'
import { forceToBase, momentToBase, stressToBase, unitWeightToBase } from '../../../core/units/project-units'
import './engineering-report.css'

type Props = { boreholes: BoreholeRecord[]; labs: LaboratoryRecord[] }
const fmt = (v?: number, d = 2) => v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d)
const chunks = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

function Page({ children, landscape = false, className = '' }: { children: React.ReactNode; landscape?: boolean; className?: string }) {
  return <section className={`report-page ${landscape ? 'report-landscape' : 'report-portrait'} ${className}`}>{children}</section>
}
function Title({ no, kicker, title }: { no: string; kicker: string; title: string }) {
  return <div className="report-section-title"><span>{no}</span><div><small>{kicker}</small><h2>{title}</h2></div></div>
}
function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`report-table-wrap ${className}`}><table className="report-table">{children}</table></div>
}
function Spectrum({ ss, s1, fs, f1 }: { ss?: number; s1?: number; fs?: number; f1?: number }) {
  const sds = (ss ?? 0) * (fs ?? 0)
  const sd1 = (s1 ?? 0) * (f1 ?? 0)
  const ta = sds > 0 ? 0.2 * sd1 / sds : 0
  const tb = sds > 0 ? sd1 / sds : 0
  const pts = Array.from({ length: 61 }, (_, i) => i / 10)
  const values = pts.map(t => t <= ta ? sds * (0.4 + 0.6 * (t / Math.max(ta, 0.0001))) : t <= tb ? sds : sd1 / Math.max(t, 0.0001))
  const max = Math.max(...values, 1)
  return <div className="spectrum-card"><svg viewBox="0 0 720 250" role="img" aria-label="Elastik tasarım spektrumu"><g className="chart-grid">{[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1="50" y1={25 + i * 40} x2="700" y2={25 + i * 40} />)}</g><polyline className="spectrum-line" points={pts.map((t, i) => `${50 + (t / 6) * 650},${225 - (values[i] / max) * 190}`).join(' ')} /><line className="chart-axis" x1="50" y1="225" x2="700" y2="225" /><line className="chart-axis" x1="50" y1="25" x2="50" y2="225" /><text x="355" y="244">Periyot T (s)</text><text x="9" y="28">Sₐ(T)</text></svg><div className="chart-caption"><span>SDS = {fmt(sds, 3)}</span><span>SD1 = {fmt(sd1, 3)}</span><span>TA = {fmt(ta, 3)} s</span><span>TB = {fmt(tb, 3)} s</span></div></div>
}

function LiquefactionTable({ result, pageRows }: { result: LiquefactionProfileResult; pageRows: LiquefactionProfileResult['rows'] }) {
  return <>
    <div className="report-table-caption"><b>Sıvılaşma değerlendirme tablosu</b><span>{pageRows[0]?.depth.toFixed(2)}–{pageRows[pageRows.length - 1]?.depth.toFixed(2)} m · {pageRows.length} kayıt</span></div>
    <Table className="liquefaction-table"><thead><tr><th>Derinlik<br />(m)</th><th>Zemin</th><th>N</th><th>Cₑ</th><th>Cᵦ</th><th>Cₛ</th><th>Cᵣ</th><th>N60</th><th>Cᴺ</th><th>(N₁)₆₀</th><th>FC<br />(%)</th><th>(N₁)₆₀f</th><th>σ′v<br />(kPa)</th><th>CSR</th><th>CRR₇.₅</th><th>MSF</th><th>FS</th><th>Durum</th></tr></thead><tbody>{pageRows.map(r => <tr key={r.id ?? `${r.depth}-${r.nField}`}><td>{fmt(r.depth)}</td><td>{r.soilType || '—'}</td><td>{fmt(r.nField, 0)}</td><td>{fmt(r.ce, 2)}</td><td>{fmt(r.cb, 2)}</td><td>{fmt(r.cs, 2)}</td><td>{fmt(r.cr, 2)}</td><td>{fmt(r.n60, 2)}</td><td>{fmt(r.cn, 2)}</td><td>{fmt(r.n1_60, 2)}</td><td>{fmt(r.fines, 1)}</td><td>{fmt(r.n1_60f, 2)}</td><td>{fmt(r.sigmaVPrime, 1)}</td><td>{fmt(r.csr, 3)}</td><td>{fmt(r.crr, 3)}</td><td>{fmt(r.msf, 2)}</td><td><b>{fmt(r.fsL, 2)}</b></td><td className={r.conclusion === 'SIVILAŞMA VAR' ? 'report-danger' : ''}>{r.conclusion}</td></tr>)}</tbody></Table>
    <div className="report-table-foot">Kaynak/method: {result.source} · {result.method}</div>
  </>
}

export default function EngineeringReportScreen({ boreholes, labs }: Props) {
  const p = useProjectInfo()
  const boreholeRows = useMemo(() => boreholes.flatMap(b => b.lithology.map(l => ({ b: b.name, from: l.from, to: l.to, code: l.code, description: l.description }))), [boreholes])
  const sptRows = useMemo(() => boreholes.flatMap(b => b.spt.filter(s => s.testType === 'SPT' && Number.isFinite(s.n2) && Number.isFinite(s.n3)).map(s => ({ b: b.name, depth: s.depth, n: s.n2! + s.n3!, derived: deriveSptValues(b, s) }))), [boreholes])
  const bearing = useMemo(() => { const soil = p.soilParameters; const f = p.foundationParameters; if (!(f.footingWidth > 0 && f.footingLength > 0 && f.verticalLoad > 0)) return undefined; return tbdyBearingCapacity({ B: f.footingWidth, L: f.footingLength, Df: f.footingDepth, gamma1: unitWeightToBase(soil.unitWeight, p.unitSystem), gamma2: Math.max(unitWeightToBase(soil.saturatedUnitWeight, p.unitSystem) - 9.80665, 0), c: stressToBase(soil.cohesion, p.unitSystem), phi: soil.frictionAngle, verticalLoad: forceToBase(f.verticalLoad, p.unitSystem), horizontalLoad: forceToBase(f.horizontalLoad, p.unitSystem), momentX: momentToBase(f.momentX, p.unitSystem), momentY: momentToBase(f.momentY, p.unitSystem), groundSlope: soil.surfaceSlope, baseSlope: soil.foundationBaseSlope, resistanceFactor: f.resistanceFactorRv || 1 }).value }, [p])
  const liquefaction = useMemo(() => {
    const sds = p.seismic.sds ?? ((p.seismic.ss ?? 0) * (p.seismic.fs ?? 0))
    const layers = boreholes.flatMap(b => b.lithology.map(l => ({ top: l.from, bottom: l.to, gamma: l.unitWeight && l.unitWeight > 0 ? l.unitWeight / 10 : Math.max(p.soilParameters.unitWeight / 10, 1.5), gammaSat: l.saturatedUnitWeight && l.saturatedUnitWeight > 0 ? l.saturatedUnitWeight / 10 : Math.max(p.soilParameters.saturatedUnitWeight / 10, 1.7) })))
    if (!layers.length || !boreholes.some(b => b.spt.some(s => s.testType === 'SPT' && Number.isFinite(s.n2) && Number.isFinite(s.n3)))) return undefined
    const spt = boreholes.flatMap(b => b.spt.filter(s => s.testType === 'SPT' && Number.isFinite(s.n2) && Number.isFinite(s.n3)).map(s => {
      const layer = [...b.lithology].sort((a, z) => a.from - z.from).find(l => s.depth >= l.from && s.depth < l.to)
      const lab = labs.filter(x => x.boreholeId === b.id).sort((a, z) => Math.abs(a.depth - s.depth) - Math.abs(z.depth - s.depth))[0]
      return { depth: s.depth, nField: s.n2! + s.n3!, soilType: s.soilCode ?? layer?.code ?? '', fines: lab?.finesContent ?? lab?.sieve200Passing ?? layer?.finesContent ?? 0, liquidLimit: lab?.liquidLimit ?? layer?.liquidLimit, waterContent: lab?.waterContent, plasticityIndex: lab?.plasticityIndex ?? layer?.plasticityIndex, unitWeightTPerM3: lab?.unitWeight ? lab.unitWeight / 10 : layer?.unitWeight ? layer.unitWeight / 10 : undefined, energyRatio: s.correction?.energyRatio, boreholeDiameterMm: b.drillingDiameter, sampler: 'standard' as const, testType: 'SPT' as const, id: s.id }
    }))
    return liquefactionProfile({ Mw: p.seismic.magnitude ?? 7.5, Sds: sds, groundwaterDepth: Math.min(...boreholes.map(b => b.groundwaterDepth ?? p.soilParameters.groundwaterDepth ?? 999)), layers, spt })
  }, [boreholes, labs, p])
  const preparePrint = () => document.body.classList.add('print-report-only')
  const finishPrint = () => document.body.classList.remove('print-report-only')
  const printReport = async () => { preparePrint(); try { await window.api.report.print() } finally { finishPrint() } }
  const exportPdf = async () => { preparePrint(); try { await window.api.report.exportPdf() } finally { finishPrint() } }
  const boreholePages = chunks(boreholeRows, 18)
  const sptPages = chunks(sptRows, 18)
  const liqPages = chunks(liquefaction?.rows ?? [], 11)

  return <Frame screen="report"><div className="report-toolbar"><div><b>MÜHENDİSLİK RAPORU</b><span>Otomatik A4 · sıvılaşma sayfaları A4 yatay</span></div><div><button type="button">Sayfa düzeni</button><button type="button" onClick={printReport}>Yazdır</button><button type="button" onClick={exportPdf}>PDF çıktısı</button></div></div><article className="report-document">
    <Page className="report-cover-page"><header className="report-cover"><div className="report-brand">ZEMİNLAB</div><div><div className="report-kicker">GEOTEKNİK MÜHENDİSLİK RAPORU</div><h1>{p.title || 'Yeni Proje'}</h1><p>{p.location || 'Proje konumu belirtilmemiş'}</p></div><div className="report-meta"><span>Proje No</span><b>{p.projectNo || '—'}</b><span>Tarih</span><b>{p.date || '—'}</b></div></header><div className="report-cover-body"><h2>Hesap raporu</h2><div className="cover-grid"><div><b>İşveren</b><span>{p.clientName || '—'}</span></div><div><b>Firma</b><span>{p.firmName || '—'}</span></div><div><b>Mühendis</b><span>{p.engineer || '—'}</span></div><div><b>Yapı</b><span>{p.buildingType || '—'}</span></div><div><b>İl / İlçe</b><span>{p.province || '—'} / {p.district || '—'}</span></div><div><b>Parsel</b><span>{p.ada || '—'} / {p.parsel || '—'}</span></div></div><div className="report-note">Bu rapor proje verilerinden otomatik oluşturulur. Her hesap bölümü kullanılan girdileri, yöntemi, ara sonuçları ve kontrol sonucunu birlikte gösterir.</div></div></Page>
    <Page><Title no="01" kicker="PROJE VE ZEMİN BİLGİLERİ" title="Temel proje verileri"/><div className="report-info-grid"><div><b>Proje</b><span>{p.title || '—'}</span></div><div><b>İl / İlçe</b><span>{p.province || '—'} / {p.district || '—'}</span></div><div><b>Vs30</b><span>{fmt(p.geophysical.vs30, 0)} m/s</span></div><div><b>Zemin grubu</b><span>{p.geophysical.soilGroup || '—'}</span></div><div><b>Mühendislik sınıfı</b><span>{p.soilParameters.classification?.code || '—'}</span></div><div><b>Sondaj sayısı</b><span>{boreholes.length}</span></div><div><b>Laboratuvar kaydı</b><span>{labs.length}</span></div><div><b>YASS</b><span>{fmt(p.soilParameters.groundwaterDepth)} m</span></div></div><div className="report-two-col"><div><b>Deprem girdileri</b><p>Ss = {fmt(p.seismic.ss, 3)} · S1 = {fmt(p.seismic.s1, 3)} · Fs = {fmt(p.seismic.fs, 3)} · F1 = {fmt(p.seismic.f1, 3)} · Mw = {fmt(p.seismic.magnitude, 2)}</p></div><div><b>Temel</b><p>{fmt(p.foundationParameters.footingWidth)} × {fmt(p.foundationParameters.footingLength)} m · Df = {fmt(p.foundationParameters.footingDepth)} m · N = {fmt(p.foundationParameters.verticalLoad)}</p></div></div></Page>
    {boreholePages.map((rows, i) => <Page key={`b-${i}`}><Title no="02" kicker="SAHA ARAŞTIRMALARI" title={`Zemin profili ${boreholePages.length > 1 ? `· sayfa ${i + 1}/${boreholePages.length}` : ''}`}/><Table><thead><tr><th>Sondaj</th><th>Başlangıç</th><th>Bitiş</th><th>Kod</th><th>Zemin tanımı</th></tr></thead><tbody>{rows.map((r, j) => <tr key={j}><td>{r.b}</td><td>{fmt(r.from)}</td><td>{fmt(r.to)}</td><td><b>{r.code}</b></td><td>{r.description}</td></tr>)}</tbody></Table>{i === boreholePages.length - 1 && <div className="report-note">Toplam {boreholeRows.length} litoloji katmanı raporlanmıştır.</div>}</Page>)}
    {sptPages.map((rows, i) => <Page key={`s-${i}`}><Title no="03" kicker="SAHA ARAŞTIRMALARI" title={`SPT düzeltme özeti ${sptPages.length > 1 ? `· sayfa ${i + 1}/${sptPages.length}` : ''}`}/><Table><thead><tr><th>Sondaj</th><th>Derinlik</th><th>N</th><th>N60</th><th>(N1)60</th><th>CN</th></tr></thead><tbody>{rows.map((r, j) => <tr key={j}><td>{r.b}</td><td>{fmt(r.depth)} m</td><td>{r.n}</td><td>{fmt(r.derived.n60)}</td><td>{fmt(r.derived.n1_60)}</td><td>{fmt(r.derived.cn)}</td></tr>)}</tbody></Table>{i === sptPages.length - 1 && <div className="report-note">SPT düzeltme zinciri: N → Cₑ → Cᵦ → Cₛ → Cᵣ → N60 → CN → (N1)60.</div>}</Page>)}
    <Page><Title no="04" kicker="DEPREM" title="Elastik tasarım spektrumu"/><Spectrum ss={p.seismic.ss} s1={p.seismic.s1} fs={p.seismic.fs} f1={p.seismic.f1}/><div className="report-two-col"><div><b>Girdi</b><p>Ss = {fmt(p.seismic.ss, 3)} · S1 = {fmt(p.seismic.s1, 3)} · Fs = {fmt(p.seismic.fs, 3)} · F1 = {fmt(p.seismic.f1, 3)}</p></div><div><b>Sonuç</b><p>SDS = {fmt((p.seismic.ss ?? 0) * (p.seismic.fs ?? 0), 3)} · SD1 = {fmt((p.seismic.s1 ?? 0) * (p.seismic.f1 ?? 0), 3)}</p></div></div></Page>
    <Page><Title no="05" kicker="TAŞIMA GÜCÜ" title="TBDY 2018 hesap zinciri"/>{bearing ? <><Table><thead><tr><th>Adım</th><th>Formül / işlem</th><th>Sonuç</th></tr></thead><tbody>{[{ n: '01', f: 'eₓ = Mᵧ / N ; eᵧ = Mₓ / N', v: `${fmt(bearing.ex, 4)} / ${fmt(bearing.ey, 4)} m` }, { n: '02', f: 'Bₑ = B − 2|eₓ| ; Lₑ = L − 2|eᵧ|', v: `${fmt(bearing.Be, 3)} / ${fmt(bearing.Le, 3)} m` }, { n: '03', f: 'qₖ = TBDY 2018 Denklem 16.8', v: fmt(bearing.qk, 3) }, { n: '04', f: 'qₜ = qₖ / γRv', v: fmt(bearing.qt, 3) }, { n: '05', f: 'q₀ = N / (Bₑ·Lₑ)', v: fmt(bearing.qo, 3) }, { n: '06', f: 'η = q₀ / qₜ', v: fmt(bearing.utilization, 4) }].map(r => <tr key={r.n}><td>{r.n}</td><td>{r.f}</td><td>{r.v}</td></tr>)}</tbody></Table><div className="report-note">Kontrol sonucu: {bearing.adequate ? 'tasarım dayanımı aşılmıyor.' : 'tasarım dayanımı aşılıyor.'}</div></> : <div className="report-note">Taşıma gücü için temel geometrisi, yükler ve zemin parametreleri henüz yeterli değil.</div>}</Page>
    {liqPages.length ? liqPages.map((rows, i) => <Page key={`l-${i}`} landscape className="liquefaction-report-page"><Title no="06" kicker="DEPREM · SIVILAŞMA" title={`SPT tabanlı profil değerlendirmesi · sayfa ${i + 1}/${liqPages.length}`}/><div className="landscape-meta"><span>Mw = {fmt(p.seismic.magnitude ?? 7.5, 2)}</span><span>SDS = {fmt(liquefaction?.rows[0]?.sds, 3)}</span><span>YASS = {fmt(Math.min(...boreholes.map(b => b.groundwaterDepth ?? p.soilParameters.groundwaterDepth ?? 999)), 2)} m</span><span>FS sınırı = 1.10</span></div>{liquefaction && <LiquefactionTable result={liquefaction} pageRows={rows}/>}<div className="report-note">Karar ve açıklama satırları hesap motorundaki aynı profil sonucundan üretilir. Killi zeminlerde Bray &amp; Sancio yumuşama taraması ayrıca korunur.</div></Page>) : <Page><Title no="06" kicker="DEPREM · SIVILAŞMA" title="Sıvılaşma değerlendirmesi"/><div className="report-note">Raporlanabilir SPT kaydı bulunmadığı için profil tablosu oluşturulmadı.</div></Page>}
    <Page><Title no="07" kicker="HESAP MİMARİSİ" title="Kaynak → yöntem → ara hesap → kontrol"/><div className="calculation-report-box"><div className="calc-step"><b>01</b><div><strong>Girdi kaynağı</strong><span>Sondaj · SPT · laboratuvar · proje bilgileri</span></div></div><div className="calc-step"><b>02</b><div><strong>Korelasyon / yöntem</strong><span>Seçilen bağıntı, uygulanabilirlik ve kaynak hesap iziyle saklanır.</span></div></div><div className="calc-step"><b>03</b><div><strong>Ara hesaplar</strong><span>Düzeltme katsayıları, gerilmeler ve ara sonuçlar korunur.</span></div></div><div className="calc-step"><b>04</b><div><strong>Nihai kontrol</strong><span>Sonuç, sınır değer ve yöntem birlikte raporlanır.</span></div></div></div><div className="report-note">TBDY 2018 Bölüm 16 ve Ek 16A/16B/16D kaynak notları ilgili hesap motorlarında tutulur.</div></Page>
  </article></Frame>
}
