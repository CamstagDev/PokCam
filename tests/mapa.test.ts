import { describe, expect, it } from 'vitest';
import { OTROS_NODOS, PISOS_ANTES_DEL_JEFE, buscarNodo, generarMapa, type Mapa } from '../src/mapa/mapa.ts';

const SEMILLAS = Array.from({ length: 200 }, (_, i) => i + 1);

function todos(mapa: Mapa) {
  return mapa.pisos.flat();
}

describe('generarMapa', () => {
  it('tiene de 15 a 20 pisos entre el inicio y el jefe, y salen todas las cantidades', () => {
    const cantidades = new Set(SEMILLAS.map((semilla) => generarMapa(semilla).pisos.length - 2));
    expect(Math.min(...cantidades)).toBe(PISOS_ANTES_DEL_JEFE.minimo);
    expect(Math.max(...cantidades)).toBe(PISOS_ANTES_DEL_JEFE.maximo);
    expect(cantidades.size).toBe(6);
  });

  it('la misma semilla da el mismo mapa', () => {
    expect(generarMapa(42)).toEqual(generarMapa(42));
    expect(generarMapa(42)).not.toEqual(generarMapa(43));
  });

  it.each(SEMILLAS)('semilla %i: empieza en el inicio y termina en un solo jefe', (semilla) => {
    const mapa = generarMapa(semilla);
    expect(mapa.pisos[0]!.map((n) => n.tipo)).toEqual(['inicio']);
    expect(mapa.pisos.at(-1)!.map((n) => n.tipo)).toEqual(['jefe']);
    expect(mapa.pisos.at(-2)!.every((n) => n.tipo === 'descanso')).toBe(true);
  });

  it.each(SEMILLAS)('semilla %i: todo nodo se puede alcanzar y lleva al piso siguiente', (semilla) => {
    const mapa = generarMapa(semilla);
    for (const nodo of todos(mapa)) {
      if (nodo.tipo !== 'jefe') expect(nodo.siguientes.length).toBeGreaterThan(0);
      for (const id of nodo.siguientes) expect(buscarNodo(mapa, id).piso).toBe(nodo.piso + 1);
      if (nodo.piso > 0) {
        expect(todos(mapa).some((otro) => otro.siguientes.includes(nodo.id))).toBe(true);
      }
    }
  });

  it('fuera de los pisos fijos, 40 % combates y el resto repartido por igual', () => {
    const cuenta = new Map<string, number>();
    let total = 0;
    for (let semilla = 1; semilla <= 300; semilla++) {
      const mapa = generarMapa(semilla);
      for (const fila of mapa.pisos.slice(2, -2)) {
        for (const nodo of fila) {
          cuenta.set(nodo.tipo, (cuenta.get(nodo.tipo) ?? 0) + 1);
          total++;
        }
      }
    }
    expect((cuenta.get('combate') ?? 0) / total).toBeCloseTo(0.4, 1);
    for (const tipo of OTROS_NODOS) expect((cuenta.get(tipo) ?? 0) / total).toBeCloseTo(0.6 / OTROS_NODOS.length, 1);
  });
});
