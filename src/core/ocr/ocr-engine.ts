import { createWorker } from 'tesseract.js'
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
    const confidence = page.confidence ?? 0
    candidates.push({ kind: 'spt', pageNumber: page.pageNumber, confidence, rawText: line.trim(), depth, n1, n2, n3 })
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

async function recognizeCanvas(canvas: HTMLCanvasElement, pageNumber: number, worker: Awaited<ReturnType<typeof createWorker>>, onProgress?: (value: number) => void): Promise<OcrPageResult> {
  const result = await worker.recognize(canvas, {}, { blocks: true })
  const data = result.data as { text?: string; blocks?: Array<{ paragraphs?: Array<{ lines?: Array<{ words?: Array<{ text?: string; confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }> }> }> }> }
  const words: OcrWord[] = []
  for (const block of data.blocks ?? []) for (const paragraph of block.paragraphs ?? []) for (const line of paragraph.lines ?? []) for (const word of line.words ?? []) if (word.text) words.push({ text: word.text, confidence: word.confidence, bbox: word.bbox })
  onProgress?.(pageNumber)
  return { pageNumber, width: canvas.width, height: canvas.height, text: data.text ?? '', confidence: pageConfidence(words), words }
}

async function renderPdfPages(file: File, options: OcrOptions, worker: Awaited<ReturnType<typeof createWorker>>): Promise<OcrPageResult[]> {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  const start = Math.max(1, options.startPage ?? 1)
  const end = Math.min(pdf.numPages, options.endPage ?? pdf.numPages)
  const dpi = Math.max(100, Math.min(options.dpi ?? 200, 400))
  const scale = dpi / 72
  const pages: OcrPageResult[] = []
  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error(`PDF ${pageNumber}. sayfa için çizim bağlamı oluşturulamadı.`)
    await page.render({ canvasContext: context, viewport }).promise
    pages.push(await recognizeCanvas(canvas, pageNumber, worker, (completedPage) => options.onProgress?.(completedPage / Math.max(end - start + 1, 1))))
  }
  return pages
}

async function recognizeImage(file: File, worker: Awaited<ReturnType<typeof createWorker>>, options: OcrOptions): Promise<OcrPageResult[]> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Görsel OCR için çizim bağlamı oluşturulamadı.')
    context.drawImage(image, 0, 0)
    return [await recognizeCanvas(canvas, 1, worker, () => options.onProgress?.(1))]
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function runOcr(file: File, options: OcrOptions = {}): Promise<{ document: OcrDocumentResult; candidates: OcrCandidate[] }> {
  const worker = await createWorker('tur+eng', 1, { logger: (message) => options.onProgress?.(typeof message.progress === 'number' ? message.progress : 0) })
  try {
    const kind = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
    const pages = kind === 'pdf' ? await renderPdfPages(file, options, worker) : await recognizeImage(file, worker, options)
    const document: OcrDocumentResult = { fileName: file.name, kind, pageCount: pages.length, pages }
    const candidates = pages.flatMap((page) => [...parseSptCandidates(page), ...parseLaboratoryCandidates(page)])
    return { document, candidates }
  } finally {
    await worker.terminate()
  }
}
