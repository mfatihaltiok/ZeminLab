import { type ReactNode } from 'react'
import '../assets/engineering-report-pro.css'

export interface ReportCalculationStep {
  index: number
  symbol: string
  title: string
  formula: string
  substitution?: string
  value: number | string
  unit: string
  note?: string
}

export interface ReportSection {
  id: string
  title: string
  subtitle?: string
  method: string
  source: string
  inputs: Array<{ label: string; value: string; unit?: string }>
  steps: ReportCalculationStep[]
  results: Array<{ label: string; value: string; unit?: string; status?: 'ok' | 'warning' | 'fail' }>
  notes?: string[]
  figures?: ReportFigure[]
}

export interface ReportFigure {
  id: string
  type: 'section' | 'profile' | 'foundation' | 'jetgrout' | 'stress'
  title: string
  data: Record<string, unknown>
}

export interface EngineeringReportData {
  projectName: string
  projectNo: string
  date: string
  engineer: string
  client: string
  location: string
  sections: ReportSection[]
}

interface Props {
  data: EngineeringReportData
  onPrint?: () => void
}

function ReportHeader({ data }: { data: EngineeringReportData }) {
  return (
    <div className="erp-header">
      <div className="erp-header-left">
        <div className="erp-logo">FL</div>
        <div className="erp-header-text">
          <h1>FALUZMN</h1>
          <p>Geoteknik Mühendisliği Hesaplama Yazılımı</p>
        </div>
      </div>
      <div className="erp-header-right">
        <table className="erp-header-info">
          <tbody>
            <tr><td>Proje No:</td><td><b>{data.projectNo || '—'}</b></td></tr>
            <tr><td>Tarih:</td><td><b>{data.date || '—'}</b></td></tr>
            <tr><td>Mühendis:</td><td><b>{data.engineer || '—'}</b></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportInfoBlock({ data }: { data: EngineeringReportData }) {
  return (
    <div className="erp-info-block">
      <div className="erp-info-row">
        <div className="erp-info-item"><span>Proje Adı</span><b>{data.projectName || '—'}</b></div>
        <div className="erp-info-item"><span>Yer</span><b>{data.location || '—'}</b></div>
        <div className="erp-info-item"><span>İşveren</span><b>{data.client || '—'}</b></div>
      </div>
    </div>
  )
}

function CalculationStepRow({ step }: { step: ReportCalculationStep }) {
  return (
    <tr className="erp-step-row">
      <td className="erp-step-index">{step.index}</td>
      <td className="erp-step-symbol">{step.symbol}</td>
      <td className="erp-step-title">{step.title}</td>
      <td className="erp-step-formula">
        <code>{step.formula}</code>
        {step.substitution && <div className="erp-step-sub">= {step.substitution}</div>}
      </td>
      <td className="erp-step-value">
        <b>{typeof step.value === 'number' ? step.value.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) : step.value}</b>
        {step.unit && <span> {step.unit}</span>}
      </td>
      <td className="erp-step-note">{step.note || ''}</td>
    </tr>
  )
}

function InputTable({ inputs }: { inputs: Array<{ label: string; value: string; unit?: string }> }) {
  return (
    <table className="erp-input-table">
      <thead>
        <tr><th>Parametre</th><th>Değer</th><th>Birim</th></tr>
      </thead>
      <tbody>
        {inputs.map((inp, i) => (
          <tr key={i}>
            <td>{inp.label}</td>
            <td><b>{inp.value}</b></td>
            <td>{inp.unit || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ResultTable({ results }: { results: Array<{ label: string; value: string; unit?: string; status?: 'ok' | 'warning' | 'fail' }> }) {
  return (
    <table className="erp-result-table">
      <thead>
        <tr><th>Sonuç</th><th>Değer</th><th>Birim</th><th>Durum</th></tr>
      </thead>
      <tbody>
        {results.map((res, i) => (
          <tr key={i} className={res.status ? `erp-status-${res.status}` : ''}>
            <td>{res.label}</td>
            <td><b>{res.value}</b></td>
            <td>{res.unit || '—'}</td>
            <td className="erp-result-status">
              {res.status === 'ok' && <span className="erp-badge ok">✓ UYGUN</span>}
              {res.status === 'warning' && <span className="erp-badge warning">⚠ KONTROL</span>}
              {res.status === 'fail' && <span className="erp-badge fail">✗ UYGUN DEĞİL</span>}
              {!res.status && '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SectionPage({ section, pageRef }: { section: ReportSection; pageRef?: ReactNode }) {
  return (
    <div className="erp-section">
      <div className="erp-section-header">
        <div className="erp-section-number">{section.id}</div>
        <div className="erp-section-titles">
          <h2>{section.title}</h2>
          {section.subtitle && <p>{section.subtitle}</p>}
        </div>
        <div className="erp-section-method">
          <span>YÖNTEM</span>
          <b>{section.method}</b>
        </div>
      </div>

      <div className="erp-section-body">
        {/* Girdiler */}
        <div className="erp-block">
          <h3>Tanımlanan Parametreler</h3>
          <InputTable inputs={section.inputs} />
        </div>

        {/* Hesaplama Adımları */}
        <div className="erp-block">
          <h3>Hesaplama Adımları</h3>
          <table className="erp-calc-table">
            <thead>
              <tr>
                <th>Adım</th>
                <th>Sembol</th>
                <th>Açıklama</th>
                <th>Formül</th>
                <th>Sonuç</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {section.steps.map(step => <CalculationStepRow key={step.index} step={step} />)}
            </tbody>
          </table>
        </div>

        {/* Sonuçlar */}
        <div className="erp-block">
          <h3>Hesap Sonuçları</h3>
          <ResultTable results={section.results} />
        </div>

        {/* Notlar */}
        {section.notes && section.notes.length > 0 && (
          <div className="erp-block erp-notes">
            <h3>Notlar ve Uyarılar</h3>
            <ul>
              {section.notes.map((note, i) => <li key={i}>{note}</li>)}
            </ul>
          </div>
        )}

        {/* Kaynak Referansı */}
        <div className="erp-source-ref">
          <span>REFERANS:</span> {section.source}
        </div>
      </div>
      {pageRef}
    </div>
  )
}

export function EngineeringReportProfessional({ data, onPrint }: Props) {
  return (
    <div className="erp-container">
      {/* Kapak */}
      <div className="erp-cover">
        <div className="erp-cover-content">
          <div className="erp-cover-logo">FALUZMN</div>
          <div className="erp-cover-divider" />
          <h1>GEOTEKNİK MÜHENDİSLİK<br />HESAP RAPORU</h1>
          <div className="erp-cover-divider" />
          <div className="erp-cover-info">
            <table>
              <tbody>
                <tr><td>Proje Adı:</td><td><b>{data.projectName || '—'}</b></td></tr>
                <tr><td>Proje No:</td><td><b>{data.projectNo || '—'}</b></td></tr>
                <tr><td>Lokasyon:</td><td><b>{data.location || '—'}</b></td></tr>
                <tr><td>Tarih:</td><td><b>{data.date || '—'}</b></td></tr>
                <tr><td>Mühendis:</td><td><b>{data.engineer || '—'}</b></td></tr>
                <tr><td>İşveren:</td><td><b>{data.client || '—'}</b></td></tr>
              </tbody>
            </table>
          </div>
          <div className="erp-cover-footer">
            <p>Bu rapor FALUZMN geoteknik mühendisliği yazılımı tarafından üretilmiştir.</p>
            <p>TBDY 2018 · TS EN 1997 · Erol & Çekinmez (2014, 2018)</p>
          </div>
        </div>
      </div>

      {/* İçindekiler */}
      <div className="erp-toc">
        <h2>İÇİNDEKİLER</h2>
        <div className="erp-toc-list">
          {data.sections.map((section, i) => (
            <div key={section.id} className="erp-toc-item">
              <span className="erp-toc-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="erp-toc-title">{section.title}</span>
              <span className="erp-toc-method">{section.method}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Proje Bilgileri */}
      <div className="erp-project-info-page">
        <h2>PROJE BİLGİLERİ</h2>
        <ReportInfoBlock data={data} />
        <ReportHeader data={data} />
      </div>

      {/* Hesaplama Bölümleri */}
      {data.sections.map(section => (
        <SectionPage key={section.id} section={section} />
      ))}

      {/* İmza Sayfası */}
      <div className="erp-signature-page">
        <h2>ONAY VE İMZA</h2>
        <div className="erp-signature-grid">
          <div className="erp-signature-box">
            <div className="erp-sig-label">Hazırlayan</div>
            <div className="erp-sig-name">{data.engineer || '—'}</div>
            <div className="erp-sig-line" />
            <div className="erp-sig-date">Tarih: {data.date || '—'}</div>
          </div>
          <div className="erp-signature-box">
            <div className="erp-sig-label">Kontrol Eden</div>
            <div className="erp-sig-name">—</div>
            <div className="erp-sig-line" />
            <div className="erp-sig-date">Tarih: —</div>
          </div>
          <div className="erp-signature-box">
            <div className="erp-sig-label">Onaylayan</div>
            <div className="erp-sig-name">—</div>
            <div className="erp-sig-line" />
            <div className="erp-sig-date">Tarih: —</div>
          </div>
        </div>
      </div>

      {/* Yazdır butonu */}
      {onPrint && (
        <button className="erp-print-button" onClick={onPrint}>
          🖨️ Raporu Yazdır / PDF Olarak Kaydet
        </button>
      )}
    </div>
  )
}
