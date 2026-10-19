// El estado de una partida: el mapa y por dónde va el jugador. Por ahora
// solo el recorrido; aquí se sumarán el mazo, los comodines y el dinero.

import { buscarNodo, generarMapa, type Mapa, type Nodo, type TipoNodo } from '../mapa/mapa.ts';

export const TIPOS_DE_COMBATE: readonly TipoNodo[] = ['combate', 'elite', 'jefe'];

export interface Partida {
  mapa: Mapa;
  nodoActual: string;
  visitados: string[];
  // true desde que se elige un nodo de combate hasta ganarlo: al continuar
  // una partida guardada así, se vuelve a la mesa y no al mapa.
  combatePendiente: boolean;
}

export function crearPartida(semilla: number): Partida {
  const mapa = generarMapa(semilla);
  const inicio = mapa.pisos[0]![0]!;
  return { mapa, nodoActual: inicio.id, visitados: [inicio.id], combatePendiente: false };
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

export function ganarCombate(partida: Partida): Partida {
  return { ...partida, combatePendiente: false };
}

export function nodoActual(partida: Partida): Nodo {
  return buscarNodo(partida.mapa, partida.nodoActual);
}
