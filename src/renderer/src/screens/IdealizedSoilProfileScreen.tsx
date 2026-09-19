import { useMemo, useState } from 'react'
import { useProjectInfo } from '../../../core/state/project-store'
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
  const project=useProjectInfo()
  const maxDepth=Math.max(1,...p.layers.map(x=>x.bottomDepth),...boreholes.map(x=>x.totalDepth))
  const groundWater=project.soilParameters.groundwaterDepth
  const yDepth=(depth:number)=>44+(Math.max(0,Math.min(maxDepth,depth))/maxDepth)*520
  const patternFor=(code:string)=>{const c=code.toUpperCase();if(c.includes('CL')||c.includes('CI')||c.includes('CH'))return 'url(#profile-clay)';if(c.includes('SI')||c.includes('ML')||c.includes('MH'))return 'url(#profile-silt)';if(c.includes('GR')||c.includes('BO'))return 'url(#profile-gravel)';if(c.includes('SA'))return 'url(#profile-sand)';return 'url(#profile-fill)'}

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
    <div className="profile-render-card">
      <div className="profile-render-header"><div><b>TEKNİK ZEMİN PROFİLİ RENDER</b><span>İdealize katmanlar · mühendislik parametreleri · SPT göstergesi</span></div><div className="profile-render-legend"><span><i className="legend-box soil"></i>Zemin</span><span><i className="legend-box spt"></i>SPT</span><span><i className="legend-box gw"></i>YASS</span></div></div>
      <svg className="profile-render-svg" viewBox="0 0 980 620" role="img" aria-label="İdealize zemin profili teknik render">
        <defs>
          <pattern id="profile-fill" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#d9dcde"/><path d="M0 12L12 0" stroke="#aab0b4" strokeWidth="1"/></pattern>
          <pattern id="profile-clay" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#d9c0a5"/><path d="M0 5h14M0 11h14" stroke="#9b8066" strokeWidth="1"/></pattern>
          <pattern id="profile-silt" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#c9d0c9"/><circle cx="3" cy="3" r="1" fill="#7d8b7d"/><circle cx="9" cy="8" r="1" fill="#7d8b7d"/></pattern>
          <pattern id="profile-sand" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#e4d2a4"/><circle cx="3" cy="4" r="1" fill="#aa8f58"/><circle cx="9" cy="9" r="1" fill="#aa8f58"/></pattern>
          <pattern id="profile-gravel" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#bfc5c7"/><circle cx="4" cy="5" r="2" fill="#7b8488"/><circle cx="12" cy="11" r="2" fill="#7b8488"/></pattern>
        </defs>
        <rect x="0" y="0" width="980" height="620" fill="#f8f9fa"/>
        <rect x="105" y="44" width="410" height="520" fill="#fff" stroke="#7e8991" strokeWidth="1.5"/>
        {Array.from({length:Math.ceil(maxDepth)+1},(_,i)=><g key={i}><line x1="45" y1={yDepth(i)} x2="880" y2={yDepth(i)} stroke="#dfe3e5" strokeWidth={i%5===0?'1.4':'0.7'}/><text x="30" y={yDepth(i)+4} textAnchor="end" fontSize="10" fill="#606970">{i}</text></g>)}
        <text x="20" y="30" fontSize="10" fill="#4e5960" fontWeight="700">DERİNLİK (m)</text>
        <text x="115" y="31" fontSize="10" fill="#4e5960" fontWeight="700">İDEALİZE ZEMİN</text>
        <text x="575" y="31" fontSize="10" fill="#4e5960" fontWeight="700">N-SPT</text>
        <text x="760" y="31" fontSize="10" fill="#4e5960" fontWeight="700">PARAMETRELER</text>
        {p.layers.map(layer=>{const y0=yDepth(layer.topDepth),y1=yDepth(layer.bottomDepth),h=Math.max(1,y1-y0),bar=Math.max(0,Math.min(60,layer.representativeSptN??layer.representativeSptN??0));return <g key={layer.id}>
          <rect x="105" y={y0} width="410" height={h} fill={patternFor(layer.soilCode)} stroke="#6c747a" strokeWidth="1"/>
          <text x="120" y={y0+Math.min(20,h/2+4)} fontSize="12" fill="#263138" fontWeight="700">{layer.order}. {layer.soilCode||'—'} · {layer.soilName}</text>
          {h>38&&<text x="120" y={y0+Math.min(h-12,36)} fontSize="9.5" fill="#445057">γ {n(layer.gamma)} · c {n(layer.cohesion)} · φ {n(layer.frictionAngle)}°</text>}
          <rect x="575" y={y0+Math.max(2,h/2-7)} width="145" height="14" fill="#edf0f2" stroke="#b0b7bc"/>
          <rect x="575" y={y0+Math.max(2,h/2-7)} width={(bar/60)*145} height="14" fill="#5d7890"/>
          <text x="728" y={y0+Math.max(13,h/2+4)} fontSize="10" fill="#3f4b53">{bar>0?bar.toFixed(1):'—'}</text>
          <text x="760" y={y0+Math.max(13,h/2+4)} fontSize="9" fill="#566168">Cc {n(layer.compressionIndexCc)} · E {n(layer.oedometricModulus)}</text>
        </g>})}
        {groundWater!=null&&Number.isFinite(groundWater)&&groundWater>=0&&groundWater<=maxDepth&&<g><line x1="65" y1={yDepth(groundWater)} x2="900" y2={yDepth(groundWater)} stroke="#3e7ba0" strokeWidth="2" strokeDasharray="7 5"/><text x="905" y={yDepth(groundWater)-5} textAnchor="end" fontSize="10" fill="#2f6486" fontWeight="700">YASS {groundWater.toFixed(2)} m</text></g>}
        {project.foundationParameters.footingDepth>0&&project.foundationParameters.footingDepth<=maxDepth&&<g><line x1="105" y1={yDepth(project.foundationParameters.footingDepth)} x2="515" y2={yDepth(project.foundationParameters.footingDepth)} stroke="#8a4a37" strokeWidth="2"/><text x="120" y={yDepth(project.foundationParameters.footingDepth)-6} fontSize="10" fill="#8a4a37" fontWeight="700">TEMEL TABANI Df={project.foundationParameters.footingDepth.toFixed(2)} m</text></g>}
        <line x1="865" y1="44" x2="865" y2="564" stroke="#8a949a"/>
        <text x="875" y="552" fontSize="9" fill="#68737a">maks. 60</text>
      </svg>
    </div>
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
