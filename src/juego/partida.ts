// El estado de una partida: el mapa, por dónde va el jugador, su oro, su
// mazo y sus baratijas.

import { crearAleatorio } from './aleatorio.ts';
import {
  PROBABILIDADES_INICIALES,
  aplicar,
  baratijasDe,
  buscarBaratija,
  efectosDe,
  precioDe,
  sortearBaratijas,
  sortearDeRareza,
  type Probabilidades,
  type Transformacion,
  valorDeVenta,
} from './baratijas.ts';
import { crearMazo, type Carta } from './cartas.ts';
import { buscarNodo, generarMapa, type Mapa, type Nodo, type TipoNodo } from '../mapa/mapa.ts';

export const TIPOS_DE_COMBATE: readonly TipoNodo[] = ['combate', 'elite', 'jefe'];

export const ORO_INICIAL = 300;
// Lo que se gana al vencer un combate, y lo mismo se pierde al perderlo.
export const ORO_POR_COMBATE: Partial<Record<TipoNodo, number>> = { combate: 100, elite: 100, jefe: 100 };

// Puntos a alcanzar en cada tipo de combate con riesgo 0; cada nivel de
// riesgo suma OBJETIVO_POR_RIESGO.
export const OBJETIVO_BASE: Partial<Record<TipoNodo, number>> = { combate: 300, elite: 500, jefe: 800 };
export const OBJETIVO_POR_RIESGO = 100;

export interface Partida {
  mapa: Mapa;
  nodoActual: string;
  visitados: string[];
  // true desde que se elige un nodo de combate hasta ganarlo: al continuar
  // una partida guardada así, se vuelve a la mesa y no al mapa.
  combatePendiente: boolean;
  oro: number; // con 0 o menos la partida se termina
  // Las cartas del jugador, con lo que cada una tenga encima; cada combate
  // se juega con una copia barajada de este mazo.
  mazo: Carta[];
  baratijas: string[]; // ids, en el orden en que se consiguieron
  // Baratijas a la vista que el jugador todavía no resolvió: la recompensa
  // de un élite (elige 1) o lo que ofrece el vendedor. Se guarda para que
  // al continuar la partida se vuelva a la misma oferta.
  oferta: Oferta | null;
  // Las de cada rareza al ofrecer baratijas, sin contar lo que cambien las
  // baratijas (ver probabilidadesDeRareza).
  probabilidades: Probabilidades;
  // Una baratija recién conseguida que espera que el jugador elija un
  // número (de 1 a maximo) antes de seguir.
  eleccion: { baratija: string; maximo: number } | null;
  transformaciones: Transformacion[];
  // El oro apostado en el combate en curso; null mientras no se eligió. Se
  // guarda para que salir y volver al combate no permita cambiarla.
  apuesta: number | null;
  // Las baratijas apostadas junto con el oro (con el Tasador), por su
  // valor de venta.
  baratijasApostadas: string[];
}

export interface Oferta {
  tipo: 'elite' | 'vendedor';
  baratijas: string[]; // ids
  tiradas?: number; // las veces que se volvió a tirar el vendedor
}

export function crearPartida(semilla: number): Partida {
  const mapa = generarMapa(semilla);
  const inicio = mapa.pisos[0]![0]!;
  return { mapa, nodoActual: inicio.id, visitados: [inicio.id], combatePendiente: false, oro: ORO_INICIAL, mazo: crearMazo(), baratijas: [], oferta: null, probabilidades: PROBABILIDADES_INICIALES, eleccion: null, transformaciones: [], apuesta: null, baratijasApostadas: [] };
}

// Los nodos a los que se puede ir desde donde está el jugador.
export function nodosDisponibles(partida: Partida): Nodo[] {
  return buscarNodo(partida.mapa, partida.nodoActual).siguientes.map((id) => buscarNodo(partida.mapa, id));
}

export function avanzar(partida: Partida, id: string): Partida {
  if (partida.combatePendiente) throw new Error(`Falta ganar el combate de ${partida.nodoActual}`);
  if (partida.oferta) throw new Error('Falta cerrar la oferta de baratijas');
  if (partida.eleccion) throw new Error('Falta responder la elección de una baratija');
  if (!nodosDisponibles(partida).some((n) => n.id === id)) {
    throw new Error(`Desde ${partida.nodoActual} no se puede ir a ${id}`);
  }
  const tipo = buscarNodo(partida.mapa, id).tipo;
  const siguiente = { ...partida, oro: partida.oro - costoDelPaso(partida), nodoActual: id, visitados: [...partida.visitados, id], combatePendiente: TIPOS_DE_COMBATE.includes(tipo) };
  return tipo === 'vendedor' ? { ...siguiente, oferta: sortearOferta(siguiente, 'vendedor') } : siguiente;
}

