import { useState } from 'react'
import type { UnitSystem } from '../../../../core/models/project'
import { updateProjectInfo, useProjectInfo } from '../../../../core/state/project-store'

export default function ProjectInfo() {
  const project = useProjectInfo()
  const [showDocuments, setShowDocuments] = useState(false)

  const update = <K extends keyof typeof project>(key: K, value: (typeof project)[K]) => {
    updateProjectInfo({ ...project, [key]: value })
  }

  const updateSoil = <K extends keyof typeof project.soilParameters>(
    key: K,
    value: (typeof project.soilParameters)[K]
  ) => {
    updateProjectInfo({
      ...project,
      soilParameters: { ...project.soilParameters, [key]: value }
    })
  }

  const updateFoundation = <K extends keyof typeof project.foundationParameters>(
    key: K,
    value: (typeof project.foundationParameters)[K]
  ) => {
    updateProjectInfo({
      ...project,
      foundationParameters: { ...project.foundationParameters, [key]: value }
    })
  }

  return (
    <div className="engineering-screen project-info-screen">
      <div className="engineering-header">
        <div>
          <div className="engineering-title">Proje Bilgileri</div>
          <div className="engineering-subtitle">Merkezi proje verileri ve birim sistemi</div>
        </div>
      </div>

      <div className="engineering-content">
        <section className="calculation-card">
          <div className="calculation-card-title">GENEL PROJE BİLGİLERİ</div>
          <div className="project-form-grid">
            <label>Proje Adı<input value={project.title} onChange={(e) => update('title', e.target.value)} /></label>
            <label>Proje No<input value={project.projectNo} onChange={(e) => update('projectNo', e.target.value)} /></label>
            <label>Tarih<input type="date" value={project.date} onChange={(e) => update('date', e.target.value)} /></label>
            <label>Mühendis<input value={project.engineer} onChange={(e) => update('engineer', e.target.value)} /></label>
            <label>İl<input value={project.province} onChange={(e) => update('province', e.target.value)} /></label>
            <label>İlçe<input value={project.district} onChange={(e) => update('district', e.target.value)} /></label>
            <label className="project-form-wide">Adres<input value={project.address} onChange={(e) => update('address', e.target.value)} /></label>
            <label className="project-form-wide">Parsel Bilgisi<input value={project.parcelInfo} onChange={(e) => update('parcelInfo', e.target.value)} /></label>
          </div>
        </section>

        <section className="calculation-card">
          <div className="calculation-card-title">YAPI VE KURUM BİLGİLERİ</div>
          <div className="project-form-grid">
            <label>İşveren<input value={project.clientName} onChange={(e) => update('clientName', e.target.value)} /></label>
            <label>Firma<input value={project.firmName} onChange={(e) => update('firmName', e.target.value)} /></label>
            <label>Yapı Türü<input value={project.buildingType} onChange={(e) => update('buildingType', e.target.value)} /></label>
            <label>Bodrum Katı<input type="number" min="0" value={project.basementCount} onChange={(e) => update('basementCount', Number(e.target.value))} /></label>
            <label>Normal Kat<input type="number" min="0" value={project.normalFloorCount} onChange={(e) => update('normalFloorCount', Number(e.target.value))} /></label>
          </div>
        </section>

        <section className="calculation-card">
          <div className="calculation-card-title">MERKEZİ ZEMİN PARAMETRELERİ</div>
          <div className="project-form-grid">
            <label>Birim hacim ağırlık γ<input type="number" step="0.1" value={project.soilParameters.unitWeight} onChange={(e) => updateSoil('unitWeight', Number(e.target.value))} /><span>kN/m³</span></label>
            <label>Kohezyon c<input type="number" step="0.1" value={project.soilParameters.cohesion} onChange={(e) => updateSoil('cohesion', Number(e.target.value))} /><span>kPa</span></label>
            <label>İçsel sürtünme açısı φ<input type="number" step="0.1" value={project.soilParameters.frictionAngle} onChange={(e) => updateSoil('frictionAngle', Number(e.target.value))} /><span>°</span></label>
          </div>
        </section>

        <section className="calculation-card">
          <div className="calculation-card-title">TEMEL TANIMI VE BOYUTLARI</div>
          <div className="project-form-grid">
            <label>
              Temel tipi
              <select value={project.foundationParameters.foundationType} onChange={(e) => updateFoundation('foundationType', e.target.value as typeof project.foundationParameters.foundationType)}>
                <option value="tekil">Tekil Temel</option>
                <option value="surekli">Sürekli Temel</option>
                <option value="radye">Radye Temel</option>
              </select>
            </label>
            <label>Temel genişliği B<input type="number" step="0.01" min="0" value={project.foundationParameters.footingWidth} onChange={(e) => updateFoundation('footingWidth', Number(e.target.value))} /><span>m</span></label>
            <label>Temel uzunluğu L<input type="number" step="0.01" min="0" value={project.foundationParameters.footingLength} onChange={(e) => updateFoundation('footingLength', Number(e.target.value))} /><span>m</span></label>
            <label>Temel derinliği Df<input type="number" step="0.01" min="0" value={project.foundationParameters.footingDepth} onChange={(e) => updateFoundation('footingDepth', Number(e.target.value))} /><span>m</span></label>
            <label>Vtx · temele gelen deprem kuvveti<input type="number" step="0.01" value={project.foundationParameters.vtX} onChange={(e) => updateFoundation('vtX', Number(e.target.value))} /><span>kN</span></label>
            <label>Vty · temele gelen deprem kuvveti<input type="number" step="0.01" value={project.foundationParameters.vtY} onChange={(e) => updateFoundation('vtY', Number(e.target.value))} /><span>kN</span></label>
            <label>Yapı ağırlığı (G+Q kombinasyonu)<input type="number" step="0.01" min="0" value={project.foundationParameters.structuralWeight} onChange={(e) => updateFoundation('structuralWeight', Number(e.target.value))} /><span>kN</span></label>
          </div>
          <div className="project-documents-note">
            Vtx ve Vty, TBDY 2018 Bölüm 16.8.4 yatayda kayma kontrolünde temel tabanına gelen tasarım yatay kuvvetleri olarak kullanılır. FS kullanıcıdan alınmaz; ilgili dayanım katsayıları hesap motorunda uygulanır.
          </div>
        </section>

        <section className="calculation-card project-units-card">
          <div className="calculation-card-title">PROJE BİRİM SİSTEMİ</div>
          <div className="project-unit-row">
            <div><strong>Hesap birimleri</strong><span>Bu seçim tüm analiz ve tasarım ekranlarının ortak birim kaynağıdır.</span></div>
            <select value={project.unitSystem} onChange={(e) => update('unitSystem', e.target.value as UnitSystem)}>
              <option value="kN-m">kN - m</option>
              <option value="ton-m">ton - m</option>
              <option value="kPa-m">kPa - m</option>
            </select>
          </div>
        </section>

        <section className="calculation-card">
          <button className="project-documents-toggle" onClick={() => setShowDocuments(!showDocuments)}>
            {showDocuments ? '▾' : '▸'} Görsel Dokümanlar
          </button>
          {showDocuments && <div className="project-documents-note">Hava fotoğrafı, vaziyet planı, kesit, temel planı ve temel gerilmeleri merkezi proje verisine bağlanacaktır.</div>}
        </section>
      </div>
    </div>
  )
}
