import { useEffect, useMemo, useState } from 'react'
import '../assets/field-workspace.css'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../../../core/models/field-data'
import { classifyLaboratoryRecord, deriveSptValues } from '../../../core/engineering/field-calculations'

type Props = {
  boreholes: BoreholeRecord[]
  labs: LaboratoryRecord[]
  onBoreholesChange: (rows: BoreholeRecord[]) => void
  onLabsChange: (rows: LaboratoryRecord[]) => void
}

type SoilOption = { code: string; description: string; colorClass: BoreholeRecord['lithology'][number]['colorClass'] }

const soilOptions: SoilOption[] = [
  { code: 'lBo', description: 'İri Blok (> 630 mm)', colorClass: 'gravel' },
  { code: 'Bo', description: 'Blok (200 mm – 630 mm)', colorClass: 'gravel' },
  { code: 'Co', description: 'Büyük Çakıl / Taş (63 mm – 200 mm)', colorClass: 'gravel' },
  { code: 'cGr', description: 'İri Çakıl (20 mm – 63 mm)', colorClass: 'gravel' },
  { code: 'mGr', description: 'Orta Çakıl (6.3 mm – 20 mm)', colorClass: 'gravel' },
  { code: 'fGr', description: 'İnce Çakıl (2.0 mm – 6.3 mm)', colorClass: 'gravel' },
  { code: 'GrW', description: 'İyi Derecelenmiş Çakıl', colorClass: 'gravel' },
  { code: 'GrM', description: 'Orta Derecelenmiş Çakıl', colorClass: 'gravel' },
  { code: 'GrP', description: 'Kötü Derecelenmiş Çakıl', colorClass: 'gravel' },
  { code: 'GrU', description: 'Üniform / Tek Boyutlu Çakıl', colorClass: 'gravel' },
  { code: 'GrG', description: 'Boşluklu Derecelenmiş Çakıl', colorClass: 'gravel' },
  { code: 'cSa', description: 'İri Kum (0.63 mm – 2.0 mm)', colorClass: 'sand' },
  { code: 'mSa', description: 'Orta Kum (0.2 mm – 0.63 mm)', colorClass: 'sand' },
  { code: 'fSa', description: 'İnce Kum (0.063 mm – 0.2 mm)', colorClass: 'sand' },
  { code: 'SaW', description: 'İyi Derecelenmiş Kum', colorClass: 'sand' },
  { code: 'SaM', description: 'Orta Derecelenmiş Kum', colorClass: 'sand' },
  { code: 'SaP', description: 'Kötü Derecelenmiş Kum', colorClass: 'sand' },
  { code: 'SaU', description: 'Üniform / Tek Boyutlu Kum', colorClass: 'sand' },
  { code: 'SaG', description: 'Boşluklu Derecelenmiş Kum', colorClass: 'sand' },
  { code: 'SiL', description: 'Düşük Plastisiteli Silt', colorClass: 'silt' },
  { code: 'SiM', description: 'Orta Plastisiteli Silt', colorClass: 'silt' },
  { code: 'SiH', description: 'Yüksek Plastisiteli Silt', colorClass: 'silt' },
  { code: 'SiVL', description: 'Çok Yüksek Plastisiteli Silt', colorClass: 'silt' },
  { code: 'SiEH', description: 'Aşırı Yüksek Plastisiteli Silt', colorClass: 'silt' },
  { code: 'CIL', description: 'Düşük Plastisiteli Kil', colorClass: 'clay' },
  { code: 'CIM', description: 'Orta Plastisiteli Kil', colorClass: 'clay' },
  { code: 'CIH', description: 'Yüksek Plastisiteli Kil', colorClass: 'clay' },
  { code: 'CVL', description: 'Çok Yüksek Plastisiteli Kil', colorClass: 'clay' },
  { code: 'CEH', description: 'Aşırı Yüksek Plastisiteli Kil', colorClass: 'clay' },
  { code: 'saCl', description: 'Kumlu Kil', colorClass: 'clay' },
  { code: 'grCl', description: 'Çakıllı Kil', colorClass: 'clay' },
  { code: 'clSa', description: 'Killi Kum', colorClass: 'sand' },
  { code: 'siSa', description: 'Siltli Kum', colorClass: 'sand' },
  { code: 'Pt', description: 'Torf / Bataklık Zemini', colorClass: 'fill' },
  { code: 'AnSa', description: 'Yapay / Antropojenik Kum', colorClass: 'fill' },
  { code: 'AnCl', description: 'Yapay / Antropojenik Kil', colorClass: 'fill' }
]

