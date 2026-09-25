import { useMemo, useState } from 'react'
import { foundationChecks } from '../../core/calculations/engineering'
import { liquefactionProfile, type LiquefactionSptRecord } from '../../core/engineering/liquefaction/liquefaction-profile'
import { useProjectInfo } from '../../core/state/project-store'
import type { BoreholeRecord, LaboratoryRecord } from '../../core/models/field-data'
import { forceToBase, momentToBase } from '../../core/units/project-units'
import { Card, Frame, Metric, Source, type ScreenId } from '../workspace/WorkspaceShell'
import { CalculationTrace } from '../components/CalculationTrace'

export const SOURCE_NOTES={
  investigation:'TBDY 2018 Bölüm 16 ve Ek 16A.',
  liquefaction:'TBDY 2018 Bölüm 16.6 ve Ek 16B.',
  bearing:'TBDY 2018 Bölüm 16.8.2–16.8.3.',
  settlement:'TBDY 2018 Bölüm 16.7.3.4 ve 16.8.3.4.',
  foundation:'TBDY 2018 16.7.3.3 ve 16.8.4; γRv=1.40, γRh=1.10, γRp=1.40.',
  jetGroutAdvanced:'Jet Grout kompozit yaklaşımı; proje deneyleri ve kalite kontrol ile doğrulanmalıdır.'
}

export function Dashboard({onNavigate}:{onNavigate:(id:ScreenId)=>void}){
  const p=useProjectInfo()
  const items:[string,string,ScreenId][]=[
    ['01','Proje bilgileri','project-info'],['02','Sondaj / SPT / Laboratuvar','field'],['03','Sondaj logları','borehole-log'],['04','Zemin profili','profile'],
    ['05','Taşıma gücü','bearing-capacity'],['06','Oturma','settlement'],['07','Sıvılaşma','liquefaction'],['08','Temel tasarımı','foundation'],['09','Jet Grout','jet-grout'],['10','Mühendislik raporu','report']
  ]
  return <Frame screen="dashboard">
    <div className="dashboard-grid">
      <Card title="PROJE DURUMU"><div className="form-grid"><Metric label="Proje" value={p.title||'Yeni Proje'}/><Metric label="Birim" value={p.unitSystem}/><Metric label="Vs30" value={p.geophysical.vs30??'—'}/><Metric label="Zemin grubu" value={p.geophysical.soilGroup??'—'}/><Metric label="DTS" value={p.seismic.dts??'—'}/></div></Card>
      <Card title="MÜHENDİSLİK İŞ AKIŞI"><div className="workflow">{items.map(([n,label,id])=><button key={id} onClick={()=>onNavigate(id)}><b>{n}</b><span>{label}</span></button>)}</div></Card>
    </div>
  </Frame>
}

