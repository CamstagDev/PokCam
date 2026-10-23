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
//                     también la carta y la mesa: el mazo y cuántas cartas
//                     quedan por robar)
//   alPuntuar         fichas y multiplicador de cada mano jugada (recibe
//                     también la mesa)
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
import { modificacionesDe, type Carta, type Palo } from './cartas.ts';
import { MANOS, TIPOS_DE_MANO, type Niveles, type TipoMano } from './manos.ts';

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
}

// Lo que recuerda una baratija (ver "Memoria" arriba) y el de todas.
export type Recuerdo = Readonly<Record<string, number>>;
export type Memoria = Readonly<Record<string, Recuerdo>>;

// Lo que pasa en la partida y las baratijas pueden recordar.
export type Suceso =
  | { tipo: 'mano'; mano: TipoMano; total: number; objetivo: number } // se jugó una mano
  | { tipo: 'eliminarCarta' } // en el eliminador
  | { tipo: 'apuesta'; gano: boolean } // se resolvió una apuesta de más de 0
  | { tipo: 'combate'; gano: boolean }; // terminó un combate

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
  alEmpezarCombate?(inicio: InicioDeCombate): InicioDeCombate;
  alContarCarta?(fichas: number, carta: Carta, mesa: Mesa): number;
  alPuntuar?(mano: ManoPuntuada, mesa: Mesa): ManoPuntuada;
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
}

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
    nombre: 'El poder de las flores',
    descripcion: 'Las cartas de ♠ valen la mitad de fichas y las de ♣, 1,5 veces más.',
    rareza: 'comun',
    icono: '🌸',
    alContarCarta: cambiarPalos('treboles', 'picas'),
  },
  {
    id: 'grass-mower',
    nombre: 'Corta hierbas',
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
    alPuntuar: (mano) => (new Set(mano.cartasJugadas.map((c) => c.palo)).size === 4 ? { ...mano, multi: mano.multi * 4 } : mano),
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
    recordar: (r, s) => (s.tipo === 'mano' ? { ...r, [s.mano]: (r[s.mano] ?? 0) + 1 } : r),
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
  // Por ahora una sola baratija y sin bonos.
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
// un bono de su set lo pide) y sus bonos de set.
export function efectosDe(ids: readonly string[]): Efectos[] {
  const potenciados = CONJUNTOS.filter((c) => bonosDe(c, ids).some((b) => b.potencia)).map((c) => c.id);
  const baratijas = baratijasDe(ids).map((b) => (b.potenciados && b.conjunto && potenciados.includes(b.conjunto) ? { ...b, ...b.potenciados } : b));
  return [...baratijas, ...bonosActivos(ids)];
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
    const libres = CATALOGO.filter((b) => b.rareza === buscada && !excluir.includes(b.id));
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
  E extends 'alEmpezarCombate' | 'alGanarCombate' | 'alPerderCombate' | 'alSortearRareza' | 'alLimitarApuesta',
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
