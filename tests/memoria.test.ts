import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { buscarBaratija, efectosDe, recordar, type Mesa } from '../src/juego/baratijas.ts';
import { crearMazo, type Carta } from '../src/juego/cartas.ts';
import { crearCombate, jugar } from '../src/juego/combate.ts';
import { leerGuardado } from '../src/juego/guardado.ts';
import { TIPOS_DE_MANO } from '../src/juego/manos.ts';
import { apostar, avanzar, crearPartida, eliminarCarta, resolverCombate, responderEleccion, venderBaratija, type Partida } from '../src/juego/partida.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const c = (palo: Carta['palo'], rango: Carta['rango'], id = `${palo}-${rango}`): Carta => ({ id, palo, rango });
const par = [c('picas', 5), c('corazones', 5)]; // 10 + 5 + 5 = 20 fichas × 2
const sin = (mesa: Partial<Mesa> = {}) => puntuar(par, [], { mazo: [], restantes: 0, ...mesa });
const con = (ids: string[], mesa: Partial<Mesa> = {}) => puntuar(par, efectosDe(ids), { mazo: [], restantes: 0, ...mesa });

describe('memoria de las baratijas', () => {
  it('cada baratija recuerda solo lo suyo, y solo si la tienes', () => {
    const m = recordar({}, ['callo', 'minimalista'], { tipo: 'eliminarCarta' });
    expect(m).toEqual({ callo: {}, minimalista: { cartas: 1 } });
    expect(recordar({}, ['materialista'], { tipo: 'eliminarCarta' })).toEqual({});
  });

  it('se guarda con la partida y las de antes empiezan sin memoria', () => {
    const partida = crearPartida(3);
    expect(partida.memoria).toEqual({});
    const viejo = JSON.stringify({ version: 12, guardadoEn: 1, partida: { ...partida, memoria: undefined } });
    expect(leerGuardado(viejo)!.partida.memoria).toEqual({});
  });

  it('al perder la baratija se olvida lo que recordaba', () => {
    const partida: Partida = {
      ...crearPartida(7),
      baratijas: ['minimalista', 'broker'],
      memoria: { minimalista: { cartas: 4 } },
      oferta: { tipo: 'vendedor', baratijas: [] },
    };
    expect(venderBaratija(partida, 'minimalista').memoria).toEqual({});
  });
});

