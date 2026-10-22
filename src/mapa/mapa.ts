// El mapa de una partida: pisos de nodos unidos por caminos, de abajo
// (piso 0, el inicio) hacia arriba (el jefe). Desde cada nodo solo se
// puede seguir a los nodos del piso siguiente con los que está unido, como
// en el mapa de Inscryption.

import { barajar, crearAleatorio, enteroEntre, type Aleatorio } from '../juego/aleatorio.ts';

// 'vendedor' es el vendedor de baratijas; 'tienda' la de cartas;
// 'eliminador' (Edmundo manos de cinceles) quita baratijas (ruleta rusa) o cartas del mazo; 'manoNegra'
// sube el nivel de una mano de póker; 'pintor' le pone modificadores a las
// cartas.
export type TipoNodo = 'inicio' | 'combate' | 'elite' | 'tienda' | 'vendedor' | 'eliminador' | 'manoNegra' | 'pintor' | 'evento' | 'descanso' | 'jefe';

// Cómo se ve y qué hace cada tipo de nodo (en el mapa y en la colección).
export const DATOS_NODO: Record<TipoNodo, { nombre: string; icono: string; descripcion: string }> = {
  inicio: { nombre: 'Inicio', icono: '⌂', descripcion: 'Donde empieza cada partida.' },
  combate: { nombre: 'Combate', icono: '♠', descripcion: 'Una mesa de póker: llega al objetivo antes de quedarte sin manos. Ganas o pierdes oro.' },
  elite: { nombre: 'Élite', icono: '♛', descripcion: 'Un combate más difícil. Al ganarlo eliges una baratija de recompensa.' },
  vendedor: { nombre: 'Raimundo el vendedor del mundo', icono: '✦', descripcion: 'Aquí Raimundo vende baratijas: compra, vende y vuelve a tirar.' },
  eliminador: { nombre: 'Edmundo manos de cinceles', icono: '✂', descripcion: 'Ruleta rusa de baratijas o eliminar una carta del mazo.' },
  manoNegra: { nombre: "Helman O'Grande", icono: '✋', descripcion: 'Sube un nivel a una de 3 manos de póker.' },
  pintor: { nombre: 'Gustavo el austriaco', icono: '🖌', descripcion: 'Le pone un modificador a una carta del mazo: +1 multiplicador, +5 fichas o cambiar de palo.' },
  tienda: { nombre: 'Raimundo el vendedor del mundo', icono: '$', descripcion: 'Aquí Raimundo vende cartas para tu mazo, a 5 × el nivel de riesgo cada una.' },
  evento: { nombre: 'Evento', icono: '?', descripcion: 'Un regalo: de Raimundo (elige 1 de 9 cartas para tu mazo) o de Gustavo (duplica las modificaciones de tu carta más modificada).' },
  descanso: { nombre: 'Descanso', icono: '☕', descripcion: 'Un respiro antes de seguir. Siempre hay uno antes del jefe.' },
  jefe: { nombre: 'Jefe', icono: '☠', descripcion: 'El último combate del mundo: al vencerlo empieza el mundo siguiente. Si lo pierdes, vuelves a enfrentarlo mientras te quede oro.' },
};

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

// Pisos entre el inicio y el jefe; cada mapa sortea cuántos.
export const PISOS_ANTES_DEL_JEFE = { minimo: 15, maximo: 20 };

export interface OpcionesMapa {
  pisos?: number; // contando el inicio y el jefe; sin darlo, se sortea
  columnas?: number;
}

export function generarMapa(semilla: number, opciones: OpcionesMapa = {}): Mapa {
  const aleatorio = crearAleatorio(semilla);
  const { columnas = 4 } = opciones;
  const pisos = opciones.pisos ?? 2 + enteroEntre(aleatorio, PISOS_ANTES_DEL_JEFE.minimo, PISOS_ANTES_DEL_JEFE.maximo);
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

// Fuera de los pisos fijos, un nodo es combate con PROBABILIDAD_COMBATE y
// si no, uno de OTROS_NODOS, todos con la misma probabilidad.
export const PROBABILIDAD_COMBATE = 0.4;
export const OTROS_NODOS: readonly TipoNodo[] = ['elite', 'vendedor', 'tienda', 'eliminador', 'manoNegra', 'pintor', 'evento', 'descanso'];

function elegirTipo(piso: number, ultimo: number, aleatorio: Aleatorio): TipoNodo {
  if (piso === 0) return 'inicio';
  if (piso === ultimo) return 'jefe';
  if (piso === ultimo - 1) return 'descanso'; // siempre se descansa antes del jefe
  if (piso === 1) return 'combate'; // el primer paso siempre es un combate fácil
  return aleatorio() < PROBABILIDAD_COMBATE ? 'combate' : OTROS_NODOS[Math.floor(aleatorio() * OTROS_NODOS.length)]!;
}

export function buscarNodo(mapa: Mapa, id: string): Nodo {
  for (const fila of mapa.pisos) for (const nodo of fila) if (nodo.id === id) return nodo;
  throw new Error(`No hay ningún nodo ${id} en el mapa`);
}
