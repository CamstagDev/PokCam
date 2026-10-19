// Dónde está corriendo el juego. Por ahora solo se usa para mostrarlo; el
// guardado usa localStorage en las tres (ver escenas/sesion.ts).
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