describe('baratijas que crecen', () => {
  it('Callo: la mano más jugada suma 2 fichas por cada vez', () => {
    const mesa = { memoria: { callo: { par: 5, trio: 2 } } };
    expect(con(['callo'], mesa).fichas).toBe(sin().fichas + 10);
    expect(con(['callo'], { memoria: { callo: { trio: 6, par: 5 } } }).fichas).toBe(sin().fichas);
  });

  it('Callo cuenta las manos que se juegan en el combate', () => {
    let combate = crearCombate(crearAleatorio(1), { objetivo: 99_999, mazo: crearMazo(), baratijas: ['callo'] });
    combate = jugar(combate, [combate.mano[0]!.id]);
    const tipo = combate.ultimaJugada!.tipo;
    expect(combate.memoria.callo?.[tipo]).toBe(1);
    expect(combate.manosJugadas).toBe(1);
  });

  it('Coleccionista: +0,5 multi por baratija', () => {
    expect(con(['coleccionista'], { baratijas: 5 }).multi).toBe(2 + 2.5);
  });

  it('Veterano: +10 fichas por nivel de riesgo', () => {
    expect(con(['veterano'], { riesgo: 7 }).fichas).toBe(sin().fichas + 70);
  });

  it('Minimalista: +3 multi por cada carta eliminada con ella', () => {
    const partida = { ...crearPartida(7), baratijas: ['minimalista'] };
    const destino = partida.mapa.pisos[1]![0]!;
    destino.tipo = 'eliminador';
    const en = { ...avanzar(partida, destino.id), oro: 1000 };
    const despues = eliminarCarta(en, 'picas-2');
    expect(despues.memoria.minimalista).toEqual({ cartas: 1 });
    expect(con(['minimalista'], { memoria: despues.memoria }).multi).toBe(2 + 3);
  });

  it('Ruleta de la suerte: ×0,1 por apuesta ganada, −×0,2 por perdida, nunca menos de ×0,25', () => {
    expect(con(['ruleta-de-la-suerte'], { memoria: { 'ruleta-de-la-suerte': { ganadas: 5 } } }).multi).toBeCloseTo(3);
    expect(con(['ruleta-de-la-suerte'], { memoria: { 'ruleta-de-la-suerte': { ganadas: 1, perdidas: 2 } } }).multi).toBeCloseTo(1.4);
    expect(con(['ruleta-de-la-suerte'], { memoria: { 'ruleta-de-la-suerte': { perdidas: 9 } } }).multi).toBeCloseTo(0.5);
  });

  it('Ruleta de la suerte recuerda las apuestas al resolver el combate', () => {
    const partida = { ...crearPartida(7), baratijas: ['ruleta-de-la-suerte', 'no-gracias'], oro: 1000 };
    const destino = partida.mapa.pisos[1]![0]!;
    const enCombate = apostar(avanzar(partida, destino.id), 100);
    expect(resolverCombate(enCombate, true).memoria['ruleta-de-la-suerte']).toEqual({ ganadas: 1 });
    expect(resolverCombate(enCombate, false).memoria['ruleta-de-la-suerte']).toEqual({ perdidas: 1 });
    expect(resolverCombate(apostar(avanzar(partida, destino.id), 0), true).memoria['ruleta-de-la-suerte']).toEqual({});
  });

  it('Bola de nieve: ×0,25 por cada mano que llega sola al objetivo; vuelve a ×1 al perder un combate', () => {
    const b = buscarBaratija('bola-de-nieve');
    let r = b.recordar!({}, { tipo: 'mano', mano: 'par', total: 500, objetivo: 400 });
    r = b.recordar!(r, { tipo: 'mano', mano: 'par', total: 100, objetivo: 400 });
    expect(r).toEqual({ golpes: 1 });
    expect(con(['bola-de-nieve'], { memoria: { 'bola-de-nieve': { golpes: 4 } } }).multi).toBe(4);
    expect(b.recordar!({ golpes: 4 }, { tipo: 'combate', gano: false })).toEqual({ golpes: 0 });
    expect(b.recordar!({ golpes: 4 }, { tipo: 'combate', gano: true })).toEqual({ golpes: 4 });
  });

  it('Obra maestra: ×0,2 por cada carta modificada del mazo', () => {
    const mazo = [{ ...c('picas', 2), modificaciones: { fichas: 1 } }, { ...c('picas', 3), modificaciones: { palo: 2 } }, c('picas', 4)];
    expect(con(['obra-maestra'], { mazo }).multi).toBeCloseTo(2 * 1.4);
  });

  it('Especialista: eliges la mano; ella ×1,5/×2/×3 y las demás pierden la mitad', () => {
    const partida: Partida = { ...crearPartida(7), baratijas: ['especialista'], eleccion: { baratija: 'especialista', maximo: 9 } };
    const elegida = responderEleccion(partida, TIPOS_DE_MANO.indexOf('par') + 1);
    const memoria = elegida.memoria;
    expect(memoria.especialista).toEqual({ eleccion: 2 });
    expect(con(['especialista'], { memoria }).multi).toBe(3);
    expect(con(['especialista'], { memoria, niveles: { par: 2 } }).multi).toBe(4);
    expect(con(['especialista'], { memoria, niveles: { par: 3 } }).multi).toBe(6);
    const trio = [c('picas', 5), c('corazones', 5), c('treboles', 5)];
    expect(puntuar(trio, efectosDe(['especialista']), { mazo: [], restantes: 0, memoria }).multi).toBe(3 * 0.75);
    expect(puntuar(trio, efectosDe(['especialista']), { mazo: [], restantes: 0, memoria, niveles: { par: 3 } }).multi).toBe(0);
  });

  it('Fichas al fuego: la primera mano de cada combate ×3, +×1 por mundo vencido', () => {
    expect(con(['fichas-al-fuego'], { manosJugadas: 0, mundo: 1 }).multi).toBe(6);
    expect(con(['fichas-al-fuego'], { manosJugadas: 0, mundo: 3 }).multi).toBe(10);
    expect(con(['fichas-al-fuego'], { manosJugadas: 1, mundo: 3 }).multi).toBe(2);
  });
});
