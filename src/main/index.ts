import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { promises as fs } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const projectFilter = [{ name: 'ZeminLab Projesi', extensions: ['zlab'] }]

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.zeminlab.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('project:save', async (_event, payload: unknown, currentPath?: string) => {
    let filePath = currentPath
    if (!filePath) {
      const result = await dialog.showSaveDialog({
        title: 'ZeminLab Projesini Kaydet',
        defaultPath: 'Yeni Proje.zlab',
        filters: projectFilter
      })
      if (result.canceled || !result.filePath) return null
      filePath = result.filePath.endsWith('.zlab') ? result.filePath : `${result.filePath}.zlab`
    }

    const envelope = {
      format: 'ZeminLab',
      version: 1,
      savedAt: new Date().toISOString(),
      data: payload
    }
    await fs.writeFile(filePath, JSON.stringify(envelope, null, 2), 'utf8')
    return filePath
  })

  ipcMain.handle('project:open', async () => {
    const result = await dialog.showOpenDialog({
      title: 'ZeminLab Projesini Aç',
      properties: ['openFile'],
      filters: projectFilter
    })
    if (result.canceled || !result.filePaths[0]) return null

    const filePath = result.filePaths[0]
    const raw = await fs.readFile(filePath, 'utf8')
    const envelope = JSON.parse(raw) as { format?: string; version?: number; data?: unknown }
    if (envelope.format !== 'ZeminLab' || envelope.version !== 1 || envelope.data === undefined) {
      throw new Error('Geçersiz veya desteklenmeyen ZeminLab proje dosyası.')
    }
    return { filePath, data: envelope.data }
  })

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:maximize-toggle', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return false
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
    return window.isMaximized()
  })

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
