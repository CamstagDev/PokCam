// La partida en juego vive en el registro de Phaser ('partida'), junto con
// la ranura donde se guarda ('ranura'). Las partidas se guardan en
// localStorage, que existe igual en el navegador, en Electron y en Android.

import type Phaser from 'phaser';
import { borrar, guardar, type Almacen } from '../juego/guardado.ts';
import type { Partida } from '../juego/partida.ts';

// Si localStorage no está disponible (navegación privada estricta), se
// juega igual pero sin guardar.
function almacenDelJuego(): Almacen {
  try {
    const prueba = 'pokcam.prueba';
    localStorage.setItem(prueba, '1');
    localStorage.removeItem(prueba);
    return localStorage;
  } catch {
    const datos = new Map<string, string>();
    return {
      getItem: (clave) => datos.get(clave) ?? null,
      setItem: (clave, valor) => void datos.set(clave, valor),
      removeItem: (clave) => void datos.delete(clave),
    };
  }
}

export const almacen = almacenDelJuego();

export function partidaActual(escena: Phaser.Scene): Partida {
  return escena.registry.get('partida') as Partida;
}

// Pone la partida en juego y la guarda en su ranura.
export function jugarPartida(escena: Phaser.Scene, partida: Partida, ranura: number = escena.registry.get('ranura')): void {
  escena.registry.set('partida', partida);
  escena.registry.set('ranura', ranura);
  guardar(almacen, ranura, partida);
}

// Al terminar la partida (derrota o jefe vencido) su ranura queda libre.
export function terminarPartida(escena: Phaser.Scene): void {
  borrar(almacen, escena.registry.get('ranura') as number);
}
