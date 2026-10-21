// La partida en juego vive en el registro de Phaser ('partida'), junto con
// la ranura donde se guarda ('ranura'). Las partidas se guardan en
// localStorage, que existe igual en el navegador, en Electron y en Android.

import type Phaser from 'phaser';
import { agregarAColeccion, borrar, guardar, type Almacen } from '../juego/guardado.ts';
import type { Partida } from '../juego/partida.ts';
import { buscarNodo } from '../mapa/mapa.ts';

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

// Pone la partida en juego y la guarda en su ranura. Sus baratijas quedan
// desbloqueadas en la colección.
export function jugarPartida(escena: Phaser.Scene, partida: Partida, ranura: number = escena.registry.get('ranura')): void {
  escena.registry.set('partida', partida);
  escena.registry.set('ranura', ranura);
  guardar(almacen, ranura, partida);
  agregarAColeccion(almacen, partida.baratijas);
}

// Al terminar la partida (derrota o jefe vencido) su ranura queda libre.
export function terminarPartida(escena: Phaser.Scene): void {
  borrar(almacen, escena.registry.get('ranura') as number);
}

// La escena en la que sigue una partida al continuarla o al salir de un
// combate: la mesa si hay un combate pendiente, el eliminador si se está en
// él, la de baratijas si hay otra oferta o una elección sin cerrar, y si no
// el mapa.
export function irAPartida(escena: Phaser.Scene, partida: Partida): void {
  if (partida.combatePendiente) escena.scene.start('mesa', { tipo: buscarNodo(partida.mapa, partida.nodoActual).tipo });
  else if (partida.oferta?.tipo === 'eliminador' && !partida.eleccion) escena.scene.start('eliminador');
  else if (partida.oferta?.tipo === 'manoNegra' && !partida.eleccion) escena.scene.start('manoNegra');
  else if (partida.eleccion || partida.oferta) escena.scene.start('baratijas');
  else escena.scene.start('mapa');
}
