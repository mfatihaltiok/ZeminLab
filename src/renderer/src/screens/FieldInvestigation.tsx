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
  { code: 'Bo', description: 'Blok (200–630 mm)', colorClass: 'gravel' },
  { code: 'Co', description: 'Büyük Çakıl / Taş (63–200 mm)', colorClass: 'gravel' },
  { code: 'cGr', description: 'İri Çakıl (20–63 mm)', colorClass: 'gravel' },
  { code: 'mGr', description: 'Orta Çakıl (6.3–20 mm)', colorClass: 'gravel' },
  { code: 'fGr', description: 'İnce Çakıl (2–6.3 mm)', colorClass: 'gravel' },
  { code: 'GrW', description: 'İyi Derecelenmiş Çakıl', colorClass: 'gravel' },
  { code: 'GrM', description: 'Orta Derecelenmiş Çakıl', colorClass: 'gravel' },
  { code: 'GrP', description: 'Kötü Derecelenmiş Çakıl', colorClass: 'gravel' },
  { code: 'GrU', description: 'Üniform / Tek Boyutlu Çakıl', colorClass: 'gravel' },
  { code: 'GrG', description: 'Boşluklu Derecelenmiş Çakıl', colorClass: 'gravel' },
  { code: 'cSa', description: 'İri Kum (0.63–2 mm)', colorClass: 'sand' },
  { code: 'mSa', description: 'Orta Kum (0.2–0.63 mm)', colorClass: 'sand' },
  { code: 'fSa', description: 'İnce Kum (0.063–0.2 mm)', colorClass: 'sand' },
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
  { code: 'AnCl', description: 'Yapay / Antropojenik Kil', colorClass: 'fill' },
  { code: 'Sa', description: 'Kum', colorClass: 'sand' },
  { code: 'Gr', description: 'Çakıl', colorClass: 'gravel' },
  { code: 'Mg', description: 'Dolgu', colorClass: 'fill' }
]
const soilMap = new Map(soilOptions.map((item) => [item.code, item]))
const LAB_NUMERIC: (keyof LaboratoryRecord)[] = [
  'waterContent','sieve10Passing','sieve200Passing','liquidLimit','plasticLimit','plasticityIndex','pointLoadIs50','unitWeight',
  'uniaxialRockStrength','uuC','uuPhi','consolidationCc','consolidationCs','elasticModulus','poissonRatio','hydrometer075','hydrometer002',
  'directShearC','directShearPhi','density','porosity','voidRatio','c','phi','finesContent'
]

function blankBorehole(index: number): BoreholeRecord {
  return { id: crypto.randomUUID(), name: `SK-${String(index).padStart(2, '0')}`, firstSptDepth: 1.5, totalDepth: 15, groundwaterDepth: undefined, elevation: undefined, location: '', lithology: [], spt: [] }
}
function fmt(v?: number, d = 2) { return v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d) }
function sourceLabel(source: string, confirmed: boolean) { return confirmed ? 'Onaylandı' : source === 'image-review' ? 'Görsel inceleme' : source === 'imported' ? 'İçe aktarıldı' : 'Manuel' }

