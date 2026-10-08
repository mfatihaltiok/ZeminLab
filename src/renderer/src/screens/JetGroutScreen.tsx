import React, { useState } from 'react'
import { jetGroutEngineering, type JetGroutEngineeringInput } from '../../core/engineering/jet-grout-advanced'

interface JetGroutScreenProps {
  onBack: () => void
}

export function JetGroutScreen({ onBack }: JetGroutScreenProps) {
  const [formData, setFormData] = useState<JetGroutEngineeringInput>({
    columnDiameter: 0.6,
    spacing: 1.5,
    layout: 'square',
    qSoil: 100,
    qColumn: 2000,
    cSoil: 10,
    cColumn: 100,
    EsSoil: 5000,
    EsColumn: 50000,
    load: 1000,
    foundationArea: 100,
    FS: 3,
    columnFrictionAngle: 35,
    soilPoissonRatio: 0.3,
    foundationThickness: 5,
    cohesion: 10,
    frictionAngle: 25,
    verticalLoad: 1000,
    horizontalLoad: 100,
  })

  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const handleCalculate = () => {
    try {
      setError('')
      const res = jetGroutEngineering(formData)
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hesaplama hatası')
      setResult(null)
    }
  }

  const handleChange = (field: keyof JetGroutEngineeringInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="jet-grout-screen">
      <div className="screen-header">
        <button onClick={onBack} className="back-button">← Geri</button>
        <h1>Jet Grout Zemin İyileştirme Tasarımı</h1>
      </div>

      <div className="screen-content">
        <div className="input-section">
          <h2>Kolon Geometrisi</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Kolon Çapı (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.columnDiameter}
                onChange={(e) => handleChange('columnDiameter', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Aks Aralığı (m)</label>
              <input
                type="number"
                step="0.1"
                value={formData.spacing}
                onChange={(e) => handleChange('spacing', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Yerleşim Düzeni</label>
              <select
                value={formData.layout}
                onChange={(e) => handleChange('layout', e.target.value as 'square' | 'triangular')}
              >
                <option value="square">Kare</option>
                <option value="triangular">Üçgen</option>
              </select>
            </div>
          </div>

          <h2>Zemin Parametreleri</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Zemin Taşıma Gücü (kPa)</label>
              <input
                type="number"
                value={formData.qSoil}
                onChange={(e) => handleChange('qSoil', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Kolon Taşıma Gücü (kPa)</label>
              <input
                type="number"
                value={formData.qColumn}
                onChange={(e) => handleChange('qColumn', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Zemin Elastisite Modülü (kPa)</label>
              <input
                type="number"
                value={formData.EsSoil}
                onChange={(e) => handleChange('EsSoil', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Kolon Elastisite Modülü (kPa)</label>
              <input
                type="number"
                value={formData.EsColumn}
                onChange={(e) => handleChange('EsColumn', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Zemin Kohezyonu (kPa)</label>
              <input
                type="number"
                value={formData.cSoil}
                onChange={(e) => handleChange('cSoil', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Kolon Kohezyonu (kPa)</label>
              <input
                type="number"
                value={formData.cColumn}
                onChange={(e) => handleChange('cColumn', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <h2>Temel Parametreleri</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Toplam Yük (kN)</label>
              <input
                type="number"
                value={formData.load}
                onChange={(e) => handleChange('load', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Temel Alanı (m²)</label>
              <input
                type="number"
                value={formData.foundationArea}
                onChange={(e) => handleChange('foundationArea', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>İyileştirme Kalınlığı (m)</label>
              <input
                type="number"
                step="0.5"
                value={formData.foundationThickness}
                onChange={(e) => handleChange('foundationThickness', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Güvenlik Katsayısı</label>
              <input
                type="number"
                step="0.5"
                value={formData.FS}
                onChange={(e) => handleChange('FS', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <h2>Kayma Kontrolü</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Düşey Yük (kN)</label>
              <input
                type="number"
                value={formData.verticalLoad}
                onChange={(e) => handleChange('verticalLoad', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Yatay Yük (kN)</label>
              <input
                type="number"
                value={formData.horizontalLoad}
                onChange={(e) => handleChange('horizontalLoad', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Zemin Kohezyonu (kPa)</label>
              <input
                type="number"
                value={formData.cohesion}
                onChange={(e) => handleChange('cohesion', parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Sürtünme Açısı (°)</label>
              <input
                type="number"
                value={formData.frictionAngle}
                onChange={(e) => handleChange('frictionAngle', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <button onClick={handleCalculate} className="calculate-button">
            Hesapla
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Hata:</strong> {error}
          </div>
        )}

        {result && (
          <div className="results-section">
            <h2>Sonuçlar</h2>
            
            <div className="result-card">
              <h3>Kompozit Zemin Parametreleri</h3>
              <div className="result-grid">
                <div className="result-item">
                  <span className="label">Alan Değiştirme Oranı (ρ):</span>
                  <span className="value">{(result.areaReplacementRatio * 100).toFixed(2)} %</span>
                </div>
                <div className="result-item">
                  <span className="label">Kompozit Taşıma Gücü:</span>
                  <span className="value">{result.compositeCapacity.toFixed(2)} kPa</span>
                </div>
                <div className="result-item">
                  <span className="label">Kompozit Elastisite Modülü:</span>
                  <span className="value">{result.compositeModulus?.toFixed(0) ?? 'N/A'} kPa</span>
                </div>
                <div className="result-item">
                  <span className="label">Kolon Yük Paylaşımı:</span>
                  <span className="value">{(result.columnLoadShare * 100).toFixed(2)} %</span>
                </div>
                <div className="result-item">
                  <span className="label">Zemin Yük Paylaşımı:</span>
                  <span className="value">{(result.soilLoadShare * 100).toFixed(2)} %</span>
                </div>
                <div className="result-item">
                  <span className="label">Gerilme Konsantrasyon Faktörü (β):</span>
                  <span className="value">{result.stressConcentrationFactor.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {result.virtualRaft && (
              <div className="result-card">
                <h3>Sanal Radye Oturma Analizi</h3>
                <div className="result-grid">
                  <div className="result-item">
                    <span className="label">İşlenmemiş Zemin Oturması:</span>
                    <span className="value">{result.virtualRaft.untreatedSettlement.toFixed(2)} m</span>
                  </div>
                  <div className="result-item">
                    <span className="label">İşlenmiş Zemin Oturması:</span>
                    <span className="value">{result.virtualRaft.treatedSettlement.toFixed(2)} m</span>
                  </div>
                  <div className="result-item highlight">
                    <span className="label">Oturma Azaltma Oranı:</span>
                    <span className="value">{result.virtualRaft.reductionPercent.toFixed(1)} %</span>
                  </div>
                </div>
              </div>
            )}

            {result.shearSafety && (
              <div className="result-card">
                <h3>Kayma Güvenliği Kontrolü</h3>
                <div className="result-grid">
                  <div className="result-item">
                    <span className="label">Kayma Gerilmesi (τ):</span>
                    <span className="value">{result.shearSafety.shearStress.toFixed(2)} kPa</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Kayma Direnci:</span>
                    <span className="value">{result.shearSafety.shearResistance.toFixed(2)} kPa</span>
                  </div>
                  <div className={`result-item ${result.shearSafety.FS >= 1.5 ? 'success' : 'warning'}`}>
                    <span className="label">Güvenlik Katsayısı (FS):</span>
                    <span className="value">{result.shearSafety.FS.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {result.axial && (
              <div className="result-card">
                <h3>Eksenel Taşıma Kapasitesi</h3>
                <div className="result-grid">
                  <div className="result-item">
                    <span className="label">Şaft Karakteristik Kapasite:</span>
                    <span className="value">{result.axial.shaftCharacteristic.toFixed(0)} kN</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Uç Karakteristik Kapasite:</span>
                    <span className="value">{result.axial.tipCharacteristic.toFixed(0)} kN</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Kolon Karakteristik Kapasite:</span>
                    <span className="value">{result.axial.columnCharacteristic.toFixed(0)} kN</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Grup Karakteristik Kapasite:</span>
                    <span className="value">{result.axial.groupCharacteristic.toFixed(0)} kN</span>
                  </div>
                  <div className="result-item highlight">
                    <span className="label">Tasarım Kapasitesi:</span>
                    <span className="value">{result.axial.designCapacity.toFixed(0)} kN</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Grup Verimi:</span>
                    <span className="value">{(result.axial.groupEfficiency * 100).toFixed(1)} %</span>
                  </div>
                  <div className="result-item">
                    <span className="label">Kontrol Modu:</span>
                    <span className="value">{result.axial.governingMode === 'individual' ? 'Bireysel Kolon' : 'Blok'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="warnings-section">
              <h3>Uyarılar</h3>
              <ul>
                {result.warnings.map((warning: string, index: number) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>

            <div className="source-reference">
              <h3>Kaynak Referansları</h3>
              <p><strong>Erol & Çekinmez Bayram (2018)</strong> - Jet Enjeksiyon Yöntemi, Yüksel Proje Uluslararası A.Ş.</p>
              <p>TBDY 2018 Bölüm 16 ve Ek 16A/16B</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
