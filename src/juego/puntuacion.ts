// Puntos de una mano jugada: (fichas de la mano + fichas de las cartas que
// puntúan) × multiplicador, después de que cada baratija cambie las fichas
// o el multiplicador. La mano vale según su nivel, y cada carta que puntúa
// suma lo de sus modificaciones.

import { MESA_VACIA, fichasConBaratijas, type Efectos, type ManoPuntuada, type Mesa } from './baratijas.ts';
import { fichasDeCarta, multiDeCarta, type Carta } from './cartas.ts';
import { datosDeMano, evaluarMano, type ManoEvaluada, type Niveles } from './manos.ts';

export interface Puntuacion extends ManoEvaluada {
  fichas: number;
  multi: number;
  total: number;
}

export function puntuar(
  cartas: readonly Carta[],
  baratijas: readonly Efectos[] = [],
  mesa: Mesa = MESA_VACIA,
  niveles?: Partial<Niveles>,
): Puntuacion {
  const mano = evaluarMano(cartas);
  const conNiveles: Mesa = { ...mesa, niveles: mesa.niveles ?? niveles };
  const base = datosDeMano(mano.tipo, niveles?.[mano.tipo]);
  const sinBaratijas: ManoPuntuada = {
    ...mano,
    cartasJugadas: cartas,
    fichas: base.fichas + mano.cartasQuePuntuan.reduce((suma, carta) => suma + fichasConBaratijas(fichasDeCarta(carta), carta, baratijas, conNiveles), 0),
    multi: base.multi + mano.cartasQuePuntuan.reduce((suma, carta) => suma + multiDeCarta(carta), 0),
  };
  const { fichas, multi } = baratijas.reduce<ManoPuntuada>((actual, b) => (b.alPuntuar ? b.alPuntuar(actual, conNiveles) : actual), sinBaratijas);
  // Con multiplicadores con decimales, el total se redondea.
  return { ...mano, fichas, multi, total: Math.round(fichas * multi) };
}
