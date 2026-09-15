import { useState } from 'react'
import { calculateBearingCapacity } from '../../../../core/calculations/bearing-capacity'

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

interface NumberFieldProps {
  label: string
  value: number
  unit: string
  onChange: (value: string) => void
}

function NumberField({
  label,
  value,
  unit,
  onChange
}: NumberFieldProps) {
  return (
    <div className="bearing-field">
      <label>{label}</label>
      <div className="bearing-input-wrap">
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span>{unit}</span>
      </div>
    </div>
  )
}

interface ResultRowProps {
  label: string
  value: string
  primary?: boolean
}

function ResultRow({
  label,
  value,
  primary = false
}: ResultRowProps) {
  return (
    <div className={`bearing-result-row ${primary ? 'primary' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
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
      const calculated = calculateBearingCapacity(input)
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
    <section className="engineering-screen bearing-capacity-screen">
      <header className="engineering-header bearing-header">
        <div>
          <div className="engineering-header-category">
            ANALİZ
          </div>

          <h2>Taşıma Gücü</h2>

          <div className="engineering-header-description">
            Sürekli temel için nihai ve izin verilebilir taşıma gücü hesabı
          </div>
        </div>

        <div className="bearing-header-actions">
          <div className="bearing-method-label">
            TERZAGHI · SÜREKLİ TEMEL
          </div>

          <button
            className="bearing-calculate-button"
            onClick={calculate}
          >
            HESAPLA
          </button>
        </div>
      </header>

      <div className="bearing-workspace">

        <div className="bearing-input-panel">

          <div className="bearing-section">
            <div className="bearing-section-title">
              <span>01</span>
              TEMEL GEOMETRİSİ
            </div>

            <NumberField
              label="Temel genişliği B"
              value={input.footingWidth}
              unit="m"
              onChange={(value) =>
                update('footingWidth', value)
              }
            />

            <NumberField
              label="Temel derinliği Df"
              value={input.footingDepth}
              unit="m"
              onChange={(value) =>
                update('footingDepth', value)
              }
            />
          </div>

          <div className="bearing-section">
            <div className="bearing-section-title">
              <span>02</span>
              ZEMİN PARAMETRELERİ
            </div>

            <NumberField
              label="Birim hacim ağırlık γ"
              value={input.unitWeight}
              unit="kN/m³"
              onChange={(value) =>
                update('unitWeight', value)
              }
            />

            <NumberField
              label="Kohezyon c"
              value={input.cohesion}
              unit="kPa"
              onChange={(value) =>
                update('cohesion', value)
              }
            />

            <NumberField
              label="İçsel sürtünme açısı φ"
              value={input.frictionAngle}
              unit="°"
              onChange={(value) =>
                update('frictionAngle', value)
              }
            />

            <NumberField
              label="Güvenlik katsayısı FS"
              value={input.safetyFactor}
              unit="—"
              onChange={(value) =>
                update('safetyFactor', value)
              }
            />
          </div>

          <div className="bearing-input-note">
            <span className="bearing-note-mark">i</span>
            <div>
              Girilen değerler hesap motoruna doğrudan aktarılır.
              Birimler SI tabanında tutulmaktadır.
            </div>
          </div>

        </div>

        <div className="bearing-results-panel">

          <div className="bearing-section-title result-title">
            <span>03</span>
            HESAP SONUÇLARI
          </div>

          <div className="bearing-result-table">

            <ResultRow
              label="Nq"
              value={result ? format(result.Nq) : '—'}
            />

            <ResultRow
              label="Nc"
              value={result ? format(result.Nc) : '—'}
            />

            <ResultRow
              label="Nγ"
              value={result ? format(result.Ngamma) : '—'}
            />

            <ResultRow
              label="q = γDf"
              value={
                result
                  ? `${format(result.surcharge)} kPa`
                  : '—'
              }
            />

            <div className="bearing-result-divider" />

            <ResultRow
              label="Nihai taşıma gücü qult"
              value={
                result
                  ? `${format(result.ultimateBearingCapacity)} kPa`
                  : '—'
              }
            />

            <ResultRow
              label="Net nihai taşıma gücü qnet,ult"
              value={
                result
                  ? `${format(result.netUltimateBearingCapacity)} kPa`
                  : '—'
              }
            />

            <div className="bearing-result-primary">
              <div>
                <span>İzin verilebilir taşıma gücü</span>
                <small>qallow,gross</small>
              </div>

              <strong>
                {result
                  ? `${format(result.allowableGrossBearingCapacity)} kPa`
                  : '—'}
              </strong>
            </div>

            <div className="bearing-result-secondary">
              <div>
                <span>İzin verilebilir net taşıma gücü</span>
                <small>qallow,net</small>
              </div>

              <strong>
                {result
                  ? `${format(result.allowableNetBearingCapacity)} kPa`
                  : '—'}
              </strong>
            </div>

          </div>

          {error && (
            <div className="bearing-error">
              <strong>Hesap kontrolü</strong>
              <span>{error}</span>
            </div>
          )}

        </div>
      </div>

      <div className="bearing-method-panel">

        <div className="bearing-section-title">
          <span>04</span>
          HESAP YÖNTEMİ
        </div>

        <div className="bearing-method-content">

          <div className="bearing-method-name">
            <strong>Terzaghi</strong>
            <span>Sürekli temel</span>
          </div>

          <div className="bearing-formulas">

            <div>
              q<sub>ult</sub> = cN<sub>c</sub>
              + γD<sub>f</sub>N<sub>q</sub>
              + 0.5γBN<sub>γ</sub>
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

      <div className="bearing-footer-note">
        Ön hesap modu · Hesap yöntemi ve katsayılar daha sonra
        yönetmelik/standart seçenekleriyle genişletilecektir.
      </div>

    </section>
  )
}
