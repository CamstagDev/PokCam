// PokCam para Windows (Electron).
//
// Electron es solo un marco: abre una ventana que muestra el mismo juego
// que corre en el navegador (la carpeta dist/ que genera `vite build`).
// Las partidas guardadas viven en el localStorage de la ventana, que
// Electron guarda en %APPDATA%\PokCam\.
//
//   npm run escritorio        build + abre la ventana
//   npm run escritorio:dev    abre la ventana contra el servidor de Vite
//                             (npm run dev), con recarga al guardar

import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const carpetaElectron = path.dirname(fileURLToPath(import.meta.url));
const MODO_DESARROLLO = process.argv.includes('--dev');
const URL_DESARROLLO = 'http://localhost:5175';
const ICONO = path.join(carpetaElectron, '..', MODO_DESARROLLO ? 'public' : 'dist', 'icons', 'icon-512.png');

app.setName('PokCam');
app.setAppUserModelId('com.camstagdev.pokcam');

let ventana = null;

function crearVentana() {
  ventana = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 640,
    minHeight: 400,
    backgroundColor: '#0d0e13',
    title: 'PokCam',
    icon: ICONO,
    webPreferences: {
      preload: path.join(carpetaElectron, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  // Cualquier enlace externo se abre en el navegador, nunca dentro del juego.
  ventana.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // F11 alterna la pantalla completa.
  ventana.webContents.on('before-input-event', (_evento, tecla) => {
    if (tecla.type === 'keyDown' && tecla.key === 'F11') ventana.setFullScreen(!ventana.isFullScreen());
  });

  if (MODO_DESARROLLO) {
    ventana.loadURL(URL_DESARROLLO);
  } else {
    ventana.loadFile(path.join(carpetaElectron, '..', 'dist', 'index.html'));
  }
}

// Una sola copia a la vez: dos abiertas escribirían el mismo guardado.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (ventana.isMinimized()) ventana.restore();
    ventana.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null); // sin la barra Archivo / Editar / Ver
    crearVentana();
  });

  app.on('window-all-closed', () => app.quit());
}
