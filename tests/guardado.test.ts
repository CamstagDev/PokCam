import { describe, expect, it } from 'vitest';
import {
  RANURAS,
  agregarAColeccion,
  borrar,
  cargar,
  exportarRanura,
  guardar,
  importarRanura,
  agregarNodosVistos,
  leerColeccion,
  leerNodosVistos,
  resumirTodas,
  type Almacen } from '../src/juego/guardado.ts';
import { avanzar, crearPartida, nodosDisponibles } from '../src/juego/partida.ts';

function almacenDePrueba(): Almacen & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
    removeItem: (clave) => void datos.delete(clave),
  };
}

describe('guardado', () => {
  it('empieza con las 3 ranuras vacías', () => {
    expect(resumirTodas(almacenDePrueba())).toEqual([null, null, null]);
  });

  it('guarda y vuelve a cargar la misma partida', () => {
    const almacen = almacenDePrueba();
    let partida = crearPartida(7);
    partida = avanzar(partida, nodosDisponibles(partida)[0]!.id);
    guardar(almacen, 1, partida, 1234);
    expect(cargar(almacen, 1)).toEqual({ version: 11, guardadoEn: 1234, partida });
    expect(cargar(almacen, 0)).toBeNull();
  });

  it('resume en qué piso va cada ranura', () => {
    const almacen = almacenDePrueba();
    let partida = crearPartida(7);
    partida = avanzar(partida, nodosDisponibles(partida)[0]!.id);
    guardar(almacen, 2, partida, 99);
    expect(resumirTodas(almacen)).toEqual([null, null, { ranura: 2, guardadoEn: 99, piso: 1, pisos: 9, oro: 300 }]);
  });

  it('sobrescribir reemplaza la partida de la ranura', () => {
    const almacen = almacenDePrueba();
    guardar(almacen, 0, crearPartida(1));
    const nueva = crearPartida(2);
    guardar(almacen, 0, nueva);
    expect(cargar(almacen, 0)?.partida).toEqual(nueva);
  });

  it('borrar deja la ranura vacía y no toca las otras', () => {
    const almacen = almacenDePrueba();
    guardar(almacen, 0, crearPartida(1));
    guardar(almacen, 1, crearPartida(2));
    borrar(almacen, 0);
    expect(cargar(almacen, 0)).toBeNull();
    expect(cargar(almacen, 1)).not.toBeNull();
  });

  it('una ranura ilegible cuenta como vacía', () => {
    const almacen = almacenDePrueba();
    almacen.setItem('pokcam.ranura.0', '{roto');
    almacen.setItem('pokcam.ranura.1', JSON.stringify({ version: 1199, partida: {} }));
    expect(cargar(almacen, 0)).toBeNull();
    expect(cargar(almacen, 1)).toBeNull();
  });

  it('las partidas de antes del oro cargan con el oro inicial', () => {
    const almacen = almacenDePrueba();
    const { oro: _, ...vieja } = crearPartida(3);
    almacen.setItem('pokcam.ranura.0', JSON.stringify({ version: 1, guardadoEn: 5, partida: vieja }));
    expect(cargar(almacen, 0)?.partida.oro).toBe(300);
  });

  it('las partidas de antes de las baratijas cargan sin baratijas', () => {
    const almacen = almacenDePrueba();
    const { baratijas: _, oferta: __, ...vieja } = crearPartida(3);
    almacen.setItem('pokcam.ranura.0', JSON.stringify({ version: 3, guardadoEn: 5, partida: vieja }));
    expect(cargar(almacen, 0)?.partida).toMatchObject({ baratijas: [], oferta: null });
  });

  it('guarda el mazo de la partida tal como está', () => {
    const almacen = almacenDePrueba();
    const partida = crearPartida(4);
    const mazo = partida.mazo.slice(0, 40); // como si se hubieran quitado cartas
    guardar(almacen, 0, { ...partida, mazo });
    expect(cargar(almacen, 0)?.partida.mazo).toEqual(mazo);
  });

  it('las partidas de antes del mazo cargan con el de 52 cartas', () => {
    const almacen = almacenDePrueba();
    const { mazo, ...vieja } = crearPartida(3);
    almacen.setItem('pokcam.ranura.0', JSON.stringify({ version: 2, guardadoEn: 5, partida: { ...vieja, oro: 150 } }));
    const cargada = cargar(almacen, 0)?.partida;
    expect(cargada?.mazo).toEqual(mazo);
    expect(cargada?.oro).toBe(150);
  });

  it('la colección suma baratijas sin repetir y no se borra con las ranuras', () => {
    const almacen = almacenDePrueba();
    expect(leerColeccion(almacen)).toEqual([]);
    agregarAColeccion(almacen, ['materialista']);
    agregarAColeccion(almacen, ['materialista', 'diversidad']);
    guardar(almacen, 0, crearPartida(1));
    borrar(almacen, 0);
    expect(leerColeccion(almacen)).toEqual(['materialista', 'diversidad']);
  });

  it('exportar e importar pasa la partida y la colección a otra ranura', () => {
    const origen = almacenDePrueba();
    const partida = { ...crearPartida(4), baratijas: ['subsidio'] };
    guardar(origen, 0, partida, 77);
    agregarAColeccion(origen, ['diversidad']);
    agregarNodosVistos(origen, ['combate', 'vendedor']);
    const texto = exportarRanura(origen, 0)!;

    const destino = almacenDePrueba();
    expect(importarRanura(destino, 2, texto)).toBe(true);
    expect(cargar(destino, 2)).toEqual({ version: 11, guardadoEn: 77, partida });
    expect(leerColeccion(destino).sort()).toEqual(['diversidad', 'subsidio']);
    expect(leerNodosVistos(destino).sort()).toEqual(['combate', 'vendedor']);
  });

  it('los nodos vistos se suman sin repetir', () => {
    const almacen = almacenDePrueba();
    expect(leerNodosVistos(almacen)).toEqual([]);
    agregarNodosVistos(almacen, ['combate', 'combate', 'elite']);
    agregarNodosVistos(almacen, ['elite', 'jefe']);
    expect(leerNodosVistos(almacen)).toEqual(['combate', 'elite', 'jefe']);
  });

  it('importar un archivo que no es una partida no toca nada', () => {
    const almacen = almacenDePrueba();
    expect(importarRanura(almacen, 0, '{"hola": 1}')).toBe(false);
    expect(importarRanura(almacen, 0, 'no es json')).toBe(false);
    expect(cargar(almacen, 0)).toBeNull();
  });

  it('exportar una ranura vacía no da nada', () => {
    expect(exportarRanura(almacenDePrueba(), 1)).toBeNull();
  });

  it('no existe una cuarta ranura', () => {
    expect(() => guardar(almacenDePrueba(), RANURAS, crearPartida(1))).toThrow();
  });
});

describe('partida de prueba', () => {
  it('partidas-de-prueba/todo-desbloqueado.json se puede importar', async () => {
    const { readFileSync } = await import('node:fs');
    const texto = readFileSync(new URL('../partidas-de-prueba/todo-desbloqueado.json', import.meta.url), 'utf8');
    const datos = new Map<string, string>();
    const almacen = { getItem: (c: string) => datos.get(c) ?? null, setItem: (c: string, v: string) => void datos.set(c, v), removeItem: (c: string) => void datos.delete(c) };
    expect(importarRanura(almacen, 0, texto)).toBe(true);
    expect(cargar(almacen, 0)?.partida.oro).toBe(99_999);
  });
});
