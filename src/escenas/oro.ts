import Phaser from 'phaser';
import { COLORES, css, estiloTexto } from './estilo.ts';
import { pixelArt } from './pixel/texturas.ts';

export interface Marcador extends Phaser.GameObjects.Container {
  cambiar(oro: number): void;
}

// El oro de la partida, arriba a la derecha en el mapa y en la mesa. Queda
// por encima de los carteles de fin de combate para verse siempre.
export function mostrarOro(escena: Phaser.Scene, oro: number): Marcador {
  const x = escena.scale.width - 250;
  const fondo = escena.add.graphics();
  fondo.fillStyle(COLORES.panel).fillRoundedRect(-70, -24, 140, 48, 24);
  fondo.lineStyle(2, COLORES.oro).strokeRoundedRect(-70, -24, 140, 48, 24);
  const moneda = pixelArt(escena, -42, 0, 'ui', 'oro', 32);
  // En deuda (con la Tarjeta de crédito) el número se pinta de rojo.
  const texto = escena.add.text(-20, 0, String(oro), estiloTexto(24, oro < 0 ? COLORES.multi : COLORES.oro)).setOrigin(0, 0.5);
  const marcador = escena.add.container(x, 50, [fondo, moneda, texto]).setDepth(50) as Marcador;

  marcador.cambiar = (nuevo) => {
    texto.setText(String(nuevo)).setColor(css(nuevo < 0 ? COLORES.multi : COLORES.oro));
    escena.tweens.add({ targets: marcador, scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.easeOut' });
  };
  return marcador;
}
