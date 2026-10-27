import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { CATALOGO, CONJUNTOS, efectosDe, miembrosDe, precioDe, buscarBaratija, suerteDe, type Mesa } from '../src/juego/baratijas.ts';
import { crearMazo, type Carta } from '../src/juego/cartas.ts';
import { crearCombate, jugar, mesaDelCombate } from '../src/juego/combate.ts';
import {
  alquilar,
  apostar,
  avanzar,
  costoDelSoborno,
  crearPartida,
  objetivoDelCombate,
  puedeAlquilar,
  puedeSobornar,
  resolverCombate,
  sobornar,
  valorAlVender,
  type Partida,
} from '../src/juego/partida.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const carta = (id: string): Carta => {
  const [palo, rango] = id.split('-') as [Carta['palo'], string];
  return { id, palo, rango: Number(rango) as Carta['rango'] };
};
const cartas = (...ids: string[]) => ids.map(carta);

// La mesa de las pruebas: con `azar` que siempre da 0, toda probabilidad sale.
const mesa = (extra: Partial<Mesa> = {}): Mesa => ({ mazo: [], restantes: 0, ...extra });
const conSuerte = (extra: Partial<Mesa> = {}) => mesa({ azar: () => 0, ...extra });
const con = (ids: string[], jugadas: Carta[], extra: Partial<Mesa> = {}) => puntuar(jugadas, efectosDe(ids), mesa(extra));
const sin = (jugadas: Carta[], extra: Partial<Mesa> = {}) => puntuar(jugadas, [], mesa(extra));

// Una partida parada en un nodo del piso 1 del tipo pedido.
function partidaEn(tipo: 'combate' | 'elite' | 'pintor' | 'vendedor', baratijas: string[] = [], oro = 300): Partida {
  const partida = crearPartida(7);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = tipo;
  return { ...avanzar({ ...partida, baratijas }, destino.id), oro };
}

describe('catálogo', () => {
  it('no repite ids', () => {
    expect(new Set(CATALOGO.map((b) => b.id)).size).toBe(CATALOGO.length);
  });

  it('los sets nuevos y sus bonos', () => {
    const miembros = (id: string) => miembrosDe(CONJUNTOS.find((c) => c.id === id)!).map((b) => b.id).sort();
    expect(miembros('realeza')).toEqual(['el-rey', 'la-jota', 'la-reina']);
    expect(miembros('bajos-fondos')).toEqual(['cobro-de-piso', 'lavado-de-dinero', 'soborno']);
    expect(miembros('supersticioso')).toEqual(['espejo-roto', 'gato-negro', 'martes-13', 'trebol-de-cuatro-hojas']);
    expect(miembros('matematico')).toEqual(['fibonacci', 'numeros-primos', 'par-perfecto', 'pi']);
    expect(miembros('torneo')).toEqual(['boton-del-crupier', 'ciega-grande', 'ciega-pequena']);
    expect(miembros('tiempo')).toEqual(['paciencia', 'prisa', 'reloj-de-arena']);
    expect(miembros('jardin')).toEqual(['flower-power', 'grass-mower', 'jardinero']);
    expect(miembros('caridad')).toEqual(['altruista', 'materialista', 'robin-hood']);
    expect(miembros('artista')).toEqual(['claire-obscure', 'lienzo-en-blanco', 'obra-maestra', 'paleta']);
  });
});

describe('Realeza', () => {
  it('El Rey: las K que puntúan dan +3 multi', () => {
    expect(con(['el-rey'], cartas('picas-13', 'corazones-13')).multi).toBe(sin(cartas('picas-13', 'corazones-13')).multi + 6);
    expect(con(['el-rey'], cartas('picas-12', 'corazones-12')).multi).toBe(sin(cartas('picas-12', 'corazones-12')).multi);
  });

  it('La Reina: las Q que puntúan dan +20 fichas', () => {
    expect(con(['la-reina'], cartas('picas-12')).fichas).toBe(sin(cartas('picas-12')).fichas + 20);
  });

  it('La Jota: cada J tiene 1 en 4 de dar 25 de oro', () => {
    expect(puntuar(cartas('picas-11', 'corazones-11'), efectosDe(['la-jota']), conSuerte()).oro).toBe(50);
    expect(puntuar(cartas('picas-11'), efectosDe(['la-jota']), mesa({ azar: () => 0.5 })).oro).toBe(0);
    expect(con(['la-jota'], cartas('picas-11')).oro).toBe(0); // sin azar no sale nunca
  });

  it('con el set completo cada figura aplica los tres efectos', () => {
    const realeza = ['el-rey', 'la-reina', 'la-jota'];
    const jugada = puntuar(cartas('picas-11'), efectosDe(realeza), conSuerte());
    const base = sin(cartas('picas-11'));
    expect(jugada).toMatchObject({ fichas: base.fichas + 20, multi: base.multi + 3, oro: 25 });
  });
});

