// Los sprites como texturas de Phaser: cada uno se crea la primera vez que
// se usa, con su clave 'grupo:id' (ver catalogo.ts), y se escala sin
// suavizar para que los píxeles se vean nítidos.

import Phaser from 'phaser';
import { GRUPOS } from './catalogo.ts';
import { pixeles } from './paleta.ts';

const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export function textura(escena: Phaser.Scene, grupo: string, id: string): string {
  const clave = `${grupo}:${id}`;
  if (escena.textures.exists(clave)) return clave;
  const dibujo = GRUPOS[grupo]?.[id];
  if (!dibujo) throw new Error(`No hay sprite ${clave}`);
  const filas = pixeles(dibujo);
  const lienzo = escena.textures.createCanvas(clave, filas[0]!.length, filas.length);
  if (!lienzo) throw new Error(`No se pudo crear la textura ${clave}`);
  const ctx = lienzo.getContext();
  filas.forEach((fila, y) =>
    fila.forEach((color, x) => {
      if (color === null) return;
      ctx.fillStyle = css(color);
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  lienzo.refresh();
  lienzo.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return clave;
}

export function existeSprite(grupo: string, id: string): boolean {
  return !!GRUPOS[grupo]?.[id];
}

// Un sprite centrado en (x, y), de `alto` píxeles de pantalla (el ancho
// sigue la proporción). Mejor si `alto` es múltiplo del alto del sprite.
export function pixelArt(escena: Phaser.Scene, x: number, y: number, grupo: string, id: string, alto: number): Phaser.GameObjects.Image {
  const imagen = escena.add.image(x, y, textura(escena, grupo, id));
  return imagen.setScale(alto / imagen.height);
}

// El retrato de un personaje a la izquierda de un texto (un título o una
// línea), del alto que se pida.
export function retratoJuntoA(escena: Phaser.Scene, texto: Phaser.GameObjects.Text, id: string, alto = 80): Phaser.GameObjects.Image {
  const izquierda = texto.x - texto.displayWidth * texto.originX;
  const centro = texto.y + texto.displayHeight * (0.5 - texto.originY);
  return pixelArt(escena, izquierda - alto / 2 - 16, centro, 'retrato', id, alto).setDepth(texto.depth);
}
