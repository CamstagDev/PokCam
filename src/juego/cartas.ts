// La baraja francesa de 52 cartas.

export const PALOS = ['picas', 'corazones', 'treboles', 'diamantes'] as const;
export type Palo = (typeof PALOS)[number];

// 2..10, J = 11, Q = 12, K = 13, A = 14 (el as también vale 1 en la escalera A-2-3-4-5).
export type Rango = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export const RANGOS: readonly Rango[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export interface Carta {
  id: string; // único dentro del mazo, p. ej. 'corazones-12'
  palo: Palo;
  rango: Rango;
  // Cuántas veces se le puso cada modificador (el pintor).
  modificaciones?: Partial<Record<Modificador, number>>;
}

// Lo que el pintor le puede poner a una carta. Cada vez que se pone uno
// cuenta como una modificación (dos veces +1 multiplicador son 2):
//   'multi'   +1 al multiplicador cuando la carta puntúa
//   'fichas'  +FICHAS_POR_MODIFICACION fichas
//   'palo'    pasa al palo que elija el jugador (otro que el que tiene)
export const MODIFICADORES = ['multi', 'fichas', 'palo'] as const;
export type Modificador = (typeof MODIFICADORES)[number];
export const FICHAS_POR_MODIFICACION = 5;

export const NOMBRE_MODIFICADOR: Record<Modificador, string> = {
  multi: '+1 multiplicador',
  fichas: `+${FICHAS_POR_MODIFICACION} fichas`,
  palo: 'Cambiar de palo',
};

export function modificacionesDe(carta: Carta): number {
  return MODIFICADORES.reduce((suma, m) => suma + (carta.modificaciones?.[m] ?? 0), 0);
}

// Lo que suma la carta al multiplicador cuando puntúa.
export function multiDeCarta(carta: Carta): number {
  return carta.modificaciones?.multi ?? 0;
}

// Con 'palo' hace falta el palo nuevo, distinto del que tiene.
export function modificar(carta: Carta, modificador: Modificador, palo?: Palo): Carta {
  const modificaciones = { ...carta.modificaciones, [modificador]: (carta.modificaciones?.[modificador] ?? 0) + 1 };
  if (modificador !== 'palo') return { ...carta, modificaciones };
  if (!palo || palo === carta.palo) throw new Error('Hace falta un palo distinto del de la carta');
  return { ...carta, palo, modificaciones };
}

export function nombreDeCarta(carta: Carta): string {
  return `${nombreRango(carta.rango)}${SIMBOLO_PALO[carta.palo]}`;
}

export const SIMBOLO_PALO: Record<Palo, string> = {
  picas: '♠',
  corazones: '♥',
  treboles: '♣',
  diamantes: '♦',
};

export function crearMazo(): Carta[] {
  return PALOS.flatMap((palo) => RANGOS.map((rango) => ({ id: `${palo}-${rango}`, palo, rango })));
}

export function nombreRango(rango: Rango): string {
  return { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[rango as 11 | 12 | 13 | 14] ?? String(rango);
}

// Fichas que suma la carta al puntuar: su número, las figuras 10 y el as
// 11, más las de sus modificaciones.
export function fichasDeCarta(carta: Carta): number {
  const base = carta.rango === 14 ? 11 : Math.min(carta.rango, 10);
  return base + (carta.modificaciones?.fichas ?? 0) * FICHAS_POR_MODIFICACION;
}

// Cómo ordenar la mano: por valor (de mayor a menor) o por palo (agrupando
// cada palo, y dentro de él de mayor a menor).
export type Orden = 'valor' | 'palo';

export function ordenarMano(mano: readonly Carta[], orden: Orden): Carta[] {
  const porPalo = (a: Carta, b: Carta) => PALOS.indexOf(a.palo) - PALOS.indexOf(b.palo);
  const porValor = (a: Carta, b: Carta) => b.rango - a.rango;
  return [...mano].sort(orden === 'valor' ? (a, b) => porValor(a, b) || porPalo(a, b) : (a, b) => porPalo(a, b) || porValor(a, b));
}
