// Un combate, como una ciega de Balatro: hay que llegar a un puntaje
// objetivo con un número limitado de manos jugadas y de descartes. Todo es
// inmutable: cada acción devuelve un combate nuevo.

import { barajar, crearAleatorio, type Aleatorio } from './aleatorio.ts';
import { efectosDe, recordar, sumar, suerteDe, type Efectos, type Memoria, type Mesa } from './baratijas.ts';
import { PALOS, modificacionesDe, type Carta } from './cartas.ts';
import type { Niveles } from './manos.ts';
import { puntuar, type Puntuacion } from './puntuacion.ts';
import type { TipoNodo } from '../mapa/mapa.ts';

export const TAMANO_MANO = 8;
export const MAX_CARTAS_JUGADAS = 5;
// Precisión: gana el combate pasándose del objetivo por menos de esto.
export const MARGEN_DE_PRECISION = 0.1;

export interface Combate {
  objetivo: number;
  puntos: number;
  manosRestantes: number;
  descartesRestantes: number;
  mano: Carta[]; // las cartas que tiene el jugador
  pila: Carta[]; // las que quedan por robar
  estado: 'jugando' | 'ganado' | 'perdido';
  ultimaJugada: Puntuacion | null;
  baratijas: readonly string[]; // ids de las del jugador, que cambian la puntuación
  // El de la partida entero, que algunas baratijas miran (y el Vampiro
  // cambia: al terminar vuelve a la partida).
  mazo: readonly Carta[];
  niveles?: Partial<Niveles>; // los de las manos en la partida (sin dato, nivel 1)
  riesgo: number;
  mundo: number;
  tipo: TipoNodo; // 'combate', 'elite' o 'jefe'
  tamanoMano: number; // hasta cuántas cartas se roban
  manosJugadas: number;
  descartesUsados: number;
  descartesDesdeMano: number; // los hechos desde la última mano jugada
  faroles: number; // los que quedan en este combate (Faroleo)
  divinas: number; // las que quedan en este combate (Mano de Dios)
  oroInicial: number; // el de la partida al empezar
  oroGanado: number; // el que dieron las baratijas durante el combate
  semilla: number; // para las probabilidades de cada mano
  // La de las baratijas de la partida, con lo que recuerden de este
  // combate; al terminarlo vuelve a la partida (ver resolverCombate).
  memoria: Memoria;
}

export interface OpcionesCombate {
  objetivo: number;
  mazo: readonly Carta[]; // el de la partida; se baraja una copia
  manos?: number;
  descartes?: number;
  baratijas?: readonly string[]; // ids
  niveles?: Partial<Niveles>;
  riesgo?: number;
  mundo?: number;
  tipo?: TipoNodo;
  oro?: number;
  semilla?: number;
  memoria?: Memoria;
}

export function crearCombate(
  aleatorio: Aleatorio,
  { objetivo, mazo, manos = 4, descartes = 3, baratijas = [], niveles, riesgo = 0, mundo = 1, tipo = 'combate', oro = 0, semilla = 0, memoria = {} }: OpcionesCombate,
): Combate {
  const pila = barajar(mazo, aleatorio);
  const efectos = efectosDe(baratijas);
  const inicio = efectos.reduce((actual, e) => (e.alEmpezarCombate ? e.alEmpezarCombate(actual, tipo) : actual), { manos, descartes });
  const repartido = robar({
    objetivo,
    puntos: 0,
    // Siempre queda al menos una mano.
    manosRestantes: Math.max(1, inicio.manos),
    descartesRestantes: Math.max(0, inicio.descartes),
    mano: [],
    pila,
    estado: 'jugando',
    ultimaJugada: null,
    baratijas,
    mazo,
    niveles,
    riesgo,
    mundo,
    tipo,
    tamanoMano: TAMANO_MANO + sumar(efectos, 'cartasExtra'),
    manosJugadas: 0,
    descartesUsados: 0,
    descartesDesdeMano: 0,
    faroles: sumar(efectos, 'faroles'),
    divinas: sumar(efectos, 'divinas'),
    oroInicial: oro,
    oroGanado: 0,
    semilla,
    memoria,
  });
  // As bajo la manga: un As de picas de más, que no es del mazo.
  if (!efectos.some((e) => e.asExtra)) return repartido;
  return { ...repartido, mano: [...repartido.mano, { id: AS_EXTRA, palo: 'picas', rango: 14 }] };
}

export const AS_EXTRA = 'as-bajo-la-manga';

// Lo que ven las baratijas al jugar una mano.
export function mesaDelCombate(combate: Combate, efectos: readonly Efectos[] = efectosDe(combate.baratijas)): Mesa {
  return {
    mazo: combate.mazo,
    restantes: combate.pila.length,
    baratijas: combate.baratijas.length,
    propias: combate.baratijas,
    riesgo: combate.riesgo,
    mundo: combate.mundo,
    manosJugadas: combate.manosJugadas,
    memoria: combate.memoria,
    oro: combate.oroInicial + combate.oroGanado,
    tipo: combate.tipo,
    manosRestantes: combate.manosRestantes,
    descartesPrevios: combate.descartesDesdeMano,
    azar: crearAleatorio(combate.semilla * 31 + combate.manosJugadas * 977 + combate.descartesUsados * 131 + 7),
    suerte: suerteDe(efectos),
  };
}

