// Las baratijas: objetos que el jugador junta durante la partida y que
// cambian las reglas. Se consiguen eligiendo 1 de 3 al vencer a un élite,
// o comprándolas con oro en el nodo del vendedor de baratijas.
//
// Para agregar una baratija nueva basta con sumarla a CATALOGO: un id
// único, nombre, descripción, precio y los efectos que use. Cada efecto es
// opcional y recibe el valor de antes para devolver el de después:
//
//   alEmpezarCombate  manos y descartes con los que empieza cada combate
//   alContarCarta     las fichas que suma cada carta que puntúa (recibe
//                     también la carta)
//   alPuntuar         fichas y multiplicador de cada mano jugada
//   alGanarCombate    el oro que da un combate ganado
//
// Si hace falta que una baratija toque algo más, se agrega aquí un efecto
// nuevo y se llama desde la regla correspondiente.

import { barajar, type Aleatorio } from './aleatorio.ts';
import type { Carta } from './cartas.ts';
import type { TipoMano } from './manos.ts';

export interface InicioDeCombate {
  manos: number;
  descartes: number;
}

export interface ManoPuntuada {
  tipo: TipoMano;
  cartasQuePuntuan: readonly Carta[];
  fichas: number;
  multi: number;
}

export interface Baratija {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number; // en oro, en el vendedor
  icono: string; // un símbolo o emoji para dibujarla
  alEmpezarCombate?(inicio: InicioDeCombate): InicioDeCombate;
  alContarCarta?(fichas: number, carta: Carta): number;
  alPuntuar?(mano: ManoPuntuada): ManoPuntuada;
  alGanarCombate?(oro: number): number;
}

export const CATALOGO: readonly Baratija[] = [
  {
    id: 'materialista',
    nombre: 'Materialista',
    descripcion: 'Las cartas de ♥ valen la mitad de fichas y las de ♦, 1,5 veces más.',
    precio: 150,
    icono: '💰',
    alContarCarta: (fichas, carta) =>
      carta.palo === 'corazones' ? Math.round(fichas / 2) : carta.palo === 'diamantes' ? Math.round(fichas * 1.5) : fichas,
  },
];

export const BARATIJAS_POR_OFERTA = 3;

export function buscarBaratija(id: string): Baratija {
  const baratija = CATALOGO.find((b) => b.id === id);
  if (!baratija) throw new Error(`No hay ninguna baratija ${id}`);
  return baratija;
}

// Las baratijas de una lista de ids, sin las que ya no existan en el
// catálogo (por ejemplo, de una partida guardada antes de quitarla).
export function baratijasDe(ids: readonly string[]): Baratija[] {
  return ids.flatMap((id) => CATALOGO.filter((b) => b.id === id));
}

// Hasta `cuantas` baratijas al azar que el jugador todavía no tiene.
export function sortearBaratijas(aleatorio: Aleatorio, tiene: readonly string[], cuantas = BARATIJAS_POR_OFERTA): string[] {
  const libres = CATALOGO.filter((b) => !tiene.includes(b.id)).map((b) => b.id);
  return barajar(libres, aleatorio).slice(0, cuantas);
}

// Las fichas que suma una carta que puntúa, con lo que cambien las baratijas.
export function fichasConBaratijas(fichas: number, carta: Carta, baratijas: readonly Baratija[]): number {
  return baratijas.reduce((actual, b) => (b.alContarCarta ? b.alContarCarta(actual, carta) : actual), fichas);
}

// Aplica en orden el efecto `efecto` de cada baratija que lo tenga.
export function aplicar<E extends 'alEmpezarCombate' | 'alPuntuar' | 'alGanarCombate'>(
  baratijas: readonly Baratija[],
  efecto: E,
  valor: Parameters<NonNullable<Baratija[E]>>[0],
): Parameters<NonNullable<Baratija[E]>>[0] {
  type Valor = Parameters<NonNullable<Baratija[E]>>[0];
  return baratijas.reduce<Valor>((actual, b) => {
    const funcion = b[efecto] as ((v: Valor) => Valor) | undefined;
    return funcion ? funcion(actual) : actual;
  }, valor);
}
