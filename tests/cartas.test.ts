import { describe, expect, it } from 'vitest';
import { ordenarMano, type Carta, type Palo, type Rango } from '../src/juego/cartas.ts';

const carta = (palo: Palo, rango: Rango): Carta => ({ id: `${palo}-${rango}`, palo, rango });
const ids = (mano: Carta[]) => mano.map((c) => c.id);

describe('ordenar la mano', () => {
  const mano = [carta('corazones', 5), carta('picas', 14), carta('diamantes', 5), carta('picas', 2), carta('treboles', 11)];

  it('por valor, de mayor a menor', () => {
    expect(ids(ordenarMano(mano, 'valor'))).toEqual(['picas-14', 'treboles-11', 'corazones-5', 'diamantes-5', 'picas-2']);
  });

  it('por palo, y dentro de cada palo de mayor a menor', () => {
    expect(ids(ordenarMano(mano, 'palo'))).toEqual(['picas-14', 'picas-2', 'corazones-5', 'treboles-11', 'diamantes-5']);
  });

  it('no cambia la mano original', () => {
    const copia = [...mano];
    ordenarMano(mano, 'valor');
    expect(mano).toEqual(copia);
  });
});