// Suma o resta el oro del combate en curso y resuelve la apuesta. Un
// combate perdido también queda atrás, salvo el jefe: a ese hay que volver
// a enfrentarlo mientras quede oro.
export function resolverCombate(partida: Partida, gano: boolean): Partida {
  const nodo = nodoActual(partida);
  const oro = ORO_POR_COMBATE[nodo.tipo] ?? 0;
  const efectos = efectosDe(partida.baratijas);
  const combate = gano ? aplicar(efectos, 'alGanarCombate', oro) : -aplicar(efectos, 'alPerderCombate', oro);
  // Las baratijas apostadas cuentan como su valor de venta; al perder se
  // pierden ellas y el resto de lo perdido sale del oro.
  const apostadas = partida.baratijasApostadas;
  const enBaratijas = valorDeBaratijas(apostadas);
  const apostado = (partida.apuesta ?? 0) + enBaratijas;
  const apuesta = apostado === 0 ? 0 : aplicar(efectos, 'alResolverApuesta', gano ? apostado : -apostado) + (gano ? 0 : enBaratijas);
  const sinPerdidas = gano ? partida : quitarBaratijas(partida, apostadas);
  const resuelto = {
    ...sinPerdidas,
    oro: partida.oro + combate + apuesta,
    combatePendiente: !gano && nodo.tipo === 'jefe',
    apuesta: null,
    baratijasApostadas: [],
    ...avanzarTransformaciones(sinPerdidas),
  };
  // Vencer a un élite ofrece elegir 1 de 3 baratijas.
  if (gano && nodo.tipo === 'elite') {
    const baratijas = sortearOferta(resuelto, 'elite');
    if (baratijas.baratijas.length > 0) return { ...resuelto, oferta: baratijas };
  }
  return resuelto;
}

function valorDeBaratijas(ids: readonly string[]): number {
  return baratijasDe(ids).reduce((suma, b) => suma + valorDeVenta(b), 0);
}

// Sin esas baratijas, ni en las transformaciones pendientes.
function quitarBaratijas(partida: Partida, ids: readonly string[]): Partida {
  if (ids.length === 0) return partida;
  return {
    ...partida,
    baratijas: partida.baratijas.filter((id) => !ids.includes(id)),
    transformaciones: partida.transformaciones.map((t) => ({ ...t, ids: t.ids.filter((id) => !ids.includes(id)) })),
  };
}

// Cada combate descuenta uno a cada transformación; las que llegan a 0
// cambian sus baratijas (si el jugador todavía las tiene) por otras al azar.
function avanzarTransformaciones(partida: Partida): Pick<Partida, 'baratijas' | 'transformaciones'> {
  const aleatorio = crearAleatorio(partida.mapa.semilla * 17 + partida.visitados.length * 5 + partida.oro);
  let baratijas = [...partida.baratijas];
  const pendientes: Transformacion[] = [];
  for (const t of partida.transformaciones) {
    if (t.combatesRestantes > 1) {
      pendientes.push({ ...t, combatesRestantes: t.combatesRestantes - 1 });
      continue;
    }
    for (const id of t.ids) {
      if (!baratijas.includes(id)) continue;
      const nueva = sortearDeRareza(aleatorio, t.hacia, baratijas);
      if (nueva) baratijas = baratijas.map((b) => (b === id ? nueva : b));
    }
  }
  return { baratijas, transformaciones: pendientes };
}

// La semilla depende del nodo, del tipo de oferta y de las veces que se
// volvió a tirar, así que continuar la partida no cambia lo que se ofrece.
function sortearOferta(partida: Partida, tipo: Oferta['tipo'], tiradas = 0): Oferta {
  const aleatorio = crearAleatorio(partida.mapa.semilla * 31 + partida.visitados.length * 7 + (tipo === 'elite' ? 1 : 2) + tiradas * 101);
  const baratijas = sortearBaratijas(aleatorio, partida.baratijas, probabilidadesDeRareza(partida));
  return tiradas > 0 ? { tipo, baratijas, tiradas } : { tipo, baratijas };
}

