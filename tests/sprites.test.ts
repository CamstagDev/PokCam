import { describe, expect, it } from 'vitest';
import { IDS_DE_BARAJA } from '../src/juego/barajas.ts';
import { CATALOGO } from '../src/juego/baratijas.ts';
import { PALOS, RANGOS } from '../src/juego/cartas.ts';
import { JEFES } from '../src/juego/jefes.ts';
import { DATOS_NODO } from '../src/mapa/mapa.ts';
import { GRUPOS } from '../src/escenas/pixel/catalogo.ts';
import { pixeles } from '../src/escenas/pixel/paleta.ts';

const tamano = (grupo: string, id: string) => {
  const d = GRUPOS[grupo]![id]!;
  return [d[0]!.length, d.length];
};

describe('sprites', () => {
  it('todos se leen: filas parejas y solo colores de la paleta', () => {
    for (const [grupo, sprites] of Object.entries(GRUPOS)) {
      for (const [id, d] of Object.entries(sprites)) expect(() => pixeles(d), `${grupo}:${id}`).not.toThrow();
    }
  });

  it('cada baratija tiene su icono de 16 × 16', () => {
    for (const b of CATALOGO) expect(tamano('baratija', b.id), b.id).toEqual([16, 16]);
  });

  it('hay carta para cada palo y rango, y el dorso', () => {
    for (const palo of PALOS) for (const r of RANGOS) expect(tamano('carta', `${palo}-${r}`)).toEqual([22, 31]);
    expect(GRUPOS.carta!.dorso).toBeDefined();
  });

  it('hay icono para cada nodo, cada baraja y retrato de cada jefe', () => {
    for (const tipo of Object.keys(DATOS_NODO)) expect(GRUPOS.nodo![tipo], tipo).toBeDefined();
    for (const id of IDS_DE_BARAJA) expect(GRUPOS.baraja![id], id).toBeDefined();
    for (const jefe of JEFES) expect(GRUPOS.retrato![jefe.id], jefe.id).toBeDefined();
    for (const id of ['raimundo', 'gustavo', 'edmundo', 'helman']) expect(GRUPOS.retrato![id]).toBeDefined();
  });
});
