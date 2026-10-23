// Puntos de una mano jugada: (fichas de la mano + fichas de las cartas que
// puntúan) × multiplicador, después de que cada baratija cambie las fichas
// o el multiplicador. La mano vale según su nivel, y cada carta que puntúa
// suma lo de sus modificaciones.

import { MESA_VACIA, fichasConBaratijas, type Efectos, type ManoPuntuada, type Mesa } from './baratijas.ts';
import { fichasDeCarta, multiDeCarta, type Carta } from './cartas.ts';
import { TIPOS_DE_MANO, datosDeMano, evaluarMano, type ManoEvaluada, type Niveles, type TipoMano } from './manos.ts';

export interface Puntuacion extends ManoEvaluada {
  fichas: number;
  multi: number;
  total: number;
}

// El tipo de mano de arriba; la escalera de color se queda igual.
export function tipoSiguiente(tipo: TipoMano): TipoMano {
  return TIPOS_DE_MANO[Math.min(TIPOS_DE_MANO.indexOf(tipo) + 1, TIPOS_DE_MANO.length - 1)]!;
}

export function puntuar(
  cartas: readonly Carta[],
  baratijas: readonly Efectos[] = [],
  mesa: Mesa = MESA_VACIA,
  niveles?: Partial<Niveles>,
  farol = false, // puntúa como el tipo de mano siguiente (Faroleo)
): Puntuacion {
  const evaluada = evaluarMano(cartas);
  const mano = farol ? { ...evaluada, tipo: tipoSiguiente(evaluada.tipo) } : evaluada;
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