// Las de la partida con lo que cambien sus baratijas.
export function probabilidadesDeRareza(partida: Partida): Probabilidades {
  return aplicar(efectosDe(partida.baratijas), 'alSortearRareza', partida.probabilidades);
}

// Lo que se gana por pasar la recompensa de un élite en vez de elegir.
export const ORO_POR_PASAR = 300;

// Elegir la recompensa del élite: se queda con esa y la oferta se cierra.
export function elegirBaratija(partida: Partida, id: string): Partida {
  if (partida.oferta?.tipo !== 'elite' || !partida.oferta.baratijas.includes(id)) {
    throw new Error(`${id} no está entre las baratijas a elegir`);
  }
  return conseguir({ ...partida, oferta: null }, id);
}

// Suma la baratija; si pide un número y hay de dónde elegir, la partida
// queda esperando la respuesta (ver responderEleccion).
function conseguir(partida: Partida, id: string): Partida {
  const baratijas = [...partida.baratijas, id];
  const pregunta = buscarBaratija(id).pregunta;
  const maximo = pregunta ? pregunta.maximo(baratijas) : 0;
  return { ...partida, baratijas, eleccion: maximo >= 1 ? { baratija: id, maximo } : null };
}

export function responderEleccion(partida: Partida, numero: number): Partida {
  const eleccion = partida.eleccion;
  if (!eleccion || !Number.isInteger(numero) || numero < 1 || numero > eleccion.maximo) {
    throw new Error(`No se puede elegir ${numero}`);
  }
  const efecto = buscarBaratija(eleccion.baratija).alElegirNumero;
  const aleatorio = crearAleatorio(partida.mapa.semilla * 13 + partida.visitados.length * 3 + numero);
  const cambio = efecto ? efecto({ baratijas: partida.baratijas, transformaciones: partida.transformaciones }, numero, aleatorio) : partida;
  return { ...partida, baratijas: cambio.baratijas, transformaciones: cambio.transformaciones, eleccion: null };
}

// Se puede comprar si está a la venta y pagarla no deja la partida en
// bancarrota.
export function puedeComprar(partida: Partida, id: string): boolean {
  if (partida.oferta?.tipo !== 'vendedor' || !partida.oferta.baratijas.includes(id)) return false;
  return !enBancarrota({ ...partida, oro: partida.oro - precioDe(buscarBaratija(id)) });
}

export function comprarBaratija(partida: Partida, id: string): Partida {
  if (!puedeComprar(partida, id)) throw new Error(`No se puede comprar ${id}`);
  const oferta = partida.oferta!;
  const pagada = {
    ...partida,
    oro: partida.oro - precioDe(buscarBaratija(id)),
    oferta: { ...oferta, baratijas: oferta.baratijas.filter((b) => b !== id) },
  };
  return conseguir(pagada, id);
}

// Venderle al vendedor una baratija propia, por la mitad de su precio.
export function venderBaratija(partida: Partida, id: string): Partida {
  if (partida.oferta?.tipo !== 'vendedor') throw new Error('Solo se vende en el vendedor');
  if (!partida.baratijas.includes(id)) throw new Error(`No tienes ${id}`);
  return { ...quitarBaratijas(partida, [id]), oro: partida.oro + valorDeVenta(buscarBaratija(id)) };
}

// Volver a tirar el vendedor: otras baratijas a la venta por 100 × (las
// baratijas que tiene el jugador + 1).
export const ORO_POR_TIRADA = 100;

export function costoDeTirada(partida: Partida): number {
  return ORO_POR_TIRADA * (partida.baratijas.length + 1);
}

export function puedeVolverATirar(partida: Partida): boolean {
  return partida.oferta?.tipo === 'vendedor' && !enBancarrota({ ...partida, oro: partida.oro - costoDeTirada(partida) });
}

export function volverATirar(partida: Partida): Partida {
  if (!puedeVolverATirar(partida)) throw new Error('No se puede volver a tirar');
  const pagada = { ...partida, oro: partida.oro - costoDeTirada(partida) };
  return { ...pagada, oferta: sortearOferta(pagada, 'vendedor', (partida.oferta!.tiradas ?? 0) + 1) };
}

