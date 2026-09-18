/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      project: {
        save(payload: unknown, currentPath?: string): Promise<string | null>
        open(): Promise<{ filePath: string; data: unknown; version: number } | null>
      }
      ocr: {
        analyzeImage(dataUrl: string): Promise<{
          ok: boolean
          provider?: string
          engines?: { ocr?: string; layout_table?: string }
          lines?: Array<{ text: string; score?: number | null; box?: unknown }>
          structured?: unknown[]
          document?: { text?: string; tables?: unknown[]; pages?: number }
          warnings?: { paddle?: string | null; docling?: string | null }
          policy?: {
            no_guessing?: boolean
            requires_user_review?: boolean
            reject_ambiguous_values?: boolean
          }
          error?: string
        }>
      }
      report: {
        print(): Promise<boolean>
        exportPdf(): Promise<string | null>
      }
      window: {
        minimize(): Promise<void>
        maximizeToggle(): Promise<boolean>
        close(): Promise<void>
      }
    }
  }
}

export {}
