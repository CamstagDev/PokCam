import { describe, expect, it } from 'vitest';
import type { Carta, Palo, Rango } from '../src/juego/cartas.ts';
import { evaluarMano } from '../src/juego/manos.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const LETRA_PALO: Record<string, Palo> = { p: 'picas', c: 'corazones', t: 'treboles', d: 'diamantes' };
const RANGO: Record<string, Rango> = { J: 11, Q: 12, K: 13, A: 14 };

// 'Kc 10p' -> rey de corazones y diez de picas
function cartas(texto: string): Carta[] {
  return texto.split(' ').map((c) => {
    const palo = LETRA_PALO[c.slice(-1)]!;
    const r = c.slice(0, -1);
    const rango = (RANGO[r] ?? Number(r)) as Rango;
    return { id: `${palo}-${rango}`, palo, rango };
  });
}

describe('evaluarMano', () => {
  it.each([
    ['Ac', 'cartaAlta'],
    ['2c 9p', 'cartaAlta'],
    ['9c 9p', 'par'],
    ['9c 9p 4d 4t', 'doblePar'],
    ['9c 9p 9d', 'trio'],
    ['5c 6p 7d 8t 9c', 'escalera'],
    ['Ac 2p 3d 4t 5c', 'escalera'],
    ['10c Jp Qd Kt Ac', 'escalera'],
    ['2c 7c 9c Jc Kc', 'color'],
    ['9c 9p 9d 4t 4c', 'full'],
    ['9c 9p 9d 9t', 'poker'],
    ['5c 6c 7c 8c 9c', 'escaleraColor'],
  ])('%s es %s', (mano, tipo) => {
    expect(evaluarMano(cartas(mano)).tipo).toBe(tipo);
  });

  it('una escalera necesita 5 cartas', () => {
    expect(evaluarMano(cartas('5c 6p 7d 8t')).tipo).toBe('cartaAlta');
  });

  it('K-A-2-3-4 no es escalera', () => {
    expect(evaluarMano(cartas('Kc Ap 2d 3t 4c')).tipo).toBe('cartaAlta');
  });

  it('solo puntúan las cartas que forman la mano', () => {
    expect(evaluarMano(cartas('9c 9p Kd 2t')).cartasQuePuntuan.map((c) => c.rango)).toEqual([9, 9]);
    expect(evaluarMano(cartas('2c 9p Kd')).cartasQuePuntuan.map((c) => c.rango)).toEqual([13]);
  });

  it('rechaza 0 o más de 5 cartas', () => {
    expect(() => evaluarMano([])).toThrow();
    expect(() => evaluarMano(cartas('2c 3c 4c 5c 6c 7c'))).toThrow();
  });
});

describe('puntuar', () => {
  it('suma las fichas de la mano y de las cartas, y multiplica', () => {
    // Par: 10 fichas × 2. Dos reyes valen 10 cada uno.
    expect(puntuar(cartas('Kc Kp 3d'))).toMatchObject({ fichas: 30, multi: 2, total: 60 });
  });

  it('el as vale 11 fichas', () => {
    // Carta alta: 5 fichas × 1.
    expect(puntuar(cartas('Ac')).total).toBe(16);
  });
});
