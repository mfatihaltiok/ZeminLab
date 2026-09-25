import { updateProjectInfo, useProjectInfo } from '../../../core/state/project-store'
import { classifyVs30, determineDts, calculateSdsSeismic, type SoilClassificationCode, type FoundationType, type UnitSystem, type BuildingUseClass } from '../../../core/models/project'
import { projectUnits } from '../../../core/units/project-units'
import { Card, Field, Frame, Metric } from '../workspace/WorkspaceShell'

const descriptions:Record<SoilClassificationCode,string>={
  CIL:'Düşük plastisiteli kil',CIM:'Orta plastisiteli kil',CIH:'Yüksek plastisiteli kil',
  SiL:'Düşük plastisiteli silt',SiM:'Orta plastisiteli silt',SiH:'Yüksek plastisiteli silt',
  ZA:'Sağlam/sert kaya',ZB:'Az ayrışmış, orta sağlam kaya',ZC:'Çok sıkı kum-çakıl / sert kil veya zayıf kaya',
  ZD:'Orta sıkı-sıkı kum-çakıl / çok katı kil',ZE:'Gevşek kum-çakıl / yumuşak-katı kil',ZF:'Özel saha araştırması gerekir'
}
const num=(v:string)=>v===''?0:Number(v)

export function ProjectInfoScreenV2(){
  const p=useProjectInfo(),f=p.foundationParameters,soil=p.soilParameters,units=projectUnits(p.unitSystem)
  const setProject=(patch:Partial<typeof p>)=>updateProjectInfo({...p,...patch})
  const setFoundation=(patch:Partial<typeof f>)=>setProject({foundationParameters:{...f,...patch}})
  const setSoil=(patch:Partial<typeof soil>)=>setProject({soilParameters:{...soil,...patch}})
  const setSeismic=(patch:Partial<typeof p.seismic>)=>setProject({seismic:{...p.seismic,...patch}})
  const vs30Group=classifyVs30(p.geophysical.vs30)
  const sds=p.seismic.sds??calculateSdsSeismic(p.seismic.ss,p.seismic.fs)
  const dts=p.seismic.dts??determineDts(sds,p.seismic.bks)

  return <Frame screen="project-info">
    <div className="project-info-layout">
      <Card title="PROJE KİMLİĞİ">
        <div className="form-grid project-identity-grid">
          <Field label="Proje Adı" type="text" value={p.title} onChange={v=>setProject({title:v})}/>
          <Field label="İl" type="text" value={p.province} onChange={v=>setProject({province:v})}/>
          <Field label="İlçe" type="text" value={p.district} onChange={v=>setProject({district:v})}/>
          <Field label="Mahalle" type="text" value={p.location} onChange={v=>setProject({location:v})}/>
          <Field label="Pafta" type="text" value={p.pafta} onChange={v=>setProject({pafta:v})}/>
          <Field label="Ada" type="text" value={p.ada} onChange={v=>setProject({ada:v})}/>
          <Field label="Parsel" type="text" value={p.parsel} onChange={v=>setProject({parsel:v})}/>
          <Field label="Yapı Türü" type="text" value={p.buildingType} onChange={v=>setProject({buildingType:v})}/>
          <Field label="İmar Durumu" type="text" value={p.zoningStatus} onChange={v=>setProject({zoningStatus:v})}/>
          <Field label="Kat Sayısı" type="number" value={p.normalFloorCount||''} onChange={v=>setProject({normalFloorCount:num(v)})}/>
          <Field label="Bodrum Sayısı" type="number" value={p.basementCount||''} onChange={v=>setProject({basementCount:num(v)})}/>
        </div>
      </Card>

      <Card title="PROJE BİRİM SİSTEMİ">
        <div className="form-grid">
          <label>Hesap birim sistemi<select value={p.unitSystem} onChange={e=>setProject({unitSystem:e.target.value as UnitSystem})}><option value="ton-m">Ton - m</option><option value="kN-m">kN - m</option></select></label>
          <div className="classification-note"><b>Aktif:</b> {units.force}, {units.stress}, {units.unitWeight}, {units.moment}</div>
        </div>
      </Card>

      <Card title="JEOFİZİK · TBDY ZEMİN GRUBU">
        <div className="form-grid">
          <Field label="Vs30 (m/s)" value={p.geophysical.vs30??''} onChange={v=>setProject({geophysical:{...p.geophysical,vs30:v===''?undefined:Number(v),soilGroup:classifyVs30(v===''?undefined:Number(v))}})}/>
          <Metric label="Otomatik grup" value={vs30Group??'—'}/>
          <Metric label="Tanım" value={vs30Group?descriptions[vs30Group]:'Vs30 bekleniyor'}/>
        </div>
        <div className="classification-note">ZF otomatik atanmaz; 16.5.1.3 gereği sahaya özel zemin davranış analizi gerekir.</div>
      </Card>

      <Card title="DEPREM TASARIM PARAMETRELERİ">
        <div className="form-grid">
          <Field label="Ss" value={p.seismic.ss??''} onChange={v=>setSeismic({ss:v===''?undefined:Number(v)})}/>
          <Field label="S1" value={p.seismic.s1??''} onChange={v=>setSeismic({s1:v===''?undefined:Number(v)})}/>
          <Field label="Fs" value={p.seismic.fs??''} onChange={v=>setSeismic({fs:v===''?undefined:Number(v)})}/>
          <Field label="F1" value={p.seismic.f1??''} onChange={v=>setSeismic({f1:v===''?undefined:Number(v)})}/>
          <Field label="Sıvılaşma Mw" value={p.seismic.magnitude??''} onChange={v=>setSeismic({magnitude:v===''?undefined:Number(v)})}/>
          <label>Bina Kullanım Sınıfı BKS<select value={p.seismic.bks??2} onChange={e=>setSeismic({bks:Number(e.target.value) as BuildingUseClass})}><option value="1">BKS=1</option><option value="2">BKS=2</option><option value="3">BKS=3</option></select></label>
          <Metric label="SDS" value={sds!=null?sds.toFixed(3):'—'}/>
          <Metric label="DTS" value={dts??'—'}/>
        </div>
        <div className="classification-note">DTS, TBDY Bölüm 3 Tablo 3.2'ye göre BKS ve SDS'den otomatik türetilir. ZF için hazır Fs/F1 kullanımı yerine saha özel analiz yolu ayrıca uygulanmalıdır.</div>
      </Card>

      <Card title="TEMEL VE YÜKLEME">
        <div className="form-grid foundation-input-grid">
          <label>Temel tipi<select value={f.foundationType} onChange={e=>setFoundation({foundationType:e.target.value as FoundationType})}><option value="tekil">Tekil temel</option><option value="surekli">Sürekli (şerit) temel</option><option value="radye">Radye temel</option></select></label>
          <Field label="B (m)" value={f.footingWidth||''} onChange={v=>setFoundation({footingWidth:num(v)})}/>
          <Field label="L (m)" value={f.footingLength||''} onChange={v=>setFoundation({footingLength:num(v)})}/>
          <Field label="Df (m)" value={f.footingDepth||''} onChange={v=>setFoundation({footingDepth:num(v)})}/>
          <Field label={"G+Q ("+units.force+")"} value={f.structuralWeight||''} onChange={v=>setFoundation({structuralWeight:num(v),verticalLoad:num(v)})}/>
          <Field label={"Vtx ("+units.force+")"} value={f.vtX||''} onChange={v=>setFoundation({vtX:num(v),horizontalLoad:Math.hypot(num(v),f.vtY)})}/>
          <Field label={"Vty ("+units.force+")"} value={f.vtY||''} onChange={v=>setFoundation({vtY:num(v),horizontalLoad:Math.hypot(f.vtX,num(v))})}/>
          <Field label={"Mx ("+units.moment+")"} value={f.momentX||''} onChange={v=>setFoundation({momentX:num(v)})}/>
          <Field label={"My ("+units.moment+")"} value={f.momentY||''} onChange={v=>setFoundation({momentY:num(v)})}/>
        </div>
      </Card>

      <Card title="TEMEL TABANI · KAYMA PARAMETRELERİ">
        <div className="form-grid">
          <Field label="tanδ ≤ 0.60" value={f.baseFrictionTanDelta??0.6} onChange={v=>setFoundation({baseFrictionTanDelta:num(v)})}/>
          <Field label={"Karakteristik pasif direnç Rpk ("+units.force+")"} value={f.passiveResistanceCharacteristic??0} onChange={v=>setFoundation({passiveResistanceCharacteristic:num(v)})}/>
          <label>Pasif direnç kredisi<select value={f.usePassiveResistance?'yes':'no'} onChange={e=>setFoundation({usePassiveResistance:e.target.value==='yes'})}><option value="no">Kullanma</option><option value="yes">Kullan</option></select></label>
          <Field label={"Drenajsız Cu ("+units.stress+")"} value={soil.undrainedCohesion??''} onChange={v=>setSoil({undrainedCohesion:v===''?undefined:num(v)})}/>
          <Metric label="γRv" value="1.40"/>
          <Metric label="γRh" value="1.10"/>
          <Metric label="γRp" value="1.40"/>
        </div>
        <div className="classification-note">Temel YASS altında/aynı kotta ise TBDY 16.8.4.6 gereği deprem sürtünme direnci Cu ile hesaplanır.</div>
      </Card>

      <Card title="ZEMİN PARAMETRELERİ">
        <div className="form-grid">
          <Field label={"γ doğal ("+units.unitWeight+")"} value={soil.unitWeight||''} onChange={v=>setSoil({unitWeight:num(v)})}/>
          <Field label={"γsat ("+units.unitWeight+")"} value={soil.saturatedUnitWeight||''} onChange={v=>setSoil({saturatedUnitWeight:num(v)})}/>
          <Field label={"c′ ("+units.stress+")"} value={soil.cohesion||''} onChange={v=>setSoil({cohesion:num(v)})}/>
          <Field label="φ′ (°)" value={soil.frictionAngle||''} onChange={v=>setSoil({frictionAngle:num(v)})}/>
          <Field label="YASS (m)" value={soil.groundwaterDepth??''} onChange={v=>setSoil({groundwaterDepth:v===''?undefined:num(v)})}/>
          <Field label="Arazi eğimi β (°)" value={soil.surfaceSlope||''} onChange={v=>setSoil({surfaceSlope:num(v)})}/>
          <Field label="Temel tabanı eğimi θ (°)" value={soil.foundationBaseSlope||''} onChange={v=>setSoil({foundationBaseSlope:num(v)})}/>
        </div>
      </Card>
    </div>
  </Frame>
}
