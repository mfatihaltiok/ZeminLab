import { useMemo, useState } from 'react'
import { jetGroutEngineering, type JetGroutEngineeringResult } from '../../../core/engineering/jet-grout-advanced'
import { Card, Field, Frame, Metric, Source } from '../workspace/WorkspaceShell'
import { useProjectInfo } from '../../../core/state/project-store'
import { forceToBase } from '../../../core/units/project-units'
import { CalculationTrace } from '../components/CalculationTrace'

export let latestJetGroutResult:JetGroutEngineeringResult|undefined

export function JetGroutEngineeringScreen(){
  const p=useProjectInfo(),f=p.foundationParameters
  const projectArea=Math.max(0,f.footingWidth*f.footingLength)
  const projectLoad=forceToBase(f.structuralWeight,p.unitSystem)
  const projectH=Math.hypot(forceToBase(f.vtX,p.unitSystem),forceToBase(f.vtY,p.unitSystem))
  const [d,setD]=useState(''),[spacing,setSpacing]=useState(''),[soil,setSoil]=useState(''),[column,setColumn]=useState('')
  const [soilEs,setSoilEs]=useState(''),[columnEs,setColumnEs]=useState(''),[soilC,setSoilC]=useState(''),[columnC,setColumnC]=useState('')
  const [thickness,setThickness]=useState(''),[phi,setPhi]=useState(''),[c,setC]=useState(''),[angle,setAngle]=useState('')
  const [layout,setLayout]=useState<'square'|'triangular'>('square')
  const ready=[d,spacing,soil,column].every(x=>x!==''&&Number(x)>0)
  const r=useMemo(()=>ready?jetGroutEngineering({
    columnDiameter:Number(d),spacing:Number(spacing),layout,qSoil:Number(soil),qColumn:Number(column),
    cSoil:Number(soilC)>0?Number(soilC):undefined,cColumn:Number(columnC)>0?Number(columnC):undefined,
    EsSoil:Number(soilEs)>0?Number(soilEs):undefined,EsColumn:Number(columnEs)>0?Number(columnEs):undefined,
    load:projectLoad>0?projectLoad:undefined,foundationArea:projectArea>0?projectArea:undefined,
    foundationThickness:Number(thickness)>0?Number(thickness):undefined,
    columnFrictionAngle:Number(phi)>0?Number(phi):undefined,cohesion:Number(c)>0?Number(c):undefined,
    frictionAngle:Number(angle)>0?Number(angle):undefined,verticalLoad:projectLoad,horizontalLoad:projectH
  }):undefined,[ready,d,spacing,layout,soil,column,soilEs,columnEs,soilC,columnC,thickness,phi,c,angle,projectLoad,projectArea,projectH])
  latestJetGroutResult=r

  return <Frame screen="jet-grout">
    <Source>Erol &amp; Çekinmez Bayram (2018) kompozit yaklaşımı kullanılır. Priebe yalnızca taş kolon/vibro-replacement referansıdır. TBDY 2018 kontrolleri ayrı mühendislik motorlarından yürütülür.</Source>
    <Card title="JET GROUT GİRDİLERİ"><div className="form-grid">
      <Field label="Kolon çapı d (m)" value={d} onChange={setD}/>
      <Field label="Aks aralığı s (m)" value={spacing} onChange={setSpacing}/>
      <label>Yerleşim<select value={layout} onChange={e=>setLayout(e.target.value as 'square'|'triangular')}><option value="square">Kare</option><option value="triangular">Üçgen</option></select></label>
      <Field label="Zemin qult (kPa)" value={soil} onChange={setSoil}/>
      <Field label="Kolon qult (kPa)" value={column} onChange={setColumn}/>
      <Field label="Zemin c′ (kPa)" value={soilC} onChange={setSoilC}/>
      <Field label="Kolon c′ (kPa)" value={columnC} onChange={setColumnC}/>
      <Field label="Zemin E (kPa)" value={soilEs} onChange={setSoilEs}/>
      <Field label="Kolon E (kPa)" value={columnEs} onChange={setColumnEs}/>
      <Field label="İyileştirme kalınlığı H (m)" value={thickness} onChange={setThickness}/>
      <Field label="Kolon φ (°)" value={phi} onChange={setPhi}/>
      <Field label="Arayüz c′ (kPa)" value={c} onChange={setC}/>
      <Field label="Arayüz φ′ (°)" value={angle} onChange={setAngle}/>
      <Metric label="Temel alanı" value={projectArea.toFixed(2)} unit="m²"/>
      <Metric label="G+Q" value={projectLoad.toFixed(2)} unit="kN"/>
      <Metric label="H" value={projectH.toFixed(2)} unit="kN"/>
    </div></Card>

    {!r?<Card title="HESAP BEKLENİYOR"><div className="inline-empty">Kolon çapı, aks aralığı, zemin kapasitesi ve kolon kapasitesi girilmeden sonuç üretilmez.</div></Card>:
      <><div className="metric-strip">
        <Metric label="Alan oranı" value={(r.areaReplacementRatio*100).toFixed(2)} unit="%"/>
        <Metric label="Kompozit kapasite" value={r.compositeCapacity.toFixed(2)} unit="kPa"/>
        <Metric label="Ecomp" value={r.compositeModulus?.toFixed(1)??'—'} unit="kPa"/>
        <Metric label="Kolon yük payı" value={(r.columnLoadShare*100).toFixed(1)} unit="%"/>
        <Metric label="β" value={r.stressConcentrationFactor.toFixed(2)}/>
      </div>
      <Card title="KOMPOZİT BİRİM HÜCRE"><CalculationTrace title="Hesap zinciri" source={r.source} rows={[
        {symbol:'Ac',title:'Kolon alanı',formula:'πd²/4',value:r.areaColumn,unit:'m²'},
        {symbol:'Acell',title:'Hücre alanı',formula:layout==='square'?'s²':'√3·s²/2',value:r.cellArea,unit:'m²'},
        {symbol:'ar',title:'Alan değiştirme oranı',formula:'Ac/Acell',value:r.areaReplacementRatio},
        {symbol:'Ecomp',title:'Kompozit modül',formula:'ar·Ec+(1−ar)Es',value:r.compositeModulus??0,unit:'kPa'},
        {symbol:'ηc',title:'Kolon yük payı',formula:'(n·ar)/(1+(n−1)ar)',value:r.columnLoadShare},
        {symbol:'β',title:'Gerilme yoğunlaşma katsayısı',formula:'ηc/ar',value:r.stressConcentrationFactor}
      ]}/><div className="inline-empty">{r.sourceNote}</div></Card>
      {r.virtualRaft&&<Card title="SANAL RADYE · OTURMA KARŞILAŞTIRMASI"><div className="metric-strip"><Metric label="İyileştirilmemiş" value={(r.virtualRaft.untreatedSettlement*1000).toFixed(2)} unit="mm"/><Metric label="İyileştirilmiş" value={(r.virtualRaft.treatedSettlement*1000).toFixed(2)} unit="mm"/><Metric label="Azalma" value={r.virtualRaft.reductionPercent.toFixed(1)} unit="%"/></div></Card>}
      {r.shearSafety&&<Card title="KAYMA GÜVENLİĞİ"><div className="metric-strip"><Metric label="τ" value={r.shearSafety.shearStress.toFixed(2)} unit="kPa"/><Metric label="τdirenç" value={r.shearSafety.shearResistance.toFixed(2)} unit="kPa"/><Metric label="FS" value={r.shearSafety.FS.toFixed(2)}/></div></Card>}
      {r.priebeScreening&&<Card title="PRIEBE · YALNIZCA REFERANS"><div className="metric-strip"><Metric label="n₀" value={r.priebeScreening.n0.toFixed(3)}/><Metric label="n₁" value={r.priebeScreening.n1.toFixed(3)}/></div><div className="inline-empty">{r.priebeScreening.warning}</div></Card>}
      </>}
  </Frame>
}
