// Las baratijas: objetos que el jugador junta durante la partida y que
// cambian las reglas. Se consiguen eligiendo 1 de 3 al vencer a un élite,
// o comprándolas con oro en el nodo del vendedor de baratijas.
//
// Para agregar una baratija nueva basta con sumarla a CATALOGO: un id
// único, nombre, descripción, rareza (que fija el precio) y los efectos
// que use. Cada efecto es
// opcional y recibe el valor de antes para devolver el de después:
//
//   alEmpezarCombate  manos y descartes con los que empieza cada combate
//   alContarCarta     las fichas que suma cada carta que puntúa (recibe
//                     también la carta)
//   alPuntuar         fichas y multiplicador de cada mano jugada
//   alGanarCombate    el oro que da un combate ganado
//   alPerderCombate   el oro que quita un combate perdido
//   alSortearRareza   la probabilidad de cada rareza al ofrecer baratijas
//
// Si hace falta que una baratija toque algo más, se agrega aquí un efecto
// nuevo y se llama desde la regla correspondiente.

import { barajar, type Aleatorio } from './aleatorio.ts';
import type { Carta, Palo } from './cartas.ts';
import type { TipoMano } from './manos.ts';

export interface InicioDeCombate {
  manos: number;
  descartes: number;
}

export type Rareza = 'comun' | 'infrecuente' | 'rara' | 'legendaria';
export const RAREZAS: readonly Rareza[] = ['comun', 'infrecuente', 'rara', 'legendaria'];

export const DATOS_RAREZA: Record<Rareza, { nombre: string; precio: number }> = {
  comun: { nombre: 'Común', precio: 200 },
  infrecuente: { nombre: 'Infrecuente', precio: 300 },
  rara: { nombre: 'Rara', precio: 500 },
  legendaria: { nombre: 'Legendaria', precio: 1000 },
};

// Probabilidad de cada rareza en cada lugar de una oferta (cada lugar
// sortea la suya). Común es lo que queda hasta 1. La partida guarda las
// suyas para que eventos o baratijas puedan cambiarlas.
export type Probabilidades = Record<Exclude<Rareza, 'comun'>, number>;
export const PROBABILIDADES_INICIALES: Probabilidades = { infrecuente: 0.25, rara: 0.1, legendaria: 0.05 };

export function probabilidadComun(probabilidades: Probabilidades): number {
  return Math.max(0, 1 - probabilidades.infrecuente - probabilidades.rara - probabilidades.legendaria);
}

export interface ManoPuntuada {
  tipo: TipoMano;
  cartasJugadas: readonly Carta[];
  cartasQuePuntuan: readonly Carta[];
  fichas: number;
  multi: number;
}

export interface Baratija {
  id: string;
  nombre: string;
  descripcion: string;
  rareza: Rareza;
  icono: string; // un símbolo o emoji para dibujarla
  alEmpezarCombate?(inicio: InicioDeCombate): InicioDeCombate;
  alContarCarta?(fichas: number, carta: Carta): number;
  alPuntuar?(mano: ManoPuntuada): ManoPuntuada;
  alGanarCombate?(oro: number): number;
  alPerderCombate?(oro: number): number;
  alSortearRareza?(probabilidades: Probabilidades): Probabilidades;
}

// Las fichas de las cartas de un palo ×1,5 y las de otro a la mitad,
// redondeando.
function cambiarPalos(sube: Palo, baja: Palo): (fichas: number, carta: Carta) => number {
  return (fichas, carta) => (carta.palo === sube ? Math.round(fichas * 1.5) : carta.palo === baja ? Math.round(fichas / 2) : fichas);
}

