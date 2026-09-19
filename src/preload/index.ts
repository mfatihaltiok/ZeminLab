import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api={
  project:{save:(payload:unknown,currentPath?:string)=>ipcRenderer.invoke('project:save',payload,currentPath) as Promise<string|null>,saveAs:(payload:unknown,currentPath?:string)=>ipcRenderer.invoke('project:save-as',payload,currentPath) as Promise<string|null>,open:()=>ipcRenderer.invoke('project:open') as Promise<{filePath:string;data:unknown;version:number}|null>},
  fieldCache:{saveBoreholes:(payload:unknown)=>ipcRenderer.invoke('field-cache:save-boreholes',payload) as Promise<{cachePath:string;savedAt:string}>,saveLaboratories:(payload:unknown)=>ipcRenderer.invoke('field-cache:save-laboratories',payload) as Promise<{cachePath:string;savedAt:string}>,load:()=>ipcRenderer.invoke('field-cache:load') as Promise<{boreholes?:unknown;laboratories?:unknown;savedAt?:string}|null>},
  report:{print:()=>ipcRenderer.invoke('report:print') as Promise<boolean>,exportPdf:()=>ipcRenderer.invoke('report:export-pdf') as Promise<string|null>},
  window:{minimize:()=>ipcRenderer.invoke('window:minimize') as Promise<void>,maximizeToggle:()=>ipcRenderer.invoke('window:maximize-toggle') as Promise<boolean>,close:()=>ipcRenderer.invoke('window:close') as Promise<void>}
}
if(process.contextIsolated){try{contextBridge.exposeInMainWorld('electron',electronAPI);contextBridge.exposeInMainWorld('api',api)}catch(error){console.error(error)}}else{
  // @ts-ignore
  window.electron=electronAPI
  // @ts-ignore
  window.api=api
}
