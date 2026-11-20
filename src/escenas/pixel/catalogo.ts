// Todos los sprites del juego por grupo; la textura de cada uno se llama
// 'grupo:id' (ver texturas.ts). Los iconos de baratijas de un set llevan
// pegado el emblema del set abajo a la derecha.

import { CATALOGO } from '../../juego/baratijas.ts';
import { EMBLEMAS, ICONOS_BARATIJAS } from './baratijas.ts';
import { SPRITES_CARTAS, SPRITES_PALOS } from './cartas.ts';
import { SPRITES_BARAJAS, SPRITES_NODOS, SPRITES_RETRATOS, SPRITES_UI } from './interfaz.ts';
import { lienzo } from './lienzo.ts';
import type { Dibujo } from './paleta.ts';

function conEmblema(icono: Dibujo, conjunto?: string): Dibujo {
  const emblema = conjunto ? EMBLEMAS[conjunto] : undefined;
  if (!emblema) return icono;
  const l = lienzo(icono[0]!.length, icono.length).pegar(icono, 0, 0);
  // El emblema lleva su contorno: tapa lo que haya debajo.
  const x = l.ancho - emblema[0]!.length + 1;
  const y = l.alto - emblema.length + 1;
  emblema.forEach((fila, j) => [...fila].forEach((p, i) => p !== '.' && l.punto(x + i, y + j, p)));
  return l.dibujo();
}

const BARATIJAS: Record<string, Dibujo> = Object.fromEntries(
  CATALOGO.filter((b) => ICONOS_BARATIJAS[b.id]).map((b) => [b.id, conEmblema(ICONOS_BARATIJAS[b.id]!, b.conjunto)]),
);

export const GRUPOS: Readonly<Record<string, Readonly<Record<string, Dibujo>>>> = {
  baratija: BARATIJAS,
  emblema: EMBLEMAS,
  carta: SPRITES_CARTAS,
  palo: SPRITES_PALOS,
  nodo: SPRITES_NODOS,
  ui: SPRITES_UI,
  baraja: SPRITES_BARAJAS,
  retrato: SPRITES_RETRATOS,
};
