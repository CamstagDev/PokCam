import Phaser from 'phaser';
import { FICHAS_POR_MODIFICACION, type Carta } from '../juego/cartas.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { pixelArt } from './pixel/texturas.ts';

// Una carta de `ancho` × `alto` centrada en (x, y), en pixel art (ver
// pixel/cartas.ts). Abajo en el medio, lo que suman sus modificaciones
// (fichas en azul, multiplicador en rojo); un comodín lleva una estrella
// arriba a la derecha.
export function dibujarCarta(escena: Phaser.Scene, x: number, y: number, carta: Carta, ancho: number, alto: number): Phaser.GameObjects.Container {
  const cara = pixelArt(escena, 0, 0, 'carta', `${carta.palo}-${carta.rango}`, alto).setDisplaySize(ancho, alto);
  const objetos: Phaser.GameObjects.GameObject[] = [cara];

  const tamano = Math.max(11, Math.round(ancho * 0.17));
  // Encima del rango dado vuelta de abajo.
  const abajo = alto / 2 - alto * 0.23;
  const fichas = (carta.modificaciones?.fichas ?? 0) * FICHAS_POR_MODIFICACION;
  const multi = carta.modificaciones?.multi ?? 0;
  const marcas = [
    ...(fichas > 0 ? [{ texto: `+${fichas}`, color: COLORES.fichas }] : []),
    ...(multi > 0 ? [{ texto: `+${multi}×`, color: COLORES.multi }] : []),
  ];
  const estilo = (color: number) => ({ ...estiloTexto(tamano, color), fontStyle: 'bold', stroke: '#f4f1ea', strokeThickness: 3 });
  marcas.forEach((marca, i) => {
    const xMarca = marcas.length === 1 ? 0 : (i === 0 ? -1 : 1) * ancho * 0.18;
    objetos.push(escena.add.text(xMarca, abajo, marca.texto, estilo(marca.color)).setOrigin(0.5, 1));
  });
  // El comodín (cuenta como de cualquier palo).
  if (carta.comodin) objetos.push(pixelArt(escena, ancho / 2 - ancho * 0.2, -alto / 2 + alto * 0.14, 'ui', 'estrella', Math.round(ancho * 0.3)));
  return escena.add.container(x, y, objetos);
}
