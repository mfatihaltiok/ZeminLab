/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      project: {
        save(payload: unknown, currentPath?: string): Promise<string | null>
        saveAs(payload: unknown, currentPath?: string): Promise<string | null>
        open(): Promise<{ filePath: string; data: unknown; version: number } | null>
      }
      fieldCache: {
        saveBoreholes(projectId: string, payload: unknown): Promise<{ cachePath: string; savedAt: string }>
        saveLaboratories(projectId: string, payload: unknown): Promise<{ cachePath: string; savedAt: string }>
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
