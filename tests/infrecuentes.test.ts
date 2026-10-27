import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { efectosDe, type Mesa } from '../src/juego/baratijas.ts';
import { crearMazo, type Carta } from '../src/juego/cartas.ts';
import { crearCombate, descartar, jugar } from '../src/juego/combate.ts';
import { evaluarMano } from '../src/juego/manos.ts';
import { avanzar, costoDeCarta, crearPartida, resolverCombate, type Partida } from '../src/juego/partida.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const carta = (id: string): Carta => {
  const [palo, rango] = id.split('-') as [Carta['palo'], string];
  return { id, palo, rango: Number(rango) as Carta['rango'] };
};
const cartas = (...ids: string[]) => ids.map(carta);
const mesa = (extra: Partial<Mesa> = {}): Mesa => ({ mazo: [], restantes: 0, ...extra });
const con = (ids: string[], jugadas: Carta[], extra: Partial<Mesa> = {}) => puntuar(jugadas, efectosDe(ids), mesa(extra));
const sin = (jugadas: Carta[]) => puntuar(jugadas);

function partidaEn(tipo: 'combate' | 'tienda', baratijas: string[] = [], oro = 300): Partida {
  const partida = crearPartida(7);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = tipo;
  return { ...avanzar({ ...partida, baratijas }, destino.id), oro };
}

describe('reglas de las manos', () => {
  it('sin reglas, escaleras y colores siguen siendo de 5', () => {
    expect(evaluarMano(cartas('picas-5', 'corazones-6', 'treboles-7', 'picas-8')).tipo).toBe('cartaAlta');
    expect(evaluarMano(cartas('picas-14', 'corazones-2', 'treboles-3', 'picas-4', 'diamantes-5')).tipo).toBe('escalera');
    expect(evaluarMano(cartas('picas-10', 'corazones-11', 'treboles-12', 'picas-13', 'diamantes-14')).tipo).toBe('escalera');
    expect(evaluarMano(cartas('picas-12', 'corazones-13', 'treboles-14', 'picas-2', 'diamantes-3')).tipo).toBe('cartaAlta');
  });

  it('corta: escaleras y colores de 4, y puntúan solo esas 4', () => {
    const escalera = evaluarMano(cartas('picas-5', 'corazones-6', 'treboles-7', 'picas-8', 'diamantes-13'), { corta: true });
    expect(escalera.tipo).toBe('escalera');
    expect(escalera.cartasQuePuntuan.map((c) => c.rango)).toEqual([5, 6, 7, 8]);
    const color = evaluarMano(cartas('picas-2', 'picas-6', 'picas-9', 'picas-12', 'diamantes-13'), { corta: true });
    expect(color.tipo).toBe('color');
    expect(color.cartasQuePuntuan).toHaveLength(4);
    expect(evaluarMano(cartas('picas-5', 'picas-6', 'picas-7', 'picas-8'), { corta: true }).tipo).toBe('escaleraColor');
  });

  it('puente: la escalera puede saltarse un número, una vez', () => {
    expect(evaluarMano(cartas('picas-3', 'corazones-4', 'treboles-6', 'picas-7', 'diamantes-8'), { puente: true }).tipo).toBe('escalera');
    expect(evaluarMano(cartas('picas-3', 'corazones-5', 'treboles-7', 'picas-8', 'diamantes-9'), { puente: true }).tipo).toBe('cartaAlta');
    expect(evaluarMano(cartas('picas-3', 'corazones-4', 'treboles-6', 'picas-7', 'diamantes-8')).tipo).toBe('cartaAlta');
  });

  it('el comodín cuenta como de cualquier palo para el color', () => {
    const jugadas = cartas('picas-2', 'picas-6', 'picas-9', 'picas-12', 'corazones-13');
    expect(evaluarMano(jugadas).tipo).toBe('cartaAlta');
    jugadas[4] = { ...jugadas[4]!, comodin: true };
    expect(evaluarMano(jugadas).tipo).toBe('color');
  });
});

