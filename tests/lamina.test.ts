import { describe, expect, it } from 'vitest';
import { iconoAplastado, pintarFicha } from '../src/escenas/fichaDePoker.ts';
import { Lamina, tramar } from '../src/escenas/pixel/lamina.ts';

describe('lámina del mapa', () => {
  it('las líneas son escalonadas y sin huecos', () => {
    const l = new Lamina(20, 20, 3);
    const puntos: [number, number][] = [];
    l.linea(1, 1, 15, 7, 1, (x, y) => puntos.push([x, y]));
    for (let i = 1; i < puntos.length; i++) {
      const [x0, y0] = puntos[i - 1]!;
      const [x1, y1] = puntos[i]!;
      expect(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))).toBe(1);
    }
  });

  it('el tramado elige solo tonos de la paleta', () => {
    const paleta = [1, 2, 3];
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) expect(paleta).toContain(tramar(paleta, 1.5, x, y));
  });

  it('la ficha pinta la cara y el canto debajo', () => {
    const l = new Lamina(60, 60, 3);
    pintarFicha(l, 'combate', { x: 30, y: 25, radio: 20, aplastado: 0.5, alfa: 1, luz: false });
    expect(l.get(30, 25)).not.toBe(0);
    expect(l.get(30, 25 + 13)).not.toBe(0); // el canto
    expect(l.get(30, 2)).toBe(0);
  });

  it('el icono se aplasta a la mitad sin perder el dibujo', () => {
    const icono = iconoAplastado('combate', 16, 8);
    expect(icono).toHaveLength(8);
    expect(icono.flat().filter((c) => c !== null).length).toBeGreaterThan(20);
  });
});
