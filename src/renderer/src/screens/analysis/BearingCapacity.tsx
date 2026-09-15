import { useState } from 'react'
import { calculateBearingCapacity } from '../../../../core/calculations/bearing-capacity'
import type { BearingCapacityInput, BearingCapacityResult } from '../../../../core/models/bearing-capacity'
import { useProjectInfo } from '../../../../core/state/project-store'

function format(value: number): string {
  return value.toFixed(2)
}

export default function BearingCapacity() {
  const project = useProjectInfo()
  const [result, setResult] = useState<BearingCapacityResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const input: BearingCapacityInput = {
    footingWidth: project.foundationParameters.footingWidth,
    footingDepth: project.foundationParameters.footingDepth,
    unitWeight: project.soilParameters.unitWeight,
    cohesion: project.soilParameters.cohesion,
    frictionAngle: project.soilParameters.frictionAngle,
    safetyFactor: project.foundationParameters.safetyFactor
  }

  const calculate = () => {
    try {
      setResult(calculateBearingCapacity(input))
      setError(null)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Hesap sırasında bilinmeyen bir hata oluştu.')
    }
  }

  const source = (text: string) => (
    <small className="parameter-source">Kaynak: {text}</small>
  )

  return (
    <section className="engineering-screen">
      <header className="engineering-header">
        <div>
          <div className="engineering-header-category">ANALİZ</div>
          <h2>Taşıma Gücü</h2>
          <div className="engineering-header-description">
            Merkezi proje verilerinden sürekli temel için ön taşıma gücü hesabı
          </div>
        </div>
        <div className="engineering-header-actions">
          <button onClick={calculate}>HESAPLA</button>
        </div>
      </header>

      <div className="engineering-content">
        <div className="calculation-card">
          <div className="calculation-card-title">MERKEZİ TEMEL VE ZEMİN PARAMETRELERİ</div>
          <div className="calculation-grid">
            <label>
              Temel genişliği B
              <div className="input-with-unit"><input value={input.footingWidth} readOnly /><span>m</span></div>
              {source('Proje > Temel Parametreleri')}
            </label>
            <label>
              Temel derinliği Df
              <div className="input-with-unit"><input value={input.footingDepth} readOnly /><span>m</span></div>
              {source('Proje > Temel Parametreleri')}
            </label>
            <label>
              Birim hacim ağırlık γ
              <div className="input-with-unit"><input value={input.unitWeight} readOnly /><span>kN/m³</span></div>
              {source('Proje > Zemin Parametreleri')}
            </label>
            <label>
              Kohezyon c
              <div className="input-with-unit"><input value={input.cohesion} readOnly /><span>kPa</span></div>
              {source('Proje > Zemin Parametreleri')}
            </label>
            <label>
              İçsel sürtünme açısı φ
              <div className="input-with-unit"><input value={input.frictionAngle} readOnly /><span>°</span></div>
              {source('Proje > Zemin Parametreleri')}
            </label>
            <label>
              Güvenlik katsayısı
              <div className="input-with-unit"><input value={input.safetyFactor} readOnly /><span>FS</span></div>
              {source('Proje > Temel Parametreleri')}
            </label>
          </div>
          <div className="parameter-note">
            Bu ekranda parametreler ayrı bir veri kaynağı oluşturmaz. Hesap doğrudan merkezi proje verisini kullanır.
          </div>
        </div>

        {error && <div className="calculation-error">{error}</div>}

        <div className="calculation-card">
          <div className="calculation-card-title">HESAP SONUÇLARI</div>
          <div className="result-grid">
            <div><span>Nq</span><strong>{result ? format(result.Nq) : '—'}</strong></div>
            <div><span>Nc</span><strong>{result ? format(result.Nc) : '—'}</strong></div>
            <div><span>Nγ</span><strong>{result ? format(result.Ngamma) : '—'}</strong></div>
            <div><span>q = γDf</span><strong>{result ? `${format(result.surcharge)} kPa` : '—'}</strong></div>
            <div><span>qult</span><strong>{result ? `${format(result.ultimateBearingCapacity)} kPa` : '—'}</strong></div>
            <div><span>qnet,ult</span><strong>{result ? `${format(result.netUltimateBearingCapacity)} kPa` : '—'}</strong></div>
            <div className="result-primary"><span>qallow,gross</span><strong>{result ? `${format(result.allowableGrossBearingCapacity)} kPa` : '—'}</strong></div>
            <div className="result-primary"><span>qallow,net</span><strong>{result ? `${format(result.allowableNetBearingCapacity)} kPa` : '—'}</strong></div>
          </div>
        </div>

        <div className="calculation-card">
          <div className="calculation-card-title">HESAP İZİ</div>
          <div className="formula-box">
            <div><strong>1. Merkezi veri okunur</strong></div>
            <div>B = {format(input.footingWidth)} m · Df = {format(input.footingDepth)} m</div>
            <div>γ = {format(input.unitWeight)} kN/m³ · c = {format(input.cohesion)} kPa · φ = {format(input.frictionAngle)}°</div>
            <div>FS = {format(input.safetyFactor)}</div>
            <div><strong>2. Terzaghi · Sürekli temel</strong></div>
            <div>q<sub>ult</sub> = cN<sub>c</sub> + γD<sub>f</sub>N<sub>q</sub> + 0.5γBN<sub>γ</sub></div>
            <div>q<sub>net,ult</sub> = q<sub>ult</sub> − γD<sub>f</sub></div>
            <div>q<sub>allow,net</sub> = q<sub>net,ult</sub> / FS</div>
            <div><strong>3. Sonuçlar hesap motorundan alınır</strong></div>
          </div>
        </div>
      </div>
    </section>
  )
}
