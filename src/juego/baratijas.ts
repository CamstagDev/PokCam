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
//                     (recibe también el tipo de combate)
//   alContarCarta     las fichas que suma cada carta que puntúa (recibe
//                     también la carta y la mesa: el mazo y cuántas cartas
//                     quedan por robar)
//   alPuntuarCarta    fichas, multiplicador y oro de la mano después de
//                     que puntúa cada carta (recibe la carta y la mesa)
//   alPuntuar         fichas, multiplicador y oro de cada mano jugada
//                     (recibe también la mesa)
//   alGanarCombate    el oro que da un combate ganado
//   alPerderCombate   el oro que quita un combate perdido
//   alSortearRareza   la probabilidad de cada rareza al ofrecer baratijas
//   alLimitarApuesta  la parte del oro que se puede apostar (0,5 = 50 %)
//   alLimitarDeuda    cuánto oro se puede deber sin perder (recibe también
//                     el nivel de riesgo); tenerlo permite la deuda
//   alMoverseEnDeuda  lo que cuesta cada paso en el mapa mientras se debe
//                     oro (recibe también la deuda y el nivel de riesgo)
//   alResolverApuesta el oro que cambia una apuesta: lo apostado si se gana
//                     el combate, menos lo apostado si se pierde (recibe
//                     también la racha de antes: +n ganados seguidos, −n
//                     perdidos seguidos)
//   apuestaBaratijas  si es true, las baratijas también se pueden apostar
//   pasarRecompensa   si es true, se puede pasar la recompensa de un élite
//   cripto            si es true, el oro se vuelve cripto (ver partida.ts)
//   venderBaratijas   si es true, se le pueden vender baratijas al vendedor
//   pintorPersonalizado  si es true, el pintor ofrece "Personalizado"
//   asExtra           si es true, cada combate empieza con un As de más en
//                     la mano, que no es del mazo
//   faroles           cuántas manos por combate pueden farolear (puntuar
//                     como el tipo de mano siguiente)
//   divinas           cuántas manos por combate pueden contar como
//                     escalera de color (Mano de Dios)
//   alTerminarCombate el oro de más al terminar un combate (recibe cómo
//                     terminó: ganado o no, manos y descartes que sobran…)
//   alFijarObjetivo   los puntos que pide cada combate
//   alComprar         el precio de lo que se compra en una tienda (recibe
//                     si es la primera compra de la visita y el riesgo)
//   alVender          lo que paga el vendedor por una baratija
//   y otras marcas que usan las reglas: cartasExtra, eco, gemelos,
//   escaleraCorta, puente, sumanTodas, suerte, verSiguiente, reciclaje,
//   iman, vampiro, precision, soborno, sobornoGratis, seguro,
//   segundaOportunidad, fichaDeLaSuerte, recompensa, telescopio,
//   trabajosDelPintor, clonador, alquimista, tesoro, coronaDelTahur (ver
//   cada una en Efectos).
//
// Probabilidades "1 en X": `conSuerte(mesa, X)`. El bono del set
// supersticioso (`suerte: 2`) las duplica. Una baratija que se rompe
// sola (`rompe`: 1 en X al terminar cada combate) se pierde.
//
// Una baratija también puede cambiar el mazo al conseguirla
// (`alConseguir`), y ser de un jefe (`deJefe`): esas solo se consiguen
// venciéndolo, nunca en ofertas.
//
// El Gemelo malvado copia los efectos de la última baratija conseguida
// (ver efectosDe).
//
// Una baratija puede pertenecer a un set (`conjunto`, el id de uno de
// CONJUNTOS). Cada set da bonos según cuántas de sus baratijas se tengan;
// un bono tiene los mismos efectos que una baratija. Un bono con
// `potencia` hace que las baratijas del set usen sus efectos `potenciados`
// (por ejemplo, con los bonos al doble).
//
// Una baratija también puede pedir un número al conseguirla (`pregunta`,
// con `opciones` si cada número tiene un nombre) y usarlo para cambiar las
// baratijas del jugador (`alElegirNumero`), por ejemplo dejando
// transformaciones que se cumplen tras unos combates. El número elegido
// queda en su memoria como `eleccion`.
//
// Memoria: cada baratija puede recordar números durante la partida (su
// `Recuerdo`, guardado en Partida.memoria con su id). `recordar` recibe lo
// que pasó (un Suceso) y devuelve el recuerdo nuevo; sus efectos lo leen
// de la mesa (mesa.memoria). Al perder la baratija se olvida todo. `estado`
// dice, para mostrarlo, cómo va su efecto.
//
// Si hace falta que una baratija toque algo más, se agrega aquí un efecto
// nuevo y se llama desde la regla correspondiente.

import { barajar, type Aleatorio } from './aleatorio.ts';
import { esDePalo, mismoColor, modificacionesDe, type Carta, type Palo } from './cartas.ts';
import { MANOS, TIPOS_DE_MANO, type Niveles, type TipoMano } from './manos.ts';
import type { TipoNodo } from '../mapa/mapa.ts';

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
  oro: number; // el que dan las baratijas al puntuar
}

// Baratijas del jugador que se vuelven otras de la rareza `hacia` cuando
// pasan `combatesRestantes` combates (ganados o perdidos).
export interface Transformacion {
  ids: string[];
  combatesRestantes: number;
  hacia: Rareza;
}

export interface CambioDeBaratijas {
  baratijas: string[];
  transformaciones: Transformacion[];
}

// Lo que se ve de la mesa al jugar una mano: el mazo entero de la partida
// y cuántas cartas quedan por robar (antes de reponer la mano). Fuera de un
// combate (o en pruebas) puede faltar el resto.
export interface Mesa {
  mazo: readonly Carta[];
  restantes: number;
  baratijas?: number; // cuántas tiene el jugador
  riesgo?: number;
  mundo?: number;
  manosJugadas?: number; // en este combate, antes de esta
  niveles?: Partial<Niveles>;
  memoria?: Memoria;
  propias?: readonly string[]; // los ids de las baratijas del jugador
  oro?: number; // el del jugador ahora
  tipo?: TipoNodo; // del combate
  manosRestantes?: number; // contando la que se juega
  descartesPrevios?: number; // los hechos desde la mano anterior
  azar?: Aleatorio; // para las probabilidades; sin él nunca salen
  suerte?: number; // cuánto se multiplican las probabilidades
}

// Si sale una probabilidad "1 en x" (con la suerte de la mesa).
export function conSuerte(mesa: Mesa, x: number): boolean {
  return !!mesa.azar && mesa.azar() < (mesa.suerte ?? 1) / x;
}

// Cómo terminó un combate, para las baratijas que dan oro al terminar.
export interface ResumenDeCombate {
  gano: boolean;
  tipo: TipoNodo;
  manosRestantes: number;
  descartesRestantes: number;
  descartesUsados: number;
  manosJugadas: number;
}

// Lo que recuerda una baratija (ver "Memoria" arriba) y el de todas.
export type Recuerdo = Readonly<Record<string, number>>;
export type Memoria = Readonly<Record<string, Recuerdo>>;

// Lo que pasa en la partida y las baratijas pueden recordar.
export type Suceso =
  // se jugó una mano; `modificadas`: las cartas modificadas que puntuaron
  | { tipo: 'mano'; mano: TipoMano; total: number; objetivo: number; modificadas?: number }
  | { tipo: 'eliminarCarta' } // en el eliminador
  | { tipo: 'apuesta'; gano: boolean } // se resolvió una apuesta de más de 0
  | { tipo: 'combate'; gano: boolean; descartes?: number }; // terminó un combate, con esos descartes de sobra

function recuerdo(mesa: Mesa, id: string): Recuerdo {
  return mesa.memoria?.[id] ?? {};
}

