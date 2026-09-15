import { useMemo, useState, type ReactNode } from 'react'
import './assets/main.css'
import { updateProjectInfo, useProjectInfo } from '../../core/state/project-store'
import { calculateBearingCapacity } from '../../core/calculations/bearing-capacity'

type ScreenId =
  | 'dashboard' | 'project-info' | 'site-info' | 'boreholes' | 'spt' | 'laboratory' | 'soil-profile'
  | 'soil-parameters' | 'bearing-capacity' | 'settlement' | 'liquefaction' | 'foundation'
  | 'jet-grout' | 'calculation-check' | 'engineering-report'

type TreeItemProps = { label: string; children?: ReactNode; open?: boolean; active?: boolean; onSelect?: () => void }

function TreeItem({ label, children, open = true, active = false, onSelect }: TreeItemProps) {
  const [expanded, setExpanded] = useState(open)
  const clickable = Boolean(onSelect)
  return <div className="tree-group">
    <div className={`tree-row ${active ? 'active' : ''} ${clickable ? 'clickable' : ''}`} onClick={() => { if (children) setExpanded(!expanded); onSelect?.() }}>
      <span className={`tree-arrow ${expanded ? 'expanded' : ''}`}>{children ? '▶' : ''}</span>
      <span className="tree-icon">{children ? (expanded ? '▾' : '▸') : '•'}</span>
      <span>{label}</span>
    </div>
    {children && expanded && <div className="tree-children">{children}</div>}
  </div>
}

const treeMap: Record<string, ScreenId> = {
  'Proje Bilgileri': 'project-info', 'Saha Bilgileri': 'site-info', Sondajlar: 'boreholes',
  'SPT Kayıtları': 'spt', Laboratuvar: 'laboratory', 'Zemin Profili': 'soil-profile',
  'Zemin Parametreleri': 'soil-parameters', 'Taşıma Gücü': 'bearing-capacity', Oturma: 'settlement',
  Sıvılaşma: 'liquefaction', Temel: 'foundation', 'Jet Grout': 'jet-grout',
  'Hesap Kontrolü': 'calculation-check', 'Mühendislik Raporu': 'engineering-report'
}

const screenMeta: Record<ScreenId, { title: string; category: string }> = {
  dashboard: { title: 'Proje Özeti', category: 'PROJE' }, 'project-info': { title: 'Proje Bilgileri', category: 'PROJE' },
  'site-info': { title: 'Saha Bilgileri', category: 'SAHA' }, boreholes: { title: 'Sondajlar', category: 'SAHA' },
  spt: { title: 'SPT Kayıtları', category: 'SAHA' }, laboratory: { title: 'Laboratuvar', category: 'SAHA' },
  'soil-profile': { title: 'Zemin Profili', category: 'SAHA' }, 'soil-parameters': { title: 'Zemin Parametreleri', category: 'ANALİZ' },
  'bearing-capacity': { title: 'Taşıma Gücü', category: 'ANALİZ' }, settlement: { title: 'Oturma', category: 'ANALİZ' },
  liquefaction: { title: 'Sıvılaşma', category: 'ANALİZ' }, foundation: { title: 'Temel', category: 'TASARIM' },
  'jet-grout': { title: 'Jet Grout', category: 'TASARIM' }, 'calculation-check': { title: 'Hesap Kontrolü', category: 'RAPOR' },
  'engineering-report': { title: 'Mühendislik Raporu', category: 'RAPOR' }
}

function fmt(v: number, digits = 2) { return Number.isFinite(v) ? v.toFixed(digits) : '—' }

function MiniChart({ values, labels, unit = '' }: { values: number[]; labels: string[]; unit?: string }) {
  const max = Math.max(...values, 1)
  const width = 560, height = 190, left = 42, bottom = 30, top = 16, right = 14
  const plotW = width - left - right, plotH = height - top - bottom
  const points = values.map((v, i) => `${left + (plotW * i) / Math.max(values.length - 1, 1)},${top + plotH - (v / max) * plotH}`).join(' ')
  return <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} role="img">
    {[0, .25, .5, .75, 1].map((t) => <line key={t} x1={left} x2={width - right} y1={top + plotH * t} y2={top + plotH * t} className="chart-grid" />)}
    <polyline points={points} className="chart-line" />
    {values.map((v, i) => <circle key={i} cx={left + (plotW * i) / Math.max(values.length - 1, 1)} cy={top + plotH - (v / max) * plotH} r="4" className="chart-point" />)}
    {labels.map((l, i) => <text key={l} x={left + (plotW * i) / Math.max(labels.length - 1, 1)} y={height - 8} textAnchor="middle" className="chart-label">{l}</text>)}
    <text x="8" y="15" className="chart-unit">{unit}</text>
  </svg>
}

