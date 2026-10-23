// Un combate, como una ciega de Balatro: hay que llegar a un puntaje
// objetivo con un número limitado de manos jugadas y de descartes. Todo es
// inmutable: cada acción devuelve un combate nuevo.

import { barajar, type Aleatorio } from './aleatorio.ts';
import { aplicar, efectosDe, recordar, type Memoria } from './baratijas.ts';
import type { Carta } from './cartas.ts';
import type { Niveles } from './manos.ts';
import { puntuar, type Puntuacion } from './puntuacion.ts';

export const TAMANO_MANO = 8;
export const MAX_CARTAS_JUGADAS = 5;

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
  mazo: readonly Carta[]; // el de la partida entero, que algunas baratijas miran
  niveles?: Partial<Niveles>; // los de las manos en la partida (sin dato, nivel 1)
  riesgo: number;
  mundo: number;
  manosJugadas: number;
  faroles: number; // los que quedan en este combate (Faroleo)
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
  memoria?: Memoria;
}

export function crearCombate(
  aleatorio: Aleatorio,
  { objetivo, mazo, manos = 4, descartes = 3, baratijas = [], niveles, riesgo = 0, mundo = 1, memoria = {} }: OpcionesCombate,
): Combate {
  const pila = barajar(mazo, aleatorio);
  const efectos = efectosDe(baratijas);
  const inicio = aplicar(efectos, 'alEmpezarCombate', { manos, descartes });
  const repartido = robar({
    objetivo,
    puntos: 0,
    manosRestantes: inicio.manos,
    descartesRestantes: inicio.descartes,
    mano: [],
    pila,
    estado: 'jugando',
    ultimaJugada: null,
    baratijas,
    mazo,
    niveles,
    riesgo,
    mundo,
    manosJugadas: 0,
    faroles: efectos.reduce((suma, e) => suma + (e.faroles ?? 0), 0),
    memoria,
  });
  // As bajo la manga: un As de picas de más, que no es del mazo.
  if (!efectos.some((e) => e.asExtra)) return repartido;
  return { ...repartido, mano: [...repartido.mano, { id: AS_EXTRA, palo: 'picas', rango: 14 }] };
}

export const AS_EXTRA = 'as-bajo-la-manga';

// Con `farol`, la mano puntúa como el tipo siguiente (si quedan faroles).
export function jugar(combate: Combate, ids: readonly string[], farol = false): Combate {
  const cartas = elegidas(combate, ids, MAX_CARTAS_JUGADAS);
  if (combate.manosRestantes === 0) throw new Error('No quedan manos');
  if (farol && combate.faroles === 0) throw new Error('No quedan faroles');
  const mesa = {
    mazo: combate.mazo,
    restantes: combate.pila.length,
    baratijas: combate.baratijas.length,
    riesgo: combate.riesgo,
    mundo: combate.mundo,
    manosJugadas: combate.manosJugadas,
    memoria: combate.memoria,
  };
  const jugada = puntuar(cartas, efectosDe(combate.baratijas), mesa, combate.niveles, farol);
  const memoria = recordar(combate.memoria, combate.baratijas, { tipo: 'mano', mano: jugada.tipo, total: jugada.total, objetivo: combate.objetivo });
  const puntos = combate.puntos + jugada.total;
  const manosRestantes = combate.manosRestantes - 1;
  const estado = puntos >= combate.objetivo ? 'ganado' : manosRestantes === 0 ? 'perdido' : 'jugando';
  return robar({ ...combate, ...sinCartas(combate, ids), puntos, manosRestantes, estado, ultimaJugada: jugada, manosJugadas: combate.manosJugadas + 1, faroles: combate.faroles - (farol ? 1 : 0), memoria });
}

export function descartar(combate: Combate, ids: readonly string[]): Combate {
  elegidas(combate, ids, MAX_CARTAS_JUGADAS);
  if (combate.descartesRestantes === 0) throw new Error('No quedan descartes');
  return robar({ ...combate, ...sinCartas(combate, ids), descartesRestantes: combate.descartesRestantes - 1 });
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

// Completa la mano desde la pila, hasta TAMANO_MANO o hasta que se acabe.
function robar(combate: Combate): Combate {
  const faltan = Math.max(0, TAMANO_MANO - combate.mano.length);
  return { ...combate, mano: [...combate.mano, ...combate.pila.slice(0, faltan)], pila: combate.pila.slice(faltan) };
}
