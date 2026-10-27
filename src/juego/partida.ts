// El estado de una partida: el mapa, por dónde va el jugador, su oro, su
// mazo y sus baratijas.

import { barajar, crearAleatorio } from './aleatorio.ts';
import {
  CATALOGO,
  COSTO_SOBORNO,
  PROBABILIDADES_INICIALES,
  REBAJA_SOBORNO,
  probabilidadComun,
  aplicar,
  baratijasDe,
  buscarBaratija,
  efectosDe,
  manoMasJugada,
  recordar,
  precioDe,
  sortearBaratijas,
  sortearDeRareza,
  sumar,
  suerteDe,
  type Efectos,
  type Memoria,
  type Mesa,
  type Probabilidades,
  type ResumenDeCombate,
  type Suceso,
  type Transformacion,
  valorDeVenta,
} from './baratijas.ts';
import { MODIFICADORES, PALOS, RANGOS, crearMazo, modificacionesDe, modificar, type Carta, type Modificador, type Palo } from './cartas.ts';
import { jefeDelMundo } from './jefes.ts';
import { TIPOS_DE_MANO, nivelesIniciales, type Niveles, type TipoMano } from './manos.ts';
import { buscarNodo, generarMapa, type Mapa, type Nodo, type TipoNodo } from '../mapa/mapa.ts';

export const TIPOS_DE_COMBATE: readonly TipoNodo[] = ['combate', 'elite', 'jefe'];

export const ORO_INICIAL = 300;
// Lo que se gana al vencer un combate, y lo mismo se pierde al perderlo.
export const ORO_POR_COMBATE: Partial<Record<TipoNodo, number>> = { combate: 100, elite: 100, jefe: 100 };

// Puntos a alcanzar en cada tipo de combate con riesgo 0; cada nivel de
// riesgo suma OBJETIVO_POR_RIESGO.
export const OBJETIVO_BASE: Partial<Record<TipoNodo, number>> = { combate: 300, elite: 300, jefe: 800 };
// Por ahora los élites son combates comunes que se juegan con este riesgo de más.
export const RIESGO_EXTRA_ELITE = 3;
export const OBJETIVO_POR_RIESGO = 50;

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
  // El mundo en el que va (1, 2, …) y el riesgo que traen los mundos ya
  // vencidos: al vencer al jefe se empieza el siguiente mundo, con un mapa
  // nuevo, y el riesgo sigue subiendo desde el piso del jefe.
  mundo: number;
  riesgoBase: number;
  // Lo que encarece eliminar cartas para siempre: +1 por cada carta
  // eliminada después de la primera en una misma visita (ver costoDeEliminar).
  recargoEliminar: number;
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
  // Combates seguidos con el mismo resultado: +n ganados, −n perdidos.
  racha: number;
  niveles: Niveles; // el de cada mano de póker, desde 1
  cripto: Cripto; // con Crypto monedas
  // Lo que recuerda cada baratija, por su id (ver "Memoria" en baratijas.ts).
  memoria: Memoria;
  // Si se sobornó en el combate en curso (baja su objetivo).
  soborno: boolean;
}

// Con Crypto monedas, cada paso en el mapa deja una predicción (sube o
// baja) que se cumple PASOS_DE_PREDICCION pasos después.
export interface Prediccion {
  sube: boolean;
  pasos: number; // los que faltan para cumplirse
}

export interface Cripto {
  predicciones: Prediccion[];
  // La última que se cumplió, en qué paso (visitados.length) y cuánto oro movió.
  ultima: { sube: boolean; porcentaje: number; oro: number; paso: number } | null;
}

// La oferta del nodo en el que está el jugador, hasta que la cierre:
//   'elite'       elegir 1 de las baratijas de recompensa
//   'vendedor'    comprar, vender o volver a tirar baratijas
//   'eliminador'  la ruleta rusa y eliminar una carta (cada servicio una
//                 vez por visita; `usados` dice cuáles ya se usaron)
//   'manoNegra'   subir un nivel una de las `manos` (una vez por visita)
//   'tienda'      comprar las `cartas` que se quieran para el mazo
//   'pintor'      un solo servicio por visita: pintar la `cartaLibre`, poner
//                 el `modificador` en una de las `opciones` o (con Claire
//                 obscure) el personalizado
//   'evento'      un regalo (ver EVENTOS): elegir una de las `cartas` o ver
//                 la `cartaLibre` que se duplicó (sin ella, no hubo regalo)
export interface Oferta {
  tipo: 'elite' | 'vendedor' | 'eliminador' | 'manoNegra' | 'tienda' | 'pintor' | 'evento';
  evento?: Evento;
  baratijas: string[]; // ids
  tiradas?: number; // las veces que se volvió a tirar el vendedor
  usados?: Servicio[];
  eliminadas?: number; // cartas eliminadas en esta visita al eliminador
  manos?: TipoMano[];
  cartas?: Carta[];
  cartaLibre?: string; // id de una carta del mazo
  modificador?: Modificador;
  opciones?: string[]; // ids de cartas del mazo
  compras?: number; // las hechas en esta visita a una tienda (Cupón)
}

export type Servicio = 'ruleta' | 'eliminar' | 'mejorar' | 'pintura' | 'alquiler' | 'personalizado';

const OFERTA_DEL_SERVICIO: Record<Servicio, Oferta['tipo']> = {
  ruleta: 'eliminador',
  eliminar: 'eliminador',
  mejorar: 'manoNegra',
  pintura: 'pintor',
  alquiler: 'pintor',
  personalizado: 'pintor',
};

