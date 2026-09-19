import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const projectSaveFilter=[{name:'FALUZMN Projesi',extensions:['falu']}]
const projectOpenFilter=[{name:'FALUZMN Projesi',extensions:['falu']}]
const pdfFilter=[{name:'PDF Belgesi',extensions:['pdf']}]
const PROJECT_SCHEMA_VERSION=1
const FIELD_CACHE_SCHEMA_VERSION=1

function createWindow():void{
  const mainWindow=new BrowserWindow({
    width:1440,height:900,minWidth:1180,minHeight:720,show:false,frame:false,autoHideMenuBar:true,
    ...(process.platform==='linux'?{icon}:{}),
    webPreferences:{preload:join(__dirname,'../preload/index.js'),sandbox:false}
  })
  mainWindow.on('ready-to-show',()=>mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(details=>{shell.openExternal(details.url);return{action:'deny'}})
  if(is.dev&&process.env['ELECTRON_RENDERER_URL'])mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else mainWindow.loadFile(join(__dirname,'../renderer/index.html'))
}

app.whenReady().then(()=>{
  electronApp.setAppUserModelId('com.faluzmn.app')
  app.on('browser-window-created',(_,window)=>optimizer.watchWindowShortcuts(window))

  const writeProjectFile=async(filePath:string,payload:unknown)=>{
    const envelope={format:'FALUZMN',version:PROJECT_SCHEMA_VERSION,savedAt:new Date().toISOString(),data:payload}
    await fs.writeFile(filePath,JSON.stringify(envelope,null,2),'utf8')
    return filePath
  }

  const chooseProjectSavePath=async(title:string,defaultPath:string)=>{
    const result=await dialog.showSaveDialog({title,defaultPath,filters:projectSaveFilter})
    if(result.canceled||!result.filePath)return null
    return result.filePath.toLowerCase().endsWith('.falu')?result.filePath:`${result.filePath}.falu`
  }

  ipcMain.handle('project:save',async(_event,payload:unknown,currentPath?:string)=>{
    const filePath=currentPath??await chooseProjectSavePath('FALUZMN Projesini Kaydet','Yeni Proje.falu')
    if(!filePath)return null
    return await writeProjectFile(filePath,payload)
  })

  ipcMain.handle('project:save-as',async(_event,payload:unknown,currentPath?:string)=>{
    const defaultName=currentPath?currentPath.split(/[\\/]/).pop()??'Yeni Proje.falu':'Yeni Proje.falu'
    const filePath=await chooseProjectSavePath('FALUZMN Projesini Farklı Kaydet',defaultName)
    if(!filePath)return null
    return await writeProjectFile(filePath,payload)
  })

  ipcMain.handle('project:open',async()=>{
    const result=await dialog.showOpenDialog({title:'FALUZMN Projesi Aç',properties:['openFile'],filters:projectOpenFilter})
    if(result.canceled||!result.filePaths[0])return null
    const filePath=result.filePaths[0]
    const raw=await fs.readFile(filePath,'utf8')
    const envelope=JSON.parse(raw) as {format?:string;version?:number;data?:unknown}
    if(envelope.format!=='FALUZMN'||typeof envelope.version!=='number'||envelope.data===undefined)throw new Error('Geçersiz veya desteklenmeyen FALUZMN proje dosyası.')
    if(envelope.version>PROJECT_SCHEMA_VERSION)throw new Error(`Bu proje dosyası daha yeni bir FALUZMN sürümüne ait (v${envelope.version}).`)
    return{filePath,data:envelope.data,version:envelope.version}
  })

  ipcMain.handle('field-cache:save',async(_event,payload:unknown)=>{
    const cachePath=join(app.getPath('userData'),'FALUZMN-field-cache.json')
    const envelope={format:'FALUZMN-FIELD-CACHE',version:FIELD_CACHE_SCHEMA_VERSION,savedAt:new Date().toISOString(),data:payload}
    await fs.mkdir(app.getPath('userData'),{recursive:true})
    await fs.writeFile(cachePath,JSON.stringify(envelope,null,2),'utf8')
    return {cachePath,savedAt:envelope.savedAt}
  })

  ipcMain.handle('field-cache:load',async()=>{
    const cachePath=join(app.getPath('userData'),'FALUZMN-field-cache.json')
    try{
      const raw=await fs.readFile(cachePath,'utf8')
      const envelope=JSON.parse(raw) as {format?:string;version?:number;data?:unknown;savedAt?:string}
      if(envelope.format!=='FALUZMN-FIELD-CACHE'||envelope.version!==FIELD_CACHE_SCHEMA_VERSION)return null
      return {data:envelope.data,savedAt:envelope.savedAt}
    }catch{return null}
  })

  ipcMain.handle('report:print',async event=>{
    const window=BrowserWindow.fromWebContents(event.sender)
    if(!window)return false
    return await new Promise<boolean>(resolve=>window.webContents.print({printBackground:true,silent:false},success=>resolve(success)))
  })

  ipcMain.handle('report:export-pdf',async event=>{
    const window=BrowserWindow.fromWebContents(event.sender)
    if(!window)return null
    const result=await dialog.showSaveDialog(window,{title:'Mühendislik Raporunu PDF Olarak Kaydet',defaultPath:'FALUZMN-Mühendislik-Raporu.pdf',filters:pdfFilter})
    if(result.canceled||!result.filePath)return null
    const pdf=await window.webContents.printToPDF({landscape:false,pageSize:'A4',printBackground:true,displayHeaderFooter:false,margins:{top:0,bottom:0,left:0,right:0}})
    const filePath=result.filePath.endsWith('.pdf')?result.filePath:`${result.filePath}.pdf`
    await fs.writeFile(filePath,pdf)
    return filePath
  })

  ipcMain.handle('window:minimize',event=>BrowserWindow.fromWebContents(event.sender)?.minimize())
  ipcMain.handle('window:maximize-toggle',event=>{
    const window=BrowserWindow.fromWebContents(event.sender)
    if(!window)return false
    if(window.isMaximized())window.unmaximize();else window.maximize()
    return window.isMaximized()
  })
  ipcMain.handle('window:close',event=>BrowserWindow.fromWebContents(event.sender)?.close())

  createWindow()
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})
})

app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})
