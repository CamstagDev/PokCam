// Una lámina de píxeles grandes: el mapa se pinta entero en una imagen
// chica (un píxel de la lámina son `escala` × `escala` de pantalla) y
// después se agranda sin suavizar. Así todo el mapa (paño, baranda,
// caminos y fichas) tiene el mismo tamaño de píxel. Los colores se
// guardan como 0xrrggbb.

// Matriz de Bayer de 4 × 4: el umbral de cada píxel para tramar entre dos
// tonos (en vez de un degradado suave, puntos alternados).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((n) => (n + 0.5) / 16);

export function umbral(x: number, y: number): number {
  return BAYER[(y & 3) * 4 + (x & 3)]!;
}

// De una paleta ordenada de oscuro a claro, el tono `v` (0 = el primero,
// paleta.length - 1 = el último) tramado: entre dos tonos, los píxeles
// eligen uno u otro según la matriz.
export function tramar(paleta: readonly number[], v: number, x: number, y: number): number {
  const base = Math.floor(v);
  const i = v - base > umbral(x, y) ? base + 1 : base;
  return paleta[Math.max(0, Math.min(paleta.length - 1, i))]!;
}

export function mezclarColor(abajo: number, arriba: number, alfa: number): number {
  const r = ((abajo >> 16) & 255) * (1 - alfa) + ((arriba >> 16) & 255) * alfa;
  const g = ((abajo >> 8) & 255) * (1 - alfa) + ((arriba >> 8) & 255) * alfa;
  const b = (abajo & 255) * (1 - alfa) + (arriba & 255) * alfa;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

export function escalarColor(color: number, factor: number): number {
  const canal = (c: number) => Math.max(0, Math.min(255, Math.round(c * factor)));
  return (canal((color >> 16) & 255) << 16) | (canal((color >> 8) & 255) << 8) | canal(color & 255);
}

export class Lamina {
  readonly ancho: number;
  readonly alto: number;
  readonly escala: number; // píxeles de pantalla por píxel de la lámina
  readonly px: Uint32Array;

  constructor(ancho: number, alto: number, escala: number) {
    this.ancho = ancho;
    this.alto = alto;
    this.escala = escala;
    this.px = new Uint32Array(ancho * alto);
  }

  dentro(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.ancho && y < this.alto;
  }

  get(x: number, y: number): number {
    return this.dentro(x, y) ? this.px[y * this.ancho + x]! : 0;
  }

  punto(x: number, y: number, color: number): void {
    if (this.dentro(x, y)) this.px[y * this.ancho + x] = color;
  }

  mezclar(x: number, y: number, color: number, alfa: number): void {
    if (!this.dentro(x, y)) return;
    const i = y * this.ancho + x;
    this.px[i] = alfa >= 1 ? color : mezclarColor(this.px[i]!, color, alfa);
  }

  // Luz: suma el color (como un brillo encima).
  sumar(x: number, y: number, color: number, alfa: number): void {
    if (!this.dentro(x, y)) return;
    const i = y * this.ancho + x;
    const p = this.px[i]!;
    const canal = (d: number) => Math.min(255, ((p >> d) & 255) + Math.round(((color >> d) & 255) * alfa));
    this.px[i] = (canal(16) << 16) | (canal(8) << 8) | canal(0);
  }

  // Una línea de píxeles escalonada (sin suavizar), de `grosor` píxeles.
  // `pintar` recibe cada píxel y el paso en que va (para punteados).
  linea(x0: number, y0: number, x1: number, y1: number, grosor: number, pintar: (x: number, y: number, paso: number) => void): void {
    const pasos = Math.max(Math.abs(Math.round(x1) - Math.round(x0)), Math.abs(Math.round(y1) - Math.round(y0)), 1);
    const desde = -Math.floor((grosor - 1) / 2);
    const vistos = new Set<number>();
    for (let paso = 0; paso <= pasos; paso++) {
      const cx = Math.round(x0 + ((x1 - x0) * paso) / pasos);
      const cy = Math.round(y0 + ((y1 - y0) * paso) / pasos);
      for (let j = desde; j < desde + grosor; j++) {
        for (let i = desde; i < desde + grosor; i++) {
          const x = cx + i;
          const y = cy + j;
          if (!this.dentro(x, y) || vistos.has(y * this.ancho + x)) continue;
          vistos.add(y * this.ancho + x);
          pintar(x, y, paso);
        }
      }
    }
  }

  // Vuelca la lámina en un ImageData del mismo tamaño (RGBA).
  volcar(destino: Uint8ClampedArray): void {
    for (let i = 0, j = 0; i < this.px.length; i++, j += 4) {
      const c = this.px[i]!;
      destino[j] = (c >> 16) & 255;
      destino[j + 1] = (c >> 8) & 255;
      destino[j + 2] = c & 255;
      destino[j + 3] = 255;
    }
  }
}
