// Dónde está corriendo el juego. Por ahora solo se usa para mostrarlo;
// cuando llegue el guardado decidirá dónde se escribe, como en SudoCam.
//
//   'android'     dentro de Capacitor
//   'escritorio'  dentro de Electron (Windows), que expone window.pokcamEscritorio
//   'navegador'   npm run dev, o cualquier navegador

import { Capacitor } from '@capacitor/core';

export type Plataforma = 'android' | 'escritorio' | 'navegador';

declare global {
  interface Window {
    pokcamEscritorio?: { plataforma: 'escritorio' };
  }
}

export function plataformaActual(): Plataforma {
  if (Capacitor.getPlatform() === 'android') return 'android';
  if (typeof window !== 'undefined' && window.pokcamEscritorio) return 'escritorio';
  return 'navegador';
}
