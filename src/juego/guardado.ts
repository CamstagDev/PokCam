// Las 3 ranuras de guardado. Cada una guarda una partida en curso como
// JSON; el almacén donde se escriben se pasa desde afuera (en el juego,
// localStorage) para poder probar esto sin navegador.
//
// Una ranura que no se puede leer (JSON roto, de una versión que ya no
// existe) se trata como vacía, para que nunca impida jugar.

import { crearMazo } from './cartas.ts';
import { ORO_INICIAL, type Partida } from './partida.ts';

export const RANURAS = 3;
const VERSION = 3;
const PREFIJO = 'pokcam.ranura.';

export interface Almacen {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export interface Guardado {
  version: number;
  guardadoEn: number; // Date.now() del último guardado
  partida: Partida;
}

// Lo que se muestra de una ranura ocupada en el menú.
export interface Resumen {
  ranura: number;
  guardadoEn: number;
  piso: number; // en el que está el jugador, contando el inicio como 0
  pisos: number; // del mapa, contando el inicio y el jefe
  oro: number;
}

function clave(ranura: number): string {
  if (!Number.isInteger(ranura) || ranura < 0 || ranura >= RANURAS) throw new Error(`No hay ranura ${ranura}`);
  return PREFIJO + ranura;
}

export function guardar(almacen: Almacen, ranura: number, partida: Partida, ahora: number = Date.now()): void {
  const guardado: Guardado = { version: VERSION, guardadoEn: ahora, partida };
  almacen.setItem(clave(ranura), JSON.stringify(guardado));
}

export function cargar(almacen: Almacen, ranura: number): Guardado | null {
  const texto = almacen.getItem(clave(ranura));
  if (texto === null) return null;
  try {
    const guardado = JSON.parse(texto) as Guardado;
    if (!guardado?.partida?.mapa) return null;
    const { version } = guardado;
    if (typeof version !== 'number' || version < 1 || version > VERSION) return null;
    // Las de la versión 1 son de antes del oro: siguen con el inicial. Las
    // de antes de la 3 no guardaban el mazo: siguen con el de 52 cartas.
    const partida = { ...guardado.partida };
    if (version < 2) partida.oro = ORO_INICIAL;
    if (version < 3) partida.mazo = crearMazo();
    return { ...guardado, version: VERSION, partida };
  } catch {
    return null;
  }
}

export function borrar(almacen: Almacen, ranura: number): void {
  almacen.removeItem(clave(ranura));
}

export function resumir(almacen: Almacen, ranura: number): Resumen | null {
  const guardado = cargar(almacen, ranura);
  if (!guardado) return null;
  const { partida } = guardado;
  const piso = partida.mapa.pisos.findIndex((fila) => fila.some((n) => n.id === partida.nodoActual));
  return { ranura, guardadoEn: guardado.guardadoEn, piso, pisos: partida.mapa.pisos.length, oro: partida.oro };
}

// Las 3 ranuras en orden, null en las vacías.
export function resumirTodas(almacen: Almacen): (Resumen | null)[] {
  return Array.from({ length: RANURAS }, (_, ranura) => resumir(almacen, ranura));
}
