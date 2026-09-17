import { useEffect, useState } from 'react'
import { Card, Field, Frame } from '../workspace/WorkspaceShell'

type OcrConfig = { provider: 'local' | 'remote'; endpoint: string; hasApiKey: boolean }
export function OcrSettingsScreen() {
  const [config, setConfig] = useState<OcrConfig>({ provider: 'local', endpoint: '', hasApiKey: false })
  const [apiKey, setApiKey] = useState('')
  const [online, setOnline] = useState<boolean | undefined>()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = async () => { const result = await window.api.ocr.status(); setOnline(result.online); setConfig(result.config) }
  useEffect(() => { void refresh() }, [])
  const save = async () => { setBusy(true); try { await window.api.ocr.saveConfig({ provider: config.provider, endpoint: config.endpoint, apiKey: apiKey || undefined }); setApiKey(''); await refresh(); setMessage('OCR ayarları güvenli biçimde kaydedildi.') } catch (e) { setMessage(e instanceof Error ? e.message : 'Ayarlar kaydedilemedi.') } finally { setBusy(false) } }
  const test = async () => { setBusy(true); try { const result = await window.api.ocr.test(config.endpoint); setOnline(result.online); setMessage(result.message) } catch (e) { setMessage(e instanceof Error ? e.message : 'Bağlantı testi başarısız.') } finally { setBusy(false) } }
  return <Frame screen="ocr-settings">
    <div className="project-info-layout">
      <Card title="İNTERNET BAĞLANTISI">
        <div className="metric-strip"><div className="metric"><span>Durum</span><strong>{online === undefined ? 'Kontrol ediliyor…' : online ? 'BAĞLI' : 'ÇEVRİMDIŞI'}</strong></div><div className="metric"><span>Yerel OCR</span><strong>HAZIR</strong></div><div className="metric"><span>Uzaktan OCR</span><strong>{config.hasApiKey ? 'AYARLI' : 'ANAHTAR YOK'}</strong></div></div>
        <div className="classification-note">ZeminLab, internet yokken yerel OCR ve yerel hesap motorlarıyla çalışmaya devam eder. Electron ağ durumu kontrolü bağlantının varlığını gösterir, tek başına uzak sunucunun erişilebilir olduğunu garanti etmez.</div>
        <button className="primary-button" onClick={() => void test()} disabled={busy}>Bağlantıyı test et</button>
      </Card>
      <Card title="PADDLEOCR / OCR SAĞLAYICISI">
        <div className="form-grid">
          <label><span>Çalışma modu</span><select value={config.provider} onChange={(e) => setConfig({ ...config, provider: e.target.value as OcrConfig['provider'] })}><option value="local">Yerel PaddleOCR / Tesseract</option><option value="remote">Uzak OCR API</option></select></label>
          <Field label="OCR API adresi" type="url" value={config.endpoint} onChange={(v) => setConfig({ ...config, endpoint: v })} />
          <label><span>API anahtarı</span><input type="password" value={apiKey} placeholder={config.hasApiKey ? 'Kayıtlı anahtarı değiştirmek için girin' : 'API anahtarını girin'} onChange={(e) => setApiKey(e.target.value)} /></label>
        </div>
        <div className="classification-note">Önemli ayrım: PaddleOCR açık kaynaklı yerel bir OCR motorudur ve yerel kullanım için API anahtarı gerektirmez. API anahtarı alanı yalnızca uzak bir OCR servis sağlayıcısı kullanıldığında devreye girer. Model dosyaları kurulum paketine alınabilir ve çevrimdışı çalıştırılabilir.</div>
        <button className="primary-button" onClick={() => void save()} disabled={busy}>Ayarları kaydet</button>
      </Card>
      {message && <div className="engineering-note"><b>Durum:</b> {message}</div>}
    </div>
  </Frame>
}
