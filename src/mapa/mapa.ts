// El mapa de una partida: pisos de nodos unidos por caminos, de abajo
// (piso 0, el inicio) hacia arriba (el jefe). Desde cada nodo solo se
// puede seguir a los nodos del piso siguiente con los que está unido, como
// en el mapa de Inscryption.

import { barajar, crearAleatorio, enteroEntre, type Aleatorio } from '../juego/aleatorio.ts';

// 'vendedor' es el vendedor de baratijas; 'tienda' la de cartas (por hacer).
export type TipoNodo = 'inicio' | 'combate' | 'elite' | 'tienda' | 'vendedor' | 'evento' | 'descanso' | 'jefe';

export interface Nodo {
  id: string; // 'p3-1' = piso 3, columna 1
  piso: number;
  columna: number; // 0..columnas-1, para dibujarlo
  tipo: TipoNodo;
  siguientes: string[]; // ids de los nodos del piso de arriba
}

export interface Mapa {
  semilla: number;
  pisos: Nodo[][];
  columnas: number;
}

export interface OpcionesMapa {
  pisos?: number; // contando el inicio y el jefe
  columnas?: number;
}

export function generarMapa(semilla: number, { pisos = 9, columnas = 4 }: OpcionesMapa = {}): Mapa {
  const aleatorio = crearAleatorio(semilla);
  const ultimo = pisos - 1;
  const centro = Math.floor((columnas - 1) / 2);

  const filas: Nodo[][] = [];
  for (let piso = 0; piso < pisos; piso++) {
    const usadas =
      piso === 0 || piso === ultimo
        ? [centro]
        : barajar([...Array(columnas).keys()], aleatorio)
            .slice(0, enteroEntre(aleatorio, 2, columnas))
            .sort((a, b) => a - b);
    filas.push(usadas.map((columna) => ({ id: `p${piso}-${columna}`, piso, columna, tipo: 'combate', siguientes: [] })));
  }

  for (let piso = 0; piso < ultimo; piso++) unirPisos(filas[piso]!, filas[piso + 1]!, aleatorio);
  for (const fila of filas) for (const nodo of fila) nodo.tipo = elegirTipo(nodo.piso, ultimo, aleatorio);

  return { semilla, pisos: filas, columnas };
}

// Cada nodo de abajo sigue al de arriba más cercano (a veces a dos), y cada
// nodo de arriba que quedó sin camino recibe uno del de abajo más cercano.
// Unir siempre por cercanía evita que los caminos se crucen en el dibujo.
function unirPisos(abajo: Nodo[], arriba: Nodo[], aleatorio: Aleatorio): void {
  const masCercano = (columna: number, nodos: Nodo[]) =>
    nodos.reduce((mejor, n) => (Math.abs(n.columna - columna) < Math.abs(mejor.columna - columna) ? n : mejor));

  for (const nodo of abajo) {
    const cercanos = [...arriba].sort((a, b) => Math.abs(a.columna - nodo.columna) - Math.abs(b.columna - nodo.columna));
    const cuantos = aleatorio() < 0.35 ? 2 : 1;
    for (const destino of cercanos.slice(0, cuantos)) agregarCamino(nodo, destino);
  }
  for (const destino of arriba) {
    if (!abajo.some((n) => n.siguientes.includes(destino.id))) agregarCamino(masCercano(destino.columna, abajo), destino);
  }
}

function agregarCamino(desde: Nodo, hasta: Nodo): void {
  if (!desde.siguientes.includes(hasta.id)) desde.siguientes.push(hasta.id);
}

function elegirTipo(piso: number, ultimo: number, aleatorio: Aleatorio): TipoNodo {
  if (piso === 0) return 'inicio';
  if (piso === ultimo) return 'jefe';
  if (piso === ultimo - 1) return 'descanso'; // siempre se descansa antes del jefe
  if (piso === 1) return 'combate'; // el primer paso siempre es un combate fácil
  const tirada = aleatorio();
  if (tirada < 0.42) return 'combate';
  if (tirada < 0.54) return 'evento';
  if (tirada < 0.64) return 'tienda';
  if (tirada < 0.74) return 'vendedor';
  if (tirada < 0.86) return 'descanso';
  return 'elite';
}

export function buscarNodo(mapa: Mapa, id: string): Nodo {
  for (const fila of mapa.pisos) for (const nodo of fila) if (nodo.id === id) return nodo;
  throw new Error(`No hay ningún nodo ${id} en el mapa`);
}