function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1)
  return <div className="bar-chart">{values.map((v, i) => <div className="bar-item" key={labels[i]}><div className="bar-value">{fmt(v)}</div><div className="bar-track"><div className="bar-fill" style={{ height: `${(v / max) * 100}%` }} /></div><div className="bar-label">{labels[i]}</div></div>)}</div>
}

function ScreenFrame({ category, title, description, actions, children }: { category: string; title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="engineering-screen"><header className="engineering-header"><div><div className="engineering-header-category">{category}</div><h2>{title}</h2><div className="engineering-header-description">{description}</div></div><div className="engineering-header-actions">{actions}</div></header><div className="engineering-content">{children}</div></section>
}

function Metric({ label, value, unit, tone = '' }: { label: string; value: string; unit?: string; tone?: string }) {
  return <div className={`metric ${tone}`}><span>{label}</span><strong>{value}</strong>{unit && <small>{unit}</small>}</div>
}

function SoilProfile() {
  return <ScreenFrame category="SAHA VERİLERİ" title="Zemin Profili" description="Sondaj verilerinin katman bazlı mühendislik görünümü" actions={<><button>YAZDIR</button><button>DIŞA AKTAR</button></>}>
    <div className="profile-layout"><div className="profile-card"><div className="card-title">SONDAJ-03 · ZEMİN PROFİLİ</div><div className="profile-visual"><div className="depth-scale">{[0,2,4,6,8,10,12].map(d => <span key={d} style={{ top: `${(d / 12) * 100}%` }}>{d.toFixed(2)}</span>)}</div><div className="soil-column"><div className="layer layer-fill" style={{ height: '12.5%' }}>Dolgu</div><div className="layer layer-clay" style={{ height: '20.8%' }}>Siltli Kil</div><div className="layer layer-sand" style={{ height: '29.2%' }}>Orta Sıkı Kum</div><div className="layer layer-dense" style={{ height: '37.5%' }}>Sıkı Kum</div></div><div className="profile-info"><div><b>SPT-N</b><span>8</span><span>14</span><span>24</span><span>36</span></div><div><b>GWL</b><span>—</span><span>—</span><span>5.20</span><span>5.20</span></div></div></div></div><div className="side-metrics"><Metric label="Sondaj derinliği" value="12.00" unit="m"/><Metric label="Yeraltı suyu" value="5.20" unit="m"/><Metric label="Tabaka sayısı" value="4"/><Metric label="Son SPT-N" value="36"/></div></div>
    <div className="calculation-card"><div className="calculation-card-title">SPT DAĞILIMI</div><MiniChart values={[8,14,24,36]} labels={['1.5','4.0','7.5','12.0']} unit="N"/></div>
  </ScreenFrame>
}

function ProjectInfoScreen() {
  const project = useProjectInfo()
  const update = <K extends keyof typeof project>(key: K, value: (typeof project)[K]) => updateProjectInfo({ ...project, [key]: value })
  return <ScreenFrame category="PROJE" title="Proje Bilgileri" description="Merkezi proje kimliği, birim sistemi ve ortak mühendislik girdileri">
    <div className="form-section"><div className="section-title">PROJE KİMLİĞİ</div><div className="form-grid">
      <Field label="Proje Adı" value={project.title} onChange={v => update('title', v)}/><Field label="Proje No" value={project.projectNo} onChange={v => update('projectNo', v)}/><Field label="Tarih" value={project.date} type="date" onChange={v => update('date', v)}/><Field label="Mühendis" value={project.engineer} onChange={v => update('engineer', v)}/><Field label="İl" value={project.province} onChange={v => update('province', v)}/><Field label="İlçe" value={project.district} onChange={v => update('district', v)}/><Field label="Adres" wide value={project.address} onChange={v => update('address', v)}/><Field label="Parsel Bilgisi" wide value={project.parcelInfo} onChange={v => update('parcelInfo', v)}/>
    </div></div>
    <div className="form-section"><div className="section-title">YAPI VE KURUM</div><div className="form-grid"><Field label="İşveren" value={project.clientName} onChange={v => update('clientName', v)}/><Field label="Firma" value={project.firmName} onChange={v => update('firmName', v)}/><Field label="Yapı Türü" value={project.buildingType} onChange={v => update('buildingType', v)}/><Field label="Bodrum Katı" value={String(project.basementCount)} type="number" onChange={v => update('basementCount', Number(v))}/><Field label="Normal Kat" value={String(project.normalFloorCount)} type="number" onChange={v => update('normalFloorCount', Number(v))}/></div></div>
    <div className="form-section unit-section"><div><div className="section-title">PROJE BİRİM SİSTEMİ</div><p>Tek merkezi seçim. Analiz ve tasarım ekranları bu proje birimini referans alır.</p></div><select value={project.unitSystem} onChange={e => update('unitSystem', e.target.value as typeof project.unitSystem)}><option value="kN-m">kN - m</option><option value="ton-m">ton - m</option><option value="kPa-m">kPa - m</option></select></div>
  </ScreenFrame>
}

function Field({ label, value, onChange, type = 'text', wide = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; wide?: boolean }) { return <label className={wide ? 'wide' : ''}><span>{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)}/></label> }

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) { return <div className="calculation-card"><div className="calculation-card-title">{title}</div><table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div> }