function nextExperimentDepth(borehole: BoreholeRecord) {
  const depths = borehole.spt.map(r => r.depth).filter(Number.isFinite)
  return depths.length ? Math.max(...depths) + 1.5 : borehole.firstSptDepth
}
function addSptRow(borehole: BoreholeRecord): BoreholeRecord | null {
  const depth = nextExperimentDepth(borehole)
  if (depth > borehole.totalDepth + 1e-9) return null
  const row: SptRecord = { id: crypto.randomUUID(), depth, testType: 'SPT', source: 'manual', confirmed: false }
  return { ...borehole, spt: [...borehole.spt, row].sort((a,b) => a.depth-b.depth) }
}
function syncLabs(labs: LaboratoryRecord[], borehole: BoreholeRecord): LaboratoryRecord[] {
  const existing = new Map(labs.filter(l => l.boreholeId === borehole.id).map(l => [l.id, l]))
  const next = borehole.spt.map((spt, i) => {
    const id = `LAB-${borehole.id}-${spt.id}`
    const old = existing.get(id)
    return {
      id, boreholeId: borehole.id, sampleId: old?.sampleId ?? `${spt.testType}-${String(i + 1).padStart(2, '0')}`,
      depth: spt.depth, sampleType: spt.testType, soilCode: spt.soilCode, soilDescription: spt.soilDescription,
      waterContent: old?.waterContent, sieve10Passing: old?.sieve10Passing, sieve200Passing: old?.sieve200Passing,
      liquidLimit: old?.liquidLimit, plasticLimit: old?.plasticLimit,
      plasticityIndex: old?.liquidLimit !== undefined && old?.plasticLimit !== undefined ? old.liquidLimit - old.plasticLimit : old?.plasticityIndex,
      consistencyDensity: old?.consistencyDensity, pointLoadIs50: old?.pointLoadIs50, unitWeight: old?.unitWeight,
      uniaxialRockStrength: old?.uniaxialRockStrength, uuC: old?.uuC, uuPhi: old?.uuPhi, consolidationCc: old?.consolidationCc,
      consolidationCs: old?.consolidationCs, elasticModulus: old?.elasticModulus, poissonRatio: old?.poissonRatio,
      hydrometer075: old?.hydrometer075, hydrometer002: old?.hydrometer002, directShearC: old?.directShearC, directShearPhi: old?.directShearPhi,
      density: old?.density, porosity: old?.porosity, voidRatio: old?.voidRatio, c: old?.c, phi: old?.phi, finesContent: old?.finesContent,
      source: old?.source ?? spt.source, confirmed: old?.confirmed ?? false, notes: old?.notes
    } satisfies LaboratoryRecord
  })
  return [...labs.filter(l => l.boreholeId !== borehole.id), ...next]
}

function SptGrid({ borehole, onChange }: { borehole: BoreholeRecord; onChange: (b: BoreholeRecord) => void }) {
  const updateMeta = (key: 'firstSptDepth'|'totalDepth'|'groundwaterDepth', value: string) => {
    const n = value === '' ? undefined : Number(value)
    if (key === 'firstSptDepth') onChange({ ...borehole, firstSptDepth: Number.isFinite(n) ? n! : borehole.firstSptDepth })
    else if (key === 'totalDepth') onChange({ ...borehole, totalDepth: Number.isFinite(n) && n! > 0 ? n! : borehole.totalDepth, spt: borehole.spt.filter(r => r.depth <= (Number.isFinite(n) ? n! : borehole.totalDepth)) })
    else onChange({ ...borehole, groundwaterDepth: Number.isFinite(n) ? n : undefined })
  }
  const updateRow = (id: string, patch: Partial<SptRecord>) => onChange({ ...borehole, spt: borehole.spt.map(r => r.id === id ? { ...r, ...patch } : r).sort((a,b) => a.depth-b.depth) })
  const add = () => { const next = addSptRow(borehole); if (next) onChange(next) }
  return <>
    <div className="field-meta-strip">
      <label>İlk deney derinliği (m)<input type="number" value={borehole.firstSptDepth} min="0" step="0.1" onChange={e => updateMeta('firstSptDepth', e.target.value)} /></label>
      <label>Kuyu toplam derinliği (m)<input type="number" value={borehole.totalDepth} min="0.1" step="0.1" onChange={e => updateMeta('totalDepth', e.target.value)} /></label>
      <label>YASS (m)<input type="number" value={borehole.groundwaterDepth ?? ''} min="0" step="0.01" placeholder="Ölçülmediyse boş" onChange={e => updateMeta('groundwaterDepth', e.target.value)} /></label>
      <span className="field-rule-note">Eski yazılım kuralı: ilk deney → +1.50 m. SPT penetrasyonu 0.45 m, UD penetrasyonu 0.50 m.</span>
    </div>
    <div className="engineering-grid-wrap spt-grid-wrap">
      <div className="grid-toolbar"><b>SPT / ARAZİ DENEYLERİ</b><span>{borehole.spt.length} deney · son derinlik {fmt(borehole.spt.at(-1)?.depth)} m</span><button onClick={add}>+ Deney</button></div>
      <table className="engineering-grid spt-grid"><colgroup><col className="col-depth"/><col className="col-type"/><col className="col-n"/><col className="col-n"/><col className="col-n"/><col className="col-n30"/><col className="col-soil"/><col className="col-description"/><col className="col-source"/><col className="col-confirm"/><col className="col-delete"/></colgroup>
        <thead><tr><th>Derinlik</th><th>Deney Tipi</th><th>n1</th><th>n2</th><th>n3</th><th>N30</th><th>Zemin Sınıfı</th><th>Zemin Açıklaması</th><th>Kaynak</th><th>Onay</th><th/></tr></thead>
        <tbody>{borehole.spt.map(row => {
          const n30 = row.testType === 'SPT' && row.n2 !== undefined && row.n3 !== undefined ? row.n2 + row.n3 : undefined
          return <tr key={row.id}>
            <td><input className="depth-input" type="number" readOnly value={row.depth}/></td>
            <td><select className={`test-type ${row.testType === 'UD' ? 'ud' : 'spt'}`} value={row.testType} onChange={e => updateRow(row.id,{testType:e.target.value as SptRecord['testType'],n1:e.target.value==='UD'?undefined:row.n1,n2:e.target.value==='UD'?undefined:row.n2,n3:e.target.value==='UD'?undefined:row.n3})}><option value="SPT">SPT</option><option value="UD">UD</option></select></td>
            <td><input className="n-input" type="number" value={row.n1 ?? ''} disabled={row.testType==='UD'} onChange={e=>updateRow(row.id,{n1:e.target.value===''?undefined:Number(e.target.value)})}/></td>
            <td><input className="n-input" type="number" value={row.n2 ?? ''} disabled={row.testType==='UD'} onChange={e=>updateRow(row.id,{n2:e.target.value===''?undefined:Number(e.target.value)})}/></td>
            <td><input className="n-input" type="number" value={row.n3 ?? ''} disabled={row.testType==='UD'} onChange={e=>updateRow(row.id,{n3:e.target.value===''?undefined:Number(e.target.value)})}/></td>
            <td className="computed-cell">{fmt(n30,0)}</td>
            <td><select value={row.soilCode ?? ''} onChange={e=>{const o=soilMap.get(e.target.value);updateRow(row.id,{soilCode:e.target.value||undefined,soilDescription:o?.description})}}><option value="">Seçiniz</option>{soilOptions.map(o=><option key={o.code} value={o.code}>{o.code}</option>)}</select></td>
            <td className="description-cell">{row.soilDescription || '—'}</td>
            <td><span className="source-badge">{sourceLabel(row.source,row.confirmed)}</span></td>
            <td><button className="confirm-button" onClick={()=>updateRow(row.id,{confirmed:!row.confirmed})}>{row.confirmed?'✓':'○'}</button></td>
            <td><button className="icon-button" onClick={()=>onChange({...borehole,spt:borehole.spt.filter(r=>r.id!==row.id)})}>×</button></td>
          </tr>
        })}</tbody>
      </table>
    </div>
  </>
}

