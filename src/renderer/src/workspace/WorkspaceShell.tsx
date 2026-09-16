import { useState, type ReactNode } from 'react'
import { updateProjectInfo, useProjectInfo } from '../../../core/state/project-store'
import { DISPLAY_UNITS } from '../../../core/units/unit-conversion'

export type ScreenId = 'dashboard' | 'project-info' | 'field' | 'profile' | 'bearing-capacity' | 'settlement' | 'liquefaction' | 'foundation' | 'jet-grout' | 'report' | 'unit-converter'
export const SCREEN_META: Record<ScreenId, { title: string; group: string; description: string }> = {
  dashboard: { title: 'Proje Özeti', group: 'PROJE', description: 'Projenin veri bütünlüğünü, saha araştırması durumunu ve analiz hazırlığını tek ekranda izleyin.' },
  'project-info': { title: 'Proje Bilgileri', group: 'PROJE', description: 'Proje kimliği, jeofizik Vs30 değerlendirmesi ve hazır deprem tehlike parametreleri burada tanımlanır.' },
  field: { title: 'Sondaj / SPT / Laboratuvar', group: 'SAHA ARAŞTIRMALARI', description: 'Sahada elde edilen ham veriler değiştirilmeden kaydedilir; SPT ve laboratuvar sonuçları sondaj logunun ortak veri kaynağını oluşturur.' },
  profile: { title: 'Zemin Profili', group: 'SAHA ARAŞTIRMALARI', description: 'Sondaj ve deney sonuçlarından mühendislik amaçlı sadeleştirilmiş zemin modeli oluşturulur.' },
  'bearing-capacity': { title: 'Taşıma Gücü', group: 'ANALİZ', description: 'Seçilen yöntem, parametre kaynağı, ara katsayılar ve sonuçlar adım adım gösterilir.' },
  settlement: { title: 'Oturma', group: 'ANALİZ', description: 'Elastik ve konsolidasyon bileşenleri hesap iziyle birlikte değerlendirilir.' },
  liquefaction: { title: 'Sıvılaşma', group: 'ANALİZ', description: 'SPT, gerilme ve deprem girdileri kaynaklarıyla birlikte katman bazında değerlendirilir.' },
  foundation: { title: 'Temel Tasarımı', group: 'TASARIM', description: 'Geometri, yükler ve zemin tepkisi aynı tasarım nesnesi üzerinden kontrol edilir.' },
  'jet-grout': { title: 'Jet Grout', group: 'TASARIM', description: 'Kolon geometrisi, malzeme dayanımı, düzen ve yük paylaşımı proje deneyleriyle ilişkilendirilir.' },
  report: { title: 'Mühendislik Raporu', group: 'RAPOR', description: 'Girdi → yöntem → ara hesap → sonuç → kontrol zincirini okunaklı rapor sayfalarına dönüştürür.' },
  'unit-converter': { title: 'Birim Dönüştürme', group: 'ARAÇLAR', description: 'Uzunluk, alan, hacim, kütle, kuvvet, gerilme ve birim hacim ağırlık birimlerini tek merkezden dönüştürün.' }
}

export function Frame({ screen, children }: { screen: ScreenId; children: ReactNode }) { const m = SCREEN_META[screen]; return <section className="engineering-screen"><header className="engineering-header"><div><div className="engineering-header-category">{m.group}</div><h2>{m.title}</h2></div></header><div className="engineering-content">{children}</div></section> }
export function Field({ label, value, onChange, type = 'number' }: { label: string; value: string | number | undefined; onChange: (v: string) => void; type?: string }) { return <label><span>{label}</span><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></label> }
export function Card({ title, children }: { title: string; children: ReactNode }) { return <div className="calculation-card"><div className="calculation-card-title">{title}</div>{children}</div> }
export function Metric({ label, value, unit, tone }: { label: string; value: string | number; unit?: string; tone?: string }) { return <div className={`metric ${tone ?? ''}`}><span>{label}</span><strong>{value}</strong>{unit && <small>{unit}</small>}</div> }
export function Source({ children }: { children: ReactNode }) { return <div className="engineering-note"><b>Kaynak / yöntem:</b> {children}</div> }
export function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) { return <table className="data-table"><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table> }

const groups: { name: string; items: ScreenId[] }[] = [
  { name: 'PROJE', items: ['dashboard', 'project-info'] },
  { name: 'SAHA ARAŞTIRMALARI', items: ['field', 'profile'] },
  { name: 'ANALİZ', items: ['bearing-capacity', 'settlement', 'liquefaction'] },
  { name: 'TASARIM', items: ['foundation', 'jet-grout'] },
  { name: 'RAPOR', items: ['report'] },
  { name: 'ARAÇLAR', items: ['unit-converter'] }
]

type WorkspaceActions = { onNewProject: () => void; onOpenProject: () => void; onSaveProject: () => void }
type WorkspaceShellProps = { screen: ScreenId; onScreenChange: (screen: ScreenId) => void; children: ReactNode } & WorkspaceActions

