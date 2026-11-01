// La partida contra un jefe: DUELOS duelos en los que se comparan los
// puntos que pone cada uno. El jugador juega sus manos (con sus descartes y
// sus baratijas, como en un combate) en el duelo abierto y decide cuándo
// cerrarlo para pasar al siguiente: puede poner varias manos en un duelo y
// ninguna en otro. El jefe juega en cada duelo las manos de su `reparto`,
// la mejor que pueda con sus cartas. Gana la partida quien gane más
// duelos; termina en cuanto uno ya no puede alcanzar al otro. Si al
// jugador se le acaban las manos, los duelos que faltan se cierran con 0.
// Todo es inmutable: cada acción devuelve un enfrentamiento nuevo.

import { barajar, type Aleatorio } from './aleatorio.ts';
import { efectosDe } from './baratijas.ts';
import { fichasDeCarta, type Carta } from './cartas.ts';
import { MAX_CARTAS_JUGADAS, TAMANO_MANO, cambiar, crearCombate, descartar, jugar, type Combate, type OpcionesCombate } from './combate.ts';
import { buscarJefe, nivelDelJefe, type Jefe } from './jefes.ts';
import { TIPOS_DE_MANO, type Niveles } from './manos.ts';
import { puntuar, type Puntuacion } from './puntuacion.ts';

export const DUELOS = 3;

export type Lado = 'jugador' | 'jefe';

export interface Duelo {
  jugador: number; // puntos
  jefe: number;
  manosDelJugador: number;
  jugadasDelJefe: { cartas: Carta[]; puntuacion: Puntuacion }[];
  ganador: Lado | null; // null mientras está abierto
  // Las cartas robadas para desempatar, de a una por lado (null: sin cartas).
  desempate: { jugador: Carta | null; jefe: Carta | null }[];
}

export interface Enfrentamiento {
  jefe: string; // id
  combate: Combate; // el lado del jugador: su mano, su pila, sus manos…
  manoDelJefe: Carta[];
  pilaDelJefe: Carta[];
  nivelesDelJefe: Partial<Niveles>;
  duelos: Duelo[]; // los ya empezados; el último es el abierto
  estado: 'jugando' | 'ganado' | 'perdido';
}

export function crearEnfrentamiento(aleatorio: Aleatorio, jefe: Jefe, opciones: Omit<OpcionesCombate, 'objetivo'>): Enfrentamiento {
  const combate = crearCombate(aleatorio, { ...opciones, tipo: 'jefe', objetivo: Infinity });
  const pila = barajar(jefe.mazo(), aleatorio);
  const nivel = nivelDelJefe(opciones.riesgo ?? 0);
  const inicio: Enfrentamiento = {
    jefe: jefe.id,
    combate,
    manoDelJefe: pila.slice(0, TAMANO_MANO),
    pilaDelJefe: pila.slice(TAMANO_MANO),
    nivelesDelJefe: Object.fromEntries(TIPOS_DE_MANO.map((t) => [t, nivel])),
    duelos: [],
    estado: 'jugando',
  };
  return empezarDuelo(inicio);
}

export function dueloAbierto(e: Enfrentamiento): Duelo {
  return e.duelos.at(-1)!;
}

export function duelosGanados(e: Enfrentamiento, lado: Lado): number {
  return e.duelos.filter((d) => d.ganador === lado).length;
}

// Las manos que el jefe juega en el duelo nuevo, cada una la mejor que
// puede armar, robando después de cada una.
function empezarDuelo(e: Enfrentamiento): Enfrentamiento {
  const jefe = buscarJefe(e.jefe);
  let mano = e.manoDelJefe;
  let pila = e.pilaDelJefe;
  const jugadas: Duelo['jugadasDelJefe'] = [];
  for (let i = 0; i < (jefe.reparto[e.duelos.length] ?? 0) && mano.length > 0; i++) {
    const cartas = mejorJugada(mano, e.nivelesDelJefe);
    jugadas.push({ cartas, puntuacion: puntuar(cartas, [], undefined, e.nivelesDelJefe) });
    const resto = mano.filter((c) => !cartas.includes(c));
    const faltan = TAMANO_MANO - resto.length;
    mano = [...resto, ...pila.slice(0, faltan)];
    pila = pila.slice(faltan);
  }
  const duelo: Duelo = {
    jugador: 0,
    jefe: jugadas.reduce((suma, j) => suma + j.puntuacion.total, 0),
    manosDelJugador: 0,
    jugadasDelJefe: jugadas,
    ganador: null,
    desempate: [],
  };
  return { ...e, manoDelJefe: mano, pilaDelJefe: pila, duelos: [...e.duelos, duelo] };
}

