import { useMemo, useState } from 'react'
import { tbdyBearingCapacity, SOURCE_NOTES, type BearingMethod } from '../../../core/calculations/engineering'
import { bearingCapacity as bearingCapacityEngine } from '../../../core/engineering/calculation-engine'
import { useProjectInfo } from '../../../core/state/project-store'
import type { IdealizedSoilProfile } from '../../../core/models/idealized-soil-profile'
import { forceFromBase, forceToBase, stressFromBase, stressToBase, unitWeightFromBase, unitWeightToBase, PROJECT_UNIT_LABELS } from '../../../core/units/project-units'
import { Card, Frame, Metric, Source, Table } from '../workspace/WorkspaceShell'
import { CalculationTrace } from '../components/CalculationTrace'

export function BearingCapacityScreen({profile}:{profile?:IdealizedSoilProfile}){
 const p=useProjectInfo(),soil=p.soilParameters,f=p.foundationParameters
 const [method,setMethod]=useState<BearingMethod>('Terzaghi')
 const FS=3
 const units=p.unitSystem==='ton-m'?PROJECT_UNIT_LABELS.ton:PROJECT_UNIT_LABELS.kN

 const B=Number(f.footingWidth)
 const L=Number(f.footingLength)
 const Df=Number(f.footingDepth)
 const gamma1=unitWeightToBase(Number(soil.unitWeight),p.unitSystem)
 const gamma2=unitWeightToBase(Number(soil.saturatedUnitWeight),p.unitSystem)
 const c=stressToBase(Number(soil.cohesion),p.unitSystem)
 const phi=Number(soil.frictionAngle)
 const verticalLoad=forceToBase(Number(f.structuralWeight),p.unitSystem)
 const horizontalLoad=0
 const momentX=0
 const momentY=0
 const resistanceFactor=Number(f.resistanceFactorRv||1.4)

 const inputsValid=
  Number.isFinite(B)&&B>0&&
  Number.isFinite(L)&&L>0&&
  Number.isFinite(Df)&&Df>=0&&
  Number.isFinite(gamma1)&&gamma1>0&&
  Number.isFinite(gamma2)&&gamma2>0&&
  Number.isFinite(c)&&c>=0&&
  Number.isFinite(phi)&&phi>=0&&phi<50&&
  Number.isFinite(verticalLoad)&&verticalLoad>=0&&
  Number.isFinite(horizontalLoad)&&horizontalLoad>=0&&
  Number.isFinite(momentX)&&Number.isFinite(momentY)&&
  Number.isFinite(resistanceFactor)&&resistanceFactor>0

 const generic=useMemo(()=>inputsValid?bearingCapacityEngine({B,L,Df,gamma:gamma1,c,phi,FS,method}):null,[inputsValid,B,L,Df,gamma1,c,phi,FS,method])
 const layered=useMemo(()=>profile?.layers.map(x=>({topDepth:x.topDepth,bottomDepth:x.bottomDepth,gamma:unitWeightToBase(x.gamma??soil.unitWeight,p.unitSystem),gammaSat:unitWeightToBase(x.gammaSat??x.gamma??soil.saturatedUnitWeight,p.unitSystem),cohesion:stressToBase(x.cohesion??soil.cohesion,p.unitSystem),phi:x.frictionAngle??soil.frictionAngle})).filter(x=>x.bottomDepth>x.topDepth),[profile,soil,p.unitSystem])
 const result=useMemo(()=>inputsValid?tbdyBearingCapacity({B,L,Df,gamma1,gamma2,c,phi,verticalLoad,horizontalLoad,momentX,momentY,groundSlope:soil.surfaceSlope,baseSlope:soil.foundationBaseSlope,resistanceFactor,foundationType:f.foundationType,unitSystem:p.unitSystem,groundwaterDepth:soil.groundwaterDepth,layers:layered}):null,[inputsValid,B,L,Df,gamma1,gamma2,c,phi,verticalLoad,horizontalLoad,momentX,momentY,soil.surfaceSlope,soil.foundationBaseSlope,resistanceFactor,f.foundationType,p.unitSystem,soil.groundwaterDepth,layered])
 const stress=(v:number)=>stressFromBase(v,p.unitSystem)
 const force=(v:number)=>forceFromBase(v,p.unitSystem)
 const gamma=(v:number)=>unitWeightFromBase(v,p.unitSystem)

 const genericRows=useMemo(()=>generic?(['Terzaghi','Meyerhof','Hansen','Vesic'] as BearingMethod[]).map(m=>[m,bearingCapacityEngine({B,L,Df,gamma:gamma1,c,phi,FS,method:m}).value.allowableGross]):[],[generic,B,L,Df,gamma1,c,phi,FS])
 const trace=result?[{symbol:'eₓ / eᵧ',title:'Yük eksantriklikleri',formula:'eₓ = Mᵧ / N · eᵧ = Mₓ / N',value:`${result.ex.toFixed(4)} / ${result.ey.toFixed(4)} m`,note:'Moment ve düşey yükten elde edilir.'},{symbol:'B′ / L′',title:'Etkin temel boyutları',formula:'B′ = B − 2|eₓ| · L′ = L − 2|eᵧ|',value:`${result.Be.toFixed(3)} / ${result.Le.toFixed(3)} m`},{symbol:'N꜀ / Nq / Nᵧ',title:'Taşıma gücü katsayıları',formula:'φ bağıntılarından',value:`${result.Nc.toFixed(3)} / ${result.Nq.toFixed(3)} / ${result.Ngamma.toFixed(3)}`},{symbol:'s',title:'Şekil katsayıları',formula:'s꜀, sq, sᵧ',value:`${result.sc.toFixed(3)} / ${result.sq.toFixed(3)} / ${result.sg.toFixed(3)}`},{symbol:'d',title:'Derinlik katsayıları',formula:'d꜀, dq, dᵧ',value:`${result.dc.toFixed(3)} / ${result.dq.toFixed(3)} / ${result.dg.toFixed(3)}`},{symbol:'i',title:'Yük eğikliği katsayıları',formula:'i꜀, iq, iᵧ',value:`${result.ic.toFixed(3)} / ${result.iq.toFixed(3)} / ${result.ig.toFixed(3)}`},{symbol:'g',title:'Zemin eğimi katsayıları',formula:'g꜀, gq, gᵧ',value:`${result.gc.toFixed(3)} / ${result.gq.toFixed(3)} / ${result.gg.toFixed(3)}`},{symbol:'b',title:'Temel tabanı eğimi katsayıları',formula:'b꜀, bq, bᵧ',value:`${result.bc.toFixed(3)} / ${result.bq.toFixed(3)} / ${result.bg.toFixed(3)}`},{symbol:'q',title:'Sürşarj',formula:'q = Df · γ₁',value:stress(result.surcharge),unit:units.stress},{symbol:'qₖ',title:'Karakteristik taşıma gücü',formula:'Denklem 16.8 katsayılarıyla',value:stress(result.qk),unit:units.stress},{symbol:'qₜ',title:'Tasarım taşıma gücü',formula:'qₜ = qₖ / γRv',value:stress(result.qt),unit:units.stress},{symbol:'q₀',title:'Temel taban basıncı',formula:'q₀ = N / (B′ · L′)',value:stress(result.qo),unit:units.stress}]:[]

 if(!inputsValid||!result||!generic){
  return <Frame screen="bearing-capacity">
   <Source>{SOURCE_NOTES.bearing} Hesap motoru eksik veya geçersiz proje girdileriyle çalıştırılmaz.</Source>
   <Card title="ANALİZ HAZIR DEĞİL">
    <div className="engineering-note">
     <b>Taşıma gücü hesabı başlatılmadı.</b>
     <p>Analiz ekranı güvenli biçimde açıldı. Önce proje temel ve zemin girdilerini tamamlayın.</p>
     <ul>
      <li>Temel B ve L &gt; 0</li>
      <li>Df ≥ 0</li>
      <li>γ ve γsat &gt; 0</li>
      <li>c ≥ 0 ve φ ≥ 0°</li>
      <li>Bina ağırlığı ≥ 0</li>
      <li>γRv &gt; 0</li>
     </ul>
     <p>Girdiler tamamlandığında TBDY 2018 ve klasik taşıma gücü hesapları çalıştırılacaktır.</p>
    </div>
   </Card>
  </Frame>
 }

 return <Frame screen="bearing-capacity"><Source>{SOURCE_NOTES.bearing} Dört klasik literatür yöntemi ayrı, TBDY 2018 kontrolü ayrı gösterilir. TBDY yüzeysel temel dayanım katsayısı Tablo 16.2'ye göre γRv=1.40'tır.</Source>
  <Card title="PROJE TEMELİ VE AKTİF LİTERATÜR YÖNTEMİ"><div className="form-grid"><Metric label="Temel tipi" value={f.foundationType==='surekli'?'Sürekli (şerit)':f.foundationType==='radye'?'Radye':'Tekil'}/><label>Hesap yöntemi<select value={method} onChange={e=>setMethod(e.target.value as BearingMethod)}>{(['Terzaghi','Meyerhof','Hansen','Vesic'] as BearingMethod[]).map(x=><option key={x}>{x}</option>)}</select></label><Metric label="İzin verilen gross qallow" value={stress(generic.value.allowableGross).toFixed(2)} unit={units.stress} tone="primary"/><Metric label="Aktif qult" value={stress(generic.value.ultimate).toFixed(2)} unit={units.stress}/><Metric label="Klasik yöntem katsayısı" value="3.00"/></div></Card>
  <Card title="DÖRT YÖNTEMİN YAN YANA HESAPLANMASI"><Table headers={['Yöntem','İzin verilen gross taşıma gücü']} rows={genericRows.map(r=>[r[0],`${stress(Number(r[1])).toFixed(2)} ${units.stress}`])}/><CalculationTrace title={`${method} hesap zinciri`} source={generic.source} rows={generic.steps}/></Card>
  <div className="metric-strip"><Metric label="TBDY qk" value={stress(result.qk).toFixed(2)} unit={units.stress} tone="primary"/><Metric label="TBDY qt" value={stress(result.qt).toFixed(2)} unit={units.stress} tone="primary"/><Metric label="TBDY q0" value={stress(result.qo).toFixed(2)} unit={units.stress}/><Metric label="Kullanım oranı" value={(result.utilization*100).toFixed(1)} unit="%"/><Metric label="TBDY kontrolü" value={result.adequate?'UYGUN':'YETERSİZ'} tone={result.adequate?'primary':undefined}/></div>
  <div className="dashboard-grid"><div><Card title="PROJE VERİSİ · OKUMA"><Table headers={['Girdi','Değer','Birim']} rows={[['Temel tipi',f.foundationType==='surekli'?'Sürekli':f.foundationType==='radye'?'Radye':'Tekil','—'],['B',f.footingWidth.toFixed(3),'m'],['L',f.footingLength.toFixed(3),'m'],['Df',f.footingDepth.toFixed(3),'m'],['γ doğal',gamma(gamma1).toFixed(3),units.unitWeight],['γsat',gamma(gamma2).toFixed(3),units.unitWeight],['YASS',soil.groundwaterDepth==null?'—':soil.groundwaterDepth.toFixed(3),'m'],['Etkin derinlik',result.effectiveDepth.toFixed(3),'m'],['Eşdeğer c / φ′',`${result.representativeC.toFixed(2)} / ${result.representativePhi.toFixed(2)}`,`${units.stress} / °`],['c / cu',soil.cohesion.toFixed(3),units.stress],['φ′',soil.frictionAngle.toFixed(3),'°'],['N = Bina ağırlığı',force(verticalLoad).toFixed(3),units.force],['Vtx / Vty','Temel kayma modülünde kullanılır','—']]}/></Card></div><div><Card title="TBDY KATSAYI KONTROLLERİ"><Table headers={['Kontrol','Değer','Durum']} rows={[['q₀ ≤ qₜ',`${stress(result.qo).toFixed(2)} ≤ ${stress(result.qt).toFixed(2)} ${units.stress}`,result.adequate?'UYGUN':'YETERSİZ'],['γRv',f.resistanceFactorRv.toFixed(3),'TBDY 2018 Tablo 16.2'],['B′·L′',`${(result.Be*result.Le).toFixed(2)} m²`,'Hesaplandı']]}/></Card></div></div>
  <CalculationTrace title="TBDY 2018 16.8 hesap zinciri" source={SOURCE_NOTES.bearing} rows={trace}/>
 </Frame>
}
