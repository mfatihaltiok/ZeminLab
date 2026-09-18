import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api={
  project:{save:(payload:unknown,currentPath?:string)=>ipcRenderer.invoke('project:save',payload,currentPath) as Promise<string|null>,open:()=>ipcRenderer.invoke('project:open') as Promise<{filePath:string;data:unknown;version:number}|null>},
  ocr:{
    analyzeImage:(dataUrl:string)=>ipcRenderer.invoke('ocr:analyze-image',{dataUrl}) as Promise<{ok:boolean;provider?:string;engines?:{ocr?:string;layout_table?:string};lines?:Array<{text:string;score?:number|null;box?:unknown}>;structured?:unknown[];document?:{text?:string;tables?:unknown[];pages?:number};warnings?:{paddle?:string|null;docling?:string|null};policy?:{no_guessing?:boolean;requires_user_review?:boolean;reject_ambiguous_values?:boolean};error?:string}>
  },
  report:{print:()=>ipcRenderer.invoke('report:print') as Promise<boolean>,exportPdf:()=>ipcRenderer.invoke('report:export-pdf') as Promise<string|null>},
  window:{minimize:()=>ipcRenderer.invoke('window:minimize') as Promise<void>,maximizeToggle:()=>ipcRenderer.invoke('window:maximize-toggle') as Promise<boolean>,close:()=>ipcRenderer.invoke('window:close') as Promise<void>}
}
if(process.contextIsolated){try{contextBridge.exposeInMainWorld('electron',electronAPI);contextBridge.exposeInMainWorld('api',api)}catch(error){console.error(error)}}else{
  // @ts-ignore
  window.electron=electronAPI
  // @ts-ignore
  window.api=api
}
