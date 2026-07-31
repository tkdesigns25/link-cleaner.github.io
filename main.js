const { app, BrowserWindow, shell, clipboard, nativeTheme } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 420,
    minHeight: 580,
    title: 'Link-Cleanser',
    backgroundColor: '#0c0c0c',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    // Clean frameless-style: hide menu bar
    autoHideMenuBar: true,
  })

  win.loadFile(path.join(__dirname, 'www', 'index.html'))

  // Open external links in the default browser, not inside Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
