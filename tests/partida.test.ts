import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { TAMANO_MANO, crearCombate, descartar, jugar } from '../src/juego/combate.ts';
import { avanzar, crearPartida, nodosDisponibles } from '../src/juego/partida.ts';

describe('partida', () => {
  it('se recorre desde el inicio hasta el jefe', () => {
    let partida = crearPartida(7);
    while (nodosDisponibles(partida).length > 0) partida = avanzar(partida, nodosDisponibles(partida)[0]!.id);
    expect(partida.visitados).toHaveLength(partida.mapa.pisos.length);
    expect(partida.nodoActual).toBe(partida.mapa.pisos.at(-1)![0]!.id);
  });

  it('no deja saltar a un nodo que no está unido', () => {
    const partida = crearPartida(7);
    expect(() => avanzar(partida, partida.mapa.pisos.at(-1)![0]!.id)).toThrow();
  });
});

describe('combate', () => {
  const nuevo = (objetivo = 300) => crearCombate(crearAleatorio(1), { objetivo });

  it('reparte una mano completa', () => {
    const combate = nuevo();
    expect(combate.mano).toHaveLength(TAMANO_MANO);
    expect(combate.pila).toHaveLength(52 - TAMANO_MANO);
  });

  it('jugar suma puntos, gasta una mano y vuelve a llenar la mano', () => {
    const antes = nuevo();
    const despues = jugar(antes, [antes.mano[0]!.id]);
    expect(despues.puntos).toBeGreaterThan(0);
    expect(despues.manosRestantes).toBe(antes.manosRestantes - 1);
    expect(despues.mano).toHaveLength(TAMANO_MANO);
    expect(despues.mano.map((c) => c.id)).not.toContain(antes.mano[0]!.id);
  });

  it('descartar gasta un descarte y no suma puntos', () => {
    const antes = nuevo();
    const despues = descartar(antes, [antes.mano[0]!.id, antes.mano[1]!.id]);
    expect(despues.puntos).toBe(0);
    expect(despues.descartesRestantes).toBe(antes.descartesRestantes - 1);
    expect(despues.mano).toHaveLength(TAMANO_MANO);
  });

  it('se gana al llegar al objetivo y se pierde al quedarse sin manos', () => {
    const facil = nuevo(1);
    expect(jugar(facil, [facil.mano[0]!.id]).estado).toBe('ganado');

    let dificil = nuevo(100_000);
    while (dificil.estado === 'jugando') dificil = jugar(dificil, [dificil.mano[0]!.id]);
    expect(dificil.estado).toBe('perdido');
    expect(dificil.manosRestantes).toBe(0);
  });

  it('no deja jugar más de 5 cartas', () => {
    const combate = nuevo();
    expect(() => jugar(combate, combate.mano.slice(0, 6).map((c) => c.id))).toThrow();
  });
});
