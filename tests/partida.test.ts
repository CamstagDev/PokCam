import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { TAMANO_MANO, crearCombate, descartar, jugar } from '../src/juego/combate.ts';
import { PROBABILIDADES_INICIALES, probabilidadComun } from '../src/juego/baratijas.ts';
import { crearMazo } from '../src/juego/cartas.ts';
import {
  avanzar,
  cerrarOferta,
  elegirCartaDelRegalo,
  crearPartida,
  enBancarrota,
  nivelDeRiesgo,
  nodoActual,
  nodosDisponibles,
  objetivoDelCombate,
  probabilidadesDelMundoSiguiente,
  resolverCombate,
  type Partida,
} from '../src/juego/partida.ts';

// Cierra la oferta del nodo; del regalo de Raimundo se lleva la primera carta.
const seguir = (p: Partida) => (p.oferta?.evento === 'regaloRaimundo' ? elegirCartaDelRegalo(p, p.oferta.cartas![0]!.id) : cerrarOferta(p));

// Con No gracias, para pasar las recompensas de los élites al recorrer el mapa.
const conNoGracias = () => ({ ...crearPartida(7), baratijas: ['no-gracias'] });

// Recorre el mapa ganando todo hasta quedar frente al jefe (sin pelearlo).
function hastaElJefe(partida: Partida): Partida {
  while (nodoActual(partida).tipo !== 'jefe') {
    partida = avanzar(partida, nodosDisponibles(partida)[0]!.id);
    if (nodoActual(partida).tipo !== 'jefe') partida = seguir(resolverCombate(partida, true));
  }
  return partida;
}

describe('partida', () => {
  it('se recorre desde el inicio hasta el jefe', () => {
    let partida = conNoGracias();
    partida = hastaElJefe(partida);
    expect(partida.visitados).toHaveLength(partida.mapa.pisos.length);
    expect(partida.nodoActual).toBe(partida.mapa.pisos.at(-1)![0]!.id);
  });

  it('no deja saltar a un nodo que no está unido', () => {
    const partida = crearPartida(7);
    expect(() => avanzar(partida, partida.mapa.pisos.at(-1)![0]!.id)).toThrow();
  });

  it('el nivel de riesgo es el piso, y cada nivel sube 50 el objetivo', () => {
    let partida = conNoGracias();
    expect(nivelDeRiesgo(partida)).toBe(0);
    while (nodoActual(partida).tipo !== 'jefe') {
      partida = avanzar(partida, nodosDisponibles(partida)[0]!.id);
      const { piso, tipo } = partida.mapa.pisos.flat().find((n) => n.id === partida.nodoActual)!;
      expect(nivelDeRiesgo(partida)).toBe(piso);
      // La élite es un combate normal que se juega con 3 de riesgo más.
      const base = tipo === 'jefe' ? 800 : 300;
      const riesgo = piso + (tipo === 'elite' ? 3 : 0);
      expect(objetivoDelCombate(partida)).toBe(base + 50 * riesgo);
      if (tipo !== 'jefe') partida = seguir(resolverCombate(partida, true));
    }
  });

  it('vencer al jefe empieza el mundo 2 con todo lo demás y el riesgo desde el jefe', () => {
    // Con las baratijas del jefe ya en la mano, no hay premio que cambie nada.
    const llegada = hastaElJefe(conNoGracias());
    const frenteAlJefe = { ...llegada, oro: 900, baratijas: [...llegada.baratijas, 'as-bajo-la-manga', 'faroleo', 'cambiazo'] };
    const pisoDelJefe = nodoActual(frenteAlJefe).piso;
    const mundo2 = resolverCombate(frenteAlJefe, true);
    expect(mundo2.mundo).toBe(2);
    expect(mundo2.mapa).not.toEqual(frenteAlJefe.mapa);
    expect(mundo2.nodoActual).toBe(mundo2.mapa.pisos[0]![0]!.id);
    expect(mundo2.visitados).toEqual([mundo2.nodoActual]);
    expect(mundo2.combatePendiente).toBe(false);
    expect(mundo2.oro).toBe(1000); // +100 del jefe
    expect(mundo2.baratijas).toEqual(frenteAlJefe.baratijas);
    expect(mundo2.mazo).toEqual(frenteAlJefe.mazo);
    expect(nivelDeRiesgo(mundo2)).toBe(pisoDelJefe);
    const primerCombate = avanzar(mundo2, nodosDisponibles(mundo2)[0]!.id);
    expect(nivelDeRiesgo(primerCombate)).toBe(pisoDelJefe + 1);
    expect(objetivoDelCombate(primerCombate)).toBe(300 + 50 * (pisoDelJefe + 1));
  });

  it('cada mundo baja 15 puntos las comunes y los reparte entre las otras rarezas', () => {
    const antes = PROBABILIDADES_INICIALES; // comunes 60 %
    const despues = probabilidadesDelMundoSiguiente(antes);
    expect(probabilidadComun(despues)).toBeCloseTo(0.45);
    // En proporción a lo que ya tenían: 25 : 10 : 5.
    expect(despues.infrecuente).toBeCloseTo(0.25 + 0.15 * (25 / 40));
    expect(despues.rara).toBeCloseTo(0.1 + 0.15 * (10 / 40));
    expect(despues.legendaria).toBeCloseTo(0.05 + 0.15 * (5 / 40));
    // Nunca quedan comunes negativas.
    let p = antes;
    for (let i = 0; i < 10; i++) p = probabilidadesDelMundoSiguiente(p);
    expect(probabilidadComun(p)).toBeCloseTo(0);
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
    let partida = conNoGracias();
    partida = hastaElJefe(partida);
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
