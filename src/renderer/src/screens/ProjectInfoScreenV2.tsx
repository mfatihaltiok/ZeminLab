import { updateProjectInfo, useProjectInfo } from '../../../core/state/project-store'
import { classifyVs30, type SoilClassificationCode } from '../../../core/models/project'
import { Card, Field, Frame } from '../workspace/WorkspaceShell'

const descriptions: Record<SoilClassificationCode, string> = { CIL: 'Düşük plastisiteli kil', CIM: 'Orta plastisiteli kil', CIH: 'Yüksek plastisiteli kil', SiL: 'Düşük plastisiteli silt', SiM: 'Orta plastisiteli silt', SiH: 'Yüksek plastisiteli silt', ZA: 'Sağlam, sert kaya', ZB: 'Az ayrışmış, orta sağlam kaya', ZC: 'Çok sıkı kum-çakıl / sert kil veya zayıf kaya', ZD: 'Orta sıkı-sıkı kum-çakıl / çok katı kil', ZE: 'Gevşek kum-çakıl / yumuşak-katı kil', ZF: 'Sahaya özel araştırma ve değerlendirme gerektirir' }
const n = (v: string) => v === '' ? 0 : Number(v)

export function ProjectInfoScreenV2() {
  const p = useProjectInfo()
  const foundation = p.foundationParameters
  const set = <K extends keyof typeof p>(key: K, value: (typeof p)[K]) => updateProjectInfo({ ...p, [key]: value })
  const vs30Group = classifyVs30(p.geophysical.vs30)
  const updateSeismic = (key: keyof typeof p.seismic, value: string) => set('seismic', { ...p.seismic, [key]: value === '' ? undefined : Number(value) })

  return <Frame screen="project-info">
    <div className="project-info-layout">
      <Card title="PROJE KİMLİĞİ">
        <div className="form-grid project-identity-grid">
          <Field label="Proje Adı" type="text" value={p.title} onChange={(v) => set('title', v)} />
          <Field label="İl" type="text" value={p.province} onChange={(v) => set('province', v)} />
          <Field label="İlçe" type="text" value={p.district} onChange={(v) => set('district', v)} />
          <Field label="Mahalle" type="text" value={p.location} onChange={(v) => set('location', v)} />
          <Field label="Pafta" type="text" value={p.pafta} onChange={(v) => set('pafta', v)} />
          <Field label="Ada" type="text" value={p.ada} onChange={(v) => set('ada', v)} />
          <Field label="Parsel" type="text" value={p.parsel} onChange={(v) => set('parsel', v)} />
          <Field label="Yapı Türü" type="text" value={p.buildingType} onChange={(v) => set('buildingType', v)} />
          <Field label="İmar Durumu" type="text" value={p.zoningStatus} onChange={(v) => set('zoningStatus', v)} />
          <Field label="Kat Sayısı" type="number" value={p.normalFloorCount || ''} onChange={(v) => set('normalFloorCount', n(v))} />
          <Field label="Bodrum Sayısı" type="number" value={p.basementCount || ''} onChange={(v) => set('basementCount', n(v))} />
        </div>
      </Card>

      <Card title="JEOFİZİK · Vs30">
        <div className="geophysics-panel">
          <div className="vs30-input"><Field label="Vs30 (m/s)" value={p.geophysical.vs30 ?? ''} onChange={(v) => set('geophysical', { ...p.geophysical, vs30: v === '' ? undefined : Number(v), soilGroup: classifyVs30(v === '' ? undefined : Number(v)) })} /></div>
          <div className="vs30-result"><span>Otomatik TBDY 2018 zemin grubu</span><strong>{vs30Group ?? '—'}</strong><small>{vs30Group ? descriptions[vs30Group] : 'Vs30 girildiğinde otomatik belirlenir.'}</small></div>
        </div>
        <div className="classification-note">ZF, yalnızca özel saha araştırması ve değerlendirmesiyle belirlenebildiğinden Vs30 tek başına ZF ataması yapmaz.</div>
      </Card>

      <Card title="HAZIR DEPREM TEHLİKE PARAMETRELERİ">
        <div className="form-grid">
          <Field label="Ss" value={p.seismic.ss ?? ''} onChange={(v) => updateSeismic('ss', v)} />
          <Field label="S1" value={p.seismic.s1 ?? ''} onChange={(v) => updateSeismic('s1', v)} />
          <Field label="Fs" value={p.seismic.fs ?? ''} onChange={(v) => updateSeismic('fs', v)} />
          <Field label="F1" value={p.seismic.f1 ?? ''} onChange={(v) => updateSeismic('f1', v)} />
          <Field label="Sıvılaşma deprem büyüklüğü Mw" value={p.seismic.magnitude ?? ''} onChange={(v) => updateSeismic('magnitude', v)} />
        </div>
        <div className="classification-note">Ss, S1, Fs ve F1 hazır tehlike girdileridir. Mw yalnızca SPT tabanlı sıvılaşma değerlendirmesi için kullanılan ayrı bir proje girdisidir.</div>
      </Card>

      <Card title="ÜST YAPI TEMEL BİLGİLERİ">
        <div className="form-grid foundation-input-grid">
          <Field label="Temel Genişliği B (m)" value={foundation.footingWidth || ''} onChange={(v) => set('foundationParameters', { ...foundation, footingWidth: n(v) })} />
          <Field label="Temel Uzunluğu L (m)" value={foundation.footingLength || ''} onChange={(v) => set('foundationParameters', { ...foundation, footingLength: n(v) })} />
          <Field label="Vt(x)" value={foundation.vtX || ''} onChange={(v) => set('foundationParameters', { ...foundation, vtX: n(v) })} />
          <Field label="Vt(y)" value={foundation.vtY || ''} onChange={(v) => set('foundationParameters', { ...foundation, vtY: n(v) })} />
          <Field label="Yapı Ağırlığı" value={foundation.structuralWeight || ''} onChange={(v) => set('foundationParameters', { ...foundation, structuralWeight: n(v) })} />
          <Field label="Mx Moment" value={foundation.momentX || ''} onChange={(v) => set('foundationParameters', { ...foundation, momentX: n(v) })} />
          <Field label="My Moment" value={foundation.momentY || ''} onChange={(v) => set('foundationParameters', { ...foundation, momentY: n(v) })} />
        </div>
        <div className="classification-note structure-weight-note">Yapı Ağırlığı: G + Q kombinasyonundan alınan toplam yapı ağırlığı.</div>
      </Card>
    </div>
  </Frame>
}
