import Phaser from 'phaser';
import './estilos.css';
import { EscenaMenu } from './escenas/EscenaMenu.ts';
import { EscenaRanuras } from './escenas/EscenaRanuras.ts';
import { EscenaBarajas } from './escenas/EscenaBarajas.ts';
import { EscenaMapa } from './escenas/EscenaMapa.ts';
import { EscenaMesa } from './escenas/EscenaMesa.ts';
import { EscenaBaratijas } from './escenas/EscenaBaratijas.ts';
import { EscenaColecciones } from './escenas/EscenaColecciones.ts';
import { EscenaEliminador } from './escenas/EscenaEliminador.ts';
import { EscenaManoNegra } from './escenas/EscenaManoNegra.ts';
import { EscenaEvento } from './escenas/EscenaEvento.ts';
import { EscenaPintor } from './escenas/EscenaPintor.ts';
import { EscenaTienda } from './escenas/EscenaTienda.ts';
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
  scene: [EscenaMenu, EscenaRanuras, EscenaBarajas, EscenaMapa, EscenaMesa, EscenaBaratijas, EscenaEliminador, EscenaManoNegra, EscenaTienda, EscenaPintor, EscenaEvento, EscenaColecciones],
});
