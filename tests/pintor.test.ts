import { describe, expect, it } from 'vitest';
import { FICHAS_POR_MODIFICACION, fichasDeCarta, modificacionesDe, type Carta } from '../src/juego/cartas.ts';
import {
  alquilar,
  avanzar,
  cartasEnAlquiler,
  costoDeAlquiler,
  costoDePersonalizado,
  crearPartida,
  ofrecePersonalizado,
  personalizar,
  pintarLibre,
  puedeAlquilar,
  puedePintarLibre,
  puedePersonalizar,
  type Partida,
} from '../src/juego/partida.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

function enPintor(oro = 1000, baratijas: string[] = []): Partida {
  const partida = crearPartida(7);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = 'pintor';
  return { ...avanzar({ ...partida, baratijas }, destino.id), oro };
}

const carta = (id: string, modificaciones?: Carta['modificaciones']): Carta => ({ id, palo: 'picas', rango: 5, modificaciones });

describe('modificaciones de cartas', () => {
  it('+5 fichas por cada vez, +1 multi al puntuar y cada vez cuenta', () => {
    const c = carta('a', { fichas: 2, multi: 3, palo: 1 });
    expect(fichasDeCarta(c)).toBe(5 + 2 * FICHAS_POR_MODIFICACION);
    expect(modificacionesDe(c)).toBe(6);
    const sola = puntuar([c]);
    const sinModificar = puntuar([carta('b')]);
    expect(sola.fichas).toBe(sinModificar.fichas + 10);
    expect(sola.multi).toBe(sinModificar.multi + 3);
  });
});

describe('el pintor', () => {
  it('al llegar muestra una carta del mazo, un modificador y 6 cartas', () => {
    const partida = enPintor();
    expect(partida.oferta?.tipo).toBe('pintor');
    expect(partida.mazo.some((c) => c.id === partida.oferta!.cartaLibre)).toBe(true);
    expect(cartasEnAlquiler(partida)).toHaveLength(6);
  });

  it('la pintura libre cuesta 100 y modifica la carta mostrada; un solo trabajo por visita', () => {
    const partida = enPintor();
    const { partida: pintada, modificador } = pintarLibre(partida);
    expect(pintada.oro).toBe(900);
    const id = partida.oferta!.cartaLibre!;
    expect(pintada.mazo.find((c) => c.id === id)!.modificaciones?.[modificador]).toBe(1);
    expect(puedePintarLibre(pintada)).toBe(false);
    expect(puedeAlquilar(pintada, cartasEnAlquiler(pintada)[0]!.id)).toBe(false);
  });

  it('el alquiler cuesta 100 × las modificaciones de las 6 cartas (al menos 100)', () => {
    const partida = enPintor();
    expect(costoDeAlquiler(partida)).toBe(100);
    const [a, b] = cartasEnAlquiler(partida);
    const mazo = partida.mazo.map((c) => (c.id === a!.id ? { ...c, modificaciones: { multi: 2 } } : c.id === b!.id ? { ...c, modificaciones: { fichas: 1 } } : c));
    const modificada = { ...partida, mazo };
    expect(costoDeAlquiler(modificada)).toBe(300);
    const hecha = alquilar(modificada, a!.id);
    expect(hecha.oro).toBe(700);
    expect(modificacionesDe(hecha.mazo.find((c) => c.id === a!.id)!)).toBe(3);
    expect(() => alquilar(partida, partida.mazo.find((c) => !partida.oferta!.opciones!.includes(c.id))!.id)).toThrow();
  });

  it('cambiar de palo pasa la carta a otro palo', () => {
    const partida = { ...enPintor(), oferta: { ...enPintor().oferta!, modificador: 'palo' as const } };
    const id = cartasEnAlquiler(partida)[0]!.id;
    const antes = partida.mazo.find((c) => c.id === id)!;
    const despues = alquilar(partida, id).mazo.find((c) => c.id === id)!;
    expect(despues.palo).not.toBe(antes.palo);
    expect(despues.modificaciones?.palo).toBe(1);
  });

  it('Personalizado solo con Claire obscure, por 100 × las modificaciones del mazo', () => {
    const sin = enPintor();
    expect(ofrecePersonalizado(sin)).toBe(false);
    expect(puedePersonalizar(sin, sin.mazo[0]!.id)).toBe(false);
    const con = enPintor(1000, ['claire-obscure']);
    expect(ofrecePersonalizado(con)).toBe(true);
    const mazo = con.mazo.map((c, i) => (i < 4 ? { ...c, modificaciones: { fichas: 1 } } : c));
    const modificada = { ...con, mazo };
    expect(costoDePersonalizado(modificada)).toBe(400);
    const id = mazo[10]!.id;
    const hecha = personalizar(modificada, id, 'multi');
    expect(hecha.oro).toBe(600);
    expect(hecha.mazo.find((c) => c.id === id)!.modificaciones?.multi).toBe(1);
    expect(puedePersonalizar(hecha, mazo[11]!.id)).toBe(false);
  });
});