// La memoria después de que cada baratija recuerde el suceso.
export function recordar(memoria: Memoria, ids: readonly string[], suceso: Suceso): Memoria {
  let nueva = memoria;
  for (const b of baratijasDe(ids)) if (b.recordar) nueva = { ...nueva, [b.id]: b.recordar(nueva[b.id] ?? {}, suceso) };
  return nueva;
}

// Números con coma y hasta 2 decimales, como se escriben en el juego.
export function formatear(numero: number): string {
  return String(Math.round(numero * 100) / 100).replace('.', ',');
}

export const MESA_VACIA: Mesa = { mazo: [], restantes: 0 };

// Lo que cambia las reglas: una baratija o el bono de un set.
export interface Efectos {
  alEmpezarCombate?(inicio: InicioDeCombate, tipo?: TipoNodo): InicioDeCombate;
  alContarCarta?(fichas: number, carta: Carta, mesa: Mesa): number;
  alPuntuarCarta?(mano: ManoPuntuada, carta: Carta, mesa: Mesa): ManoPuntuada;
  alPuntuar?(mano: ManoPuntuada, mesa: Mesa): ManoPuntuada;
  alTerminarCombate?(resumen: ResumenDeCombate): number;
  alFijarObjetivo?(objetivo: number): number;
  alComprar?(precio: number, primera: boolean, riesgo: number): number;
  alVender?(valor: number, baratija: Baratija): number;
  alGanarCombate?(oro: number): number;
  alPerderCombate?(oro: number): number;
  alSortearRareza?(probabilidades: Probabilidades): Probabilidades;
  alLimitarApuesta?(fraccion: number): number;
  alLimitarDeuda?(limite: number, riesgo: number): number;
  alMoverseEnDeuda?(costo: number, deuda: number, riesgo: number): number;
  alResolverApuesta?(oro: number, racha: number): number;
  apuestaBaratijas?: boolean;
  pasarRecompensa?: boolean; // deja pasar la recompensa de un élite
  cripto?: boolean; // el oro sube o baja según predicciones (ver partida.ts)
  venderBaratijas?: boolean; // deja vender baratijas al vendedor
  pintorPersonalizado?: boolean; // el pintor ofrece el servicio Personalizado
  asExtra?: boolean; // un As de más en la mano al empezar cada combate
  faroles?: number; // manos por combate que puntúan como el tipo siguiente
  divinas?: number; // manos por combate que cuentan como escalera de color
  cartasExtra?: number; // cartas de más en la mano
  eco?: number; // veces de más que puntúa la última carta que puntúa
  gemelos?: number; // veces de más que puntúa la segunda carta del primer par
  escaleraCorta?: boolean; // escaleras y colores de 4 cartas
  puente?: boolean; // escaleras que se saltan un número
  sumanTodas?: boolean; // las jugadas que no puntúan también suman sus fichas
  suerte?: number; // multiplica las probabilidades "1 en X"
  verSiguiente?: boolean; // se ve la próxima carta del mazo
  reciclaje?: boolean; // las descartadas vuelven al fondo del mazo
  iman?: boolean; // al robar, primero una del palo que más hay en la mano
  vampiro?: boolean; // las modificadas que puntúan pierden sus modificaciones
  precision?: number; // oro si una mano gana el combate por menos de 10 %
  soborno?: boolean; // se puede sobornar al empezar un combate
  sobornoGratis?: boolean; // el primer soborno de cada mundo es gratis
  seguro?: boolean; // la primera derrota de cada mundo no cuesta oro
  segundaOportunidad?: boolean; // una vez por mundo se repite un combate perdido
  fichaDeLaSuerte?: boolean; // la primera apuesta perdida de cada mundo no cuesta oro
  recompensa?: boolean; // vencer a un élite sube la mano más jugada
  telescopio?: boolean; // Helman O'Grande ofrece la mano más jugada
  trabajosDelPintor?: number; // trabajos de más por visita al pintor
  clonador?: number; // cartas que se duplican al empezar cada mundo
  alquimista?: boolean; // al terminar cada mundo las comunes pasan a infrecuentes
  tesoro?: number; // eventos de más en cada mundo
  coronaDelTahur?: boolean; // contra los jefes se ganan todos los empates
}

export interface Baratija extends Efectos {
  id: string;
  nombre: string;
  descripcion: string;
  rareza: Rareza;
  icono: string; // un símbolo o emoji para dibujarla
  conjunto?: string; // id del set al que pertenece
  // Los efectos que reemplazan a los de arriba cuando un bono de su set
  // tiene potencia.
  potenciados?: Efectos;
  pregunta?: { texto: string; maximo(tiene: readonly string[]): number; opciones?: readonly string[] };
  alElegirNumero?(cambio: CambioDeBaratijas, numero: number, aleatorio: Aleatorio): CambioDeBaratijas;
  recordar?(recuerdo: Recuerdo, suceso: Suceso): Recuerdo;
  estado?(mesa: Mesa): string;
  alConseguir?(mazo: readonly Carta[], aleatorio: Aleatorio): Carta[];
  deJefe?: string; // id del jefe que la da
  rompe?: number; // al terminar cada combate, 1 en `rompe` de perderse
}

// La suma de una marca numérica de los efectos.
export function sumar(efectos: readonly Efectos[], marca: 'eco' | 'gemelos' | 'cartasExtra' | 'divinas' | 'precision' | 'trabajosDelPintor' | 'clonador' | 'tesoro' | 'faroles'): number {
  return efectos.reduce((suma, e) => suma + (e[marca] ?? 0), 0);
}

// Lo que se multiplican las probabilidades "1 en X".
export function suerteDe(efectos: readonly Efectos[]): number {
  return efectos.reduce((suerte, e) => suerte * (e.suerte ?? 1), 1);
}

// --- Ayudas para las baratijas de abajo ---

const FIGURAS = [11, 12, 13];
const PRIMOS = [2, 3, 5, 7, 11, 13];
// Fibonacci: el multiplicador de cada rango.
const FIBONACCI: Partial<Record<number, number>> = { 14: 1, 2: 1, 3: 2, 5: 3, 8: 5 };

const sumarFichas = (mano: ManoPuntuada, n: number): ManoPuntuada => ({ ...mano, fichas: mano.fichas + n });
const sumarMulti = (mano: ManoPuntuada, n: number): ManoPuntuada => ({ ...mano, multi: mano.multi + n });
const porMulti = (mano: ManoPuntuada, n: number): ManoPuntuada => ({ ...mano, multi: mano.multi * n });
const darOro = (mano: ManoPuntuada, n: number): ManoPuntuada => ({ ...mano, oro: mano.oro + n });

// Una mano de esos tipos suma `n` fichas o multi.
function fichasEn(tipos: readonly TipoMano[], n: number): (mano: ManoPuntuada) => ManoPuntuada {
  return (mano) => (tipos.includes(mano.tipo) ? sumarFichas(mano, n) : mano);
}
function multiEn(tipos: readonly TipoMano[], n: number): (mano: ManoPuntuada) => ManoPuntuada {
  return (mano) => (tipos.includes(mano.tipo) ? sumarMulti(mano, n) : mano);
}

// Cuenta las manos jugadas (Callo, Recompensa, Telescopio).
function contarManos(r: Recuerdo, s: Suceso): Recuerdo {
  return s.tipo === 'mano' ? { ...r, [s.mano]: (r[s.mano] ?? 0) + 1 } : r;
}

// La mano más jugada según lo que contó una baratija (la primera si empatan).
export function manoMasJugada(memoria: Memoria, id: string): TipoMano | null {
  return masJugadas(memoria[id] ?? {}).tipos[0] ?? null;
}

// Realeza: K, Q o J (con el set completo, cualquier figura).
const esFigura = (rango: number) => (carta: Carta) => carta.rango === rango;
const figura = (carta: Carta) => FIGURAS.includes(carta.rango);