export function crearPartida(semilla: number): Partida {
  const mapa = generarMapa(semilla);
  const inicio = mapa.pisos[0]![0]!;
  return { mapa, nodoActual: inicio.id, visitados: [inicio.id], combatePendiente: false, oro: ORO_INICIAL, mazo: crearMazo(), baratijas: [], oferta: null, probabilidades: PROBABILIDADES_INICIALES, mundo: 1, riesgoBase: 0, recargoEliminar: 0, eleccion: null, transformaciones: [], apuesta: null, baratijasApostadas: [], racha: 0, niveles: nivelesIniciales(), cripto: { predicciones: [], ultima: null }, memoria: {}, soborno: false };
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
  const pagada = { ...partida, oro: partida.oro - costoDelPaso(partida), nodoActual: id, visitados: [...partida.visitados, id], combatePendiente: TIPOS_DE_COMBATE.includes(tipo) };
  const siguiente = renacer(moverCripto(pagada));
  if (tipo === 'vendedor') return { ...siguiente, oferta: sortearOferta(siguiente, 'vendedor') };
  if (tipo === 'eliminador') return { ...siguiente, oferta: { tipo: 'eliminador', baratijas: [], usados: [] } };
  if (tipo === 'tienda') return { ...siguiente, oferta: { tipo: 'tienda', baratijas: [], cartas: sortearCartas(siguiente) } };
  if (tipo === 'evento') return { ...siguiente, ...sortearEvento(siguiente) };
  if (tipo === 'pintor') return { ...siguiente, oferta: sortearPintor(siguiente) };
  if (tipo === 'manoNegra') return { ...siguiente, oferta: { tipo: 'manoNegra', baratijas: [], usados: [], manos: sortearManos(siguiente) } };
  return siguiente;
}

// Lo que deja un combate al terminar (todo opcional: sin combate, como si
// no hubiera pasado nada). Un Combate sirve tal cual.
export interface FinDeCombate {
  memoria?: Memoria; // con lo que las baratijas recordaron de sus manos
  oroGanado?: number;
  manosRestantes?: number;
  descartesRestantes?: number;
  descartesUsados?: number;
  manosJugadas?: number;
  mazo?: readonly Carta[]; // el de la partida, si el combate lo cambió (Vampiro)
}

// Lo que recuerdan las baratijas de "una vez por mundo": el mundo en que se usó.
function usadaEnElMundo(partida: Partida, memoria: Memoria, id: string): boolean {
  return memoria[id]?.mundo === partida.mundo;
}

function usarEnElMundo(partida: Partida, memoria: Memoria, id: string): Memoria {
  return { ...memoria, [id]: { ...memoria[id], mundo: partida.mundo } };
}

// Suma o resta el oro del combate en curso y resuelve la apuesta. Un
// combate perdido también queda atrás, salvo el jefe: a ese hay que volver
// a enfrentarlo mientras quede oro.
export function resolverCombate(partida: Partida, gano: boolean, fin: FinDeCombate = {}): Partida {
  const nodo = nodoActual(partida);
  const efectos = efectosDe(partida.baratijas);
  let memoria = fin.memoria ?? partida.memoria ?? {};
  const mazo = fin.mazo ? [...fin.mazo] : partida.mazo;
  const oroGanado = fin.oroGanado ?? 0;

  // Segunda oportunidad: el combate normal perdido se vuelve a jugar, sin
  // pagar nada (la apuesta y el soborno siguen en pie).
  if (!gano && nodo.tipo === 'combate' && efectos.some((e) => e.segundaOportunidad) && !usadaEnElMundo(partida, memoria, 'segunda-oportunidad')) {
    return { ...partida, mazo, oro: partida.oro + oroGanado, memoria: usarEnElMundo(partida, memoria, 'segunda-oportunidad'), combatePendiente: true };
  }

  const oro = ORO_POR_COMBATE[nodo.tipo] ?? 0;
  let combate = gano ? aplicar(efectos, 'alGanarCombate', oro) : -aplicar(efectos, 'alPerderCombate', oro);
  // Seguro: la primera derrota del mundo no cuesta oro.
  if (!gano && efectos.some((e) => e.seguro) && !usadaEnElMundo(partida, memoria, 'seguro')) {
    combate = Math.max(0, combate);
    memoria = usarEnElMundo(partida, memoria, 'seguro');
  }
  const resumen: ResumenDeCombate = {
    gano,
    tipo: nodo.tipo,
    manosRestantes: fin.manosRestantes ?? 0,
    descartesRestantes: fin.descartesRestantes ?? 0,
    descartesUsados: fin.descartesUsados ?? 0,
    manosJugadas: fin.manosJugadas ?? 0,
  };
  const alTerminar = efectos.reduce((suma, e) => suma + (e.alTerminarCombate ? e.alTerminarCombate(resumen) : 0), 0);
  // Las baratijas apostadas cuentan como su valor de venta; al perder se
  // pierden ellas y el resto de lo perdido sale del oro.
  const apostadas = partida.baratijasApostadas;
  const enBaratijas = valorDeBaratijas(apostadas);
  const apostado = (partida.apuesta ?? 0) + enBaratijas;
  const resultado = efectos.reduce(
    (actual, e) => (e.alResolverApuesta ? e.alResolverApuesta(actual, partida.racha) : actual),
    gano ? apostado : -apostado,
  );
  let apuesta = apostado === 0 ? 0 : resultado + (gano ? 0 : enBaratijas);
  // Ficha de la suerte: la primera apuesta perdida del mundo no cuesta oro.
  if (!gano && apuesta < 0 && efectos.some((e) => e.fichaDeLaSuerte) && !usadaEnElMundo(partida, memoria, 'ficha-de-la-suerte')) {
    apuesta = 0;
    memoria = usarEnElMundo(partida, memoria, 'ficha-de-la-suerte');
  }
  const sucesos: Suceso[] = [...(apostado > 0 ? [{ tipo: 'apuesta' as const, gano }] : []), { tipo: 'combate', gano, descartes: resumen.descartesRestantes }];
  const recordada = sucesos.reduce((m, suceso) => recordar(m, partida.baratijas, suceso), memoria);
  const conMemoria = { ...partida, mazo, memoria: recordada };
  const sinPerdidas = quitarBaratijas(conMemoria, [...(gano ? [] : apostadas), ...rotas(partida, efectos)]);
  const resuelto = {
    ...sinPerdidas,
    oro: partida.oro + combate + apuesta + oroGanado + alTerminar,
    combatePendiente: !gano && nodo.tipo === 'jefe',
    apuesta: null,
    baratijasApostadas: [],
    soborno: false,
    racha: gano ? Math.max(partida.racha, 0) + 1 : Math.min(partida.racha, 0) - 1,
    niveles: gano && nodo.tipo === 'elite' ? nivelesConRecompensa(partida, recordada) : partida.niveles,
    ...avanzarTransformaciones(sinPerdidas),
  };
  if (gano && nodo.tipo === 'jefe') {
    const premio = premioDelJefe(resuelto);
    return renacer(siguienteMundo(premio ? conseguir(resuelto, premio) : resuelto));
  }
  // Vencer a un élite ofrece elegir 1 de 3 baratijas.
  if (gano && nodo.tipo === 'elite') {
    const baratijas = sortearOferta(resuelto, 'elite');
    if (baratijas.baratijas.length > 0) return renacer({ ...resuelto, oferta: baratijas });
  }
  return renacer(resuelto);
}

