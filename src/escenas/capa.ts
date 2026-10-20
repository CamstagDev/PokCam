import Phaser from 'phaser';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';

// Una pantalla encima de la escena, con título y botón Cerrar. El fondo
// tapa los toques a lo que hay detrás. En el mapa, que tiene una cámara
// que se desplaza y otra fija, la capa solo la dibuja la fija.
export function abrirCapa(escena: Phaser.Scene, titulo: string): Phaser.GameObjects.Container {
  const { width, height } = escena.scale;
  const velo = escena.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.94).setInteractive();
  const texto = escena.add.text(width / 2, 60, titulo, estiloTexto(38)).setOrigin(0.5);
  const capa = escena.add.container(0, 0, [velo, texto]).setDepth(200);
  capa.add(crearBoton(escena, width / 2, height - 50, 'Cerrar', COLORES.borde, () => capa.destroy()));
  if (escena.cameras.cameras.length > 1) escena.cameras.main.ignore(capa);
  return capa;
}