// Pasar: irse del vendedor, o dejar la recompensa del élite a cambio de
// ORO_POR_PASAR.
export function cerrarOferta(partida: Partida): Partida {
  const oro = partida.oferta?.tipo === 'elite' ? ORO_POR_PASAR : 0;
  return { ...partida, oro: partida.oro + oro, oferta: null };
}

// Sin deuda permitida, la partida se pierde con 0 de oro o menos; con
// ella, al deber más que el límite.
export function enBancarrota(partida: Partida): boolean {
  return permiteDeuda(partida) ? partida.oro < -limiteDeDeuda(partida) : partida.oro <= 0;
}

export function permiteDeuda(partida: Partida): boolean {
  return efectosDe(partida.baratijas).some((b) => b.alLimitarDeuda);
}

export function limiteDeDeuda(partida: Partida): number {
  const riesgo = nivelDeRiesgo(partida);
  return efectosDe(partida.baratijas).reduce((limite, b) => (b.alLimitarDeuda ? b.alLimitarDeuda(limite, riesgo) : limite), 0);
}

// Lo que cuesta avanzar un nodo: nada, salvo en deuda con una baratija que
// cobre por moverse.
export function costoDelPaso(partida: Partida): number {
  if (partida.oro >= 0) return 0;
  const riesgo = nivelDeRiesgo(partida);
  return efectosDe(partida.baratijas).reduce(
    (costo, b) => (b.alMoverseEnDeuda ? b.alMoverseEnDeuda(costo, -partida.oro, riesgo) : costo),
    0,
  );
}

// Apuestas: al empezar cada combate se puede apostar oro, hasta la mitad
// del que se tiene (o lo que permitan las baratijas), y con el Tasador
// también baratijas, por su valor de venta. Ganar el combate suma lo
// apostado y perderlo lo resta (o lo que cambien los bonos de set).
export const FRACCION_APOSTABLE = 0.5;

export function maximoApostable(partida: Partida): number {
  const fraccion = aplicar(efectosDe(partida.baratijas), 'alLimitarApuesta', FRACCION_APOSTABLE);
  return Math.max(0, Math.floor(partida.oro * fraccion));
}

export function puedeApostarBaratijas(partida: Partida): boolean {
  return efectosDe(partida.baratijas).some((e) => e.apuestaBaratijas);
}

// Si hay algo que apostar: oro o, con el Tasador, alguna baratija.
export function hayQueApostar(partida: Partida): boolean {
  return maximoApostable(partida) > 0 || (puedeApostarBaratijas(partida) && partida.baratijas.length > 0);
}

export function apostar(partida: Partida, cantidad: number, baratijas: readonly string[] = []): Partida {
  if (!partida.combatePendiente) throw new Error('Solo se apuesta al empezar un combate');
  if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > maximoApostable(partida)) {
    throw new Error(`No se pueden apostar ${cantidad}`);
  }
  if (baratijas.length > 0) {
    if (!puedeApostarBaratijas(partida)) throw new Error('Sin el Tasador no se apuestan baratijas');
    if (new Set(baratijas).size !== baratijas.length || baratijas.some((id) => !partida.baratijas.includes(id))) {
      throw new Error('Solo se apuestan baratijas propias, una vez cada una');
    }
  }
  return { ...partida, apuesta: cantidad, baratijasApostadas: [...baratijas] };
}

// Todo lo apostado en el combate en curso, contando las baratijas.
export function totalApostado(partida: Partida): number {
  return (partida.apuesta ?? 0) + valorDeBaratijas(partida.baratijasApostadas);
}

// El nivel de riesgo es el piso en el que está el jugador (el inicio es el
// 0). Aquí se sumarán los modificadores de riesgo.
export function nivelDeRiesgo(partida: Partida): number {
  return nodoActual(partida).piso;
}

// Los puntos que pide el combate del nodo actual.
export function objetivoDelCombate(partida: Partida): number {
  const base = OBJETIVO_BASE[nodoActual(partida).tipo] ?? OBJETIVO_BASE.combate!;
  return base + OBJETIVO_POR_RIESGO * nivelDeRiesgo(partida);
}

export function nodoActual(partida: Partida): Nodo {
  return buscarNodo(partida.mapa, partida.nodoActual);
}
