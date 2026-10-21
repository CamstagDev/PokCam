// Puntos de una mano jugada: (fichas de la mano + fichas de las cartas que
// puntúan) × multiplicador, después de que cada baratija cambie las fichas
// o el multiplicador. Aquí entrarán después las mejoras de cada mano.

import { aplicar, fichasConBaratijas, type Efectos } from './baratijas.ts';
import { fichasDeCarta, type Carta } from './cartas.ts';
import { MANOS, evaluarMano, type ManoEvaluada } from './manos.ts';

export interface Puntuacion extends ManoEvaluada {
  fichas: number;
  multi: number;
  total: number;
}

export function puntuar(cartas: readonly Carta[], baratijas: readonly Efectos[] = []): Puntuacion {
  const mano = evaluarMano(cartas);
  const base = MANOS[mano.tipo];
  const sinBaratijas = {
    ...mano,
    cartasJugadas: cartas,
    fichas: base.fichas + mano.cartasQuePuntuan.reduce((suma, carta) => suma + fichasConBaratijas(fichasDeCarta(carta), carta, baratijas), 0),
    multi: base.multi,
  };
  const { fichas, multi } = aplicar(baratijas, 'alPuntuar', sinBaratijas);
  return { ...mano, fichas, multi, total: fichas * multi };
}
