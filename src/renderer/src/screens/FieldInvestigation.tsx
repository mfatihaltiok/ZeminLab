import { useMemo, useState } from 'react'
import '../assets/field-workspace.css'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../../../core/models/field-data'

type Props = {
  boreholes: BoreholeRecord[]
  labs: LaboratoryRecord[]
  onBoreholesChange: (rows: BoreholeRecord[]) => void
  onLabsChange: (rows: LaboratoryRecord[]) => void
}

const numericSpt = new Set<keyof SptRecord>(['depth', 'n1', 'n2', 'n3', 'nSpt'])
const numericLab = new Set<keyof LaboratoryRecord>(['depth', 'waterContent', 'unitWeight', 'liquidLimit', 'plasticLimit', 'c', 'phi'])

function sourceLabel(source: string, confirmed?: boolean) {
  if (confirmed) return 'Onaylandı'
  if (source === 'image-review') return 'Görsel inceleme'
  if (source === 'imported') return 'İçe aktarıldı'
  return 'Manuel'
}

function SptGrid({ borehole, onChange }: { borehole: BoreholeRecord; onChange: (rows: SptRecord[]) => void }) {
  const update = (id: string, key: keyof SptRecord, value: string) => {
    onChange(borehole.spt.map((row) => row.id !== id ? row : {
      ...row,
      [key]: numericSpt.has(key) ? (value === '' ? undefined : Number(value)) : value,
      source: 'manual',
      confirmed: false
    }))
  }
  const add = () => onChange([...borehole.spt, {
    id: crypto.randomUUID(),
    depth: (borehole.spt.at(-1)?.depth ?? 0) + 1.5,
    testType: 'SPT',
    source: 'manual',
    confirmed: false
  }])
  const remove = (id: string) => onChange(borehole.spt.filter((row) => row.id !== id))
  return <div className="engineering-grid-wrap">
    <div className="grid-toolbar"><b>SPT KAYITLARI</b><span>{borehole.spt.length} kayıt</span><button onClick={add}>+ SPT SATIRI</button></div>
    <table className="engineering-grid"><thead><tr><th>Derinlik</th><th>Tip</th><th>N1</th><th>N2</th><th>N3</th><th>N-SPT</th><th>Zemin</th><th>Açıklama</th><th>Durum</th><th /></tr></thead>
      <tbody>{borehole.spt.map((row) => <tr key={row.id}>
        <td><input type="number" step="0.01" value={row.depth} onChange={(e) => update(row.id, 'depth', e.target.value)} /></td>
        <td><select value={row.testType} onChange={(e) => update(row.id, 'testType', e.target.value)}><option value="SPT">SPT</option><option value="UD">UD</option></select></td>
        {(['n1', 'n2', 'n3', 'nSpt'] as const).map((key) => <td key={key}><input type="number" value={row[key] ?? ''} onChange={(e) => update(row.id, key, e.target.value)} /></td>)}
        <td><input value={row.soilCode ?? ''} onChange={(e) => update(row.id, 'soilCode', e.target.value)} /></td>
        <td><input value={row.soilDescription ?? ''} onChange={(e) => update(row.id, 'soilDescription', e.target.value)} /></td>
        <td><span className={row.confirmed ? 'source-confirmed' : 'source-review'}>{sourceLabel(row.source, row.confirmed)}</span></td>
        <td><button className="grid-delete" title="Kaydı sil" onClick={() => remove(row.id)}>×</button></td>
      </tr>)}</tbody>
    </table>
  </div>
}

function SptVisual({ borehole }: { borehole: BoreholeRecord }) {
  const max = Math.max(borehole.totalDepth, 1)
  return <div className="borehole-visual"><div className="depth-ruler">{Array.from({ length: Math.floor(max) + 1 }, (_, i) => <span key={i} style={{ top: `${(i / max) * 100}%` }}>{i} m</span>)}</div><div className="lithology-column">
    {borehole.lithology.map((layer) => <div key={layer.id} className={`lithology-layer ${layer.colorClass}`} style={{ top: `${(layer.from / max) * 100}%`, height: `${((layer.to - layer.from) / max) * 100}%` }}><b>{layer.code}</b><span>{layer.description}</span></div>)}
    {borehole.spt.map((row) => <div key={row.id} className="spt-marker" style={{ top: `${(row.depth / max) * 100}%` }}><span>{row.nSpt ?? '—'}</span></div>)}
    {borehole.groundwaterDepth != null && <div className="gwl-line" style={{ top: `${(borehole.groundwaterDepth / max) * 100}%` }}><span>YAS {borehole.groundwaterDepth.toFixed(2)} m</span></div>}
  </div></div>
}