// Las baratijas que se rompen al terminar el combate (Espejo roto: 1 en
// `rompe` cada una, con la suerte de las baratijas).
function rotas(partida: Partida, efectos: readonly Efectos[]): string[] {
  const aleatorio = crearAleatorio(partida.mapa.semilla * 67 + partida.visitados.length * 23 + partida.mundo);
  const suerte = suerteDe(efectos);
  return baratijasDe(partida.baratijas)
    .filter((b) => b.rompe && aleatorio() < suerte / b.rompe)
    .map((b) => b.id);
}

// Recompensa: vencer a un élite sube un nivel la mano más jugada.
function nivelesConRecompensa(partida: Partida, memoria: Memoria): Niveles {
  if (!efectosDe(partida.baratijas).some((e) => e.recompensa)) return partida.niveles;
  const mano = manoMasJugada(memoria, 'recompensa');
  return mano ? { ...partida.niveles, [mano]: partida.niveles[mano] + 1 } : partida.niveles;
}

// Fénix: si la partida se termina por falta de oro, vuelve con ORO_DEL_FENIX
// y el Fénix se pierde.
export const ORO_DEL_FENIX = 300;
export const FENIX = 'fenix';

function renacer(partida: Partida): Partida {
  if (!partida.baratijas.includes(FENIX) || !enBancarrota(partida)) return partida;
  return { ...quitarBaratijas(partida, [FENIX]), oro: ORO_DEL_FENIX };
}

// Al vencer al jefe del mundo, una de sus baratijas que el jugador no
// tenga, al azar (ninguna si ya las tiene todas).
export function premioDelJefe(partida: Partida): string | null {
  const libres = jefeDelMundo(partida.mundo).baratijas.filter((id) => !partida.baratijas.includes(id));
  const aleatorio = crearAleatorio(partida.mapa.semilla * 59 + partida.mundo * 41 + partida.visitados.length);
  return libres[Math.floor(aleatorio() * libres.length)] ?? null;
}

// Cada mundo nuevo baja COMUNES_MENOS_POR_MUNDO la probabilidad de las
// baratijas comunes, y lo que pierden se reparte entre las otras rarezas en
// proporción a lo que ya tenían.
export const COMUNES_MENOS_POR_MUNDO = 0.15;

export function probabilidadesDelMundoSiguiente(probabilidades: Probabilidades): Probabilidades {
  const otras = probabilidades.infrecuente + probabilidades.rara + probabilidades.legendaria;
  const baja = Math.min(COMUNES_MENOS_POR_MUNDO, probabilidadComun(probabilidades));
  if (otras <= 0 || baja <= 0) return probabilidades;
  const repartir = (p: number) => p + (baja * p) / otras;
  return { infrecuente: repartir(probabilidades.infrecuente), rara: repartir(probabilidades.rara), legendaria: repartir(probabilidades.legendaria) };
}

// Después del jefe: un mapa nuevo desde su inicio, con todo lo demás (oro,
// mazo, baratijas, niveles…) igual. El riesgo arranca donde estaba el jefe.
export function siguienteMundo(partida: Partida): Partida {
  const mundo = partida.mundo + 1;
  const efectos = efectosDe(partida.baratijas);
  const aleatorio = crearAleatorio(partida.mapa.semilla * 71 + mundo * 13);
  const mapa = esconderTesoros(generarMapa(partida.mapa.semilla * 7919 + mundo), sumar(efectos, 'tesoro'), 0, aleatorio);
  const inicio = mapa.pisos[0]![0]!;
  // Alquimista: las comunes pasan a infrecuentes al azar.
  let baratijas = partida.baratijas;
  if (efectos.some((e) => e.alquimista)) {
    for (const comun of baratijasDe(baratijas).filter((b) => b.rareza === 'comun')) {
      const libres = CATALOGO.filter((b) => b.rareza === 'infrecuente' && !b.deJefe && !baratijas.includes(b.id));
      const nueva = libres[Math.floor(aleatorio() * libres.length)];
      if (nueva) baratijas = baratijas.map((id) => (id === comun.id ? nueva.id : id));
    }
  }
  // Clonador: una carta al azar del mazo, otra vez, con sus modificadores.
  const mazo = [...partida.mazo];
  for (let i = 0; i < sumar(efectos, 'clonador') && partida.mazo.length > 0; i++) {
    const original = partida.mazo[Math.floor(aleatorio() * partida.mazo.length)]!;
    mazo.push({ ...original, id: `${original.id}-c${mundo}-${i}` });
  }
  return {
    ...partida,
    baratijas,
    mazo,
    mapa,
    mundo,
    riesgoBase: nivelDeRiesgo(partida),
    nodoActual: inicio.id,
    visitados: [inicio.id],
    combatePendiente: false,
    oferta: null,
    probabilidades: probabilidadesDelMundoSiguiente(partida.probabilidades),
  };
}

