import { useMemo } from 'react'
import { jetGroutEngineering, type JetGroutEngineeringResult } from '../../../core/engineering/jet-grout-advanced'
import { Card, Field, Frame, Metric, Source } from '../workspace/WorkspaceShell'
import { updateProjectInfo, useProjectInfo } from '../../../core/state/project-store'
import { forceToBase, stressToBase, projectUnits } from '../../../core/units/project-units'
import { CalculationTrace } from '../components/CalculationTrace'

export let latestJetGroutResult:JetGroutEngineeringResult|undefined

const num=(value:string)=>{if(value.trim()==='')return undefined;const n=Number(value);return Number.isFinite(n)?n:undefined}

export function JetGroutEngineeringScreen(){
  const p=useProjectInfo(),f=p.foundationParameters,j=p.jetGrout,units=projectUnits(p.unitSystem)
  const projectArea=Math.max(0,f.footingWidth*f.footingLength)
  const projectLoad=forceToBase(f.structuralWeight,p.unitSystem)
  const projectH=Math.hypot(forceToBase(f.vtX,p.unitSystem),forceToBase(f.vtY,p.unitSystem))
  const set=(key:keyof typeof j,value:number|undefined|string|boolean)=>updateProjectInfo({...p,jetGrout:{...j,[key]:value}})
  const d=j.columnDiameter?.toString()??'',spacing=j.spacing?.toString()??'',soil=j.qSoil?.toString()??'',column=j.qColumn?.toString()??''
  const soilEs=j.EsSoil?.toString()??'',columnEs=j.EsColumn?.toString()??'',soilC=j.cSoil?.toString()??'',columnC=j.cColumn?.toString()??''
  const thickness=j.foundationThickness?.toString()??'',nu=j.soilPoissonRatio?.toString()??'',c=j.interfaceCohesion?.toString()??'',angle=j.interfaceFrictionAngle?.toString()??''
  const qcRequiredUcs=j.qcRequiredUcs?.toString()??'',qcMeasuredUcs=j.qcMeasuredUcs?.toString()??''
  const qcRequiredDiameter=j.qcRequiredDiameter?.toString()??'',qcMeasuredDiameter=j.qcMeasuredDiameter?.toString()??''
  const qcRequiredCoreSamples=j.qcRequiredCoreSamples?.toString()??'',qcMeasuredCoreSamples=j.qcMeasuredCoreSamples?.toString()??''
  const layout=j.layout??'square'
  const ready=[d,spacing,soil,column].every(x=>x!==''&&Number(x)>0)&&projectLoad>0&&projectArea>0
  const r=useMemo(()=>{
    if(!ready)return undefined
    return jetGroutEngineering({
      columnDiameter:Number(d),spacing:Number(spacing),layout,qSoil:stressToBase(Number(soil),p.unitSystem),qColumn:stressToBase(Number(column),p.unitSystem),
      cSoil:Number(soilC)>0?stressToBase(Number(soilC),p.unitSystem):undefined,cColumn:Number(columnC)>0?stressToBase(Number(columnC),p.unitSystem):undefined,
      EsSoil:Number(soilEs)>0?stressToBase(Number(soilEs),p.unitSystem):undefined,EsColumn:Number(columnEs)>0?stressToBase(Number(columnEs),p.unitSystem):undefined,
      load:projectLoad>0?projectLoad:undefined,foundationArea:projectArea>0?projectArea:undefined,
      foundationThickness:Number(thickness)>0?Number(thickness):undefined,
      soilPoissonRatio:nu!==''&&Number.isFinite(Number(nu))&&Number(nu)>-1&&Number(nu)<0.5?Number(nu):undefined,
      cohesion:Number(c)>0?stressToBase(Number(c),p.unitSystem):undefined,
      frictionAngle:angle!==''&&Number.isFinite(Number(angle))&&Number(angle)>=0&&Number(angle)<=50?Number(angle):undefined,verticalLoad:projectLoad,horizontalLoad:projectH,
      qc:{
        requiredUcs:num(qcRequiredUcs)==null?undefined:stressToBase(num(qcRequiredUcs)!,p.unitSystem),
        measuredUcs:num(qcMeasuredUcs)==null?undefined:stressToBase(num(qcMeasuredUcs)!,p.unitSystem),
        requiredDiameter:num(qcRequiredDiameter),measuredDiameter:num(qcMeasuredDiameter),
        requiredCoreSamples:num(qcRequiredCoreSamples),measuredCoreSamples:num(qcMeasuredCoreSamples),
        continuityVerified:j.qcContinuityVerified
      }
    })
  },[ready,d,spacing,soil,column,layout,soilEs,columnEs,soilC,columnC,thickness,nu,c,angle,qcRequiredUcs,qcMeasuredUcs,qcRequiredDiameter,qcMeasuredDiameter,qcRequiredCoreSamples,qcMeasuredCoreSamples,j.qcContinuityVerified,projectLoad,projectArea,projectH])
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
      <Field label="Zemin Poisson oranı ν" value={nu} onChange={v=>set('soilPoissonRatio',num(v))}/>
      <Field label={"Arayüz c′ ("+units.stress+")"} value={c} onChange={v=>set('interfaceCohesion',num(v))}/>
      <Field label="Arayüz φ′ (°)" value={angle} onChange={v=>set('interfaceFrictionAngle',num(v))}/>
      <details><summary>SAHA KALİTE KONTROLÜ — PROJE KABUL KRİTERLERİ</summary><div className="form-grid">
        <Field label={"Gerekli UCS ("+units.stress+")"} value={qcRequiredUcs} onChange={v=>set('qcRequiredUcs',num(v))}/>
        <Field label={"Ölçülen UCS ("+units.stress+")"} value={qcMeasuredUcs} onChange={v=>set('qcMeasuredUcs',num(v))}/>
        <Field label="Gerekli minimum çap (m)" value={qcRequiredDiameter} onChange={v=>set('qcRequiredDiameter',num(v))}/>
        <Field label="Ölçülen minimum çap (m)" value={qcMeasuredDiameter} onChange={v=>set('qcMeasuredDiameter',num(v))}/>
        <Field label="Gerekli karot adedi" value={qcRequiredCoreSamples} onChange={v=>set('qcRequiredCoreSamples',num(v))}/>
        <Field label="Alınan karot adedi" value={qcMeasuredCoreSamples} onChange={v=>set('qcMeasuredCoreSamples',num(v))}/>
        <label><input type="checkbox" checked={j.qcContinuityVerified??false} onChange={e=>set('qcContinuityVerified',e.target.checked)}/> Kolon sürekliliği saha verisiyle doğrulandı</label>
      </div><p className="engineering-note">Kabul değerleri proje şartnamesinden girilmelidir; bu bölüm genel bir TBDY sınır değeri tanımlamaz.</p></details>
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
      <Card title="TASARIM DURUMU"><div className="inline-empty">Sonuçlar ön tasarım ve temel/oturma yeniden değerlendirme akışında kullanılır; nihai mühendislik kararı proje verileriyle ayrıca doğrulanır.</div>{r.warnings.map((w,i)=><div className="inline-empty" key={i}>{w}</div>)}</Card><Card title="KOMPOZİT BİRİM HÜCRE"><CalculationTrace title="Hesap zinciri" source={r.source} rows={[
        {symbol:'Ac',title:'Kolon alanı',formula:'πd²/4',value:r.areaColumn,unit:'m²'},
        {symbol:'Acell',title:'Hücre alanı',formula:layout==='square'?'s²':'√3·s²/2',value:r.cellArea,unit:'m²'},
        {symbol:'ar',title:'Alan değiştirme oranı',formula:'Ac/Acell',value:r.areaReplacementRatio},
        {symbol:'Ecomp',title:'Kompozit modül',formula:'ar·Ec+(1−ar)Es',value:r.compositeModulus??0,unit:'kPa'},
        {symbol:'ηc',title:'Kolon yük payı',formula:'(n·ar)/(1+(n−1)ar)',value:r.columnLoadShare},
        {symbol:'β',title:'Gerilme yoğunlaşma katsayısı',formula:'ηc/ar',value:r.stressConcentrationFactor}
      ]}/><div className="inline-empty">{r.sourceNote}</div></Card>
      {r.virtualRaft&&<Card title="SANAL RADYE · OTURMA KARŞILAŞTIRMASI"><div className="metric-strip"><Metric label="İyileştirilmemiş" value={(r.virtualRaft.untreatedSettlement*1000).toFixed(2)} unit="mm"/><Metric label="İyileştirilmiş" value={(r.virtualRaft.treatedSettlement*1000).toFixed(2)} unit="mm"/><Metric label="Azalma" value={r.virtualRaft.reductionPercent.toFixed(1)} unit="%"/></div></Card>}
      <Card title="SAHA KALİTE KONTROLÜ"><div className="metric-strip"><Metric label="Durum" value={r.qcVerification.status==='pass'?'UYGUN':r.qcVerification.status==='fail'?'UYGUN DEĞİL':'VERİ EKSİK'}/><Metric label="Kontrol ölçütü" value={r.qcVerification.checks.length}/></div>{r.qcVerification.checks.length>0&&<div className="table-wrap"><table><thead><tr><th>Ölçüt</th><th>Kriter</th><th>Ölçüm</th><th>Durum</th></tr></thead><tbody>{r.qcVerification.checks.map((x,i)=><tr key={i}><td>{x.name}</td><td>{x.required}</td><td>{x.measured}</td><td>{x.passed?'UYGUN':'UYGUN DEĞİL'}</td></tr>)}</tbody></table></div>}<div className="engineering-note">{r.qcVerification.warnings.join(' ')}</div></Card>
      {r.shearSafety&&<Card title="KAYMA GÜVENLİĞİ"><div className="metric-strip"><Metric label="τ" value={r.shearSafety.shearStress.toFixed(2)} unit="kPa"/><Metric label="τdirenç" value={r.shearSafety.shearResistance.toFixed(2)} unit="kPa"/><Metric label="FS" value={r.shearSafety.FS.toFixed(2)}/></div></Card>}
      {r.priebeScreening&&<Card title="PRIEBE · YALNIZCA REFERANS"><div className="metric-strip"><Metric label="n₀" value={r.priebeScreening.n0.toFixed(3)}/><Metric label="n₁" value={r.priebeScreening.n1.toFixed(3)}/></div><div className="inline-empty">{r.priebeScreening.warning}</div></Card>}
      </>}
  </Frame>
}