const soilMap = new Map(soilOptions.map((item) => [item.code, item]))
const numericLab = new Set<keyof LaboratoryRecord>(['depth', 'waterContent', 'unitWeight', 'liquidLimit', 'plasticLimit', 'plasticityIndex', 'c', 'phi', 'finesContent'])

function sourceLabel(source: string, confirmed?: boolean) {
  if (confirmed) return 'Onaylandı'
  if (source === 'image-review') return 'Görsel inceleme'
  if (source === 'imported') return 'İçe aktarıldı'
  return 'Manuel'
}

function format(value?: number, digits = 2) {
  return value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits)
}

function blankBorehole(index: number): BoreholeRecord {
  return {
    id: crypto.randomUUID(),
    name: `SK-${String(index).padStart(2, '0')}`,
    totalDepth: 15,
    groundwaterDepth: undefined,
    elevation: undefined,
    location: '',
    lithology: [],
    spt: []
  }
}

function addSptRow(borehole: BoreholeRecord): BoreholeRecord {
  const sptRows = borehole.spt.filter((row) => row.testType === 'SPT')
  const nextDepth = sptRows.length === 0 ? 1.5 : Math.max(...sptRows.map((row) => row.depth)) + 1.5
  return {
    ...borehole,
    spt: [...borehole.spt, { id: crypto.randomUUID(), depth: nextDepth, testType: 'SPT', source: 'manual', confirmed: false }]
      .sort((a, b) => a.depth - b.depth)
  }
}

function SondajLog({ borehole }: { borehole: BoreholeRecord }) {
  const depth = Math.max(borehole.totalDepth, 1)
  const rows = [...borehole.spt].sort((a, b) => a.depth - b.depth)
  const segments = rows.map((row, index) => {
    const from = index === 0 ? 0 : (rows[index - 1].depth + row.depth) / 2
    const to = index === rows.length - 1 ? depth : (row.depth + (rows[index + 1]?.depth ?? depth)) / 2
    const soil = soilMap.get(row.soilCode ?? '')
    return { row, from: Math.max(0, from), to: Math.min(depth, Math.max(from, to)), soil }
  }).filter((segment) => segment.to > segment.from)

  return (
    <div className="log-only">
      <div className="log-summary">
        <div><span>Kuyu</span><b>{borehole.name}</b></div>
        <div><span>Toplam Derinlik</span><b>{borehole.totalDepth.toFixed(1)} m</b></div>
        <div><span>YASS</span><b>{borehole.groundwaterDepth === undefined ? '—' : `${borehole.groundwaterDepth.toFixed(2)} m`}</b></div>
        <div><span>SPT Seviyesi</span><b>{rows.filter((r) => r.testType === 'SPT').length}</b></div>
      </div>
      <div className="log-graphic">
        <div className="log-ruler">
          {Array.from({ length: Math.floor(depth) + 1 }, (_, i) => i).filter((d) => d % 2 === 0 || d === depth).map((d) => (
            <span key={d} style={{ top: `${(d / depth) * 100}%` }}>{d} m</span>
          ))}
        </div>
        <div className="log-column">
          {segments.length === 0 && <div className="log-empty">SPT verisi girildiğinde zemin profili burada otomatik oluşturulur.</div>}
          {segments.map(({ row, from, to, soil }) => (
            <div key={row.id} className={`log-layer ${soil?.colorClass ?? 'fill'}`} style={{ top: `${(from / depth) * 100}%`, height: `${Math.max(1, ((to - from) / depth) * 100)}%` }}>
              <b>{row.soilCode || '—'}</b><span>{row.soilDescription || soil?.description || 'Zemin sınıfı seçilmedi'}</span>
            </div>
          ))}
          {borehole.groundwaterDepth !== undefined && borehole.groundwaterDepth <= depth && (
            <div className="log-water" style={{ top: `${(borehole.groundwaterDepth / depth) * 100}%` }}><span>YASS {borehole.groundwaterDepth.toFixed(2)} m</span></div>
          )}
        </div>
      </div>
      <div className="log-note">Bu alan yalnızca görsel sondaj logudur. Kullanıcı burada zemin katmanı veya başka bir parametre girmez. Profil, SPT ve laboratuvar verilerinden oluşturulur.</div>
    </div>
  )
}

