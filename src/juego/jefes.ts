// Los jefes: al final de cada mundo no hay un combate contra un objetivo
// sino una partida de póker contra el jefe, de DUELOS duelos (ver
// duelo.ts). Cada jefe trae su mazo, sus manos y cómo las reparte entre
// los duelos, si muestra su mano antes de que juegues, cómo se desempata
// y las baratijas que puede dar al vencerlo (una al azar).

import { crearMazo, type Carta } from './cartas.ts';

export interface Jefe {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  mazo(): Carta[];
  // Cuántas manos juega en cada duelo; su suma son sus manos.
  reparto: readonly number[];
  // Si su mano de cada duelo se ve antes de que juegues las tuyas.
  revela: boolean;
  // En un empate, cada uno roba la siguiente carta de su mazo y gana la de
  // más fichas (con sus modificaciones); si vuelven a empatar, otra vez.
  desempate: 'cartaSiguiente';
  baratijas: readonly string[];
}

export const JEFES: readonly Jefe[] = [
  {
    id: 'tahur',
    nombre: 'El Tahúr',
    icono: '🃏',
    descripcion: 'Juega con un mazo limpio, del 7 al As. Una mano por duelo, y la muestra antes que tú.',
    mazo: () => crearMazo().filter((c) => c.rango >= 7),
    reparto: [1, 1, 1],
    revela: true,
    desempate: 'cartaSiguiente',
    baratijas: ['as-bajo-la-manga', 'faroleo', 'mazo-limpio'],
  },
];

// Por ahora todos los mundos terminan con El Tahúr.
export function jefeDelMundo(mundo: number): Jefe {
  return JEFES[(mundo - 1) % JEFES.length]!;
}

export function buscarJefe(id: string): Jefe {
  const jefe = JEFES.find((j) => j.id === id);
  if (!jefe) throw new Error(`No hay ningún jefe ${id}`);
  return jefe;
}

// Los jefes suben de nivel todas sus manos con el riesgo: 1 nivel más cada
// RIESGO_POR_NIVEL_DEL_JEFE.
export const RIESGO_POR_NIVEL_DEL_JEFE = 6;

export function nivelDelJefe(riesgo: number): number {
  return 1 + Math.floor(riesgo / RIESGO_POR_NIVEL_DEL_JEFE);
}
