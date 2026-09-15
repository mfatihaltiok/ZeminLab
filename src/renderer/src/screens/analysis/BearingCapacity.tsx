import { useState } from 'react'
import {
  calculateBearingCapacity
} from '../../../../core/calculations/bearing-capacity'

import type {
  BearingCapacityInput,
  BearingCapacityResult
} from '../../../../core/models/bearing-capacity'

const defaultInput: BearingCapacityInput = {
  footingWidth: 2,
  footingDepth: 1,
  unitWeight: 18,
  cohesion: 10,
  frictionAngle: 30,
  safetyFactor: 3
}

function format(value: number): string {
  return value.toFixed(2)
}

export default function BearingCapacity() {
  const [input, setInput] =
    useState<BearingCapacityInput>(defaultInput)

  const [result, setResult] =
    useState<BearingCapacityResult | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const update = (
    key: keyof BearingCapacityInput,
    value: string
  ) => {
    setInput((current) => ({
      ...current,
      [key]: Number(value)
    }))
  }

  const calculate = () => {
    try {
      const calculated =
        calculateBearingCapacity(input)

      setResult(calculated)
      setError(null)
    } catch (err) {
      setResult(null)
      setError(
        err instanceof Error
          ? err.message
          : 'Hesap sırasında bilinmeyen bir hata oluştu.'
      )
    }
  }

  return (
    <section className="engineering-screen">

      <header className="engineering-header">

        <div>
          <div className="engineering-header-category">
            ANALİZ
          </div>

          <h2>Taşıma Gücü</h2>

          <div className="engineering-header-description">
            Sürekli temel için ön taşıma gücü hesabı
          </div>
        </div>

        <div className="engineering-header-actions">
          <button onClick={calculate}>
            HESAPLA
          </button>
        </div>

      </header>


      <div className="engineering-content">

        <div className="calculation-card">

          <div className="calculation-card-title">
            TEMEL VE ZEMİN PARAMETRELERİ
          </div>

          <div className="calculation-grid">

            <label>
              Temel genişliği B
              <div className="input-with-unit">
                <input
                  type="number"
                  value={input.footingWidth}
                  onChange={(e) =>
                    update(
                      'footingWidth',
                      e.target.value
                    )
                  }
                />
                <span>m</span>
              </div>
            </label>

            <label>
              Temel derinliği Df
              <div className="input-with-unit">
                <input
                  type="number"
                  value={input.footingDepth}
                  onChange={(e) =>
                    update(
                      'footingDepth',
                      e.target.value
                    )
                  }
                />
                <span>m</span>
              </div>
            </label>

            <label>
              Birim hacim ağırlık γ
              <div className="input-with-unit">
                <input
                  type="number"
                  value={input.unitWeight}
                  onChange={(e) =>
                    update(
                      'unitWeight',
                      e.target.value
                    )
                  }
                />
                <span>kN/m³</span>
              </div>
            </label>

            <label>
              Kohezyon c
              <div className="input-with-unit">
                <input
                  type="number"
                  value={input.cohesion}
                  onChange={(e) =>
                    update(
                      'cohesion',
                      e.target.value
                    )
                  }
                />
                <span>kPa</span>
              </div>
            </label>

            <label>
              İçsel sürtünme açısı φ
              <div className="input-with-unit">
                <input
                  type="number"
                  value={input.frictionAngle}
                  onChange={(e) =>
                    update(
                      'frictionAngle',
                      e.target.value
                    )
                  }
                />
                <span>°</span>
              </div>
            </label>

            <label>
              Güvenlik katsayısı
              <div className="input-with-unit">
                <input
                  type="number"
                  value={input.safetyFactor}
                  onChange={(e) =>
                    update(
                      'safetyFactor',
                      e.target.value
                    )
                  }
                />
                <span>FS</span>
              </div>
            </label>

          </div>

        </div>


        {error && (
          <div className="calculation-error">
            {error}
          </div>
        )}


        <div className="calculation-card">

          <div className="calculation-card-title">
            HESAP SONUÇLARI
          </div>

          <div className="result-grid">

            <div>
              <span>Nq</span>
              <strong>
                {result ? format(result.Nq) : '—'}
              </strong>
            </div>

            <div>
              <span>Nc</span>
              <strong>
                {result ? format(result.Nc) : '—'}
              </strong>
            </div>

            <div>
              <span>Nγ</span>
              <strong>
                {result ? format(result.Ngamma) : '—'}
              </strong>
            </div>

            <div>
              <span>q = γDf</span>
              <strong>
                {result
                  ? `${format(result.surcharge)} kPa`
                  : '—'}
              </strong>
            </div>

            <div>
              <span>qult</span>
              <strong>
                {result
                  ? `${format(result.ultimateBearingCapacity)} kPa`
                  : '—'}
              </strong>
            </div>

            <div>
              <span>qnet,ult</span>
              <strong>
                {result
                  ? `${format(result.netUltimateBearingCapacity)} kPa`
                  : '—'}
              </strong>
            </div>

            <div className="result-primary">
              <span>qallow,gross</span>
              <strong>
                {result
                  ? `${format(result.allowableGrossBearingCapacity)} kPa`
                  : '—'}
              </strong>
            </div>

            <div className="result-primary">
              <span>qallow,net</span>
              <strong>
                {result
                  ? `${format(result.allowableNetBearingCapacity)} kPa`
                  : '—'}
              </strong>
            </div>

          </div>

        </div>


        <div className="calculation-card">

          <div className="calculation-card-title">
            HESAP YÖNTEMİ
          </div>

          <div className="formula-box">

            <div>
              <strong>Terzaghi · Sürekli temel</strong>
            </div>

            <div>
              q<sub>ult</sub> =
              cN<sub>c</sub> +
              γD<sub>f</sub>N<sub>q</sub> +
              0.5γBN<sub>γ</sub>
            </div>

            <div>
              q<sub>net,ult</sub> =
              q<sub>ult</sub> − γD<sub>f</sub>
            </div>

            <div>
              q<sub>allow,net</sub> =
              q<sub>net,ult</sub> / FS
            </div>

          </div>

        </div>

      </div>

    </section>
  )
}

