import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { crearMazo, type Carta } from '../src/juego/cartas.ts';
import { AS_EXTRA, crearCombate, jugar } from '../src/juego/combate.ts';
import { cerrarDuelo, crearEnfrentamiento, dueloAbierto, duelosGanados, jugarEnDuelo, mejorJugada, type Enfrentamiento } from '../src/juego/duelo.ts';
import { JEFES, buscarJefe, nivelDelJefe } from '../src/juego/jefes.ts';
import { avanzar, comprarBaratija, crearPartida, premioDelJefe, resolverCombate, type Partida } from '../src/juego/partida.ts';
import { sortearBaratijas, CATALOGO } from '../src/juego/baratijas.ts';
import { evaluarMano } from '../src/juego/manos.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const tahur = buscarJefe('tahur');
const nuevo = (semilla = 1, baratijas: string[] = []) => crearEnfrentamiento(crearAleatorio(semilla), tahur, { mazo: crearMazo(), baratijas });
const c = (palo: Carta['palo'], rango: Carta['rango']): Carta => ({ id: `${palo}-${rango}-x`, palo, rango });

describe('El Tahúr', () => {
  it('juega con 32 cartas, del 7 al As, una mano por duelo y la muestra', () => {
    const mazo = tahur.mazo();
    expect(mazo).toHaveLength(32);
    expect(mazo.every((c) => c.rango >= 7)).toBe(true);
    expect(tahur.reparto).toEqual([1, 1, 1]);
    expect(tahur.revela).toBe(true);
    expect(tahur.baratijas).toEqual(['as-bajo-la-manga', 'faroleo', 'mazo-limpio']);
  });

  it('sus baratijas no salen en las ofertas', () => {
    const deJefe = CATALOGO.filter((b) => b.deJefe).map((b) => b.id);
    expect(deJefe.sort()).toEqual(['as-bajo-la-manga', 'faroleo', 'mazo-limpio']);
    for (let s = 1; s < 200; s++) {
      for (const id of sortearBaratijas(crearAleatorio(s), [], { infrecuente: 1, rara: 0, legendaria: 0 })) expect(deJefe).not.toContain(id);
    }
  });

  it('sube de nivel sus manos con el riesgo', () => {
    expect(nivelDelJefe(0)).toBe(1);
    expect(nivelDelJefe(8)).toBe(3);
    expect(nuevo().nivelesDelJefe.par).toBe(1);
  });
});

describe('duelos', () => {
  it('la mejor jugada es la que más puntúa', () => {
    const mano = [c('picas', 9), c('corazones', 9), c('treboles', 9), c('picas', 13), c('diamantes', 13), c('picas', 2), c('picas', 3), c('corazones', 4)];
    expect(evaluarMano(mejorJugada(mano)).tipo).toBe('full');
  });

  it('al empezar, el jefe ya jugó su mano del primer duelo', () => {
    const e = nuevo();
    expect(e.duelos).toHaveLength(1);
    const d = dueloAbierto(e);
    expect(d.jugadasDelJefe).toHaveLength(1);
    expect(d.jefe).toBe(d.jugadasDelJefe[0]!.puntuacion.total);
    expect(e.manoDelJefe).toHaveLength(8);
    expect(e.combate.manosRestantes).toBe(4);
  });

  it('las manos se suman en el duelo abierto hasta cerrarlo', () => {
    let e = nuevo();
    e = jugarEnDuelo(e, [e.combate.mano[0]!.id]);
    const primera = e.combate.ultimaJugada!.total;
    e = jugarEnDuelo(e, [e.combate.mano[0]!.id]);
    expect(dueloAbierto(e).jugador).toBe(primera + e.combate.ultimaJugada!.total);
    expect(dueloAbierto(e).manosDelJugador).toBe(2);
    e = cerrarDuelo(e);
    expect(e.duelos).toHaveLength(2);
    expect(e.duelos[0]!.ganador).not.toBeNull();
  });

  it('cerrar sin jugar pierde el duelo; perder dos termina la partida', () => {
    let e = nuevo();
    e = cerrarDuelo(e);
    expect(e.duelos[0]!.ganador).toBe('jefe');
    e = cerrarDuelo(e);
    expect(e.estado).toBe('perdido');
    expect(e.duelos).toHaveLength(2);
    expect(() => cerrarDuelo(e)).toThrow();
  });

  it('ganar dos duelos gana la partida', () => {
    const ganar = (e: Enfrentamiento) => cerrarDuelo({ ...e, duelos: [...e.duelos.slice(0, -1), { ...dueloAbierto(e), jugador: 99_999 }] });
    let e = ganar(nuevo());
    expect(duelosGanados(e, 'jugador')).toBe(1);
    e = ganar(e);
    expect(e.estado).toBe('ganado');
  });

  it('sin manos, los duelos que faltan se cierran con 0', () => {
    let e = nuevo();
    for (let i = 0; i < 4 && e.estado === 'jugando'; i++) e = jugarEnDuelo(e, [e.combate.mano[0]!.id]);
    expect(e.estado).not.toBe('jugando');
    expect(e.duelos.at(-1)!.ganador).not.toBeNull();
  });

  it('en un empate, roba cada uno una carta y ganan las fichas (con modificaciones)', () => {
    const e = nuevo();
    const d = dueloAbierto(e);
    const empatado: Enfrentamiento = {
      ...e,
      combate: { ...e.combate, pila: [{ ...c('picas', 2), modificaciones: { fichas: 2 } }, ...e.combate.pila] }, // 2 + 10 = 12 fichas
      pilaDelJefe: [c('corazones', 13), c('picas', 7), ...e.pilaDelJefe], // 10 fichas
      duelos: [{ ...d, jugador: d.jefe }],
    };
    const cerrado = cerrarDuelo(empatado);
    expect(cerrado.duelos[0]!.ganador).toBe('jugador');
    expect(cerrado.duelos[0]!.desempate).toHaveLength(1);
    expect(cerrado.combate.pila).toHaveLength(e.combate.pila.length);
  });

  it('si las cartas del desempate empatan, se roba otra vez', () => {
    const e = nuevo();
    const d = dueloAbierto(e);
    const empatado: Enfrentamiento = {
      ...e,
      combate: { ...e.combate, pila: [c('picas', 10), c('picas', 8), ...e.combate.pila] },
      pilaDelJefe: [c('corazones', 12), c('corazones', 9), ...e.pilaDelJefe],
      duelos: [{ ...d, jugador: d.jefe }],
    };
    const cerrado = cerrarDuelo(empatado);
    expect(cerrado.duelos[0]!.desempate).toHaveLength(2);
    expect(cerrado.duelos[0]!.ganador).toBe('jefe');
  });
});