// Mapa del tesoro: `cuantos` combates al azar de los pisos de arriba de
// `desde` pasan a ser eventos.
function esconderTesoros(mapa: Mapa, cuantos: number, desde: number, aleatorio: () => number): Mapa {
  if (cuantos <= 0) return mapa;
  const combates = mapa.pisos.flat().filter((n) => n.tipo === 'combate' && n.piso > Math.max(1, desde));
  const elegidos = barajar(combates, aleatorio).slice(0, cuantos).map((n) => n.id);
  return { ...mapa, pisos: mapa.pisos.map((fila) => fila.map((n) => (elegidos.includes(n.id) ? { ...n, tipo: 'evento' as const } : n))) };
}

function valorDeBaratijas(ids: readonly string[]): number {
  return baratijasDe(ids).reduce((suma, b) => suma + valorDeVenta(b), 0);
}

// Sin esas baratijas, ni en las transformaciones pendientes, y olvidando lo
// que recordaban.
function quitarBaratijas(partida: Partida, ids: readonly string[]): Partida {
  if (ids.length === 0) return partida;
  const baratijas = partida.baratijas.filter((id) => !ids.includes(id));
  return {
    ...partida,
    baratijas,
    memoria: Object.fromEntries(Object.entries(partida.memoria ?? {}).filter(([id]) => baratijas.includes(id))),
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
// Con el Mapa del tesoro, también se esconde un evento en lo que queda del
// mapa.
function conseguir(partida: Partida, id: string): Partida {
  const baratijas = [...partida.baratijas, id];
  const { pregunta, alConseguir, tesoro } = buscarBaratija(id);
  const maximo = pregunta ? pregunta.maximo(baratijas) : 0;
  const aleatorio = crearAleatorio(partida.mapa.semilla * 61 + partida.visitados.length * 7 + baratijas.length);
  const mazo = alConseguir ? alConseguir(partida.mazo, aleatorio) : partida.mazo;
  const mapa = esconderTesoros(partida.mapa, tesoro ?? 0, nodoActual(partida).piso, aleatorio);
  return { ...partida, baratijas, mazo, mapa, eleccion: maximo >= 1 ? { baratija: id, maximo } : null };
}

export function responderEleccion(partida: Partida, numero: number): Partida {
  const eleccion = partida.eleccion;
  if (!eleccion || !Number.isInteger(numero) || numero < 1 || numero > eleccion.maximo) {
    throw new Error(`No se puede elegir ${numero}`);
  }
  const efecto = buscarBaratija(eleccion.baratija).alElegirNumero;
  const aleatorio = crearAleatorio(partida.mapa.semilla * 13 + partida.visitados.length * 3 + numero);
  const cambio = efecto ? efecto({ baratijas: partida.baratijas, transformaciones: partida.transformaciones }, numero, aleatorio) : partida;
  const memoria = { ...partida.memoria, [eleccion.baratija]: { ...partida.memoria?.[eleccion.baratija], eleccion: numero } };
  return { ...partida, baratijas: cambio.baratijas, transformaciones: cambio.transformaciones, eleccion: null, memoria };
}

// Se puede comprar si está a la venta y pagarla no deja la partida en
// bancarrota.
// Lo que cuesta algo de `precio` en la tienda en la que está el jugador,
// con lo que descuenten las baratijas (Cupón, Descuento de veterano).
export function precioEnTienda(partida: Partida, precio: number): number {
  const primera = (partida.oferta?.compras ?? 0) === 0;
  const riesgo = nivelDeRiesgo(partida);
  return Math.round(efectosDe(partida.baratijas).reduce((p, e) => (e.alComprar ? e.alComprar(p, primera, riesgo) : p), precio));
}

export function precioDeBaratija(partida: Partida, id: string): number {
  return precioEnTienda(partida, precioDe(buscarBaratija(id)));
}

export function puedeComprar(partida: Partida, id: string): boolean {
  if (partida.oferta?.tipo !== 'vendedor' || !partida.oferta.baratijas.includes(id)) return false;
  return !enBancarrota({ ...partida, oro: partida.oro - precioDeBaratija(partida, id) });
}

export function comprarBaratija(partida: Partida, id: string): Partida {
  if (!puedeComprar(partida, id)) throw new Error(`No se puede comprar ${id}`);
  const oferta = partida.oferta!;
  const pagada = {
    ...partida,
    oro: partida.oro - precioDeBaratija(partida, id),
    oferta: { ...oferta, baratijas: oferta.baratijas.filter((b) => b !== id), compras: (oferta.compras ?? 0) + 1 },
  };
  return conseguir(pagada, id);
}

// Venderle al vendedor una baratija propia, por la mitad de su precio
// (solo con el Bróker).
export function puedeVenderBaratijas(partida: Partida): boolean {
  return partida.oferta?.tipo === 'vendedor' && efectosDe(partida.baratijas).some((e) => e.venderBaratijas);
}

// Lo que paga el vendedor por una baratija propia (con Lavado de dinero,
// las comunes a precio completo).
export function valorAlVender(partida: Partida, id: string): number {
  const baratija = buscarBaratija(id);
  return efectosDe(partida.baratijas).reduce((valor, e) => (e.alVender ? e.alVender(valor, baratija) : valor), valorDeVenta(baratija));
}

export function venderBaratija(partida: Partida, id: string): Partida {
  if (!puedeVenderBaratijas(partida)) throw new Error('Solo se vende en el vendedor, con el Bróker');
  if (!partida.baratijas.includes(id)) throw new Error(`No tienes ${id}`);
  return { ...quitarBaratijas(partida, [id]), oro: partida.oro + valorAlVender(partida, id) };
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

// Pasar: irse del vendedor o del eliminador, o dejar la recompensa del
// élite a cambio de ORO_POR_PASAR (solo con una baratija que lo permita).
export function cerrarOferta(partida: Partida): Partida {
  const esElite = partida.oferta?.tipo === 'elite';
  if (esElite && !puedePasarRecompensa(partida)) throw new Error('Hay que elegir una baratija');
  if (partida.oferta?.evento === 'regaloRaimundo') throw new Error('Hay que elegir una carta del regalo');
  return { ...partida, oro: partida.oro + (esElite ? ORO_POR_PASAR : 0), oferta: null };
}

export function puedePasarRecompensa(partida: Partida): boolean {
  return efectosDe(partida.baratijas).some((e) => e.pasarRecompensa);
}

// Edmundo manos de cinceles (el eliminador). La ruleta rusa cuesta COSTO_RULETA: muestra hasta
// BARATIJAS_EN_RULETA baratijas del jugador al azar y elimina una de ellas.
export const COSTO_RULETA = 100;
export const BARATIJAS_EN_RULETA = 6;

function puedeUsar(partida: Partida, servicio: Servicio, costo: number): boolean {
  const oferta = partida.oferta;
  if (oferta?.tipo !== OFERTA_DEL_SERVICIO[servicio]) return false;
  const usados = oferta.usados ?? [];
  if (oferta.tipo === 'pintor') {
    // Un trabajo por visita (más con la Paleta); la pintura libre, una vez.
    if (usados.length >= trabajosDelPintor(partida) || (servicio === 'pintura' && usados.includes(servicio))) return false;
  } else if (usados.includes(servicio)) return false;
  return !enBancarrota({ ...partida, oro: partida.oro - costo });
}

function usar(partida: Partida, servicio: Servicio, costo: number): Partida {
  const oferta = partida.oferta!;
  return { ...partida, oro: partida.oro - costo, oferta: { ...oferta, usados: [...(oferta.usados ?? []), servicio] } };
}

export function puedeGirarRuleta(partida: Partida): boolean {
  return partida.baratijas.length > 0 && puedeUsar(partida, 'ruleta', COSTO_RULETA);
}

export interface Ruleta {
  partida: Partida;
  mostradas: string[]; // las que entraron en la ruleta
  eliminada: string;
}

export function girarRuleta(partida: Partida): Ruleta {
  if (!puedeGirarRuleta(partida)) throw new Error('No se puede girar la ruleta');
  const aleatorio = crearAleatorio(partida.mapa.semilla * 19 + partida.visitados.length * 11 + partida.oro);
  const mostradas = barajar(partida.baratijas, aleatorio).slice(0, BARATIJAS_EN_RULETA);
  const eliminada = mostradas[Math.floor(aleatorio() * mostradas.length)]!;
  return { partida: quitarBaratijas(usar(partida, 'ruleta', COSTO_RULETA), [eliminada]), mostradas, eliminada };
}

// Eliminar una carta del mazo cuesta según cuántas cartas tiene (n),
// redondeado a decenas: COSTO_ELIMINAR con MAZO_COMPLETO cartas; con
// menos se duplica cada CARTAS_PARA_DUPLICAR cartas menos (exponencial) y
// con más baja despacio (logarítmico). El mazo nunca queda vacío.
//   n ≤ 52: 150 × 2^((52 − n) / 6)    46 → 300, 40 → 600, 34 → 1200
//   n > 52: 150 / (1 + ln(n / 52))    60 → 130, 78 → 110, 104 → 90
// Se pueden eliminar varias en la misma visita, de a una, pero cada una
// cuesta además × RECARGO_ELIMINAR^(recargo + las ya eliminadas en esta
// visita), y cada eliminación después de la primera de una visita sube el
// recargo de la partida para siempre. Una o dos por visita está bien;
// vaciar un palo entero de una vez cuesta una barbaridad.
export const COSTO_ELIMINAR = 150;
export const RECARGO_ELIMINAR = 1.5;
export const MAZO_COMPLETO = 52;
export const CARTAS_PARA_DUPLICAR = 6;

export function costoDeEliminar(partida: Partida): number {
  const n = partida.mazo.length;
  const factor = n <= MAZO_COMPLETO ? 2 ** ((MAZO_COMPLETO - n) / CARTAS_PARA_DUPLICAR) : 1 / (1 + Math.log(n / MAZO_COMPLETO));
  const recargo = RECARGO_ELIMINAR ** ((partida.recargoEliminar ?? 0) + eliminadasEnLaVisita(partida));
  return Math.round((COSTO_ELIMINAR * factor * recargo) / 10) * 10;
}

function eliminadasEnLaVisita(partida: Partida): number {
  return partida.oferta?.tipo === 'eliminador' ? (partida.oferta.eliminadas ?? 0) : 0;
}

export function puedeEliminarCarta(partida: Partida, id: string): boolean {
  if (partida.oferta?.tipo !== 'eliminador' || !partida.mazo.some((c) => c.id === id) || partida.mazo.length <= 1) return false;
  return !enBancarrota({ ...partida, oro: partida.oro - costoDeEliminar(partida) });
}

export function eliminarCarta(partida: Partida, id: string): Partida {
  if (!puedeEliminarCarta(partida, id)) throw new Error(`No se puede eliminar ${id}`);
  const memoria = recordar(partida.memoria ?? {}, partida.baratijas, { tipo: 'eliminarCarta' });
  const eliminadas = eliminadasEnLaVisita(partida);
  return {
    ...partida,
    oro: partida.oro - costoDeEliminar(partida),
    oferta: { ...partida.oferta!, eliminadas: eliminadas + 1 },
    recargoEliminar: (partida.recargoEliminar ?? 0) + (eliminadas > 0 ? 1 : 0),
    mazo: partida.mazo.filter((c) => c.id !== id),
    memoria,
  };
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

// Cómo quedaría el oro con esa apuesta si se gana o se pierde el combate,
// con todo lo que cambian las baratijas (lo mismo que resolverCombate).
// `terminaPartida` avisa si ese resultado deja la partida en bancarrota.
export interface Prevision {
  oro: number;
  terminaPartida: boolean;
}

export function preverApuesta(partida: Partida, cantidad: number, baratijas: readonly string[] = []): { ganar: Prevision; perder: Prevision } {
  const apostada = apostar(partida, cantidad, baratijas);
  const prever = (gano: boolean): Prevision => {
    const resuelta = resolverCombate(apostada, gano);
    return { oro: resuelta.oro, terminaPartida: enBancarrota(resuelta) };
  };
  return { ganar: prever(true), perder: prever(false) };
}

// Todo lo apostado en el combate en curso, contando las baratijas.
export function totalApostado(partida: Partida): number {
  return (partida.apuesta ?? 0) + valorDeBaratijas(partida.baratijasApostadas);
}

// Crypto monedas: en cada paso se cumplen las predicciones que llegan a 0
// (el oro, si es positivo, sube o baja un porcentaje al azar de 0 a 200,
// más a menudo por debajo de 100) y se agrega una nueva. Sin la baratija
// no queda ninguna pendiente.
export const PASOS_DE_PREDICCION = 2;
export const PORCENTAJE_MAXIMO_CRIPTO = 200;

function moverCripto(partida: Partida): Partida {
  if (!efectosDe(partida.baratijas).some((e) => e.cripto)) {
    return partida.cripto.predicciones.length > 0 ? { ...partida, cripto: { ...partida.cripto, predicciones: [] } } : partida;
  }
  const aleatorio = crearAleatorio(partida.mapa.semilla * 29 + partida.visitados.length * 17);
  let { oro } = partida;
  let ultima = partida.cripto.ultima;
  const pendientes: Prediccion[] = [];
  for (const prediccion of partida.cripto.predicciones) {
    if (prediccion.pasos > 1) {
      pendientes.push({ ...prediccion, pasos: prediccion.pasos - 1 });
      continue;
    }
    // Al cuadrado, para que los porcentajes bajos salgan más (el 71 % de
    // las veces, menos de 100).
    const porcentaje = Math.round(PORCENTAJE_MAXIMO_CRIPTO * aleatorio() ** 2);
    const cambio = Math.round((Math.max(0, oro) * porcentaje) / 100) * (prediccion.sube ? 1 : -1);
    oro += cambio;
    ultima = { sube: prediccion.sube, porcentaje, oro: cambio, paso: partida.visitados.length };
  }
  pendientes.push({ sube: aleatorio() < 0.5, pasos: PASOS_DE_PREDICCION });
  return { ...partida, oro, cripto: { predicciones: pendientes, ultima } };
}

// La tienda de cartas: CARTAS_EN_TIENDA cartas al azar (por ahora sin
// modificar), cada una por ORO_POR_CARTA × el nivel de riesgo (al menos
// ×1). Cada carta comprada lleva un id nuevo, para no repetir el de otra
// igual del mazo.
export const CARTAS_EN_TIENDA = 6;
export const ORO_POR_CARTA = 5;

function sortearCartas(partida: Partida): Carta[] {
  const aleatorio = crearAleatorio(partida.mapa.semilla * 37 + partida.visitados.length * 19);
  const paso = partida.visitados.length;
  return Array.from({ length: CARTAS_EN_TIENDA }, (_, i) => {
    const palo = PALOS[Math.floor(aleatorio() * PALOS.length)]!;
    const rango = RANGOS[Math.floor(aleatorio() * RANGOS.length)]!;
    return { id: `${palo}-${rango}-t${paso}-${i}`, palo, rango };
  });
}

// Lo que cuesta la próxima carta, con los descuentos de las baratijas.
export function costoDeCarta(partida: Partida): number {
  return precioEnTienda(partida, ORO_POR_CARTA * Math.max(1, nivelDeRiesgo(partida)));
}

export function puedeComprarCarta(partida: Partida, id: string): boolean {
  if (partida.oferta?.tipo !== 'tienda' || !partida.oferta.cartas?.some((c) => c.id === id)) return false;
  return !enBancarrota({ ...partida, oro: partida.oro - costoDeCarta(partida) });
}

export function comprarCarta(partida: Partida, id: string): Partida {
  if (!puedeComprarCarta(partida, id)) throw new Error(`No se puede comprar ${id}`);
  const oferta = partida.oferta!;
  const carta = oferta.cartas!.find((c) => c.id === id)!;
  return {
    ...partida,
    oro: partida.oro - costoDeCarta(partida),
    mazo: [...partida.mazo, carta],
    oferta: { ...oferta, cartas: oferta.cartas!.filter((c) => c.id !== id), compras: (oferta.compras ?? 0) + 1 },
  };
}

// La mano negra: al llegar se sortean MANOS_EN_MANO_NEGRA manos y se puede
// subir un nivel a una de ellas por 100 × (la suma de los niveles − los
// tipos de mano + 1): la primera mejora cuesta 100, la segunda 200…
export const MANOS_EN_MANO_NEGRA = 3;
export const ORO_POR_MEJORA = 100;

// Con el Telescopio, la mano más jugada siempre está entre ellas.
function sortearManos(partida: Partida): TipoMano[] {
  const aleatorio = crearAleatorio(partida.mapa.semilla * 23 + partida.visitados.length * 13);
  const manos = barajar(TIPOS_DE_MANO, aleatorio).slice(0, MANOS_EN_MANO_NEGRA);
  const masJugada = efectosDe(partida.baratijas).some((e) => e.telescopio) ? manoMasJugada(partida.memoria ?? {}, 'telescopio') : null;
  if (!masJugada || manos.includes(masJugada)) return manos;
  return [...manos.slice(0, -1), masJugada];
}

export function costoDeMejorar(partida: Partida): number {
  const suma = TIPOS_DE_MANO.reduce((total, tipo) => total + partida.niveles[tipo], 0);
  return ORO_POR_MEJORA * Math.max(1, suma - TIPOS_DE_MANO.length + 1);
}

export function puedeMejorarMano(partida: Partida, tipo: TipoMano): boolean {
  return !!partida.oferta?.manos?.includes(tipo) && puedeUsar(partida, 'mejorar', costoDeMejorar(partida));
}

export function mejorarMano(partida: Partida, tipo: TipoMano): Partida {
  if (!puedeMejorarMano(partida, tipo)) throw new Error(`No se puede mejorar ${tipo}`);
  const pagada = usar(partida, 'mejorar', costoDeMejorar(partida));
  return { ...pagada, niveles: { ...partida.niveles, [tipo]: partida.niveles[tipo] + 1 } };
}

// El pintor hace un solo trabajo por visita:
//   Pintura libre  por COSTO_PINTURA_LIBRE, un modificador al azar
//                  (modificadorLibre) en la `cartaLibre` (sorteada al
//                  llegar; se ve antes de pagar).
// Si el modificador es cambiar de palo, el jugador elige el palo nuevo.
//   Alquiler       el `modificador` (sorteado al llegar) en la carta que se
//                  elija de las `opciones`, por ORO_POR_MODIFICACION × las
//                  modificaciones que ya tienen esas cartas (al menos ×1).
//   Personalizado  solo con Claire obscure: el modificador y la carta que
//                  se elijan, de todo el mazo, por ORO_POR_MODIFICACION ×
//                  las modificaciones de todo el mazo (al menos ×1).
export const COSTO_PINTURA_LIBRE = 100;

export function trabajosDelPintor(partida: Partida): number {
  return 1 + sumar(efectosDe(partida.baratijas), 'trabajosDelPintor');
}
export const ORO_POR_MODIFICACION = 100;
export const CARTAS_EN_ALQUILER = 6;

function sortearPintor(partida: Partida): Oferta {
  const aleatorio = crearAleatorio(partida.mapa.semilla * 41 + partida.visitados.length * 17);
  return {
    tipo: 'pintor',
    baratijas: [],
    usados: [],
    cartaLibre: barajar(partida.mazo, aleatorio)[0]?.id,
    modificador: MODIFICADORES[Math.floor(aleatorio() * MODIFICADORES.length)]!,
    opciones: barajar(partida.mazo, aleatorio).slice(0, CARTAS_EN_ALQUILER).map((c) => c.id),
  };
}

// Le pone el modificador a una carta del mazo.
function pintar(partida: Partida, id: string, modificador: Modificador, palo?: Palo): Partida {
  return { ...partida, mazo: partida.mazo.map((c) => (c.id === id ? modificar(c, modificador, palo) : c)) };
}

// El modificador que le toca a la pintura libre de esta visita.
export function modificadorLibre(partida: Partida): Modificador {
  const aleatorio = crearAleatorio(partida.mapa.semilla * 47 + partida.visitados.length * 31);
  return MODIFICADORES[Math.floor(aleatorio() * MODIFICADORES.length)]!;
}

function costoPorModificaciones(cartas: readonly Carta[]): number {
  return ORO_POR_MODIFICACION * Math.max(1, cartas.reduce((suma, c) => suma + modificacionesDe(c), 0));
}

export function puedePintarLibre(partida: Partida): boolean {
  const id = partida.oferta?.cartaLibre;
  return !!id && partida.mazo.some((c) => c.id === id) && puedeUsar(partida, 'pintura', COSTO_PINTURA_LIBRE);
}

export function pintarLibre(partida: Partida, palo?: Palo): { partida: Partida; modificador: Modificador } {
  if (!puedePintarLibre(partida)) throw new Error('No se puede usar la pintura libre');
  const modificador = modificadorLibre(partida);
  return { partida: pintar(usar(partida, 'pintura', COSTO_PINTURA_LIBRE), partida.oferta!.cartaLibre!, modificador, palo), modificador };
}

export function cartasEnAlquiler(partida: Partida): Carta[] {
  const ids = partida.oferta?.opciones ?? [];
  return partida.mazo.filter((c) => ids.includes(c.id));
}

export function costoDeAlquiler(partida: Partida): number {
  return costoPorModificaciones(cartasEnAlquiler(partida));
}

export function puedeAlquilar(partida: Partida, id: string): boolean {
  return !!partida.oferta?.modificador && cartasEnAlquiler(partida).some((c) => c.id === id) && puedeUsar(partida, 'alquiler', costoDeAlquiler(partida));
}

export function alquilar(partida: Partida, id: string, palo?: Palo): Partida {
  if (!puedeAlquilar(partida, id)) throw new Error(`No se puede alquilar el servicio para ${id}`);
  return pintar(usar(partida, 'alquiler', costoDeAlquiler(partida)), id, partida.oferta!.modificador!, palo);
}

// Si el pintor ofrece el servicio Personalizado (con Claire obscure).
export function ofrecePersonalizado(partida: Partida): boolean {
  return partida.oferta?.tipo === 'pintor' && efectosDe(partida.baratijas).some((e) => e.pintorPersonalizado);
}

export function costoDePersonalizado(partida: Partida): number {
  return costoPorModificaciones(partida.mazo);
}

export function puedePersonalizar(partida: Partida, id: string): boolean {
  return ofrecePersonalizado(partida) && partida.mazo.some((c) => c.id === id) && puedeUsar(partida, 'personalizado', costoDePersonalizado(partida));
}

export function personalizar(partida: Partida, id: string, modificador: Modificador, palo?: Palo): Partida {
  if (!puedePersonalizar(partida, id)) throw new Error(`No se puede personalizar ${id}`);
  return pintar(usar(partida, 'personalizado', costoDePersonalizado(partida)), id, modificador, palo);
}

// Los eventos (nodo ?), uno al azar al llegar:
//   regaloRaimundo  hay que elegir 1 de CARTAS_DEL_REGALO cartas al azar
//                   para el mazo; traen más modificaciones (+1 multi o +5
//                   fichas) cuanto mayor el riesgo: entre riesgo / 2 y
//                   riesgo × 1,5.
//   regaloGustavo   duplica los +multi y +fichas de la carta que más tiene
//                   (si empatan, una al azar); si ninguna tiene, se ofende
//                   y se va.
export const EVENTOS = ['regaloRaimundo', 'regaloGustavo'] as const;
export type Evento = (typeof EVENTOS)[number];
export const CARTAS_DEL_REGALO = 9;
// De cada 10 modificaciones de las cartas del regalo, cuántas son +multi.
const PROBABILIDAD_MULTI_DEL_REGALO = 0.3;

function sortearEvento(partida: Partida): Pick<Partida, 'mazo' | 'oferta'> {
  const aleatorio = crearAleatorio(partida.mapa.semilla * 53 + partida.visitados.length * 37);
  const evento = EVENTOS[Math.floor(aleatorio() * EVENTOS.length)]!;
  if (evento === 'regaloRaimundo') {
    const riesgo = nivelDeRiesgo(partida);
    const paso = partida.visitados.length;
    const cartas = Array.from({ length: CARTAS_DEL_REGALO }, (_, i): Carta => {
      const palo = PALOS[Math.floor(aleatorio() * PALOS.length)]!;
      const rango = RANGOS[Math.floor(aleatorio() * RANGOS.length)]!;
      const cuantas = Math.floor(riesgo / 2) + Math.floor(aleatorio() * (riesgo + 1));
      let multi = 0;
      for (let k = 0; k < cuantas; k++) if (aleatorio() < PROBABILIDAD_MULTI_DEL_REGALO) multi++;
      const fichas = cuantas - multi;
      const modificaciones = cuantas > 0 ? { ...(multi > 0 && { multi }), ...(fichas > 0 && { fichas }) } : undefined;
      return { id: `${palo}-${rango}-r${paso}-${i}`, palo, rango, ...(modificaciones && { modificaciones }) };
    });
    return { mazo: partida.mazo, oferta: { tipo: 'evento', evento, baratijas: [], cartas } };
  }
  // Gustavo: la carta con más +multi y +fichas.
  const peso = (c: Carta) => (c.modificaciones?.multi ?? 0) + (c.modificaciones?.fichas ?? 0);
  const maximo = Math.max(0, ...partida.mazo.map(peso));
  const candidatas = maximo > 0 ? partida.mazo.filter((c) => peso(c) === maximo) : [];
  const elegida = candidatas[Math.floor(aleatorio() * candidatas.length)];
  if (!elegida) return { mazo: partida.mazo, oferta: { tipo: 'evento', evento, baratijas: [] } };
  const duplicar = (n?: number) => (n ? n * 2 : n);
  const mazo = partida.mazo.map((c) =>
    c.id === elegida.id ? { ...c, modificaciones: { ...c.modificaciones, multi: duplicar(c.modificaciones?.multi), fichas: duplicar(c.modificaciones?.fichas) } } : c,
  );
  return { mazo, oferta: { tipo: 'evento', evento, baratijas: [], cartaLibre: elegida.id } };
}

export function elegirCartaDelRegalo(partida: Partida, id: string): Partida {
  const oferta = partida.oferta;
  const carta = oferta?.evento === 'regaloRaimundo' ? oferta.cartas?.find((c) => c.id === id) : undefined;
  if (!carta) throw new Error(`${id} no está en el regalo`);
  return { ...partida, mazo: [...partida.mazo, carta], oferta: null };
}

// La mesa fuera de un combate, para mostrar cómo van las baratijas.
export function mesaDePartida(partida: Partida): Mesa {
  return {
    mazo: partida.mazo,
    restantes: partida.mazo.length,
    baratijas: partida.baratijas.length,
    propias: partida.baratijas,
    oro: partida.oro,
    riesgo: nivelDeRiesgo(partida),
    mundo: partida.mundo,
    niveles: partida.niveles,
    memoria: partida.memoria ?? {},
  };
}

// El nivel de riesgo es el piso en el que está el jugador (el inicio es el
// 0), más el de los mundos ya vencidos. Aquí se sumarán los modificadores
// de riesgo.
export function nivelDeRiesgo(partida: Partida): number {
  return partida.riesgoBase + nodoActual(partida).piso;
}

// El riesgo con el que se juega el combate del nodo actual: el de la
// partida, y en un élite RIESGO_EXTRA_ELITE más.
export function riesgoDelCombate(partida: Partida): number {
  return nivelDeRiesgo(partida) + (nodoActual(partida).tipo === 'elite' ? RIESGO_EXTRA_ELITE : 0);
}

// Los puntos que pide el combate del nodo actual, con lo que cambien las
// baratijas y el soborno.
export function objetivoDelCombate(partida: Partida): number {
  const base = OBJETIVO_BASE[nodoActual(partida).tipo] ?? OBJETIVO_BASE.combate!;
  const objetivo = aplicar(efectosDe(partida.baratijas), 'alFijarObjetivo', base + OBJETIVO_POR_RIESGO * riesgoDelCombate(partida));
  return Math.round(objetivo * (partida.soborno ? 1 - REBAJA_SOBORNO : 1));
}

// Soborno: al empezar un combate (no contra el jefe) se paga COSTO_SOBORNO
// del oro para bajar el objetivo; con el bono de Bajos fondos, el primero
// de cada mundo es gratis.
export function costoDelSoborno(partida: Partida): number {
  const gratis = efectosDe(partida.baratijas).some((e) => e.sobornoGratis) && !usadaEnElMundo(partida, partida.memoria ?? {}, 'soborno');
  return gratis ? 0 : Math.floor(Math.max(0, partida.oro) * COSTO_SOBORNO);
}

export function puedeSobornar(partida: Partida): boolean {
  return (
    partida.combatePendiente &&
    !partida.soborno &&
    nodoActual(partida).tipo !== 'jefe' &&
    efectosDe(partida.baratijas).some((e) => e.soborno) &&
    !enBancarrota({ ...partida, oro: partida.oro - costoDelSoborno(partida) })
  );
}

export function sobornar(partida: Partida): Partida {
  if (!puedeSobornar(partida)) throw new Error('No se puede sobornar');
  const costo = costoDelSoborno(partida);
  const memoria = costo === 0 ? usarEnElMundo(partida, partida.memoria ?? {}, 'soborno') : partida.memoria;
  return { ...partida, oro: partida.oro - costo, soborno: true, memoria };
}

export function nodoActual(partida: Partida): Nodo {
  return buscarNodo(partida.mapa, partida.nodoActual);
}
