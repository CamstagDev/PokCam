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

// Fichas que suma la carta al puntuar: su número, las figuras 10 y el as 11.
export function fichasDeCarta(carta: Carta): number {
  if (carta.rango === 14) return 11;
  return Math.min(carta.rango, 10);
}
