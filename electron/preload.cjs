// Puente entre la ventana del juego y Electron, como
// window.pokcamEscritorio. Por ahora solo avisa que se está en Windows (ver
// src/plataforma.ts); con el guardado sumará leer y escribir los archivos.

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('pokcamEscritorio', {
  plataforma: 'escritorio',
});