function LaboratoryGrid({ rows, boreholes, onChange }: { rows: LaboratoryRecord[]; boreholes: BoreholeRecord[]; onChange: (rows: LaboratoryRecord[]) => void }) {
  const update = (id: string, key: keyof LaboratoryRecord, value: string) => onChange(rows.map((row) => row.id !== id ? row : {
    ...row,
    [key]: numericLab.has(key) ? (value === '' ? undefined : Number(value)) : value,
    source: 'manual',
    confirmed: false
  }))
  const add = () => onChange([...rows, { id: crypto.randomUUID(), boreholeId: boreholes[0]?.id ?? '', sampleId: `NUM-${String(rows.length + 1).padStart(2, '0')}`, depth: 1, sampleType: 'UD', source: 'manual', confirmed: false }])
  const remove = (id: string) => onChange(rows.filter((row) => row.id !== id))
  return <div className="engineering-grid-wrap">
    <div className="grid-toolbar"><b>LABORATUVAR DENEYLERİ</b><span>{rows.length} numune</span><button onClick={add}>+ NUMUNE</button></div>
    <table className="engineering-grid"><thead><tr><th>Sondaj</th><th>Numune</th><th>Derinlik</th><th>w %</th><th>γ kN/m³</th><th>LL %</th><th>PL %</th><th>PI %</th><th>c kPa</th><th>φ °</th><th>Durum</th><th /></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}>
        <td><select value={row.boreholeId} onChange={(e) => update(row.id, 'boreholeId', e.target.value)}>{boreholes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></td>
        <td><input value={row.sampleId} onChange={(e) => update(row.id, 'sampleId', e.target.value)} /></td>
        <td><input type="number" step="0.01" value={row.depth} onChange={(e) => update(row.id, 'depth', e.target.value)} /></td>
        <td><input type="number" value={row.waterContent ?? ''} onChange={(e) => update(row.id, 'waterContent', e.target.value)} /></td>
        <td><input type="number" value={row.unitWeight ?? ''} onChange={(e) => update(row.id, 'unitWeight', e.target.value)} /></td>
        <td><input type="number" value={row.liquidLimit ?? ''} onChange={(e) => update(row.id, 'liquidLimit', e.target.value)} /></td>
        <td><input type="number" value={row.plasticLimit ?? ''} onChange={(e) => update(row.id, 'plasticLimit', e.target.value)} /></td>
        <td><input readOnly value={row.liquidLimit != null && row.plasticLimit != null ? row.liquidLimit - row.plasticLimit : ''} /></td>
        <td><input type="number" value={row.c ?? ''} onChange={(e) => update(row.id, 'c', e.target.value)} /></td>
        <td><input type="number" value={row.phi ?? ''} onChange={(e) => update(row.id, 'phi', e.target.value)} /></td>
        <td><span className={row.confirmed ? 'source-confirmed' : 'source-review'}>{sourceLabel(row.source, row.confirmed)}</span></td>
        <td><button className="grid-delete" title="Numuneyi sil" onClick={() => remove(row.id)}>×</button></td>
      </tr>)}</tbody>
    </table>
  </div>
}

export function FieldInvestigation({ boreholes, labs, onBoreholesChange, onLabsChange }: Props) {
  const [selectedId, setSelectedId] = useState(boreholes[0]?.id ?? '')
  const [tab, setTab] = useState<'overview' | 'spt' | 'lab'>('overview')
  const selected = boreholes.find((b) => b.id === selectedId) ?? boreholes[0]
  const labRows = useMemo(() => labs.filter((row) => row.boreholeId === selected?.id), [labs, selected?.id])
  if (!selected) return <div className="empty-state"><strong>Henüz sondaj tanımlanmadı.</strong><span>Saha modülünden yeni sondaj ekleyebilirsiniz.</span></div>
  const patchSpt = (rows: SptRecord[]) => onBoreholesChange(boreholes.map((b) => b.id === selected.id ? { ...b, spt: rows } : b))
  const patchLabs = (rows: LaboratoryRecord[]) => onLabsChange([...labs.filter((row) => row.boreholeId !== selected.id), ...rows])
  return <section className="field-workspace">
    <header className="module-header"><div><div className="module-kicker">SAHA VERİLERİ / SONDAJ</div><h2>{selected.name}</h2><p>{selected.totalDepth.toFixed(2)} m · YAS {selected.groundwaterDepth?.toFixed(2) ?? '—'} m · {selected.lithology.length} tabaka</p></div><div className="module-actions"><button onClick={() => setTab('spt')}>SPT KAYITLARI</button><button onClick={() => setTab('lab')}>LABORATUVAR</button></div></header>
    <div className="borehole-selector">{boreholes.map((b) => <button className={b.id === selected.id ? 'active' : ''} key={b.id} onClick={() => setSelectedId(b.id)}>{b.name}<small>{b.totalDepth.toFixed(2)} m</small></button>)}</div>
    <nav className="module-tabs">{([['overview', 'Genel'], ['spt', 'SPT'], ['lab', 'Numuneler / Laboratuvar']] as const).map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === 'overview' && <div className="field-dashboard"><SptVisual borehole={selected} /><aside className="field-side"><div><b>SONDAJ BİLGİSİ</b><p>Derinlik <strong>{selected.totalDepth.toFixed(2)} m</strong></p><p>YAS <strong>{selected.groundwaterDepth?.toFixed(2) ?? '—'} m</strong></p><p>SPT <strong>{selected.spt.length}</strong></p></div><div><b>LİTOLOJİ</b>{selected.lithology.map((layer) => <p key={layer.id}><span className={`legend ${layer.colorClass}`} />{layer.from.toFixed(2)}–{layer.to.toFixed(2)} m · {layer.description}</p>)}</div></aside></div>}
    {tab === 'spt' && <SptGrid borehole={selected} onChange={patchSpt} />}
    {tab === 'lab' && <LaboratoryGrid rows={labRows} boreholes={boreholes} onChange={patchLabs} />}
  </section>
}
