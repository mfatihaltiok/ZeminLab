import { useMemo, useState } from 'react'
import { bearingCapacity, SOURCE_NOTES, type BearingMethod } from '../../../core/calculations/engineering'
import { Card, Field, Frame, Metric, Source, Table } from '../workspace/WorkspaceShell'

const methods: BearingMethod[] = ['Terzaghi', 'Meyerhof', 'Hansen', 'Vesic']

export function BearingCapacityScreen() {
  const [method, setMethod] = useState<BearingMethod>('Terzaghi')
  const [B, setB] = useState(2.5)
  const [L, setL] = useState(2.5)
  const [Df, setDf] = useState(1.5)
  const [gamma, setGamma] = useState(18)
  const [c, setC] = useState(25)
  const [phi, setPhi] = useState(30)
  const [fs, setFs] = useState(3)

  const result = useMemo(() => bearingCapacity({ B, L, Df, gamma, c, phi, FS: fs, method }), [B, L, Df, gamma, c, phi, fs, method])
  const ratio = B / Math.max(L, B)

  return <Frame screen="bearing-capacity">
    <Source>{SOURCE_NOTES.bearing} Bu ekran yöntem karşılaştırması için hazırlanmıştır; nihai tasarımda zemin parametreleri, temel geometrisi, yeraltı suyu ve TBDY 2018 Bölüm 16 tasarım etkileri ayrıca doğrulanmalıdır. citeturn0search12</Source>

    <div className="dashboard-grid">
      <div>
        <Card title="TEMEL VE ZEMİN GİRDİLERİ">
          <div className="form-grid">
            <Field label="B · temel genişliği (m)" value={B} onChange={(v) => setB(Number(v))} />
            <Field label="L · temel uzunluğu (m)" value={L} onChange={(v) => setL(Number(v))} />
            <Field label="Df · temel derinliği (m)" value={Df} onChange={(v) => setDf(Number(v))} />
            <Field label="γ · birim hacim ağırlık (kN/m³)" value={gamma} onChange={(v) => setGamma(Number(v))} />
            <Field label="c · kohezyon (kPa)" value={c} onChange={(v) => setC(Number(v))} />
            <Field label="φ · içsel sürtünme açısı (°)" value={phi} onChange={(v) => setPhi(Number(v))} />
            <Field label="FS · güvenlik katsayısı" value={fs} onChange={(v) => setFs(Number(v))} />
            <label><span>Hesap yöntemi</span><select value={method} onChange={(e) => setMethod(e.target.value as BearingMethod)}>{methods.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
        </Card>

        <Card title="TEMEL GEOMETRİSİ">
          <div style={{ padding: '18px', background: '#fafafa' }}>
            <svg viewBox="0 0 620 230" width="100%" height="230" role="img" aria-label="Yüzeysel temel geometrisi">
              <defs><pattern id="soil-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18L18 0M-9 9L9 -9M9 27L27 9" stroke="#d5d7d9" strokeWidth="1" /></pattern></defs>
              <rect x="30" y="118" width="560" height="82" fill="url(#soil-grid)" stroke="#a7aaad" />
              <rect x="210" y="55" width="200" height="63" fill="#e3e9ee" stroke="#315f86" strokeWidth="2" />
              <line x1="210" y1="42" x2="410" y2="42" stroke="#315f86" />
              <line x1="210" y1="37" x2="210" y2="47" stroke="#315f86" /><line x1="410" y1="37" x2="410" y2="47" stroke="#315f86" />
              <text x="310" y="34" textAnchor="middle" fontSize="13" fill="#315f86">B = {B.toFixed(2)} m</text>
              <line x1="430" y1="55" x2="430" y2="118" stroke="#315f86" />
              <line x1="425" y1="55" x2="435" y2="55" stroke="#315f86" /><line x1="425" y1="118" x2="435" y2="118" stroke="#315f86" />
              <text x="446" y="91" fontSize="13" fill="#315f86">Df = {Df.toFixed(2)} m</text>
              <text x="310" y="157" textAnchor="middle" fontSize="12" fill="#555">Zemin tabakası</text>
              <text x="310" y="179" textAnchor="middle" fontSize="11" fill="#777">γ = {gamma.toFixed(1)} kN/m³ · c = {c.toFixed(1)} kPa · φ = {phi.toFixed(1)}°</text>
            </svg>
          </div>
        </Card>
      </div>

      <div>
        <div className="metric-strip">
          <Metric label="Nc" value={result.Nc.toFixed(2)} />
          <Metric label="Nq" value={result.Nq.toFixed(2)} />
          <Metric label="Nγ" value={result.Ngamma.toFixed(2)} />
          <Metric label="qult" value={result.ultimate.toFixed(1)} unit="kPa" tone="primary" />
          <Metric label="qallow" value={result.allowableGross.toFixed(1)} unit="kPa" tone="primary" />
        </div>

        <Card title="HESAP SONUÇLARI">
          <Table headers={['Parametre', 'Değer', 'Birim']} rows={[
            ['Net taşıma gücü', result.netUltimate.toFixed(2), 'kPa'],
            ['İzin verilebilir net', result.allowableNet.toFixed(2), 'kPa'],
            ['İzin verilebilir brüt', result.allowableGross.toFixed(2), 'kPa'],
            ['B / L oranı', ratio.toFixed(3), '—'],
            ['Yöntem', result.method, '—']
          ]} />
        </Card>

        <Card title="TAŞIMA GÜCÜ İFADESİ">
          <div className="formula-large">qᵤₗₜ = c·Nc·sc + γ·Df·Nq·sq + 0.5·γ·B·Nγ·sγ</div>
          <Source>Buradaki katsayılar seçilen yöntem için hesap çekirdeğinden gelir. Bu ekran henüz TBDY 2018'in tüm tasarım etkileri ve dayanım katsayılarını otomatik olarak uygulayan nihai temel tasarım modülü değildir.</Source>
        </Card>
      </div>
    </div>
  </Frame>
}
