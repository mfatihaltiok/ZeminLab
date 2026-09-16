import { updateProjectInfo, useProjectInfo } from '../../../core/state/project-store'
import type { SoilClassificationCode, SoilClassificationSystem } from '../../../core/models/project'
import { Card, Field, Frame, Source } from '../workspace/WorkspaceShell'

const descriptions: Record<SoilClassificationCode, string> = {
  CIL: 'Düşük plastisiteli kil', CIM: 'Orta plastisiteli kil', CIH: 'Yüksek plastisiteli kil',
  SiL: 'Düşük plastisiteli silt', SiM: 'Orta plastisiteli silt', SiH: 'Yüksek plastisiteli silt',
  ZA: 'Sağlam, sert kayalar', ZB: 'Az ayrışmış, orta sağlam kayalar',
  ZC: 'Çok sıkı kum-çakıl ve sert kil veya ayrışmış çok çatlaklı zayıf kayalar',
  ZD: 'Orta sıkı-sıkı kum-çakıl veya çok katı kil', ZE: 'Gevşek kum-çakıl veya yumuşak-katı kil',
  ZF: 'Sahaya özel araştırma ve değerlendirme gerektiren zeminler'
}
const isoCodes: SoilClassificationCode[] = ['CIL','CIM','CIH','SiL','SiM','SiH']
const tbdyCodes: SoilClassificationCode[] = ['ZA','ZB','ZC','ZD','ZE','ZF']

