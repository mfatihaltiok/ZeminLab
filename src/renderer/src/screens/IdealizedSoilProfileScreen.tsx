import { useMemo, useState } from 'react'
import { useProjectInfo } from '../../../core/state/project-store'
import { Frame, Card, Metric, Source, Field } from '../workspace/WorkspaceShell'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../../../core/models/field-data'
import { hasMeasuredLabData, deriveSptValues } from '../../../core/engineering/field-calculations'
import type { IdealizedSoilLayer, IdealizedSoilProfile } from '../../../core/models/idealized-soil-profile'
import { createEmptyIdealizedProfile } from '../../../core/models/idealized-soil-profile'
import { forceToBase, forceFromBase, stressToBase, stressFromBase, unitWeightToBase, unitWeightFromBase, modulusToBase, modulusFromBase, PROJECT_UNIT_LABELS } from '../../../core/units/project-units'
import { EngineeringSectionRenderer } from '../components/EngineeringSectionRenderer'

const n=(v:number|undefined)=>v==null||!Number.isFinite(v)?'—':v.toFixed(2)
type Props={boreholes:BoreholeRecord[];labs:LaboratoryRecord[];profile?:IdealizedSoilProfile;onChange:(p:IdealizedSoilProfile)=>void}
function allSpt(boreholes:BoreholeRecord[]){return boreholes.flatMap(b=>b.spt.filter(x=>x.testType==='SPT').map(spt=>({borehole:b,spt})))}
function linkedLab(labs:LaboratoryRecord[],boreholeId:string,sptId:string,depth:number){return labs.find(x=>x.id==='LAB-'+boreholeId+'-'+sptId&&hasMeasuredLabData(x))??labs.find(x=>x.boreholeId===boreholeId&&Math.abs(x.depth-depth)<0.01&&hasMeasuredLabData(x))}
const clearLab:Partial<IdealizedSoilLayer>={waterContent:undefined,liquidLimit:undefined,plasticLimit:undefined,plasticityIndex:undefined,finesContent:undefined,gamma:undefined,gammaSat:undefined,cohesion:undefined,frictionAngle:undefined,undrainedCohesion:undefined,compressionIndexCc:undefined,recompressionIndexCr:undefined,initialVoidRatio:undefined,constrainedModulus:undefined,oedometricModulus:undefined,elasticModulus:undefined,poissonRatio:undefined,janbuModulusNumber:undefined,janbuStressExponent:undefined}
function labPatch(lab:LaboratoryRecord|undefined):Partial<IdealizedSoilLayer>{
 if(!lab)return {}
 return {
  waterContent:lab.waterContent,liquidLimit:lab.liquidLimit,plasticLimit:lab.plasticLimit,plasticityIndex:lab.plasticityIndex,
  finesContent:lab.finesContent??lab.sieve200Passing,gamma:lab.unitWeight,
  cohesion:lab.directShearC,frictionAngle:lab.directShearPhi,undrainedCohesion:lab.uuC,
  compressionIndexCc:lab.consolidationCc,recompressionIndexCr:lab.consolidationCs,initialVoidRatio:lab.voidRatio,
  elasticModulus:lab.elasticModulus,constrainedModulus:lab.oedometricModulus,oedometricModulus:lab.oedometricModulus,poissonRatio:lab.poissonRatio
 }
}
function reflow(layers:IdealizedSoilLayer[]){let cursor=0;return layers.map((x,i)=>{const t=Number.isFinite(x.thickness)&&x.thickness!>0?x.thickness!:Math.max(0,x.bottomDepth-x.topDepth);const next={...x,order:i+1,topDepth:cursor,bottomDepth:cursor+t,thickness:t};cursor+=t;return next})}
function sptDerived(source:{borehole:BoreholeRecord;spt:SptRecord},labs:LaboratoryRecord[]){return deriveSptValues(source.borehole,source.spt,labs)}
function makeLayer(source:{borehole:BoreholeRecord;spt:SptRecord},labs:LaboratoryRecord[],order:number):IdealizedSoilLayer{
 const lab=linkedLab(labs,source.borehole.id,source.spt.id,source.spt.depth),patch=labPatch(lab),derived=sptDerived(source,labs)
 const parameterSources:Record<string,{type:'LABORATUVAR'|'SPT_KORELASYONU'|'LİTOLOJİ'|'KULLANICI';sampleIds?:string[];boreholeIds?:string[]}>={}
 if(derived.n60!==undefined)parameterSources.representativeN60={type:'SPT_KORELASYONU',sampleIds:[source.spt.id],boreholeIds:[source.borehole.id],note:'Merkezi SPT düzeltme motorundan N60.'}
 if(lab)for(const key of Object.keys(patch))if((patch as Record<string,unknown>)[key]!==undefined)parameterSources[key]={type:'LABORATUVAR',sampleIds:[lab.id]}
 return {id:crypto.randomUUID(),order,topDepth:0,bottomDepth:0,thickness:0,soilName:source.spt.soilDescription??'Zemin tanımı seçilmedi',soilCode:source.spt.soilCode??'',boreholeIds:[source.borehole.id],sptRecordIds:[source.spt.id],laboratoryRecordIds:lab?[lab.id]:[],sourceBoreholeId:source.borehole.id,sourceSptRecordId:source.spt.id,sourceLaboratoryRecordId:lab?.id,representativeSptN:source.spt.n2!=null&&source.spt.n3!=null?source.spt.n2+source.spt.n3:undefined,representativeN60:derived.n60,parameterSources,userOverride:false,consolidationState:'UNKNOWN',...patch}
}
function label(source:{borehole:BoreholeRecord;spt:SptRecord},labs:LaboratoryRecord[]){const d=deriveSptValues(source.borehole,source.spt,labs);return source.borehole.name+' · '+source.spt.depth.toFixed(2)+' m · '+(source.spt.soilCode??'Zemin seçilmedi')+' · N60='+(d.n60!==undefined?d.n60.toFixed(1):'—')}
function color(code:string=''){const c=code.toLowerCase();return c.includes('cl')||c.includes('ci')||c.includes('ch')?'clay':c.includes('si')?'silt':c.includes('gr')?'gravel':c.includes('sa')?'sand':'fill'}

