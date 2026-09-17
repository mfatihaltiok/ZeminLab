import { app, shell, BrowserWindow, dialog, ipcMain, net, safeStorage } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const projectSaveFilter=[{name:'ZeminLab Projesi',extensions:['zlproj']}]
const projectOpenFilter=[{name:'ZeminLab Projesi',extensions:['zlproj','zlab']}]
const pdfFilter=[{name:'PDF Belgesi',extensions:['pdf']}]
const PROJECT_SCHEMA_VERSION=2
const ocrSettingsPath=()=>join(app.getPath('userData'),'ocr-settings.json')
type StoredOcrSettings={provider:'local'|'remote';endpoint:string;apiKey?:string}
async function readOcrSettings():Promise<StoredOcrSettings>{try{const raw=await fs.readFile(ocrSettingsPath(),'utf8');const value=JSON.parse(raw) as StoredOcrSettings;return{provider:value.provider==='remote'?'remote':'local',endpoint:value.endpoint??'',apiKey:value.apiKey?safeStorage.isEncryptionAvailable()?safeStorage.decryptString(Buffer.from(value.apiKey,'base64')):value.apiKey:undefined}}catch{return{provider:'local',endpoint:''}}}
async function writeOcrSettings(input:{provider:'local'|'remote';endpoint:string;apiKey?:string}):Promise<void>{const apiKey=input.apiKey?.trim();const stored:StoredOcrSettings={provider:input.provider,endpoint:input.endpoint.trim(),apiKey:apiKey?(safeStorage.isEncryptionAvailable()?safeStorage.encryptString(apiKey).toString('base64'):apiKey):undefined};await fs.mkdir(app.getPath('userData'),{recursive:true});await fs.writeFile(ocrSettingsPath(),JSON.stringify(stored,null,2),'utf8')}
async function testEndpoint(endpoint?:string){const url=endpoint?.trim();if(!url)return{online:net.isOnline(),reachable:false,message:net.isOnline()?'İnternet bağlantısı var; OCR API adresi tanımlı değil.':'İnternet bağlantısı yok.'};try{const response=await net.fetch(url,{method:'HEAD'});return{online:net.isOnline(),reachable:response.ok||response.status<500,message:response.ok?`OCR API erişilebilir (${response.status}).`:`OCR API yanıt verdi (${response.status}).`}}catch(error){return{online:net.isOnline(),reachable:false,message:`Ağ varlığı: ${net.isOnline()?'bağlı':'çevrimdışı'}; OCR API erişilemedi: ${error instanceof Error?error.message:'bilinmeyen hata'}`}}}
function createWindow():void{
 const mainWindow=new BrowserWindow({width:1440,height:900,minWidth:1180,minHeight:720,show:false,frame:false,autoHideMenuBar:true,...(process.platform==='linux'?{icon}:{}),webPreferences:{preload:join(__dirname,'../preload/index.js'),sandbox:false}})
 mainWindow.on('ready-to-show',()=>mainWindow.show())
 mainWindow.webContents.setWindowOpenHandler(details=>{shell.openExternal(details.url);return{action:'deny'}})
 if(is.dev&&process.env['ELECTRON_RENDERER_URL'])mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);else mainWindow.loadFile(join(__dirname,'../renderer/index.html'))
}
app.whenReady().then(()=>{
 electronApp.setAppUserModelId('com.zeminlab.app')
 app.on('browser-window-created',(_,window)=>optimizer.watchWindowShortcuts(window))
 ipcMain.handle('project:save',async(_event,payload:unknown,currentPath?:string)=>{
  let filePath=currentPath
  if(!filePath){const result=await dialog.showSaveDialog({title:'ZeminLab Projesini Kaydet',defaultPath:'Yeni Proje.zlproj',filters:projectSaveFilter});if(result.canceled||!result.filePath)return null;filePath=result.filePath.endsWith('.zlproj')?result.filePath:`${result.filePath}.zlproj`}
  const envelope={format:'ZeminLab',version:PROJECT_SCHEMA_VERSION,savedAt:new Date().toISOString(),data:payload}
  await fs.writeFile(filePath,JSON.stringify(envelope,null,2),'utf8');return filePath
 })
 ipcMain.handle('project:open',async()=>{
  const result=await dialog.showOpenDialog({title:'ZeminLab Projesini Aç',properties:['openFile'],filters:projectOpenFilter});if(result.canceled||!result.filePaths[0])return null
  const filePath=result.filePaths[0];const raw=await fs.readFile(filePath,'utf8');const envelope=JSON.parse(raw) as {format?:string;version?:number;data?:unknown}
  if(envelope.format!=='ZeminLab'||typeof envelope.version!=='number'||envelope.data===undefined)throw new Error('Geçersiz veya desteklenmeyen ZeminLab proje dosyası.')
  if(envelope.version>PROJECT_SCHEMA_VERSION)throw new Error(`Bu proje dosyası daha yeni bir ZeminLab sürümüne ait (v${envelope.version}).`)
  return{filePath,data:envelope.data,version:envelope.version}
 })
 ipcMain.handle('ocr:status',async()=>{const settings=await readOcrSettings();return{online:net.isOnline(),config:{provider:settings.provider,endpoint:settings.endpoint,hasApiKey:Boolean(settings.apiKey)}}})
 ipcMain.handle('ocr:save-config',async(_event,input:{provider:'local'|'remote';endpoint:string;apiKey?:string})=>{const current=await readOcrSettings();await writeOcrSettings({provider:input.provider,endpoint:input.endpoint,apiKey:input.apiKey?.trim()||current.apiKey});return true})
 ipcMain.handle('ocr:test',async(_event,endpoint?:string)=>testEndpoint(endpoint))
 ipcMain.handle('report:print',async event=>{const window=BrowserWindow.fromWebContents(event.sender);if(!window)return false;return await new Promise<boolean>(resolve=>window.webContents.print({printBackground:true,silent:false},success=>resolve(success)))})
 ipcMain.handle('report:export-pdf',async event=>{const window=BrowserWindow.fromWebContents(event.sender);if(!window)return null;const result=await dialog.showSaveDialog(window,{title:'Mühendislik Raporunu PDF Olarak Kaydet',defaultPath:'ZeminLab-Muhendislik-Raporu.pdf',filters:pdfFilter});if(result.canceled||!result.filePath)return null
  const pdf=await window.webContents.printToPDF({landscape:false,pageSize:'A4',printBackground:true,displayHeaderFooter:false,margins:{top:0,bottom:0,left:0,right:0}})
  const filePath=result.filePath.endsWith('.pdf')?result.filePath:`${result.filePath}.pdf`;await fs.writeFile(filePath,pdf);return filePath
 })
 ipcMain.handle('window:minimize',event=>BrowserWindow.fromWebContents(event.sender)?.minimize())
 ipcMain.handle('window:maximize-toggle',event=>{const window=BrowserWindow.fromWebContents(event.sender);if(!window)return false;if(window.isMaximized())window.unmaximize();else window.maximize();return window.isMaximized()})
 ipcMain.handle('window:close',event=>BrowserWindow.fromWebContents(event.sender)?.close())
 createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})
})
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})