function SptAnalysis({ borehole }: { borehole: BoreholeRecord }) {
  const rows = borehole.spt.filter(r=>r.testType==='SPT').map(record=>({record,derived:deriveSptValues(borehole,record)}))
  return <div className="engineering-grid-wrap"><div className="grid-toolbar"><b>SPT HESAP İZİ</b><span>N30 · N60 · σv · σ′v · (N1)60</span></div><table className="engineering-grid engineering-grid-analysis"><thead><tr><th>Derinlik</th><th>N30</th><th>N60</th><th>σv</th><th>σ′v</th><th>CN</th><th>(N1)60</th><th>Dilatasyon</th></tr></thead><tbody>{rows.map(({record,derived})=><tr key={record.id}><td>{fmt(record.depth)}</td><td>{fmt(derived.nField,0)}</td><td>{fmt(derived.n60)}</td><td>{fmt(derived.verticalStress)}</td><td>{fmt(derived.effectiveStress)}</td><td>{fmt(derived.overburdenCorrection)}</td><td>{fmt(derived.n1_60)}</td><td>{derived.dilatancyApplied?`Uygulandı → ${fmt(derived.n60DilatancyCorrected)}`:'—'}</td></tr>)}</tbody></table></div>
}

function LaboratoryGrid({ borehole, labs, onChange }: { borehole: BoreholeRecord; labs: LaboratoryRecord[]; onChange: (rows: LaboratoryRecord[]) => void }) {
  const rows = labs.filter(l=>l.boreholeId===borehole.id)
  const update = (row: LaboratoryRecord, key: keyof LaboratoryRecord, raw: string) => {
    const value = raw === '' ? undefined : LAB_NUMERIC.includes(key) ? Number(raw) : raw
    const next = {...row,[key]:value} as LaboratoryRecord
    if (key==='liquidLimit' || key==='plasticLimit') next.plasticityIndex = next.liquidLimit !== undefined && next.plasticLimit !== undefined ? next.liquidLimit-next.plasticLimit : undefined
    next.soilDescription = next.soilCode ? soilMap.get(next.soilCode)?.description : next.soilDescription
    const classified = classifyLaboratoryRecord(next)
    onChange(labs.map(l=>l.id===row.id ? {...next,...classified} : l))
  }
  const cell = (row: LaboratoryRecord,key: keyof LaboratoryRecord, width='w-16') => <input className={`lab-input ${width}`} type="number" value={(row[key] as number|undefined) ?? ''} onChange={e=>update(row,key,e.target.value)}/>
  return <div className="engineering-grid-wrap laboratory-wrap">
    <div className="grid-toolbar"><b>LABORATUVAR</b><span>Derinlik ve deney tipi SPT ekranından otomatik gelir · laboratuvar sonuçları burada girilir</span></div>
    <div className="lab-scroll"><table className="engineering-grid laboratory-grid">
      <thead><tr>
        <th rowSpan={2}>Kuyu</th><th colSpan={3}>Numunenin</th><th rowSpan={2}>Doğal Su (%)</th><th colSpan={2}>Elek Analizi</th><th colSpan={3}>Atterberg Limitleri</th><th rowSpan={2}>Nokta Yük. Is₅₀</th><th rowSpan={2}>Birim Hacim Ağırlık</th><th rowSpan={2}>Kaya Tek Eksenli</th><th colSpan={2}>Üç Eksenli (UU)</th><th colSpan={2}>Konsolidasyon</th><th colSpan={2}>Elastisite Modülü</th><th colSpan={2}>Hidrometre</th><th rowSpan={2}>Yoğunluk</th><th rowSpan={2}>Porozite</th><th rowSpan={2}>Boşluk Oranı</th><th colSpan={2}>Direkt Kesme</th><th rowSpan={2}>Otomatik İşlemler</th>
      </tr><tr>
        <th>Numune Türü</th><th>Derinlik (m)</th><th>Zemin Cinsi</th><th>#10 Geç. (%)</th><th>#200 Geç. (%)</th><th>LL (%)</th><th>PL (%)</th><th>PI (%)</th><th>c</th><th>Φ</th><th>Cc</th><th>Cs</th><th>Em</th><th>Uo</th><th>-0.075 (%)</th><th>-0.002 (%)</th><th>c</th><th>Φ</th>
      </tr></thead>
      <tbody>{rows.map(row=><tr key={row.id}>
        <td>{borehole.name}</td><td><span className="locked-cell">{row.sampleType}</span></td><td><span className="locked-cell">{fmt(row.depth)}</span></td>
        <td><select value={row.soilCode??''} onChange={e=>update(row,'soilCode',e.target.value)}><option value="">—</option>{soilOptions.map(o=><option key={o.code} value={o.code}>{o.code}</option>)}</select></td>
        <td>{cell(row,'waterContent')}</td><td>{cell(row,'sieve10Passing')}</td><td>{cell(row,'sieve200Passing')}</td><td>{cell(row,'liquidLimit')}</td><td>{cell(row,'plasticLimit')}</td><td><span className="locked-cell computed">{fmt(row.plasticityIndex)}</span></td><td>{cell(row,'pointLoadIs50')}</td><td>{cell(row,'unitWeight')}</td><td>{cell(row,'uniaxialRockStrength')}</td><td>{cell(row,'uuC')}</td><td>{cell(row,'uuPhi')}</td><td>{cell(row,'consolidationCc')}</td><td>{cell(row,'consolidationCs')}</td><td>{cell(row,'elasticModulus')}</td><td>{cell(row,'poissonRatio')}</td><td>{cell(row,'hydrometer075')}</td><td>{cell(row,'hydrometer002')}</td><td>{cell(row,'density')}</td><td>{cell(row,'porosity')}</td><td>{cell(row,'voidRatio')}</td><td>{cell(row,'directShearC')}</td><td>{cell(row,'directShearPhi')}</td><td><span className="source-badge">{sourceLabel(row.source,row.confirmed)}</span></td>
      </tr>)}</tbody>
    </table></div>
  </div>
}

