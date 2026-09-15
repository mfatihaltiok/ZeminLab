import { useState, type ReactNode } from 'react'
import './assets/main.css'
import PlaceholderScreen from './screens/PlaceholderScreen'
import BearingCapacity from './screens/analysis/BearingCapacity'
import ProjectInfo from './screens/project/ProjectInfo'
import { useProjectInfo } from '../../core/state/project-store'
import { screenDefinitions } from './screens/screen-definitions'
import type { ScreenId } from './screens/screen-types'

type TreeItemProps = {
  label: string
  children?: ReactNode
  open?: boolean
  active?: boolean
  selectable?: boolean
  onSelect?: () => void
}

function TreeItem({
  label,
  children,
  open = true,
  active = false,
  selectable = true,
  onSelect
}: TreeItemProps) {
  const [expanded, setExpanded] = useState(open)
  const handleClick = () => {
    if (children) setExpanded(!expanded)
    if (selectable && onSelect) onSelect()
  }
  return (
    <div className="tree-group">
      <div className={`tree-row ${active ? 'active' : ''}`} onClick={handleClick}>
        {children ? <span className={`tree-arrow ${expanded ? 'expanded' : ''}`}>▶</span> : <span className="tree-spacer" />}
        <span className="tree-icon">{children ? (expanded ? '▾' : '▸') : '•'}</span>
        <span>{label}</span>
      </div>
      {children && expanded && <div className="tree-children">{children}</div>}
    </div>
  )
}

const treeScreenMap: Record<string, ScreenId> = {
  'Proje Bilgileri': 'project-info',
  'Saha Bilgileri': 'site-info',
  Sondajlar: 'boreholes',
  SPT: 'spt',
  'SPT Kayıtları': 'spt',
  Laboratuvar: 'laboratory',
  'Zemin Profili': 'soil-profile',
  'Zemin Parametreleri': 'soil-parameters',
  'Taşıma Gücü': 'bearing-capacity',
  Oturma: 'settlement',
  Sıvılaşma: 'liquefaction',
  Temel: 'foundation',
  'Jet Grout': 'jet-grout',
  'Hesap Kontrolü': 'calculation-check',
  'Mühendislik Raporu': 'engineering-report'
}