export function IdealizedSoilProfileScreen({boreholes,labs,profile,onChange}:Props){
 const p=useMemo(()=>profile??createEmptyIdealizedProfile(),[profile]), project=useProjectInfo(), spts=useMemo(()=>allSpt(boreholes),[boreholes]), [sel,setSel]=useState(0)
 const layers=p.layers,selected=layers[sel],maxDepth=Math.max(1,...layers.map(x=>x.bottomDepth),Number(project.foundationParameters.footingDepth)||0),units=PROJECT_UNIT_LABELS[project.unitSystem==='ton-m'?'ton':'kN']
 const save=(next:IdealizedSoilLayer[])=>{if(p.status==='SABİTLENDİ')return;onChange({...p,layers:reflow(next),status:'TASLAK',frozenAt:undefined,parameterUnitSystem:'kN-m'})}
 const add=()=>{if(p.status==='SABİTLENDİ'||!spts.length)return;const used=new Set(layers.map(x=>x.sourceSptRecordId));const src=spts.find(x=>!used.has(x.spt.id))??spts[0];const next=[...layers,makeLayer(src,labs,layers.length+1)];setSel(next.length-1);save(next)}
 const remove=()=>{if(p.status==='SABİTLENDİ'||!selected)return;const next=layers.filter((_,i)=>i!==sel);setSel(Math.max(0,Math.min(sel,next.length-1)));save(next)}
 const move=(dir:number)=>{if(p.status==='SABİTLENDİ')return;const j=sel+dir;if(!selected||j<0||j>=layers.length)return;const next=[...layers];[next[sel],next[j]]=[next[j],next[sel]];setSel(j);save(next)}
 const chooseSpt=(i:number,value:string)=>{if(p.status==='SABİTLENDİ')return;const src=spts.find(x=>x.borehole.id+'::'+x.spt.id===value);if(!src)return;const lab=linkedLab(labs,src.borehole.id,src.spt.id,src.spt.depth),patch=labPatch(lab),derived=sptDerived(src,labs);save(layers.map((x,k)=>k!==i?x:{...x,soilName:src.spt.soilDescription??'Zemin tanımı seçilmedi',soilCode:src.spt.soilCode??'',boreholeIds:[src.borehole.id],sptRecordIds:[src.spt.id],laboratoryRecordIds:lab?[lab.id]:[],sourceBoreholeId:src.borehole.id,sourceSptRecordId:src.spt.id,sourceLaboratoryRecordId:lab?.id,representativeSptN:src.spt.n2!=null&&src.spt.n3!=null?src.spt.n2+src.spt.n3:undefined,representativeN60:derived.n60,...clearLab,parameterSources:derived.n60!==undefined?{representativeN60:{type:'SPT_KORELASYONU',sampleIds:[src.spt.id],boreholeIds:[src.borehole.id]}}:{},...patch}))}
 const chooseLab=(i:number,labId:string)=>{if(p.status==='SABİTLENDİ')return;const lab=labId?labs.find(x=>x.id===labId&&hasMeasuredLabData(x)):undefined;const patch=labPatch(lab);save(layers.map((x,k)=>k!==i?x:{...x,sourceLaboratoryRecordId:lab?.id,laboratoryRecordIds:lab?[lab.id]:[],...clearLab,parameterSources:lab?{...x.parameterSources,...Object.fromEntries(Object.keys(patch).filter(key=>(patch as Record<string,unknown>)[key]!=null).map(key=>[key,{type:'LABORATUVAR',sampleIds:[lab.id]}]))}:x.parameterSources,...patch}))}
 const patchLayer=(key:keyof IdealizedSoilLayer,value:number|string|undefined)=>{if(!selected||p.status==='SABİTLENDİ')return;save(layers.map((x,i)=>i===sel?{...x,[key]:value,userOverride:true,parameterSources:{...x.parameterSources,[key]:{type:'KULLANICI',note:'Profil ekranında mühendis tarafından girildi.'}}}:x))}
 const thickness=(i:number,v:string)=>{if(p.status==='SABİTLENDİ')return;save(layers.map((x,k)=>k===i?{...x,thickness:Math.max(0,Number(v)||0)}:x))}
 const freeze=()=>{if(!layers.length||layers.some(x=>!x.sourceSptRecordId||!x.thickness||x.thickness<=0)){window.alert('Her katmana SPT kaydı seçilmeli ve katman kalınlığı 0’dan büyük girilmelidir.');return}onChange({...p,layers:reflow(layers),status:'SABİTLENDİ',frozenAt:new Date().toISOString(),version:p.version+1,parameterUnitSystem:'kN-m'})}
 if(!boreholes.length)return <Frame screen="profile"><div className="empty-state"><strong>Önce sondaj ve SPT verisi girilmelidir.</strong></div></Frame>
 if(!spts.length)return <Frame screen="profile"><div className="empty-state"><strong>İdealize profil için en az bir SPT kaydı gerekir.</strong></div></Frame>
 return <Frame screen="profile">
  <div className="idealized-toolbar"><div><b>İDEALİZE ZEMİN PROFİLİ</b><span>Katmanı kullanıcı oluşturur. SPT kaynağı seçilir, kalınlık kullanıcı tarafından girilir, mühendislik özellikleri uygun laboratuvar deneyinden taşınır. Eksik deney sonucu otomatik korelasyona çevrilmez.</span></div><div className="idealized-actions"><button disabled={p.status==='SABİTLENDİ'} onClick={add}>＋ Katman Ekle</button><button disabled={!selected} onClick={remove}>Sil</button><button disabled={!selected||sel===0} onClick={()=>move(-1)}>↑</button><button disabled={!selected||sel===layers.length-1} onClick={()=>move(1)}>↓</button><button className="primary-button" disabled={!layers.length} onClick={freeze}>Profili Sabitle</button></div></div>
  <Source>Katman mühendislik değerleri profil içinde kN, kPa ve kN/m³ taban birimindedir. c′/φ′ yalnız efektif dayanım testinden, Cu yalnız UU testinden; Es ile M birbirine dönüştürülmeden tutulur.</Source>
  <div className="metric-strip"><Metric label="Durum" value={p.status}/><Metric label="Katman" value={layers.length}/><Metric label="SPT bağlı" value={layers.filter(x=>x.sourceSptRecordId).length}/><Metric label="LAB bağlı" value={layers.filter(x=>x.sourceLaboratoryRecordId).length}/><Metric label="Toplam kalınlık" value={layers.reduce((a,x)=>a+(x.thickness||0),0).toFixed(2)} unit="m"/><Metric label="Eksik kalınlık" value={layers.filter(x=>!x.thickness||x.thickness<=0).length}/></div>
  <div className="profile-render-card"><div className="profile-render-header"><div><b>GELİŞMİŞ MÜHENDİSLİK KESİT MOTORU</b><span>Vektörel teknik kesit · zemin dokusu · SPT · LAB · YASS · temel tabanı</span></div></div><EngineeringSectionRenderer variant="profile" totalDepth={maxDepth} groundwaterDepth={project.soilParameters.groundwaterDepth} foundationDepth={project.foundationParameters.footingDepth} layers={layers.map(x=>({id:x.id,topDepth:x.topDepth,bottomDepth:x.bottomDepth,code:x.soilCode,description:x.soilName,colorClass:color(x.soilCode),sptN:x.representativeN60,gamma:x.gamma,cohesion:x.cohesion,frictionAngle:x.frictionAngle,labId:x.sourceLaboratoryRecordId}))}/></div>
  <Card title="KATMANLAR · SPT KAYNAĞI + LABORATUVAR ÖZELLİKLERİ">
   <div className="profile-layer-editor-head"><span>#</span><span>SPT</span><span>KUYU</span><span>KALINLIK m</span><span>ZEMİN</span><span>LAB</span><span>γ</span><span>c′</span><span>φ′</span><span>Es</span><span>M</span></div>
   <div className="profile-layer-editor">{layers.map((layer,i)=>{const sptKey=layer.sourceBoreholeId&&layer.sourceSptRecordId?layer.sourceBoreholeId+'::'+layer.sourceSptRecordId:'';const labRows=layer.sourceBoreholeId?labs.filter(x=>x.boreholeId===layer.sourceBoreholeId&&hasMeasuredLabData(x)):[];return <div className={i===sel?'profile-layer-row selected':'profile-layer-row'} key={layer.id} onClick={()=>setSel(i)}>
    <b>{i+1}</b><select value={sptKey} disabled={p.status==='SABİTLENDİ'} onChange={e=>chooseSpt(i,e.target.value)}><option value="">SPT seçiniz</option>{spts.map(src=><option key={src.borehole.id+'::'+src.spt.id} value={src.borehole.id+'::'+src.spt.id}>{label(src,labs)}</option>)}</select>
    <span>{layer.sourceBoreholeId?boreholes.find(x=>x.id===layer.sourceBoreholeId)?.name??'—':'—'}</span>
    <input type="number" min="0" step="0.10" placeholder="Giriniz" value={layer.thickness&&layer.thickness>0?layer.thickness:''} disabled={p.status==='SABİTLENDİ'} onChange={e=>thickness(i,e.target.value)}/>
    <span className="profile-layer-soil"><b>{layer.soilCode||'—'}</b><small>{layer.soilName}</small></span>
    <select value={layer.sourceLaboratoryRecordId??''} disabled={p.status==='SABİTLENDİ'} onChange={e=>chooseLab(i,e.target.value)}><option value="">LAB seçiniz</option>{labRows.map(x=><option key={x.id} value={x.id}>{x.sampleId} · {x.depth.toFixed(2)} m</option>)}</select>
    <span>{layer.gamma==null?'—':unitWeightFromBase(layer.gamma,project.unitSystem).toFixed(2)}</span><span>{layer.cohesion==null?'—':stressFromBase(layer.cohesion,project.unitSystem).toFixed(2)}</span><span>{layer.frictionAngle==null?'—':layer.frictionAngle.toFixed(2)}</span><span>{layer.elasticModulus==null?'—':modulusFromBase(layer.elasticModulus,project.unitSystem).toFixed(1)}</span><span>{layer.constrainedModulus==null?'—':modulusFromBase(layer.constrainedModulus,project.unitSystem).toFixed(1)}</span>
   </div>})}</div>
   {!layers.length&&<div className="inline-empty">“Katman Ekle” ile SPT kaynağı seçerek başlayın.</div>}
  </Card>
  {selected&&<div className="dashboard-grid"><Card title={'SEÇİLİ KATMAN · '+selected.order}><div className="profile-selected-properties">
    <div><b>Derinlik</b><span>{selected.topDepth.toFixed(2)} – {selected.bottomDepth.toFixed(2)} m</span></div><div><b>Kalınlık</b><span>{(selected.thickness||0).toFixed(2)} m</span></div><div><b>SPT</b><span>{selected.sourceSptRecordId?'Bağlı':'Seçilmedi'}</span></div><div><b>LAB</b><span>{selected.sourceLaboratoryRecordId?'Bağlı':'Bağlı değil'}</span></div>
    <div><b>γ</b><span>{selected.gamma==null?'—':unitWeightFromBase(selected.gamma,project.unitSystem).toFixed(2)+' '+units.unitWeight}</span></div><div><b>c′</b><span>{selected.cohesion==null?'—':stressFromBase(selected.cohesion,project.unitSystem).toFixed(2)+' '+units.stress}</span></div><div><b>φ′</b><span>{selected.frictionAngle==null?'—':selected.frictionAngle.toFixed(2)+'°'}</span></div><div><b>Cu</b><span>{selected.undrainedCohesion==null?'—':stressFromBase(selected.undrainedCohesion,project.unitSystem).toFixed(2)+' '+units.stress}</span></div>
    <div><b>Cc</b><span>{n(selected.compressionIndexCc)}</span></div><div><b>e₀</b><span>{n(selected.initialVoidRatio)}</span></div><div><b>Es</b><span>{selected.elasticModulus==null?'—':modulusFromBase(selected.elasticModulus,project.unitSystem).toFixed(1)+' '+units.modulus}</span></div><div><b>M</b><span>{selected.constrainedModulus==null?'—':modulusFromBase(selected.constrainedModulus,project.unitSystem).toFixed(1)+' '+units.modulus}</span></div><div><b>Konsolidasyon</b><span>{selected.consolidationState??'UNKNOWN'}</span></div>
    </div>
    <div className="form-grid" style={{marginTop:16}}>
      <label>Konsolidasyon durumu<select value={selected.consolidationState??'UNKNOWN'} disabled={p.status==='SABİTLENDİ'} onChange={e=>patchLayer('consolidationState',e.target.value as 'NC'|'OC'|'UNKNOWN')}><option value="UNKNOWN">Bilinmiyor</option><option value="NC">NC</option><option value="OC">OC</option></select></label>
      <Field label={'Es ('+units.modulus+')'} value={selected.elasticModulus==null?'':modulusFromBase(selected.elasticModulus,project.unitSystem)} onChange={v=>patchLayer('elasticModulus',v===''?undefined:modulusToBase(Number(v),project.unitSystem))}/>
      <Field label={'M / Ödometre ('+units.modulus+')'} value={selected.constrainedModulus==null?'':modulusFromBase(selected.constrainedModulus,project.unitSystem)} onChange={v=>patchLayer('constrainedModulus',v===''?undefined:modulusToBase(Number(v),project.unitSystem))}/>
      <Field label={'c′ ('+units.stress+')'} value={selected.cohesion==null?'':stressFromBase(selected.cohesion,project.unitSystem)} onChange={v=>patchLayer('cohesion',v===''?undefined:stressToBase(Number(v),project.unitSystem))}/>
      <Field label="φ′ (°)" value={selected.frictionAngle??''} onChange={v=>patchLayer('frictionAngle',v===''?undefined:Number(v))}/>
      <Field label={'Cu ('+units.stress+')'} value={selected.undrainedCohesion==null?'':stressFromBase(selected.undrainedCohesion,project.unitSystem)} onChange={v=>patchLayer('undrainedCohesion',v===''?undefined:stressToBase(Number(v),project.unitSystem))}/>
      <Field label="Janbu m" value={selected.janbuModulusNumber??''} onChange={v=>patchLayer('janbuModulusNumber',v===''?undefined:Number(v))}/>
      <Field label="Janbu a (0–1)" value={selected.janbuStressExponent??''} onChange={v=>patchLayer('janbuStressExponent',v===''?undefined:Number(v))}/>
      <Field label={'σ′c ('+units.stress+')'} value={selected.preconsolidationPressure==null?'':stressFromBase(selected.preconsolidationPressure,project.unitSystem)} onChange={v=>patchLayer('preconsolidationPressure',v===''?undefined:stressToBase(Number(v),project.unitSystem))}/>
    </div>
  </Card><Card title="PARAMETRE KAYNAĞI"><div className="engineering-note">LAB seçimi yalnız gerçek ölçüm içeren numunelerden yapılır. LAB boşsa c′/φ′, Es, M veya Cu otomatik olarak SPT’den türetilmez. Profil ekranındaki elle girilen değerler KULLANICI kaynağı olarak işaretlenir.</div></Card></div>}
 </Frame>
}
export default IdealizedSoilProfileScreen