function reyDeRealeza(es: (c: Carta) => boolean): Efectos['alPuntuarCarta'] {
  return (mano, carta) => (es(carta) ? sumarMulti(mano, 3) : mano);
}
function reinaDeRealeza(es: (c: Carta) => boolean): Efectos['alPuntuarCarta'] {
  return (mano, carta) => (es(carta) ? sumarFichas(mano, 20) : mano);
}
function jotaDeRealeza(es: (c: Carta) => boolean): Efectos['alPuntuarCarta'] {
  return (mano, carta, mesa) => (es(carta) && conSuerte(mesa, 4) ? darOro(mano, 25) : mano);
}

// Ordenado: las cartas jugadas, en el orden en que se eligieron, de rango
// cada vez más alto.
function ordenado(factor: number): Efectos['alPuntuar'] {
  return (mano) => {
    const rangos = mano.cartasJugadas.map((c) => c.rango);
    const sube = rangos.length >= 2 && rangos.every((r, i) => i === 0 || r > rangos[i - 1]!);
    return sube ? porMulti(mano, factor) : mano;
  };
}

// Gemelo malvado: la última baratija conseguida que no es él.
export const GEMELO = 'gemelo-malvado';
export function copiaDelGemelo(ids: readonly string[]): Baratija | null {
  if (!ids.includes(GEMELO)) return null;
  const id = [...ids].reverse().find((otra) => otra !== GEMELO && CATALOGO.some((b) => b.id === otra));
  return id ? buscarBaratija(id) : null;
}

// Soborno: lo que cuesta (parte del oro) y lo que baja el objetivo.
export const COSTO_SOBORNO = 0.1;
export const REBAJA_SOBORNO = 0.15;

// Callo: la mano más jugada (o las empatadas) y cuántas veces.
function masJugadas(r: Recuerdo): { tipos: TipoMano[]; veces: number } {
  const veces = Math.max(0, ...TIPOS_DE_MANO.map((t) => r[t] ?? 0));
  return { tipos: veces > 0 ? TIPOS_DE_MANO.filter((t) => (r[t] ?? 0) === veces) : [], veces };
}
const FICHAS_POR_CALLO = 2;

// Ruleta de la suerte: el multiplicador según las apuestas ganadas y
// perdidas, sin bajar de ×0,25.
function factorDeRuleta(r: Recuerdo): number {
  return Math.max(0.25, 1 + 0.1 * (r.ganadas ?? 0) - 0.2 * (r.perdidas ?? 0));
}

// Bola de nieve: ×1 más ×0,25 por cada mano que llegó sola al objetivo.
function factorDeBola(r: Recuerdo): number {
  return 1 + 0.25 * (r.golpes ?? 0);
}

// Obra maestra: ×1 más ×0,2 por cada carta modificada del mazo.
function factorDeObra(mesa: Mesa): number {
  return 1 + 0.2 * mesa.mazo.filter((c) => modificacionesDe(c) > 0).length;
}

// Especialista: la mano elegida (sin elegir, ninguna) y lo que multiplica
// según su nivel: ×1,5, ×2 en el nivel 2 y ×3 desde el 3. Las demás
// pierden la mitad de lo que gana ella (×0,75, ×0,5 y ×0).
function especialidad(mesa: Mesa): { tipo: TipoMano; factor: number; resto: number } | null {
  const eleccion = recuerdo(mesa, 'especialista').eleccion;
  const tipo = eleccion ? TIPOS_DE_MANO[eleccion - 1] : undefined;
  if (!tipo) return null;
  const nivel = mesa.niveles?.[tipo] ?? 1;
  const factor = nivel >= 3 ? 3 : nivel === 2 ? 2 : 1.5;
  return { tipo, factor, resto: Math.max(0, 1 - (factor - 1) / 2) };
}

// Fichas al fuego: la primera mano de cada combate ×3, +×1 por cada mundo
// vencido.
function factorDeFuego(mesa: Mesa): number {
  return 3 + Math.max(0, (mesa.mundo ?? 1) - 1);
}
const FICHAS_POR_RIESGO = 10;

// Estético: con cartas rojas y negras en el mazo, las fichas de cada carta
// ×0,5 elevado a la potencia; con un solo color, igual; con un solo palo,
// ×(1 + 0,25 × potencia).
function estetico(potencia: number): (fichas: number, carta: Carta, mesa: Mesa) => number {
  return (fichas, _carta, { mazo }) => {
    if (mazo.length === 0) return fichas;
    const palos = new Set(mazo.map((c) => c.palo));
    const colores = new Set(mazo.map((c) => (c.palo === 'corazones' || c.palo === 'diamantes' ? 'rojo' : 'negro')));
    if (colores.size > 1) return Math.round(fichas / 2 ** potencia);
    if (palos.size > 1) return fichas;
    return Math.round(fichas * (1 + 0.25 * potencia));
  };
}

// Simétrico: con un número par de cartas por robar, la mano suma ese número
// × potencia a sus fichas; con uno impar, le resta ese número × potencia
// (sin bajar de 0).
function simetrico(potencia: number): (mano: ManoPuntuada, mesa: Mesa) => ManoPuntuada {
  return (mano, { restantes }) => ({
    ...mano,
    fichas: restantes % 2 === 0 ? mano.fichas + restantes * potencia : Math.max(0, mano.fichas - restantes * potencia),
  });
}

// Las fichas de las cartas de un palo ×1,5 y las de otro a la mitad,
// redondeando; sin `castigo` (con el bono de su set), las del otro quedan igual.
function cambiarPalos(sube: Palo, baja: Palo, castigo = true): (fichas: number, carta: Carta) => number {
  return (fichas, carta) => (esDePalo(carta, sube) ? Math.round(fichas * 1.5) : castigo && esDePalo(carta, baja) ? Math.round(fichas / 2) : fichas);
}

