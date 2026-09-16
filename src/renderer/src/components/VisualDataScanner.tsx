import { useMemo, useState } from 'react'
import { createWorker } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'
import '../assets/visual-scanner.css'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../../../core/models/field-data'

type ScanTarget = 'spt' | 'lab'
type Candidate = Partial<SptRecord> & Partial<LaboratoryRecord> & { rowId: string; raw: string; confidence: number }

type Props = {
  target: ScanTarget
  borehole: BoreholeRecord
  onSptCandidates: (rows: SptRecord[]) => void
  onLabCandidates: (rows: LaboratoryRecord[]) => void
}

function parsePageRange(value: string, pageCount: number) {
  const pages = new Set<number>()
  value.split(',').map(x => x.trim()).filter(Boolean).forEach(part => {
    const [a, b] = part.split('-').map(Number)
    if (!Number.isFinite(a)) return
    const start = Math.max(1, Math.floor(a))
    const end = Number.isFinite(b) ? Math.min(pageCount, Math.floor(b)) : start
    for (let p = start; p <= Math.max(start, end); p++) pages.add(p)
  })
  return [...pages].sort((a, b) => a - b)
}

function parseCandidates(text: string, target: ScanTarget): Candidate[] {
  const lines = text.split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const out: Candidate[] = []
  for (const line of lines) {
    const nums = [...line.matchAll(/\d+(?:[.,]\d+)?/g)].map(m => Number(m[0].replace(',', '.'))).filter(Number.isFinite)
    if (target === 'spt' && nums.length >= 4) {
      const [depth, n1, n2, n3] = nums.slice(0, 4)
      if (depth <= 100 && n1 <= 999 && n2 <= 999 && n3 <= 999) out.push({ rowId: crypto.randomUUID(), raw: line, confidence: 0.78, depth, depthTo: depth + 0.45, testType: 'SPT', n1, n2, n3, source: 'image-review', confirmed: false })
    }
    if (target === 'lab') {
      const ll = line.match(/(?:LL|likit limit|liquid limit)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)
      const pl = line.match(/(?:PL|plastik limit|plastic limit)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)
      const wc = line.match(/(?:w|su\s*içeriği|water content)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i)
      if (ll || pl || wc) out.push({ rowId: crypto.randomUUID(), raw: line, confidence: 0.72, liquidLimit: ll ? Number(ll[1].replace(',', '.')) : undefined, plasticLimit: pl ? Number(pl[1].replace(',', '.')) : undefined, waterContent: wc ? Number(wc[1].replace(',', '.')) : undefined })
    }
  }
  return out
}

async function imageFromPdf(file: File, pageNumber: number, scale: number) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const context = canvas.getContext('2d')!
  await page.render({ canvasContext: context, viewport }).promise
  return { canvas, pageCount: pdf.numPages }
}

