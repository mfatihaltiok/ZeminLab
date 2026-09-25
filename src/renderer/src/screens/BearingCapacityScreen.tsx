import { useMemo, useState } from 'react'
import { tbdyBearingCapacity, SOURCE_NOTES, type BearingMethod } from '../../../core/calculations/engineering'
import { bearingCapacity as bearingCapacityEngine } from '../../../core/engineering/calculation-engine'
import { useProjectInfo } from '../../../core/state/project-store'
import type { IdealizedSoilProfile } from '../../../core/models/idealized-soil-profile'
import { forceFromBase, forceToBase, momentToBase, stressFromBase, stressToBase, unitWeightToBase, PROJECT_UNIT_LABELS } from '../../../core/units/project-units'
import { Card, Frame, Metric, Source, Table } from '../workspace/WorkspaceShell'
import { CalculationTrace } from '../components/CalculationTrace'

export function BearingCapacityScreen({profile}:{profile?:IdealizedSoilProfile}){
  const p=useProjectInfo(),soil=p.soilParameters,f=p.foundationParameters
  const [method,setMethod]=useState<BearingMethod>('Terzaghi')
  const FS=f.safetyFactor>0?f.safetyFactor:3
  const units=p.unitSystem==='ton-m'?PROJECT_UNIT_LABELS.ton:PROJECT_UNIT_LABELS.kN
  const B=Number(f.footingWidth),L=Number(f.footingLength),Df=Number(f.footingDepth)
  const gamma1=unitWeightToBase(Number(soil.unitWeight),p.unitSystem),gamma2=unitWeightToBase(Number(soil.saturatedUnitWeight),p.unitSystem)
  const c=stressToBase(Number(soil.cohesion),p.unitSystem),phi=Number(soil.frictionAngle)
  const N=forceToBase(Number(f.structuralWeight),p.unitSystem)
  const Vx=forceToBase(Number(f.vtX),p.unitSystem),Vy=forceToBase(Number(f.vtY),p.unitSystem),H=Math.hypot(Vx,Vy)
  const Mx=momentToBase(Number(f.momentX),p.unitSystem),My=momentToBase(Number(f.momentY),p.unitSystem)
  const valid=Number.isFinite(B)&&B>0&&Number.isFinite(L)&&L>0&&Number.isFinite(Df)&&Df>=0&&Number.isFinite(gamma1)&&gamma1>0&&Number.isFinite(c)&&c>=0&&Number.isFinite(phi)&&phi>=0&&phi<50&&Number.isFinite(N)&&N>=0
  const layered=useMemo(()=>profile?.layers.map(x=>({topDepth:x.topDepth,bottomDepth:x.bottomDepth,gamma:unitWeightToBase(x.gamma??soil.unitWeight,p.unitSystem),gammaSat:unitWeightToBase(x.gammaSat??x.gamma??soil.saturatedUnitWeight,p.unitSystem),cohesion:stressToBase(x.cohesion??soil.cohesion,p.unitSystem),phi:x.frictionAngle??soil.frictionAngle})).filter(x=>x.bottomDepth>x.topDepth),[profile,soil,p.unitSystem])
  const calculation=useMemo(()=>{
    if(!valid)return {result:null,error:'Temel, zemin veya yük girdileri tamamlanmalı.'}
    try{
      return {result:tbdyBearingCapacity({
        B,L,Df,gamma1,gamma2,c,phi,verticalLoad:N,horizontalLoad:H,momentX:Mx,momentY:My,
        groundSlope:soil.surfaceSlope,baseSlope:soil.foundationBaseSlope,resistanceFactor:1.4,
        foundationType:f.foundationType,groundwaterDepth:soil.groundwaterDepth,layers:layered,undrainedCu:soil.undrainedCohesion
      }),error:null}
    }catch(e){return{result:null,error:e instanceof Error?e.message:String(e)}}
  },[valid,B,L,Df,gamma1,gamma2,c,phi,N,H,Mx,My,soil.surfaceSlope,soil.foundationBaseSlope,f.foundationType,soil.groundwaterDepth,soil.undrainedCohesion,layered])
  const generic=useMemo(()=>valid?(['Terzaghi','Meyerhof','Hansen','Vesic'] as BearingMethod[]).map(m=>({method:m,result:bearingCapacityEngine({B,L,Df,gamma:gamma1,c,phi,FS,method:m}).value})):[],[valid,B,L,Df,gamma1,c,phi,FS])
  const r=calculation.result?.value
  const stress=(v:number)=>stressFromBase(v,p.unitSystem)
  const force=(v:number)=>forceFromBase(v,p.unitSystem)
  if(!valid||!r){
    return <Frame screen="bearing-capacity"><Source>{SOURCE_NOTES.bearing}</Source><Card title="TAŞIMA GÜCÜ HESABI HAZIR DEĞİL"><div className="engineering-note">{calculation.error??'Eksik proje girdisi.'}</div></Card></Frame>
  }
  return <Frame screen="bearing-capacity">
    <Source>{SOURCE_NOTES.bearing} TBDY 2018 16.8.3 aktif hesabı deprem yatay yükü, moment, YASS, eğim ve etkin temel boyutlarını doğrudan proje girdilerinden kullanır.</Source>
    <Card title="PROJE VE AKTİF YÜKLEME"><div className="form-grid">
      <Metric label="Temel" value={f.foundationType}/>
      <Metric label="B × L × Df" value={B.toFixed(2)+' × '+L.toFixed(2)+' × '+Df.toFixed(2)+' m'}/>
      <Metric label="G+Q" value={force(N).toFixed(2)} unit={units.force}/>
      <Metric label="H" value={force(H).toFixed(2)} unit={units.force}/>
      <Metric label="Mx / My" value={Mx.toFixed(2)+' / '+My.toFixed(2)} unit={units.moment}/>
      <Metric label="γRv" value="1.40"/>
    </div></Card>
    <Card title="KLASİK YÖNTEMLER"><Table headers={['Yöntem','qult','qallow gross','qallow net']} rows={generic.map(x=>[x.method,x.result.ultimate.toFixed(2)+' kPa',x.result.allowableGross.toFixed(2)+' kPa',x.result.allowableNet.toFixed(2)+' kPa'])}/><div className="engineering-note">Bu dört sütun klasik izin verilebilir taşıma gücüdür; TBDY tasarım dayanımı değildir.</div></Card>
    <div className="metric-strip"><Metric label="TBDY qk" value={stress(r.qk).toFixed(2)} unit={units.stress} tone="primary"/><Metric label="TBDY qt" value={stress(r.qt).toFixed(2)} unit={units.stress} tone="primary"/><Metric label="q0" value={stress(r.qo).toFixed(2)} unit={units.stress}/><Metric label="B′ / L′" value={r.Be.toFixed(3)+' / '+r.Le.toFixed(3)} unit="m"/><Metric label="Kullanım" value={(r.utilization*100).toFixed(1)} unit="%"/><Metric label="Kontrol" value={r.adequate?'UYGUN':'YETERSİZ'}/></div>
    {r.warnings.length>0&&<Card title="TBDY UYARILARI"><div className="inline-empty">{r.warnings.join(' ')}</div></Card>}
    <CalculationTrace title="TBDY 2018 16.8 hesap zinciri" source={calculation.result?.source??SOURCE_NOTES.bearing} rows={calculation.result?.steps??[]}/>
  </Frame>
}