export const CATALOGO: readonly Baratija[] = [
  {
    id: 'materialista',
    nombre: 'Materialista',
    descripcion: 'Las cartas de ♥ valen la mitad de fichas y las de ♦, 1,5 veces más.',
    rareza: 'comun',
    icono: '💰',
    conjunto: 'caridad',
    alContarCarta: cambiarPalos('diamantes', 'corazones'),
    potenciados: { alContarCarta: cambiarPalos('diamantes', 'corazones', false) },
  },
  {
    id: 'altruista',
    nombre: 'Altruista',
    descripcion: 'Las cartas de ♦ valen la mitad de fichas y las de ♥, 1,5 veces más.',
    rareza: 'comun',
    icono: '💝',
    conjunto: 'caridad',
    alContarCarta: cambiarPalos('corazones', 'diamantes'),
    potenciados: { alContarCarta: cambiarPalos('corazones', 'diamantes', false) },
  },
  {
    id: 'flower-power',
    nombre: 'El poder de las flores',
    descripcion: 'Las cartas de ♠ valen la mitad de fichas y las de ♣, 1,5 veces más.',
    rareza: 'comun',
    icono: '🌸',
    conjunto: 'jardin',
    alContarCarta: cambiarPalos('treboles', 'picas'),
    potenciados: { alContarCarta: cambiarPalos('treboles', 'picas', false) },
  },
  {
    id: 'grass-mower',
    nombre: 'Corta hierbas',
    descripcion: 'Las cartas de ♣ valen la mitad de fichas y las de ♠, 1,5 veces más.',
    rareza: 'comun',
    icono: '🚜',
    conjunto: 'jardin',
    alContarCarta: cambiarPalos('picas', 'treboles'),
    potenciados: { alContarCarta: cambiarPalos('picas', 'treboles', false) },
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
    id: 'no-gracias',
    nombre: 'No gracias',
    descripcion: 'Puedes pasar la recompensa de un élite y llevarte oro en su lugar. Sin ella, hay que elegir.',
    rareza: 'comun',
    icono: '🙅',
    pasarRecompensa: true,
  },
  {
    id: 'claire-obscure',
    nombre: 'Claire obscure',
    descripcion: 'El pintor también ofrece "Personalizado": eliges el modificador y la carta, de todo tu mazo.',
    rareza: 'rara',
    icono: '🎨',
    conjunto: 'artista',
    pintorPersonalizado: true,
  },
  {
    id: 'broker',
    nombre: 'Bróker',
    descripcion: 'Puedes venderle tus baratijas al vendedor por la mitad de su precio.',
    rareza: 'infrecuente',
    icono: '📈',
    venderBaratijas: true,
  },
  {
    id: 'diversidad',
    nombre: 'Diversidad',
    descripcion: 'Multiplica por 4 el multiplicador si la mano jugada tiene al menos una carta de cada palo.',
    rareza: 'rara',
    icono: '🎨',
    alPuntuar: (mano) => {
      const fijas = mano.cartasJugadas.filter((c) => !c.comodin);
      const palos = new Set(fijas.map((c) => c.palo)).size + mano.cartasJugadas.length - fijas.length;
      return palos >= 4 ? { ...mano, multi: mano.multi * 4 } : mano;
    },
  },
  {
    id: 'all-in',
    nombre: 'All In',
    descripcion: 'Puedes apostar todo tu oro al empezar un combate, no solo la mitad.',
    rareza: 'rara',
    icono: '🎰',
    conjunto: 'apostador-empedernido',
    alLimitarApuesta: () => 1,
  },
  {
    id: 'tasador',
    nombre: 'Tasador',
    descripcion: 'Puedes apostar tus baratijas por su valor de venta; si pierdes la apuesta, las pierdes.',
    rareza: 'rara',
    icono: '🔍',
    conjunto: 'apostador-empedernido',
    apuestaBaratijas: true,
  },
  {
    id: 'racha',
    nombre: 'Racha',
    descripcion: 'Cada combate de tu racha (ganando o perdiendo) suma 10\u00a0% a la apuesta si sigue.',
    rareza: 'infrecuente',
    icono: '🔥',
    conjunto: 'apostador-empedernido',
    alResolverApuesta: (oro, racha) => (Math.sign(oro) === Math.sign(racha) ? Math.sign(oro) * Math.round((Math.abs(oro) * (10 + Math.abs(racha))) / 10) : oro),
  },
  {
    id: 'estetico',
    nombre: 'Estético',
    descripcion: 'Mazo de un solo palo: cartas ×1,25 de fichas. De un color: igual. Con rojas y negras: ×0,5.',
    rareza: 'infrecuente',
    icono: '🎀',
    conjunto: 'toc-toc-toc',
    alContarCarta: estetico(1),
    potenciados: { alContarCarta: estetico(2) },
  },
  {
    id: 'simetrico',
    nombre: 'Simétrico',
    descripcion: 'Cartas por robar en número par: la mano suma esa cantidad de fichas. En impar, la resta.',
    rareza: 'infrecuente',
    icono: '🪞',
    conjunto: 'toc-toc-toc',
    alPuntuar: simetrico(1),
    potenciados: { alPuntuar: simetrico(2) },
  },
  {
    id: 'callo',
    nombre: 'Callo',
    descripcion: `Cada vez que juegas tu mano más jugada, esa mano suma +${FICHAS_POR_CALLO} fichas para siempre.`,
    rareza: 'infrecuente',
    icono: '🖐',
    recordar: contarManos,
    alPuntuar: (mano, mesa) => {
      const { tipos, veces } = masJugadas(recuerdo(mesa, 'callo'));
      return tipos.includes(mano.tipo) ? { ...mano, fichas: mano.fichas + FICHAS_POR_CALLO * veces } : mano;
    },
    estado: (mesa) => {
      const { tipos, veces } = masJugadas(recuerdo(mesa, 'callo'));
      return tipos.length === 0 ? 'Ahora: nada' : `Ahora: ${MANOS[tipos[0]!].nombre}${tipos.length > 1 ? ' y otras' : ''} +${FICHAS_POR_CALLO * veces}`;
    },
  },
  {
    id: 'coleccionista',
    nombre: 'Coleccionista',
    descripcion: '+0,5 al multiplicador por cada baratija que tengas.',
    rareza: 'infrecuente',
    icono: '🧸',
    alPuntuar: (mano, mesa) => ({ ...mano, multi: mano.multi + 0.5 * (mesa.baratijas ?? 0) }),
    estado: (mesa) => `Ahora: +${formatear(0.5 * (mesa.baratijas ?? 0))} multi`,
  },
  {
    id: 'veterano',
    nombre: 'Veterano',
    descripcion: `+${FICHAS_POR_RIESGO} fichas por cada nivel de riesgo.`,
    rareza: 'infrecuente',
    icono: '🎖',
    alPuntuar: (mano, mesa) => ({ ...mano, fichas: mano.fichas + FICHAS_POR_RIESGO * (mesa.riesgo ?? 0) }),
    estado: (mesa) => `Ahora: +${FICHAS_POR_RIESGO * (mesa.riesgo ?? 0)} fichas`,
  },
  {
    id: 'minimalista',
    nombre: 'Minimalista',
    descripcion: '+3 al multiplicador por cada carta que elimines con Edmundo manos de cinceles.',
    rareza: 'infrecuente',
    icono: '🪶',
    recordar: (r, s) => (s.tipo === 'eliminarCarta' ? { ...r, cartas: (r.cartas ?? 0) + 1 } : r),
    alPuntuar: (mano, mesa) => ({ ...mano, multi: mano.multi + 3 * (recuerdo(mesa, 'minimalista').cartas ?? 0) }),
    estado: (mesa) => `Ahora: +${3 * (recuerdo(mesa, 'minimalista').cartas ?? 0)} multi`,
  },
  {
    id: 'ruleta-de-la-suerte',
    nombre: 'Ruleta de la suerte',
    descripcion: 'Multi ×0,1 más por apuesta ganada y ×0,2 menos por apuesta perdida (mínimo ×0,25).',
    rareza: 'rara',
    icono: '🎡',
    conjunto: 'apostador-empedernido',
    recordar: (r, s) => (s.tipo === 'apuesta' ? (s.gano ? { ...r, ganadas: (r.ganadas ?? 0) + 1 } : { ...r, perdidas: (r.perdidas ?? 0) + 1 }) : r),
    alPuntuar: (mano, mesa) => ({ ...mano, multi: mano.multi * factorDeRuleta(recuerdo(mesa, 'ruleta-de-la-suerte')) }),
    estado: (mesa) => `Ahora: ×${formatear(factorDeRuleta(recuerdo(mesa, 'ruleta-de-la-suerte')))}`,
  },
  {
    id: 'bola-de-nieve',
    nombre: 'Bola de nieve',
    descripcion: 'Multi ×0,25 más por cada mano que llega sola al objetivo. Perder un combate lo reinicia.',
    rareza: 'rara',
    icono: '❄',
    recordar: (r, s) => {
      if (s.tipo === 'mano' && s.total >= s.objetivo) return { ...r, golpes: (r.golpes ?? 0) + 1 };
      if (s.tipo === 'combate' && !s.gano) return { ...r, golpes: 0 };
      return r;
    },
    alPuntuar: (mano, mesa) => ({ ...mano, multi: mano.multi * factorDeBola(recuerdo(mesa, 'bola-de-nieve')) }),
    estado: (mesa) => `Ahora: ×${formatear(factorDeBola(recuerdo(mesa, 'bola-de-nieve')))}`,
  },
  {
    id: 'obra-maestra',
    nombre: 'Obra maestra',
    descripcion: 'Multi ×0,2 más por cada carta modificada de tu mazo.',
    rareza: 'rara',
    icono: '🖼',
    conjunto: 'artista',
    alPuntuar: (mano, mesa) => ({ ...mano, multi: mano.multi * factorDeObra(mesa) }),
    estado: (mesa) => `Ahora: ×${formatear(factorDeObra(mesa))}`,
  },
  {
    id: 'especialista',
    nombre: 'Especialista',
    descripcion: 'Eliges una mano: multi ×1,5, ×2 en nivel 2 y ×3 desde el 3. Las demás pierden la mitad de eso.',
    rareza: 'rara',
    icono: '🎯',
    pregunta: {
      texto: '¿En qué mano te especializas?',
      maximo: () => TIPOS_DE_MANO.length,
      opciones: TIPOS_DE_MANO.map((t) => MANOS[t].nombre),
    },
    alPuntuar: (mano, mesa) => {
      const especial = especialidad(mesa);
      if (!especial) return mano;
      return { ...mano, multi: mano.multi * (mano.tipo === especial.tipo ? especial.factor : especial.resto) };
    },
    estado: (mesa) => {
      const especial = especialidad(mesa);
      return especial ? `${MANOS[especial.tipo].nombre} ×${formatear(especial.factor)} · resto ×${formatear(especial.resto)}` : 'Sin mano elegida';
    },
  },
  {
    id: 'fichas-al-fuego',
    nombre: 'Fichas al fuego',
    descripcion: 'La primera mano de cada combate tiene multi ×3, y ×1 más por cada mundo vencido.',
    rareza: 'rara',
    icono: '🧨',
    alPuntuar: (mano, mesa) => (mesa.manosJugadas === 0 ? { ...mano, multi: mano.multi * factorDeFuego(mesa) } : mano),
    estado: (mesa) => `Ahora: ×${factorDeFuego(mesa)}`,
  },
  {
    id: 'as-bajo-la-manga',
    nombre: 'As bajo la manga',
    descripcion: 'Cada combate empieza con un As de más en la mano. Al terminar el combate desaparece.',
    rareza: 'infrecuente',
    icono: '🂡',
    deJefe: 'tahur',
    asExtra: true,
  },
  {
    id: 'faroleo',
    nombre: 'Faroleo',
    descripcion: 'Una vez por combate, una mano puntúa como el tipo siguiente (par → doble par, color → full…).',
    rareza: 'infrecuente',
    icono: '🎭',
    deJefe: 'tahur',
    faroles: 1,
  },
  {
    id: 'mazo-limpio',
    nombre: 'Mazo limpio',
    descripcion: 'Al conseguirla se van de tu mazo todos los 2, 3 y 4.',
    rareza: 'infrecuente',
    icono: '🧹',
    deJefe: 'tahur',
    alConseguir: (mazo) => {
      const limpio = mazo.filter((c) => c.rango > 4);
      return limpio.length > 0 ? limpio : [...mazo];
    },
  },
  {
    id: 'tarjeta-de-credito',
    nombre: 'Tarjeta de crédito',
    descripcion: 'Puedes deber hasta riesgo × 100 de oro. En deuda, cada paso en el mapa cuesta riesgo × 10 % de lo que debes.',
    rareza: 'legendaria',
    icono: '💳',
    alLimitarDeuda: (limite, riesgo) => Math.max(limite, riesgo * 100),
    alMoverseEnDeuda: (costo, deuda, riesgo) => costo + Math.ceil((deuda * riesgo * 10) / 100),
  },
  {
    id: 'crypto-monedas',
    nombre: 'Crypto monedas',
    descripcion: 'Cada paso predice si tu oro sube o baja. A los 2 pasos se cumple: hasta ±200\u00a0%, casi siempre menos.',
    rareza: 'legendaria',
    icono: '🪙',
    cripto: true,
  },
  {
    id: 'de-zero-a-heroe',
    nombre: 'De zero a héroe',
    descripcion: 'Al conseguirla, eliges cuántas de tus raras se vuelven comunes al azar. Tras el doble de combates, esas pasan a legendarias.',
    rareza: 'legendaria',
    icono: '🦸',
    pregunta: {
      texto: '¿Cuántas de tus baratijas raras se vuelven comunes?',
      maximo: (tiene) => baratijasDe(tiene).filter((b) => b.rareza === 'rara').length,
    },
    alElegirNumero: ({ baratijas, transformaciones }, numero, aleatorio) => {
      const raras = barajar(baratijasDe(baratijas).filter((b) => b.rareza === 'rara'), aleatorio).slice(0, numero);
      let nuevas = [...baratijas];
      const comunes: string[] = [];
      for (const rara of raras) {
        const comun = sortearDeRareza(aleatorio, 'comun', nuevas);
        nuevas = comun ? nuevas.map((id) => (id === rara.id ? comun : id)) : nuevas.filter((id) => id !== rara.id);
        if (comun) comunes.push(comun);
      }
      return { baratijas: nuevas, transformaciones: [...transformaciones, { ids: comunes, combatesRestantes: numero * 2, hacia: 'legendaria' }] };
    },
  },

  // --- Sets nuevos (Realeza, Bajos fondos, Supersticioso, Matemático,
  // Torneo, Tiempo, Jardín, Caridad) y las que se suman a los de antes ---
  {
    id: 'el-rey',
    nombre: 'El Rey',
    descripcion: 'Las K que puntúan dan +3 multi.',
    rareza: 'infrecuente',
    icono: '👑',
    conjunto: 'realeza',
    alPuntuarCarta: reyDeRealeza(esFigura(13)),
    potenciados: { alPuntuarCarta: reyDeRealeza(figura) },
  },
  {
    id: 'la-reina',
    nombre: 'La Reina',
    descripcion: 'Las Q que puntúan dan +20 fichas.',
    rareza: 'infrecuente',
    icono: '👸',
    conjunto: 'realeza',
    alPuntuarCarta: reinaDeRealeza(esFigura(12)),
    potenciados: { alPuntuarCarta: reinaDeRealeza(figura) },
  },
  {
    id: 'la-jota',
    nombre: 'La Jota',
    descripcion: 'Cada J que puntúa tiene 1 en 4 de dar 25 de oro.',
    rareza: 'infrecuente',
    icono: '🤴',
    conjunto: 'realeza',
    alPuntuarCarta: jotaDeRealeza(esFigura(11)),
    potenciados: { alPuntuarCarta: jotaDeRealeza(figura) },
  },
  {
    id: 'cobro-de-piso',
    nombre: 'Cobro de piso',
    descripcion: '+25 de oro por cada combate ganado sin descartar.',
    rareza: 'comun',
    icono: '🧱',
    conjunto: 'bajos-fondos',
    alTerminarCombate: (r) => (r.gano && r.descartesUsados === 0 ? 25 : 0),
  },
  {
    id: 'soborno',
    nombre: 'Soborno',
    descripcion: `Al empezar un combate puedes pagar ${Math.round(COSTO_SOBORNO * 100)}\u00a0% de tu oro para bajar el objetivo ${Math.round(REBAJA_SOBORNO * 100)}\u00a0%.`,
    rareza: 'infrecuente',
    icono: '🤝',
    conjunto: 'bajos-fondos',
    soborno: true,
  },
  {
    id: 'lavado-de-dinero',
    nombre: 'Lavado de dinero',
    descripcion: 'El vendedor paga el precio completo por tus comunes.',
    rareza: 'rara',
    icono: '🧼',
    conjunto: 'bajos-fondos',
    alVender: (valor, baratija) => (baratija.rareza === 'comun' ? precioDe(baratija) : valor),
  },
  {
    id: 'trebol-de-cuatro-hojas',
    nombre: 'Trébol de cuatro hojas',
    descripcion: 'Las cartas de ♣ que puntúan dan +1 multi.',
    rareza: 'comun',
    icono: '🍀',
    conjunto: 'supersticioso',
    alPuntuarCarta: (mano, carta) => (esDePalo(carta, 'treboles') ? sumarMulti(mano, 1) : mano),
  },
  {
    id: 'gato-negro',
    nombre: 'Gato negro',
    descripcion: 'Cada ♠ que puntúa tiene 1 en 7 de dar ×2 multi.',
    rareza: 'infrecuente',
    icono: '🐈',
    conjunto: 'supersticioso',
    alPuntuarCarta: (mano, carta, mesa) => (esDePalo(carta, 'picas') && conSuerte(mesa, 7) ? porMulti(mano, 2) : mano),
  },
  {
    id: 'martes-13',
    nombre: 'Martes 13',
    descripcion: 'Si quedan exactamente 13 cartas por robar, ×3 multi.',
    rareza: 'infrecuente',
    icono: '📅',
    conjunto: 'supersticioso',
    alPuntuar: (mano, mesa) => (mesa.restantes === 13 ? porMulti(mano, 3) : mano),
  },
  {
    id: 'espejo-roto',
    nombre: 'Espejo roto',
    descripcion: '×2 multi siempre, pero en cada combate tiene 1 en 7 de romperse y perderse.',
    rareza: 'rara',
    icono: '💔',
    conjunto: 'supersticioso',
    alPuntuar: (mano) => porMulti(mano, 2),
    rompe: 7,
  },
  {
    id: 'par-perfecto',
    nombre: 'Par perfecto',
    descripcion: 'Los pares dan +15 fichas.',
    rareza: 'comun',
    icono: '➗',
    conjunto: 'matematico',
    alPuntuar: fichasEn(['par'], 15),
  },
  {
    id: 'numeros-primos',
    nombre: 'Números primos',
    descripcion: 'Las cartas 2, 3, 5, 7, J (11) y K (13) que puntúan dan +2 multi.',
    rareza: 'infrecuente',
    icono: '🔢',
    conjunto: 'matematico',
    alPuntuarCarta: (mano, carta) => (PRIMOS.includes(carta.rango) ? sumarMulti(mano, 2) : mano),
  },
  {
    id: 'pi',
    nombre: 'Pi',
    descripcion: 'Si juegas exactamente 3 cartas, +3,14 multi.',
    rareza: 'infrecuente',
    icono: '🥧',
    conjunto: 'matematico',
    alPuntuar: (mano) => (mano.cartasJugadas.length === 3 ? sumarMulti(mano, 3.14) : mano),
  },
  {
    id: 'fibonacci',
    nombre: 'Fibonacci',
    descripcion: 'Las cartas A, 2, 3, 5 y 8 que puntúan dan +1, +1, +2, +3 y +5 multi en ese orden dentro de la mano.',
    rareza: 'rara',
    icono: '🐚',
    conjunto: 'matematico',
    alPuntuarCarta: (mano, carta) => sumarMulti(mano, FIBONACCI[carta.rango] ?? 0),
  },
  {
    id: 'ciega-pequena',
    nombre: 'Ciega pequeña',
    descripcion: 'La primera mano de cada combate da +10 × riesgo fichas.',
    rareza: 'comun',
    icono: '🔹',
    conjunto: 'torneo',
    alPuntuar: (mano, mesa) => (mesa.manosJugadas === 0 ? sumarFichas(mano, 10 * (mesa.riesgo ?? 0)) : mano),
    estado: (mesa) => `Ahora: +${10 * (mesa.riesgo ?? 0)} fichas`,
  },
  {
    id: 'ciega-grande',
    nombre: 'Ciega grande',
    descripcion: 'La última mano de cada combate da ×2 multi.',
    rareza: 'infrecuente',
    icono: '🔷',
    conjunto: 'torneo',
    alPuntuar: (mano, mesa) => (mesa.manosRestantes === 1 ? porMulti(mano, 2) : mano),
  },
  {
    id: 'boton-del-crupier',
    nombre: 'Botón del crupier',
    descripcion: '+1 mano en élites y jefes.',
    rareza: 'infrecuente',
    icono: '🔘',
    conjunto: 'torneo',
    alEmpezarCombate: (inicio, tipo) => (tipo === 'elite' || tipo === 'jefe' ? { ...inicio, manos: inicio.manos + 1 } : inicio),
  },
  {
    id: 'paciencia',
    nombre: 'Paciencia',
    descripcion: '+2 descartes, −1 mano.',
    rareza: 'comun',
    icono: '🐢',
    conjunto: 'tiempo',
    alEmpezarCombate: (inicio) => ({ manos: inicio.manos - 1, descartes: inicio.descartes + 2 }),
  },
  {
    id: 'prisa',
    nombre: 'Prisa',
    descripcion: 'Si ganas con la primera mano, +100 de oro.',
    rareza: 'infrecuente',
    icono: '🐇',
    conjunto: 'tiempo',
    alTerminarCombate: (r) => (r.gano && r.manosJugadas === 1 ? 100 : 0),
  },
  {
    id: 'reloj-de-arena',
    nombre: 'Reloj de arena',
    descripcion: 'Cada descarte que te sobra al ganar suma +1 multi para el resto de la partida.',
    rareza: 'rara',
    icono: '⏳',
    conjunto: 'tiempo',
    recordar: (r, s) => (s.tipo === 'combate' && s.gano ? { ...r, multi: (r.multi ?? 0) + (s.descartes ?? 0) } : r),
    alPuntuar: (mano, mesa) => sumarMulti(mano, recuerdo(mesa, 'reloj-de-arena').multi ?? 0),
    estado: (mesa) => `Ahora: +${recuerdo(mesa, 'reloj-de-arena').multi ?? 0} multi`,
  },
  {
    id: 'jardinero',
    nombre: 'Jardinero',
    descripcion: 'Las cartas de ♣ y ♠ que puntúan dan +5 fichas.',
    rareza: 'comun',
    icono: '🌱',
    conjunto: 'jardin',
    alContarCarta: (fichas, carta) => (esDePalo(carta, 'treboles') || esDePalo(carta, 'picas') ? fichas + 5 : fichas),
  },
  {
    id: 'robin-hood',
    nombre: 'Robin Hood',
    descripcion: 'Las cartas de ♥ y ♦ que puntúan dan +5 fichas.',
    rareza: 'comun',
    icono: '🏹',
    conjunto: 'caridad',
    alContarCarta: (fichas, carta) => (esDePalo(carta, 'corazones') || esDePalo(carta, 'diamantes') ? fichas + 5 : fichas),
  },
  {
    id: 'ordenado',
    nombre: 'Ordenado',
    descripcion: 'Si las cartas jugadas van en orden ascendente, ×2 multi (×3 con el set completo).',
    rareza: 'infrecuente',
    icono: '🗂',
    conjunto: 'toc-toc-toc',
    alPuntuar: ordenado(2),
    potenciados: { alPuntuar: ordenado(3) },
  },
  {
    id: 'ficha-de-la-suerte',
    nombre: 'Ficha de la suerte',
    descripcion: 'La primera apuesta perdida de cada mundo no cuesta oro.',
    rareza: 'infrecuente',
    icono: '🎲',
    conjunto: 'apostador-empedernido',
    fichaDeLaSuerte: true,
  },
  {
    id: 'paleta',
    nombre: 'Paleta',
    descripcion: 'El pintor te deja modificar 2 cartas por visita.',
    rareza: 'infrecuente',
    icono: '🖍',
    conjunto: 'artista',
    trabajosDelPintor: 1,
  },
  {
    id: 'lienzo-en-blanco',
    nombre: 'Lienzo en blanco',
    descripcion: 'Cada carta sin modificar que puntúa da +3 fichas.',
    rareza: 'comun',
    icono: '⬜',
    conjunto: 'artista',
    alContarCarta: (fichas, carta) => (modificacionesDe(carta) === 0 ? fichas + 3 : fichas),
  },

  // --- Comunes ---
  {
    id: 'mano-de-hierro',
    nombre: 'Mano de hierro',
    descripcion: '+1 mano, −1 descarte.',
    rareza: 'comun',
    icono: '🦾',
    alEmpezarCombate: (inicio) => ({ manos: inicio.manos + 1, descartes: inicio.descartes - 1 }),
  },
  {
    id: 'calcetin-de-la-suerte',
    nombre: 'Calcetín de la suerte',
    descripcion: 'Las cartas 7 que puntúan dan +5 fichas.',
    rareza: 'comun',
    icono: '🧦',
    alContarCarta: (fichas, carta) => (carta.rango === 7 ? fichas + 5 : fichas),
  },
  {
    id: 'parejita',
    nombre: 'Parejita',
    descripcion: 'Los pares dan +2 multi.',
    rareza: 'comun',
    icono: '💑',
    alPuntuar: multiEn(['par'], 2),
  },
  {
    id: 'a-la-tercera-va-la-vencida',
    nombre: 'A la tercera va la vencida',
    descripcion: 'Los tríos dan +20 fichas.',
    rareza: 'comun',
    icono: '🥉',
    alPuntuar: fichasEn(['trio'], 20),
  },
  {
    id: 'escalera-de-mano',
    nombre: 'Escalera de mano',
    descripcion: 'Las escaleras dan +3 multi.',
    rareza: 'comun',
    icono: '🪜',
    alPuntuar: multiEn(['escalera', 'escaleraColor'], 3),
  },
  {
    id: 'brocha-gorda',
    nombre: 'Brocha gorda',
    descripcion: 'Los colores dan +25 fichas.',
    rareza: 'comun',
    icono: '🪣',
    alPuntuar: fichasEn(['color', 'escaleraColor'], 25),
  },
  {
    id: 'casa-llena',
    nombre: 'Casa llena',
    descripcion: 'Los full dan +3 multi.',
    rareza: 'comun',
    icono: '🏠',
    alPuntuar: multiEn(['full'], 3),
  },
  {
    id: 'solitario',
    nombre: 'Solitario',
    descripcion: 'Si juegas una sola carta, ×3 multi.',
    rareza: 'comun',
    icono: '🧍',
    alPuntuar: (mano) => (mano.cartasJugadas.length === 1 ? porMulti(mano, 3) : mano),
  },
  {
    id: 'calderilla',
    nombre: 'Calderilla',
    descripcion: 'Cada carta 2 que puntúa da 5 de oro.',
    rareza: 'comun',
    icono: '💴',
    alPuntuarCarta: (mano, carta) => (carta.rango === 2 ? darOro(mano, 5) : mano),
  },
  {
    id: 'propina',
    nombre: 'Propina',
    descripcion: 'Al ganar, cada mano que te sobra da 10 de oro.',
    rareza: 'comun',
    icono: '💶',
    alTerminarCombate: (r) => (r.gano ? 10 * r.manosRestantes : 0),
  },
  {
    id: 'descarte-rapido',
    nombre: 'Descarte rápido',
    descripcion: 'Cada descarte suma +2 fichas a la siguiente mano.',
    rareza: 'comun',
    icono: '💨',
    alPuntuar: (mano, mesa) => sumarFichas(mano, 2 * (mesa.descartesPrevios ?? 0)),
  },
  {
    id: 'cartas-marcadas',
    nombre: 'Cartas marcadas',
    descripcion: 'Ves la próxima carta del mazo.',
    rareza: 'comun',
    icono: '👁',
    verSiguiente: true,
  },
  {
    id: 'cupon',
    nombre: 'Cupón',
    descripcion: 'La primera compra en cada tienda cuesta 25\u00a0% menos.',
    rareza: 'comun',
    icono: '🎟',
    alComprar: (precio, primera) => (primera ? precio * 0.75 : precio),
  },
  {
    id: 'mapa-del-tesoro',
    nombre: 'Mapa del tesoro',
    descripcion: '+1 evento en cada mundo.',
    rareza: 'comun',
    icono: '🗺',
    tesoro: 1,
  },

  // --- Infrecuentes ---
  {
    id: 'cuenta-atras',
    nombre: 'Cuenta atrás',
    descripcion: '−1 mano, pero cada mano da ×1,5 multi.',
    rareza: 'infrecuente',
    icono: '⏱',
    alEmpezarCombate: (inicio) => ({ ...inicio, manos: inicio.manos - 1 }),
    alPuntuar: (mano) => porMulti(mano, 1.5),
  },
  {
    id: 'reciclaje',
    nombre: 'Reciclaje',
    descripcion: 'Las cartas descartadas vuelven al fondo del mazo.',
    rareza: 'infrecuente',
    icono: '♻',
    reciclaje: true,
  },
  {
    id: 'eco',
    nombre: 'Eco',
    descripcion: 'La última carta que puntúa en cada mano puntúa dos veces.',
    rareza: 'infrecuente',
    icono: '🔊',
    eco: 1,
  },
  {
    id: 'doble-filo',
    nombre: 'Doble filo',
    descripcion: 'Las cartas con modificador de fichas también dan +1 multi.',
    rareza: 'infrecuente',
    icono: '🗡',
    alPuntuarCarta: (mano, carta) => ((carta.modificaciones?.fichas ?? 0) > 0 ? sumarMulti(mano, 1) : mano),
  },
  {
    id: 'monocromo',
    nombre: 'Monocromo',
    descripcion: 'Si todas las cartas jugadas son del mismo color, +4 multi.',
    rareza: 'infrecuente',
    icono: '⚫',
    alPuntuar: (mano) => (mismoColor(mano.cartasJugadas) ? sumarMulti(mano, 4) : mano),
  },
  {
    id: 'escalera-corta',
    nombre: 'Escalera corta',
    descripcion: 'Las escaleras y los colores se pueden hacer con 4 cartas.',
    rareza: 'infrecuente',
    icono: '📏',
    escaleraCorta: true,
  },
  {
    id: 'puente',
    nombre: 'Puente',
    descripcion: 'Las escaleras pueden saltarse un número (3-4-6-7-8).',
    rareza: 'infrecuente',
    icono: '🌉',
    puente: true,
  },
  {
    id: 'arqueologo',
    nombre: 'Arqueólogo',
    descripcion: 'Las cartas del 2 al 5 que puntúan dan el doble de fichas.',
    rareza: 'infrecuente',
    icono: '🦴',
    alContarCarta: (fichas, carta) => (carta.rango <= 5 ? fichas * 2 : fichas),
  },
  {
    id: 'gemelos',
    nombre: 'Gemelos',
    descripcion: 'En una mano con par, la segunda carta del par puntúa dos veces.',
    rareza: 'infrecuente',
    icono: '👯',
    gemelos: 1,
  },
  {
    id: 'inversion',
    nombre: 'Inversión',
    descripcion: 'Pagas 50 de oro al empezar cada combate; si lo ganas, recibes 150.',
    rareza: 'infrecuente',
    icono: '💹',
    // Se cobra todo al terminar: ganado, +150 − 50; perdido, −50.
    alGanarCombate: (oro) => oro + 100,
    alPerderCombate: (oro) => oro + 50,
  },
  {
    id: 'vista-de-lince',
    nombre: 'Vista de lince',
    descripcion: 'La mano tiene 9 cartas en vez de 8.',
    rareza: 'infrecuente',
    icono: '🐆',
    cartasExtra: 1,
  },
  {
    id: 'descuento-de-veterano',
    nombre: 'Descuento de veterano',
    descripcion: 'Las tiendas cuestan riesgo × 5\u00a0% menos (hasta 50\u00a0%).',
    rareza: 'infrecuente',
    icono: '🏷',
    alComprar: (precio, _primera, riesgo) => precio * (1 - Math.min(0.5, 0.05 * riesgo)),
    estado: (mesa) => `Ahora: −${Math.round(Math.min(50, 5 * (mesa.riesgo ?? 0)))}\u00a0%`,
  },
  {
    id: 'seguro',
    nombre: 'Seguro',
    descripcion: 'La primera derrota de cada mundo no cuesta oro.',
    rareza: 'infrecuente',
    icono: '☂',
    seguro: true,
  },
  {
    id: 'precision',
    nombre: 'Precisión',
    descripcion: 'Si una mano deja el combate a menos de 10\u00a0% por encima del objetivo, +100 de oro.',
    rareza: 'infrecuente',
    icono: '📐',
    precision: 100,
  },
];