describe('Bajos fondos', () => {
  it('Cobro de piso: +25 por combate ganado sin descartar', () => {
    const partida = partidaEn('combate', ['cobro-de-piso']);
    expect(resolverCombate(partida, true, { descartesUsados: 0 }).oro).toBe(300 + 100 + 25);
    expect(resolverCombate(partida, true, { descartesUsados: 1 }).oro).toBe(300 + 100);
    expect(resolverCombate(partida, false, { descartesUsados: 0 }).oro).toBe(300 - 100);
  });

  it('Soborno: paga 10 % del oro y el objetivo baja 15 %', () => {
    expect(puedeSobornar(partidaEn('combate', [], 1000))).toBe(false);
    const partida = partidaEn('combate', ['soborno'], 1000);
    expect(costoDelSoborno(partida)).toBe(100);
    const sobornada = sobornar(partida);
    expect(sobornada.oro).toBe(900);
    expect(objetivoDelCombate(sobornada)).toBe(Math.round(objetivoDelCombate(partida) * 0.85));
    expect(puedeSobornar(sobornada)).toBe(false); // una vez por combate
    expect(resolverCombate(sobornada, true).soborno).toBe(false);
  });

  it('Lavado de dinero: el vendedor paga el precio completo por las comunes', () => {
    const partida = partidaEn('vendedor', ['lavado-de-dinero', 'subsidio', 'broker']);
    expect(valorAlVender(partida, 'subsidio')).toBe(precioDe(buscarBaratija('subsidio')));
    expect(valorAlVender(partida, 'broker')).toBe(precioDe(buscarBaratija('broker')) / 2);
  });

  it('con el set, el primer soborno de cada mundo es gratis', () => {
    const partida = partidaEn('combate', ['soborno', 'cobro-de-piso', 'lavado-de-dinero'], 1000);
    expect(costoDelSoborno(partida)).toBe(0);
    const sobornada = sobornar(partida);
    expect(sobornada.oro).toBe(1000);
    expect(costoDelSoborno({ ...resolverCombate(sobornada, true), combatePendiente: true })).toBe(112); // 1125 de oro
  });
});

describe('Supersticioso', () => {
  it('Trébol de cuatro hojas: los ♣ que puntúan dan +1 multi', () => {
    expect(con(['trebol-de-cuatro-hojas'], cartas('treboles-5')).multi).toBe(sin(cartas('treboles-5')).multi + 1);
    expect(con(['trebol-de-cuatro-hojas'], cartas('picas-5')).multi).toBe(sin(cartas('picas-5')).multi);
  });

  it('Gato negro: cada ♠ tiene 1 en 7 de dar ×2 multi', () => {
    const par = cartas('picas-5', 'treboles-5');
    expect(puntuar(par, efectosDe(['gato-negro']), conSuerte()).multi).toBe(sin(par).multi * 2);
    expect(puntuar(par, efectosDe(['gato-negro']), mesa({ azar: () => 0.2 })).multi).toBe(sin(par).multi);
  });

  it('Martes 13: con 13 cartas por robar, ×3 multi', () => {
    expect(con(['martes-13'], cartas('picas-5'), { restantes: 13 }).multi).toBe(3);
    expect(con(['martes-13'], cartas('picas-5'), { restantes: 12 }).multi).toBe(1);
  });

  it('Espejo roto: ×2 multi, y a veces se rompe al terminar un combate', () => {
    expect(con(['espejo-roto'], cartas('picas-5')).multi).toBe(2);
    let rotos = 0;
    for (let semilla = 1; semilla <= 70; semilla++) {
      const enCombate = partidaEn('combate', ['espejo-roto']);
      const partida = { ...enCombate, mapa: { ...enCombate.mapa, semilla } };
      if (!resolverCombate(partida, true).baratijas.includes('espejo-roto')) rotos++;
    }
    expect(rotos).toBeGreaterThan(0);
    expect(rotos).toBeLessThan(35);
  });

  it('con el set las probabilidades se duplican', () => {
    expect(suerteDe(efectosDe(['trebol-de-cuatro-hojas', 'gato-negro']))).toBe(1);
    const ids = ['trebol-de-cuatro-hojas', 'gato-negro', 'martes-13'];
    expect(suerteDe(efectosDe(ids))).toBe(2);
    // 0,2 no llega a 1/7 pero sí a 2/7. Primero puntúa la ♠ (×2), después la ♣ (+1).
    const par = cartas('picas-5', 'treboles-5');
    expect(puntuar(par, efectosDe(ids), mesa({ azar: () => 0.2, suerte: 2 })).multi).toBe(sin(par).multi * 2 + 1);
    const combate = crearCombate(crearAleatorio(1), { objetivo: 100, mazo: crearMazo(), baratijas: ids });
    expect(mesaDelCombate(combate).suerte).toBe(2);
  });
});