export function ProjectInfoScreenV2() {
  const p = useProjectInfo()
  const set = <K extends keyof typeof p>(key: K, value: (typeof p)[K]) => updateProjectInfo({ ...p, [key]: value })
  const soil = p.soilParameters
  const foundation = p.foundationParameters
  const system = soil.classification?.system ?? 'TS EN ISO 14688-2'
  const codes = system === 'TS EN ISO 14688-2' ? isoCodes : tbdyCodes
  const code = codes.includes(soil.classification?.code) ? soil.classification.code : codes[0]

  return <Frame screen="project-info">
    <Source>Ortak proje verileri burada tanımlanır. YASS bu ekrana ait değildir; Sondaj/SPT ekranında kuyu bazında tutulur ve ilgili hesaplara aktarılır.</Source>
    <div className="dashboard-grid">
      <div>
        <Card title="PROJE KİMLİĞİ"><div className="form-grid">
          <Field label="Proje Adı" type="text" value={p.title} onChange={(v) => set('title', v)} />
          <Field label="Proje No" type="text" value={p.projectNo} onChange={(v) => set('projectNo', v)} />
          <Field label="Tarih" type="date" value={p.date} onChange={(v) => set('date', v)} />
          <Field label="Mühendis" type="text" value={p.engineer} onChange={(v) => set('engineer', v)} />
          <Field label="Firma" type="text" value={p.firmName} onChange={(v) => set('firmName', v)} />
          <Field label="İşveren" type="text" value={p.clientName} onChange={(v) => set('clientName', v)} />
          <Field label="İl" type="text" value={p.province} onChange={(v) => set('province', v)} />
          <Field label="İlçe" type="text" value={p.district} onChange={(v) => set('district', v)} />
          <Field label="Adres" type="text" value={p.address} onChange={(v) => set('address', v)} />
          <Field label="Ada / Parsel" type="text" value={p.parcelInfo} onChange={(v) => set('parcelInfo', v)} />
          <Field label="Yapı Türü" type="text" value={p.buildingType} onChange={(v) => set('buildingType', v)} />
          <Field label="Kat" type="number" value={p.normalFloorCount} onChange={(v) => set('normalFloorCount', Number(v))} />
          <Field label="Bodrum Katı" type="number" value={p.basementCount} onChange={(v) => set('basementCount', Number(v))} />
        </div></Card>

        <Card title="ZEMİN SINIFLANDIRMA SİSTEMİ"><div className="form-grid">
          <label>Sistem<select value={system} onChange={(e) => { const next = e.target.value as SoilClassificationSystem; const nextCodes = next === 'TS EN ISO 14688-2' ? isoCodes : tbdyCodes; set('soilParameters', { ...soil, classification: { system: next, code: nextCodes[0] } }) }}>
            <option value="TS EN ISO 14688-2">TS EN ISO 14688-2</option>
            <option value="TBDY 2018">TBDY 2018 · Yerel Zemin Sınıfı</option>
          </select></label>
          <label>Sınıflandırma Kodu<select value={code} onChange={(e) => set('soilParameters', { ...soil, classification: { ...soil.classification, code: e.target.value as SoilClassificationCode } })}>{codes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Açıklama<input value={descriptions[code]} readOnly /></label>
        </div></Card>

        <Card title="ZEMİN TASARIM PARAMETRELERİ"><div className="form-grid">
          <Field label="γ · doğal birim hacim ağırlık (kN/m³)" value={soil.unitWeight} onChange={(v) => set('soilParameters', { ...soil, unitWeight: Number(v) })} />
          <Field label="γsat · doygun birim hacim ağırlık (kN/m³)" value={soil.saturatedUnitWeight} onChange={(v) => set('soilParameters', { ...soil, saturatedUnitWeight: Number(v) })} />
          <Field label="c / cu · kohezyon veya drenajsız dayanım (kPa)" value={soil.cohesion} onChange={(v) => set('soilParameters', { ...soil, cohesion: Number(v) })} />
          <Field label="φ′ · içsel sürtünme açısı (°)" value={soil.frictionAngle} onChange={(v) => set('soilParameters', { ...soil, frictionAngle: Number(v) })} />
          <Field label="β · zemin yüzey eğimi (°)" value={soil.surfaceSlope} onChange={(v) => set('soilParameters', { ...soil, surfaceSlope: Number(v) })} />
          <Field label="η · temel tabanı eğimi (°)" value={soil.foundationBaseSlope} onChange={(v) => set('soilParameters', { ...soil, foundationBaseSlope: Number(v) })} />
          <Field label="İnce dane oranı (%)" value={soil.finesContent} onChange={(v) => set('soilParameters', { ...soil, finesContent: Number(v) })} />
        </div></Card>
      </div>
      <div>
        <Card title="TEMEL TASARIM PARAMETRELERİ"><div className="form-grid">
          <Field label="B · temel genişliği (m)" value={foundation.footingWidth} onChange={(v) => set('foundationParameters', { ...foundation, footingWidth: Number(v) })} />
          <Field label="L · temel uzunluğu (m)" value={foundation.footingLength} onChange={(v) => set('foundationParameters', { ...foundation, footingLength: Number(v) })} />
          <Field label="Df · temel derinliği (m)" value={foundation.footingDepth} onChange={(v) => set('foundationParameters', { ...foundation, footingDepth: Number(v) })} />
          <Field label="γRv · dayanım katsayısı" value={foundation.resistanceFactorRv} onChange={(v) => set('foundationParameters', { ...foundation, resistanceFactorRv: Number(v) })} />
          <Field label="N / Fz · düşey tasarım yükü (kN)" value={foundation.verticalLoad} onChange={(v) => set('foundationParameters', { ...foundation, verticalLoad: Number(v) })} />
          <Field label="V · yatay tasarım yükü (kN)" value={foundation.horizontalLoad} onChange={(v) => set('foundationParameters', { ...foundation, horizontalLoad: Number(v) })} />
          <Field label="Mx · moment (kNm)" value={foundation.momentX} onChange={(v) => set('foundationParameters', { ...foundation, momentX: Number(v) })} />
          <Field label="My · moment (kNm)" value={foundation.momentY} onChange={(v) => set('foundationParameters', { ...foundation, momentY: Number(v) })} />
          <Field label="FS" value={foundation.safetyFactor} onChange={(v) => set('foundationParameters', { ...foundation, safetyFactor: Number(v) })} />
        </div></Card>
        <Card title="VERİ AKIŞI"><div className="workflow">
          <button type="button"><b>01</b><span>Proje bilgileri ve ortak zemin/temel girdileri</span></button>
          <button type="button"><b>02</b><span>Sondaj, YASS, SPT ve laboratuvar</span></button>
          <button type="button"><b>03</b><span>Zemin profili ve gerilme durumu</span></button>
          <button type="button"><b>04</b><span>Deprem parametreleri</span></button>
          <button type="button"><b>05</b><span>TBDY 16.8.3 taşıma gücü</span></button>
          <button type="button"><b>06</b><span>Oturma, sıvılaşma ve temel kontrolleri</span></button>
        </div></Card>
      </div>
    </div>
  </Frame>
}
