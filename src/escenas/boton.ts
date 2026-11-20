import Phaser from 'phaser';
import { COLORES, estiloTexto } from './estilo.ts';
import { pixelArt } from './pixel/texturas.ts';

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
  ancho = 200,
): Boton {
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

export interface BotonRedondo extends Phaser.GameObjects.Container {
  marcar(marcado: boolean): void;
}

// Un botón circular chico con un símbolo y una palabra debajo. Marcado,
// se pinta con el color de acento.
export function crearBotonRedondo(
  escena: Phaser.Scene,
  x: number,
  y: number,
  simbolo: string | readonly [string, string], // texto, o [grupo, id] de un sprite
  leyenda: string,
  alTocar: () => void,
): BotonRedondo {
  const radio = 24;
  const circulo = escena.add.circle(0, 0, radio, COLORES.borde);
  const etiqueta = typeof simbolo === 'string' ? escena.add.text(0, 0, simbolo, estiloTexto(18)).setOrigin(0.5) : pixelArt(escena, 0, 0, simbolo[0], simbolo[1], 32);
  const debajo = escena.add.text(0, radio + 12, leyenda, estiloTexto(13, COLORES.textoSuave)).setOrigin(0.5);
  const boton = escena.add.container(x, y, [circulo, etiqueta, debajo]) as BotonRedondo;
  boton.setSize(radio * 2, radio * 2).setInteractive({ useHandCursor: true });
  boton.marcar = (marcado) => void circulo.setFillStyle(marcado ? COLORES.acento : COLORES.borde);
  boton.on('pointerdown', () => {
    escena.tweens.add({ targets: boton, scale: 0.9, duration: 60, yoyo: true });
    alTocar();
  });
  return boton;
}
