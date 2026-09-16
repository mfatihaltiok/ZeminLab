import { useEffect, useMemo, useState } from 'react'
import type { BoreholeRecord } from '../../core/models/field-data'
import { stressAtDepth, SOURCE_NOTES, type SoilLayerInput } from '../../core/calculations/engineering'
import { Card, Field, Frame, Metric, Source, Table } from '../workspace/WorkspaceShell'

function toLayers(borehole: BoreholeRecord): SoilLayerInput[] {
  return borehole.lithology
    .filter((layer) => layer.to > layer.from)
    .sort((a, b) => a.from - b.from)
    .map((layer) => ({
      top: layer.from,
      bottom: layer.to,
      soil: layer.description || layer.code,
      gamma: 18,
      gammaSat: 19,
      cohesion: 0,
      phi: 30,
      fines: 0
    }))
}

export function SoilProfileScreen({ boreholes }: { boreholes: BoreholeRecord[] }) {
  const [selectedId, setSelectedId] = useState(boreholes[0]?.id ?? '')
  const [gwt, setGwt] = useState<number | undefined>(boreholes[0]?.groundwaterDepth)

  useEffect(() => {
    if (!boreholes.some((borehole) => borehole.id === selectedId)) {
      setSelectedId(boreholes[0]?.id ?? '')
    }
  }, [boreholes, selectedId])

  const selected = boreholes.find((borehole) => borehole.id === selectedId) ?? boreholes[0]
  const layers = useMemo(() => selected ? toLayers(selected) : [], [selected])

  useEffect(() => {
    setGwt(selected?.groundwaterDepth)
  }, [selected])

  if (!selected) return <Frame screen="profile"><div className="empty-state"><strong>Profil oluşturmak için önce sondaj tanımlayın.</strong></div></Frame>

  const depth = Math.max(selected.totalDepth, 1)
  const groundwater = gwt == null || Number.isNaN(gwt) ? undefined : Math.max(0, Math.min(gwt, depth))
  const stressRows = layers.map((layer) => {
    const result = stressAtDepth(layer.bottom, layers, groundwater ?? depth)
    return [layer.soil, `${layer.top.toFixed(2)}–${layer.bottom.toFixed(2)}`, layer.gamma, layer.cohesion, layer.phi, result.sigmaV.toFixed(1), result.sigmaVPrime.toFixed(1)]
  })
  const averageSpt = selected.spt.length ? selected.spt.reduce((sum, row) => sum + (row.nSpt ?? 0), 0) / selected.spt.length : 0

  return <Frame screen="profile">
    <Source>{SOURCE_NOTES.investigation}. Katman sınırları seçilen sondaj kaydından alınır; γ, c ve φ değerleri hesap girdisi olarak ayrıca doğrulanmalıdır.</Source>
    <div className="form-grid">
      <label><span>Sondaj</span><select value={selected.id} onChange={(e) => { const borehole = boreholes.find((item) => item.id === e.target.value); setSelectedId(e.target.value); setGwt(borehole?.groundwaterDepth) }}>{boreholes.map((borehole) => <option key={borehole.id} value={borehole.id}>{borehole.name}</option>)}</select></label>
      <Field label="Toplam derinlik (m)" value={selected.totalDepth} onChange={() => {}} />
      <Field label="Yeraltı su seviyesi (m)" value={gwt ?? ''} onChange={(value) => setGwt(value === '' ? undefined : Number(value))} />
    </div>
    <div className="metric-strip">
      <Metric label="Katman" value={layers.length} />
      <Metric label="SPT" value={selected.spt.length} />
      <Metric label="Ortalama N-SPT" value={averageSpt.toFixed(1)} />
      <Metric label="YAS" value={groundwater == null ? '—' : groundwater.toFixed(2)} unit="m" />
    </div>
    <Card title={`ZEMİN PROFİLİ · ${selected.name}`}>
      <div className="profile-visual" style={{ minHeight: 420 }}>
        <div className="depth-scale">{Array.from({ length: Math.floor(depth) + 1 }, (_, i) => <span key={i} style={{ top: `${(i / depth) * 100}%` }}>{i} m</span>)}</div>
        <div className="soil-column">
          {selected.lithology.map((layer) => <div key={layer.id} className={`layer ${layer.colorClass}`} style={{ height: `${((layer.to - layer.from) / depth) * 100}%` }}><b>{layer.code}</b><small>{layer.description}<br />{layer.from.toFixed(2)}–{layer.to.toFixed(2)} m</small></div>)}
          {selected.spt.map((row) => <span key={row.id} className="spt-marker" style={{ top: `${(row.depth / depth) * 100}%` }} title={`SPT ${row.depth.toFixed(2)} m · N=${row.nSpt ?? '—'}`}>{row.nSpt ?? '—'}</span>)}
          {groundwater != null && <span className="gwl-line" style={{ top: `${(groundwater / depth) * 100}%` }}><span>YAS {groundwater.toFixed(2)} m</span></span>}
        </div>
      </div>
    </Card>
    <Card title="KATMAN / GERİLME TABLOSU">
      <Table headers={['Zemin', 'Derinlik', 'γ', 'c', 'φ', 'σv', 'σ′v']} rows={stressRows} />
    </Card>
  </Frame>
}
