import Phaser from 'phaser';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';

// Una pregunta de sí o no encima de la escena. El fondo tapa los toques a
// lo que hay detrás hasta que se elige una opción.
export function confirmar(
  escena: Phaser.Scene,
  pregunta: string,
  etiquetaSi: string,
  colorSi: number,
  alConfirmar: () => void,
): void {
  const { width, height } = escena.scale;
  const velo = escena.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.8).setInteractive();
  const panel = escena.add.rectangle(width / 2, height / 2, 620, 260, COLORES.panel).setStrokeStyle(3, COLORES.borde);
  const texto = escena.add
    .text(width / 2, height / 2 - 50, pregunta, { ...estiloTexto(26), align: 'center', wordWrap: { width: 560 } })
    .setOrigin(0.5);
  const cerrar = () => capa.destroy();
  const si = crearBoton(escena, width / 2 - 120, height / 2 + 70, etiquetaSi, colorSi, () => {
    cerrar();
    alConfirmar();
  });
  const no = crearBoton(escena, width / 2 + 120, height / 2 + 70, 'Cancelar', COLORES.borde, cerrar);
  const capa = escena.add.container(0, 0, [velo, panel, texto, si, no]).setDepth(100);
}

// Un aviso con un solo botón para cerrarlo.
export function avisar(escena: Phaser.Scene, mensaje: string): void {
  const { width, height } = escena.scale;
  const velo = escena.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.8).setInteractive();
  const panel = escena.add.rectangle(width / 2, height / 2, 620, 240, COLORES.panel).setStrokeStyle(3, COLORES.borde);
  const texto = escena.add
    .text(width / 2, height / 2 - 40, mensaje, { ...estiloTexto(26), align: 'center', wordWrap: { width: 560 } })
    .setOrigin(0.5);
  const ok = crearBoton(escena, width / 2, height / 2 + 60, 'Aceptar', COLORES.acento, () => capa.destroy());
  const capa = escena.add.container(0, 0, [velo, panel, texto, ok]).setDepth(100);
}
