import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { BARAJAS, IDS_DE_BARAJA, barajasDesbloqueadas, mazoDeBaraja } from '../src/juego/barajas.ts';
import { CATALOGO, buscarBaratija } from '../src/juego/baratijas.ts';
import { modificacionesDe } from '../src/juego/cartas.ts';
import { desbloquearBarajas, leerBarajas, leerGuardado, type Almacen } from '../src/juego/guardado.ts';
import {
  apostar,
  avanzar,
  comprarBaratija,
  costoDeAlquiler,
  costoDePinturaLibre,
  crearPartida,
  descartesDeLaPartida,
  maximoApostable,
  objetivoDelCombate,
  resolverCombate,
  volverATirar,
  type Partida,
} from '../src/juego/partida.ts';
import type { IdBaraja } from '../src/juego/barajas.ts';

function partidaEn(baraja: IdBaraja, tipo: 'combate' | 'vendedor' | 'pintor' = 'combate'): Partida {
  const partida = crearPartida(7, baraja);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = tipo;
  return avanzar(partida, destino.id);
}

function enElJefe(partida: Partida): Partida {
  const jefe = partida.mapa.pisos.at(-1)![0]!;
  return { ...partida, nodoActual: jefe.id, combatePendiente: true, apuesta: 0 };
}

function almacenEnMemoria(): Almacen {
  const datos = new Map<string, string>();
  return { getItem: (c) => datos.get(c) ?? null, setItem: (c, v) => void datos.set(c, v), removeItem: (c) => void datos.delete(c) };
}

describe('barajas', () => {
  it('hay 7, cada una con su texto', () => {
    expect(BARAJAS.map((b) => b.id)).toEqual([...IDS_DE_BARAJA]);
    for (const b of BARAJAS) expect(b.nombre && b.ventaja && b.costo && b.desbloqueo).toBeTruthy();
  });

  it('clásica: las 52 cartas y 300 de oro', () => {
    const partida = crearPartida(7);
    expect(partida.baraja).toBe('clasica');
    expect(partida.mazo).toHaveLength(52);
    expect(partida.oro).toBe(300);
    expect(descartesDeLaPartida(partida)).toBe(3);
  });

  it('del Tahúr: 32 cartas del 7 al As y objetivos +25 %', () => {
    const partida = partidaEn('tahur');
    expect(partida.mazo).toHaveLength(32);
    expect(partida.mazo.every((c) => c.rango >= 7)).toBe(true);
    const clasica = partidaEn('clasica');
    expect(objetivoDelCombate(partida)).toBe(Math.round(objetivoDelCombate(clasica) * 1.25));
  });

  it('de la fortuna: 1000 de oro; la apuesta empieza en 0 y sube 5 % por victoria, hasta 50 %', () => {
    let partida = partidaEn('fortuna');
    expect(partida.oro).toBe(1000);
    expect(maximoApostable(partida)).toBe(0);
    partida = resolverCombate(partida, true);
    expect(partida.logros.victorias).toBe(1);
    expect(maximoApostable(partida)).toBe(Math.floor(partida.oro * 0.05));
    const veterana = { ...partida, logros: { ...partida.logros, victorias: 30 } };
    expect(maximoApostable(veterana)).toBe(Math.floor(partida.oro * 0.5));
  });

  it('del apostador: se apuesta todo, y ganar no da oro', () => {
    const partida = partidaEn('apostador');
    expect(maximoApostable(partida)).toBe(partida.oro);
    expect(resolverCombate(partida, true).oro).toBe(300);
    expect(resolverCombate(apostar(partida, 300), true).oro).toBe(600);
    expect(resolverCombate(partida, false).oro).toBe(200);
  });

  it('del artista: 10 cartas modificadas y el pintor cobra el doble', () => {
    const mazo = mazoDeBaraja('artista', crearAleatorio(3));
    expect(mazo).toHaveLength(52);
    expect(mazo.filter((c) => modificacionesDe(c) > 0)).toHaveLength(10);
    const artista = partidaEn('artista', 'pintor');
    const clasica = partidaEn('clasica', 'pintor');
    expect(costoDePinturaLibre(artista)).toBe(2 * costoDePinturaLibre(clasica));
    expect(costoDeAlquiler(artista)).toBe(2 * costoDeAlquiler({ ...artista, baraja: 'clasica' }));
  });

  it('bicolor: solo ♥ y ♠, cada carta dos veces, y un descarte menos', () => {
    const partida = crearPartida(7, 'bicolor');
    expect(partida.mazo).toHaveLength(52);
    expect(new Set(partida.mazo.map((c) => c.id)).size).toBe(52);
    expect(partida.mazo.every((c) => c.palo === 'corazones' || c.palo === 'picas')).toBe(true);
    expect(partida.mazo.filter((c) => c.palo === 'picas' && c.rango === 14)).toHaveLength(2);
    expect(descartesDeLaPartida(partida)).toBe(2);
  });

  it('maldita: empieza con una rara y el vendedor no vende comunes', () => {
    const partida = crearPartida(7, 'maldita');
    expect(partida.baratijas).toHaveLength(1);
    expect(buscarBaratija(partida.baratijas[0]!).rareza).toBe('rara');
    let vendedor = { ...partidaEn('maldita', 'vendedor'), oro: 1_000_000 };
    for (let i = 0; i < 20; i++) {
      for (const id of vendedor.oferta!.baratijas) expect(buscarBaratija(id).rareza).not.toBe('comun');
      vendedor = volverATirar(vendedor);
    }
  });
});