function DataScreen({ screen }: { screen: ScreenId }) {
  if (screen === 'site-info') return <ScreenFrame category="SAHA VERİLERİ" title="Saha Bilgileri" description="Parsel, koordinat ve saha organizasyon bilgileri"><div className="form-section"><div className="section-title">SAHA ÖZETİ</div><div className="form-grid"><Field label="Saha" value="Örnek saha" onChange={() => {}}/><Field label="Koordinat Sistemi" value="UTM / ED50" onChange={() => {}}/><Field label="X" value="423521.24" onChange={() => {}}/><Field label="Y" value="4378215.61" onChange={() => {}}/><Field label="Kot" value="1012.40" onChange={() => {}}/><Field label="Arazi Tarihi" value="2026-09-15" type="date" onChange={() => {}}/></div></div><div className="calculation-card"><div className="calculation-card-title">SAHA KROKİSİ</div><div className="site-map"><div className="map-grid"/><span className="bore-point p1">01</span><span className="bore-point p2">02</span><span className="bore-point p3">03</span><div className="north-arrow">N ↑</div></div></div></ScreenFrame>
  if (screen === 'boreholes') return <ScreenFrame category="SAHA VERİLERİ" title="Sondajlar" description="Sondaj kayıtlarının genel görünümü" actions={<button>+ YENİ SONDAJ</button>}><DataTable title="SONDAJ KAYITLARI" headers={['Sondaj','Derinlik','GWL','SPT','Numune','Durum']} rows={[["Sondaj-01","10.00 m","4.80 m","7","6","Tamam"],["Sondaj-02","10.00 m","5.10 m","8","7","Tamam"],["Sondaj-03","12.00 m","5.20 m","12","9","Tamam"]]}/><div className="calculation-card"><div className="calculation-card-title">SONDAJ DERİNLİKLERİ</div><BarChart values={[10,10,12]} labels={['S-01','S-02','S-03']}/></div></ScreenFrame>
  if (screen === 'spt') return <ScreenFrame category="SAHA VERİLERİ" title="SPT Kayıtları" description="Standart penetrasyon deneyi kayıtları ve derinlik profili"><DataTable title="SPT TABLOSU" headers={['Sondaj','Derinlik','N1','N2','N3','N','Not']} rows={[["S-01","2.00","3","4","5","9",""],["S-01","4.00","4","5","6","11",""],["S-02","2.00","4","5","7","12",""],["S-03","4.00","5","7","8","15",""],["S-03","7.00","8","10","12","22",""],["S-03","10.00","12","14","16","30",""]]}/></ScreenFrame>
  if (screen === 'laboratory') return <ScreenFrame category="SAHA VERİLERİ" title="Laboratuvar" description="Numune ve deney sonuçlarının merkezi veri görünümü"><DataTable title="DENEY KAYITLARI" headers={['Numune','Deney','Derinlik','Sonuç','Birim']} rows={[["S03-UD01","Doğal Su Muhtevası","2.20 m","18.4","%"],["S03-UD01","Birim Hacim Ağırlık","2.20 m","18.2","kN/m³"],["S03-UD02","Atterberg LL","5.40 m","42","%"],["S03-UD02","Atterberg PI","5.40 m","19","%"],["S03-UD03","Üç Eksenli c","8.10 m","18","kPa"],["S03-UD03","Üç Eksenli φ","8.10 m","29","°"]]}/></ScreenFrame>
  return <ScreenFrame category="ANALİZ" title="Zemin Parametreleri" description="Hesap motorlarının ortak parametre tablosu"><DataTable title="MERKEZİ PARAMETRELER" headers={['Parametre','Değer','Birim','Kaynak']} rows={[["Birim hacim ağırlık γ","18.0","kN/m³","Proje > Zemin Parametreleri"],["Kohezyon c","10.0","kPa","Proje > Zemin Parametreleri"],["İçsel sürtünme φ","30.0","°","Proje > Zemin Parametreleri"],["Temel B","2.00","m","Proje > Temel Parametreleri"],["Temel Df","1.00","m","Proje > Temel Parametreleri"],["FS","3.00","-","Proje > Temel Parametreleri"]]}/></ScreenFrame>
}

