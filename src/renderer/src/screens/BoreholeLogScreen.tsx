import { useMemo, useState } from 'react'
import { Card, Field, Frame } from '../workspace/WorkspaceShell'
import type { BoreholeLogObservation, BoreholeRecord, LaboratoryRecord, LithologyLayer } from '../../../core/models/field-data'
import { DEFAULT_BOREHOLE_LOG_SETTINGS } from '../../../core/models/field-data'
import { EngineeringSectionRenderer } from '../components/EngineeringSectionRenderer'
import './borehole-log.css'

type Props = { boreholes: BoreholeRecord[]; labs: LaboratoryRecord[]; onBoreholesChange: (rows: BoreholeRecord[]) => void }
const fmt = (v?: number) => v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(2)

export default function BoreholeLogScreen({ boreholes, labs, onBoreholesChange }: Props) {
  const [selectedId, setSelectedId] = useState(boreholes[0]?.id ?? '')
  const borehole = boreholes.find((b) => b.id === selectedId) ?? boreholes[0]
  const labRows = useMemo(() => borehole ? labs.filter((l) => l.boreholeId === borehole.id).sort((a,b) => a.depth-b.depth) : [], [borehole, labs])
  const renderLayers = useMemo(() => {
    if (!borehole) return []
    if (borehole.lithology.length) return borehole.lithology.map(layer => ({ id: layer.id, topDepth: layer.from, bottomDepth: layer.to, code: layer.code, description: layer.description, colorClass: layer.colorClass }))
    const den = Math.max(borehole.totalDepth,1)
    const rows = borehole.spt.slice().sort((a,b)=>a.depth-b.depth)
    return rows.map((row,i) => {
      const from=i===0?0:(rows[i-1].depth+row.depth)/2
      const to=i===rows.length-1?den:(row.depth+(rows[i+1]?.depth??den))/2
      return { id: row.id, topDepth: Math.max(0,from), bottomDepth: Math.min(den,Math.max(from,to)), code: row.soilCode, description: row.soilDescription, colorClass: (row.soilCode?.toLowerCase().includes('cl')||row.soilCode?.toLowerCase().includes('ci')?'clay':row.soilCode?.toLowerCase().includes('si')?'silt':row.soilCode?.toLowerCase().includes('gr')?'gravel':row.soilCode?.toLowerCase().includes('sa')?'sand':'fill') as 'fill'|'clay'|'silt'|'sand'|'gravel'|'rock', sptN: row.n2!=null&&row.n3!=null?row.n2+row.n3:undefined }
    })
  }, [borehole])
  const settings=borehole?.logSettings ?? DEFAULT_BOREHOLE_LOG_SETTINGS
  const renderMarkers = useMemo(() => {
    if (!borehole) return []
    const spt = borehole.spt.map(row=>({depth:row.depth,label:row.testType,detail:row.testType==='SPT'&&row.n2!=null&&row.n3!=null?'N30 '+(row.n2+row.n3).toFixed(0):'UD',kind:'spt' as const}))
    const lab = labRows.map(row=>({depth:row.depth,label:row.sampleId,detail:row.sampleType,kind:'lab' as const}))
    const notes=(borehole.logObservations??[]).map(row=>({depth:row.depth,label:row.type.toUpperCase(),detail:row.text||undefined,kind:'note' as const}))
    return [...spt,...lab,...notes]
  }, [borehole, labRows])
  const update = (patch: Partial<BoreholeRecord>) => { if (!borehole) return; onBoreholesChange(boreholes.map((b) => b.id === borehole.id ? { ...b, ...patch } : b)) }
  const updateLayer = (id: string, patch: Partial<LithologyLayer>) => update({ lithology: borehole!.lithology.map((l) => l.id === id ? { ...l, ...patch, userOverride: true } : l) })
  const addLayer = () => { if (!borehole) return; const from = borehole.lithology.at(-1)?.to ?? 0; update({ lithology: [...borehole.lithology, { id: crypto.randomUUID(), from, to: from + 1, code: 'Mg', description: 'Kullanıcı tanımı', colorClass: 'fill', userOverride: true }] }) }
  const removeLayer = (id: string) => update({ lithology: borehole!.lithology.filter((l) => l.id !== id) })
  const addObservation = () => { if (!borehole) return; const row: BoreholeLogObservation = { id: crypto.randomUUID(), depth: 0, type: 'remark', text: '', source: 'manual', confirmed: false }; update({ logObservations: [...(borehole.logObservations ?? []), row] }) }
  const updateObservation = (id: string, patch: Partial<BoreholeLogObservation>) => update({ logObservations: (borehole!.logObservations ?? []).map((o) => o.id === id ? { ...o, ...patch } : o) })
  const removeObservation = (id: string) => update({ logObservations: (borehole!.logObservations ?? []).filter((o) => o.id !== id) })
  if (!boreholes.length) return <Frame screen="borehole-log"><div className="empty-state"><b>Henüz sondaj bulunmuyor.</b><span>Sondaj oluşturulduğunda birleşik SPT + laboratuvar logu burada oluşur.</span></div></Frame>
  return <Frame screen="borehole-log">
    <div className="log-toolbar"><label>Sondaj<select value={borehole.id} onChange={(e) => setSelectedId(e.target.value)}>{boreholes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><div className="log-toolbar-actions"><button onClick={addLayer}>+ Katman</button><button onClick={addObservation}>+ Not</button><button onClick={() => update({ logSettings: { ...settings, showSpt: !settings.showSpt } })}>SPT {settings.showSpt?'açık':'kapalı'}</button><button onClick={() => update({ logSettings: { ...settings, showLaboratory: !settings.showLaboratory } })}>LAB {settings.showLaboratory?'açık':'kapalı'}</button><button onClick={() => update({ logSettings: { ...settings, showGroundwater: !settings.showGroundwater } })}>YASS {settings.showGroundwater?'açık':'kapalı'}</button><button onClick={() => update({ logSettings: { ...settings, showSamples: !settings.showSamples } })}>Numune {settings.showSamples?'açık':'kapalı'}</button><button onClick={() => update({ logSettings: { ...settings, showRemarks: !settings.showRemarks } })}>Not {settings.showRemarks?'açık':'kapalı'}</button></div></div>
    <div className="log-workspace">
      <div className="log-preview-card"><div className="log-preview-header"><div><b>{borehole.name}</b><span>SONDAJ LOGU · Ölçek 1:{settings.scale}</span></div><div><span>Toplam {fmt(borehole.totalDepth)} m</span><span>YASS {fmt(borehole.groundwaterDepth)} m</span></div></div>
      <EngineeringSectionRenderer variant="borehole" totalDepth={Math.max(borehole.totalDepth,1)} groundwaterDepth={borehole.groundwaterDepth} scale={settings.scale} showSpt={settings.showSpt} showLaboratory={settings.showLaboratory} showGroundwater={settings.showGroundwater} showSamples={settings.showSamples} showRemarks={settings.showRemarks} layers={renderLayers} markers={renderMarkers} footer={<><span>Litoloji, SPT/UD, laboratuvar ve saha gözlemleri ortak düşey referansa bağlanmıştır.</span><span>{borehole.name} · 0.00 → {fmt(borehole.totalDepth)} m</span></>}/>
</div>
<div className="log-editor-column">
        <Card title="SONDAJ BİLGİLERİ"><div className="form-grid"><label>Çizim ölçeği<select value={settings.scale} onChange={e=>update({logSettings:{...settings,scale:Number(e.target.value) as 50|100|200}})}><option value="50">1:50</option><option value="100">1:100</option><option value="200">1:200</option></select></label><Field label="Kuyu adı" type="text" value={borehole.name} onChange={(v) => update({ name: v })} /><Field label="Kot" value={borehole.elevation ?? ''} onChange={(v) => update({ elevation: v === '' ? undefined : Number(v) })} /><Field label="Toplam derinlik (m)" value={borehole.totalDepth} onChange={(v) => update({ totalDepth: Number(v) || 0 })} /><Field label="YASS (m)" value={borehole.groundwaterDepth ?? ''} onChange={(v) => update({ groundwaterDepth: v === '' ? undefined : Number(v) })} /><Field label="Sondaj yöntemi" type="text" value={borehole.drillingMethod ?? ''} onChange={(v) => update({ drillingMethod: v })} /><Field label="Sondaj çapı (mm)" value={borehole.drillingDiameter ?? ''} onChange={(v) => update({ drillingDiameter: v === '' ? undefined : Number(v) })} /></div></Card>
        <Card title="LİTOLOJİ · KULLANICI MÜDAHALESİ"><div className="log-layer-editor">{borehole.lithology.map((layer) => <div className="layer-edit-row" key={layer.id}><input type="number" value={layer.from} step="0.01" onChange={(e) => updateLayer(layer.id, { from: Number(e.target.value) })} /><input type="number" value={layer.to} step="0.01" onChange={(e) => updateLayer(layer.id, { to: Number(e.target.value) })} /><input value={layer.code} onChange={(e) => updateLayer(layer.id, { code: e.target.value })} /><input value={layer.description} onChange={(e) => updateLayer(layer.id, { description: e.target.value })} /><button onClick={() => removeLayer(layer.id)}>×</button></div>)}{!borehole.lithology.length && <div className="inline-empty">Litoloji katmanı henüz oluşturulmadı.</div>}</div></Card>
        <Card title="SAHA NOTLARI"><div className="observation-editor">{(borehole.logObservations ?? []).map((row) => <div className="observation-row" key={row.id}><input type="number" value={row.depth} step="0.01" onChange={(e) => updateObservation(row.id, { depth: Number(e.target.value) })} /><select value={row.type} onChange={(e) => updateObservation(row.id, { type: e.target.value as BoreholeLogObservation['type'] })}><option value="remark">Not</option><option value="sample">Numune</option><option value="water">Su</option><option value="drilling">Sondaj</option><option value="refusal">Refü</option><option value="rock">Kaya</option></select><input value={row.text} placeholder="Açıklama" onChange={(e) => updateObservation(row.id, { text: e.target.value })} /><button onClick={() => removeObservation(row.id)}>×</button></div>)}</div></Card>
      </div>
    </div>
  </Frame>
}
