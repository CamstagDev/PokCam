// Las barajas especiales: se elige una al empezar la partida. Cada una
// cambia algo a favor y algo en contra respecto de la Baraja clásica, y se
// desbloquea cumpliendo un logro en cualquier partida (los desbloqueos
// valen para todas las ranuras; ver guardado.ts).
//
// Lo que hace cada una se aplica en las reglas (partida.ts):
//   clasica    las 52 cartas de siempre
//   tahur      sin 2 al 6 (32 cartas); los objetivos suben OBJETIVO_DEL_TAHUR
//   fortuna    empieza con ORO_DE_LA_FORTUNA; al principio no se puede
//              apostar nada y cada combate ganado suma APUESTA_POR_VICTORIA,
//              hasta la mitad de siempre
//   apostador  se apuesta hasta el 100 % desde el principio, pero los
//              combates ganados no dan oro: solo se gana apostando
//   artista    CARTAS_DEL_ARTISTA cartas al azar empiezan con un
//              modificador; el pintor cobra el doble
//   bicolor    solo ♥ y ♠, cada carta dos veces (52 cartas); 1 descarte menos
//   maldita    empieza con una baratija rara al azar; el vendedor nunca
//              vende comunes

import { barajar, type Aleatorio } from './aleatorio.ts';
import { CATALOGO } from './baratijas.ts';
import { MODIFICADORES, PALOS, RANGOS, crearMazo, modificar, type Carta } from './cartas.ts';

export const IDS_DE_BARAJA = ['clasica', 'tahur', 'fortuna', 'apostador', 'artista', 'bicolor', 'maldita'] as const;
export type IdBaraja = (typeof IDS_DE_BARAJA)[number];

export const OBJETIVO_DEL_TAHUR = 1.25;
export const ORO_DE_LA_FORTUNA = 1000;
export const APUESTA_POR_VICTORIA = 0.05;
export const CARTAS_DEL_ARTISTA = 10;
export const PINTOR_DEL_ARTISTA = 2;
export const APUESTAS_PARA_LA_FORTUNA = 5;

export interface Baraja {
  id: IdBaraja;
  nombre: string;
  icono: string;
  ventaja: string;
  costo: string;
  desbloqueo: string; // el logro que la desbloquea
}

export const BARAJAS: readonly Baraja[] = [
  { id: 'clasica', nombre: 'Baraja clásica', icono: '🂠', ventaja: 'Las 52 cartas de siempre.', costo: 'Ninguno.', desbloqueo: 'Desde el principio.' },
  {
    id: 'tahur',
    nombre: 'Baraja del Tahúr',
    icono: '🃏',
    ventaja: 'Sin cartas del 2 al 6: 32 cartas, del 7 al As.',
    costo: 'Los objetivos suben un 25 %.',
    desbloqueo: 'Vence a El Tahúr.',
  },
  {
    id: 'fortuna',
    nombre: 'Baraja de la fortuna',
    icono: '🍀',
    ventaja: `Empiezas con ${ORO_DE_LA_FORTUNA} de oro.`,
    costo: 'Al principio no puedes apostar; cada combate ganado te deja apostar un 5 % más, hasta el 50 %.',
    desbloqueo: `Gana ${APUESTAS_PARA_LA_FORTUNA} apuestas en una partida.`,
  },
  {
    id: 'apostador',
    nombre: 'Baraja del apostador',
    icono: '🎲',
    ventaja: 'Puedes apostar todo tu oro desde el principio.',
    costo: 'Ganar combates no da oro: solo ganas apostando.',
    desbloqueo: 'Completa el Set del apostador empedernido.',
  },
  {
    id: 'artista',
    nombre: 'Baraja del artista',
    icono: '🎨',
    ventaja: `${CARTAS_DEL_ARTISTA} cartas al azar empiezan con un modificador.`,
    costo: 'El pintor cobra el doble.',
    desbloqueo: 'Completa el Set del artista.',
  },
  {
    id: 'bicolor',
    nombre: 'Baraja bicolor',
    icono: '☯️',
    ventaja: 'Solo ♥ y ♠, cada carta dos veces (52 cartas).',
    costo: 'Un descarte menos en cada combate.',
    desbloqueo: 'Vence a un jefe con Estético.',
  },
  {
    id: 'maldita',
    nombre: 'Baraja maldita',
    icono: '💀',
    ventaja: 'Empiezas con una baratija rara al azar.',
    costo: 'El vendedor nunca vende baratijas comunes.',
    desbloqueo: 'Vence a un jefe sin comprarle nada al vendedor.',
  },
];

export function buscarBaraja(id: string): Baraja {
  return BARAJAS.find((b) => b.id === id) ?? BARAJAS[0]!;
}

// El mazo con el que empieza la partida.
export function mazoDeBaraja(id: IdBaraja, aleatorio: Aleatorio): Carta[] {
  if (id === 'tahur') return crearMazo().filter((c) => c.rango >= 7);
  if (id === 'bicolor') {
    return (['corazones', 'picas'] as const).flatMap((palo) =>
      [1, 2].flatMap((copia) => RANGOS.map((rango): Carta => ({ id: copia === 1 ? `${palo}-${rango}` : `${palo}-${rango}-b`, palo, rango }))),
    );
  }
  if (id === 'artista') {
    const elegidas = new Set(barajar(crearMazo(), aleatorio).slice(0, CARTAS_DEL_ARTISTA).map((c) => c.id));
    return crearMazo().map((c) => {
      if (!elegidas.has(c.id)) return c;
      const modificador = MODIFICADORES[Math.floor(aleatorio() * MODIFICADORES.length)]!;
      const otros = PALOS.filter((p) => p !== c.palo);
      return modificar(c, modificador, modificador === 'palo' ? otros[Math.floor(aleatorio() * otros.length)] : undefined);
    });
  }
  return crearMazo();
}

// Lo que se cuenta en una partida para los logros que desbloquean barajas.
export interface Logros {
  victorias: number; // combates ganados (la fortuna los usa para la apuesta)
  apuestasGanadas: number;
  compras: number; // baratijas compradas al vendedor
  jefes: number; // jefes vencidos
  jefesConEstetico: number;
  jefesSinComprar: number;
}

export const LOGROS_INICIALES: Logros = { victorias: 0, apuestasGanadas: 0, compras: 0, jefes: 0, jefesConEstetico: 0, jefesSinComprar: 0 };

// Si se tienen a la vez todas las baratijas de ese set.
function setCompleto(baratijas: readonly string[], conjunto: string): boolean {
  const miembros = CATALOGO.filter((b) => b.conjunto === conjunto);
  return miembros.length > 0 && miembros.every((b) => baratijas.includes(b.id));
}

// Las barajas que desbloquea lo hecho en esta partida.
export function barajasDesbloqueadas(partida: { baratijas: readonly string[]; logros?: Logros }): IdBaraja[] {
  const logros = partida.logros ?? LOGROS_INICIALES;
  const ids: IdBaraja[] = [];
  if (logros.jefes > 0) ids.push('tahur');
  if (logros.apuestasGanadas >= APUESTAS_PARA_LA_FORTUNA) ids.push('fortuna');
  if (setCompleto(partida.baratijas, 'apostador-empedernido')) ids.push('apostador');
  if (setCompleto(partida.baratijas, 'artista')) ids.push('artista');
  if (logros.jefesConEstetico > 0) ids.push('bicolor');
  if (logros.jefesSinComprar > 0) ids.push('maldita');
  return ids;
}