function InfoPanel({ screen }: { screen: ScreenId }) {
  const meta = SCREEN_META[screen]
  const help: Record<ScreenId, { steps: string[]; source: string }> = {
    dashboard: { steps: ['Proje kimliğini tamamlayın.', 'Saha verilerini girin.', 'Zemin profilini oluşturun.', 'Analiz ve tasarım modüllerini çalıştırın.'], source: 'ZeminLab proje çalışma akışı' },
    'project-info': { steps: ['Vs30 girildiğinde jeofizik zemin grubu otomatik belirlenir.', 'Ss, S1, Fs ve F1 hazır veriler olarak saklanır.', 'Saha deneylerinden elde edilen mühendislik sınıfı ayrıca raporlanır.'], source: 'TBDY 2018 · Bölüm 16 ve ilgili tablolar' },
    field: { steps: ['Ham saha verisini girin.', 'SPT ve laboratuvar numunelerini eşleştirin.', 'Sondaj logunda birleşik sonucu kontrol edin.'], source: 'TBDY 2018 Ek 16A · saha araştırmaları' },
    profile: { steps: ['Katmanları sondajlardan oluşturun.', 'Parametre kaynaklarını görün.', 'Tasarım için temsilci değerleri seçin.'], source: 'Saha verileri + laboratuvar + mühendislik korelasyonları' },
    'bearing-capacity': { steps: ['Temel ve yükleri seçin.', 'Zemin parametrelerinin kaynaklarını kontrol edin.', 'Ara katsayıları ve sonuçları inceleyin.'], source: 'Seçilen geoteknik yöntem ve proje standardı' },
    settlement: { steps: ['Katman bazlı gerilmeleri oluşturun.', 'Deformasyon parametrelerini belirleyin.', 'Bileşenleri ayrı, toplamı birlikte raporlayın.'], source: 'Seçilen oturma yöntemi' },
    liquefaction: { steps: ['Deprem girdilerini doğrulayın.', 'SPT düzeltmelerini inceleyin.', 'Katman bazında güvenlik oranlarını raporlayın.'], source: 'TBDY 2018 Ek 16B' },
    foundation: { steps: ['Geometriyi tanımlayın.', 'Yük durumlarını bağlayın.', 'Zemin tepkisi ve kontrolleri çalıştırın.'], source: 'TBDY 2018 + TS 500 proje girdileri' },
    'jet-grout': { steps: ['Kolon geometrisini tanımlayın.', 'Deneysel dayanımı ve düzeni girin.', 'Kompozit sistem kontrollerini çalıştırın.'], source: 'Proje deneyleri + seçilen jet grout modeli' },
    report: { steps: ['Rapor kapsamını seçin.', 'Hesap izlerini dahil edin.', 'Yatay A4 tabloları ve grafikleri kontrol edin.'], source: 'Proje veri geçmişi + hesap motorları' },
    'unit-converter': { steps: ['Kategori seçin.', 'Kaynak ve hedef birimi seçin.', 'Dönüşüm sonucunu kopyalayın veya proje girdisine aktarın.'], source: 'Merkezi ZeminLab birim dönüşüm motoru' }
  }
  return <aside className="panel contextual-panel"><div className="panel-header"><span>ÇALIŞMA NOTLARI</span></div><div className="contextual-content"><div className="context-icon">{screen === 'report' ? '▤' : screen === 'field' ? '⌁' : 'i'}</div><h3>{meta.title}</h3><p className="context-description">{meta.description}</p><div className="context-section-title">İŞ AKIŞI</div><ol>{help[screen].steps.map((step, i) => <li key={step}><b>{String(i + 1).padStart(2, '0')}</b><span>{step}</span></li>)}</ol><div className="context-source"><span>KAYNAK</span><b>{help[screen].source}</b></div>{screen === 'project-info' && <div className="context-note"><b>Jeofizik zemin sınıfı</b><span>Vs30 değerinden otomatik belirlenir. ZF, yalnızca özel saha değerlendirmesiyle atanabilir.</span></div>}{screen === 'field' && <div className="context-note"><b>Veri ilkesi</b><span>Ham saha verisi korunur. Yorumlama ve mühendislik korelasyonu ayrı aşamada gösterilir.</span></div>}{screen === 'report' && <div className="context-note"><b>Rapor standardı</b><span>Hesaplar yalnızca sonuç olarak değil, sınav kâğıdında çözüm gösterir gibi ara adımlarıyla sunulur.</span></div>}</div></aside>
}

