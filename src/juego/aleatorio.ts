// Números al azar con semilla: la misma semilla da siempre la misma
// partida (el mismo mapa, el mismo orden del mazo). Sirve para repetir una
// partida, compartir semillas y para que las pruebas no dependan de la
// suerte. Es mulberry32: rápido y suficiente para un juego.

export type Aleatorio = () => number; // número en [0, 1)

export function crearAleatorio(semilla: number): Aleatorio {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Entero entre min y max, los dos incluidos.
export function enteroEntre(aleatorio: Aleatorio, min: number, max: number): number {
  return min + Math.floor(aleatorio() * (max - min + 1));
}

// Copia barajada (Fisher-Yates); no toca la lista original.
export function barajar<T>(lista: readonly T[], aleatorio: Aleatorio): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}
