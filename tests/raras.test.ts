import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { efectosDe, recordar, type Memoria, type Mesa } from '../src/juego/baratijas.ts';
import { crearMazo, type Carta } from '../src/juego/cartas.ts';
import { crearCombate, jugar } from '../src/juego/combate.ts';
import {
  avanzar,
  crearPartida,
  elegirBaratija,
  objetivoDelCombate,
  resolverCombate,
  siguienteMundo,
  type Partida,
} from '../src/juego/partida.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const carta = (id: string): Carta => {
  const [palo, rango] = id.split('-') as [Carta['palo'], string];
  return { id, palo, rango: Number(rango) as Carta['rango'] };
};
const cartas = (...ids: string[]) => ids.map(carta);
const mesa = (extra: Partial<Mesa> = {}): Mesa => ({ mazo: [], restantes: 0, ...extra });
const con = (ids: string[], jugadas: Carta[], extra: Partial<Mesa> = {}) => puntuar(jugadas, efectosDe(ids), mesa(extra));
const sin = (jugadas: Carta[]) => puntuar(jugadas);

function partidaEn(tipo: 'combate' | 'elite' | 'manoNegra', baratijas: string[] = [], memoria: Memoria = {}): Partida {
  const partida = crearPartida(7);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = tipo;
  return avanzar({ ...partida, baratijas, memoria }, destino.id);
}

// Lo que recuerda una baratija tras jugar esas manos.
const jugadas = (id: string, manos: ('par' | 'trio' | 'color')[]) =>
  manos.reduce<Memoria>((m, mano) => recordar(m, [id], { tipo: 'mano', mano, total: 0, objetivo: 1 }), {});

