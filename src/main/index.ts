import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs, existsSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const projectSaveFilter=[{name:'FALUZMN Projesi',extensions:['falu']}]
const projectOpenFilter=[{name:'FALUZMN Projesi',extensions:['falu','zlproj','zlab']}]
const pdfFilter=[{name:'PDF Belgesi',extensions:['pdf']}]
const PROJECT_SCHEMA_VERSION=1
const execFileAsync=promisify(execFile)

async function runLocalDocumentIntelligence(dataUrl:string){
  const match=/^data:(image\/(?:png|jpeg|jpg)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl)
  if(!match)throw new Error('Belge analizi için yalnızca PNG, JPG veya PDF kabul edilir.')

  const appRoot=app.getAppPath()
  const resourceRoot=app.isPackaged?process.resourcesPath:join(appRoot,'resources')
  const toolRoot=app.isPackaged?process.resourcesPath:appRoot
  const python=join(resourceRoot,'python-runtime','python.exe')
  const runner=join(toolRoot,'tools','document_intelligence.py')
  const paddleRoot=join(resourceRoot,'paddleocr-v5')
  const doclingRoot=join(resourceRoot,'docling')

  for(const [label,path] of [['Python',python],['Belge motoru',runner],['PP-OCRv5 modeli',paddleRoot],['Docling modelleri',doclingRoot]] as const){
    if(!existsSync(path))throw new Error(`Yerel ${label} bulunamadı. Kurulumun belge istihbarat paketini içerdiğini kontrol edin.`)
  }
  if(!existsSync(join(paddleRoot,'faluzmn-document-intelligence.ready'))){
    throw new Error('Yerel belge istihbarat runtime doğrulama işareti bulunamadı.')
  }

  const tempRoot=join(app.getPath('temp'),'faluzmn-document-intelligence')
  await fs.mkdir(tempRoot,{recursive:true})
  const token=Date.now().toString(36)+Math.random().toString(36).slice(2,8)
  const extension=match[1].toLowerCase()==='application/pdf'?'.pdf':(match[1].toLowerCase()==='image/jpeg'||match[1].toLowerCase()==='image/jpg'?'.jpg':'.png')
  const inputPath=join(tempRoot,token+extension),outputPath=join(tempRoot,token+'.json')

  try{
    await fs.writeFile(inputPath,Buffer.from(match[2],'base64'))
    await execFileAsync(python,[runner,'--input',inputPath,'--output',outputPath,'--model-root',paddleRoot,'--docling-root',doclingRoot],{
      windowsHide:true,
      maxBuffer:50*1024*1024,
      env:{
        ...process.env,
        PYTHONNOUSERSITE:'1',
        PYTHONPATH:'',
        PADDLE_PDX_CACHE_HOME:paddleRoot,
        PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK:'1',
        PADDLE_PDX_OFFLINE:'1',
        DOCLING_ARTIFACTS_PATH:doclingRoot,
      },
    })
    const result=JSON.parse(await fs.readFile(outputPath,'utf8')) as {
      ok?:boolean
      provider?:string
      engines?:{ocr?:string;layout_table?:string}
      lines?:Array<{text:string;score?:number|null;box?:unknown}>
      structured?:unknown[]
      document?:{text?:string;tables?:unknown[];pages?:number}
      warnings?:{paddle?:string|null;docling?:string|null}
      policy?:{no_guessing?:boolean;requires_user_review?:boolean;reject_ambiguous_values?:boolean}
      error?:string
    }
    if(!result.ok)throw new Error(result.error||'Belge analizi başarısız oldu.')
    return result
  }catch(error){
    throw new Error(`Yerel belge analizi çalıştırılamadı: ${error instanceof Error?error.message:String(error)}`)
  }finally{
    await fs.rm(inputPath,{force:true}).catch(()=>undefined)
    await fs.rm(outputPath,{force:true}).catch(()=>undefined)
  }
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
  electronApp.setAppUserModelId('com.faluzmn.app')
  app.on('browser-window-created',(_,window)=>optimizer.watchWindowShortcuts(window))

  ipcMain.handle('project:save',async(_event,payload:unknown,currentPath?:string)=>{
    let filePath=currentPath
    if(!filePath){
      const result=await dialog.showSaveDialog({title:'FALUZMN Projesini Kaydet',defaultPath:'Yeni Proje.falu',filters:projectSaveFilter})
      if(result.canceled||!result.filePath)return null
      filePath=result.filePath.endsWith('.falu')?result.filePath:`${result.filePath}.zlproj`
    }
    const envelope={format:'FALUZMN',version:PROJECT_SCHEMA_VERSION,savedAt:new Date().toISOString(),data:payload}
    await fs.writeFile(filePath,JSON.stringify(envelope,null,2),'utf8')
    return filePath
  })

  ipcMain.handle('project:open',async()=>{
    const result=await dialog.showOpenDialog({title:'ZeminLab Projesi Aç',properties:['openFile'],filters:projectOpenFilter})
    if(result.canceled||!result.filePaths[0])return null
    const filePath=result.filePaths[0]
    const raw=await fs.readFile(filePath,'utf8')
    const envelope=JSON.parse(raw) as {format?:string;version?:number;data?:unknown}
    if(envelope.format!=='ZeminLab'||typeof envelope.version!=='number'||envelope.data===undefined)throw new Error('Geçersiz veya desteklenmeyen FALUZMN proje dosyası.')
    if(envelope.version>PROJECT_SCHEMA_VERSION)throw new Error(`Bu proje dosyası daha yeni bir FALUZMN sürümüne ait (v${envelope.version}).`)
    return{filePath,data:envelope.data,version:envelope.version}
  })

  ipcMain.handle('ocr:analyze-image',async(_event,input:{dataUrl:string})=>{
    if(typeof input?.dataUrl!=='string')throw new Error('OCR görseli verilmedi.')
    return await runLocalDocumentIntelligence(input.dataUrl)
  })

  ipcMain.handle('report:print',async event=>{
    const window=BrowserWindow.fromWebContents(event.sender)
    if(!window)return false
    return await new Promise<boolean>(resolve=>window.webContents.print({printBackground:true,silent:false},success=>resolve(success)))
  })

  ipcMain.handle('report:export-pdf',async event=>{
    const window=BrowserWindow.fromWebContents(event.sender)
    if(!window)return null
    const result=await dialog.showSaveDialog(window,{title:'Mühendislik Raporunu PDF Olarak Kaydet',defaultPath:'ZeminLab-Mühendislik-Raporu.pdf',filters:pdfFilter})
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
