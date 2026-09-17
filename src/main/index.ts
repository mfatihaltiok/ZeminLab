import { app, shell, BrowserWindow, dialog, ipcMain, net, safeStorage } from 'electron'
import { join } from 'path'
import { promises as fs, existsSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const projectSaveFilter=[{name:'ZeminLab Projesi',extensions:['zlproj']}]
const projectOpenFilter=[{name:'ZeminLab Projesi',extensions:['zlproj','zlab']}]
const pdfFilter=[{name:'PDF Belgesi',extensions:['pdf']}]
const PROJECT_SCHEMA_VERSION=2
const execFileAsync=promisify(execFile)
const GOOGLE_VISION_ENDPOINT='https://vision.googleapis.com/v1/images:annotate'
const ocrSettingsPath=()=>join(app.getPath('userData'),'ocr-settings.json')

type StoredOcrSettings={provider:'local'|'google'|'remote';endpoint:string;apiKey?:string}
type GoogleVertex={x?:number;y?:number}
type GoogleAnnotation={description?:string;boundingPoly?:{vertices?:GoogleVertex[]}}
type GoogleOcrResponse={error?:{message?:string;status?:string};textAnnotations?:GoogleAnnotation[];fullTextAnnotation?:{text?:string}}
type GoogleVisionPayload={responses?:GoogleOcrResponse[]}

async function readOcrSettings():Promise<StoredOcrSettings>{
  try{
    const raw=await fs.readFile(ocrSettingsPath(),'utf8')
    const value=JSON.parse(raw) as Partial<StoredOcrSettings>
    const encrypted=value.apiKey
    let apiKey:string|undefined
    if(encrypted){
      apiKey=safeStorage.isEncryptionAvailable()?safeStorage.decryptString(Buffer.from(encrypted,'base64')):encrypted
    }
    return{provider:value.provider==='google'||value.provider==='remote'?'google':'local',endpoint:value.endpoint||GOOGLE_VISION_ENDPOINT,apiKey}
  }catch{
    return{provider:'google',endpoint:GOOGLE_VISION_ENDPOINT}
  }
}

async function writeOcrSettings(input:{endpoint?:string;apiKey?:string}):Promise<void>{
  const apiKey=input.apiKey?.trim()
  const stored:StoredOcrSettings={
    provider:'local',
    endpoint:input.endpoint?.trim()||GOOGLE_VISION_ENDPOINT,
    apiKey:apiKey?(safeStorage.isEncryptionAvailable()?safeStorage.encryptString(apiKey).toString('base64'):apiKey):undefined
  }
  await fs.mkdir(app.getPath('userData'),{recursive:true})
  await fs.writeFile(ocrSettingsPath(),JSON.stringify(stored,null,2),'utf8')
}

async function testEndpoint(endpoint?:string){
  const url=endpoint?.trim()||GOOGLE_VISION_ENDPOINT
  if(!net.isOnline())return{online:false,reachable:false,message:'İnternet bağlantısı yok.'}
  try{
    const response=await net.fetch(url,{method:'HEAD'})
    return{online:true,reachable:response.status<500,message:`Google Vision API yanıt verdi (${response.status}).`}
  }catch(error){
    return{online:true,reachable:false,message:`Google Vision API erişilemedi: ${error instanceof Error?error.message:'bilinmeyen hata'}`}
  }
}

function googleApiError(body:string,status:number):string{
  try{
    const value=JSON.parse(body) as {error?:{message?:string;status?:string}}
    const message=value.error?.message?.trim()
    const apiStatus=value.error?.status?.trim()
    if(message&&apiStatus)return`Google Vision API hatası (${apiStatus}, HTTP ${status}): ${message}`
    if(message)return`Google Vision API hatası (HTTP ${status}): ${message}`
  }catch{
    // JSON olmayan hata gövdesi
  }
  return`Google Vision API isteği başarısız oldu (HTTP ${status}).`
}

async function runGoogleVisionOcr(dataUrl:string){
  const match=/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl)
  if(!match)throw new Error('OCR için yalnızca PNG veya JPG görseli kabul edilir.')

  const settings=await readOcrSettings()
  if(!settings.apiKey)throw new Error('Google Vision API anahtarı tanımlı değil. Ayarlar → OCR / İnternet bölümünden API anahtarını girin.')

  const endpoint=settings.endpoint||GOOGLE_VISION_ENDPOINT
  const response=await net.fetch(`${endpoint}?key=${encodeURIComponent(settings.apiKey)}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      requests:[{
        image:{content:match[2]},
        features:[{type:'DOCUMENT_TEXT_DETECTION'}]
      }]
    })
  })

  const body=await response.text()
  if(!response.ok)throw new Error(googleApiError(body,response.status))

  const payload=JSON.parse(body) as GoogleVisionPayload
  const first=payload.responses?.[0]
  if(!first)throw new Error('Google Vision API boş yanıt döndürdü.')
  if(first.error)throw new Error(first.error.message||first.error.status||'Google Vision OCR hatası.')

  const annotations=first.textAnnotations||[]
  const lines=annotations.slice(1).map(item=>{
    const vertices=item.boundingPoly?.vertices||[]
    const xs=vertices.map(v=>v.x??0)
    const ys=vertices.map(v=>v.y??0)
    const box=xs.length&&ys.length?[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]:undefined
    return{text:(item.description||'').trim(),score:1,box}
  }).filter(item=>item.text)

  if(!lines.length&&first.fullTextAnnotation?.text){
    return{
      ok:true,
      provider:'google-cloud-vision',
      lines:first.fullTextAnnotation.text.split(/\r?\n/).map(text=>({text:text.trim(),score:1})).filter(item=>item.text)
    }
  }

  return{ok:true,provider:'google-cloud-vision',lines}
}
async function runLocalPaddleOcr(dataUrl:string){
  const match=/^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl)
  if(!match)throw new Error('OCR için yalnızca PNG veya JPG görseli kabul edilir.')
  const root=app.isPackaged?process.resourcesPath:app.getAppPath()
  const pythonCandidates=[process.env.ZEMINLAB_PYTHON,join(root,'python-runtime','Scripts','python.exe'),join(root,'python-runtime','bin','python'),'python'].filter((x):x is string=>Boolean(x))
  const runnerCandidates=[join(root,'tools','paddleocr_runner.py'),join(process.resourcesPath,'tools','paddleocr_runner.py')]
  const runner=runnerCandidates.find(x=>existsSync(x))
  if(!runner)throw new Error('Yerel PaddleOCR çalıştırıcısı bulunamadı: tools/paddleocr_runner.py')
  const python=pythonCandidates.find(x=>x==='python'||existsSync(x))
  if(!python)throw new Error('Yerel Python runtime bulunamadı. Kurulum paketinin python-runtime klasörünü kontrol edin.')
  const tempRoot=join(app.getPath('temp'),'zeminlab-ocr')
  await fs.mkdir(tempRoot,{recursive:true})
  const token=Date.now().toString(36)+Math.random().toString(36).slice(2,8)
  const inputPath=join(tempRoot,token+'.png'),outputPath=join(tempRoot,token+'.json')
  try{
    await fs.writeFile(inputPath,Buffer.from(match[2],'base64'))
    await execFileAsync(python,[runner,'--input',inputPath,'--output',outputPath],{windowsHide:true,maxBuffer:20*1024*1024})
    const result=JSON.parse(await fs.readFile(outputPath,'utf8')) as {ok?:boolean;provider?:string;lines?:Array<{text:string;score?:number|null;box?:unknown}>;error?:string}
    if(!result.ok)throw new Error(result.error||'PaddleOCR başarısız oldu.')
    return result
  }catch(error){
    throw new Error(`Yerel PaddleOCR çalıştırılamadı: ${error instanceof Error?error.message:String(error)}`)
  }finally{
    await fs.rm(inputPath,{force:true}).catch(()=>undefined)
    await fs.rm(outputPath,{force:true}).catch(()=>undefined)
  }
}

async function runConfiguredOcr(dataUrl:string){
  const settings=await readOcrSettings()
  if(settings.provider==='google')return runGoogleVisionOcr(dataUrl)
  return runLocalPaddleOcr(dataUrl)
}

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
  electronApp.setAppUserModelId('com.zeminlab.app')
  app.on('browser-window-created',(_,window)=>optimizer.watchWindowShortcuts(window))

  ipcMain.handle('project:save',async(_event,payload:unknown,currentPath?:string)=>{
    let filePath=currentPath
    if(!filePath){
      const result=await dialog.showSaveDialog({title:'ZeminLab Projesini Kaydet',defaultPath:'Yeni Proje.zlproj',filters:projectSaveFilter})
      if(result.canceled||!result.filePath)return null
      filePath=result.filePath.endsWith('.zlproj')?result.filePath:`${result.filePath}.zlproj`
    }
    const envelope={format:'ZeminLab',version:PROJECT_SCHEMA_VERSION,savedAt:new Date().toISOString(),data:payload}
    await fs.writeFile(filePath,JSON.stringify(envelope,null,2),'utf8')
    return filePath
  })

  ipcMain.handle('project:open',async()=>{
    const result=await dialog.showOpenDialog({title:'ZeminLab Projesi Aç',properties:['openFile'],filters:projectOpenFilter})
    if(result.canceled||!result.filePaths[0])return null
    const filePath=result.filePaths[0]
    const raw=await fs.readFile(filePath,'utf8')
    const envelope=JSON.parse(raw) as {format?:string;version?:number;data?:unknown}
    if(envelope.format!=='ZeminLab'||typeof envelope.version!=='number'||envelope.data===undefined)throw new Error('Geçersiz veya desteklenmeyen ZeminLab proje dosyası.')
    if(envelope.version>PROJECT_SCHEMA_VERSION)throw new Error(`Bu proje dosyası daha yeni bir ZeminLab sürümüne ait (v${envelope.version}).`)
    return{filePath,data:envelope.data,version:envelope.version}
  })

  ipcMain.handle('ocr:status',async()=>{
    const settings=await readOcrSettings()
    return{online:net.isOnline(),config:{provider:settings.provider==='google'?'remote':'local' as const,endpoint:settings.endpoint,hasApiKey:Boolean(settings.apiKey)}}
  })

  ipcMain.handle('ocr:save-config',async(_event,input:{provider?:'google'|'remote'|'local';endpoint?:string;apiKey?:string})=>{
    const current=await readOcrSettings()
    await writeOcrSettings({endpoint:input?.endpoint||current.endpoint,apiKey:input?.apiKey?.trim()||current.apiKey})
    if(input?.provider==='remote'||input?.provider==='google'){const raw=await fs.readFile(ocrSettingsPath(),'utf8');const stored=JSON.parse(raw) as StoredOcrSettings;stored.provider='google';await fs.writeFile(ocrSettingsPath(),JSON.stringify(stored,null,2),'utf8')}
    return true
  })

  ipcMain.handle('ocr:test',async(_event,endpoint?:string)=>testEndpoint(endpoint))
  ipcMain.handle('ocr:analyze-image',async(_event,input:{dataUrl:string})=>{
    if(typeof input?.dataUrl!=='string')throw new Error('OCR görseli verilmedi.')
    return await runConfiguredOcr(input.dataUrl)
  })

  ipcMain.handle('report:print',async event=>{
    const window=BrowserWindow.fromWebContents(event.sender)
    if(!window)return false
    return await new Promise<boolean>(resolve=>window.webContents.print({printBackground:true,silent:false},success=>resolve(success)))
  })

  ipcMain.handle('report:export-pdf',async event=>{
    const window=BrowserWindow.fromWebContents(event.sender)
    if(!window)return null
    const result=await dialog.showSaveDialog(window,{title:'Mühendislik Raporunu PDF Olarak Kaydet',defaultPath:'ZeminLab-Muhendislik-Raporu.pdf',filters:pdfFilter})
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
