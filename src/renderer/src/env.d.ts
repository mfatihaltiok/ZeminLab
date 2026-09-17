/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      project: { save(payload: unknown, currentPath?: string): Promise<string | null>; open(): Promise<{ filePath: string; data: unknown; version: number } | null> }
      ocr: { status(): Promise<{ online: boolean; config: { provider: 'local' | 'remote'; endpoint: string; hasApiKey: boolean } }>; saveConfig(input: { provider: 'local' | 'remote'; endpoint: string; apiKey?: string }): Promise<boolean>; test(endpoint?: string): Promise<{ online: boolean; reachable: boolean; message: string }> }
      report: { print(): Promise<boolean>; exportPdf(): Promise<string | null> }
      window: { minimize(): Promise<void>; maximizeToggle(): Promise<boolean>; close(): Promise<void> }
    }
  }
}
export {}
