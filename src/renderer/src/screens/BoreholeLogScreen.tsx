import { useMemo, useState } from 'react'
import { Card, Field, Frame } from '../workspace/WorkspaceShell'
import type { BoreholeLogObservation, BoreholeRecord, LaboratoryRecord, LithologyLayer } from '../../../core/models/field-data'
import { DEFAULT_BOREHOLE_LOG_SETTINGS } from '../../../core/models/field-data'
import './borehole-log.css'

type Props = { boreholes: BoreholeRecord[]; labs: LaboratoryRecord[]; onBoreholesChange: (rows: BoreholeRecord[]) => void }
const fmt = (v?: number) => v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(2)
const colorMap: Record<LithologyLayer['colorClass'], string> = { fill: '#b99a72', clay: '#d5a06f', silt: '#c6b66a', sand: '#e0c66a', gravel: '#9da5a8', rock: '#737b82' }
const patternId=(c:LithologyLayer['colorClass'])=>`url(#bh-${c})`

export default function BoreholeLogScreen({ boreholes, labs, onBoreholesChange }: Props) {
  const [selectedId, setSelectedId] = useState(boreholes[0]?.id ?? '')
  const borehole = boreholes.find((b) => b.id === selectedId) ?? boreholes[0]
  const labRows = useMemo(() => borehole ? labs.filter((l) => l.boreholeId === borehole.id).sort((a,b) => a.depth-b.depth) : [], [borehole, labs])
  const update = (patch: Partial<BoreholeRecord>) => { if (!borehole) return; onBoreholesChange(boreholes.map((b) => b.id === borehole.id ? { ...b, ...patch } : b)) }
  const updateLayer = (id: string, patch: Partial<LithologyLayer>) => update({ lithology: borehole!.lithology.map((l) => l.id === id ? { ...l, ...patch, userOverride: true } : l) })
  const addLayer = () => { if (!borehole) return; const from = borehole.lithology.at(-1)?.to ?? 0; update({ lithology: [...borehole.lithology, { id: crypto.randomUUID(), from, to: from + 1, code: 'Mg', description: 'Kullanıcı tanımı', colorClass: 'fill', userOverride: true }] }) }
  const removeLayer = (id: string) => update({ lithology: borehole!.lithology.filter((l) => l.id !== id) })
  const addObservation = () => { if (!borehole) return; const row: BoreholeLogObservation = { id: crypto.randomUUID(), depth: 0, type: 'remark', text: '', source: 'manual', confirmed: false }; update({ logObservations: [...(borehole.logObservations ?? []), row] }) }
  const updateObservation = (id: string, patch: Partial<BoreholeLogObservation>) => update({ logObservations: (borehole!.logObservations ?? []).map((o) => o.id === id ? { ...o, ...patch } : o) })
  const removeObservation = (id: string) => update({ logObservations: (borehole!.logObservations ?? []).filter((o) => o.id !== id) })
  if (!boreholes.length) return <Frame screen="borehole-log"><div className="empty-state"><b>Henüz sondaj bulunmuyor.</b><span>Sondaj oluşturulduğunda birleşik SPT + laboratuvar logu burada oluşur.</span></div></Frame>
  return <Frame screen="borehole-log">
    <div className="log-toolbar"><label>Sondaj<select value={borehole.id} onChange={(e) => setSelectedId(e.target.value)}>{boreholes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><div className="log-toolbar-actions"><button onClick={addLayer}>+ Katman</button><button onClick={addObservation}>+ Not</button><button onClick={() => update({ logSettings: { ...(borehole.logSettings ?? DEFAULT_BOREHOLE_LOG_SETTINGS), showSpt: !(borehole.logSettings ?? DEFAULT_BOREHOLE_LOG_SETTINGS).showSpt } })}>SPT görünümü</button></div></div>
    <div className="log-workspace">
      <div className="log-preview-card"><div className="log-preview-header"><div><b>{borehole.name}</b><span>SONDAJ LOGU · Ölçek 1:{borehole.logSettings?.scale ?? 100}</span></div><div><span>Toplam {fmt(borehole.totalDepth)} m</span><span>YASS {fmt(borehole.groundwaterDepth)} m</span></div></div>
      <div className="borehole-log-technical-render">
        <div className="technical-render-title"><div><b>{borehole.name}</b><span>TEKNİK SONDAJ LOGU · Ölçek 1:{borehole.logSettings?.scale ?? 100}</span></div><div><span>Toplam {fmt(borehole.totalDepth)} m</span><span>YASS {fmt(borehole.groundwaterDepth)} m</span></div></div>
        <svg className="borehole-log-svg" viewBox="0 0 1180 820" role="img" aria-label="Detaylı teknik sondaj logu">
          <defs>
            <pattern id="bh-fill" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#d5d9dc"/><path d="M0 16L16 0" stroke="#9ba3a8"/></pattern>
            <pattern id="bh-clay" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#d9c0aa"/><path d="M0 5h16M0 11h16" stroke="#a27b60"/></pattern>
            <pattern id="bh-silt" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#d2d5c5"/><circle cx="3" cy="3" r="1.2" fill="#82866d"/><circle cx="10" cy="9" r="1.1" fill="#82866d"/></pattern>
            <pattern id="bh-sand" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#e5d29b"/><circle cx="4" cy="4" r="1.2" fill="#9e8448"/><circle cx="11" cy="10" r="1.2" fill="#9e8448"/></pattern>
            <pattern id="bh-gravel" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#c7ccce"/><circle cx="4" cy="5" r="2" fill="#747d82"/><circle cx="13" cy="12" r="2.3" fill="#747d82"/></pattern>
            <pattern id="bh-rock" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#b9bdc0"/><path d="M1 15L8 5 16 12" fill="none" stroke="#666d71"/></pattern>
          </defs>
          <rect x="0" y="0" width="1180" height="820" fill="#fbfcfc"/>
          <rect x="0" y="0" width="1180" height="40" fill="#e5e9eb" stroke="#9fa8ae"/>
          <g fontSize="10" fill="#3e4850" fontWeight="700"><text x="18" y="25">DERİNLİK</text><text x="102" y="25">LİTOLOJİ / ZEMİN</text><text x="510" y="25">SPT / UD</text><text x="700" y="25">LABORATUVAR</text><text x="845" y="25">SAHA NOTLARI / GÖZLEM</text></g>
          {Array.from({length:Math.ceil(Math.max(1,borehole.totalDepth))+1},(_,i)=>{const y=44+(i/Math.max(borehole.totalDepth,1))*730;return <g key={i}><line x1="0" y1={y} x2="1180" y2={y} stroke={i%5===0?'#c8ced2':'#e2e5e7'} strokeWidth={i%5===0?1.2:.7}/><text x="20" y={y+4} fontSize="10" fill="#56616a">{i}</text></g>})}
          <line x1="80" y1="40" x2="80" y2="774" stroke="#8f999f"/><line x1="500" y1="40" x2="500" y2="774" stroke="#8f999f"/><line x1="690" y1="40" x2="690" y2="774" stroke="#8f999f"/><line x1="830" y1="40" x2="830" y2="774" stroke="#8f999f"/>
          {borehole.lithology.map(layer=>{const den=Math.max(borehole.totalDepth,1),y0=44+(layer.from/den)*730,y1=44+(layer.to/den)*730,h=Math.max(1,y1-y0);return <g key={layer.id}><rect x="80" y={y0} width="420" height={h} fill={patternId(layer.colorClass)} stroke="#727c82"/><text x="95" y={y0+15} fontSize="11" fill="#273239" fontWeight="700">{layer.code}</text>{h>28&&<text x="95" y={y0+30} fontSize="9" fill="#414c53">{layer.description}</text>}</g>})}
          {borehole.spt.map(row=>{const den=Math.max(borehole.totalDepth,1),y=44+(row.depth/den)*730,n30=row.testType==='SPT'&&row.n2!=null&&row.n3!=null?row.n2+row.n3:undefined;return <g key={row.id}><line x1="505" y1={y} x2="690" y2={y} stroke="#4f6776"/><circle cx="520" cy={y} r="7" fill="#fff" stroke="#4f6776"/><text x="535" y={y-3} fontSize="9" fill="#29495f" fontWeight="700">{row.testType}</text><text x="535" y={y+9} fontSize="8.5" fill="#4f5a61">{row.testType==='SPT' ? String(row.n1??'—')+' / '+String(row.n2??'—')+' / '+String(row.n3??'—')+' · N30 '+String(n30??'—') : 'Örselenmemiş'}</text></g>})}
          {labRows.map(row=>{const den=Math.max(borehole.totalDepth,1),y=44+(row.depth/den)*730;const values=[row.waterContent,row.liquidLimit,row.plasticLimit,row.sieve200Passing].filter(v=>v!=null);return <g key={row.id}><rect x="700" y={y-11} width="126" height="22" fill="#edf3ed" stroke="#7d927f"/><text x="708" y={y-2} fontSize="9" fill="#385640" fontWeight="700">{row.sampleId}</text><text x="708" y={y+9} fontSize="8" fill="#55645a">{row.sampleType} · {values.length} param.</text></g>})}
          {(borehole.logObservations??[]).map(row=>{const den=Math.max(borehole.totalDepth,1),y=44+(row.depth/den)*730;return <g key={row.id}><circle cx="850" cy={y} r="5" fill="#fff" stroke="#8f6e35"/><text x="862" y={y-2} fontSize="8.8" fill="#6c542b" fontWeight="700">{row.type.toUpperCase()}</text><text x="920" y={y+9} fontSize="8.5" fill="#56616a">{row.text||'—'}</text></g>})}
          {borehole.groundwaterDepth!=null&&borehole.groundwaterDepth>=0&&borehole.groundwaterDepth<=Math.max(borehole.totalDepth,1)&&<g><line x1="0" y1={44+(borehole.groundwaterDepth/Math.max(borehole.totalDepth,1))*730} x2="1180" y2={44+(borehole.groundwaterDepth/Math.max(borehole.totalDepth,1))*730} stroke="#2e78a2" strokeWidth="2.2" strokeDasharray="9 5"/><text x="1160" y={42+(borehole.groundwaterDepth/Math.max(borehole.totalDepth,1))*730} textAnchor="end" fontSize="9" fill="#28688d" fontWeight="700">YASS {fmt(borehole.groundwaterDepth)} m</text></g>}
        </svg>
        <div className="technical-render-footer"><span>Litoloji, SPT/UD, laboratuvar numunesi ve saha gözlemleri aynı düşey referans üzerinde gösterilir.</span><span>0.00 m → {fmt(borehole.totalDepth)} m</span></div>
      </div></div>
<div className="log-editor-column">
        <Card title="SONDAJ BİLGİLERİ"><div className="form-grid"><Field label="Kuyu adı" type="text" value={borehole.name} onChange={(v) => update({ name: v })} /><Field label="Kot" value={borehole.elevation ?? ''} onChange={(v) => update({ elevation: v === '' ? undefined : Number(v) })} /><Field label="Toplam derinlik (m)" value={borehole.totalDepth} onChange={(v) => update({ totalDepth: Number(v) || 0 })} /><Field label="YASS (m)" value={borehole.groundwaterDepth ?? ''} onChange={(v) => update({ groundwaterDepth: v === '' ? undefined : Number(v) })} /><Field label="Sondaj yöntemi" type="text" value={borehole.drillingMethod ?? ''} onChange={(v) => update({ drillingMethod: v })} /><Field label="Sondaj çapı (mm)" value={borehole.drillingDiameter ?? ''} onChange={(v) => update({ drillingDiameter: v === '' ? undefined : Number(v) })} /></div></Card>
        <Card title="LİTOLOJİ · KULLANICI MÜDAHALESİ"><div className="log-layer-editor">{borehole.lithology.map((layer) => <div className="layer-edit-row" key={layer.id}><input type="number" value={layer.from} step="0.01" onChange={(e) => updateLayer(layer.id, { from: Number(e.target.value) })} /><input type="number" value={layer.to} step="0.01" onChange={(e) => updateLayer(layer.id, { to: Number(e.target.value) })} /><input value={layer.code} onChange={(e) => updateLayer(layer.id, { code: e.target.value })} /><input value={layer.description} onChange={(e) => updateLayer(layer.id, { description: e.target.value })} /><button onClick={() => removeLayer(layer.id)}>×</button></div>)}{!borehole.lithology.length && <div className="inline-empty">Litoloji katmanı henüz oluşturulmadı.</div>}</div></Card>
        <Card title="SAHA NOTLARI"><div className="observation-editor">{(borehole.logObservations ?? []).map((row) => <div className="observation-row" key={row.id}><input type="number" value={row.depth} step="0.01" onChange={(e) => updateObservation(row.id, { depth: Number(e.target.value) })} /><select value={row.type} onChange={(e) => updateObservation(row.id, { type: e.target.value as BoreholeLogObservation['type'] })}><option value="remark">Not</option><option value="sample">Numune</option><option value="water">Su</option><option value="drilling">Sondaj</option><option value="refusal">Refü</option><option value="rock">Kaya</option></select><input value={row.text} placeholder="Açıklama" onChange={(e) => updateObservation(row.id, { text: e.target.value })} /><button onClick={() => removeObservation(row.id)}>×</button></div>)}</div></Card>
      </div>
    </div>
  </Frame>
}