function SondajLog({ borehole, labs }: { borehole: BoreholeRecord; labs: LaboratoryRecord[] }) {
  const depth=Math.max(borehole.totalDepth,1)
  const rows=[...borehole.spt].sort((a,b)=>a.depth-b.depth)
  const segments=rows.map((row,i)=>{const from=i===0?0:(rows[i-1].depth+row.depth)/2;const to=i===rows.length-1?depth:(row.depth+(rows[i+1]?.depth??depth))/2;const soil=soilMap.get(row.soilCode??'');return {row,from:Math.max(0,from),to:Math.min(depth,Math.max(from,to)),soil}}).filter(s=>s.to>s.from)
  const labCount=labs.filter(l=>l.boreholeId===borehole.id).length
  return <div className="log-only"><div className="log-summary"><div><span>Kuyu</span><b>{borehole.name}</b></div><div><span>Toplam Derinlik</span><b>{fmt(borehole.totalDepth,1)} m</b></div><div><span>YASS</span><b>{borehole.groundwaterDepth===undefined?'—':`${fmt(borehole.groundwaterDepth)} m`}</b></div><div><span>Deney</span><b>{rows.length} / Lab {labCount}</b></div></div><div className="log-graphic"><div className="log-ruler">{Array.from({length:Math.floor(depth)+1},(_,i)=>i).filter(d=>d%2===0||d===depth).map(d=><span key={d} style={{top:`${d/depth*100}%`}}>{d} m</span>)}</div><div className="log-column">{segments.length===0&&<div className="log-empty">SPT verisi girildiğinde zemin profili burada otomatik oluşturulur.</div>}{segments.map(({row,from,to,soil})=><div key={row.id} className={`log-layer ${soil?.colorClass??'fill'}`} style={{top:`${from/depth*100}%`,height:`${Math.max(1,(to-from)/depth*100)}%`}}><b>{row.soilCode||'—'}</b><span>{row.soilDescription||soil?.description||'Zemin sınıfı seçilmedi'}</span></div>)}{borehole.groundwaterDepth!==undefined&&borehole.groundwaterDepth<=depth&&<div className="log-water" style={{top:`${borehole.groundwaterDepth/depth*100}%`}}><span>YASS {fmt(borehole.groundwaterDepth)} m</span></div>}</div></div><div className="log-note">Bu ekran yalnızca görsel sondaj logudur. Kullanıcı burada katman veya deney parametresi girmez.</div></div>
}

