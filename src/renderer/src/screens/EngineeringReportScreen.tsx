import { useMemo, type ReactNode } from 'react'
import { useProjectInfo } from '../../../core/state/project-store'
import { forceToBase, forceFromBase, momentToBase, stressToBase, unitWeightToBase } from '../../../core/units/project-units'
import { tbdyBearingCapacity, foundationChecks } from '../../../core/calculations/engineering'
import { calculateIdealizedSettlement, type IdealizedSettlementMethod } from '../../../core/engineering/idealized-settlement-engine'
import { liquefactionProfile, type LiquefactionSptRecord } from '../../../core/engineering/liquefaction/liquefaction-profile'
import { deriveSptValues } from '../../../core/engineering/field-calculations'
import { jetGroutEngineering } from '../../../core/engineering/jet-grout-advanced'
import type { BoreholeRecord, LaboratoryRecord } from '../../../core/models/field-data'
import type { IdealizedSoilProfile } from '../../../core/models/idealized-soil-profile'
import { Frame } from '../workspace/WorkspaceShell'
import './engineering-report.css'

type Props={boreholes:BoreholeRecord[];labs:LaboratoryRecord[];profile?:IdealizedSoilProfile}
const fmt=(v:number|undefined,d=2)=>v==null||!Number.isFinite(v)?'—':v.toFixed(d)

