import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      project: {
        save: (payload: unknown,currentPath?: string) => Promise<string|null>
        saveAs: (payload: unknown,currentPath?: string) => Promise<string|null>
        open: () => Promise<{filePath:string;data:unknown;version:number}|null>
      }
      fieldCache: {
        saveBoreholes: (payload: unknown) => Promise<{cachePath:string;savedAt:string}>
        saveLaboratories: (payload: unknown) => Promise<{cachePath:string;savedAt:string}>
        load: () => Promise<{boreholes?:unknown;laboratories?:unknown;savedAt?:string}|null>
      }
      report: {
        print: () => Promise<boolean>
        exportPdf: () => Promise<string|null>
      }
      window: {
        minimize: () => Promise<void>
        maximizeToggle: () => Promise<boolean>
        close: () => Promise<void>
      }
    }
  }
}
