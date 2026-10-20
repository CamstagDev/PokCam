import Phaser from 'phaser';
import './estilos.css';
import { EscenaMenu } from './escenas/EscenaMenu.ts';
import { EscenaRanuras } from './escenas/EscenaRanuras.ts';
import { EscenaMapa } from './escenas/EscenaMapa.ts';
import { EscenaMesa } from './escenas/EscenaMesa.ts';
import { EscenaBaratijas } from './escenas/EscenaBaratijas.ts';
import { COLORES } from './escenas/estilo.ts';

// El juego se dibuja siempre en 1280×720 y Phaser lo escala para que
// quepa en la ventana o la pantalla del teléfono (en horizontal), dejando
// bandas del color de fondo si sobra espacio.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: COLORES.fondo,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  // La primera es la que arranca: el menú principal.
  scene: [EscenaMenu, EscenaRanuras, EscenaMapa, EscenaMesa, EscenaBaratijas],
});
