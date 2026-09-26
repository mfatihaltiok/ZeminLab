import { useMemo, useState } from 'react'
import { calculateIdealizedSettlement, type IdealizedSettlementMethod } from '../../core/engineering/idealized-settlement-engine'
import { subgradeReaction } from '../../core/calculations/engineering'
import type { IdealizedSoilProfile } from '../../core/models/idealized-soil-profile'
import type { BoreholeRecord } from '../../core/models/field-data'
import { forceToBase, forceFromBase, stressFromBase, PROJECT_UNIT_LABELS } from '../../core/units/project-units'
import type { SubgradeReactionMethod, SubgradeSoilType } from '../../core/engineering/subgrade-reaction'
import { useProjectInfo } from '../../core/state/project-store'
import { Card, Frame, Metric, Source, Table } from '../workspace/WorkspaceShell'
import { CalculationTrace } from '../components/CalculationTrace'

const finite = (v: number) => Number.isFinite(v) && v !== 0

function ProfileDiagram({ result }: { result: ReturnType<typeof calculateIdealizedSettlement> }) {
  const maxDepth = Math.max(result.layers.at(-1)?.bottomDepth ?? 1, 1)
  const width = 720
  const height = 440
  const top = 52
  const bottom = 410
  const soilHeight = bottom - top
  const y = (depth: number) => top + (depth / maxDepth) * soilHeight
  return (
    <div className="overflow-auto border border-slate-300 bg-white">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="440" role="img" aria-label="Tabaka orta noktaları ve efektif gerilme diyagramı">
        <rect x="0" y="0" width={width} height={height} fill="#fff" />
        <rect x="70" y="20" width="150" height="24" fill="#e5e7eb" stroke="#64748b" />
        <text x="145" y="36" textAnchor="middle" fontSize="12" fontFamily="Segoe UI" fill="#0f172a">TEMEL</text>
        <line x1="70" y1="44" x2="220" y2="44" stroke="#334155" strokeWidth="2" />
        <text x="235" y="48" fontSize="11" fontFamily="Segoe UI" fill="#334155">Temel kotu Df</text>
        {result.layers.map((layer, index) => {
          const yt = y(layer.topDepth)
          const yb = y(layer.bottomDepth)
          const ym = y(layer.midDepth)
          const h = Math.max(yb - yt, 18)
          const fill = index % 2 === 0 ? '#f8fafc' : '#eef2f7'
          return (
            <g key={layer.layerId}>
              <rect x="70" y={yt} width="150" height={h} fill={fill} stroke="#94a3b8" />
              <text x="145" y={yt + Math.min(h / 2 + 4, 20)} textAnchor="middle" fontSize="10" fontFamily="Segoe UI" fill="#0f172a">{layer.soilCode || layer.soilName.slice(0, 18)}</text>
              <line x1="250" y1={ym} x2="315" y2={ym} stroke="#64748b" strokeDasharray="4 3" />
              <circle cx="315" cy={ym} r="4" fill="#0f172a" />
              <text x="325" y={ym - 4} fontSize="10" fontFamily="Segoe UI" fill="#0f172a">zorta = {layer.midDepth.toFixed(2)} m</text>
              <text x="325" y={ym + 11} fontSize="10" fontFamily="Segoe UI" fill="#475569">σ′v0 = {layer.sigmaV0Effective.toFixed(1)} kPa</text>
              <text x="500" y={ym - 4} fontSize="10" fontFamily="Segoe UI" fill="#475569">Δσ′ = {layer.deltaSigma.toFixed(1)} kPa</text>
              <text x="500" y={ym + 11} fontSize="10" fontFamily="Segoe UI" fill="#475569">σ′vf = {layer.sigmaVFinalEffective.toFixed(1)} kPa</text>
            </g>
          )
        })}
        <line x1="55" y1={top} x2="55" y2={bottom} stroke="#64748b" />
        <text x="45" y="31" textAnchor="end" fontSize="10" fontFamily="Segoe UI" fill="#475569">z (m)</text>
      </svg>
    </div>
  )
}

export let latestIdealizedSettlementResult: ReturnType<typeof calculateIdealizedSettlement> | undefined

