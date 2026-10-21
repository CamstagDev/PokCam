import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { CATALOGO, aplicar, baratijasDe, buscarBaratija, sortearBaratijas, type Baratija } from '../src/juego/baratijas.ts';
import type { Carta } from '../src/juego/cartas.ts';
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

// Baratijas de prueba, una por efecto, para no depender del catálogo.
const deMulti: Baratija = { id: 'm', nombre: 'm', descripcion: '', precio: 1, icono: '', alPuntuar: (m) => ({ ...m, multi: m.multi + 4 }) };
const deFichas: Baratija = { id: 'f', nombre: 'f', descripcion: '', precio: 1, icono: '', alPuntuar: (m) => ({ ...m, fichas: m.fichas + 30 }) };
const deManos: Baratija = { id: 'h', nombre: 'h', descripcion: '', precio: 1, icono: '', alEmpezarCombate: (i) => ({ ...i, manos: i.manos + 1 }) };
const deOro: Baratija = { id: 'o', nombre: 'o', descripcion: '', precio: 1, icono: '', alGanarCombate: (oro) => oro + 50 };

describe('baratijas', () => {
  it('el catálogo no repite ids', () => {
    expect(new Set(CATALOGO.map((b) => b.id)).size).toBe(CATALOGO.length);
  });

  it('se sortean distintas, sin las que ya se tienen', () => {
    const todas = sortearBaratijas(crearAleatorio(1), []);
    expect(todas).toHaveLength(Math.min(3, CATALOGO.length));
    expect(new Set(todas).size).toBe(todas.length);
    expect(sortearBaratijas(crearAleatorio(1), CATALOGO.map((b) => b.id))).toEqual([]);
  });

  it('cambian las fichas y el multiplicador de una mano', () => {
    const cartas = [carta('corazones-10'), carta('picas-10')];
    const sin = puntuar(cartas);
    const con = puntuar(cartas, [deMulti, deFichas]);
    expect(con.fichas).toBe(sin.fichas + 30);
    expect(con.multi).toBe(sin.multi + 4);
    expect(con.total).toBe(con.fichas * con.multi);
  });

  it('cambian las manos de un combate y el oro ganado', () => {
    expect(aplicar([deManos], 'alEmpezarCombate', { manos: 4, descartes: 3 })).toEqual({ manos: 5, descartes: 3 });
    expect(aplicar([deOro, deOro], 'alGanarCombate', 100)).toBe(200);
  });

  it('una baratija que ya no existe se ignora', () => {
    expect(baratijasDe(['no-existe', 'materialista']).map((b) => b.id)).toEqual(['materialista']);
  });
});

describe('Materialista', () => {
  const materialista = [buscarBaratija('materialista')];

  it('las ♥ valen la mitad y las ♦ 1,5 veces, redondeando', () => {
    // Par: 10 fichas de la mano + las de las dos cartas.
    expect(puntuar([carta('corazones-8'), carta('picas-8')], materialista).fichas).toBe(10 + 4 + 8);
    expect(puntuar([carta('diamantes-8'), carta('treboles-8')], materialista).fichas).toBe(10 + 12 + 8);
    expect(puntuar([carta('corazones-7'), carta('diamantes-7')], materialista).fichas).toBe(10 + 4 + 11);
  });

  it('no toca el multiplicador', () => {
    const cartas = [carta('corazones-8'), carta('diamantes-8')];
    expect(puntuar(cartas, materialista).multi).toBe(puntuar(cartas).multi);
  });
});

describe('recompensa del élite', () => {
  it('vencerlo ofrece elegir 1 de 3', () => {
    const partida = resolverCombate(partidaEn('elite'), true);
    expect(partida.oferta?.tipo).toBe('elite');
    expect(partida.oferta?.baratijas).toHaveLength(Math.min(3, CATALOGO.length));
    const elegida = partida.oferta!.baratijas[0]!;
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

  it('sin baratijas por conseguir no ofrece nada', () => {
    const partida = { ...partidaEn('elite'), baratijas: CATALOGO.map((b) => b.id) };
    expect(resolverCombate(partida, true).oferta).toBeNull();
  });
});

describe('vendedor de baratijas', () => {
  it('al llegar ofrece hasta 3 baratijas, siempre las mismas', () => {
    const partida = partidaEn('vendedor');
    expect(partida.oferta?.tipo).toBe('vendedor');
    expect(partida.oferta?.baratijas).toHaveLength(Math.min(3, CATALOGO.length));
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