describe('las baratijas del Tahúr', () => {
  it('As bajo la manga: un As de más en la mano, que no es del mazo', () => {
    const combate = crearCombate(crearAleatorio(1), { objetivo: 100, mazo: crearMazo(), baratijas: ['as-bajo-la-manga'] });
    expect(combate.mano).toHaveLength(9);
    expect(combate.mano.at(-1)).toEqual({ id: AS_EXTRA, palo: 'picas', rango: 14 });
    expect(combate.mazo.some((c) => c.id === AS_EXTRA)).toBe(false);
  });

  it('Faroleo: una vez por combate la mano puntúa como el tipo siguiente', () => {
    const par = [c('picas', 5), c('corazones', 5)];
    expect(puntuar(par, [], undefined, undefined, true).tipo).toBe('doblePar');
    let combate = crearCombate(crearAleatorio(1), { objetivo: 99_999, mazo: crearMazo(), baratijas: ['faroleo'] });
    expect(combate.faroles).toBe(1);
    combate = jugar(combate, [combate.mano[0]!.id], true);
    expect(combate.ultimaJugada!.tipo).toBe('par');
    expect(combate.faroles).toBe(0);
    expect(() => jugar(combate, [combate.mano[0]!.id], true)).toThrow();
  });

  it('Mazo limpio: al conseguirla se van los 2, 3 y 4', () => {
    const partida: Partida = { ...crearPartida(7), oro: 1000, oferta: { tipo: 'vendedor', baratijas: ['mazo-limpio'] } };
    const con = comprarBaratija(partida, 'mazo-limpio');
    expect(con.mazo).toHaveLength(40);
    expect(con.mazo.every((c) => c.rango > 4)).toBe(true);
  });

  it('vencer al jefe da una de sus baratijas que no tengas y pasa al mundo siguiente', () => {
    const base = crearPartida(5);
    const piso = base.mapa.pisos.length - 1;
    const jefe = base.mapa.pisos[piso]![0]!;
    const enJefe: Partida = { ...base, nodoActual: jefe.id, combatePendiente: true, apuesta: 0, baratijas: ['faroleo'] };
    const premio = premioDelJefe(enJefe);
    expect(['as-bajo-la-manga', 'mazo-limpio']).toContain(premio);
    const despues = resolverCombate(enJefe, true);
    expect(despues.mundo).toBe(2);
    expect(despues.baratijas).toEqual(['faroleo', premio]);
    expect(premioDelJefe({ ...enJefe, baratijas: JEFES[0]!.baratijas.slice() })).toBeNull();
    expect(avanzar).toBeDefined();
  });
});