export const BARATIJAS_POR_OFERTA = 3;

// Un bono se activa al tener `cantidad` baratijas distintas del set; sin
// cantidad, al tenerlas todas.
export interface Bono extends Efectos {
  cantidad?: number;
  descripcion: string;
  potencia?: boolean; // las baratijas del set usan sus efectos potenciados
}

export interface Conjunto {
  id: string;
  nombre: string;
  bonos: Bono[];
}

export const CONJUNTOS: readonly Conjunto[] = [
  // Sin bonos por ahora.
  { id: 'artista', nombre: 'Set del artista', bonos: [] },
  {
    id: 'apostador-empedernido',
    nombre: 'Set del apostador empedernido',
    bonos: [
      {
        cantidad: 3,
        descripcion: 'Las apuestas ganadas pagan el doble y las perdidas cuestan 1,5 veces lo apostado.',
        alResolverApuesta: (oro) => (oro > 0 ? oro * 2 : -Math.ceil(-oro * 1.5)),
      },
    ],
  },
  {
    id: 'toc-toc-toc',
    nombre: 'TOC TOC TOC',
    bonos: [{ descripcion: 'Los bonos y los castigos de las baratijas del set valen el doble.', potencia: true }],
  },
  {
    id: 'realeza',
    nombre: 'Realeza',
    bonos: [{ cantidad: 3, descripcion: 'Cada figura que puntúa aplica los tres efectos.', potencia: true }],
  },
  {
    id: 'bajos-fondos',
    nombre: 'Bajos fondos',
    bonos: [{ cantidad: 3, descripcion: 'El primer soborno de cada mundo es gratis.', sobornoGratis: true }],
  },
  {
    id: 'supersticioso',
    nombre: 'Supersticioso',
    bonos: [{ cantidad: 3, descripcion: 'Todas las probabilidades "1 en X" se duplican.', suerte: 2 }],
  },
  {
    id: 'matematico',
    nombre: 'Matemático',
    bonos: [{ cantidad: 3, descripcion: 'Las cartas jugadas que no puntúan también suman sus fichas.', sumanTodas: true }],
  },
  {
    id: 'torneo',
    nombre: 'Torneo',
    bonos: [{ cantidad: 3, descripcion: '+1 mano en todos los combates.', alEmpezarCombate: (inicio) => ({ ...inicio, manos: inicio.manos + 1 }) }],
  },
  {
    id: 'tiempo',
    nombre: 'Tiempo',
    bonos: [{ cantidad: 3, descripcion: 'Al ganar, cada mano que te sobra da 25 de oro.', alTerminarCombate: (r) => (r.gano ? 25 * r.manosRestantes : 0) }],
  },
  {
    id: 'jardin',
    nombre: 'Jardín',
    bonos: [{ descripcion: 'Sus baratijas ya no restan: solo suben.', potencia: true }],
  },
  {
    id: 'caridad',
    nombre: 'Caridad',
    bonos: [{ descripcion: 'Sus baratijas ya no restan: solo suben.', potencia: true }],
  },
];