function BearingScreen() {
  const project = useProjectInfo(); const [ran, setRan] = useState(false)
  const input = { footingWidth: project.foundationParameters.footingWidth, footingDepth: project.foundationParameters.footingDepth, unitWeight: project.soilParameters.unitWeight, cohesion: project.soilParameters.cohesion, frictionAngle: project.soilParameters.frictionAngle, safetyFactor: project.foundationParameters.safetyFactor }
  const result = useMemo(() => { try { return calculateBearingCapacity(input) } catch { return null } }, [input.footingWidth,input.footingDepth,input.unitWeight,input.cohesion,input.frictionAngle,input.safetyFactor])
  return <ScreenFrame category="ANALİZ" title="Taşıma Gücü" description="Merkezi proje verilerinden çalışan ön hesap motoru" actions={<button className="primary-button" onClick={() => setRan(true)}>HESAPLA</button>}>
    <div className="metric-strip"><Metric label="B" value={fmt(input.footingWidth)} unit="m"/><Metric label="Df" value={fmt(input.footingDepth)} unit="m"/><Metric label="γ" value={fmt(input.unitWeight)} unit="kN/m³"/><Metric label="c" value={fmt(input.cohesion)} unit="kPa"/><Metric label="φ" value={fmt(input.frictionAngle)} unit="°"/><Metric label="FS" value={fmt(input.safetyFactor)}/></div>
    <div className="calculation-card"><div className="calculation-card-title">HESAP SONUÇLARI</div><div className="result-grid"><Metric label="Nq" value={ran && result ? fmt(result.Nq) : '—'}/><Metric label="Nc" value={ran && result ? fmt(result.Nc) : '—'}/><Metric label="Nγ" value={ran && result ? fmt(result.Ngamma) : '—'}/><Metric label="q = γDf" value={ran && result ? fmt(result.surcharge) : '—'} unit="kPa"/><Metric label="qult" value={ran && result ? fmt(result.ultimateBearingCapacity) : '—'} unit="kPa" tone="primary"/><Metric label="qallow,gross" value={ran && result ? fmt(result.allowableGrossBearingCapacity) : '—'} unit="kPa" tone="primary"/></div></div>
    <div className="calculation-card trace-card"><div className="calculation-card-title">HESAP İZİ</div><ol><li>Merkezi veri: B={fmt(input.footingWidth)} m, Df={fmt(input.footingDepth)} m.</li><li>Merkezi zemin: γ={fmt(input.unitWeight)} kN/m³, c={fmt(input.cohesion)} kPa, φ={fmt(input.frictionAngle)}°.</li><li>Hesap motoru: Terzaghi sürekli temel bağıntısı.</li><li>q<sub>ult</sub> = cN<sub>c</sub> + γD<sub>f</sub>N<sub>q</sub> + 0.5γBN<sub>γ</sub>.</li><li>Sonuçlar mühendislik kontrolü için izlenebilir olarak gösterilir.</li></ol></div>
  </ScreenFrame>
}

