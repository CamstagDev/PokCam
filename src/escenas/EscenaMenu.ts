// La pantalla de inicio: el título y las opciones de empezar una partida
// nueva, seguir una guardada o ver la colección de baratijas.

import Phaser from 'phaser';
import { resumirTodas } from '../juego/guardado.ts';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { almacen } from './sesion.ts';
import { pixelArt } from './pixel/texturas.ts';

export class EscenaMenu extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    const { width, height } = this.scale;
    const titulo = this.add.text(width / 2, height / 2 - 140, 'PokCam', { ...estiloTexto(120, COLORES.acento), fontStyle: 'bold' });
    titulo.setOrigin(0.5);
    this.tweens.add({ targets: titulo, y: titulo.y - 8, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    (['picas', 'corazones', 'treboles', 'diamantes'] as const).forEach((palo, i) => pixelArt(this, width / 2 + (i - 1.5) * 56, height / 2 - 45, 'palo', palo, 36));

    crearBoton(this, width / 2, height / 2 + 70, 'Nueva partida', COLORES.acento, () =>
      this.scene.start('ranuras', { modo: 'nueva' }),
    );
    const continuar = crearBoton(this, width / 2, height / 2 + 145, 'Continuar', COLORES.fichas, () =>
      this.scene.start('ranuras', { modo: 'continuar' }),
    );
    continuar.activar(resumirTodas(almacen).some((r) => r !== null));
    crearBoton(this, width / 2, height / 2 + 220, 'Colecciones', COLORES.rara, () => this.scene.start('colecciones'));
  }
}
