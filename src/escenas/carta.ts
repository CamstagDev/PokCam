import Phaser from 'phaser';
import { FICHAS_POR_MODIFICACION, SIMBOLO_PALO, nombreRango, type Carta } from '../juego/cartas.ts';
import { COLORES, estiloTexto } from './estilo.ts';

// Una carta de `ancho` × `alto` centrada en (x, y): el rango arriba a la
// izquierda, el palo en el medio y abajo lo que suman sus modificaciones
// (fichas a la izquierda, multiplicador a la derecha).
export function dibujarCarta(escena: Phaser.Scene, x: number, y: number, carta: Carta, ancho: number, alto: number): Phaser.GameObjects.Container {
  const grande = ancho >= 100;
  const roja = carta.palo === 'corazones' || carta.palo === 'diamantes';
  const color = roja ? COLORES.cartaRoja : COLORES.cartaNegra;
  const radio = grande ? 10 : 6;
  const fondo = escena.add.graphics();
  fondo.fillStyle(COLORES.carta).fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, radio);
  if (grande) fondo.lineStyle(2, COLORES.borde).strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, radio);
  const margen = grande ? 10 : 6;
  const rango = escena.add.text(-ancho / 2 + margen, -alto / 2 + margen / 2 + 1, nombreRango(carta.rango), estiloTexto(Math.round(ancho * 0.26), color));
  const palo = escena.add.text(0, alto * 0.07, SIMBOLO_PALO[carta.palo], estiloTexto(Math.round(ancho * 0.5), color)).setOrigin(0.5);
  const objetos: Phaser.GameObjects.GameObject[] = [fondo, rango, palo];

  const tamano = Math.max(11, Math.round(ancho * 0.17));
  const abajo = alto / 2 - margen / 2;
  const fichas = (carta.modificaciones?.fichas ?? 0) * FICHAS_POR_MODIFICACION;
  const multi = carta.modificaciones?.multi ?? 0;
  if (fichas > 0) objetos.push(escena.add.text(-ancho / 2 + margen / 2 + 1, abajo, `+${fichas}`, estiloTexto(tamano, COLORES.fichas)).setOrigin(0, 1));
  if (multi > 0) objetos.push(escena.add.text(ancho / 2 - margen / 2 - 1, abajo, `+${multi}×`, estiloTexto(tamano, COLORES.multi)).setOrigin(1, 1));
  return escena.add.container(x, y, objetos);
}
