import { useState } from 'react'
import './assets/main.css'

type TreeItemProps = {
  label: string
  children?: React.ReactNode
  open?: boolean
  active?: boolean
}

function TreeItem({ label, children, open = true, active = false }: TreeItemProps) {
  const [expanded, setExpanded] = useState(open)

  return (
    <div className="tree-group">
      <div
        className={`tree-row ${active ? 'active' : ''}`}
        onClick={() => children && setExpanded(!expanded)}
      >
        {children ? (
          <span className={`tree-arrow ${expanded ? 'expanded' : ''}`}>▶</span>
        ) : (
          <span className="tree-spacer" />
        )}

        <span className="tree-icon">
          {children ? (expanded ? '▾' : '▸') : '•'}
        </span>

        <span>{label}</span>
      </div>

      {children && expanded && <div className="tree-children">{children}</div>}
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('Zemin Profili')
  const [units, setUnits] = useState('kN - m')
  const [selected, setSelected] = useState('Sondaj-03')

  const tabs = ['Zemin Profili', 'Sondaj-03', 'SPT', 'Sonuçlar']

  return (
    <div className="app-shell">
      {/* TITLE BAR */}
      <header className="title-bar">
        <div className="app-title">
          <div className="app-mark">Z</div>
          <span>ZeminLab</span>
          <span className="title-separator">|</span>
          <span className="project-name">Zemin Etüdü Projesi</span>
        </div>

        <div className="window-controls">
          <button>−</button>
          <button>□</button>
          <button className="close">×</button>
        </div>
      </header>

      {/* MENU */}
      <nav className="menu-bar">
        {[
          'Dosya',
          'Düzen',
          'Görünüm',
          'Proje',
          'Veri',
          'Analiz',
          'Tasarım',
          'Rapor',
          'Araçlar',
          'Pencere',
          'Yardım'
        ].map((item) => (
          <button key={item}>{item}</button>
        ))}
      </nav>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar-section">
          <button className="tool-button">
            <span className="tool-symbol">＋</span>
            <span>Yeni</span>
          </button>

          <button className="tool-button">
            <span className="tool-symbol">📂</span>
            <span>Aç</span>
          </button>

          <button className="tool-button">
            <span className="tool-symbol">▣</span>
            <span>Kaydet</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button className="tool-button">
            <span className="tool-symbol">↶</span>
            <span>Geri Al</span>
          </button>

          <button className="tool-button">
            <span className="tool-symbol">↷</span>
            <span>Yinele</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button className="tool-button">
            <span className="tool-symbol">▤</span>
            <span>Sondaj</span>
          </button>

          <button className="tool-button">
            <span className="tool-symbol">N</span>
            <span>SPT</span>
          </button>

          <button className="tool-button">
            <span className="tool-symbol">▥</span>
            <span>Laboratuvar</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button className="tool-button emphasis">
            <span className="tool-symbol">Σ</span>
            <span>Analiz</span>
          </button>

          <button className="tool-button">
            <span className="tool-symbol">⌂</span>
            <span>Temel</span>
          </button>

          <button className="tool-button">
            <span className="tool-symbol">▦</span>
            <span>Jet Grout</span>
          </button>

          <button className="tool-button">
            <span className="tool-symbol">▤</span>
            <span>Rapor</span>
          </button>
        </div>

        <div className="toolbar-spacer" />

        <label className="units-label">Birimler:</label>

        <select
          className="units-select"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
        >
          <option>kN - m</option>
          <option>ton - m</option>
          <option>kPa - m</option>
        </select>
      </div>

      {/* MAIN */}
      <main className="main-layout">
        {/* LEFT EXPLORER */}
        <aside className="panel explorer-panel">
          <div className="panel-header">
            <span>MODEL EXPLORER</span>
            <div className="panel-header-buttons">
              <button>＋</button>
              <button>⋮</button>
            </div>
          </div>

          <div className="project-header">
            <span className="folder-icon">▾</span>
            <strong>ZEMİNLAB PROJESİ</strong>
          </div>

          <div className="tree">
            <TreeItem label="Proje Bilgileri" />

            <TreeItem label="Saha Bilgileri">
              <TreeItem label="Sondajlar">
                <TreeItem label="Sondaj-01" />
                <TreeItem label="Sondaj-02" />
                <TreeItem
                  label="Sondaj-03"
                  active={selected === 'Sondaj-03'}
                >
                  <TreeItem label="Litoloji" />
                  <TreeItem label="SPT" />
                  <TreeItem label="Numuneler" />
                </TreeItem>
              </TreeItem>

              <TreeItem label="SPT Kayıtları" />
              <TreeItem label="Laboratuvar" />
              <TreeItem label="Zemin Profili" />
            </TreeItem>

            <TreeItem label="Analiz">
              <TreeItem label="Zemin Parametreleri" />
              <TreeItem label="Taşıma Gücü" />
              <TreeItem label="Oturma" />
              <TreeItem label="Sıvılaşma" />
            </TreeItem>

            <TreeItem label="Tasarım">
              <TreeItem label="Temel" />
              <TreeItem label="Jet Grout" />
            </TreeItem>

            <TreeItem label="Rapor">
              <TreeItem label="Hesap Kontrolü" />
              <TreeItem label="Mühendislik Raporu" />
            </TreeItem>
          </div>
        </aside>

        {/* CENTER */}
        <section className="workspace">
          <div className="workspace-tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`workspace-tab ${
                  activeTab === tab ? 'selected' : ''
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === 'Sondaj-03' && (
                  <span className="tab-close">×</span>
                )}
              </button>
            ))}

            <div className="tab-spacer" />
            <button className="workspace-tab-action">＋</button>
          </div>

          <div className="workspace-content">
            <div className="document-header">
              <div>
                <div className="document-title">Zemin Profili</div>
                <div className="document-subtitle">
                  Sondaj-03 · Zemin tabakaları ve saha verileri
                </div>
              </div>

              <div className="document-actions">
                <button>Yazdır</button>
                <button>Dışa Aktar</button>
              </div>
            </div>

            <div className="profile-view">
              <div className="profile-title">
                SONDaj-03 ZEMİN PROFİLİ
              </div>

              <div className="profile-table">
                <div className="profile-row profile-head">
                  <div>Derinlik</div>
                  <div>Litoloji</div>
                  <div>SPT-N</div>
                  <div>Yeraltı Suyu</div>
                </div>

                <div className="profile-row">
                  <div>0.00 – 1.50 m</div>
                  <div className="soil-cell fill-1">
                    Dolgu
                  </div>
                  <div>8</div>
                  <div>—</div>
                </div>

                <div className="profile-row">
                  <div>1.50 – 4.00 m</div>
                  <div className="soil-cell fill-2">
                    Siltli Kil
                  </div>
                  <div>14</div>
                  <div>—</div>
                </div>

                <div className="profile-row">
                  <div>4.00 – 7.50 m</div>
                  <div className="soil-cell fill-3">
                    Orta Sıkı Kum
                  </div>
                  <div>24</div>
                  <div>5.20 m</div>
                </div>

                <div className="profile-row">
                  <div>7.50 – 12.00 m</div>
                  <div className="soil-cell fill-4">
                    Sıkı Kum
                  </div>
                  <div>36</div>
                  <div>5.20 m</div>
                </div>
              </div>

              <div className="profile-footer">
                <div>
                  <strong>Sondaj Derinliği:</strong> 12.00 m
                </div>
                <div>
                  <strong>Koordinat:</strong> X: 423521.24 · Y: 4378215.61
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROPERTIES */}
        <aside className="panel properties-panel">
          <div className="panel-header">
            <span>PROPERTIES</span>
            <div className="panel-header-buttons">
              <button>⋮</button>
            </div>
          </div>

          <div className="property-object">
            <div className="object-icon">▤</div>

            <div>
              <div className="object-type">Sondaj</div>
              <div className="object-name">{selected}</div>
            </div>
          </div>

          <div className="property-section">
            <div className="property-section-title">
              GENEL
            </div>

            <div className="property-row">
              <span>Ad</span>
              <input value={selected} readOnly />
            </div>

            <div className="property-row">
              <span>Derinlik</span>
              <input value="12.00 m" readOnly />
            </div>

            <div className="property-row">
              <span>Koordinat X</span>
              <input value="423521.24" readOnly />
            </div>

            <div className="property-row">
              <span>Koordinat Y</span>
              <input value="4378215.61" readOnly />
            </div>
          </div>

          <div className="property-section">
            <div className="property-section-title">
              ZEMİN
            </div>

            <div className="property-row">
              <span>Tabaka</span>
              <input value="4" readOnly />
            </div>

            <div className="property-row">
              <span>Yeraltı Suyu</span>
              <input value="5.20 m" readOnly />
            </div>
          </div>

          <div className="property-section">
            <div className="property-section-title">
              DURUM
            </div>

            <div className="property-row">
              <span>Durum</span>
              <div className="status-value">
                <span className="status-dot" />
                Hazır
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* STATUS BAR */}
      <footer className="status-bar">
        <div className="status-left">
          <span className="status-indicator" />
          Hazır
        </div>

        <div className="status-center">
          ZeminLab · Mühendislik Analiz Sistemi
        </div>

        <div className="status-right">
          <span>{units}</span>
          <span>●</span>
          <span>0 hata</span>
          <span>0 uyarı</span>
        </div>
      </footer>
    </div>
  )
}

export default App