describe('raras', () => {
  it('Vampiro: las modificadas que puntúan se quedan sin modificar y él crece', () => {
    const modificada: Carta = { ...carta('picas-9'), modificaciones: { multi: 2 } };
    const mazo = [modificada, ...cartas('corazones-2', 'corazones-3', 'corazones-4', 'corazones-5', 'corazones-6', 'corazones-7', 'corazones-8')];
    const combate = crearCombate(crearAleatorio(1), { objetivo: 99_999, mazo, baratijas: ['vampiro'] });
    const jugado = jugar(combate, ['picas-9']);
    expect(jugado.memoria.vampiro).toEqual({ cartas: 1 });
    expect(jugado.mazo.find((c) => c.id === 'picas-9')!.modificaciones).toBeUndefined();
    const partida = partidaEn('combate', ['vampiro']);
    expect(resolverCombate(partida, true, jugado).mazo).toHaveLength(8);
    expect(con(['vampiro'], cartas('picas-5'), { memoria: jugado.memoria }).multi).toBeCloseTo(1.2);
  });

  it('Espiral: +2 multi por cada mano seguida del mismo tipo; al cambiar vuelve a 0', () => {
    const par = cartas('picas-5', 'corazones-5');
    expect(con(['espiral'], par, { memoria: jugadas('espiral', ['par']) }).multi).toBe(sin(par).multi + 2);
    expect(con(['espiral'], par, { memoria: jugadas('espiral', ['par', 'par']) }).multi).toBe(sin(par).multi + 4);
    expect(con(['espiral'], par, { memoria: jugadas('espiral', ['par', 'trio']) }).multi).toBe(sin(par).multi);
    const fin = recordar(jugadas('espiral', ['par']), ['espiral'], { tipo: 'combate', gano: true });
    expect(fin.espiral).toEqual({});
  });

  it('Dúo dinámico: manos con al menos un par, ×2', () => {
    expect(con(['duo-dinamico'], cartas('picas-5', 'corazones-5', 'treboles-5')).multi).toBe(sin(cartas('picas-5', 'corazones-5', 'treboles-5')).multi * 2);
    expect(con(['duo-dinamico'], cartas('picas-5')).multi).toBe(1);
  });

  it('Tormenta perfecta: 5 cartas que puntúan todas, ×2', () => {
    const escalera = cartas('picas-5', 'corazones-6', 'treboles-7', 'picas-8', 'diamantes-9');
    expect(con(['tormenta-perfecta'], escalera).multi).toBe(sin(escalera).multi * 2);
    const poker = cartas('picas-5', 'corazones-5', 'treboles-5', 'diamantes-5', 'diamantes-9');
    expect(con(['tormenta-perfecta'], poker).multi).toBe(sin(poker).multi);
  });

  it('Clonador: al empezar cada mundo se duplica una carta, con sus modificadores', () => {
    const modificada: Carta = { ...carta('picas-9'), modificaciones: { fichas: 3 } };
    const partida = { ...partidaEn('combate', ['clonador']), mazo: [modificada] };
    const nuevo = siguienteMundo(partida);
    expect(nuevo.mazo).toHaveLength(2);
    expect(nuevo.mazo[1]).toMatchObject({ palo: 'picas', rango: 9, modificaciones: { fichas: 3 } });
    expect(nuevo.mazo[1]!.id).not.toBe('picas-9');
  });

  it('Imán: al robar, la primera es del palo que más hay en la mano', () => {
    const mazo = crearMazo();
    for (let semilla = 1; semilla <= 10; semilla++) {
      const combate = crearCombate(crearAleatorio(semilla), { objetivo: 99_999, mazo, baratijas: ['iman'] });
      const jugada = combate.mano[0]!;
      const resto = combate.mano.slice(1);
      const cuantas = (palo: string) => resto.filter((c) => c.palo === palo).length;
      const maximo = Math.max(...['picas', 'corazones', 'treboles', 'diamantes'].map(cuantas));
      const robada = jugar(combate, [jugada.id]).mano.at(-1)!;
      expect(cuantas(robada.palo)).toBe(maximo);
    }
  });

  it('Recompensa: vencer a un élite sube la mano más jugada', () => {
    const partida = partidaEn('elite', ['recompensa']);
    const memoria = jugadas('recompensa', ['par', 'trio', 'trio']);
    expect(resolverCombate(partida, true, { memoria }).niveles.trio).toBe(2);
    expect(resolverCombate(partida, false, { memoria }).niveles.trio).toBe(1);
  });

  it('Telescopio: Helman O\'Grande ofrece la mano más jugada', () => {
    for (const mano of ['par', 'trio', 'color'] as const) {
      const partida = partidaEn('manoNegra', ['telescopio'], jugadas('telescopio', [mano, mano]));
      expect(partida.oferta!.manos).toContain(mano);
      expect(partida.oferta!.manos).toHaveLength(3);
    }
  });

  it('Comodín: al conseguirlo, una carta del mazo pasa a ser comodín', () => {
    const elite = resolverCombate(partidaEn('elite'), true);
    const conComodin = elegirBaratija({ ...elite, oferta: { ...elite.oferta!, baratijas: ['comodin'] } }, 'comodin');
    expect(conComodin.mazo.filter((c) => c.comodin)).toHaveLength(1);
  });

  it('Contrato con el diablo: ×3 multi y el objetivo sube 25 %', () => {
    expect(con(['contrato-con-el-diablo'], cartas('picas-5')).multi).toBe(3);
    const partida = partidaEn('combate');
    expect(objetivoDelCombate({ ...partida, baratijas: ['contrato-con-el-diablo'] })).toBe(Math.round(objetivoDelCombate(partida) * 1.25));
  });

  it('Bancarrota: con menos de 100 de oro, ×3', () => {
    expect(con(['bancarrota'], cartas('picas-5'), { oro: 99 }).multi).toBe(3);
    expect(con(['bancarrota'], cartas('picas-5'), { oro: 100 }).multi).toBe(1);
  });

  it('Segunda oportunidad: una vez por mundo se repite un combate normal perdido', () => {
    const partida = partidaEn('combate', ['segunda-oportunidad']);
    const repetido = resolverCombate(partida, false);
    expect(repetido).toMatchObject({ oro: 300, combatePendiente: true });
    expect(resolverCombate(repetido, false)).toMatchObject({ oro: 200, combatePendiente: false });
    const elite = partidaEn('elite', ['segunda-oportunidad']);
    expect(resolverCombate(elite, false).combatePendiente).toBe(false);
  });
});