describe('Matemático', () => {
  it('Par perfecto: los pares dan +15 fichas', () => {
    expect(con(['par-perfecto'], cartas('picas-5', 'treboles-5')).fichas).toBe(sin(cartas('picas-5', 'treboles-5')).fichas + 15);
  });

  it('Números primos: 2, 3, 5, 7, J y K dan +2 multi', () => {
    expect(con(['numeros-primos'], cartas('picas-7', 'treboles-7')).multi).toBe(sin(cartas('picas-7', 'treboles-7')).multi + 4);
    expect(con(['numeros-primos'], cartas('picas-12', 'treboles-12')).multi).toBe(sin(cartas('picas-12', 'treboles-12')).multi);
  });

  it('Pi: con 3 cartas jugadas, +3,14 multi', () => {
    const tres = cartas('picas-7', 'treboles-7', 'corazones-2');
    expect(con(['pi'], tres).multi).toBeCloseTo(sin(tres).multi + 3.14);
    expect(con(['pi'], cartas('picas-7')).multi).toBe(1);
  });

  it('Fibonacci: A, 2, 3, 5 y 8 dan +1, +1, +2, +3 y +5 multi', () => {
    expect(con(['fibonacci'], cartas('picas-8', 'treboles-8')).multi).toBe(sin(cartas('picas-8', 'treboles-8')).multi + 10);
    expect(con(['fibonacci'], cartas('picas-14')).multi).toBe(2);
  });

  it('con el set, las jugadas que no puntúan también suman sus fichas', () => {
    const jugadas = cartas('picas-7', 'treboles-7', 'corazones-9');
    const ids = ['par-perfecto', 'numeros-primos', 'pi'];
    expect(con(ids, jugadas).fichas).toBe(con(['par-perfecto', 'numeros-primos'], jugadas).fichas + 9);
  });
});

describe('Torneo', () => {
  it('Ciega pequeña: la primera mano da +10 × riesgo fichas', () => {
    expect(con(['ciega-pequena'], cartas('picas-7'), { manosJugadas: 0, riesgo: 4 }).fichas).toBe(sin(cartas('picas-7')).fichas + 40);
    expect(con(['ciega-pequena'], cartas('picas-7'), { manosJugadas: 1, riesgo: 4 }).fichas).toBe(sin(cartas('picas-7')).fichas);
  });

  it('Ciega grande: la última mano da ×2 multi', () => {
    expect(con(['ciega-grande'], cartas('picas-7'), { manosRestantes: 1 }).multi).toBe(2);
    expect(con(['ciega-grande'], cartas('picas-7'), { manosRestantes: 2 }).multi).toBe(1);
  });

  it('Botón del crupier: +1 mano en élites y jefes; con el set, +1 en todos', () => {
    const manos = (tipo: 'combate' | 'elite' | 'jefe', ids: string[]) =>
      crearCombate(crearAleatorio(1), { objetivo: 100, mazo: crearMazo(), baratijas: ids, tipo }).manosRestantes;
    expect(manos('combate', ['boton-del-crupier'])).toBe(4);
    expect(manos('elite', ['boton-del-crupier'])).toBe(5);
    expect(manos('jefe', ['boton-del-crupier'])).toBe(5);
    const torneo = ['boton-del-crupier', 'ciega-pequena', 'ciega-grande'];
    expect(manos('combate', torneo)).toBe(5);
    expect(manos('elite', torneo)).toBe(6);
  });
});

describe('Tiempo', () => {
  it('Paciencia: +2 descartes, −1 mano', () => {
    const combate = crearCombate(crearAleatorio(1), { objetivo: 100, mazo: crearMazo(), baratijas: ['paciencia'] });
    expect(combate).toMatchObject({ manosRestantes: 3, descartesRestantes: 5 });
  });

  it('Prisa: ganar con la primera mano da +100', () => {
    const partida = partidaEn('combate', ['prisa']);
    expect(resolverCombate(partida, true, { manosJugadas: 1 }).oro).toBe(300 + 100 + 100);
    expect(resolverCombate(partida, true, { manosJugadas: 2 }).oro).toBe(300 + 100);
  });

  it('Reloj de arena: los descartes que sobran al ganar suman multi para siempre', () => {
    const partida = partidaEn('combate', ['reloj-de-arena']);
    const ganada = resolverCombate(partida, true, { descartesRestantes: 2 });
    expect(ganada.memoria['reloj-de-arena']).toEqual({ multi: 2 });
    expect(resolverCombate(partida, false, { descartesRestantes: 2 }).memoria['reloj-de-arena']?.multi).toBeUndefined();
    expect(con(['reloj-de-arena'], cartas('picas-7'), { memoria: ganada.memoria }).multi).toBe(3);
  });

  it('con el set, al ganar cada mano que sobra da 25', () => {
    const partida = partidaEn('combate', ['paciencia', 'prisa', 'reloj-de-arena']);
    expect(resolverCombate(partida, true, { manosRestantes: 2, manosJugadas: 2 }).oro).toBe(300 + 100 + 50);
  });
});