export function WorkspaceShell({ screen, onScreenChange, onNewProject, onOpenProject, onSaveProject, children }: WorkspaceShellProps) {
  const project = useProjectInfo()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ PROJE: true, 'SAHA ARAŞTIRMALARI': true, ANALİZ: true, TASARIM: true, RAPOR: true, ARAÇLAR: true })
  const [leftVisible, setLeftVisible] = useState(true)
  const [rightVisible, setRightVisible] = useState(true)
  const go = (id: ScreenId) => onScreenChange(id)
  return <div className="app-shell">
    <div className="title-bar"><div className="app-title"><div className="app-mark">Z</div><b>ZeminLab</b><span className="title-separator">|</span><span className="project-name">{project.title || 'Yeni Proje'}</span></div><div className="window-controls"><button onClick={() => window.api.window.minimize()} aria-label="Küçült">_</button><button onClick={() => window.api.window.maximizeToggle()} aria-label="Büyüt">□</button><button className="close" onClick={() => window.api.window.close()} aria-label="Kapat">×</button></div></div>
    <div className="menu-bar">{['Dosya', 'Düzen', 'Görünüm', 'Tanımlar', 'Analiz', 'Tasarım', 'Rapor', 'Yardım'].map((x) => <button key={x}>{x}</button>)}</div>
    <div className="toolbar"><div className="toolbar-section"><button className="tool-button" onClick={onNewProject}><span>＋</span><b>Yeni</b></button><button className="tool-button" onClick={onOpenProject}><span>□</span><b>Aç</b></button><button className="tool-button" onClick={onSaveProject}><span>▣</span><b>Kaydet</b></button></div><div className="toolbar-divider" /><div className="toolbar-section"><button className="tool-button" onClick={() => go('field')}><span>⌁</span><b>Sondaj</b></button><button className="tool-button" onClick={() => go('field')}><span>N</span><b>SPT</b></button><button className="tool-button" onClick={() => go('field')}><span>▥</span><b>Laboratuvar</b></button></div><div className="toolbar-divider" /><div className="toolbar-section"><button className="tool-button emphasis" onClick={() => go('bearing-capacity')}><span>∑</span><b>Analiz</b></button><button className="tool-button emphasis" onClick={() => go('foundation')}><span>⌂</span><b>Temel</b></button><button className="tool-button emphasis" onClick={() => go('jet-grout')}><span>◉</span><b>Jet Grout</b></button><button className="tool-button emphasis" onClick={() => go('report')}><span>▤</span><b>Rapor</b></button></div><div className="toolbar-spacer" /><span className="units-label">Birim</span><select className="units-select" value={project.unitSystem} onChange={(e) => updateProjectInfo({ ...project, unitSystem: e.target.value as typeof project.unitSystem })}><option value="ton-m">ton-m</option><option value="tf-m">tonf-m</option><option value="kgf-cm">kgf-cm</option><option value="lb-ft">lb-ft</option></select></div>
    <div className="main-layout" style={{ gridTemplateColumns: `${leftVisible ? '255px' : '0px'} minmax(520px,1fr) ${rightVisible ? '305px' : '0px'}` }}>
      {leftVisible && <aside className="panel"><div className="panel-header"><span>MODEL EXPLORER</span><div className="panel-header-buttons"><button onClick={() => setLeftVisible(false)} aria-label="Model Explorer'ı kapat">×</button></div></div><div className="project-header"><b>▾</b><span>{project.projectNo || 'YENİ PROJE'}</span></div><div className="tree">{groups.map((group) => <div key={group.name}><div className="tree-row clickable" onClick={() => setExpanded((s) => ({ ...s, [group.name]: !s[group.name] }))}><span className={`tree-arrow ${expanded[group.name] ? 'expanded' : ''}`}>▶</span><span className="tree-icon">▣</span><b>{group.name}</b></div>{expanded[group.name] && <div className="tree-children">{group.items.map((id) => <div key={id} className={`tree-row clickable ${screen === id ? 'active' : ''}`} onClick={() => go(id)}><span className="tree-arrow" /><span className="tree-icon">•</span><span>{SCREEN_META[id].title}</span></div>)}</div>}</div>)}</div></aside>}
      <main className="workspace"><div className="workspace-tabs"><button className="workspace-tab selected"><span className="tab-dot" />{SCREEN_META[screen].title}<span className="tab-close" onClick={(e) => { e.stopPropagation(); go('dashboard') }}>×</span></button><div className="tab-spacer" /><button className="workspace-tab-action" onClick={() => { setLeftVisible(true); setRightVisible(true) }}>+</button></div><div className="workspace-content">{children}</div></main>
      {rightVisible && <InfoPanel screen={screen} />}
    </div>
    <div className="status-bar"><span>{SCREEN_META[screen].group} / {SCREEN_META[screen].title}</span><span className="status-center">ZeminLab Engineering Workspace</span><span className="status-right"><span><i className="status-indicator" />Hazır</span><span>{DISPLAY_UNITS.force.replace('tf', 'tonf')} · {DISPLAY_UNITS.stress.replace('tfm2', 'tonf/m²')}</span></span></div>
  </div>
}
