import { useMemo, useState } from 'react'
import { calculateIdealizedSettlement, type IdealizedSettlementMethod } from '../../core/engineering/idealized-settlement-engine'
import type { IdealizedSoilProfile } from '../../core/models/idealized-soil-profile'
import type { BoreholeRecord } from '../../core/models/field-data'
import { forceToBase, stressToBase, stressFromBase, PROJECT_UNIT_LABELS } from '../../core/units/project-units'
import { useProjectInfo } from '../../core/state/project-store'
import { Card, Frame, Metric, Source } from '../workspace/WorkspaceShell'
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

export function IdealizedSettlementScreen({ profile, boreholes = [] }: { profile?: IdealizedSoilProfile; boreholes?: BoreholeRecord[] }) {
  const p = useProjectInfo()
  const [method, setMethod] = useState<IdealizedSettlementMethod>('burland-burbidge')
  const [selected, setSelected] = useState(boreholes[0]?.id ?? '')
  const b = boreholes.find(x => x.id === selected) ?? boreholes[0]
  const f = p.foundationParameters
  const qGross = finite(f.verticalLoad) && finite(f.footingWidth) && finite(f.footingLength)
    ? stressToBase(forceToBase(f.verticalLoad, p.unitSystem) / Math.max(f.footingWidth * f.footingLength, 1e-9), p.unitSystem)
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

  return (
    <Frame screen="settlement">
      <Source>Oturma hesabı yalnızca SABİTLENDİ durumundaki İdealize Zemin Profili üzerinden yürütülür. Eski Zemin Etüdü/Jet Grout yazılımındaki Burland &amp; Burbidge ve tabaka bazlı gerilme yaklaşımı yeni motora taşınmıştır.</Source>

      <Card title="OTURMA YÖNTEMİ">
        <div className="form-grid">
          <label>Hesap yöntemi
            <select value={method} onChange={e => setMethod(e.target.value as IdealizedSettlementMethod)}>
              <option value="burland-burbidge">Yöntem 1 · Burland &amp; Burbidge + kilde konsolidasyon</option>
              <option value="elasticity">Yöntem 2 · Elastisite teorisi + kilde konsolidasyon</option>
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
          </div>

          <Card title="TABAKA ORTA NOKTALARI · EFEKTİF GERİLMELER">
            <ProfileDiagram result={result} />
          </Card>

          <Card title="TABAKA BAZINDA OTURMA HESABI">
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

          <CalculationTrace title="Oturma hesap zinciri" source={result.source} rows={[
            { symbol: 'σ′v0', title: 'Temel tabanındaki efektif gerilme', formula: 'ΣγH − u', value: result.foundationEffectiveStress, unit: 'kPa' },
            { symbol: 'qnet', title: 'Net temel gerilmesi', formula: 'max(0.1q, q − σ′v0)', value: result.netFoundationPressure, unit: 'kPa' },
            { symbol: 'zI', title: 'Burland etki derinliği', formula: 'zI = B^0.76 (B ≤ 30 m)', value: result.influenceDepth, unit: 'm' },
            { symbol: 'sᵢ', title: 'Toplam ani oturma', formula: method === 'burland-burbidge' ? 'Σ[fS·fL·Ic·qnet·B^0.7]' : 'Σ[(Δσ′/E)·H·(1−ν²)]', value: result.totalImmediate, unit: 'mm' },
            { symbol: 's꜀', title: 'Toplam konsolidasyon', formula: 'Σ[Cc/(1+e₀)·H·log10(σ′vf/σ′v0)]', value: result.totalConsolidation, unit: 'mm' },
            { symbol: 'sₜ', title: 'Toplam oturma', formula: 'sₜ = sᵢ + s꜀', value: result.totalSettlement, unit: 'mm' },
          ]} />
        </>
      )}
    </Frame>
  )
}
