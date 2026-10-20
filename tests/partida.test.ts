import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { TAMANO_MANO, crearCombate, descartar, jugar } from '../src/juego/combate.ts';
import { crearMazo } from '../src/juego/cartas.ts';
import {
  avanzar,
  cerrarOferta,
  crearPartida,
  enBancarrota,
  nivelDeRiesgo,
  nodosDisponibles,
  objetivoDelCombate,
  resolverCombate,
} from '../src/juego/partida.ts';

describe('partida', () => {
  it('se recorre desde el inicio hasta el jefe', () => {
    let partida = crearPartida(7);
    while (nodosDisponibles(partida).length > 0) partida = cerrarOferta(resolverCombate(avanzar(partida, nodosDisponibles(partida)[0]!.id), true));
    expect(partida.visitados).toHaveLength(partida.mapa.pisos.length);
    expect(partida.nodoActual).toBe(partida.mapa.pisos.at(-1)![0]!.id);
  });

  it('no deja saltar a un nodo que no está unido', () => {
    const partida = crearPartida(7);
    expect(() => avanzar(partida, partida.mapa.pisos.at(-1)![0]!.id)).toThrow();
  });

  it('el nivel de riesgo es el piso, y cada nivel sube 100 el objetivo', () => {
    let partida = crearPartida(7);
    expect(nivelDeRiesgo(partida)).toBe(0);
    while (nodosDisponibles(partida).length > 0) {
      partida = cerrarOferta(resolverCombate(avanzar(partida, nodosDisponibles(partida)[0]!.id), true));
      const { piso, tipo } = partida.mapa.pisos.flat().find((n) => n.id === partida.nodoActual)!;
      expect(nivelDeRiesgo(partida)).toBe(piso);
      const base = { elite: 500, jefe: 800 }[tipo as 'elite' | 'jefe'] ?? 300;
      expect(objetivoDelCombate(partida)).toBe(base + 100 * piso);
    }
  });

  it('empieza con el mazo de 52 cartas, que es el que se reparte en el combate', () => {
    const partida = crearPartida(7);
    expect(partida.mazo).toEqual(crearMazo());
    const combate = crearCombate(crearAleatorio(1), { objetivo: 300, mazo: partida.mazo });
    expect([...combate.mano, ...combate.pila].map((c) => c.id).sort()).toEqual(partida.mazo.map((c) => c.id).sort());
    expect(partida.mazo).toEqual(crearMazo()); // barajar no lo toca
  });

  it('empieza con 300 de oro; ganar un combate suma 100 y perderlo resta 100', () => {
    const partida = crearPartida(7);
    expect(partida.oro).toBe(300);
    const enCombate = avanzar(partida, nodosDisponibles(partida)[0]!.id);
    expect(resolverCombate(enCombate, true).oro).toBe(400);
    const perdido = resolverCombate(enCombate, false);
    expect(perdido.oro).toBe(200);
    expect(perdido.combatePendiente).toBe(false); // se sigue por el mapa
  });

  it('se queda en bancarrota al llegar a 0 de oro', () => {
    let partida = { ...crearPartida(7), oro: 100 };
    partida = resolverCombate(avanzar(partida, nodosDisponibles(partida)[0]!.id), false);
    expect(partida.oro).toBe(0);
    expect(enBancarrota(partida)).toBe(true);
  });

  it('al jefe perdido hay que volver a enfrentarlo', () => {
    let partida = crearPartida(7);
    while (nodosDisponibles(partida).length > 0) partida = cerrarOferta(resolverCombate(avanzar(partida, nodosDisponibles(partida)[0]!.id), true));
    const conJefe = { ...partida, combatePendiente: true };
    expect(resolverCombate(conJefe, false).combatePendiente).toBe(true);
  });

  it('al elegir un combate queda pendiente hasta ganarlo', () => {
    const partida = crearPartida(7);
    const enCombate = avanzar(partida, nodosDisponibles(partida)[0]!.id); // el piso 1 siempre es combate
    expect(enCombate.combatePendiente).toBe(true);
    expect(() => avanzar(enCombate, nodosDisponibles(enCombate)[0]!.id)).toThrow();
    expect(resolverCombate(enCombate, true).combatePendiente).toBe(false);
  });
});

describe('combate', () => {
  const nuevo = (objetivo = 300) => crearCombate(crearAleatorio(1), { objetivo, mazo: crearMazo() });

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
