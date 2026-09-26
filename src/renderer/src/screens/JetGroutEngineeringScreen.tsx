import { useMemo } from 'react'
import { jetGroutEngineering, type JetGroutEngineeringResult } from '../../../core/engineering/jet-grout-advanced'
import { Card, Field, Frame, Metric, Source } from '../workspace/WorkspaceShell'
import { updateProjectInfo, useProjectInfo } from '../../../core/state/project-store'
import { forceToBase, stressToBase, projectUnits } from '../../../core/units/project-units'
import { CalculationTrace } from '../components/CalculationTrace'

export let latestJetGroutResult:JetGroutEngineeringResult|undefined

const num=(value:string)=>value===''?undefined:Number(value)

export function JetGroutEngineeringScreen(){
  const p=useProjectInfo(),f=p.foundationParameters,j=p.jetGrout,units=projectUnits(p.unitSystem)
  const projectArea=Math.max(0,f.footingWidth*f.footingLength)
  const projectLoad=forceToBase(f.verticalLoad,p.unitSystem)
  const projectH=Math.hypot(forceToBase(f.vtX,p.unitSystem),forceToBase(f.vtY,p.unitSystem))
  const set=(key:keyof typeof j,value:number|undefined|string)=>updateProjectInfo({...p,jetGrout:{...j,[key]:value}})
  const d=j.columnDiameter?.toString()??'',spacing=j.spacing?.toString()??'',soil=j.qSoil?.toString()??'',column=j.qColumn?.toString()??''
  const soilEs=j.EsSoil?.toString()??'',columnEs=j.EsColumn?.toString()??'',soilC=j.cSoil?.toString()??'',columnC=j.cColumn?.toString()??''
  const thickness=j.foundationThickness?.toString()??'',phi=j.columnFrictionAngle?.toString()??'',c=j.interfaceCohesion?.toString()??'',angle=j.interfaceFrictionAngle?.toString()??''
  const layout=j.layout??'square'
  const ready=[d,spacing,soil,column].every(x=>x!==''&&Number(x)>0)
  const r=useMemo(()=>{
    if(!ready)return undefined
    return jetGroutEngineering({
      columnDiameter:Number(d),spacing:Number(spacing),layout,qSoil:stressToBase(Number(soil),p.unitSystem),qColumn:stressToBase(Number(column),p.unitSystem),
      cSoil:Number(soilC)>0?stressToBase(Number(soilC),p.unitSystem):undefined,cColumn:Number(columnC)>0?stressToBase(Number(columnC),p.unitSystem):undefined,
      EsSoil:Number(soilEs)>0?stressToBase(Number(soilEs),p.unitSystem):undefined,EsColumn:Number(columnEs)>0?stressToBase(Number(columnEs),p.unitSystem):undefined,
      load:projectLoad>0?projectLoad:undefined,foundationArea:projectArea>0?projectArea:undefined,
      foundationThickness:Number(thickness)>0?Number(thickness):undefined,
      columnFrictionAngle:Number(phi)>0?Number(phi):undefined,cohesion:Number(c)>0?Number(c):undefined,
      frictionAngle:Number(angle)>0?Number(angle):undefined,verticalLoad:projectLoad,horizontalLoad:projectH,qualityControlCompleted:f.jetGroutQualityControlCompleted
    })
  },[ready,d,spacing,soil,column,layout,soilEs,columnEs,soilC,columnC,thickness,phi,c,angle,projectLoad,projectArea,projectH])
  latestJetGroutResult=r

  return <Frame screen="jet-grout">
    <Source>Erol &amp; Çekinmez Bayram (2018) kompozit yaklaşımı kullanılır. Priebe yalnızca taş kolon/vibro-replacement referansıdır. TBDY 2018 geoteknik kontrolleri ayrı motorlardan yürütülür.</Source>
    <Card title="JET GROUT GİRDİLERİ"><div className="form-grid">
      <Field label="Kolon çapı d (m)" value={d} onChange={v=>set('columnDiameter',num(v))}/>
      <Field label="Aks aralığı s (m)" value={spacing} onChange={v=>set('spacing',num(v))}/>
      <label>Yerleşim<select value={layout} onChange={e=>set('layout',e.target.value as 'square'|'triangular')}><option value="square">Kare</option><option value="triangular">Üçgen</option></select></label>
      <Field label={"Zemin qult ("+units.stress+")"} value={soil} onChange={v=>set('qSoil',num(v))}/>
      <Field label={"Kolon qult ("+units.stress+")"} value={column} onChange={v=>set('qColumn',num(v))}/>
      <Field label={"Zemin c′ ("+units.stress+")"} value={soilC} onChange={v=>set('cSoil',num(v))}/>
      <Field label={"Kolon c′ ("+units.stress+")"} value={columnC} onChange={v=>set('cColumn',num(v))}/>
      <Field label={"Zemin E ("+units.stress+")"} value={soilEs} onChange={v=>set('EsSoil',num(v))}/>
      <Field label={"Kolon E ("+units.stress+")"} value={columnEs} onChange={v=>set('EsColumn',num(v))}/>
      <Field label="İyileştirme kalınlığı H (m)" value={thickness} onChange={v=>set('foundationThickness',num(v))}/>
      <Field label="Kolon φ (°)" value={phi} onChange={v=>set('columnFrictionAngle',num(v))}/>
      <Field label={"Arayüz c′ ("+units.stress+")"} value={c} onChange={v=>set('interfaceCohesion',num(v))}/>
      <Field label="Arayüz φ′ (°)" value={angle} onChange={v=>set('interfaceFrictionAngle',num(v))}/>
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
      <Card title="TASARIM DURUMU"><div className="inline-empty">{r.designEligible?'Nihai değerlendirmeye aktarılabilir: kalite kontrol + eksenel kapasite kanıtı mevcut.':'Yalnızca ön tasarım/screening. Nihai tasarım uygunluğu olarak kullanılmamalıdır.'}</div>{r.warnings.map((w,i)=><div className="inline-empty" key={i}>{w}</div>)}</Card><Card title="KOMPOZİT BİRİM HÜCRE"><CalculationTrace title="Hesap zinciri" source={r.source} rows={[
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