export const CATALOGO: readonly Baratija[] = [
  {
    id: 'materialista',
    nombre: 'Materialista',
    descripcion: 'Las cartas de ♥ valen la mitad de fichas y las de ♦, 1,5 veces más.',
    rareza: 'comun',
    icono: '💰',
    alContarCarta: cambiarPalos('diamantes', 'corazones'),
  },
  {
    id: 'altruista',
    nombre: 'Altruista',
    descripcion: 'Las cartas de ♦ valen la mitad de fichas y las de ♥, 1,5 veces más.',
    rareza: 'comun',
    icono: '💝',
    alContarCarta: cambiarPalos('corazones', 'diamantes'),
  },
  {
    id: 'flower-power',
    nombre: 'Flower power',
    descripcion: 'Las cartas de ♠ valen la mitad de fichas y las de ♣, 1,5 veces más.',
    rareza: 'comun',
    icono: '🌸',
    alContarCarta: cambiarPalos('treboles', 'picas'),
  },
  {
    id: 'grass-mower',
    nombre: 'Grass mower',
    descripcion: 'Las cartas de ♣ valen la mitad de fichas y las de ♠, 1,5 veces más.',
    rareza: 'comun',
    icono: '🚜',
    alContarCarta: cambiarPalos('picas', 'treboles'),
  },
  {
    id: 'subsidio',
    nombre: 'Subsidio',
    descripcion: '+50 de oro en cada combate, ganado o perdido.',
    rareza: 'comun',
    icono: '🏛',
    alGanarCombate: (oro) => oro + 50,
    alPerderCombate: (oro) => oro - 50,
  },
  {
    id: 'diversidad',
    nombre: 'Diversidad',
    descripcion: 'Multiplica por 4 el multiplicador si la mano jugada tiene al menos una carta de cada palo.',
    rareza: 'rara',
    icono: '🎨',
    alPuntuar: (mano) => (new Set(mano.cartasJugadas.map((c) => c.palo)).size === 4 ? { ...mano, multi: mano.multi * 4 } : mano),
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

export function precioDe(baratija: Baratija): number {
  return DATOS_RAREZA[baratija.rareza].precio;
}

export function sortearRareza(aleatorio: Aleatorio, probabilidades: Probabilidades): Rareza {
  const tirada = aleatorio();
  if (tirada < probabilidades.legendaria) return 'legendaria';
  if (tirada < probabilidades.legendaria + probabilidades.rara) return 'rara';
  if (tirada < probabilidades.legendaria + probabilidades.rara + probabilidades.infrecuente) return 'infrecuente';
  return 'comun';
}

// Hasta `cuantas` baratijas que el jugador todavía no tiene, sin repetir.
// Cada lugar sortea su rareza; si no queda ninguna libre de esa rareza,
// se busca en las de abajo y después en las de arriba.
export function sortearBaratijas(
  aleatorio: Aleatorio,
  tiene: readonly string[],
  probabilidades: Probabilidades = PROBABILIDADES_INICIALES,
  cuantas = BARATIJAS_POR_OFERTA,
): string[] {
  const elegidas: string[] = [];
  for (let lugar = 0; lugar < cuantas; lugar++) {
    const rareza = RAREZAS.indexOf(sortearRareza(aleatorio, probabilidades));
    const orden = [...RAREZAS.slice(0, rareza + 1).reverse(), ...RAREZAS.slice(rareza + 1)];
    for (const buscada of orden) {
      const libres = CATALOGO.filter((b) => b.rareza === buscada && !tiene.includes(b.id) && !elegidas.includes(b.id));
      if (libres.length > 0) {
        elegidas.push(barajar(libres, aleatorio)[0]!.id);
        break;
      }
    }
  }
  return elegidas;
}

// Las fichas que suma una carta que puntúa, con lo que cambien las baratijas.
export function fichasConBaratijas(fichas: number, carta: Carta, baratijas: readonly Baratija[]): number {
  return baratijas.reduce((actual, b) => (b.alContarCarta ? b.alContarCarta(actual, carta) : actual), fichas);
}

// Aplica en orden el efecto `efecto` de cada baratija que lo tenga.
export function aplicar<E extends 'alEmpezarCombate' | 'alPuntuar' | 'alGanarCombate' | 'alPerderCombate' | 'alSortearRareza'>(
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
