// Puntos de una mano jugada: (fichas de la mano + fichas de las cartas que
// puntúan) × multiplicador, después de que cada baratija cambie las fichas
// o el multiplicador. La mano vale según su nivel, y cada carta que puntúa
// suma lo de sus modificaciones.
//
// Las cartas puntúan de a una, en orden: cada una suma sus fichas y su
// multiplicador y después pasan sus efectos de carta (alPuntuarCarta). Con
// Eco o Gemelos algunas puntúan dos veces. Al final pasan los efectos de la
// mano (alPuntuar). Algunas baratijas dan oro al puntuar (`oro`).

import { MESA_VACIA, fichasConBaratijas, sumar, type Efectos, type ManoPuntuada, type Mesa } from './baratijas.ts';
import { fichasDeCarta, multiDeCarta, type Carta } from './cartas.ts';
import { TIPOS_DE_MANO, datosDeMano, evaluarMano, type ManoEvaluada, type Niveles, type TipoMano } from './manos.ts';

export interface Puntuacion extends ManoEvaluada {
  fichas: number;
  multi: number;
  total: number;
  oro: number; // el que dieron las baratijas al puntuar
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
  divina = false, // cuenta como escalera de color y puntúan todas (Mano de Dios)
): Puntuacion {
  const reglas = { corta: baratijas.some((b) => b.escaleraCorta), puente: baratijas.some((b) => b.puente) };
  const evaluada = evaluarMano(cartas, reglas);
  const mano: ManoEvaluada = divina
    ? { tipo: 'escaleraColor', cartasQuePuntuan: [...cartas] }
    : farol
      ? { ...evaluada, tipo: tipoSiguiente(evaluada.tipo) }
      : evaluada;
  const conNiveles: Mesa = { ...mesa, niveles: mesa.niveles ?? niveles };
  const base = datosDeMano(mano.tipo, niveles?.[mano.tipo]);
  let actual: ManoPuntuada = { ...mano, cartasJugadas: cartas, fichas: base.fichas, multi: base.multi, oro: 0 };
  for (const carta of enOrden(mano.cartasQuePuntuan, baratijas)) {
    actual = {
      ...actual,
      fichas: actual.fichas + fichasConBaratijas(fichasDeCarta(carta), carta, baratijas, conNiveles),
      multi: actual.multi + multiDeCarta(carta),
    };
    for (const b of baratijas) if (b.alPuntuarCarta) actual = b.alPuntuarCarta(actual, carta, conNiveles);
  }
  // Con el bono del set matemático, las jugadas que no puntúan suman sus fichas.
  if (baratijas.some((b) => b.sumanTodas)) {
    const sobran = cartas.filter((c) => !mano.cartasQuePuntuan.includes(c));
    actual = { ...actual, fichas: actual.fichas + sobran.reduce((suma, c) => suma + fichasDeCarta(c), 0) };
  }
  const { fichas, multi, oro } = baratijas.reduce<ManoPuntuada>((a, b) => (b.alPuntuar ? b.alPuntuar(a, conNiveles) : a), actual);
  // Con multiplicadores con decimales, el total se redondea.
  return { ...mano, fichas, multi, oro, total: Math.round(fichas * multi) };
}

// Las cartas que puntúan en el orden en que puntúan, repitiendo las que
// puntúan más de una vez: con Eco, la última; con Gemelos, la segunda
// carta del primer par.
function enOrden(cartas: readonly Carta[], baratijas: readonly Efectos[]): Carta[] {
  const eco = sumar(baratijas, 'eco');
  const gemelos = sumar(baratijas, 'gemelos');
  const segunda = cartas.find((c, i) => cartas.slice(0, i).some((otra) => otra.rango === c.rango));
  return cartas.flatMap((carta, i) => {
    const veces = 1 + (i === cartas.length - 1 ? eco : 0) + (carta === segunda ? gemelos : 0);
    return Array<Carta>(veces).fill(carta);
  });
}
