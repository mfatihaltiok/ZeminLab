import { useState } from 'react'
import type { ProjectInfo as ProjectInfoModel, UnitSystem } from '../../../../core/models/project'

interface ProjectInfoProps {
  project: ProjectInfoModel
  onChange: (project: ProjectInfoModel) => void
}

export default function ProjectInfo({ project, onChange }: ProjectInfoProps) {
  const [showDocuments, setShowDocuments] = useState(false)

  const update = <K extends keyof ProjectInfoModel>(key: K, value: ProjectInfoModel[K]) => {
    onChange({ ...project, [key]: value })
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

        <section className="calculation-card project-units-card">
          <div className="calculation-card-title">PROJE BİRİM SİSTEMİ</div>
          <div className="project-unit-row">
            <div>
              <strong>Hesap birimleri</strong>
              <span>Bu seçim tüm analiz ve tasarım ekranlarının ortak birim kaynağıdır.</span>
            </div>
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
          {showDocuments && (
            <div className="project-documents-note">
              Hava fotoğrafı, vaziyet planı, kesit, temel planı ve temel gerilmeleri merkezi proje verisine bağlanacaktır.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
