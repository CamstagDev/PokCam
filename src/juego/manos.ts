// Qué mano de póker forman las cartas jugadas (de 1 a 5) y cuáles de ellas
// puntúan. Como en Balatro, se pueden jugar menos de 5 cartas: con 1 carta
// la mano es "carta alta".

import { PALOS, esDePalo, type Carta, type Rango } from './cartas.ts';

export type TipoMano =
  | 'cartaAlta'
  | 'par'
  | 'doblePar'
  | 'trio'
  | 'escalera'
  | 'color'
  | 'full'
  | 'poker'
  | 'escaleraColor';

export interface DatosMano {
  nombre: string;
  fichas: number; // fichas base de la mano
  multi: number; // multiplicador base
}

export const TIPOS_DE_MANO: readonly TipoMano[] = ['cartaAlta', 'par', 'doblePar', 'trio', 'escalera', 'color', 'full', 'poker', 'escaleraColor'];

// Valores en el nivel 1; cada nivel de más suma MEJORA_POR_NIVEL (ver
// datosDeMano). Los niveles de cada mano los guarda la partida.
export const MANOS: Record<TipoMano, DatosMano> = {
  cartaAlta: { nombre: 'Carta alta', fichas: 5, multi: 1 },
  par: { nombre: 'Par', fichas: 10, multi: 2 },
  doblePar: { nombre: 'Doble par', fichas: 20, multi: 2 },
  trio: { nombre: 'Trío', fichas: 30, multi: 3 },
  escalera: { nombre: 'Escalera', fichas: 30, multi: 4 },
  color: { nombre: 'Color', fichas: 35, multi: 4 },
  full: { nombre: 'Full', fichas: 40, multi: 4 },
  poker: { nombre: 'Póker', fichas: 60, multi: 7 },
  escaleraColor: { nombre: 'Escalera de color', fichas: 100, multi: 8 },
};

// Lo que suma cada nivel de una mano, como en Balatro.
export const MEJORA_POR_NIVEL: Record<TipoMano, { fichas: number; multi: number }> = {
  cartaAlta: { fichas: 10, multi: 1 },
  par: { fichas: 15, multi: 1 },
  doblePar: { fichas: 20, multi: 1 },
  trio: { fichas: 20, multi: 2 },
  escalera: { fichas: 30, multi: 3 },
  color: { fichas: 15, multi: 2 },
  full: { fichas: 25, multi: 2 },
  poker: { fichas: 30, multi: 3 },
  escaleraColor: { fichas: 40, multi: 4 },
};

export type Niveles = Record<TipoMano, number>;

export function nivelesIniciales(): Niveles {
  return Object.fromEntries(TIPOS_DE_MANO.map((tipo) => [tipo, 1])) as Niveles;
}

// Nombre, fichas y multiplicador de una mano en su nivel.
export function datosDeMano(tipo: TipoMano, nivel = 1): DatosMano {
  const { nombre, fichas, multi } = MANOS[tipo];
  const extra = Math.max(0, nivel - 1);
  return { nombre, fichas: fichas + extra * MEJORA_POR_NIVEL[tipo].fichas, multi: multi + extra * MEJORA_POR_NIVEL[tipo].multi };
}

export interface ManoEvaluada {
  tipo: TipoMano;
  cartasQuePuntuan: Carta[];
}

// Reglas que cambian las baratijas: escaleras y colores de 4 cartas
// (Escalera corta) y escaleras que se saltan un número (Puente).
export interface Reglas {
  corta?: boolean;
  puente?: boolean;
}

export function evaluarMano(cartas: readonly Carta[], reglas: Reglas = {}): ManoEvaluada {
  if (cartas.length === 0 || cartas.length > 5) {
    throw new Error(`Se juegan de 1 a 5 cartas (llegaron ${cartas.length})`);
  }

  // Grupos de cartas del mismo rango, los más grandes primero (y a igual
  // tamaño, el rango más alto).
  const porRango = new Map<Rango, Carta[]>();
  for (const carta of cartas) porRango.set(carta.rango, [...(porRango.get(carta.rango) ?? []), carta]);
  const grupos = [...porRango.values()].sort((a, b) => b.length - a.length || b[0]!.rango - a[0]!.rango);
  const tamanos = grupos.map((g) => g.length);

  const minimo = reglas.corta ? 4 : 5;
  const puente = reglas.puente === true;
  const color = buscarColor(cartas, minimo);
  const escalera = buscarEscalera(cartas, minimo, puente);
  const escaleraColor = PALOS.map((palo) => cartas.filter((c) => esDePalo(c, palo)))
    .filter((delPalo) => delPalo.length >= minimo)
    .map((delPalo) => buscarEscalera(delPalo, minimo, puente))
    .find((e) => e !== null);
  const todas = [...cartas];

  if (escaleraColor) return { tipo: 'escaleraColor', cartasQuePuntuan: escaleraColor };
  if (tamanos[0] === 4) return { tipo: 'poker', cartasQuePuntuan: grupos[0]! };
  if (tamanos[0] === 3 && tamanos[1] === 2) return { tipo: 'full', cartasQuePuntuan: todas };
  if (color) return { tipo: 'color', cartasQuePuntuan: color };
  if (escalera) return { tipo: 'escalera', cartasQuePuntuan: escalera };
  if (tamanos[0] === 3) return { tipo: 'trio', cartasQuePuntuan: grupos[0]! };
  if (tamanos[0] === 2 && tamanos[1] === 2) return { tipo: 'doblePar', cartasQuePuntuan: [...grupos[0]!, ...grupos[1]!] };
  if (tamanos[0] === 2) return { tipo: 'par', cartasQuePuntuan: grupos[0]! };
  return { tipo: 'cartaAlta', cartasQuePuntuan: [grupos[0]![0]!] };
}

// Las cartas del palo que más se repite (los comodines cuentan para
// todos), si son al menos `minimo`; en el orden en que se jugaron.
function buscarColor(cartas: readonly Carta[], minimo: number): Carta[] | null {
  const mejor = PALOS.map((palo) => cartas.filter((c) => esDePalo(c, palo))).sort((a, b) => b.length - a.length)[0]!;
  return mejor.length >= minimo ? mejor : null;
}

// La escalera más larga que se puede armar con las cartas (de rangos
// distintos y seguidos; el as también vale 1), si tiene al menos `minimo`.
// Con `puente`, puede saltarse un número una vez.
function buscarEscalera(cartas: readonly Carta[], minimo: number, puente: boolean): Carta[] | null {
  const porValor = new Map<number, Carta>();
  for (const carta of cartas) {
    if (!porValor.has(carta.rango)) porValor.set(carta.rango, carta);
    if (carta.rango === 14 && !porValor.has(1)) porValor.set(1, carta);
  }
  let mejor: number[] = [];
  const seguir = (cadena: number[], salto: boolean) => {
    if (cadena.length > mejor.length) mejor = cadena;
    const ultimo = cadena.at(-1)!;
    if (porValor.has(ultimo + 1)) seguir([...cadena, ultimo + 1], salto);
    if (puente && !salto && porValor.has(ultimo + 2)) seguir([...cadena, ultimo + 2], true);
  };
  for (const valor of porValor.keys()) seguir([valor], false);
  const elegidas = mejor.map((v) => porValor.get(v)!);
  // El as no puede estar dos veces (como 1 y como 14).
  return mejor.length >= minimo && new Set(elegidas).size === elegidas.length ? elegidas : null;
}
