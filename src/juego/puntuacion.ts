// Puntos de una mano jugada: (fichas de la mano + fichas de las cartas que
// puntúan) × multiplicador. Aquí entrarán después los comodines y las
// mejoras de cada mano.

import { fichasDeCarta, type Carta } from './cartas.ts';
import { MANOS, evaluarMano, type ManoEvaluada } from './manos.ts';

export interface Puntuacion extends ManoEvaluada {
  fichas: number;
  multi: number;
  total: number;
}

export function puntuar(cartas: readonly Carta[]): Puntuacion {
  const mano = evaluarMano(cartas);
  const base = MANOS[mano.tipo];
  const fichas = base.fichas + mano.cartasQuePuntuan.reduce((suma, carta) => suma + fichasDeCarta(carta), 0);
  const multi = base.multi;
  return { ...mano, fichas, multi, total: fichas * multi };
}
