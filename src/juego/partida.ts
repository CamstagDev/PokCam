// El estado de una partida: el mapa y por dónde va el jugador. Por ahora
// solo el recorrido; aquí se sumarán el mazo, los comodines y el dinero.

import { buscarNodo, generarMapa, type Mapa, type Nodo } from '../mapa/mapa.ts';

export interface Partida {
  mapa: Mapa;
  nodoActual: string;
  visitados: string[];
}

export function crearPartida(semilla: number): Partida {
  const mapa = generarMapa(semilla);
  const inicio = mapa.pisos[0]![0]!;
  return { mapa, nodoActual: inicio.id, visitados: [inicio.id] };
}

// Los nodos a los que se puede ir desde donde está el jugador.
export function nodosDisponibles(partida: Partida): Nodo[] {
  return buscarNodo(partida.mapa, partida.nodoActual).siguientes.map((id) => buscarNodo(partida.mapa, id));
}

export function avanzar(partida: Partida, id: string): Partida {
  if (!nodosDisponibles(partida).some((n) => n.id === id)) {
    throw new Error(`Desde ${partida.nodoActual} no se puede ir a ${id}`);
  }
  return { ...partida, nodoActual: id, visitados: [...partida.visitados, id] };
}
