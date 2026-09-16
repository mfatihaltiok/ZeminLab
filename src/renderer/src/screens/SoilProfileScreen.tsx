import { useEffect, useMemo, useState } from 'react'
import type { BoreholeRecord, LaboratoryRecord, LithologyLayer } from '../../core/models/field-data'
import { stressAtDepth, SOURCE_NOTES, type SoilLayerInput } from '../../core/calculations/engineering'
import { Card, Field, Frame, Metric, Source, Table } from '../workspace/WorkspaceShell'

type ResolvedLayer = SoilLayerInput & {
  gammaSource: 'lithology' | 'laboratory' | 'missing'
  gammaSatSource: 'lithology' | 'laboratory' | 'missing'
  cSource: 'lithology' | 'laboratory' | 'missing'
  phiSource: 'lithology' | 'laboratory' | 'missing'
  finesSource: 'lithology' | 'laboratory' | 'missing'
  labSample?: string
}

function labForLayer(layer: LithologyLayer, labs: LaboratoryRecord[], boreholeId: string) {
  return labs.filter((lab) => lab.boreholeId === boreholeId && lab.depth >= layer.from && lab.depth <= layer.to).sort((a, b) => Math.abs(a.depth - (layer.from + layer.to) / 2) - Math.abs(b.depth - (layer.from + layer.to) / 2))[0]
}
function valueSource(layerValue: number | undefined, labValue: number | undefined): 'lithology' | 'laboratory' | 'missing' {
  if (typeof layerValue === 'number' && Number.isFinite(layerValue)) return 'lithology'
  if (typeof labValue === 'number' && Number.isFinite(labValue)) return 'laboratory'
  return 'missing'
}
function toLayers(borehole: BoreholeRecord, labs: LaboratoryRecord[]): ResolvedLayer[] {
  return borehole.lithology.filter((layer) => layer.to > layer.from).sort((a, b) => a.from - b.from).map((layer) => {
    const lab = labForLayer(layer, labs, borehole.id)
    const gammaSource = valueSource(layer.unitWeight, lab?.unitWeight)
    const gammaSatSource = valueSource(layer.saturatedUnitWeight, undefined)
    const cSource = valueSource(layer.cohesion, lab?.c)
    const phiSource = valueSource(layer.frictionAngle, lab?.phi)
    const finesSource = valueSource(layer.finesContent, lab?.finesContent)
    return { top: layer.from, bottom: layer.to, soil: layer.description || layer.code, gamma: layer.unitWeight ?? lab?.unitWeight ?? 0, gammaSat: layer.saturatedUnitWeight ?? 0, cohesion: layer.cohesion ?? lab?.c ?? 0, phi: layer.frictionAngle ?? lab?.phi ?? 0, fines: layer.finesContent ?? lab?.finesContent ?? 0, gammaSource, gammaSatSource, cSource, phiSource, finesSource, labSample: lab?.sampleId }
  })
}
function formatValue(value: number | undefined, digits = 1) { return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—' }
function sptN(row: BoreholeRecord['spt'][number]) { return row.testType === 'SPT' && row.n2 != null && row.n3 != null ? row.n2 + row.n3 : undefined }

export function SoilProfileScreen({ boreholes, labs }: { boreholes: BoreholeRecord[]; labs: LaboratoryRecord[] }) {
  const [selectedId, setSelectedId] = useState(boreholes[0]?.id ?? '')
  const [gwt, setGwt] = useState<number | undefined>(boreholes[0]?.groundwaterDepth)
  useEffect(() => { if (!boreholes.some((borehole) => borehole.id === selectedId)) setSelectedId(boreholes[0]?.id ?? '') }, [boreholes, selectedId])
  const selected = boreholes.find((borehole) => borehole.id === selectedId) ?? boreholes[0]
  const layers = useMemo(() => selected ? toLayers(selected, labs) : [], [selected, labs])
  useEffect(() => { setGwt(selected?.groundwaterDepth) }, [selected])
  if (!selected) return <Frame screen="profile"><div className="empty-state"><strong>Profil oluşturmak için önce sondaj tanımlayın.</strong></div></Frame>
  const depth = Math.max(selected.totalDepth, 1)
  const groundwater = gwt == null || Number.isNaN(gwt) ? undefined : Math.max(0, Math.min(gwt, depth))
  const sptValues = selected.spt.map(sptN).filter((value): value is number => value != null)
  const averageSpt = sptValues.length ? sptValues.reduce((sum, value) => sum + value, 0) / sptValues.length : 0
  const resolvedForStress = layers.map((layer) => ({ ...layer, gammaSat: layer.gammaSat || layer.gamma }))
  const stressRows: Array<Array<string | number>> = layers.map((layer) => {
    const requiresSaturatedWeight = groundwater != null && layer.bottom > groundwater
    const complete = layer.gammaSource !== 'missing' && (!requiresSaturatedWeight || layer.gammaSatSource !== 'missing')
    const result = complete ? stressAtDepth(layer.bottom, resolvedForStress, groundwater ?? depth) : undefined
    return [layer.soil, `${layer.top.toFixed(2)}–${layer.bottom.toFixed(2)}`, formatValue(layer.gamma), formatValue(layer.cohesion), formatValue(layer.phi), result ? result.sigmaV.toFixed(1) : '—', result ? result.sigmaVPrime.toFixed(1) : '—']
  })
  const parameterRows: Array<Array<string | number>> = layers.map((layer) => [layer.soil, layer.gammaSource, layer.gammaSatSource, layer.cSource, layer.phiSource, layer.finesSource, layer.labSample ?? '—'])
  const missingCount = layers.filter((layer) => layer.gammaSource === 'missing' || (groundwater != null && layer.bottom > groundwater && layer.gammaSatSource === 'missing')).length
  return <Frame screen="profile">
    <Source>{SOURCE_NOTES.investigation} Profil seçilen sondajın litolojisini ve aynı derinlik aralığındaki laboratuvar numunelerini kullanır. YASS kuyu verisinden gelir; mühendislik parametresi varsayılmaz.</Source>
    <div className="form-grid">
      <label><span>Sondaj</span><select value={selected.id} onChange={(e) => { const borehole = boreholes.find((item) => item.id === e.target.value); setSelectedId(e.target.value); setGwt(borehole?.groundwaterDepth) }}>{boreholes.map((borehole) => <option key={borehole.id} value={borehole.id}>{borehole.name}</option>)}</select></label>
      <Field label="Toplam derinlik (m)" value={selected.totalDepth} onChange={() => {}} />
      <Field label="Yeraltı su seviyesi (m)" value={gwt ?? ''} onChange={(value) => setGwt(value === '' ? undefined : Number(value))} />
    </div>
    <div className="metric-strip"><Metric label="Katman" value={layers.length} /><Metric label="SPT" value={selected.spt.length} /><Metric label="Ortalama N-SPT" value={averageSpt.toFixed(1)} /><Metric label="YAS" value={groundwater == null ? '—' : groundwater.toFixed(2)} unit="m" /></div>
    <Card title={`ZEMİN PROFİLİ · ${selected.name}`}>
      <div className="profile-visual" style={{ minHeight: 420 }}>
        <div className="depth-scale">{Array.from({ length: Math.floor(depth) + 1 }, (_, i) => <span key={i} style={{ top: `${(i / depth) * 100}%` }}>{i} m</span>)}</div>
        <div className="soil-column">
          {selected.lithology.map((layer) => <div key={layer.id} className={`layer ${layer.colorClass}`} style={{ height: `${((layer.to - layer.from) / depth) * 100}%` }}><b>{layer.code}</b><small>{layer.description}<br />{layer.from.toFixed(2)}–{layer.to.toFixed(2)} m</small></div>)}
          {selected.spt.map((row) => { const n = sptN(row); return <span key={row.id} className="spt-marker" style={{ top: `${(row.depth / depth) * 100}%` }} title={`SPT ${row.depth.toFixed(2)} m · N=${n ?? '—'}`}>{n ?? '—'}</span> })}
          {groundwater != null && <span className="gwl-line" style={{ top: `${(groundwater / depth) * 100}%` }}><span>YAS {groundwater.toFixed(2)} m</span></span>}
        </div>
      </div>
    </Card>
    <Card title="KATMAN / GERİLME TABLOSU"><Table headers={['Zemin', 'Derinlik', 'γ', 'c', 'φ', 'σv', 'σ′v']} rows={stressRows} />{missingCount > 0 && <Source>Gerilme hesabı için gerekli γ veya YAS altında γsat verisi eksik olan katmanlar “—” gösterilir. Uygulama mühendislik parametresi uydurmaz.</Source>}</Card>
    <Card title="PARAMETRE KAYNAĞI"><Table headers={['Katman', 'γ', 'γsat', 'c', 'φ', 'İnce dane', 'Laboratuvar']} rows={parameterRows} /></Card>
  </Frame>
}
