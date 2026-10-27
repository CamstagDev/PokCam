import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { efectosDe, type Mesa } from '../src/juego/baratijas.ts';
import { crearMazo, type Carta } from '../src/juego/cartas.ts';
import { crearCombate, descartar, jugar } from '../src/juego/combate.ts';
import {
  avanzar,
  comprarCarta,
  costoDeCarta,
  crearPartida,
  elegirBaratija,
  precioDeBaratija,
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

function partidaEn(tipo: 'combate' | 'elite' | 'tienda' | 'vendedor', baratijas: string[] = [], oro = 300): Partida {
  const partida = crearPartida(7);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = tipo;
  return { ...avanzar({ ...partida, baratijas }, destino.id), oro };
}

const eventos = (p: Partida) => p.mapa.pisos.flat().filter((n) => n.tipo === 'evento').length;

describe('comunes', () => {
  it('Mano de hierro: +1 mano, −1 descarte', () => {
    expect(crearCombate(crearAleatorio(1), { objetivo: 100, mazo: crearMazo(), baratijas: ['mano-de-hierro'] })).toMatchObject({
      manosRestantes: 5,
      descartesRestantes: 2,
    });
  });

  it('Calcetín de la suerte: los 7 dan +5 fichas', () => {
    expect(con(['calcetin-de-la-suerte'], cartas('picas-7')).fichas).toBe(sin(cartas('picas-7')).fichas + 5);
    expect(con(['calcetin-de-la-suerte'], cartas('picas-8')).fichas).toBe(sin(cartas('picas-8')).fichas);
  });

  it('Parejita, A la tercera, Escalera de mano, Brocha gorda y Casa llena: según la mano', () => {
    const par = cartas('picas-5', 'corazones-5');
    const trio = cartas('picas-5', 'corazones-5', 'treboles-5');
    const escalera = cartas('picas-5', 'corazones-6', 'treboles-7', 'picas-8', 'diamantes-9');
    const color = cartas('picas-2', 'picas-5', 'picas-7', 'picas-9', 'picas-12');
    const full = cartas('picas-5', 'corazones-5', 'treboles-5', 'picas-9', 'diamantes-9');
    expect(con(['parejita'], par).multi).toBe(sin(par).multi + 2);
    expect(con(['parejita'], trio).multi).toBe(sin(trio).multi);
    expect(con(['a-la-tercera-va-la-vencida'], trio).fichas).toBe(sin(trio).fichas + 20);
    expect(con(['escalera-de-mano'], escalera).multi).toBe(sin(escalera).multi + 3);
    expect(con(['brocha-gorda'], color).fichas).toBe(sin(color).fichas + 25);
    expect(con(['casa-llena'], full).multi).toBe(sin(full).multi + 3);
  });

  it('Solitario: una sola carta, ×3 multi', () => {
    expect(con(['solitario'], cartas('picas-5')).multi).toBe(3);
    expect(con(['solitario'], cartas('picas-5', 'corazones-9')).multi).toBe(1);
  });

  it('Calderilla: cada 2 que puntúa da 5 de oro', () => {
    expect(con(['calderilla'], cartas('picas-2', 'corazones-2')).oro).toBe(10);
    expect(con(['calderilla'], cartas('picas-2', 'corazones-9')).oro).toBe(0); // el 2 no puntúa
  });

  it('Propina: al ganar, 10 por cada mano que sobra', () => {
    const partida = partidaEn('combate', ['propina']);
    expect(resolverCombate(partida, true, { manosRestantes: 3 }).oro).toBe(300 + 100 + 30);
    expect(resolverCombate(partida, false, { manosRestantes: 0 }).oro).toBe(300 - 100);
  });

  it('Descarte rápido: cada descarte suma +2 fichas a la siguiente mano', () => {
    let combate = crearCombate(crearAleatorio(1), { objetivo: 99_999, mazo: crearMazo(), baratijas: ['descarte-rapido'] });
    const sinDescartes = jugar(combate, [combate.mano[0]!.id]).ultimaJugada!;
    combate = descartar(combate, [combate.mano[1]!.id]);
    combate = descartar(combate, [combate.mano[1]!.id]);
    const conDos = jugar(combate, [combate.mano[0]!.id]);
    expect(conDos.ultimaJugada!.fichas - fichasDe(conDos.ultimaJugada!.cartasQuePuntuan)).toBe(sinDescartes.fichas - fichasDe(sinDescartes.cartasQuePuntuan) + 4);
    expect(conDos.descartesDesdeMano).toBe(0);
  });

  it('Cupón: la primera compra de cada tienda cuesta 25 % menos', () => {
    const tienda = partidaEn('tienda', ['cupon'], 1000);
    const primera = costoDeCarta(tienda);
    const despues = comprarCarta(tienda, tienda.oferta!.cartas![0]!.id);
    expect(costoDeCarta(despues)).toBe(Math.round(primera / 0.75));
    const vendedor = partidaEn('vendedor', ['cupon'], 1000);
    const id = vendedor.oferta!.baratijas[0]!;
    expect(precioDeBaratija(vendedor, id)).toBe(Math.round(precioDeBaratija({ ...vendedor, baratijas: [] }, id) * 0.75));
  });

  it('Mapa del tesoro: un evento más al conseguirlo y en cada mundo', () => {
    const elite = resolverCombate(partidaEn('elite'), true);
    const conMapa = elegirBaratija({ ...elite, oferta: { ...elite.oferta!, baratijas: ['mapa-del-tesoro'] } }, 'mapa-del-tesoro');
    expect(eventos(conMapa)).toBe(eventos(elite) + 1);
    const otro = siguienteMundo(conMapa);
    const sinMapa = siguienteMundo({ ...conMapa, baratijas: [] });
    expect(eventos(otro)).toBe(eventos(sinMapa) + 1);
  });
});

// Las fichas de las cartas (sin modificar), para separarlas de las de la mano.
function fichasDe(cartas: readonly Carta[]): number {
  return cartas.reduce((suma, c) => suma + (c.rango === 14 ? 11 : Math.min(c.rango, 10)), 0);
}
