import Phaser from 'phaser';
import { COLORES, estiloTexto } from './estilo.ts';
import { pixelArt } from './pixel/texturas.ts';

// El nivel de riesgo de la partida, arriba a la derecha junto al oro, en el
// mapa y en la mesa.
export function mostrarRiesgo(escena: Phaser.Scene, riesgo: number): Phaser.GameObjects.Container {
  const x = escena.scale.width - 420;
  const fondo = escena.add.graphics();
  fondo.fillStyle(COLORES.panel).fillRoundedRect(-80, -24, 160, 48, 24);
  fondo.lineStyle(2, COLORES.multi).strokeRoundedRect(-80, -24, 160, 48, 24);
  const icono = pixelArt(escena, -52, 0, 'ui', 'riesgo', 32);
  const texto = escena.add.text(14, 0, `Riesgo ${riesgo}`, estiloTexto(22, COLORES.multi)).setOrigin(0.5);
  return escena.add.container(x, 50, [fondo, icono, texto]).setDepth(50);
}