function SettlementScreen() {
  const [B,setB] = useState(2); const [q,setQ] = useState(150); const [Es,setEs] = useState(15000); const [nu,setNu] = useState(.3); const s = q*B*(1-nu*nu)/Es
  return <ScreenFrame category="ANALİZ" title="Oturma" description="Ön elastik oturma hesabı ve hassasiyet görünümü" actions={<button>HESAPLA</button>}><div className="form-section"><div className="section-title">GİRDİLER</div><div className="form-grid"><Field label="B" value={String(B)} type="number" onChange={v=>setB(Number(v))}/><Field label="Net gerilme q" value={String(q)} type="number" onChange={v=>setQ(Number(v))}/><Field label="Elastisite E" value={String(Es)} type="number" onChange={v=>setEs(Number(v))}/><Field label="Poisson ν" value={String(nu)} type="number" onChange={v=>setNu(Number(v))}/></div></div><div className="metric-strip"><Metric label="Ön elastik oturma" value={fmt(s*1000,1)} unit="mm" tone="primary"/><Metric label="q" value={fmt(q)} unit="kPa"/><Metric label="E" value={fmt(Es,0)} unit="kPa"/></div><div className="calculation-card"><div className="calculation-card-title">HESAP İZİ</div><div className="formula-large">s ≈ q · B · (1 − ν²) / E = {fmt(s*1000,1)} mm</div><div className="engineering-note">Bu ekran numune prototip hesap motorudur. Nihai tasarım için tabakalı zemin modeli, yükleme geometrisi ve ilgili tasarım yöntemi ayrıca tanımlanmalıdır.</div></div></ScreenFrame>
}

function LiquefactionScreen() {
  const [n,setN]=useState(18); const [sigma,setSigma]=useState(100); const [ds,setDs]=useState(80); const [a,setA]=useState(.2); const csr=a*sigma/(2*ds); const cr=0.833*(n/15); const fs=cr/csr
  return <ScreenFrame category="ANALİZ" title="Sıvılaşma" description="SPT tabanlı ön değerlendirme paneli" actions={<button>HESAPLA</button>}><div className="metric-strip"><Metric label="SPT-N" value={fmt(n,0)}/><Metric label="σ'v" value={fmt(ds)} unit="kPa"/><Metric label="σv" value={fmt(sigma)} unit="kPa"/><Metric label="a_max" value={fmt(a,2)} unit="g"/><Metric label="CSR" value={fmt(csr,3)}/><Metric label="FS ön" value={fmt(fs,2)} tone={fs < 1 ? 'danger':'primary'}/></div><div className="calculation-card"><div className="calculation-card-title">PROFİL</div><MiniChart values={[10,14,18,24,30]} labels={['2','4','6','8','10']} unit="SPT-N"/></div><div className="engineering-note">Bu hesap ekranı numune uygulama içindir. Saha düzeltmeleri, ince dane etkisi, gerilme oranları ve seçilen yöntem doğrulanmadan sonuç tasarım kararı olarak kullanılmamalıdır.</div></ScreenFrame>
}

function FoundationScreen() { return <ScreenFrame category="TASARIM" title="Temel" description="Temel geometrisi, yük durumu ve kontrol özeti"><div className="metric-strip"><Metric label="B" value="2.00" unit="m"/><Metric label="L" value="2.00" unit="m"/><Metric label="Df" value="1.00" unit="m"/><Metric label="q" value="150" unit="kPa"/><Metric label="FS" value="3.00"/></div><DataTable title="KONTROL TABLOSU" headers={['Kontrol','Talep','Sonuç','Durum']} rows={[["Taşıma gücü","qallow","—","Bekliyor"],["Toplam oturma","Limit","—","Bekliyor"],["Eksantrisite","e/B","—","Bekliyor"],["Taban gerilmesi","qmax/qmin","—","Bekliyor"]]}/><div className="foundation-drawing"><div className="footing-rect"/><span className="dim dim-b">B = 2.00 m</span><span className="dim dim-l">L = 2.00 m</span></div></ScreenFrame> }