describe('desbloquear barajas', () => {
  it('ganar 5 apuestas en una partida desbloquea la de la fortuna', () => {
    let partida = partidaEn('clasica');
    for (let i = 0; i < 5; i++) partida = resolverCombate(apostar({ ...partida, combatePendiente: true }, 10), true);
    expect(partida.logros.apuestasGanadas).toBe(5);
    expect(barajasDesbloqueadas(partida)).toContain('fortuna');
  });

  it('vencer a un jefe: Tahúr; con Estético, bicolor; sin comprar, maldita', () => {
    const sinNada = resolverCombate(enElJefe(crearPartida(5)), true);
    expect(barajasDesbloqueadas(sinNada)).toEqual(['tahur', 'maldita']);
    const conEstetico = resolverCombate({ ...enElJefe(crearPartida(5)), baratijas: ['estetico'] }, true);
    expect(barajasDesbloqueadas(conEstetico)).toContain('bicolor');
    const compradora = comprarBaratija({ ...crearPartida(5), oro: 10_000, oferta: { tipo: 'vendedor', baratijas: ['subsidio'] } }, 'subsidio');
    expect(compradora.logros.compras).toBe(1);
    expect(barajasDesbloqueadas(resolverCombate(enElJefe(compradora), true))).not.toContain('maldita');
  });

  it('completar el set del apostador o del artista desbloquea su baraja', () => {
    const miembros = (set: string) => CATALOGO.filter((b) => b.conjunto === set).map((b) => b.id);
    expect(barajasDesbloqueadas({ baratijas: miembros('apostador-empedernido') })).toEqual(['apostador']);
    expect(barajasDesbloqueadas({ baratijas: miembros('artista') })).toEqual(['artista']);
    expect(barajasDesbloqueadas({ baratijas: miembros('artista').slice(1) })).toEqual([]);
  });

  it('se guardan para todas las ranuras; la clásica siempre está', () => {
    const almacen = almacenEnMemoria();
    expect(leerBarajas(almacen)).toEqual(['clasica']);
    expect(desbloquearBarajas(almacen, ['maldita', 'tahur'])).toEqual(['maldita', 'tahur']);
    expect(desbloquearBarajas(almacen, ['tahur'])).toEqual([]);
    expect(leerBarajas(almacen)).toEqual(['clasica', 'tahur', 'maldita']);
  });

  it('las partidas de antes de las barajas siguen con la clásica', () => {
    const { baraja: _b, logros: _l, ...vieja } = crearPartida(7);
    const cargada = leerGuardado(JSON.stringify({ version: 15, guardadoEn: 1, partida: vieja }))!;
    expect(cargada.partida.baraja).toBe('clasica');
    expect(cargada.partida.logros.victorias).toBe(0);
  });
});
