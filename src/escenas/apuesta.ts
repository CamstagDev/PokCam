import Phaser from 'phaser';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';

// La pregunta de la apuesta al empezar un combate: cuánto apostar, de 0 a
// `maximo`, con botones de ±10 y ±100. Tapa la mesa hasta que se elige.
export function preguntarApuesta(escena: Phaser.Scene, maximo: number, alElegir: (cantidad: number) => void): void {
  const { width, height } = escena.scale;
  const centro = height / 2;
  let cantidad = 0;

  const velo = escena.add.rectangle(width / 2, centro, width, height, COLORES.fondo, 0.85).setInteractive();
  const panel = escena.add.rectangle(width / 2, centro, 720, 400, COLORES.panel).setStrokeStyle(3, COLORES.oro);
  const titulo = escena.add.text(width / 2, centro - 150, '¿Apuestas?', estiloTexto(40, COLORES.oro)).setOrigin(0.5);
  const explicacion = escena.add
    .text(width / 2, centro - 95, `Si ganas el combate te llevas lo apostado; si pierdes, lo pierdes.\nMáximo: ${maximo} de oro`, {
      ...estiloTexto(20, COLORES.textoSuave),
      align: 'center',
    })
    .setOrigin(0.5);
  const valor = escena.add.text(width / 2, centro - 20, '0', estiloTexto(56, COLORES.oro)).setOrigin(0.5);

  const cambiar = (delta: number) => {
    cantidad = Phaser.Math.Clamp(cantidad + delta, 0, maximo);
    valor.setText(String(cantidad));
    apostar.activar(cantidad > 0);
  };
  const pasos = [-100, -10, 10, 100].map((delta, i) =>
    crearBoton(escena, width / 2 + (i - 1.5) * 120, centro + 60, delta > 0 ? `+${delta}` : `−${-delta}`, COLORES.borde, () => cambiar(delta), 100),
  );
  const cerrar = (final: number) => {
    capa.destroy();
    alElegir(final);
  };
  const noApostar = crearBoton(escena, width / 2 - 130, centro + 145, 'No apostar', COLORES.borde, () => cerrar(0), 220);
  const apostar = crearBoton(escena, width / 2 + 130, centro + 145, 'Apostar', COLORES.oro, () => cerrar(cantidad), 220);
  apostar.activar(false);

  const capa = escena.add.container(0, 0, [velo, panel, titulo, explicacion, valor, ...pasos, noApostar, apostar]).setDepth(150);
}
