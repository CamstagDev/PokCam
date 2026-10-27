import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import { CATALOGO, efectosDe, type Mesa } from '../src/juego/baratijas.ts';
import { crearMazo, type Carta } from '../src/juego/cartas.ts';
import { crearCombate, jugar } from '../src/juego/combate.ts';
import { cerrarDuelo, crearEnfrentamiento, dueloAbierto, jugarEnDuelo } from '../src/juego/duelo.ts';
import { buscarJefe } from '../src/juego/jefes.ts';
import { apostar, avanzar, crearPartida, resolverCombate, siguienteMundo, type Partida } from '../src/juego/partida.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const carta = (id: string): Carta => {
  const [palo, rango] = id.split('-') as [Carta['palo'], string];
  return { id, palo, rango: Number(rango) as Carta['rango'] };
};
const cartas = (...ids: string[]) => ids.map(carta);
const mesa = (extra: Partial<Mesa> = {}): Mesa => ({ mazo: [], restantes: 0, ...extra });
const con = (ids: string[], jugadas: Carta[], extra: Partial<Mesa> = {}) => puntuar(jugadas, efectosDe(ids), mesa(extra));
const sin = (jugadas: Carta[]) => puntuar(jugadas);

function partidaEn(baratijas: string[] = [], oro = 300): Partida {
  const partida = crearPartida(7);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = 'combate';
  return { ...avanzar({ ...partida, baratijas }, destino.id), oro };
}

describe('legendarias', () => {
  it('Rey Midas: cada ♦ que puntúa da 5 de oro', () => {
    expect(con(['rey-midas'], cartas('diamantes-5', 'diamantes-9')).oro).toBe(5); // carta alta: puntúa una
    expect(con(['rey-midas'], cartas('diamantes-5', 'picas-5')).oro).toBe(5);
  });

  it('La banca siempre gana: las apuestas ganadas pagan el triple', () => {
    const partida = apostar(partidaEn(['la-banca-siempre-gana']), 100);
    expect(resolverCombate(partida, true).oro).toBe(300 + 100 + 300);
    expect(resolverCombate(partida, false).oro).toBe(300 - 100 - 100);
  });

  it('Mano de Dios: una vez por combate, cuenta como escalera de color', () => {
    const combate = crearCombate(crearAleatorio(1), { objetivo: 99_999, mazo: crearMazo(), baratijas: ['mano-de-dios'] });
    expect(combate.divinas).toBe(1);
    const ids = combate.mano.slice(0, 2).map((c) => c.id);
    const jugado = jugar(combate, ids, false, true);
    expect(jugado.ultimaJugada).toMatchObject({ tipo: 'escaleraColor' });
    expect(jugado.ultimaJugada!.cartasQuePuntuan).toHaveLength(2);
    expect(() => jugar(jugado, [jugado.mano[0]!.id], false, true)).toThrow();
  });

  it('Gemelo malvado: copia la última baratija conseguida', () => {
    const k = cartas('picas-13');
    expect(con(['el-rey', 'gemelo-malvado'], k).multi).toBe(sin(k).multi + 6);
    expect(con(['gemelo-malvado', 'el-rey'], k).multi).toBe(sin(k).multi + 6);
    expect(con(['el-rey', 'solitario', 'gemelo-malvado'], k).multi).toBe((sin(k).multi + 3) * 9);
    expect(con(['gemelo-malvado'], k).multi).toBe(sin(k).multi);
    expect(CATALOGO.find((b) => b.id === 'gemelo-malvado')!.estado!(mesa({ propias: ['el-rey', 'gemelo-malvado'] }))).toContain('El Rey');
  });

  it('Tiempo extra: +2 manos y +2 descartes', () => {
    expect(crearCombate(crearAleatorio(1), { objetivo: 100, mazo: crearMazo(), baratijas: ['tiempo-extra'] })).toMatchObject({
      manosRestantes: 6,
      descartesRestantes: 5,
    });
  });

  it('Fénix: al quedarte sin oro vuelves con 300 y se pierde', () => {
    const partida = partidaEn(['fenix', 'subsidio'], 30);
    const renacida = resolverCombate(partida, false);
    expect(renacida.oro).toBe(300);
    expect(renacida.baratijas).toEqual(['subsidio']);
    expect(resolverCombate(partidaEn([], 30), false).oro).toBeLessThanOrEqual(0);
  });

  it('Alquimista: al terminar el mundo, las comunes pasan a infrecuentes', () => {
    const partida = partidaEn(['alquimista', 'subsidio', 'parejita', 'broker']);
    const nuevo = siguienteMundo(partida);
    const rarezas = nuevo.baratijas.map((id) => CATALOGO.find((b) => b.id === id)!.rareza);
    expect(rarezas).toEqual(['legendaria', 'infrecuente', 'infrecuente', 'infrecuente']);
    expect(nuevo.baratijas).toContain('broker');
  });

  it('Corona del Tahúr: contra los jefes gana los empates y ×2 multi', () => {
    expect(con(['corona-del-tahur'], cartas('picas-5'), { tipo: 'jefe' }).multi).toBe(2);
    expect(con(['corona-del-tahur'], cartas('picas-5'), { tipo: 'combate' }).multi).toBe(1);
    const tahur = buscarJefe('tahur');
    const e = crearEnfrentamiento(crearAleatorio(1), tahur, { mazo: crearMazo(), baratijas: ['corona-del-tahur'] });
    // Sin jugar nada y con el jefe en 0 sería empate; forzamos los puntos iguales.
    const empate = { ...e, duelos: [{ ...dueloAbierto(e), jugador: 100, jefe: 100 }] };
    expect(dueloAbierto({ ...cerrarDuelo(empate), duelos: cerrarDuelo(empate).duelos.slice(0, 1) }).ganador).toBe('jugador');
    expect(jugarEnDuelo(e, [e.combate.mano[0]!.id]).combate.ultimaJugada!.multi).toBe(2);
  });
});