function App() {
  const project = useProjectInfo()
  const [activeTab, setActiveTab] = useState('Zemin Profili')
  const [selected, setSelected] = useState('Sondaj-03')
  const [activeScreen, setActiveScreen] = useState<ScreenId>('soil-profile')

  const units = project.unitSystem === 'ton-m' ? 'ton - m' : project.unitSystem === 'kPa-m' ? 'kPa - m' : 'kN - m'
  const tabs = ['Zemin Profili', 'Sondaj-03', 'SPT', 'Sonuçlar']

  const selectTreeItem = (label: string) => {
    const screen = treeScreenMap[label]
    if (!screen) return
    setSelected(label)
    setActiveScreen(screen)
    const definition = screenDefinitions[screen]
    if (definition) setActiveTab(definition.title)
  }

  const selectBorehole = (name: string) => {
    setSelected(name)
    setActiveScreen('soil-profile')
    setActiveTab(name === 'Sondaj-03' ? 'Zemin Profili' : name)
  }

  const renderWorkspace = () => {
    if (activeScreen === 'project-info') return <ProjectInfo />
    if (activeScreen === 'bearing-capacity') return <BearingCapacity />
    if (activeScreen !== 'soil-profile') {
      const screen = screenDefinitions[activeScreen]
      if (screen) return <PlaceholderScreen screen={screen} />
    }
    return (
      <>
        <div className="document-header">
          <div><div className="document-title">Zemin Profili</div><div className="document-subtitle">Sondaj-03 · Zemin tabakaları ve saha verileri</div></div>
          <div className="document-actions"><button>Yazdır</button><button>Dışa Aktar</button></div>
        </div>
        <div className="profile-view">
          <div className="profile-title">SONDAJ-03 ZEMİN PROFİLİ</div>
          <div className="profile-table">
            <div className="profile-row profile-head"><div>Derinlik</div><div>Litoloji</div><div>SPT-N</div><div>Yeraltı Suyu</div></div>
            <div className="profile-row"><div>0.00 – 1.50 m</div><div className="soil-cell fill-1">Dolgu</div><div>8</div><div>—</div></div>
            <div className="profile-row"><div>1.50 – 4.00 m</div><div className="soil-cell fill-2">Siltli Kil</div><div>14</div><div>—</div></div>
            <div className="profile-row"><div>4.00 – 7.50 m</div><div className="soil-cell fill-3">Orta Sıkı Kum</div><div>24</div><div>5.20 m</div></div>
            <div className="profile-row"><div>7.50 – 12.00 m</div><div className="soil-cell fill-4">Sıkı Kum</div><div>36</div><div>5.20 m</div></div>
          </div>
          <div className="profile-footer"><div><strong>Sondaj Derinliği:</strong> 12.00 m</div><div><strong>Koordinat:</strong> X: 423521.24 · Y: 4378215.61</div></div>
        </div>
      </>
    )
  }

  const currentScreen = screenDefinitions[activeScreen]

  return (
    <div className="app-shell">
      <header className="title-bar">
        <div className="app-title"><div className="app-mark">Z</div><span>ZeminLab</span><span className="title-separator">|</span><span className="project-name">{project.title}</span></div>
        <div className="window-controls"><button>−</button><button>□</button><button className="close">×</button></div>
      </header>
      <nav className="menu-bar">{['Dosya', 'Düzen', 'Görünüm', 'Proje', 'Veri', 'Analiz', 'Tasarım', 'Rapor', 'Araçlar', 'Pencere', 'Yardım'].map((item) => <button key={item}>{item}</button>)}</nav>
      <div className="toolbar">
        <div className="toolbar-section"><button className="tool-button"><span className="tool-symbol">＋</span><span>Yeni</span></button><button className="tool-button"><span className="tool-symbol">📂</span><span>Aç</span></button><button className="tool-button"><span className="tool-symbol">▣</span><span>Kaydet</span></button></div>
        <div className="toolbar-divider" />
        <div className="toolbar-section"><button className="tool-button"><span className="tool-symbol">↶</span><span>Geri Al</span></button><button className="tool-button"><span className="tool-symbol">↷</span><span>Yinele</span></button></div>
        <div className="toolbar-divider" />
        <div className="toolbar-section"><button className="tool-button" onClick={() => selectTreeItem('Sondajlar')}><span className="tool-symbol">▤</span><span>Sondaj</span></button><button className="tool-button" onClick={() => selectTreeItem('SPT Kayıtları')}><span className="tool-symbol">N</span><span>SPT</span></button><button className="tool-button" onClick={() => selectTreeItem('Laboratuvar')}><span className="tool-symbol">▥</span><span>Laboratuvar</span></button></div>
        <div className="toolbar-divider" />
        <div className="toolbar-section"><button className="tool-button emphasis" onClick={() => selectTreeItem('Taşıma Gücü')}><span className="tool-symbol">Σ</span><span>Analiz</span></button><button className="tool-button" onClick={() => selectTreeItem('Temel')}><span className="tool-symbol">⌂</span><span>Temel</span></button><button className="tool-button" onClick={() => selectTreeItem('Jet Grout')}><span className="tool-symbol">▦</span><span>Jet Grout</span></button><button className="tool-button" onClick={() => selectTreeItem('Mühendislik Raporu')}><span className="tool-symbol">▤</span><span>Rapor</span></button></div>
        <div className="toolbar-spacer" /><label className="units-label">Birimler:</label>
        <select className="units-select" value={units} onChange={(e) => {
          const value = e.target.value
          const nextUnit = value === 'ton - m' ? 'ton-m' : value === 'kPa - m' ? 'kPa-m' : 'kN-m'
          import('../../core/state/project-store').then(({ updateProjectInfo }) => updateProjectInfo({ ...project, unitSystem: nextUnit }))
        }}><option>kN - m</option><option>ton - m</option><option>kPa - m</option></select>
      </div>
      <main className="main-layout">
        <aside className="panel explorer-panel">
          <div className="panel-header"><span>MODEL EXPLORER</span><div className="panel-header-buttons"><button>＋</button><button>⋮</button></div></div>
          <div className="project-header"><span className="folder-icon">▾</span><strong>ZEMİNLAB PROJESİ</strong></div>
          <div className="tree">
            <TreeItem label="Proje Bilgileri" active={activeScreen === 'project-info'} onSelect={() => selectTreeItem('Proje Bilgileri')} />
            <TreeItem label="Saha Bilgileri"><TreeItem label="Sondajlar"><TreeItem label="Sondaj-01" active={selected === 'Sondaj-01'} onSelect={() => selectBorehole('Sondaj-01')} /><TreeItem label="Sondaj-02" active={selected === 'Sondaj-02'} onSelect={() => selectBorehole('Sondaj-02')} /><TreeItem label="Sondaj-03" active={selected === 'Sondaj-03' && activeScreen === 'soil-profile'} onSelect={() => selectBorehole('Sondaj-03')}><TreeItem label="Litoloji" /><TreeItem label="SPT" /><TreeItem label="Numuneler" /></TreeItem></TreeItem><TreeItem label="SPT Kayıtları" active={activeScreen === 'spt'} onSelect={() => selectTreeItem('SPT Kayıtları')} /><TreeItem label="Laboratuvar" active={activeScreen === 'laboratory'} onSelect={() => selectTreeItem('Laboratuvar')} /><TreeItem label="Zemin Profili" active={activeScreen === 'soil-profile'} onSelect={() => selectTreeItem('Zemin Profili')} /></TreeItem>
            <TreeItem label="Analiz"><TreeItem label="Zemin Parametreleri" active={activeScreen === 'soil-parameters'} onSelect={() => selectTreeItem('Zemin Parametreleri')} /><TreeItem label="Taşıma Gücü" active={activeScreen === 'bearing-capacity'} onSelect={() => selectTreeItem('Taşıma Gücü')} /><TreeItem label="Oturma" active={activeScreen === 'settlement'} onSelect={() => selectTreeItem('Oturma')} /><TreeItem label="Sıvılaşma" active={activeScreen === 'liquefaction'} onSelect={() => selectTreeItem('Sıvılaşma')} /></TreeItem>
            <TreeItem label="Tasarım"><TreeItem label="Temel" active={activeScreen === 'foundation'} onSelect={() => selectTreeItem('Temel')} /><TreeItem label="Jet Grout" active={activeScreen === 'jet-grout'} onSelect={() => selectTreeItem('Jet Grout')} /></TreeItem>
            <TreeItem label="Rapor"><TreeItem label="Hesap Kontrolü" active={activeScreen === 'calculation-check'} onSelect={() => selectTreeItem('Hesap Kontrolü')} /><TreeItem label="Mühendislik Raporu" active={activeScreen === 'engineering-report'} onSelect={() => selectTreeItem('Mühendislik Raporu')} /></TreeItem>
          </div>
        </aside>
        <section className="workspace"><div className="workspace-tabs">{tabs.map((tab) => <button key={tab} className={`workspace-tab ${activeTab === tab ? 'selected' : ''}`} onClick={() => { setActiveTab(tab); if (tab === 'Zemin Profili') setActiveScreen('soil-profile'); if (tab === 'Sondaj-03') { setSelected('Sondaj-03'); setActiveScreen('soil-profile') } }}>{tab}{tab === 'Sondaj-03' && <span className="tab-close">×</span>}</button>)}<div className="tab-spacer" /><button className="workspace-tab-action">＋</button></div><div className="workspace-content">{renderWorkspace()}</div></section>
        <aside className="panel properties-panel"><div className="panel-header"><span>PROPERTIES</span><div className="panel-header-buttons"><button>⋮</button></div></div><div className="property-object"><div className="object-icon">▤</div><div><div className="object-type">{currentScreen?.category || 'SEÇİM'}</div><div className="object-name">{selected}</div></div></div><div className="property-section"><div className="property-section-title">GENEL</div><div className="property-row"><span>Ad</span><input value={selected} readOnly /></div><div className="property-row"><span>Ekran</span><input value={currentScreen?.title || ''} readOnly /></div><div className="property-row"><span>Kategori</span><input value={currentScreen?.category || ''} readOnly /></div></div><div className="property-section"><div className="property-section-title">ZEMİN</div><div className="property-row"><span>Tabaka</span><input value="4" readOnly /></div><div className="property-row"><span>Yeraltı Suyu</span><input value="5.20 m" readOnly /></div></div><div className="property-section"><div className="property-section-title">DURUM</div><div className="property-row"><span>Durum</span><div className="status-value"><span className="status-dot" />Hazır</div></div></div></aside>
      </main>
      <footer className="status-bar"><div className="status-left"><span className="status-indicator" />Hazır</div><div className="status-center">ZeminLab · Mühendislik Analiz Sistemi</div><div className="status-right"><span>{units}</span><span>●</span><span>0 hata</span><span>0 uyarı</span></div></footer>
    </div>
  )
}

export default App
