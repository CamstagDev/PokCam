import { describe, expect, it } from 'vitest';
import { RANURAS, agregarAColeccion, borrar, cargar, guardar, leerColeccion, resumirTodas, type Almacen } from '../src/juego/guardado.ts';
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
    expect(cargar(almacen, 1)).toEqual({ version: 5, guardadoEn: 1234, partida });
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
    almacen.setItem('pokcam.ranura.1', JSON.stringify({ version: 999, partida: {} }));
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

  it('no existe una cuarta ranura', () => {
    expect(() => guardar(almacenDePrueba(), RANURAS, crearPartida(1))).toThrow();
  });
});
