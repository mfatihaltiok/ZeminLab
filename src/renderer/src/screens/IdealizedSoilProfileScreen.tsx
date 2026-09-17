import { useMemo, useState } from 'react'
import { Frame, Card, Metric, Source } from '../workspace/WorkspaceShell'
import type { BoreholeRecord, LaboratoryRecord } from '../../core/models/field-data'
import type { IdealizedSoilLayer, IdealizedSoilProfile } from '../../core/models/idealized-soil-profile'
import { generateIdealizedSoilProfile } from '../../core/services/idealized-soil-profile-engine'

const n = (v: number | undefined) => v == null || !Number.isFinite(v) ? '—' : v.toFixed(2)
const sourceLabel = (type?: string) => ({ LABORATUVAR: 'Laboratuvar', SPT_KORELASYONU: 'SPT', LİTOLOJİ: 'Litoloji', KULLANICI: 'Kullanıcı' } as Record<string, string>)[type ?? ''] ?? '—'

export function IdealizedSoilProfileScreen({ boreholes, labs, profile, onChange }: { boreholes: BoreholeRecord[]; labs: LaboratoryRecord[]; profile?: IdealizedSoilProfile; onChange: (p: IdealizedSoilProfile) => void }) {
  const [sel, setSel] = useState(0)
  const [count, setCount] = useState(profile?.targetLayerCount ?? 3)
  const p = useMemo(() => profile ?? generateIdealizedSoilProfile({ boreholes, laboratories: labs, targetLayerCount: count }), [profile, boreholes, labs, count])
  const l = p.layers[sel]
  const frozen = p.status === 'SABİTLENDİ'

  const edit = (patch: Partial<IdealizedSoilLayer>) => {
    if (!l || frozen) return
    onChange({ ...p, layers: p.layers.map((x, i) => i === sel ? { ...x, ...patch, userOverride: true } : x), notes: 'Kullanıcı müdahalesi mevcut. Katman sınırları ve/veya parametreler otomatik profilden değiştirilmiştir.' })
  }

  const regenerate = () => {
    if (frozen) return
    setSel(0)
    onChange(generateIdealizedSoilProfile({ boreholes, laboratories: labs, targetLayerCount: count, previous: p }))
  }

  const freeze = () => {
    if (!p.layers.length || frozen) return
    const ordered = [...p.layers].sort((a, b) => a.topDepth - b.topDepth)
    const valid = ordered.every((x, i) => x.topDepth >= 0 && x.bottomDepth > x.topDepth && (i === 0 ? x.topDepth === 0 : Math.abs(x.topDepth - ordered[i - 1].bottomDepth) < 0.001))
    if (!valid) {
      window.alert('Profil sabitlenemedi. Katman sınırları 0 m’den başlamalı ve aralıksız, artan derinlikte olmalıdır.')
      return
    }
    onChange({ ...p, layers: ordered.map((x, i) => ({ ...x, order: i + 1 })), status: 'SABİTLENDİ', frozenAt: new Date().toISOString(), version: p.version + 1 })
  }

  if (!boreholes.length) return <Frame screen="profile"><div className="empty-state"><strong>İdealize zemin profili için önce sondaj ve SPT verisi girilmelidir.</strong></div></Frame>

  return <Frame screen="profile">
    <div className="idealized-toolbar">
      <div><b>İDEALİZE ZEMİN PROFİLİ</b><span>Oturma hesabında kullanılacak mühendislik modeli.</span></div>
      <div className="idealized-actions"><label>Hedef katman <input type="number" min="1" max="20" value={count} disabled={frozen} onChange={e => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label><button disabled={frozen} onClick={regenerate}>Otomatik Oluştur</button><button className="primary-button" disabled={frozen || !p.layers.length} onClick={freeze}>Profili Sabitle</button></div>
    </div>
    <Source><b>Kaynak yaklaşımı:</b> TBDY 2018 → Türk mevzuatı → ilgili TS/TS EN/TS EN ISO. Verisi olmayan parametreler varsayılmaz. Otomatik profil mühendislik taslağıdır.</Source>
    <div className="metric-strip"><Metric label="Durum" value={p.status} /><Metric label="Katman" value={p.layers.length} /><Metric label="Sondaj" value={p.sourceBoreholeIds.length} /><Metric label="SPT" value={p.layers.reduce((n, x) => n + x.sptRecordIds.length, 0)} /><Metric label="Laboratuvar" value={p.layers.reduce((n, x) => n + x.laboratoryRecordIds.length, 0)} /><Metric label="Versiyon" value={p.version} /></div>
    <div className="idealized-layout">
      <Card title="İDEALİZE KATMANLAR"><table className="data-table"><thead><tr>{['#','Üst','Alt','Kalınlık','Zemin','Kod','N-SPT','γ','c','φ'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{p.layers.map((x,i)=><tr key={x.id} onClick={()=>setSel(i)} className={i===sel?'idealized-selected':''}><td>{i+1}</td><td>{n(x.topDepth)}</td><td>{n(x.bottomDepth)}</td><td>{n(x.bottomDepth-x.topDepth)}</td><td>{x.soilName}</td><td>{x.soilCode||'—'}</td><td>{n(x.representativeSptN)}</td><td>{n(x.gamma)}</td><td>{n(x.cohesion)}</td><td>{n(x.frictionAngle)}</td></tr>)}</tbody></table></Card>
      <aside className="idealized-properties"><div className="calculation-card-title">ÖZELLİKLER · {l?`KATMAN ${l.order}`:'—'}</div>{l&&<div className="idealized-form">
        <label>Zemin adı<input value={l.soilName} disabled={frozen} onChange={e=>edit({soilName:e.target.value})}/></label><label>Sınıflandırma<input value={l.soilCode} disabled={frozen} onChange={e=>edit({soilCode:e.target.value})}/></label>
        <div className="property-section-title">GEOMETRİ</div><label>Üst (m)<input type="number" value={l.topDepth} disabled={frozen} onChange={e=>edit({topDepth:Number(e.target.value)})}/></label><label>Alt (m)<input type="number" value={l.bottomDepth} disabled={frozen} onChange={e=>edit({bottomDepth:Number(e.target.value)})}/></label>
        <div className="property-section-title">FİZİKSEL / MUKAVEMET</div><label>γ<input type="number" value={l.gamma??''} disabled={frozen} onChange={e=>edit({gamma:Number(e.target.value)})}/></label><label>γsat<input type="number" value={l.gammaSat??''} disabled={frozen} onChange={e=>edit({gammaSat:Number(e.target.value)})}/></label><label>c<input type="number" value={l.cohesion??''} disabled={frozen} onChange={e=>edit({cohesion:Number(e.target.value)})}/></label><label>φ (°)<input type="number" value={l.frictionAngle??''} disabled={frozen} onChange={e=>edit({frictionAngle:Number(e.target.value)})}/></label>
        <div className="property-section-title">SIKIŞABİLİRLİK</div><label>Cc<input type="number" value={l.compressionIndexCc??''} disabled={frozen} onChange={e=>edit({compressionIndexCc:Number(e.target.value)})}/></label><label>Cr<input type="number" value={l.recompressionIndexCr??''} disabled={frozen} onChange={e=>edit({recompressionIndexCr:Number(e.target.value)})}/></label><label>σ′p (kPa)<input type="number" value={l.preconsolidationPressure??''} disabled={frozen} onChange={e=>edit({preconsolidationPressure:Number(e.target.value)})}/></label><label>Eoed<input type="number" value={l.oedometricModulus??''} disabled={frozen} onChange={e=>edit({oedometricModulus:Number(e.target.value)})}/></label>
        <div className="property-section-title">KAYNAK VE PROVENANS</div><div className="property-source">SPT: {l.sptRecordIds.length} kayıt · Laboratuvar: {l.laboratoryRecordIds.length} kayıt · Sondaj: {l.boreholeIds.join(', ')||'—'}</div>{Object.entries(l.parameterSources).map(([key,src])=><div className="property-source" key={key}><b>{key}</b> · {sourceLabel(src.type)}{src.sampleIds?.length?` · ${src.sampleIds.length} kayıt`:''}{src.boreholeIds?.length?` · ${new Set(src.boreholeIds).size} sondaj`:''}</div>)}{l.userOverride&&<div className="property-warning">● Kullanıcı tarafından değiştirilmiş</div>}
      </div>}</aside>
    </div>
  </Frame>
}
