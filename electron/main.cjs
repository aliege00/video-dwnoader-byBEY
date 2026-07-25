const { app, BrowserWindow, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    title: 'Video Downloader Pro',
    icon: path.join(__dirname, '../public/icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0f0a1a',
    show: false,
  })

  // Load the built web app
  const distPath = path.join(__dirname, '../dist/index.html')
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath)
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Simple menu
const menuTemplate = [
  {
    label: 'Dosya',
    submenu: [
      { label: 'Çıkış', accelerator: 'Alt+F4', click: () => app.quit() }
    ]
  },
  {
    label: 'Görünüm',
    submenu: [
      { role: 'reload', label: 'Yenile' },
      { role: 'togglefullscreen', label: 'Tam Ekran' },
      { type: 'separator' },
      { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
    ]
  },
  {
    label: 'Yardım',
    submenu: [
      {
        label: 'Hakkında',
        click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Video Downloader Pro',
            message: 'Video Downloader Pro v1.0.0',
            detail: 'YouTube, TikTok, Instagram ve daha fazlasından video indir.\n\nPowered by Cobalt API',
          })
        }
      }
    ]
  }
]

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
