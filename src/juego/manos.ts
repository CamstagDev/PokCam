// Qué mano de póker forman las cartas jugadas (de 1 a 5) y cuáles de ellas
// puntúan. Como en Balatro, se pueden jugar menos de 5 cartas: con 1 carta
// la mano es "carta alta".

import type { Carta, Rango } from './cartas.ts';

export type TipoMano =
  | 'cartaAlta'
  | 'par'
  | 'doblePar'
  | 'trio'
  | 'escalera'
  | 'color'
  | 'full'
  | 'poker'
  | 'escaleraColor';

export interface DatosMano {
  nombre: string;
  fichas: number; // fichas base de la mano
  multi: number; // multiplicador base
}

// Valores iniciales; las mejoras de la partida los irán subiendo.
export const MANOS: Record<TipoMano, DatosMano> = {
  cartaAlta: { nombre: 'Carta alta', fichas: 5, multi: 1 },
  par: { nombre: 'Par', fichas: 10, multi: 2 },
  doblePar: { nombre: 'Doble par', fichas: 20, multi: 2 },
  trio: { nombre: 'Trío', fichas: 30, multi: 3 },
  escalera: { nombre: 'Escalera', fichas: 30, multi: 4 },
  color: { nombre: 'Color', fichas: 35, multi: 4 },
  full: { nombre: 'Full', fichas: 40, multi: 4 },
  poker: { nombre: 'Póker', fichas: 60, multi: 7 },
  escaleraColor: { nombre: 'Escalera de color', fichas: 100, multi: 8 },
};

export interface ManoEvaluada {
  tipo: TipoMano;
  cartasQuePuntuan: Carta[];
}

export function evaluarMano(cartas: readonly Carta[]): ManoEvaluada {
  if (cartas.length === 0 || cartas.length > 5) {
    throw new Error(`Se juegan de 1 a 5 cartas (llegaron ${cartas.length})`);
  }

  // Grupos de cartas del mismo rango, los más grandes primero (y a igual
  // tamaño, el rango más alto).
  const porRango = new Map<Rango, Carta[]>();
  for (const carta of cartas) porRango.set(carta.rango, [...(porRango.get(carta.rango) ?? []), carta]);
  const grupos = [...porRango.values()].sort((a, b) => b.length - a.length || b[0]!.rango - a[0]!.rango);
  const tamanos = grupos.map((g) => g.length);

  const color = cartas.length === 5 && cartas.every((c) => c.palo === cartas[0]!.palo);
  const escalera = cartas.length === 5 && esEscalera(cartas);
  const todas = [...cartas];

  if (escalera && color) return { tipo: 'escaleraColor', cartasQuePuntuan: todas };
  if (tamanos[0] === 4) return { tipo: 'poker', cartasQuePuntuan: grupos[0]! };
  if (tamanos[0] === 3 && tamanos[1] === 2) return { tipo: 'full', cartasQuePuntuan: todas };
  if (color) return { tipo: 'color', cartasQuePuntuan: todas };
  if (escalera) return { tipo: 'escalera', cartasQuePuntuan: todas };
  if (tamanos[0] === 3) return { tipo: 'trio', cartasQuePuntuan: grupos[0]! };
  if (tamanos[0] === 2 && tamanos[1] === 2) return { tipo: 'doblePar', cartasQuePuntuan: [...grupos[0]!, ...grupos[1]!] };
  if (tamanos[0] === 2) return { tipo: 'par', cartasQuePuntuan: grupos[0]! };
  return { tipo: 'cartaAlta', cartasQuePuntuan: [grupos[0]![0]!] };
}

function esEscalera(cartas: readonly Carta[]): boolean {
  const rangos = [...new Set(cartas.map((c) => c.rango))].sort((a, b) => a - b);
  if (rangos.length !== 5) return false;
  if (rangos[4]! - rangos[0]! === 4) return true;
  // A-2-3-4-5: el as cuenta como 1.
  return rangos.join(',') === '2,3,4,5,14';
}
