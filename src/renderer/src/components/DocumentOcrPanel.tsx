import { useRef, useState } from 'react'
import type { BoreholeRecord, LaboratoryRecord, SptRecord } from '../../../core/models/field-data'
import type { OcrCandidate, OcrDocumentResult } from '../../../core/ocr/ocr-types'
import { runOcr } from '../../../core/ocr/ocr-engine'
import './document-ocr-panel.css'

type Props = {
  boreholes: BoreholeRecord[]
  labs: LaboratoryRecord[]
  onBoreholesChange: (rows: BoreholeRecord[]) => void
  onLabsChange: (rows: LaboratoryRecord[]) => void
}

const fmt = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '—'

export function DocumentOcrPanel({ boreholes, labs, onBoreholesChange, onLabsChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [document, setDocument] = useState<OcrDocumentResult>()
  const [candidates, setCandidates] = useState<OcrCandidate[]>([])
  const [selectedBoreholeId, setSelectedBoreholeId] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [labDepths, setLabDepths] = useState<Record<number, string>>({})

  const chooseFile = () => inputRef.current?.click()
  const handleFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setMessage('OCR çalışıyor…')
    setProgress(0)
    try {
      const result = await runOcr(file, { dpi: 200, onProgress: setProgress })
      setDocument(result.document)
      setCandidates(result.candidates)
      setMessage(`${result.document.pageCount} sayfa tarandı · ${result.candidates.length} aday bulundu`)
    } catch (error) {
      console.error(error)
      setMessage(error instanceof Error ? error.message : 'OCR işlemi başarısız.')
    } finally {
      setBusy(false)
    }
  }

  const rejectCandidate = (index: number) => setCandidates((rows) => rows.filter((_, i) => i !== index))

  const importSpt = (candidate: Extract<OcrCandidate, { kind: 'spt' }>, index: number) => {
    const borehole = boreholes.find((row) => row.id === selectedBoreholeId)
    if (!borehole) { setMessage('SPT aktarımı için önce bir sondaj seçin.'); return }
    const record: SptRecord = { id: crypto.randomUUID(), depth: candidate.depth, depthTo: candidate.depth + 0.45, testType: 'SPT', n1: candidate.n1, n2: candidate.n2, n3: candidate.n3, source: 'imported', confirmed: true, laboratoryLinked: true }
    onBoreholesChange(boreholes.map((row) => row.id === borehole.id ? { ...row, spt: [...row.spt, record].sort((a, b) => a.depth - b.depth) } : row))
    rejectCandidate(index)
    setMessage(`SPT ${fmt(candidate.depth)} m olarak ${borehole.name} sondajına aktarıldı.`)
  }

  const importLab = (candidate: Extract<OcrCandidate, { kind: 'laboratory' }>, index: number) => {
    const borehole = boreholes.find((row) => row.id === selectedBoreholeId)
    const depth = Number(labDepths[index])
    if (!borehole) { setMessage('Laboratuvar aktarımı için önce bir sondaj seçin.'); return }
    if (!Number.isFinite(depth) || depth < 0) { setMessage('Laboratuvar adayı için gerçek numune derinliğini girin. OCR bu bilgiyi güvenilir biçimde bulamadıysa değer uydurulmaz.'); return }
    const record: LaboratoryRecord = { id: crypto.randomUUID(), boreholeId: borehole.id, sampleId: `OCR-${new Date().toISOString().slice(0, 10)}`, depth, sampleType: 'Other', waterContent: candidate.waterContent, liquidLimit: candidate.liquidLimit, plasticLimit: candidate.plasticLimit, finesContent: candidate.finesContent, source: 'imported', confirmed: true, notes: `OCR kaynağı: ${document?.fileName ?? 'belge'}, sayfa ${candidate.pageNumber}` }
    onLabsChange([...labs, record])
    rejectCandidate(index)
    setMessage(`Laboratuvar adayı ${fmt(depth)} m olarak ${borehole.name} sondajına aktarıldı.`)
  }

  return <section className="document-ocr-panel"><div className="document-ocr-header"><div><div className="document-ocr-kicker">BELGE OKUMA</div><h3>OCR ile saha / laboratuvar verisi</h3><p>Belge okunur, adaylar çıkarılır ve yalnızca kullanıcı onayından sonra proje verisine aktarılır.</p></div><button type="button" onClick={chooseFile} disabled={busy}>{busy ? 'OCR çalışıyor…' : 'PDF / Görsel seç'}</button><input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></div><div className="document-ocr-controls"><label>Sondaj<select value={selectedBoreholeId} onChange={(event) => setSelectedBoreholeId(event.target.value)}><option value="">Aktarım için seçiniz</option>{boreholes.map((borehole) => <option key={borehole.id} value={borehole.id}>{borehole.name}</option>)}</select></label>{busy && <div className="document-ocr-progress"><span style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }} /></div>}<span className="document-ocr-status">{message}</span></div>{document && <div className="document-ocr-summary"><b>{document.fileName}</b><span>{document.kind.toUpperCase()} · {document.pageCount} sayfa · {candidates.length} bekleyen aday</span></div>}{candidates.length > 0 && <div className="document-ocr-candidates">{candidates.map((candidate, index) => candidate.kind === 'spt' ? <div className="ocr-candidate" key={`${candidate.pageNumber}-${index}`}><div><b>SPT adayı</b><span>Sayfa {candidate.pageNumber} · Güven {candidate.confidence.toFixed(0)}%</span><code>{candidate.rawText}</code></div><div className="ocr-values"><span>z = {fmt(candidate.depth)} m</span><span>n1 = {candidate.n1}</span><span>n2 = {candidate.n2}</span><span>n3 = {candidate.n3}</span></div><div className="ocr-actions"><button type="button" onClick={() => importSpt(candidate, index)}>Onayla ve aktar</button><button type="button" onClick={() => rejectCandidate(index)}>Reddet</button></div></div> : <div className="ocr-candidate" key={`${candidate.pageNumber}-${index}`}><div><b>Laboratuvar adayı</b><span>Sayfa {candidate.pageNumber} · Güven {candidate.confidence.toFixed(0)}%</span><code>{candidate.rawText}</code></div><div className="ocr-values"><span>LL = {candidate.liquidLimit ?? '—'}</span><span>PL = {candidate.plasticLimit ?? '—'}</span><span>w = {candidate.waterContent ?? '—'}</span><span>İnce = {candidate.finesContent ?? '—'}</span><label>Numune derinliği<input type="number" min="0" step="0.01" value={labDepths[index] ?? ''} onChange={(event) => setLabDepths((state) => ({ ...state, [index]: event.target.value }))} /></label></div><div className="ocr-actions"><button type="button" onClick={() => importLab(candidate, index)}>Onayla ve aktar</button><button type="button" onClick={() => rejectCandidate(index)}>Reddet</button></div></div>)}</div>}{document && candidates.length === 0 && <div className="document-ocr-empty">Belgeden güvenilir aktarım adayı çıkarılmadı. OCR metni sonuçların yerine geçmez, mühendislik verisi kullanıcı onayı olmadan yazılmaz.</div>}</section>
}