export function Liquefaction({boreholes=[],labs=[]}:{boreholes?:BoreholeRecord[];labs?:LaboratoryRecord[]}){
  const p=useProjectInfo()
  const [selected,setSelected]=useState(boreholes[0]?.id??'')
  const b=boreholes.find(x=>x.id===selected)??boreholes[0]
  const sds=p.seismic.sds
  const validSpt=useMemo(()=>b?[...b.spt].filter(x=>x.testType==='SPT'&&Number.isFinite(x.n2)&&Number.isFinite(x.n3)).sort((a,c)=>a.depth-c.depth):[],[b])
  const profileInput=useMemo(()=>{
    if(!b||b.groundwaterDepth==null||sds==null||p.seismic.magnitude==null||validSpt.length===0)return undefined
    const rows:LiquefactionSptRecord[]=validSpt.map(record=>{
      const lab=labs.filter(x=>x.boreholeId===b.id).filter(x=>record.depth>=x.depth&&record.depth<=(x.depthTo??x.depth+.5)).sort((x,y)=>Math.abs(x.depth-record.depth)-Math.abs(y.depth-record.depth))[0]
      const layer=b.lithology.find(x=>record.depth>=x.from&&record.depth<x.to)
      const cfg=record.correction??{}
      return{
        depth:record.depth,nField:record.n2!+record.n3!,soil:record.soilCode??layer?.code,
        fineContent:cfg.fineContent??lab?.finesContent??lab?.sieve200Passing??layer?.finesContent,
        plasticityIndex:lab?.plasticityIndex??(lab?.liquidLimit!=null&&lab?.plasticLimit!=null?lab.liquidLimit-lab.plasticLimit:undefined)??layer?.plasticityIndex,
        clayContent:lab?.hydrometer002,
        waterContent:lab?.waterContent,
        energyRatio:cfg.energyRatio,hammerType:cfg.hammerType,boreholeDiameterMm:b.drillingDiameter,
        sampler:cfg.sampler,samplerCorrection:cfg.samplerCorrection,rodLengthM:cfg.rodLengthM
      }
    })
    return liquefactionProfile({
      Mw:p.seismic.magnitude,Sds:sds,gwt:b.groundwaterDepth,layers:b.lithology.map(l=>({top:l.from,bottom:l.to,gamma:l.unitWeight??0,gammaSat:l.saturatedUnitWeight??l.unitWeight??0,soil:l.code,finesContent:l.finesContent,plasticityIndex:l.plasticityIndex})),
      spt:rows,dts:p.seismic.dts,soilGroup:p.geophysical.soilGroup
    })
  },[b,labs,p.seismic.magnitude,p.seismic.dts,sds,validSpt])

  return <Frame screen="liquefaction">
    <Source>{SOURCE_NOTES.liquefaction} 16.6.1 kapsam koşulları, 16.6.2–16.6.6 tetiklenme koşulları ve Ek 16B hesabı aynı sonuç zincirinde gösterilir.</Source>
    {!b?<Card title="SONDAJ GEREKLİ"><div className="inline-empty">Sıvılaşma için sondaj ve SPT verisi gerekir.</div></Card>:
      <><Card title="HESAP KAPSAMI"><div className="form-grid"><label>Sondaj<select value={b.id} onChange={e=>setSelected(e.target.value)}>{boreholes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><Metric label="DTS" value={p.seismic.dts??'—'}/><Metric label="SDS" value={sds?.toFixed(3)??'—'}/><Metric label="Mw" value={p.seismic.magnitude??'—'}/><Metric label="YASS" value={b.groundwaterDepth??'—'}/><Metric label="SPT" value={validSpt.length}/></div></Card>
        {!profileInput?
          <Card title="HESAP İÇİN EKSİK VERİ"><div className="inline-empty">YASS, SDS, Mw ve geçerli SPT kayıtları birlikte bulunmalıdır. YASS bilinmiyorsa 16.6.2 kapsamında sıvılaşma değerlendirmesi başlatılmaz.</div></Card>:
          <><div className="metric-strip"><Metric label="TBDY zorunluluğu" value={profileInput.mandatoryByProject?'EVET':'DTS/zemin koşuluna bağlı'}/><Metric label="Post-liquefaction" value={profileInput.postLiquefactionRequired?'GEREKLİ':'Tetiklenmedi'}/></div>
            {profileInput.warnings.length>0&&<Card title="TBDY UYARILARI"><div className="inline-empty">{profileInput.warnings.join(' ')}</div></Card>}
            <Card title="SPT · SIVILAŞMA DERİNLİK TABLOSU"><div className="table-wrap"><table><thead><tr><th>z</th><th>Zemin</th><th>FC%</th><th>PI</th><th>σ′v</th><th>N60</th><th>(N1)60</th><th>(N1)60f</th><th>CRR7.5</th><th>CSR</th><th>FS</th><th>Durum</th></tr></thead><tbody>{profileInput.rows.map((row,i)=><tr key={i}><td>{row.depth.toFixed(2)}</td><td>{row.soil??'—'}</td><td>{row.fineContent?.toFixed(1)??'—'}</td><td>{row.plasticityIndex?.toFixed(1)??'—'}</td><td>{row.sigmaVPrime.toFixed(2)}</td><td>{row.n60.toFixed(2)}</td><td>{row.n1_60.toFixed(2)}</td><td>{row.n1_60f.toFixed(2)}</td><td>{row.crrM75?.toFixed(4)??'—'}</td><td>{row.tauEarthquake?.toFixed(2)??'—'}</td><td>{row.FS?.toFixed(3)??'—'}</td><td>{row.status}</td></tr>)}</tbody></table></div></Card>
            {profileInput.rows.length>0&&<CalculationTrace title="İlk SPT hesap izi" source={profileInput.source} rows={profileInput.rows[0].trace}/>}
          </>}
      </>}
  </Frame>
}

export function Foundation(){
  const p=useProjectInfo(),f=p.foundationParameters,soil=p.soilParameters
  const N=forceToBase(f.structuralWeight,p.unitSystem),Vx=forceToBase(f.vtX,p.unitSystem),Vy=forceToBase(f.vtY,p.unitSystem),Mx=momentToBase(f.momentX,p.unitSystem),My=momentToBase(f.momentY,p.unitSystem)
  const ready=f.footingWidth>0&&f.footingLength>0&&N>=0
  const r=ready?foundationChecks({
    B:f.footingWidth,L:f.footingLength,N,Vx,Vy,Mx,My,
    deltaTan:f.baseFrictionTanDelta,cu:soil.undrainedCohesion,groundwaterDepth:soil.groundwaterDepth,foundationDepth:f.footingDepth,
    passiveResistanceCharacteristic:forceToBase(f.passiveResistanceCharacteristic,p.unitSystem),usePassiveResistance:f.usePassiveResistance
  }):undefined
  return <Frame screen="foundation"><Source>{SOURCE_NOTES.foundation} TBDY 16.8.4 yatay kayma kontrolü; 16.8.4.6 YASS altında depremde Cu yaklaşımı uygulanır.</Source>
    {!r?<Card title="TEMEL VERİSİ BEKLENİYOR"><div className="inline-empty">B, L ve yapı yükü girilmelidir.</div></Card>:
      <><div className="metric-strip"><Metric label="B" value={f.footingWidth.toFixed(2)} unit="m"/><Metric label="L" value={f.footingLength.toFixed(2)} unit="m"/><Metric label="Vtx" value={Vx.toFixed(2)} unit="kN"/><Metric label="Vty" value={Vy.toFixed(2)} unit="kN"/><Metric label="Rth+0.3Rpt" value={r.slidingCapacityX.toFixed(2)} unit="kN"/><Metric label="Durum" value={r.evaluable&&r.slidingSafeX&&r.slidingSafeY?'YETERLİ':'KONTROL GEREKLİ'}/></div>
        <Card title="TBDY 2018 16.8.4"><div className="table-wrap"><table><thead><tr><th>Kontrol</th><th>Değer</th><th>Oran</th><th>Durum</th></tr></thead><tbody><tr><td>X</td><td>{Vx.toFixed(2)} / {r.slidingCapacityX.toFixed(2)}</td><td>{r.slidingUtilizationX.toFixed(3)}</td><td>{r.evaluable&&r.slidingSafeX?'YETERLİ':'YETERSİZ/EKSİK'}</td></tr><tr><td>Y</td><td>{Vy.toFixed(2)} / {r.slidingCapacityY.toFixed(2)}</td><td>{r.slidingUtilizationY.toFixed(3)}</td><td>{r.evaluable&&r.slidingSafeY?'YETERLİ':'YETERSİZ/EKSİK'}</td></tr></tbody></table></div><div className="engineering-note">Rth={r.slidingCapacityX.toFixed(2)} kN · Rpt={r.passiveResistanceDesign.toFixed(2)} kN · mod={r.slidingMode}</div></Card>
        {r.warnings.length>0&&<Card title="UYARILAR"><div className="inline-empty">{r.warnings.join(' ')}</div></Card>}</>}
  </Frame>
}

export function Settlement(){
  return <Frame screen="settlement"><Card title="OTURMA"><div className="inline-empty">Oturma hesabı İdealize Zemin Profili ekranındaki ortak oturma motorundan yürütülür.</div></Card></Frame>
}

export function JetGrout(){
  return <Frame screen="jet-grout"><Card title="JET GROUT"><div className="inline-empty">Jet Grout ileri tasarım ekranını kullanın.</div></Card></Frame>
}