function JetGroutScreen() { const [d,setD]=useState(1.0); const [spacing,setSpacing]=useState(1.4); const area=Math.PI*d*d/4; const ratio=area/(spacing*spacing); return <ScreenFrame category="TASARIM" title="Jet Grout" description="Kolon geometrisi ve plan yerleşimi için çalışan prototip"><div className="form-section"><div className="section-title">GEOMETRİ</div><div className="form-grid"><Field label="Kolon çapı" value={String(d)} type="number" onChange={v=>setD(Number(v))}/><Field label="Aks aralığı" value={String(spacing)} type="number" onChange={v=>setSpacing(Number(v))}/><Field label="Kolon alanı" value={fmt(area,3)} onChange={()=>{}}/><Field label="Alan oranı" value={`${fmt(ratio*100,1)} %`} onChange={()=>{}}/></div></div><div className="calculation-card"><div className="calculation-card-title">PLAN GÖRÜNÜŞÜ</div><div className="jet-grid">{Array.from({length:25},(_,i)=><div className="jet-point" key={i}><span/></div>)}</div></div><div className="engineering-note">Yerleşim geometrisi prototip olarak hesaplanır. Tasarım dayanımı, kolon sürekliliği ve zemin iyileştirme doğrulaması henüz bu numunede standart hesabı değildir.</div></ScreenFrame> }

function ReportScreen() { return <ScreenFrame category="RAPOR" title="Mühendislik Raporu" description="Proje verilerinden üretilecek raporun canlı önizlemesi" actions={<><button>PDF ÖNİZLEME</button><button className="primary-button">RAPOR OLUŞTUR</button></>}><div className="report-preview"><div className="report-cover"><div className="report-logo">Z</div><h1>ZEMİNLAB</h1><p>Zemin Etüdü ve Geoteknik Tasarım Raporu</p><div className="report-line"/><span>Örnek Proje · 2026</span></div><div className="report-page"><h3>1. PROJE BİLGİLERİ</h3><p>Merkezi proje verileri, saha bilgileri ve hesap birimleri.</p><h3>2. ZEMİN MODELİ</h3><p>Sondaj, SPT ve laboratuvar sonuçlarının tabakalı özeti.</p><h3>3. ANALİZLER</h3><p>Taşıma gücü, oturma, sıvılaşma ve tasarım kontrolleri.</p></div></div></ScreenFrame> }

function Dashboard({ onOpen }: { onOpen: (s: ScreenId) => void }) { return <ScreenFrame category="PROJE" title="Proje Özeti" description="ZeminLab mühendislik çalışma alanı"><div className="metric-strip"><Metric label="Sondaj" value="3"/><Metric label="SPT kaydı" value="12"/><Metric label="Laboratuvar" value="9"/><Metric label="Analiz" value="4"/><Metric label="Rapor" value="1"/></div><div className="dashboard-grid"><div className="calculation-card"><div className="calculation-card-title">İŞ AKIŞI</div><div className="workflow"><button onClick={()=>onOpen('project-info')}><b>01</b><span>Proje bilgilerini tanımla</span></button><button onClick={()=>onOpen('boreholes')}><b>02</b><span>Saha ve sondaj verilerini gir</span></button><button onClick={()=>onOpen('soil-parameters')}><b>03</b><span>Zemin parametrelerini doğrula</span></button><button onClick={()=>onOpen('bearing-capacity')}><b>04</b><span>Analizleri çalıştır</span></button><button onClick={()=>onOpen('engineering-report')}><b>05</b><span>Raporu oluştur</span></button></div></div><div className="calculation-card"><div className="calculation-card-title">SPT PROFİLİ</div><MiniChart values={[8,14,18,24,30,36]} labels={['1.5','4','5.5','7.5','10','12']} unit="N"/></div></div><div className="calculation-card"><div className="calculation-card-title">SON İŞLEMLER</div><table className="data-table"><tbody><tr><td>Proje verileri</td><td>Hazır</td><td>Merkezi proje modeli</td></tr><tr><td>Sondaj-03</td><td>12.00 m</td><td>Veri tamamlandı</td></tr><tr><td>Taşıma gücü</td><td>Hazır</td><td>Hesap motoru bağlı</td></tr></tbody></table></div></ScreenFrame> }

