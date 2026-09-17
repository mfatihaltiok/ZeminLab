import { useMemo, useState } from 'react'
import { Frame, Card, Metric, Source } from '../workspace/WorkspaceShell'
import type { BoreholeRecord, LaboratoryRecord } from '../../core/models/field-data'
import type { IdealizedSoilLayer, IdealizedSoilProfile } from '../../core/models/idealized-soil-profile'
import { generateIdealizedSoilProfile } from '../../core/services/idealized-soil-profile-engine'

export function IdealizedSoilProfileScreen({ boreholes, labs, profile, onChange }: { boreholes: BoreholeRecord[]; labs: LaboratoryRecord[]; profile?: IdealizedSoilProfile; onChange: (p: IdealizedSoilProfile) => void }) {
  const [sel, setSel] = useState(0)
  const [count, setCount] = useState(profile?.targetLayerCount ?? 3)
  const p = useMemo(() => profile ?? generateIdealizedSoilProfile({ boreholes, laboratories: labs, targetLayerCount: count }), [profile, boreholes, labs, count])
  const l = p.layers[sel]

  const edit = (patch: Partial<IdealizedSoilLayer>) => {
    if (!l || p.status === 'SABİTLENDİ') return
    onChange({ ...p, layers: p.layers.map((x, i) => i === sel ? { ...x, ...patch, userOverride: true } : x) })
  }

  const regenerate = () => {
    const next = generateIdealizedSoilProfile({ boreholes, laboratories: labs, targetLayerCount: count, previous: p })
    setSel(0)
    onChange(next)
  }

  if (!boreholes.length) return <Frame screen="profile"><div className="empty-state"><strong>İdealize zemin profili için önce sondaj ve SPT verisi girilmelidir.</strong></div></Frame>

  return <Frame screen="profile">
    <div className="idealized-toolbar">
      <div><b>İDEALİZE ZEMİN PROFİLİ</b><span>Oturma hesabında kullanılacak mühendislik modeli.</span></div>
      <div className="idealized-actions">
        <label>Hedef katman <input type="number" min="1" max="20" value={count} disabled={p.status === 'SABİTLENDİ'} onChange={e => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label>
        <button disabled={p.status === 'SABİTLENDİ'} onClick={regenerate}>Otomatik Oluştur</button>
        <button className="primary-button" disabled={p.status === 'SABİTLENDİ' || !p.layers.length} onClick={() => onChange({ ...p, status: 'SABİTLENDİ', frozenAt: new Date().toISOString(), version: p.version + 1 })}>Profili Sabitle</button>
      </div>
    </div>
    <Source><b>Kaynak yaklaşımı:</b> TBDY 2018 → Türk mevzuatı → ilgili TS/TS EN/TS EN ISO. Verisi olmayan parametreler varsayılmaz.</Source>
    <div className="metric-strip">
      <Metric label="Durum" value={p.status} /><Metric label="Katman" value={p.layers.length} /><Metric label="Sondaj" value={p.sourceBoreholeIds.length} />
      <Metric label="SPT" value={p.layers.reduce((n, x) => n + x.sptRecordIds.length, 0)} /><Metric label="Laboratuvar" value={p.layers.reduce((n, x) => n + x.laboratoryRecordIds.length, 0)} /><Metric label="Versiyon" value={p.version} />
    </div>
    <div className="idealized-layout">
      <Card title="İDEALİZE KATMANLAR">
        <table className="data-table"><thead><tr>{['#', 'Üst', 'Alt', 'Kalınlık', 'Zemin', 'N-SPT', 'γ', 'c', 'φ'].map(x => <th key={x}>{x}</th>)}</tr></thead>
          <tbody>{p.layers.map((x, i) => <tr key={x.id} onClick={() => setSel(i)} className={i === sel ? 'idealized-selected' : ''}>
            <td>{i + 1}</td><td>{x.topDepth.toFixed(2)}</td><td>{x.bottomDepth.toFixed(2)}</td><td>{(x.bottomDepth - x.topDepth).toFixed(2)}</td><td>{x.soilName}</td><td>{x.representativeSptN?.toFixed(1) ?? '—'}</td><td>{x.gamma?.toFixed(2) ?? '—'}</td><td>{x.cohesion?.toFixed(2) ?? '—'}</td><td>{x.frictionAngle?.toFixed(1) ?? '—'}</td>
          </tr>)}</tbody>
        </table>
      </Card>
      <aside className="idealized-properties">
        <div className="calculation-card-title">ÖZELLİKLER · {l ? `KATMAN ${l.order}` : '—'}</div>
        {l && <div className="idealized-form">
          <label>Zemin adı<input value={l.soilName} disabled={p.status === 'SABİTLENDİ'} onChange={e => edit({ soilName: e.target.value })} /></label>
          <label>Sınıflandırma<input value={l.soilCode} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ soilCode: e.target.value })} /></label>
          <label>Üst (m)<input type="number" value={l.topDepth} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ topDepth: Number(e.target.value) })} /></label>
          <label>Alt (m)<input type="number" value={l.bottomDepth} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ bottomDepth: Number(e.target.value) })} /></label>
          <label>γ<input type="number" value={l.gamma ?? ''} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ gamma: Number(e.target.value) })} /></label>
          <label>γsat<input type="number" value={l.gammaSat ?? ''} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ gammaSat: Number(e.target.value) })} /></label>
          <label>c<input type="number" value={l.cohesion ?? ''} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ cohesion: Number(e.target.value) })} /></label>
          <label>φ (°)<input type="number" value={l.frictionAngle ?? ''} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ frictionAngle: Number(e.target.value) })} /></label>
          <label>CC<input type="number" value={l.compressionIndexCc ?? ''} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ compressionIndexCc: Number(e.target.value) })} /></label>
          <label>CR<input type="number" value={l.recompressionIndexCr ?? ''} disabled={p.status === 'SABİLENDİ'} onChange={e => edit({ recompressionIndexCr: Number(e.target.value) })} /></label>
          <div className="property-source">SPT: {l.sptRecordIds.length} · Laboratuvar: {l.laboratoryRecordIds.length} · Sondaj: {l.boreholeIds.join(', ') || '—'}</div>
        </div>}
      </aside>
    </div>
  </Frame>
}