function SptAnalysis({ borehole }: { borehole: BoreholeRecord }) {
  const rows = borehole.spt.filter((record) => record.testType === 'SPT').map((record) => ({ record, derived: deriveSptValues(borehole, record) }))
  return (
    <div className="engineering-grid-wrap">
      <div className="grid-toolbar"><b>SPT HESAP İZİ</b><span>N30 · N60 · σv · σ′v · (N1)60</span></div>
      <table className="engineering-grid engineering-grid-analysis">
        <thead><tr><th>Derinlik</th><th>N30</th><th>N60</th><th>σv</th><th>σ′v</th><th>CN</th><th>(N1)60</th><th>Dilatasyon</th></tr></thead>
        <tbody>{rows.map(({ record, derived }) => <tr key={record.id}>
          <td>{format(record.depth)}</td><td>{format(derived.nField, 0)}</td><td>{format(derived.n60)}</td><td>{format(derived.verticalStress)}</td><td>{format(derived.effectiveStress)}</td><td>{format(derived.overburdenCorrection)}</td><td>{format(derived.n1_60)}</td><td>{derived.dilatancyApplied ? `Uygulandı → ${format(derived.n60DilatancyCorrected)}` : '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  )
}

function SptGrid({ borehole, onChange }: { borehole: BoreholeRecord; onChange: (row: BoreholeRecord) => void }) {
  const update = (id: string, key: keyof SptRecord, raw: string) => {
    const row = borehole.spt.find((item) => item.id === id)
    if (!row) return
    if (key === 'depth') {
      const depth = raw === '' ? 0 : Number(raw)
      onChange({ ...borehole, spt: borehole.spt.map((item) => item.id === id ? { ...item, depth } : item).sort((a, b) => a.depth - b.depth) })
      return
    }
    if (key === 'n1' || key === 'n2' || key === 'n3') {
      const value = raw === '' ? undefined : Number(raw)
      onChange({ ...borehole, spt: borehole.spt.map((item) => item.id === id ? { ...item, [key]: value } : item) })
      return
    }
    if (key === 'testType') {
      const testType = raw as SptRecord['testType']
      onChange({ ...borehole, spt: borehole.spt.map((item) => item.id === id ? { ...item, testType, n1: testType === 'UD' ? undefined : item.n1, n2: testType === 'UD' ? undefined : item.n2, n3: testType === 'UD' ? undefined : item.n3 } : item) })
      return
    }
    if (key === 'soilCode') {
      const option = soilMap.get(raw)
      onChange({ ...borehole, spt: borehole.spt.map((item) => item.id === id ? { ...item, soilCode: raw, soilDescription: option?.description } : item) })
      return
    }
    onChange({ ...borehole, spt: borehole.spt.map((item) => item.id === id ? { ...item, [key]: raw } : item) })
  }

  const add = () => onChange(addSptRow(borehole))
  const toggleConfirmed = (id: string) => onChange({ ...borehole, spt: borehole.spt.map((row) => row.id === id ? { ...row, confirmed: !row.confirmed } : row) })

  return <>
    <div className="engineering-grid-wrap spt-grid-wrap">
      <div className="grid-toolbar"><b>SPT / ARAZİ DENEYLERİ</b><span>İlk SPT: 1.50 m · artış: 1.50 m · SPT penetrasyon aralığı: 0.45 m · UD: 0.50 m</span><button onClick={add}>+ Deney</button></div>
      <table className="engineering-grid spt-grid">
        <colgroup><col className="col-depth" /><col className="col-type" /><col className="col-n" /><col className="col-n" /><col className="col-n" /><col className="col-n30" /><col className="col-soil" /><col className="col-description" /><col className="col-source" /><col className="col-confirm" /><col className="col-delete" /></colgroup>
        <thead><tr><th>Derinlik</th><th>Deney Tipi</th><th>n1</th><th>n2</th><th>n3</th><th>N30</th><th>Zemin Sınıfı</th><th>Zemin Açıklaması</th><th>Kaynak</th><th>Onay</th><th /></tr></thead>
        <tbody>{borehole.spt.map((row) => {
          const isUd = row.testType === 'UD'
          const n30 = !isUd && Number.isFinite(row.n2) && Number.isFinite(row.n3) ? (row.n2! + row.n3!) : undefined
          return <tr key={row.id}>
            <td><input className="depth-input" type="number" value={row.depth} onChange={(e) => update(row.id, 'depth', e.target.value)} /></td>
            <td><select className={`test-type ${isUd ? 'ud' : 'spt'}`} value={row.testType} onChange={(e) => update(row.id, 'testType', e.target.value)}><option value="SPT">SPT</option><option value="UD">UD</option></select></td>
            <td><input className="n-input" type="number" disabled={isUd} value={isUd ? '' : (row.n1 ?? '')} onChange={(e) => update(row.id, 'n1', e.target.value)} /></td>
            <td><input className="n-input" type="number" disabled={isUd} value={isUd ? '' : (row.n2 ?? '')} onChange={(e) => update(row.id, 'n2', e.target.value)} /></td>
            <td><input className="n-input" type="number" disabled={isUd} value={isUd ? '' : (row.n3 ?? '')} onChange={(e) => update(row.id, 'n3', e.target.value)} /></td>
            <td className="n30-cell">{isUd ? '—' : (n30 ?? '—')}</td>
            <td><select className="soil-code-select" value={row.soilCode ?? ''} onChange={(e) => update(row.id, 'soilCode', e.target.value)}><option value="">Seçiniz</option>{soilOptions.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}</select></td>
            <td className="soil-description" title={row.soilDescription ?? ''}>{row.soilDescription || '—'}</td>
            <td className={row.confirmed ? 'source-confirmed' : 'source-review'}>{sourceLabel(row.source, row.confirmed)}</td>
            <td><button className="confirm-button" onClick={() => toggleConfirmed(row.id)}>{row.confirmed ? '✓' : 'Onayla'}</button></td>
            <td><button className="delete-button" onClick={() => onChange({ ...borehole, spt: borehole.spt.filter((item) => item.id !== row.id) })}>×</button></td>
          </tr>
        })}</tbody>
      </table>
      {borehole.spt.length === 0 && <div className="empty-state">Bu sondaj için henüz deney kaydı yok.</div>}
    </div>
    {borehole.spt.some((row) => row.testType === 'SPT') && <SptAnalysis borehole={borehole} />}
  </>
}

function LaboratoryGrid({ boreholeId, boreholes, labs, onChange }: { boreholeId: string; boreholes: BoreholeRecord[]; labs: LaboratoryRecord[]; onChange: (rows: LaboratoryRecord[]) => void }) {
  const add = () => onChange([...labs, { id: crypto.randomUUID(), boreholeId, sampleId: `UD-${labs.length + 1}`, depth: 1, sampleType: 'UD', source: 'manual', confirmed: false }])
  const update = (id: string, key: keyof LaboratoryRecord, raw: string) => {
    const value = numericLab.has(key) ? (raw === '' ? undefined : Number(raw)) : raw
    onChange(labs.map((row) => row.id === id ? { ...row, [key]: value } : row))
  }
  const toggleConfirmed = (id: string) => onChange(labs.map((row) => row.id === id ? { ...row, confirmed: !row.confirmed } : row))
  return <div className="engineering-grid-wrap">
    <div className="grid-toolbar"><b>LABORATUVAR</b><span>{labs.length} numune</span><button onClick={add}>+ Numune</button></div>
    <table className="engineering-grid laboratory-grid"><thead><tr><th>Sondaj</th><th>Numune</th><th>Derinlik</th><th>w %</th><th>γ</th><th>LL</th><th>PL</th><th>PI</th><th>c</th><th>φ</th><th>Durum</th><th>Onay</th><th /></tr></thead>
      <tbody>{labs.map((row) => { const classification = classifyLaboratoryRecord(row); return <tr key={row.id}>
        <td><select value={row.boreholeId} onChange={(e) => update(row.id, 'boreholeId', e.target.value)}>{boreholes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
        <td><input value={row.sampleId} onChange={(e) => update(row.id, 'sampleId', e.target.value)} /></td>
        {(['depth', 'waterContent', 'unitWeight', 'liquidLimit', 'plasticLimit', 'plasticityIndex', 'c', 'phi'] as const).map((key) => <td key={key}><input type="number" value={row[key] ?? ''} onChange={(e) => update(row.id, key, e.target.value)} /></td>)}
        <td className={row.confirmed ? 'source-confirmed' : 'source-review'}>{classification?.description ?? sourceLabel(row.source, row.confirmed)}</td>
        <td><button className="confirm-button" onClick={() => toggleConfirmed(row.id)}>{row.confirmed ? '✓' : 'Onayla'}</button></td>
        <td><button className="delete-button" onClick={() => onChange(labs.filter((item) => item.id !== row.id))}>×</button></td>
      </tr> })}</tbody>
    </table>
    {labs.length === 0 && <div className="empty-state">Bu sondaj için laboratuvar numunesi yok.</div>}
  </div>
}

export function FieldInvestigation({ boreholes, labs, onBoreholesChange, onLabsChange }: Props) {
  const [selectedId, setSelectedId] = useState(boreholes[0]?.id ?? '')
  const [tab, setTab] = useState<'spt' | 'lab' | 'log'>('spt')
  useEffect(() => { if (!boreholes.some((b) => b.id === selectedId)) setSelectedId(boreholes[0]?.id ?? '') }, [boreholes, selectedId])
  const selected = boreholes.find((b) => b.id === selectedId)
  const selectedLabs = useMemo(() => labs.filter((lab) => lab.boreholeId === selectedId), [labs, selectedId])
  const addBorehole = () => { const next = blankBorehole(boreholes.length + 1); onBoreholesChange([...boreholes, next]); setSelectedId(next.id); setTab('spt') }
  const updateBorehole = (row: BoreholeRecord) => onBoreholesChange(boreholes.map((item) => item.id === row.id ? row : item))
  const deleteBorehole = () => { if (!selected) return; onBoreholesChange(boreholes.filter((item) => item.id !== selected.id)); onLabsChange(labs.filter((lab) => lab.boreholeId !== selected.id)); setSelectedId(boreholes.find((item) => item.id !== selected.id)?.id ?? '') }
  const updateSelectedLabs = (rows: LaboratoryRecord[]) => { const ids = new Set(rows.map((r) => r.id)); onLabsChange([...labs.filter((r) => r.boreholeId !== selectedId || ids.has(r.id)), ...rows.filter((r) => !labs.some((old) => old.id === r.id))]) }

  return <div className="field-workspace">
    <div className="module-header"><div><div className="module-kicker">SAHA ARAŞTIRMASI</div><h2>Saha / Sondaj</h2><p>SPT, laboratuvar ve otomatik sondaj logu</p></div><div className="module-actions"><button onClick={addBorehole}>+ Yeni Sondaj</button></div></div>
    <div className="borehole-selector">{boreholes.map((b) => <button key={b.id} className={b.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(b.id)}><b>{b.name}</b><small>{b.totalDepth.toFixed(1)} m · YASS {b.groundwaterDepth?.toFixed(1) ?? '—'} m · {b.spt.length} deney</small></button>)}</div>
    <div className="module-tabs"><button className={tab === 'spt' ? 'active' : ''} onClick={() => setTab('spt')}>SPT</button><button className={tab === 'lab' ? 'active' : ''} onClick={() => setTab('lab')}>Laboratuvar</button><button className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>Sondaj Logu</button></div>
    {!selected ? <div className="empty-state">Henüz sondaj kaydı yok. <button onClick={addBorehole}>Yeni Sondaj</button></div> : tab === 'spt' ? <SptGrid borehole={selected} onChange={updateBorehole} /> : tab === 'lab' ? <LaboratoryGrid boreholeId={selected.id} boreholes={boreholes} labs={selectedLabs} onChange={updateSelectedLabs} /> : <SondajLog borehole={selected} />}
    {selected && <div className="field-footer-actions"><button onClick={deleteBorehole}>Aktif Sondajı Sil</button><span>YASS ve kuyu bilgileri hesaplamalarda sondaj kaydından tüketilir.</span></div>}
  </div>
}