function App() {
  const project = useProjectInfo(); const [active, setActive] = useState<ScreenId>('dashboard'); const [selected,setSelected]=useState('Proje Özeti'); const [tabs,setTabs]=useState<string[]>(['Proje Özeti']); const [activeTab,setActiveTab]=useState('Proje Özeti')
  const open = (screen: ScreenId, label = screenMeta[screen].title) => { setActive(screen); setSelected(label); setActiveTab(label); setTabs(t => t.includes(label) ? t : [...t,label]) }
  const render = () => {
    if(active==='dashboard') return <Dashboard onOpen={open}/>
    if(active==='project-info') return <ProjectInfoScreen/>
    if(active==='soil-profile') return <SoilProfile/>
    if(active==='bearing-capacity') return <BearingScreen/>
    if(active==='settlement') return <SettlementScreen/>
    if(active==='liquefaction') return <LiquefactionScreen/>
    if(active==='foundation') return <FoundationScreen/>
    if(active==='jet-grout') return <JetGroutScreen/>
    if(active==='engineering-report') return <ReportScreen/>
    return <DataScreen screen={active}/>
  }
  const units = project.unitSystem === 'ton-m' ? 'ton - m' : project.unitSystem === 'kPa-m' ? 'kPa - m' : 'kN - m'
  const selectTree = (label:string) => { const s=treeMap[label]; if(s) open(s,label) }
  return <div className="app-shell">
    <header className="title-bar"><div className="app-title"><div className="app-mark">Z</div><span>ZeminLab</span><span className="title-separator">|</span><span className="project-name">{project.title}</span></div><div className="window-controls"><button>−</button><button>□</button><button className="close">×</button></div></header>
    <nav className="menu-bar">{['Dosya','Düzen','Görünüm','Proje','Veri','Analiz','Tasarım','Rapor','Araçlar','Pencere','Yardım'].map(i=><button key={i}>{i}</button>)}</nav>
    <div className="toolbar"><div className="toolbar-section"><button className="tool-button" onClick={()=>open('dashboard','Proje Özeti')}><span>＋</span><b>Yeni</b></button><button className="tool-button"><span>▣</span><b>Aç</b></button><button className="tool-button"><span>▤</span><b>Kaydet</b></button></div><div className="toolbar-divider"/><div className="toolbar-section"><button className="tool-button"><span>↶</span><b>Geri Al</b></button><button className="tool-button"><span>↷</span><b>Yinele</b></button></div><div className="toolbar-divider"/><div className="toolbar-section"><button className="tool-button" onClick={()=>selectTree('Sondajlar')}><span>▤</span><b>Sondaj</b></button><button className="tool-button" onClick={()=>selectTree('SPT Kayıtları')}><span>N</span><b>SPT</b></button><button className="tool-button" onClick={()=>selectTree('Laboratuvar')}><span>▥</span><b>Laboratuvar</b></button></div><div className="toolbar-divider"/><div className="toolbar-section"><button className="tool-button emphasis" onClick={()=>selectTree('Taşıma Gücü')}><span>Σ</span><b>Analiz</b></button><button className="tool-button" onClick={()=>selectTree('Temel')}><span>⌂</span><b>Temel</b></button><button className="tool-button" onClick={()=>selectTree('Jet Grout')}><span>▦</span><b>Jet Grout</b></button><button className="tool-button" onClick={()=>selectTree('Mühendislik Raporu')}><span>▤</span><b>Rapor</b></button></div><div className="toolbar-spacer"/><span className="units-label">Birimler:</span><select className="units-select" value={units} onChange={e=>updateProjectInfo({...project,unitSystem:e.target.value==='ton - m'?'ton-m':e.target.value==='kPa - m'?'kPa-m':'kN-m'})}><option>kN - m</option><option>ton - m</option><option>kPa - m</option></select></div>
    <main className="main-layout"><aside className="panel explorer-panel"><div className="panel-header"><span>MODEL EXPLORER</span><div className="panel-header-buttons"><button>＋</button><button>⋮</button></div></div><div className="project-header"><span>▾</span><strong>ZEMİNLAB PROJESİ</strong></div><div className="tree"><TreeItem label="Proje Bilgileri" active={active==='project-info'} onSelect={()=>selectTree('Proje Bilgileri')}/><TreeItem label="Saha Bilgileri"><TreeItem label="Sondajlar" active={active==='boreholes'} onSelect={()=>selectTree('Sondajlar')}><TreeItem label="Sondaj-01"/><TreeItem label="Sondaj-02"/><TreeItem label="Sondaj-03" active={active==='soil-profile'} onSelect={()=>open('soil-profile','Sondaj-03')}><TreeItem label="Litoloji"/><TreeItem label="SPT"/><TreeItem label="Numuneler"/></TreeItem></TreeItem><TreeItem label="SPT Kayıtları" active={active==='spt'} onSelect={()=>selectTree('SPT Kayıtları')}/><TreeItem label="Laboratuvar" active={active==='laboratory'} onSelect={()=>selectTree('Laboratuvar')}/><TreeItem label="Zemin Profili" active={active==='soil-profile'} onSelect={()=>selectTree('Zemin Profili')}/></TreeItem><TreeItem label="Analiz"><TreeItem label="Zemin Parametreleri" active={active==='soil-parameters'} onSelect={()=>selectTree('Zemin Parametreleri')}/><TreeItem label="Taşıma Gücü" active={active==='bearing-capacity'} onSelect={()=>selectTree('Taşıma Gücü')}/><TreeItem label="Oturma" active={active==='settlement'} onSelect={()=>selectTree('Oturma')}/><TreeItem label="Sıvılaşma" active={active==='liquefaction'} onSelect={()=>selectTree('Sıvılaşma')}/></TreeItem><TreeItem label="Tasarım"><TreeItem label="Temel" active={active==='foundation'} onSelect={()=>selectTree('Temel')}/><TreeItem label="Jet Grout" active={active==='jet-grout'} onSelect={()=>selectTree('Jet Grout')}/></TreeItem><TreeItem label="Rapor"><TreeItem label="Hesap Kontrolü" active={active==='calculation-check'} onSelect={()=>selectTree('Hesap Kontrolü')}/><TreeItem label="Mühendislik Raporu" active={active==='engineering-report'} onSelect={()=>selectTree('Mühendislik Raporu')}/></TreeItem></div></aside>
      <section className="workspace"><div className="workspace-tabs">{tabs.map(t=><button key={t} className={`workspace-tab ${activeTab===t?'selected':''}`} onClick={()=>{setActiveTab(t);const entry=Object.entries(screenMeta).find(([,m])=>m.title===t);if(entry)setActive(entry[0] as ScreenId)}}>{t}<span className="tab-close">×</span></button>)}<div className="tab-spacer"/><button className="workspace-tab-action">＋</button></div><div className="workspace-content">{render()}</div></section>
      <aside className="panel properties-panel"><div className="panel-header"><span>PROPERTIES</span><div className="panel-header-buttons"><button>⋮</button></div></div><div className="property-object"><div className="object-icon">▤</div><div><div className="object-type">{screenMeta[active].category}</div><div className="object-name">{selected}</div></div></div><div className="property-section"><div className="property-section-title">SEÇİM</div><div className="property-row"><span>Ad</span><input value={selected} readOnly/></div><div className="property-row"><span>Ekran</span><input value={screenMeta[active].title} readOnly/></div><div className="property-row"><span>Birim</span><input value={units} readOnly/></div></div><div className="property-section"><div className="property-section-title">PROJE</div><div className="property-row"><span>Proje No</span><input value={project.projectNo || '—'} readOnly/></div><div className="property-row"><span>Mühendis</span><input value={project.engineer || '—'} readOnly/></div></div><div className="property-section"><div className="property-section-title">DURUM</div><div className="property-row"><span>Durum</span><div className="status-value"><span className="status-dot"/>Hazır</div></div></div></aside></main>
    <footer className="status-bar"><div><span className="status-indicator"/>Hazır</div><div className="status-center">ZeminLab · Geoteknik Mühendislik Sistemi</div><div className="status-right"><span>{units}</span><span>0 hata</span><span>0 uyarı</span></div></footer>
  </div>
}

export default App
