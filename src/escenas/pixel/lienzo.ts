// Un lienzo chico para dibujar sprites píxel por píxel con unas pocas
// figuras (rectángulos, círculos, líneas, polígonos, dibujos pegados y
// texto de 3 × 5), y después darles volumen (borde de abajo a la derecha
// más oscuro y de arriba a la izquierda más claro) y el contorno oscuro.
// El resultado es un Dibujo: filas de letras de la paleta.

import type { Dibujo } from './paleta.ts';

// Para el volumen: el tono más oscuro y el más claro de cada color.
const OSCURO: Readonly<Record<string, string>> = {
  w: 'l', W: 'l', l: 'e', e: 'E', E: 'n', r: 'R', m: 'r', i: 'm', o: 'R', g: 'G', y: 'g', G: 'U',
  v: 'V', t: 'T', c: 'b', b: 'B', p: 'P', s: 'S', u: 'U', n: 'k', B: 'n', P: 'k', V: 'T', T: 'B', R: 'U', S: 'u',
};
const CLARO: Readonly<Record<string, string>> = {
  w: 'W', l: 'w', e: 'l', E: 'e', r: 'm', R: 'r', m: 'i', o: 'y', g: 'y', G: 'g', v: 'y', V: 'v', t: 'c', T: 't',
  b: 'c', B: 'b', p: 'i', P: 'p', s: 'y', S: 's', u: 'o', U: 'u', n: 'E', i: 'W', c: 'W',
};

// Letras de 3 × 5 (las que usan las cartas y los iconos).
const FUENTE: Readonly<Record<string, readonly string[]>> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  Q: ['.#.', '#.#', '#.#', '#.#', '.##'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  x: ['...', '#.#', '.#.', '#.#', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
  $: ['.##', '##.', '.#.', '.##', '##.'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '.': ['...', '...', '...', '...', '.#.'],
  ',': ['...', '...', '...', '.#.', '#..'],
  ' ': ['...', '...', '...', '...', '...'],
};

export function anchoDeTexto(texto: string): number {
  return texto.length * 4 - 1;
}

export class Lienzo {
  readonly px: string[][];
  readonly ancho: number;
  readonly alto: number;

  constructor(ancho: number, alto: number = ancho) {
    this.ancho = ancho;
    this.alto = alto;
    this.px = Array.from({ length: alto }, () => Array.from({ length: ancho }, () => '.'));
  }

  private dentro(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.ancho && y < this.alto;
  }

  get(x: number, y: number): string {
    return this.dentro(x, y) ? this.px[y]![x]! : '.';
  }

  punto(x: number, y: number, c: string): this {
    if (this.dentro(x, y)) this.px[y]![x] = c;
    return this;
  }

  puntos(c: string, ...xy: number[]): this {
    for (let i = 0; i + 1 < xy.length; i += 2) this.punto(xy[i]!, xy[i + 1]!, c);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.punto(i, j, c);
    return this;
  }

  marco(x: number, y: number, w: number, h: number, c: string): this {
    for (let i = x; i < x + w; i++) this.punto(i, y, c).punto(i, y + h - 1, c);
    for (let j = y; j < y + h; j++) this.punto(x, j, c).punto(x + w - 1, j, c);
    return this;
  }

  // Centro en coordenadas de píxel (7.5 es el medio de un lienzo de 16).
  elipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.02) this.punto(x, y, c);
      }
    }
    return this;
  }

  circulo(cx: number, cy: number, r: number, c: string): this {
    return this.elipse(cx, cy, r, r, c);
  }

  anillo(cx: number, cy: number, r: number, grosor: number, c: string): this {
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r + 0.1 && d > r - grosor + 0.1) this.punto(x, y, c);
      }
    }
    return this;
  }

  linea(x0: number, y0: number, x1: number, y1: number, c: string): this {
    const pasos = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= pasos; i++) {
      this.punto(Math.round(x0 + ((x1 - x0) * i) / pasos), Math.round(y0 + ((y1 - y0) * i) / pasos), c);
    }
    return this;
  }

  // Relleno de un polígono (vértices en coordenadas de píxel; se pinta el
  // píxel cuyo centro queda dentro).
  poligono(puntos: readonly (readonly [number, number])[], c: string): this {
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let dentro = false;
        for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
          const [xi, yi] = puntos[i]!;
          const [xj, yj] = puntos[j]!;
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
        }
        if (dentro) this.punto(x, y, c);
      }
    }
    return this;
  }

  // Pega un dibujo (los '.' no tapan nada). Con `color`, todo lo que no es
  // '.' se pinta de ese color.
  pegar(d: Dibujo, x: number, y: number, color?: string): this {
    d.forEach((fila, j) => [...fila].forEach((letra, i) => letra !== '.' && this.punto(x + i, y + j, color ?? letra)));
    return this;
  }

  texto(texto: string, x: number, y: number, c: string): this {
    [...texto].forEach((letra, n) => {
      const forma = FUENTE[letra];
      if (!forma) throw new Error(`Sin letra para ${letra}`);
      forma.forEach((fila, j) => [...fila].forEach((p, i) => p === '#' && this.punto(x + n * 4 + i, y + j, c)));
    });
    return this;
  }

  cambiar(de: string, a: string): this {
    for (const fila of this.px) for (let x = 0; x < fila.length; x++) if (fila[x] === de) fila[x] = a;
    return this;
  }

  espejo(): this {
    for (const fila of this.px) fila.reverse();
    return this;
  }

  // Volumen: los píxeles con el borde a la derecha o abajo se oscurecen y
  // los que lo tienen arriba a la izquierda se aclaran (solo los colores
  // de la lista, para no tocar detalles).
  volumen(colores = 'wWlerRmogGyvtcbpsuVTBPESiU'): this {
    const vacio = (x: number, y: number) => {
      const p = this.get(x, y);
      return p === '.' || p === 'k';
    };
    const copia = this.px.map((fila) => [...fila]);
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        const p = copia[y]![x]!;
        if (!colores.includes(p)) continue;
        if ((vacio(x + 1, y) || vacio(x, y + 1)) && OSCURO[p]) this.px[y]![x] = OSCURO[p]!;
        // Solo la esquina de arriba a la izquierda de cada figura se aclara.
        else if (vacio(x - 1, y) && vacio(x, y - 1) && CLARO[p]) this.px[y]![x] = CLARO[p]!;
      }
    }
    return this;
  }

  // El contorno: cada píxel vacío que toca (de lado) uno pintado.
  contorno(c = 'k'): this {
    const copia = this.px.map((fila) => [...fila]);
    const pintado = (x: number, y: number) => x >= 0 && y >= 0 && x < this.ancho && y < this.alto && copia[y]![x] !== '.' && copia[y]![x] !== c;
    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {
        if (copia[y]![x] === '.' && (pintado(x - 1, y) || pintado(x + 1, y) || pintado(x, y - 1) || pintado(x, y + 1))) this.px[y]![x] = c;
      }
    }
    return this;
  }

  dibujo(): Dibujo {
    return this.px.map((fila) => fila.join(''));
  }
}

export function lienzo(ancho: number, alto?: number): Lienzo {
  return new Lienzo(ancho, alto);
}
