// Las baratijas: objetos que el jugador junta durante la partida y que
// cambian las reglas. Se consiguen eligiendo 1 de 3 al vencer a un élite,
// o comprándolas con oro en el nodo del vendedor de baratijas.
//
// Para agregar una baratija nueva basta con sumarla a CATALOGO: un id
// único, nombre, descripción, precio y los efectos que use. Cada efecto es
// opcional y recibe el valor de antes para devolver el de después:
//
//   alEmpezarCombate  manos y descartes con los que empieza cada combate
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
  alPuntuar?(mano: ManoPuntuada): ManoPuntuada;
  alGanarCombate?(oro: number): number;
}

// Unas pocas de ejemplo, una por cada efecto, para que la recompensa del
// élite y el vendedor tengan qué mostrar. Se pueden cambiar o quitar.
export const CATALOGO: readonly Baratija[] = [
  {
    id: 'dado-cargado',
    nombre: 'Dado cargado',
    descripcion: '+4 de multiplicador en cada mano.',
    precio: 150,
    icono: '🎲',
    alPuntuar: (mano) => ({ ...mano, multi: mano.multi + 4 }),
  },
  {
    id: 'ficha-de-casino',
    nombre: 'Ficha de casino',
    descripcion: '+30 fichas en cada mano.',
    precio: 120,
    icono: '🪙',
    alPuntuar: (mano) => ({ ...mano, fichas: mano.fichas + 30 }),
  },
  {
    id: 'corazon-de-cristal',
    nombre: 'Corazón de cristal',
    descripcion: '+3 de multiplicador por cada ♥ que puntúa.',
    precio: 140,
    icono: '💎',
    alPuntuar: (mano) => ({
      ...mano,
      multi: mano.multi + 3 * mano.cartasQuePuntuan.filter((c) => c.palo === 'corazones').length,
    }),
  },
  {
    id: 'guante-de-mago',
    nombre: 'Guante de mago',
    descripcion: '+1 mano en cada combate.',
    precio: 200,
    icono: '🧤',
    alEmpezarCombate: (inicio) => ({ ...inicio, manos: inicio.manos + 1 }),
  },
  {
    id: 'papelera',
    nombre: 'Papelera',
    descripcion: '+1 descarte en cada combate.',
    precio: 130,
    icono: '🗑',
    alEmpezarCombate: (inicio) => ({ ...inicio, descartes: inicio.descartes + 1 }),
  },
  {
    id: 'alcancia',
    nombre: 'Alcancía',
    descripcion: '+50 de oro al ganar un combate.',
    precio: 160,
    icono: '🐷',
    alGanarCombate: (oro) => oro + 50,
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
