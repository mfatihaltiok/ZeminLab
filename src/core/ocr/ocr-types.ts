export type OcrInputKind = 'image' | 'pdf'
export type OcrCandidateKind = 'spt' | 'laboratory'

export interface OcrBoundingBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrWord {
  text: string
  confidence?: number
  bbox?: OcrBoundingBox
}

export interface OcrPageResult {
  pageNumber: number
  width: number
  height: number
  text: string
  confidence?: number
  words: OcrWord[]
}

export interface OcrDocumentResult {
  fileName: string
  kind: OcrInputKind
  pageCount: number
  pages: OcrPageResult[]
}

export interface OcrSptCandidate {
  kind: 'spt'
  pageNumber: number
  confidence: number
  rawText: string
  depth: number
  n1: number
  n2: number
  n3: number
}

export interface OcrLaboratoryCandidate {
  kind: 'laboratory'
  pageNumber: number
  confidence: number
  rawText: string
  liquidLimit?: number
  plasticLimit?: number
  waterContent?: number
  finesContent?: number
}

export type OcrCandidate = OcrSptCandidate | OcrLaboratoryCandidate
