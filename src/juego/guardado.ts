// Las 3 ranuras de guardado. Cada una guarda una partida en curso como
// JSON; el almacén donde se escriben se pasa desde afuera (en el juego,
// localStorage) para poder probar esto sin navegador.
//
// Una ranura que no se puede leer (JSON roto, de una versión que ya no
// existe) se trata como vacía, para que nunca impida jugar.

import { PROBABILIDADES_INICIALES } from './baratijas.ts';
import { crearMazo } from './cartas.ts';
import { ORO_INICIAL, type Partida } from './partida.ts';

export const RANURAS = 3;
const VERSION = 9;
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
  return texto === null ? null : leerGuardado(texto);
}

// Un guardado en texto (de una ranura o de un archivo exportado), llevado
// a la versión actual; null si no se puede leer.
export function leerGuardado(texto: string): Guardado | null {
  try {
    const guardado = JSON.parse(texto) as Guardado;
    if (!guardado?.partida?.mapa) return null;
    const { version } = guardado;
    if (typeof version !== 'number' || version < 1 || version > VERSION) return null;
    // Las de la versión 1 son de antes del oro: siguen con el inicial. Las
    // de antes de la 3 no guardaban el mazo: siguen con el de 52 cartas; las
    // de antes de la 4 son de antes de las baratijas, y las de antes de la 5
    // de antes de las rarezas, y las de antes de la 6 de antes de las
    // baratijas que piden un número; las de antes de la 7, de antes de las
    // apuestas, las de antes de la 8, de antes de apostar
    // baratijas, y las de antes de la 9, de antes de contar la racha.
    const partida = { ...guardado.partida };
    if (version < 2) partida.oro = ORO_INICIAL;
    if (version < 3) partida.mazo = crearMazo();
    if (version < 4) {
      partida.baratijas = [];
      partida.oferta = null;
    }
    if (version < 5) partida.probabilidades = PROBABILIDADES_INICIALES;
    if (version < 6) {
      partida.eleccion = null;
      partida.transformaciones = [];
    }
    if (version < 7) partida.apuesta = null;
    if (version < 8) partida.baratijasApostadas = [];
    if (version < 9) partida.racha = 0;
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

// La colección: las baratijas conseguidas alguna vez, en cualquier ranura
// y partida. No se borra al borrar ranuras.
const CLAVE_COLECCION = 'pokcam.coleccion';

export function leerColeccion(almacen: Almacen): string[] {
  try {
    const ids = JSON.parse(almacen.getItem(CLAVE_COLECCION) ?? '[]') as unknown;
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function agregarAColeccion(almacen: Almacen, ids: readonly string[]): void {
  const coleccion = leerColeccion(almacen);
  const nuevas = ids.filter((id) => !coleccion.includes(id));
  if (nuevas.length > 0) almacen.setItem(CLAVE_COLECCION, JSON.stringify([...coleccion, ...nuevas]));
}

// Exportar e importar: el guardado de una ranura como archivo JSON, con la
// colección para que al importarlo en otro equipo también se desbloquee.
export interface Exportado extends Guardado {
  coleccion?: string[];
}

export function exportarRanura(almacen: Almacen, ranura: number): string | null {
  const guardado = cargar(almacen, ranura);
  if (!guardado) return null;
  const exportado: Exportado = { ...guardado, coleccion: leerColeccion(almacen) };
  return JSON.stringify(exportado, null, 2);
}

// Devuelve false (sin tocar nada) si el texto no es un guardado válido.
export function importarRanura(almacen: Almacen, ranura: number, texto: string): boolean {
  const guardado = leerGuardado(texto);
  if (!guardado) return false;
  guardar(almacen, ranura, guardado.partida, guardado.guardadoEn);
  try {
    const { coleccion } = JSON.parse(texto) as Exportado;
    if (Array.isArray(coleccion)) agregarAColeccion(almacen, coleccion.filter((id) => typeof id === 'string'));
  } catch {
    // ya se leyó bien arriba
  }
  agregarAColeccion(almacen, guardado.partida.baratijas);
  return true;
}