export function buscarConjunto(id: string): Conjunto {
  const conjunto = CONJUNTOS.find((c) => c.id === id);
  if (!conjunto) throw new Error(`No hay ningún set ${id}`);
  return conjunto;
}

export function miembrosDe(conjunto: Conjunto): Baratija[] {
  return CATALOGO.filter((b) => b.conjunto === conjunto.id);
}

export function cantidadDelBono(conjunto: Conjunto, bono: Bono): number {
  return bono.cantidad ?? miembrosDe(conjunto).length;
}

function bonosDe(conjunto: Conjunto, ids: readonly string[]): Bono[] {
  const tiene = miembrosDe(conjunto).filter((b) => ids.includes(b.id)).length;
  return conjunto.bonos.filter((bono) => tiene >= cantidadDelBono(conjunto, bono));
}

// Los bonos de set que dan esas baratijas.
export function bonosActivos(ids: readonly string[]): Bono[] {
  return CONJUNTOS.flatMap((conjunto) => bonosDe(conjunto, ids));
}

// Todo lo que cambia las reglas con esas baratijas: ellas (potenciadas si
// un bono de su set lo pide), la copia del Gemelo malvado y sus bonos de set.
export function efectosDe(ids: readonly string[]): Efectos[] {
  const potenciados = CONJUNTOS.filter((c) => bonosDe(c, ids).some((b) => b.potencia)).map((c) => c.id);
  const conPotencia = (b: Baratija): Efectos => (b.potenciados && b.conjunto && potenciados.includes(b.conjunto) ? { ...b, ...b.potenciados } : b);
  const baratijas = baratijasDe(ids).map(conPotencia);
  // El Gemelo malvado: otra vez los efectos de la última conseguida.
  const copia = copiaDelGemelo(ids);
  return [...baratijas, ...(copia ? [conPotencia(copia)] : []), ...bonosActivos(ids)];
}

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