function Section({title,children,landscape=false}:{title:string;children:ReactNode;landscape?:boolean}){
  return <section className={'report-page '+(landscape?'report-landscape':'report-portrait')}>
    <div className="report-section-title"><span>FALUZMN</span><div><small>GEOTEKNİK HESAP</small><h2>{title}</h2></div></div>{children}
  </section>
}
function Table({head,children}:{head:string[];children:ReactNode}){
  return <div className="report-table-wrap"><table className="report-table"><thead><tr>{head.map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}
function info(label:string,value:string){return <div className="report-note"><b>{label}:</b> {value}</div>}

export default function EngineeringReportScreen({boreholes,labs,profile}:Props){
  const p=useProjectInfo(),f=p.foundationParameters,soil=p.soilParameters
  const B=f.footingWidth,L=f.footingLength,Df=f.footingDepth
  const N=forceToBase(f.structuralWeight,p.unitSystem),Vx=forceToBase(f.vtX,p.unitSystem),Vy=forceToBase(f.vtY,p.unitSystem),H=Math.hypot(Vx,Vy),Mx=momentToBase(f.momentX,p.unitSystem),My=momentToBase(f.momentY,p.unitSystem)
  const sds=p.seismic.sds
  const bearing=useMemo(()=>{
    if(!(B>0&&L>0&&Df>=0&&N>=0&&soil.unitWeight>0))return undefined
    try{return tbdyBearingCapacity({
      B,L,Df,gamma1:unitWeightToBase(soil.unitWeight,p.unitSystem),gamma2:unitWeightToBase(soil.saturatedUnitWeight,p.unitSystem),
      c:stressToBase(soil.cohesion,p.unitSystem),phi:soil.frictionAngle,verticalLoad:N,horizontalLoad:H,momentX:Mx,momentY:My,
      groundSlope:soil.surfaceSlope,baseSlope:soil.foundationBaseSlope,resistanceFactor:1.4,foundationType:f.foundationType,
      groundwaterDepth:soil.groundwaterDepth,undrainedCu:soil.undrainedCohesion,
      layers:profile?.layers.map(x=>({topDepth:x.topDepth,bottomDepth:x.bottomDepth,gamma:unitWeightToBase(x.gamma??soil.unitWeight,p.unitSystem),gammaSat:unitWeightToBase(x.gammaSat??x.gamma??soil.saturatedUnitWeight,p.unitSystem),cohesion:stressToBase(x.cohesion??soil.cohesion,p.unitSystem),phi:x.frictionAngle??soil.frictionAngle}))
    })}catch{return undefined}
  },[B,L,Df,N,H,Mx,My,soil,p,profile,f.foundationType])

  const settlementMethods:IdealizedSettlementMethod[]=['burland-burbidge','elasticity','2to1-layer','janbu','schmertmann']
  const settlements=useMemo(()=>{
    if(!profile||profile.status!=='SABİTLENDİ'||!(B>0&&L>0&&Df>=0&&N>0))return []
    return settlementMethods.map(method=>{
      const result=calculateIdealizedSettlement({profile,method,B,L,Df,qGross:N/(B*L),groundwaterDepth:soil.groundwaterDepth??(boreholes.length===1?boreholes[0].groundwaterDepth:undefined)})
      return{method,result}
    })
  },[profile,B,L,Df,N,boreholes])
  const jetGrout=useMemo(()=>{
    const j=p.jetGrout
    if(!(j.columnDiameter&&j.columnDiameter>0&&j.spacing&&j.spacing>0&&j.qSoil&&j.qSoil>0&&j.qColumn&&j.qColumn>0))return undefined
    return jetGroutEngineering({
      columnDiameter:j.columnDiameter,spacing:j.spacing,layout:j.layout??'square',
      qSoil:j.qSoil,qColumn:j.qColumn,cSoil:j.cSoil,cColumn:j.cColumn,EsSoil:j.EsSoil,EsColumn:j.EsColumn,
      load:N>0?N:undefined,foundationArea:B>0&&L>0?B*L:undefined,foundationThickness:j.foundationThickness,
      columnFrictionAngle:j.columnFrictionAngle,cohesion:j.interfaceCohesion,frictionAngle:j.interfaceFrictionAngle,
      verticalLoad:N,horizontalLoad:H
    })
  },[p.jetGrout,N,B,L,H])
  const foundation=useMemo(()=>B>0&&L>0?foundationChecks({
    B,L,N,Vx,Vy,Mx,My,deltaTan:f.baseFrictionTanDelta,cu:soil.undrainedCohesion,
    area:undefined,groundwaterDepth:soil.groundwaterDepth,foundationDepth:Df,
    passiveResistanceCharacteristic:forceToBase(f.passiveResistanceCharacteristic,p.unitSystem),usePassiveResistance:f.usePassiveResistance
  }):undefined,[B,L,N,Vx,Vy,Mx,My,f,soil,p.unitSystem,Df])

  const liquidations=useMemo(()=>{
    return boreholes.map(b=>{
      if(b.groundwaterDepth==null||sds==null||p.seismic.magnitude==null)return{borehole:b,result:undefined}
      const rows:LiquefactionSptRecord[]=b.spt.filter(x=>x.testType==='SPT'&&Number.isFinite(x.n2)&&Number.isFinite(x.n3)).map(x=>{
        const lab=labs.filter(y=>y.boreholeId===b.id&&x.depth>=y.depth&&x.depth<=(y.depthTo??y.depth+.5)).sort((a,c)=>Math.abs(a.depth-x.depth)-Math.abs(c.depth-x.depth))[0]
        const layer=b.lithology.find(y=>x.depth>=y.from&&x.depth<y.to)
        const cfg=x.correction??{}
        return{depth:x.depth,nField:x.n2!+x.n3!,soil:x.soilCode??layer?.code,
          fineContent:cfg.fineContent??lab?.finesContent??lab?.sieve200Passing??layer?.finesContent,
          plasticityIndex:lab?.plasticityIndex??(lab?.liquidLimit!=null&&lab?.plasticLimit!=null?lab.liquidLimit-lab.plasticLimit:undefined)??layer?.plasticityIndex,
          clayContent:lab?.hydrometer002,waterContent:lab?.waterContent,energyRatio:cfg.energyRatio,hammerType:cfg.hammerType,
          boreholeDiameterMm:b.drillingDiameter,sampler:cfg.sampler,samplerCorrection:cfg.samplerCorrection,rodLengthM:cfg.rodLengthM}
      })
      return{borehole:b,result:rows.length?liquefactionProfile({
        Mw:p.seismic.magnitude!,Sds:sds,gwt:b.groundwaterDepth,layers:b.lithology.map(x=>({top:x.from,bottom:x.to,gamma:x.unitWeight??0,gammaSat:x.saturatedUnitWeight??x.unitWeight??0,soil:x.code,finesContent:x.finesContent,plasticityIndex:x.plasticityIndex})),
        spt:rows,dts:p.seismic.dts,soilGroup:p.geophysical.soilGroup,continuousOrThickLens:p.soilParameters.liquefactionContinuousOrThickLens,foundationDepth:p.foundationParameters.footingDepth
      }):undefined}
    })
  },[boreholes,labs,p.seismic.magnitude,p.seismic.dts,sds])

  const sptRows=boreholes.flatMap(b=>b.spt.filter(x=>x.testType==='SPT'&&Number.isFinite(x.n2)&&Number.isFinite(x.n3)).map(x=>({borehole:b,record:x,derived:deriveSptValues(b,x,labs)})))
  const exportCsv=()=>{
    const rows=[['Bölüm','Parametre','Değer'],['Proje','Ad',p.title],['Taşıma','TBDY qk',bearing?String(bearing.value.qk):''],['Taşıma','TBDY qt',bearing?String(bearing.value.qt):''],
      ...settlements.map(x=>['Oturma',x.method,String(x.result.totalSettlement)]),['Kayma','X kullanım',foundation?String(foundation.slidingUtilizationX):''],['Kayma','Y kullanım',foundation?String(foundation.slidingUtilizationY):'']]
    const blob=new Blob([rows.map(r=>r.map(x=>'\"'+String(x).replaceAll('\"','\"\"')+'\"').join(',')).join('\\n')],{type:'text/csv;charset=utf-8'})
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(p.projectNo||'FALUZMN')+'_hesap_raporu.csv';a.click();URL.revokeObjectURL(a.href)
  }
  const print=async()=>{document.body.classList.add('print-report-only');try{await window.api.report.print()}finally{document.body.classList.remove('print-report-only')}}
  const pdf=async()=>{document.body.classList.add('print-report-only');try{await window.api.report.exportPdf()}finally{document.body.classList.remove('print-report-only')}}

  return <Frame screen="report">
    <div className="report-toolbar"><div><b>MÜHENDİSLİK HESAP RAPORU</b><span>Tüm özetler ortak hesap motorlarından üretilir.</span></div><div><button onClick={exportCsv}>CSV</button><button onClick={print}>Yazdır</button><button onClick={pdf}>PDF</button></div></div>
    <article className="report-document">
      <Section title="Proje ve tasarım girdileri">
        <div className="report-info-grid">
          <div><b>Proje</b><span>{p.title||'—'}</span></div><div><b>İl / İlçe</b><span>{p.province||'—'} / {p.district||'—'}</span></div>
          <div><b>Vs30 / Zemin</b><span>{fmt(p.geophysical.vs30,0)} m/s · {p.geophysical.soilGroup||'—'}</span></div><div><b>DTS</b><span>{p.seismic.dts||'—'}</span></div>
          <div><b>Temel</b><span>{B.toFixed(3)} × {L.toFixed(3)} m · Df={Df.toFixed(3)} m</span></div><div><b>G+Q</b><span>{fmt(forceFromBase(N,p.unitSystem))} {p.unitSystem==='ton-m'?'tonf':'kN'}</span></div>
          <div><b>Vtx / Vty</b><span>{fmt(f.vtX)} / {fmt(f.vtY)}</span></div><div><b>Mx / My</b><span>{fmt(f.momentX)} / {fmt(f.momentY)}</span></div>
        </div>
        {info('TBDY kapsamı','Zemin grubu, DTS, YASS ve temel yükleri ayrı veri kaynakları olarak izlenir.')}{p.geophysical.soilGroup==='ZF'&&!p.geophysical.siteSpecificResponseAnalysisCompleted&&info('ZF uyarısı','TBDY 16.5.1.3 gereği sahaya özel zemin davranış analizi tamamlanmadan bu rapor nihai ZF tasarım girdisi olarak kabul edilmemelidir.')}
      </Section>

      <Section title="SPT düzeltmeleri">
        <Table head={['Sondaj','z (m)','N','Ce','Cb','Cs','Cr','N60','CN','(N1)60']}>
          {sptRows.map(x=><tr key={x.record.id}><td>{x.borehole.name}</td><td>{fmt(x.record.depth)}</td><td>{fmt(x.derived.nField,0)}</td><td>{fmt(x.derived.ce)}</td><td>{fmt(x.derived.cb)}</td><td>{fmt(x.derived.cs)}</td><td>{fmt(x.derived.cr)}</td><td>{fmt(x.derived.n60)}</td><td>{fmt(x.derived.cn)}</td><td>{fmt(x.derived.n1_60)}</td></tr>)}
        </Table>
        {info('Kaynak','TBDY 2018 Ek 16B.2; merkezi SPT motoru kullanılır.')}
      </Section>

      <Section title="TBDY yüzeysel temel taşıma gücü">
        {bearing?<><Table head={['Adım','Değer','Birim / açıklama']}>
          {bearing.steps.map((s,i)=><tr key={i}><td>{s.symbol}</td><td>{fmt(s.value,4)}</td><td>{s.unit||s.title}</td></tr>)}
        </Table><div className="report-metrics"><div><span>qk</span><b>{fmt(bearing.value.qk,2)} kPa</b></div><div><span>qt</span><b>{fmt(bearing.value.qt,2)} kPa</b></div><div><span>q0</span><b>{fmt(bearing.value.qo,2)} kPa</b></div><div><span>Kullanım</span><b>{fmt(bearing.value.utilization,3)}</b></div></div>{info('Notlar',bearing.warnings.join(' ')||'Yok')}</>:info('Sonuç','Taşıma gücü için geçerli temel/zemin/yük girdileri yok.')}
      </Section>

      <Section title="Oturma — tüm ortak yöntemlerin karşılaştırılması">
        {settlements.length?<Table head={['Yöntem','Ani oturma (mm)','Konsolidasyon (mm)','Toplam (mm)','Durum']}>
          {settlements.map(x=><tr key={x.method}><td>{x.method}</td><td>{fmt(x.result.totalImmediate,2)}</td><td>{fmt(x.result.totalConsolidation,2)}</td><td><b>{fmt(x.result.totalSettlement,2)}</b></td><td>{x.result.ready?'HESAPLANDI':'VERİ EKSİK'}</td></tr>)}
        </Table>:info('Sonuç','İdealize profil SABİTLENDİ değil veya temel/yük girdileri eksik.')}
        {settlements.map(x=><div className="report-note" key={x.method}><b>{x.method}:</b> {x.result.warnings.join(' ')||'Ek uyarı yok.'}</div>)}
      </Section>

      <Section title="Temel tabanında yatay kayma · TBDY 16.8.4">
        {foundation?<><Table head={['Kontrol','Tasarım etki','Tasarım direnç','Oran','Durum']}>
          <tr><td>X</td><td>{fmt(Vx,2)} kN</td><td>{fmt(foundation.slidingCapacityX,2)} kN</td><td>{fmt(foundation.slidingUtilizationX,3)}</td><td>{foundation.evaluable&&foundation.slidingSafeX?'YETERLİ':'KONTROL GEREKLİ'}</td></tr>
          <tr><td>Y</td><td>{fmt(Vy,2)} kN</td><td>{fmt(foundation.slidingCapacityY,2)} kN</td><td>{fmt(foundation.slidingUtilizationY,3)}</td><td>{foundation.evaluable&&foundation.slidingSafeY?'YETERLİ':'KONTROL GEREKLİ'}</td></tr>
        </Table>{info('Direnç modu',foundation.slidingMode+' · Rpt='+fmt(foundation.passiveResistanceDesign,2)+' kN')}{info('Uyarılar',foundation.warnings.join(' ')||'Yok')}</>:info('Sonuç','Temel geometrisi/yük verisi eksik.')}
      </Section>

      {liquidations.map(({borehole,result})=><Section key={borehole.id} title={'Sıvılaşma · '+borehole.name} landscape>
        {result?<><div className="report-metrics"><div><span>DTS</span><b>{p.seismic.dts||'—'}</b></div><div><span>YASS</span><b>{fmt(borehole.groundwaterDepth)} m</b></div><div><span>Zorunluluk</span><b>{result.mandatoryByProject?'EVET':'Koşula bağlı'}</b></div></div>
          <Table head={['z','Zemin','FC%','PI','σ′v','N60','(N1)60','(N1)60f','CRR7.5','FS','Sonuç']}>
            {result.rows.map((r,i)=><tr key={i}><td>{fmt(r.depth)}</td><td>{r.soil||'—'}</td><td>{fmt(r.fineContent,1)}</td><td>{fmt(r.plasticityIndex,1)}</td><td>{fmt(r.sigmaVPrime,1)}</td><td>{fmt(r.n60)}</td><td>{fmt(r.n1_60)}</td><td>{fmt(r.n1_60f)}</td><td>{fmt(r.crrM75,3)}</td><td>{fmt(r.FS,3)}</td><td>{r.conclusion}</td></tr>)}
          </Table>{info('Uyarılar',result.warnings.join(' ')||'Yok')}</>:info('Sonuç','Bu sondaj için YASS/SDS/Mw veya SPT verisi eksik.')}
      </Section>)}

      <Section title="Jet Grout">
        {jetGrout?<>
          <div className="report-metrics"><div><span>Alan oranı</span><b>{fmt(jetGrout.areaReplacementRatio*100,2)} %</b></div><div><span>Ecomp</span><b>{fmt(jetGrout.compositeModulus,1)} kPa</b></div><div><span>Kolon yük payı</span><b>{fmt(jetGrout.columnLoadShare*100,1)} %</b></div><div><span>FS</span><b>{fmt(jetGrout.capacityFS,2)}</b></div></div>
          {info('Kaynak notu',jetGrout.sourceNote)}
        </>:info('Sonuç','Jet Grout girişleri tamamlanmadan sonuç üretilmez.')}
      </Section>

      <Section title="Yönetmelik ve yöntem notları">
        {info('TBDY 2018','Bölüm 16.6 sıvılaşma; 16.7–16.8 temel tasarımı, taşıma gücü ve yatayda kayma; Ek 16B SPT tabanlı sıvılaşma.')}
        {info('Veri yeterliliği','Eksik mühendislik parametreleri için sessiz varsayım yapılmaz; hesap durumu VERİ EKSİK olarak gösterilir.')}
        {info('Nihai tasarım','Zemin iyileştirme, ZF saha davranışı, sıvılaşma sonrası deformasyon ve özel tabakalı-zemin mekanizmaları proje deneyleri ve yetkili mühendislik değerlendirmesiyle doğrulanmalıdır.')}
      </Section>
    </article>
  </Frame>
}