// De todas las formas de jugar de 1 a 5 cartas de la mano, la que más
// puntúa (sin baratijas).
export function mejorJugada(mano: readonly Carta[], niveles?: Partial<Niveles>): Carta[] {
  let mejor: Carta[] = [];
  let puntos = -1;
  const probar = (desde: number, elegidas: Carta[]) => {
    if (elegidas.length > 0) {
      const total = puntuar(elegidas, [], undefined, niveles).total;
      if (total > puntos) {
        mejor = elegidas;
        puntos = total;
      }
    }
    if (elegidas.length === MAX_CARTAS_JUGADAS) return;
    for (let i = desde; i < mano.length; i++) probar(i + 1, [...elegidas, mano[i]!]);
  };
  probar(0, []);
  return mejor;
}

function cambiarDuelo(e: Enfrentamiento, cambio: Partial<Duelo>): Enfrentamiento {
  return { ...e, duelos: [...e.duelos.slice(0, -1), { ...dueloAbierto(e), ...cambio }] };
}

// Juega una mano en el duelo abierto. Para Bola de nieve, el objetivo de
// la mano son los puntos del jefe en ese duelo.
export function jugarEnDuelo(e: Enfrentamiento, ids: readonly string[], farol = false, divina = false): Enfrentamiento {
  if (e.estado !== 'jugando') throw new Error('La partida contra el jefe ya terminó');
  const duelo = dueloAbierto(e);
  const jugado = jugar({ ...e.combate, objetivo: duelo.jefe, puntos: 0, estado: 'jugando' }, ids, farol, divina);
  const combate = { ...jugado, objetivo: Infinity, estado: 'jugando' as const };
  const siguiente = cambiarDuelo({ ...e, combate }, { jugador: duelo.jugador + jugado.ultimaJugada!.total, manosDelJugador: duelo.manosDelJugador + 1 });
  return combate.manosRestantes === 0 ? cerrarDuelo(siguiente) : siguiente;
}

export function descartarEnDuelo(e: Enfrentamiento, ids: readonly string[]): Enfrentamiento {
  if (e.estado !== 'jugando') throw new Error('La partida contra el jefe ya terminó');
  return { ...e, combate: descartar(e.combate, ids) };
}

export function cambiarEnDuelo(e: Enfrentamiento, id: string): Enfrentamiento {
  if (e.estado !== 'jugando') throw new Error('La partida contra el jefe ya terminó');
  return { ...e, combate: cambiar(e.combate, id) };
}

// Cierra el duelo abierto: gana quien puso más puntos; si empatan, se
// desempata (con la Corona del Tahúr, gana el jugador). Después empieza el siguiente, salvo que la partida ya esté
// decidida. Sin manos, los que faltan se cierran solos con 0.
export function cerrarDuelo(e: Enfrentamiento): Enfrentamiento {
  if (e.estado !== 'jugando') throw new Error('La partida contra el jefe ya terminó');
  const duelo = dueloAbierto(e);
  let cerrado: Enfrentamiento;
  if (duelo.jugador !== duelo.jefe) cerrado = cambiarDuelo(e, { ganador: duelo.jugador > duelo.jefe ? 'jugador' : 'jefe' });
  else if (efectosDe(e.combate.baratijas).some((b) => b.coronaDelTahur)) cerrado = cambiarDuelo(e, { ganador: 'jugador' });
  else cerrado = desempatar(e);

  const ganados = duelosGanados(cerrado, 'jugador');
  const perdidos = duelosGanados(cerrado, 'jefe');
  const quedan = DUELOS - cerrado.duelos.length;
  if (ganados > perdidos + quedan) return { ...cerrado, estado: 'ganado' };
  if (perdidos > ganados + quedan) return { ...cerrado, estado: 'perdido' };
  if (quedan === 0) return { ...cerrado, estado: ganados > perdidos ? 'ganado' : 'perdido' };
  const siguiente = empezarDuelo(cerrado);
  return siguiente.combate.manosRestantes === 0 ? cerrarDuelo(siguiente) : siguiente;
}

// Cada lado roba la siguiente carta de su mazo y gana la de más fichas;
// si empatan, otra vez. Sin cartas cuenta 0; si a los dos se les acaban,
// gana el jugador.
function desempatar(e: Enfrentamiento): Enfrentamiento {
  let pila = e.combate.pila;
  let pilaDelJefe = e.pilaDelJefe;
  const robadas: Duelo['desempate'] = [];
  for (;;) {
    const jugador = pila[0] ?? null;
    const jefe = pilaDelJefe[0] ?? null;
    pila = pila.slice(1);
    pilaDelJefe = pilaDelJefe.slice(1);
    robadas.push({ jugador, jefe });
    if (!jugador && !jefe) return terminarDesempate(e, pila, pilaDelJefe, robadas, 'jugador');
    const a = jugador ? fichasDeCarta(jugador) : 0;
    const b = jefe ? fichasDeCarta(jefe) : 0;
    if (a !== b) return terminarDesempate(e, pila, pilaDelJefe, robadas, a > b ? 'jugador' : 'jefe');
  }
}

function terminarDesempate(e: Enfrentamiento, pila: Carta[], pilaDelJefe: Carta[], desempate: Duelo['desempate'], ganador: Lado): Enfrentamiento {
  return cambiarDuelo({ ...e, combate: { ...e.combate, pila }, pilaDelJefe }, { ganador, desempate });
}