// Lo que paga el vendedor por una baratija: la mitad de su precio.
export function valorDeVenta(baratija: Baratija): number {
  return Math.floor(precioDe(baratija) / 2);
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
    const id = sortearDeRareza(aleatorio, sortearRareza(aleatorio, probabilidades), [...tiene, ...elegidas]);
    if (id) elegidas.push(id);
  }
  return elegidas;
}

// Una baratija al azar de esa rareza que no esté en `excluir`; si no queda
// ninguna, de las rarezas de abajo y después de las de arriba.
export function sortearDeRareza(aleatorio: Aleatorio, rareza: Rareza, excluir: readonly string[]): string | null {
  const indice = RAREZAS.indexOf(rareza);
  const orden = [...RAREZAS.slice(0, indice + 1).reverse(), ...RAREZAS.slice(indice + 1)];
  for (const buscada of orden) {
    const libres = CATALOGO.filter((b) => b.rareza === buscada && !b.deJefe && !excluir.includes(b.id));
    if (libres.length > 0) return barajar(libres, aleatorio)[0]!.id;
  }
  return null;
}

// Las fichas que suma una carta que puntúa, con lo que cambien las baratijas.
export function fichasConBaratijas(fichas: number, carta: Carta, baratijas: readonly Efectos[], mesa: Mesa = MESA_VACIA): number {
  return baratijas.reduce((actual, b) => (b.alContarCarta ? b.alContarCarta(actual, carta, mesa) : actual), fichas);
}

// Aplica en orden el efecto `efecto` de cada baratija que lo tenga.
export function aplicar<
  E extends 'alEmpezarCombate' | 'alGanarCombate' | 'alPerderCombate' | 'alSortearRareza' | 'alLimitarApuesta' | 'alFijarObjetivo',
>(
  baratijas: readonly Efectos[],
  efecto: E,
  valor: Parameters<NonNullable<Efectos[E]>>[0],
): Parameters<NonNullable<Efectos[E]>>[0] {
  type Valor = Parameters<NonNullable<Efectos[E]>>[0];
  return baratijas.reduce<Valor>((actual, b) => {
    const funcion = b[efecto] as ((v: Valor) => Valor) | undefined;
    return funcion ? funcion(actual) : actual;
  }, valor);
}
