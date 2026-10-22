import { describe, expect, it } from 'vitest';
import { FICHAS_POR_MODIFICACION, fichasDeCarta, modificacionesDe, type Carta } from '../src/juego/cartas.ts';
import {
  alquilar,
  avanzar,
  cartasEnAlquiler,
  costoDeAlquiler,
  CARTAS_DEL_REGALO,
  cerrarOferta,
  costoDePersonalizado,
  elegirCartaDelRegalo,
  modificadorLibre,
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

  it('cambiar de palo pasa la carta al palo elegido, que tiene que ser otro', () => {
    const partida = { ...enPintor(), oferta: { ...enPintor().oferta!, modificador: 'palo' as const } };
    const id = cartasEnAlquiler(partida)[0]!.id;
    const antes = partida.mazo.find((c) => c.id === id)!;
    const otro = antes.palo === 'picas' ? 'corazones' : 'picas';
    expect(() => alquilar(partida, id)).toThrow();
    expect(() => alquilar(partida, id, antes.palo)).toThrow();
    const despues = alquilar(partida, id, otro).mazo.find((c) => c.id === id)!;
    expect(despues.palo).toBe(otro);
    expect(despues.modificaciones?.palo).toBe(1);
  });

  it('la pintura libre usa el modificador sorteado de la visita', () => {
    const partida = enPintor();
    expect(pintarLibre(partida, 'diamantes').modificador).toBe(modificadorLibre(partida));
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

describe('eventos', () => {
  // Un evento en el piso `piso` con el regalo pedido (se prueban semillas
  // hasta que toque).
  function enEvento(evento: 'regaloRaimundo' | 'regaloGustavo', antes: (p: Partida) => Partida = (p) => p, piso = 1): Partida {
    for (let semilla = 1; ; semilla++) {
      const partida = antes(crearPartida(semilla));
      const destino = partida.mapa.pisos[piso]![0]!;
      destino.tipo = 'evento';
      const llegada = avanzar({ ...partida, nodoActual: partida.mapa.pisos[piso - 1]![0]!.id, mapa: { ...partida.mapa } }, destino.id);
      if (llegada.oferta?.evento === evento) return llegada;
    }
  }

  it('Raimundo ofrece 9 cartas y hay que llevarse una', () => {
    const partida = enEvento('regaloRaimundo');
    const cartas = partida.oferta!.cartas!;
    expect(cartas).toHaveLength(CARTAS_DEL_REGALO);
    expect(() => cerrarOferta(partida)).toThrow();
    const con = elegirCartaDelRegalo(partida, cartas[4]!.id);
    expect(con.mazo).toHaveLength(53);
    expect(con.mazo.at(-1)).toEqual(cartas[4]);
    expect(con.oferta).toBeNull();
  });

  it('las cartas de Raimundo traen más modificaciones con más riesgo', () => {
    const total = (p: Partida) => p.oferta!.cartas!.reduce((s, c) => s + modificacionesDe(c), 0);
    const bajo = enEvento('regaloRaimundo', (p) => p, 2);
    const alto = enEvento('regaloRaimundo', (p) => p, 12);
    expect(total(alto)).toBeGreaterThan(total(bajo));
    for (const c of alto.oferta!.cartas!) expect(modificacionesDe(c)).toBeGreaterThanOrEqual(6);
  });

  it('Gustavo duplica los modificadores de la carta más modificada', () => {
    const conMods = (p: Partida) => ({ ...p, mazo: p.mazo.map((c, i) => (i === 3 ? { ...c, modificaciones: { multi: 2, fichas: 1, palo: 1 } } : i === 7 ? { ...c, modificaciones: { fichas: 1 } } : c)) });
    const partida = enEvento('regaloGustavo', conMods);
    const id = partida.oferta!.cartaLibre!;
    const carta = partida.mazo.find((c) => c.id === id)!;
    expect(carta.modificaciones).toMatchObject({ multi: 4, fichas: 2, palo: 1 });
    expect(cerrarOferta(partida).oferta).toBeNull();
  });

  it('sin cartas modificadas, Gustavo se va sin hacer nada', () => {
    const partida = enEvento('regaloGustavo');
    expect(partida.oferta!.cartaLibre).toBeUndefined();
    expect(partida.mazo.every((c) => !c.modificaciones)).toBe(true);
  });
});
