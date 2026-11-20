// La paleta del pixel art: cada letra de los dibujos (ver sprites) es un
// color. Son los tonos de estilo.ts más algunos para piel, madera y
// metales, y un contorno oscuro común a todo. El punto es transparente.

export const CONTORNO = 0x1a1420;

export const PALETA: Readonly<Record<string, number>> = {
  k: CONTORNO,
  w: 0xf4f1ea, // la cara de las cartas
  W: 0xffffff,
  l: 0xc8cbd6,
  e: 0x8a8fa3,
  E: 0x4a4e5e,
  n: 0x22232b,
  r: 0xd23c3c,
  R: 0x8f2430,
  m: 0xf0544f,
  i: 0xff9ec8,
  o: 0xf08a3c,
  g: 0xf2c14e,
  G: 0xb8862b,
  y: 0xffe38a,
  v: 0x5cc45c,
  V: 0x2e7d32,
  t: 0x2ec4a6,
  T: 0x1a7d6a,
  c: 0x8fd8ff,
  b: 0x3d8bfd,
  B: 0x1f4f9e,
  p: 0xa66cff,
  P: 0x5b3a9e,
  s: 0xe8b07a,
  S: 0xb97c52,
  u: 0x8b5a2b,
  U: 0x4a2c1a,
};

// Un dibujo: filas de igual largo, una letra por píxel.
export type Dibujo = readonly string[];

// Lee un dibujo escrito como bloque de texto (una fila por línea).
export function dibujo(texto: string): Dibujo {
  return texto
    .split('\n')
    .map((fila) => fila.trim())
    .filter((fila) => fila.length > 0);
}

// Los píxeles de un dibujo como colores (null = transparente). Avisa si
// las filas no son parejas o hay letras fuera de la paleta.
export function pixeles(d: Dibujo): (number | null)[][] {
  const ancho = d[0]?.length ?? 0;
  return d.map((fila, y) => {
    if (fila.length !== ancho) throw new Error(`Fila ${y} de ${fila.length} píxeles, se esperaban ${ancho}: ${fila}`);
    return [...fila].map((letra) => {
      if (letra === '.') return null;
      const color = PALETA[letra];
      if (color === undefined) throw new Error(`Letra sin color: ${letra}`);
      return color;
    });
  });
}