describe('Jardín y Caridad', () => {
  it('Jardinero y Robin Hood suman 5 fichas a sus palos', () => {
    expect(con(['jardinero'], cartas('picas-7')).fichas).toBe(sin(cartas('picas-7')).fichas + 5);
    expect(con(['jardinero'], cartas('corazones-7')).fichas).toBe(sin(cartas('corazones-7')).fichas);
    expect(con(['robin-hood'], cartas('diamantes-7')).fichas).toBe(sin(cartas('diamantes-7')).fichas + 5);
  });

  it('con el set completo sus baratijas ya no restan', () => {
    const picas = cartas('picas-8');
    expect(con(['flower-power'], picas).fichas).toBe(5 + 4);
    expect(con(['flower-power', 'grass-mower', 'jardinero'], picas).fichas).toBe(5 + 12 + 5);
    const corazones = cartas('corazones-8');
    expect(con(['materialista'], corazones).fichas).toBe(5 + 4);
    expect(con(['materialista', 'altruista', 'robin-hood'], corazones).fichas).toBe(5 + 12 + 5);
  });
});

describe('las que se suman a los sets de antes', () => {
  it('Ordenado: en orden ascendente ×2, ×3 con TOC TOC TOC completo', () => {
    const subiendo = cartas('picas-3', 'corazones-3');
    expect(con(['ordenado'], cartas('picas-2', 'corazones-5', 'treboles-9')).multi).toBe(2);
    expect(con(['ordenado'], cartas('picas-9', 'corazones-5')).multi).toBe(1);
    expect(con(['ordenado'], subiendo).multi).toBe(sin(subiendo).multi); // iguales no suben
    expect(con(['ordenado', 'estetico', 'simetrico'], cartas('picas-2', 'corazones-5')).multi).toBe(3);
  });

  it('Ficha de la suerte: la primera apuesta perdida de cada mundo no cuesta oro', () => {
    const partida = apostar(partidaEn('combate', ['ficha-de-la-suerte']), 100);
    const perdida = resolverCombate(partida, false);
    expect(perdida.oro).toBe(300 - 100);
    const otra = apostar({ ...perdida, combatePendiente: true }, 50);
    expect(resolverCombate(otra, false).oro).toBe(200 - 100 - 50);
  });

  it('Paleta: el pintor hace 2 trabajos por visita', () => {
    const sinPaleta = partidaEn('pintor', [], 5000);
    const [a, b] = sinPaleta.oferta!.opciones!;
    expect(puedeAlquilar(alquilar(sinPaleta, a!, 'corazones'), b!)).toBe(false);
    const conPaleta = partidaEn('pintor', ['paleta'], 5000);
    const una = alquilar(conPaleta, a!, 'corazones');
    expect(puedeAlquilar(una, b!)).toBe(true);
    expect(puedeAlquilar(alquilar(una, b!, 'corazones'), a!)).toBe(false);
  });

  it('Lienzo en blanco: las cartas sin modificar dan +3 fichas', () => {
    const modificada: Carta = { ...carta('picas-7'), modificaciones: { multi: 1 } };
    expect(con(['lienzo-en-blanco'], cartas('picas-7')).fichas).toBe(sin(cartas('picas-7')).fichas + 3);
    expect(con(['lienzo-en-blanco'], [modificada]).fichas).toBe(sin([modificada]).fichas);
  });
});

describe('oro al puntuar', () => {
  it('el combate junta el oro de las manos y la partida lo cobra al terminar', () => {
    const mazo = cartas('picas-11', 'corazones-11', 'treboles-11', 'diamantes-11', 'picas-2', 'picas-3', 'picas-4', 'picas-5', 'picas-6');
    let combate = crearCombate(crearAleatorio(1), { objetivo: 99_999, mazo, baratijas: ['la-jota'], semilla: 3 });
    const jotas = combate.mano.filter((c) => c.rango === 11).map((c) => c.id);
    combate = jugar(combate, jotas);
    expect(combate.oroGanado).toBe(combate.ultimaJugada!.oro);
    const partida = partidaEn('combate', ['la-jota']);
    expect(resolverCombate(partida, true, { oroGanado: 75 }).oro).toBe(300 + 100 + 75);
  });
});