describe('infrecuentes', () => {
  it('Cuenta atrás: −1 mano, ×1,5 multi', () => {
    expect(crearCombate(crearAleatorio(1), { objetivo: 100, mazo: crearMazo(), baratijas: ['cuenta-atras'] }).manosRestantes).toBe(3);
    expect(con(['cuenta-atras'], cartas('picas-5', 'corazones-5')).multi).toBe(3);
  });

  it('Reciclaje: las descartadas vuelven al fondo del mazo', () => {
    const combate = crearCombate(crearAleatorio(1), { objetivo: 100, mazo: crearMazo(), baratijas: ['reciclaje'] });
    const id = combate.mano[0]!.id;
    const despues = descartar(combate, [id]);
    expect(despues.pila.at(-1)!.id).toBe(id);
    expect(despues.pila.length + despues.mano.length).toBe(52);
  });

  it('Eco: la última carta que puntúa puntúa dos veces', () => {
    expect(con(['eco'], cartas('picas-9', 'corazones-9')).fichas).toBe(sin(cartas('picas-9', 'corazones-9')).fichas + 9);
  });

  it('Gemelos: la segunda carta del par puntúa dos veces', () => {
    const par = cartas('picas-9', 'corazones-9');
    expect(con(['gemelos'], par).fichas).toBe(sin(par).fichas + 9);
    expect(con(['gemelos'], cartas('picas-9')).fichas).toBe(sin(cartas('picas-9')).fichas);
    expect(con(['gemelos', 'eco'], par).fichas).toBe(sin(par).fichas + 18);
  });

  it('Doble filo: las cartas con +fichas también dan +1 multi', () => {
    const conFichas: Carta = { ...carta('picas-9'), modificaciones: { fichas: 1 } };
    expect(con(['doble-filo'], [conFichas]).multi).toBe(sin([conFichas]).multi + 1);
    expect(con(['doble-filo'], cartas('picas-9')).multi).toBe(1);
  });

  it('Monocromo: todas del mismo color, +4 multi', () => {
    expect(con(['monocromo'], cartas('picas-9', 'treboles-2')).multi).toBe(5);
    expect(con(['monocromo'], cartas('picas-9', 'corazones-2')).multi).toBe(1);
  });

  it('Escalera corta y Puente cambian la mano que se juega', () => {
    const cuatro = cartas('picas-5', 'corazones-6', 'treboles-7', 'picas-8');
    expect(con(['escalera-corta'], cuatro).tipo).toBe('escalera');
    expect(con(['puente'], cartas('picas-3', 'corazones-4', 'treboles-6', 'picas-7', 'diamantes-8')).tipo).toBe('escalera');
  });

  it('Arqueólogo: del 2 al 5 dan el doble de fichas', () => {
    expect(con(['arqueologo'], cartas('picas-4')).fichas).toBe(sin(cartas('picas-4')).fichas + 4);
    expect(con(['arqueologo'], cartas('picas-6')).fichas).toBe(sin(cartas('picas-6')).fichas);
  });

  it('Inversión: −50 al perder, +150 − 50 al ganar', () => {
    const partida = partidaEn('combate', ['inversion']);
    expect(resolverCombate(partida, true).oro).toBe(300 + 100 + 100);
    expect(resolverCombate(partida, false).oro).toBe(300 - 100 - 50);
  });

  it('Vista de lince: 9 cartas en la mano', () => {
    const combate = crearCombate(crearAleatorio(1), { objetivo: 99_999, mazo: crearMazo(), baratijas: ['vista-de-lince'] });
    expect(combate.mano).toHaveLength(9);
    expect(jugar(combate, [combate.mano[0]!.id]).mano).toHaveLength(9);
  });

  it('Descuento de veterano: riesgo × 5 % menos, hasta 50 %', () => {
    const tienda = partidaEn('tienda', ['descuento-de-veterano'], 1000);
    const lejos = { ...tienda, riesgoBase: 20 };
    expect(costoDeCarta(lejos)).toBe(Math.round(costoDeCarta({ ...lejos, baratijas: [] }) * 0.5));
  });

  it('Seguro: la primera derrota de cada mundo no cuesta oro', () => {
    const partida = partidaEn('combate', ['seguro']);
    const primera = resolverCombate(partida, false);
    expect(primera.oro).toBe(300);
    expect(resolverCombate({ ...primera, combatePendiente: true }, false).oro).toBe(200);
    expect(resolverCombate({ ...primera, mundo: 2, combatePendiente: true }, false).oro).toBe(300);
  });

  it('Precisión: ganar por menos de 10 % sobre el objetivo da +100', () => {
    const mazo = cartas('picas-9', 'corazones-9', 'treboles-2', 'picas-3', 'picas-4', 'picas-6', 'picas-7', 'diamantes-12');
    const nueves = ['picas-9', 'corazones-9'];
    const total = puntuar(cartas(...nueves)).total; // (10 + 18) × 2 = 56
    const justo = crearCombate(crearAleatorio(1), { objetivo: total - 2, mazo, baratijas: ['precision'] });
    expect(jugar(justo, nueves).oroGanado).toBe(100);
    const sobrado = crearCombate(crearAleatorio(1), { objetivo: Math.floor(total / 2), mazo, baratijas: ['precision'] });
    expect(jugar(sobrado, nueves).oroGanado).toBe(0);
  });
});
