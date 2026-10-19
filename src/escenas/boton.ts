import Phaser from 'phaser';
import { COLORES, estiloTexto } from './estilo.ts';

export interface Boton extends Phaser.GameObjects.Container {
  activar(activo: boolean): void;
}

// Un botón redondeado con texto. Se apaga (gris y sin respuesta) con activar(false).
export function crearBoton(
  escena: Phaser.Scene,
  x: number,
  y: number,
  texto: string,
  color: number,
  alTocar: () => void,
): Boton {
  const ancho = 200;
  const alto = 56;
  const fondo = escena.add.graphics();
  const etiqueta = escena.add.text(0, 0, texto, estiloTexto(22)).setOrigin(0.5);
  const boton = escena.add.container(x, y, [fondo, etiqueta]) as Boton;
  boton.setSize(ancho, alto).setInteractive({ useHandCursor: true });

  let activo = true;
  const pintar = (relleno: number) => {
    fondo.clear().fillStyle(relleno).fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 12);
  };
  boton.activar = (valor) => {
    activo = valor;
    pintar(valor ? color : COLORES.borde);
    etiqueta.setAlpha(valor ? 1 : 0.5);
  };
  boton.activar(true);

  boton.on('pointerdown', () => {
    if (!activo) return;
    escena.tweens.add({ targets: boton, scale: 0.94, duration: 60, yoyo: true });
    alTocar();
  });
  return boton;
}
