import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { OcrCandidate, OcrDocumentResult, OcrLaboratoryCandidate, OcrPageResult, OcrSptCandidate, OcrWord } from './ocr-types'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface OcrOptions {
  dpi?: number
  startPage?: number
  endPage?: number
  onProgress?: (value: number) => void
}

const numberPattern = /[-+]?\d+(?:[.,]\d+)?/g
const normalizeNumber = (value: string) => Number(value.replace(',', '.'))

function numericTokens(text: string): number[] {
  return (text.match(numberPattern) ?? []).map(normalizeNumber).filter(Number.isFinite)
}

function pageConfidence(words: OcrWord[]): number | undefined {
  const values = words.map((word) => word.confidence).filter((value): value is number => value !== undefined && Number.isFinite(value))
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined
}

function parseSptCandidates(page: OcrPageResult): OcrSptCandidate[] {
  const candidates: OcrSptCandidate[] = []
  for (const line of page.text.split(/\r?\n/)) {
    const values = numericTokens(line)
    if (values.length !== 4) continue
    const [depth, n1, n2, n3] = values
    if (depth < 0 || depth > 200 || n1 < 0 || n2 < 0 || n3 < 0 || n1 > 200 || n2 > 200 || n3 > 200) continue
    candidates.push({ kind: 'spt', pageNumber: page.pageNumber, confidence: page.confidence ?? 0, rawText: line.trim(), depth, n1, n2, n3 })
  }
  return candidates
}

function parseLaboratoryCandidates(page: OcrPageResult): OcrLaboratoryCandidate[] {
  const candidates: OcrLaboratoryCandidate[] = []
  for (const line of page.text.split(/\r?\n/)) {
    const lower = line.toLocaleLowerCase('tr-TR')
    if (!/(ll|likit|plast|su muhtevas|water|fines|ince)/.test(lower)) continue
    const values = numericTokens(line)
    if (values.length < 1 || values.length > 5) continue
    const candidate: OcrLaboratoryCandidate = { kind: 'laboratory', pageNumber: page.pageNumber, confidence: page.confidence ?? 0, rawText: line.trim() }
    if (/ll|likit/.test(lower)) candidate.liquidLimit = values[0]
    if (/plast/.test(lower)) candidate.plasticLimit = values[Math.min(1, values.length - 1)]
    if (/su muhtevas|water/.test(lower)) candidate.waterContent = values[0]
    if (/fines|ince/.test(lower)) candidate.finesContent = values[0]
    candidates.push(candidate)
  }
  return candidates
}

type PaddleLine = { text: string; score?: number | null; box?: unknown }

function toBox(box: unknown) {
  if (!Array.isArray(box) || box.length < 4) return undefined
  const points = box as Array<Array<number>>
  const xs = points.map((point) => Number(point?.[0])).filter(Number.isFinite)
  const ys = points.map((point) => Number(point?.[1])).filter(Number.isFinite)
  return xs.length && ys.length ? { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } : undefined
}

async function recognizeImageDataUrl(dataUrl: string, pageNumber: number, width: number, height: number, options: OcrOptions): Promise<OcrPageResult> {
  const result = await window.api.ocr.analyzeImage(dataUrl)
  if (!result.ok) throw new Error(result.error || 'PaddleOCR başarısız oldu.')
  const lines = (result.lines ?? []) as PaddleLine[]
  const words: OcrWord[] = lines.map((line) => ({ text: line.text, confidence: line.score == null ? undefined : line.score * 100, bbox: toBox(line.box) }))
  return {
    pageNumber,
    width,
    height,
    text: lines.map((line) => line.text).join('\n'),
    confidence: pageConfidence(words),
    words
  }
}

async function recognizeImage(file: File, options: OcrOptions): Promise<OcrPageResult[]> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Görsel okunamadı.'))
    reader.readAsDataURL(file)
  })
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  options.onProgress?.(0)
  const page = await recognizeImageDataUrl(dataUrl, 1, image.naturalWidth, image.naturalHeight, options)
  options.onProgress?.(1)
  return [page]
}

async function renderPdfPages(file: File, options: OcrOptions): Promise<OcrPageResult[]> {
  const pdf = await getDocument({ data: await file.arrayBuffer() }).promise
  const start = Math.max(1, options.startPage ?? 1)
  const end = Math.min(pdf.numPages, options.endPage ?? pdf.numPages)
  const dpi = Math.max(100, Math.min(options.dpi ?? 200, 400))
  const scale = dpi / 72
  const total = Math.max(end - start + 1, 1)
  const pages: OcrPageResult[] = []

  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error(`PDF ${pageNumber}. sayfa için çizim bağlamı oluşturulamadı.`)
    await page.render({ canvas, canvasContext: context, viewport }).promise
    const result = await recognizeImageDataUrl(canvas.toDataURL('image/png'), pageNumber, canvas.width, canvas.height, options)
    pages.push(result)
    options.onProgress?.((pageNumber - start + 1) / total)
  }
  return pages
}

export async function runOcr(file: File, options: OcrOptions = {}): Promise<{ document: OcrDocumentResult; candidates: OcrCandidate[] }> {
  const kind = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
  const pages = kind === 'pdf' ? await renderPdfPages(file, options) : await recognizeImage(file, options)
  const document: OcrDocumentResult = { fileName: file.name, kind, pageCount: pages.length, pages }
  const candidates = pages.flatMap((page) => [...parseSptCandidates(page), ...parseLaboratoryCandidates(page)])
  return { document, candidates }
}