export default function FieldInvestigation({ boreholes, labs, onBoreholesChange, onLabsChange }: Props) {
  const [selectedId,setSelectedId]=useState(boreholes[0]?.id??'')
  const [tab,setTab]=useState<'spt'|'lab'|'log'>('spt')
  const active=useMemo(()=>boreholes.find(b=>b.id===selectedId)??boreholes[0], [boreholes,selectedId])
  useEffect(()=>{if(!selectedId&&boreholes[0])setSelectedId(boreholes[0].id)},[boreholes,selectedId])
  useEffect(()=>{if(active){const synced=syncLabs(labs,active);if(JSON.stringify(synced)!==JSON.stringify(labs))onLabsChange(synced)}},[active?.id,active?.spt.length,active?.spt.map(r=>`${r.id}:${r.depth}:${r.testType}:${r.soilCode}`).join('|')])
  if(!active) return <div className="field-empty"><b>Sondaj verisi yok.</b><button onClick={()=>{const b=blankBorehole(boreholes.length+1);onBoreholesChange([b]);setSelectedId(b.id)}}>+ İlk Sondajı Oluştur</button></div>
  const changeBorehole=(next:BoreholeRecord)=>onBoreholesChange(boreholes.map(b=>b.id===next.id?next:b))
  const addBorehole=()=>{const b=blankBorehole(boreholes.length+1);onBoreholesChange([...boreholes,b]);setSelectedId(b.id)}
  return <section className="field-workspace"><div className="field-header"><div><span className="eyebrow">SAHA / SONDAJ</span><h2>Alan Araştırması</h2></div><div className="borehole-actions"><select value={active.id} onChange={e=>setSelectedId(e.target.value)}>{boreholes.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button onClick={addBorehole}>+ Sondaj</button></div></div><div className="field-tabs"><button className={tab==='spt'?'active':''} onClick={()=>setTab('spt')}>SPT</button><button className={tab==='lab'?'active':''} onClick={()=>setTab('lab')}>Laboratuvar</button><button className={tab==='log'?'active':''} onClick={()=>setTab('log')}>Sondaj Logu</button></div><div className="field-content">{tab==='spt'&&<><SptGrid borehole={active} onChange={changeBorehole}/><SptAnalysis borehole={active}/></>}{tab==='lab'&&<LaboratoryGrid borehole={active} labs={labs} onChange={onLabsChange}/>} {tab==='log'&&<SondajLog borehole={active} labs={labs}/>}</div></section>
}
