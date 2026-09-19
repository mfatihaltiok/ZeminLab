import { useMemo, useState } from 'react'
import { jetGroutEngineering, type JetGroutEngineeringResult } from '../../../core/engineering/jet-grout-advanced'
import { Card, Field, Frame, Metric, Source } from '../workspace/WorkspaceShell'
import { useProjectInfo } from '../../../core/state/project-store'
import { forceToBase } from '../../../core/units/project-units'
import { CalculationTrace } from '../components/CalculationTrace'

export let latestJetGroutResult: JetGroutEngineeringResult | undefined

export function JetGroutEngineeringScreen() {
  const p=useProjectInfo(); const f=p.foundationParameters
  const projectArea=Math.max(0,f.footingWidth*f.footingLength); const projectLoad=forceToBase(f.structuralWeight,p.unitSystem); const projectH=Math.hypot(forceToBase(f.vtX,p.unitSystem),forceToBase(f.vtY,p.unitSystem))
  const [d,setD]=useState('0.8'), [spacing,setSpacing]=useState('1.5'), [soil,setSoil]=useState('150'), [column,setColumn]=useState('2000')
  const [soilEs,setSoilEs]=useState('5000'), [columnEs,setColumnEs]=useState('100000'), [soilC,setSoilC]=useState('10'), [columnC,setColumnC]=useState('2000')
  const [thickness,setThickness]=useState('5'), [phi,setPhi]=useState('40'), [c,setC]=useState('10'), [angle,setAngle]=useState('30')
  const [layout,setLayout]=useState<'square'|'triangular'>('square')
  const r=useMemo(()=>jetGroutEngineering({
    columnDiameter:Number(d), spacing:Number(spacing), layout,
    qSoil:Number(soil), qColumn:Number(column),
    cSoil:Number(soilC), cColumn:Number(columnC),
    EsSoil:Number(soilEs), EsColumn:Number(columnEs),
    load:projectLoad>0?projectLoad:undefined, foundationArea:projectArea>0?projectArea:undefined, foundationThickness:Number(thickness),
    columnFrictionAngle:Number(phi), cohesion:Number(c), frictionAngle:Number(angle),
    verticalLoad:projectLoad, horizontalLoad:projectH
  }),[d,spacing,layout,soil,column,soilEs,columnEs,soilC,columnC,thickness,phi,c,angle,p.unitSystem,p.foundationParameters.structuralWeight,p.foundationParameters.vtX,p.foundationParameters.vtY])
  latestJetGroutResult=r
  return <Frame screen="jet-grout">
    <Source>Erol &amp; Çekinmez Bayram (2018), Jet Enjeksiyon Yöntemi, Yüksel Proje, Ankara: Jet Grout zemin-kolon kompozit malzeme yaklaşımı. Priebe 1995 yalnızca taş kolon/vibro-replacement referans ekranıdır ve Jet Grout hesabına uygulanmaz. TBDY 2018 Bölüm 16 ise ayrı yönetmelik kontrolleri olarak ele alınır.</Source>
    <Card title="JET GROUT · İLERİ TASARIM"><div className="form-grid">
      <Field label="Kolon çapı d (m)" value={d} onChange={setD}/><Field label="Aks aralığı s (m)" value={spacing} onChange={setSpacing}/>
      <label>Yerleşim<select value={layout} onChange={e=>setLayout(e.target.value as 'square'|'triangular')}><option value="square">Kare</option><option value="triangular">Üçgen</option></select></label>
      <Field label="Zemin qult (kPa)" value={soil} onChange={setSoil}/><Field label="Kolon qult (kPa)" value={column} onChange={setColumn}/>
      <Field label="Zemin c′ (kPa)" value={soilC} onChange={setSoilC}/><Field label="Kolon c′ (kPa)" value={columnC} onChange={setColumnC}/>
      <Field label="Zemin E (kPa)" value={soilEs} onChange={setSoilEs}/><Field label="Kolon E (kPa)" value={columnEs} onChange={setColumnEs}/>
      <Metric label="Temel alanı" value={projectArea.toFixed(2)} unit="m²"/><Metric label="G+Q" value={projectLoad.toFixed(2)} unit="kN"/>
      <Field label="İyileştirme kalınlığı H (m)" value={thickness} onChange={setThickness}/><Field label="Kolon φ (°) · Priebe referansı" value={phi} onChange={setPhi}/>
      <Field label="Arayüz c′ (kPa)" value={c} onChange={setC}/><Field label="Arayüz φ′ (°)" value={angle} onChange={setAngle}/><Metric label="√(Vtx²+Vty²)" value={projectH.toFixed(2)} unit="kN"/>
    </div></Card>
    <div className="metric-strip"><Metric label="Alan oranı ar" value={(r.areaReplacementRatio*100).toFixed(2)} unit="%"/><Metric label="Kompozit kapasite" value={r.compositeCapacity.toFixed(2)} unit="kPa" tone="primary"/><Metric label="Ecomp" value={r.compositeModulus?.toFixed(1) ?? '—'} unit="kPa"/><Metric label="Kolon yük payı" value={(r.columnLoadShare*100).toFixed(1)} unit="%"/><Metric label="β stress concentration" value={r.stressConcentrationFactor.toFixed(2)}/></div>
    <Card title="EROL &amp; ÇEKİNMEZ BAYRAM · KOMPOZİT BİRİM HÜCRE"><CalculationTrace title="Kompozit hesap zinciri" source={r.source} rows={[
      {symbol:'Ac',title:'Kolon alanı',formula:'πd²/4',value:r.areaColumn,unit:'m²'},
      {symbol:'Acell',title:'Hücre alanı',formula:layout==='square'?'s²':'√3·s²/2',value:r.cellArea,unit:'m²'},
      {symbol:'ar',title:'Alan değiştirme oranı',formula:'Ac/Acell',value:r.areaReplacementRatio},
      {symbol:'ccomp',title:'Kompozit kohezyon',formula:'ar·cc+(1−ar)·cs',value:r.compositeCohesion ?? 0,unit:'kPa'},
      {symbol:'Ecomp',title:'Kompozit modül',formula:'ar·Ec+(1−ar)·Es',value:r.compositeModulus ?? 0,unit:'kPa'},
      {symbol:'ηc',title:'Kolon yük payı',formula:'(n·ar)/(1+(n−1)ar)',value:r.columnLoadShare},
      {symbol:'β',title:'Gerilme yoğunlaşma katsayısı',formula:'β=ηc/ar',value:r.stressConcentrationFactor},
      {symbol:'FS',title:'Kapasite güvenliği',formula:'qcomp·A/P',value:r.capacityFS ?? 0}
    ]}/><div className="inline-empty">{r.sourceNote}</div></Card>
    {r.virtualRaft && <Card title="SANAL RADYE · OTURMA KARŞILAŞTIRMASI"><div className="metric-strip"><Metric label="İyileştirilmemiş" value={(r.virtualRaft.untreatedSettlement*1000).toFixed(2)} unit="mm"/><Metric label="İyileştirilmiş" value={(r.virtualRaft.treatedSettlement*1000).toFixed(2)} unit="mm" tone="primary"/><Metric label="Azalma" value={r.virtualRaft.reductionPercent.toFixed(1)} unit="%"/></div></Card>}
    {r.shearSafety && <Card title="KAYMA GÜVENLİĞİ"><div className="metric-strip"><Metric label="τ" value={r.shearSafety.shearStress.toFixed(2)} unit="kPa"/><Metric label="τdirenç" value={r.shearSafety.shearResistance.toFixed(2)} unit="kPa"/><Metric label="FS" value={r.shearSafety.FS.toFixed(2)} tone="primary"/></div></Card>}
    {r.priebeScreening && <Card title="PRIEBE · REFERANS EKRANI"><div className="metric-strip"><Metric label="n₀" value={r.priebeScreening.n0.toFixed(3)}/><Metric label="n₁" value={r.priebeScreening.n1.toFixed(3)}/><Metric label="KaC" value={r.priebeScreening.activeEarthPressureCoefficient.toFixed(3)}/></div><div className="inline-empty">{r.priebeScreening.warning}</div></Card>}
  </Frame>
}