export function IdealizedSettlementScreen({ profile, boreholes = [] }: { profile?: IdealizedSoilProfile; boreholes?: BoreholeRecord[] }) {
  const p = useProjectInfo()
  const [method, setMethod] = useState<IdealizedSettlementMethod>('burland-burbidge')
  const [ksMethod, setKsMethod] = useState<SubgradeReactionMethod>('erol-plate')
  const [kv1Input, setKv1Input] = useState('')
  const [ksSoilType, setKsSoilType] = useState<SubgradeSoilType>('cohesive')
  const [selected, setSelected] = useState(boreholes[0]?.id ?? '')
  const b = boreholes.find(x => x.id === selected) ?? boreholes[0]
  const f = p.foundationParameters
  const qGross = finite(f.verticalLoad) && finite(f.footingWidth) && finite(f.footingLength)
    ? forceToBase(f.verticalLoad, p.unitSystem) / Math.max(f.footingWidth * f.footingLength, 1e-9)
    : 0

  const result = useMemo(() => {
    if (!profile || profile.status !== 'SABİTLENDİ') return undefined
    return calculateIdealizedSettlement({
      profile,
      method,
      B: f.footingWidth,
      L: f.footingLength,
      Df: f.footingDepth,
      qGross,
      groundwaterDepth: b?.groundwaterDepth,
    })
  }, [profile, method, f.footingWidth, f.footingLength, f.footingDepth, qGross, b?.groundwaterDepth])

  latestIdealizedSettlementResult = result

  const surfaceLayer = profile?.layers.find(x => x.bottomDepth > f.footingDepth)
  const ks = useMemo(() => {
    if (f.footingWidth <= 0 || f.footingLength <= 0) return undefined
    const common = { B: f.footingWidth, L: f.footingLength, method: ksMethod, unitSystem: 'kN-m' as const }
    if (ksMethod === 'q/s') {
      if (!result || result.totalSettlement <= 0 || qGross <= 0) return undefined
      return subgradeReaction({ ...common, q: qGross, settlement: result.totalSettlement / 1000 })
    }
    if (ksMethod === 'elastic') {
      const Es = surfaceLayer?.constrainedModulus ?? surfaceLayer?.oedometricModulus
      if (!Es || Es <= 0) return undefined
      return subgradeReaction({ ...common, Es, nu: surfaceLayer?.poissonRatio ?? 0.30 })
    }
    const kv1Project = Number(kv1Input)
    if (!Number.isFinite(kv1Project) || kv1Project <= 0) return undefined
    return subgradeReaction({
      ...common,
      Kv1: forceToBase(kv1Project, p.unitSystem),
      soilType: ksSoilType
    })
  }, [surfaceLayer, f.footingWidth, f.footingLength, ksMethod, kv1Input, ksSoilType, p.unitSystem, result, qGross])

  const ksMethodLabel: Record<SubgradeReactionMethod, string> = {
    'q/s': 'q/s',
    elastic: 'Elastik yarı-uzay eşdeğeri',
    'erol-plate': 'Erol & Çekinmez 6.8.1'
  }

  const methodLabel: Record<IdealizedSettlementMethod, string> = {
    'burland-burbidge': 'Burland & Burbidge',
    elasticity: 'Elastisite teorisi',
    '2to1-layer': '2:1 + tabaka',
    boussinesq: 'Boussinesq alan integrasyonu',
    janbu: 'Janbu M-integrasyonu',
    schmertmann: 'Schmertmann'
  }

  return (
    <Frame screen="settlement">
      <Source>Oturma hesabı SABİTLENDİ durumundaki İdealize Zemin Profili üzerinden yürütülür. Yöntem seçimi, gerilme yayılımı ve katman sonuçları hesap zincirinde açıkça gösterilir. Eksik parametreler sessizce varsayılmaz.</Source>

      <Card title="OTURMA YÖNTEMİ">
        <div className="form-grid">
          <label>Hesap yöntemi
            <select value={method} onChange={e => setMethod(e.target.value as IdealizedSettlementMethod)}>
              <option value="burland-burbidge">Yöntem 1 · Burland &amp; Burbidge + kilde konsolidasyon</option>
              <option value="elasticity">Yöntem 2 · Elastisite teorisi + kilde konsolidasyon</option>
              <option value="2to1-layer">Yöntem 3 · 2:1 gerilme yayılımı + tabaka</option>
              <option value="boussinesq">Yöntem 4 · Boussinesq dikdörtgen alan integrasyonu</option>
              <option value="janbu">Yöntem 5 · Janbu M-integrasyonu</option>
              <option value="schmertmann">Yöntem 6 · Schmertmann gerinim integrasyonu</option>
            </select>
          </label>
          <label>Sondaj / YASS
            <select value={b?.id ?? ''} onChange={e => setSelected(e.target.value)} disabled={!boreholes.length}>
              <option value="">Sondaj seç</option>
              {boreholes.map(x => <option key={x.id} value={x.id}>{x.name} · YASS {x.groundwaterDepth ?? '—'} m</option>)}
            </select>
          </label>
          <Metric label="Profil durumu" value={profile?.status ?? 'YOK'} />
          <Metric label="Katman" value={profile?.layers.length ?? 0} />
          <Metric label="B" value={f.footingWidth || '—'} unit="m" />
          <Metric label="L" value={f.footingLength || '—'} unit="m" />
          <Metric label="Df" value={f.footingDepth || '—'} unit="m" />
          <Metric label="q" value={qGross ? stressFromBase(qGross, p.unitSystem) : '—'} unit={PROJECT_UNIT_LABELS.stress} />
        </div>
      </Card>

      {!profile ? (
        <Card title="İDEALİZE PROFİL BEKLENİYOR"><div className="inline-empty">Önce SPT/laboratuvar verilerinden İdealize Zemin Profili oluşturulmalıdır.</div></Card>
      ) : profile.status !== 'SABİTLENDİ' ? (
        <Card title="PROFİL SABİTLENMEDİ"><div className="inline-empty">Oturma hesabı için İdealize Zemin Profili'nin mühendis tarafından kontrol edilip SABİTLENDİ durumuna alınması gerekir.</div></Card>
      ) : !result ? (
        <Card title="HESAP İÇİN VERİ BEKLENİYOR"><div className="inline-empty">Temel geometrisi, yük ve zemin profili verileri kontrol edilmelidir.</div></Card>
      ) : (
        <>
          {result.warnings.length > 0 && <Card title="HESAP NOTLARI"><div className="inline-empty">{result.warnings.join(' ')}</div></Card>}
          <div className="metric-strip">
            <Metric label="Ani oturma" value={result.totalImmediate.toFixed(2)} unit="mm" />
            <Metric label="Konsolidasyon" value={result.totalConsolidation.toFixed(2)} unit="mm" />
            <Metric label="Toplam" value={result.totalSettlement.toFixed(2)} unit="mm" tone="primary" />
            <Metric label="σ′v0 @ Df" value={result.foundationEffectiveStress.toFixed(2)} unit="kPa" />
            <Metric label="qnet" value={result.netFoundationPressure.toFixed(2)} unit="kPa" />
            <Metric label="zI" value={result.influenceDepth.toFixed(2)} unit="m" />
            {ks && <Metric label="ks" value={ks.ks.toFixed(2)} unit="kN/m³" />}
          </div>

          <Card title="ZEMİN YATAK KATSAYISI · ks">
            <div className="form-grid">
              <label>Yatak katsayısı yöntemi
                <select value={ksMethod} onChange={e => setKsMethod(e.target.value as SubgradeReactionMethod)}>
                  <option value="q/s">Yöntem 1 · q/s</option>
                  <option value="elastic">Yöntem 2 · Elastik yarı-uzay eşdeğeri</option>
                  <option value="erol-plate">Yöntem 3 · Erol &amp; Çekinmez · Plaka yükleme</option>
                </select>
              </label>
              {ksMethod === 'erol-plate' && <>
                <label>Kv1 · 30×30 cm plaka deneyi
                  <input type="number" min="0" step="any" value={kv1Input} onChange={e => setKv1Input(e.target.value)} placeholder={p.unitSystem === 'kN-m' ? 'kN/m³' : 'tonf/m³'} />
                </label>
                <label>Zemin tipi
                  <select value={ksSoilType} onChange={e => setKsSoilType(e.target.value as SubgradeSoilType)}>
                    <option value="cohesive">Kohezyonlu</option>
                    <option value="cohesionless">Kohezyonsuz</option>
                  </select>
                </label>
              </>}
              <Metric label="Sonuç" value={ks ? forceFromBase(ks.ks, p.unitSystem).toFixed(3) : '—'} unit={p.unitSystem === 'kN-m' ? 'kN/m³' : 'tonf/m³'} />
            </div>
            <div className="inline-empty">
              {ksMethod === 'erol-plate'
                ? 'Erol & Çekinmez (2014) Bölüm 6.8.1: Kv1, 30×30 cm plaka yükleme deneyinden alınır; ardından temel boyutuna göre Denk. 6.15a, 6.15b veya 6.16 uygulanır.'
                : ksMethod === 'q/s'
                  ? 'Winkler yaklaşımı: ks = q/s. Buradaki q ve s, seçilen hesap zincirindeki temel basıncı ve toplam oturmayı temsil eder.'
                  : 'Es tabanlı elastik yarı-uzay yaklaşımı yardımcı yöntemdir; yönetmelikte tek başına zorunlu ks değeri değildir.'}
            </div>
          </Card>

          <Card title="TABAKA ORTA NOKTALARI · EFEKTİF GERİLMELER">
            <ProfileDiagram result={result} />
          </Card>

          <Card title={`TABAKA BAZINDA OTURMA · ${methodLabel[method]}`}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Zemin</th><th>Üst</th><th>Alt</th><th>zorta</th><th>σ′v0</th><th>Δσ′</th><th>σ′vf</th><th>Ani</th><th>Kons.</th><th>Durum</th></tr></thead>
                <tbody>{result.layers.map(l => <tr key={l.layerId}>
                  <td>{l.order}</td><td>{l.soilName}</td><td>{l.topDepth.toFixed(2)}</td><td>{l.bottomDepth.toFixed(2)}</td><td>{l.midDepth.toFixed(2)}</td>
                  <td>{l.sigmaV0Effective.toFixed(1)}</td><td>{l.deltaSigma.toFixed(1)}</td><td>{l.sigmaVFinalEffective.toFixed(1)}</td>
                  <td>{l.immediateSettlement.toFixed(2)}</td><td>{l.consolidationSettlement.toFixed(2)}</td><td>{l.status}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </Card>

          <div className="dashboard-grid">
            <Card title="YATAK KATSAYISI SONUCU">
              {ks ? (
                <Table headers={['Parametre','Değer','Birim']} rows={[
                  ['Yöntem', ks.method, ''],
                  ['B', f.footingWidth.toFixed(3), 'm'],
                  ['L', f.footingLength.toFixed(3), 'm'],
                  ['ks', forceFromBase(ks.ks, p.unitSystem).toFixed(3), p.unitSystem === 'kN-m' ? 'kN/m³' : 'tonf/m³'],
                  ['Proje birimi', p.unitSystem === 'kN-m' ? 'kN/m³' : 'tonf/m³', '']
                ]} />
              ) : <div className="inline-empty">Seçilen yatak katsayısı yöntemi için gerekli veriler girilmelidir.</div>}
            </Card>
            <Card title="HESAP YÖNTEMİ / KAYNAK">
              <div className="inline-empty">Aktif oturma yöntemi: <b>{methodLabel[method]}</b>. Yatak katsayısı: <b>{ksMethodLabel[ksMethod]}</b>. Katman gerilmeleri orta nokta yaklaşımıyla raporlanır. Taşıma gücü, oturma ve yatak katsayısı sonuçları proje verileriyle birlikte değerlendirilmelidir.</div>
            </Card>
          </div>

          <CalculationTrace title="Oturma hesap zinciri" source={result.source} rows={[
            { symbol: 'σ′v0', title: 'Temel tabanındaki efektif gerilme', formula: 'ΣγH − u', value: result.foundationEffectiveStress, unit: 'kPa' },
            { symbol: 'qnet', title: 'Net temel gerilmesi', formula: 'max(0.1q, q − σ′v0)', value: result.netFoundationPressure, unit: 'kPa' },
            { symbol: 'zI', title: 'Etki derinliği', formula: method === 'burland-burbidge' ? 'Burland-Burbidge bağıntısı' : method === 'boussinesq' ? 'Δσv/q = 0.10 kriteri; Boussinesq alan integrasyonu' : 'Profil/gerilme yayılımı sınırı', value: result.influenceDepth, unit: 'm' },
            { symbol: 'sᵢ', title: 'Toplam ani oturma', formula: method === 'burland-burbidge' ? 'Σ[fS·fL·Ic·qnet·B^0.7]' : method === 'elasticity' ? 'Σ[(Δσ′/E)·H·(1−ν²)]' : method === '2to1-layer' ? 'Σ[Δσ₂:₁·H/E]' : method === 'boussinesq' ? 'Σ[ΔσBoussinesq·H/E]' : method === 'janbu' ? 'Σ[Δσ′·H/M]' : 'Σ[C1·C2·q·Iz/Es·Δz]', value: result.totalImmediate, unit: 'mm' },
            { symbol: 's꜀', title: 'Toplam konsolidasyon', formula: 'Σ[Cc/(1+e₀)·H·log10(σ′vf/σ′v0)]', value: result.totalConsolidation, unit: 'mm' },
            { symbol: 'sₜ', title: 'Toplam oturma', formula: 'sₜ = sᵢ + s꜀', value: result.totalSettlement, unit: 'mm' },
            ...(ks ? [{ symbol: 'ks', title: 'Winkler yatak katsayısı', formula: ks.formula, value: ks.ks, unit: 'kN/m³' }] : [])
          ]} />
        </>
      )}
    </Frame>
  )
}