export default function VisualDataScanner({ target, borehole, onSptCandidates, onLabCandidates }: Props) {
  const [file, setFile] = useState<File>()
  const [previewUrl, setPreviewUrl] = useState<string>()
  const [pageRange, setPageRange] = useState('1')
  const [dpi, setDpi] = useState(180)
  const [threshold, setThreshold] = useState(true)
  const [tableMode, setTableMode] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('Hazır')
  const [text, setText] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [showApproval, setShowApproval] = useState(false)
  const [error, setError] = useState('')

  const isPdf = file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf')
  const title = useMemo(() => target === 'spt' ? 'SPT GÖRSEL VERİ TARAMA' : 'LABORATUVAR GÖRSEL VERİ TARAMA', [target])

  const chooseFile = (next?: File) => {
    setError(''); setCandidates([]); setText(''); setFile(next)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(next ? URL.createObjectURL(next) : undefined)
  }

  const scan = async () => {
    if (!file) return
    setBusy(true); setError(''); setCandidates([])
    try {
      const worker = await createWorker('tur+eng', 1, { logger: m => setProgress(`${m.status} ${Math.round((m.progress ?? 0) * 100)}%`) })
      const chunks: string[] = []
      let pageCount = 1
      if (isPdf) {
        const probe = await imageFromPdf(file, 1, dpi / 72)
        pageCount = probe.pageCount
        for (const page of parsePageRange(pageRange, pageCount)) {
          setProgress(`Sayfa ${page}/${pageCount} işleniyor`)
          const rendered = page === 1 ? probe : await imageFromPdf(file, page, dpi / 72)
          let canvas = rendered.canvas
          if (threshold) {
            const ctx = canvas.getContext('2d')!
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
            for (let i = 0; i < image.data.length; i += 4) {
              const y = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2]
              const v = y > 165 ? 255 : 0
              image.data[i] = v; image.data[i + 1] = v; image.data[i + 2] = v
            }
            ctx.putImageData(image, 0, 0)
          }
          const result = await worker.recognize(canvas)
          chunks.push(result.data.text)
        }
      } else {
        const result = await worker.recognize(file)
        chunks.push(result.data.text)
      }
      await worker.terminate()
      const combined = chunks.join('\n')
      setText(combined)
      const parsed = parseCandidates(combined, target)
      setCandidates(parsed)
      setProgress(`${parsed.length} aday veri bulundu`)
      setShowApproval(true)
      void tableMode
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görsel tarama başarısız oldu.')
      setProgress('Hata')
    } finally { setBusy(false) }
  }

  const approve = () => {
    if (target === 'spt') {
      const rows: SptRecord[] = candidates.filter(c => c.depth !== undefined).map(c => ({ id: crypto.randomUUID(), depth: c.depth!, depthTo: c.depthTo ?? c.depth! + 0.45, testType: 'SPT', n1: c.n1, n2: c.n2, n3: c.n3, source: 'image-review', confirmed: true }))
      onSptCandidates(rows)
    } else {
      const rows: LaboratoryRecord[] = candidates.map(c => ({ id: crypto.randomUUID(), boreholeId: borehole.id, sampleId: `IMG-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, depth: 0, sampleType: 'Other', waterContent: c.waterContent, liquidLimit: c.liquidLimit, plasticLimit: c.plasticLimit, plasticityIndex: c.liquidLimit !== undefined && c.plasticLimit !== undefined ? c.liquidLimit - c.plasticLimit : undefined, source: 'image-review', confirmed: true }))
      onLabCandidates(rows)
    }
    setShowApproval(false)
  }

  return <section className="visual-scanner">
    <div className="scanner-toolbar"><div><b>{title}</b><span>PDF / PNG / JPG · OCR · tablo adayları · kullanıcı onayı</span></div><label className="scanner-file"><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={e => chooseFile(e.target.files?.[0])}/><span>Dosya Seç</span></label><button disabled={!file || busy} onClick={scan}>{busy ? 'Taranıyor…' : 'Görseli Tara'}</button></div>
    <div className="scanner-options"><label>Sayfa <input value={pageRange} onChange={e => setPageRange(e.target.value)} placeholder="1 veya 1-3" /></label><label>DPI <select value={dpi} onChange={e => setDpi(Number(e.target.value))}><option value={144}>144</option><option value={180}>180</option><option value={220}>220</option><option value={300}>300</option></select></label><label><input type="checkbox" checked={threshold} onChange={e => setThreshold(e.target.checked)}/> Kontrast / eşikleme</label><label><input type="checkbox" checked={tableMode} onChange={e => setTableMode(e.target.checked)}/> Tablo odaklı tarama</label></div>
    <div className="scanner-body"><div className="scanner-preview">{previewUrl ? (isPdf ? <iframe title="PDF önizleme" src={previewUrl}/> : <img src={previewUrl} alt="Taranacak belge"/>) : <div className="scanner-empty">Tarama için PDF veya görsel belge seçin.</div>}</div><div className="scanner-result"><div className="scanner-status">{progress}</div>{error && <div className="scanner-error">{error}</div>}<div className="scanner-text">{text || 'OCR sonucu burada gösterilir.'}</div></div></div>
    {candidates.length > 0 && <div className="scanner-candidates"><div className="grid-toolbar"><b>AKTARILACAK ADAY VERİLER</b><span>{candidates.length} satır</span></div><table><thead><tr><th>Güven</th><th>OCR satırı</th><th>Alanlar</th></tr></thead><tbody>{candidates.map(c=><tr key={c.rowId}><td>{Math.round(c.confidence * 100)}%</td><td>{c.raw}</td><td>{target === 'spt' ? `${c.depth ?? ''} m · ${c.n1 ?? ''} / ${c.n2 ?? ''} / ${c.n3 ?? ''}` : `w=${c.waterContent ?? ''} · LL=${c.liquidLimit ?? ''} · PL=${c.plasticLimit ?? ''}`}</td></tr>)}</tbody></table></div>}
    {showApproval && <div className="scanner-approval"><div className="scanner-dialog"><b>VERİ AKTARMA ONAYI</b><p>OCR sonucu <strong>{candidates.length}</strong> aday veri bulundu. Bu veriler mevcut {borehole.name} kaydına aktarılmadan önce kontrol edilmelidir.</p><div className="scanner-dialog-actions"><button onClick={() => setShowApproval(false)}>İptal</button><button className="primary-button" onClick={approve}>Onayla ve Aktar</button></div></div></div>}
  </section>
}
