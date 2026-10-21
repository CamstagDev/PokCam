// Puntos de una mano jugada: (fichas de la mano + fichas de las cartas que
// puntúan) × multiplicador, después de que cada baratija cambie las fichas
// o el multiplicador. Aquí entrarán después las mejoras de cada mano.

import { MESA_VACIA, fichasConBaratijas, type Efectos, type ManoPuntuada, type Mesa } from './baratijas.ts';
import { fichasDeCarta, type Carta } from './cartas.ts';
import { MANOS, evaluarMano, type ManoEvaluada } from './manos.ts';

export interface Puntuacion extends ManoEvaluada {
  fichas: number;
  multi: number;
  total: number;
}

export function puntuar(cartas: readonly Carta[], baratijas: readonly Efectos[] = [], mesa: Mesa = MESA_VACIA): Puntuacion {
  const mano = evaluarMano(cartas);
  const base = MANOS[mano.tipo];
  const sinBaratijas: ManoPuntuada = {
    ...mano,
    cartasJugadas: cartas,
    fichas: base.fichas + mano.cartasQuePuntuan.reduce((suma, carta) => suma + fichasConBaratijas(fichasDeCarta(carta), carta, baratijas, mesa), 0),
    multi: base.multi,
  };
  const { fichas, multi } = baratijas.reduce<ManoPuntuada>((actual, b) => (b.alPuntuar ? b.alPuntuar(actual, mesa) : actual), sinBaratijas);
  return { ...mano, fichas, multi, total: fichas * multi };
}
