// El estado de una partida: el mapa, por dónde va el jugador y su oro.
// Aquí se sumarán el mazo y los comodines.

import { buscarNodo, generarMapa, type Mapa, type Nodo, type TipoNodo } from '../mapa/mapa.ts';

export const TIPOS_DE_COMBATE: readonly TipoNodo[] = ['combate', 'elite', 'jefe'];

export const ORO_INICIAL = 300;
// Lo que se gana al vencer un combate, y lo mismo se pierde al perderlo.
export const ORO_POR_COMBATE: Partial<Record<TipoNodo, number>> = { combate: 100, elite: 100, jefe: 100 };

export interface Partida {
  mapa: Mapa;
  nodoActual: string;
  visitados: string[];
  // true desde que se elige un nodo de combate hasta ganarlo: al continuar
  // una partida guardada así, se vuelve a la mesa y no al mapa.
  combatePendiente: boolean;
  oro: number; // con 0 o menos la partida se termina
}

export function crearPartida(semilla: number): Partida {
  const mapa = generarMapa(semilla);
  const inicio = mapa.pisos[0]![0]!;
  return { mapa, nodoActual: inicio.id, visitados: [inicio.id], combatePendiente: false, oro: ORO_INICIAL };
}

// Los nodos a los que se puede ir desde donde está el jugador.
export function nodosDisponibles(partida: Partida): Nodo[] {
  return buscarNodo(partida.mapa, partida.nodoActual).siguientes.map((id) => buscarNodo(partida.mapa, id));
}

export function avanzar(partida: Partida, id: string): Partida {
  if (partida.combatePendiente) throw new Error(`Falta ganar el combate de ${partida.nodoActual}`);
  if (!nodosDisponibles(partida).some((n) => n.id === id)) {
    throw new Error(`Desde ${partida.nodoActual} no se puede ir a ${id}`);
  }
  const combatePendiente = TIPOS_DE_COMBATE.includes(buscarNodo(partida.mapa, id).tipo);
  return { ...partida, nodoActual: id, visitados: [...partida.visitados, id], combatePendiente };
}

// Suma o resta el oro del combate en curso. Un combate perdido también
// queda atrás, salvo el jefe: a ese hay que volver a enfrentarlo mientras
// quede oro.
export function resolverCombate(partida: Partida, gano: boolean): Partida {
  const nodo = nodoActual(partida);
  const oro = ORO_POR_COMBATE[nodo.tipo] ?? 0;
  return {
    ...partida,
    oro: partida.oro + (gano ? oro : -oro),
    combatePendiente: !gano && nodo.tipo === 'jefe',
  };
}

export function enBancarrota(partida: Partida): boolean {
  return partida.oro <= 0;
}

export function nodoActual(partida: Partida): Nodo {
  return buscarNodo(partida.mapa, partida.nodoActual);
}
