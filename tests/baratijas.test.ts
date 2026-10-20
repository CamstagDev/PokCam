import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { CATALOGO, baratijasDe, sortearBaratijas } from '../src/juego/baratijas.ts';
import type { Carta } from '../src/juego/cartas.ts';
import { crearCombate } from '../src/juego/combate.ts';
import { crearMazo } from '../src/juego/cartas.ts';
import {
  avanzar,
  cerrarOferta,
  comprarBaratija,
  crearPartida,
  elegirBaratija,
  nodoActual,
  puedeComprar,
  resolverCombate,
  type Partida,
} from '../src/juego/partida.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const carta = (id: string): Carta => {
  const [palo, rango] = id.split('-') as [Carta['palo'], string];
  return { id, palo, rango: Number(rango) as Carta['rango'] };
};

// Una partida parada en el nodo del tipo pedido (se fuerza el tipo del nodo
// del piso 1 para no depender de cómo salió el mapa).
function partidaEn(tipo: 'elite' | 'vendedor', oro = 300): Partida {
  const partida = crearPartida(7);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = tipo;
  return { ...avanzar(partida, destino.id), oro };
}

describe('baratijas', () => {
  it('el catálogo no repite ids', () => {
    expect(new Set(CATALOGO.map((b) => b.id)).size).toBe(CATALOGO.length);
  });

  it('se sortean 3 distintas, sin las que ya se tienen', () => {
    const tiene = [CATALOGO[0]!.id];
    const sorteadas = sortearBaratijas(crearAleatorio(1), tiene);
    expect(sorteadas).toHaveLength(3);
    expect(new Set(sorteadas).size).toBe(3);
    expect(sorteadas).not.toContain(tiene[0]);
  });

  it('cambian la puntuación de una mano', () => {
    const cartas = [carta('corazones-10'), carta('picas-10')];
    const sin = puntuar(cartas);
    const con = puntuar(cartas, baratijasDe(['dado-cargado', 'ficha-de-casino', 'corazon-de-cristal']));
    expect(con.fichas).toBe(sin.fichas + 30);
    expect(con.multi).toBe(sin.multi + 4 + 3);
    expect(con.total).toBe(con.fichas * con.multi);
  });

  it('cambian las manos y descartes con que empieza un combate', () => {
    const combate = crearCombate(crearAleatorio(1), { objetivo: 300, mazo: crearMazo(), baratijas: ['guante-de-mago', 'papelera'] });
    expect(combate.manosRestantes).toBe(5);
    expect(combate.descartesRestantes).toBe(4);
  });

  it('una baratija que ya no existe se ignora', () => {
    expect(baratijasDe(['no-existe', 'dado-cargado']).map((b) => b.id)).toEqual(['dado-cargado']);
  });
});

describe('recompensa del élite', () => {
  it('vencerlo ofrece elegir 1 de 3', () => {
    const partida = resolverCombate(partidaEn('elite'), true);
    expect(partida.oferta?.tipo).toBe('elite');
    expect(partida.oferta?.baratijas).toHaveLength(3);
    const elegida = partida.oferta!.baratijas[1]!;
    const despues = elegirBaratija(partida, elegida);
    expect(despues.baratijas).toEqual([elegida]);
    expect(despues.oferta).toBeNull();
  });

  it('perderlo no ofrece nada', () => {
    expect(resolverCombate(partidaEn('elite'), false).oferta).toBeNull();
  });

  it('no se puede seguir por el mapa sin elegir o saltear', () => {
    const partida = resolverCombate(partidaEn('elite'), true);
    const siguiente = nodoActual(partida).siguientes[0]!;
    expect(() => avanzar(partida, siguiente)).toThrow();
    expect(() => avanzar(cerrarOferta(partida), siguiente)).not.toThrow();
  });

  it('la alcancía suma oro al ganar', () => {
    const partida = { ...partidaEn('elite'), baratijas: ['alcancia'] };
    expect(resolverCombate(partida, true).oro).toBe(300 + 100 + 50);
  });
});

describe('vendedor de baratijas', () => {
  it('al llegar ofrece 3 baratijas, siempre las mismas', () => {
    const partida = partidaEn('vendedor');
    expect(partida.oferta?.tipo).toBe('vendedor');
    expect(partida.oferta?.baratijas).toHaveLength(3);
    expect(partidaEn('vendedor').oferta).toEqual(partida.oferta);
  });

  it('comprar resta el precio y la saca de la venta', () => {
    const partida = partidaEn('vendedor', 1000);
    const id = partida.oferta!.baratijas[0]!;
    const precio = CATALOGO.find((b) => b.id === id)!.precio;
    const despues = comprarBaratija(partida, id);
    expect(despues.oro).toBe(1000 - precio);
    expect(despues.baratijas).toEqual([id]);
    expect(despues.oferta?.baratijas).not.toContain(id);
  });

  it('no deja comprar si el oro no alcanza o quedaría en 0', () => {
    const id = partidaEn('vendedor').oferta!.baratijas[0]!;
    const precio = CATALOGO.find((b) => b.id === id)!.precio;
    expect(puedeComprar(partidaEn('vendedor', precio), id)).toBe(false);
    expect(puedeComprar(partidaEn('vendedor', precio + 1), id)).toBe(true);
    expect(() => comprarBaratija(partidaEn('vendedor', precio), id)).toThrow();
  });
});