// Con `farol`, la mano puntúa como el tipo siguiente (si quedan faroles);
// con `divina`, como escalera de color (si quedan).
export function jugar(combate: Combate, ids: readonly string[], farol = false, divina = false): Combate {
  const cartas = elegidas(combate, ids, MAX_CARTAS_JUGADAS);
  if (combate.manosRestantes === 0) throw new Error('No quedan manos');
  if (farol && combate.faroles === 0) throw new Error('No quedan faroles');
  if (divina && combate.divinas === 0) throw new Error('No quedan manos de Dios');
  const efectos = efectosDe(combate.baratijas);
  const jugada = puntuar(cartas, efectos, mesaDelCombate(combate, efectos), combate.niveles, farol, divina);
  const modificadas = jugada.cartasQuePuntuan.filter((c) => modificacionesDe(c) > 0 && c.id !== AS_EXTRA);
  const memoria = recordar(combate.memoria, combate.baratijas, {
    tipo: 'mano',
    mano: jugada.tipo,
    total: jugada.total,
    objetivo: combate.objetivo,
    modificadas: modificadas.length,
  });
  // Vampiro: las modificadas que puntuaron quedan sin modificar en el mazo.
  const sinModificar = new Set(modificadas.map((c) => c.id));
  const mazo = efectos.some((e) => e.vampiro) && sinModificar.size > 0
    ? combate.mazo.map((c) => (sinModificar.has(c.id) ? { ...c, modificaciones: undefined } : c))
    : combate.mazo;
  const puntos = combate.puntos + jugada.total;
  const manosRestantes = combate.manosRestantes - 1;
  const estado = puntos >= combate.objetivo ? 'ganado' : manosRestantes === 0 ? 'perdido' : 'jugando';
  // Precisión: ganar pasándose del objetivo por poco.
  const preciso = estado === 'ganado' && combate.tipo !== 'jefe' && puntos < combate.objetivo * (1 + MARGEN_DE_PRECISION);
  const oroGanado = combate.oroGanado + jugada.oro + (preciso ? sumar(efectos, 'precision') : 0);
  return robar({
    ...combate,
    ...sinCartas(combate, ids),
    mazo,
    puntos,
    manosRestantes,
    estado,
    ultimaJugada: jugada,
    manosJugadas: combate.manosJugadas + 1,
    descartesDesdeMano: 0,
    faroles: combate.faroles - (farol ? 1 : 0),
    divinas: combate.divinas - (divina ? 1 : 0),
    oroGanado,
    memoria,
  });
}

// Con Reciclaje, las descartadas vuelven al fondo de la pila.
export function descartar(combate: Combate, ids: readonly string[]): Combate {
  const cartas = elegidas(combate, ids, MAX_CARTAS_JUGADAS);
  if (combate.descartesRestantes === 0) throw new Error('No quedan descartes');
  const reciclaje = efectosDe(combate.baratijas).some((e) => e.reciclaje);
  const pila = reciclaje ? [...combate.pila, ...cartas.filter((c) => c.id !== AS_EXTRA)] : combate.pila;
  return robar({
    ...combate,
    ...sinCartas(combate, ids),
    pila,
    descartesRestantes: combate.descartesRestantes - 1,
    descartesUsados: combate.descartesUsados + 1,
    descartesDesdeMano: combate.descartesDesdeMano + 1,
  });
}

function elegidas(combate: Combate, ids: readonly string[], maximo: number): Carta[] {
  if (combate.estado !== 'jugando') throw new Error('El combate ya terminó');
  if (ids.length === 0 || ids.length > maximo) throw new Error(`Hay que elegir de 1 a ${maximo} cartas`);
  return ids.map((id) => {
    const carta = combate.mano.find((c) => c.id === id);
    if (!carta) throw new Error(`La carta ${id} no está en la mano`);
    return carta;
  });
}

function sinCartas(combate: Combate, ids: readonly string[]): Pick<Combate, 'mano'> {
  return { mano: combate.mano.filter((c) => !ids.includes(c.id)) };
}

// Completa la mano desde la pila, hasta tamanoMano o hasta que se acabe.
// Con el Imán, la primera que se roba es del palo que más hay en la mano.
function robar(combate: Combate): Combate {
  const faltan = Math.max(0, combate.tamanoMano - combate.mano.length);
  let pila = combate.pila;
  if (faltan > 0 && combate.mano.length > 0 && efectosDe(combate.baratijas).some((e) => e.iman)) {
    const cuantas = (palo: string) => combate.mano.filter((c) => c.palo === palo).length;
    const palo = [...PALOS].sort((a, b) => cuantas(b) - cuantas(a))[0]!;
    const i = pila.findIndex((c) => c.palo === palo);
    if (i > 0) pila = [pila[i]!, ...pila.slice(0, i), ...pila.slice(i + 1)];
  }
  return { ...combate, mano: [...combate.mano, ...pila.slice(0, faltan)], pila: pila.slice(faltan) };
}
