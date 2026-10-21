import Phaser from 'phaser';
import { valorDeVenta, type Baratija } from '../juego/baratijas.ts';
import type { Prevision } from '../juego/partida.ts';
import { crearBoton } from './boton.ts';
import { COLORES, estiloTexto } from './estilo.ts';

export interface OpcionesApuesta {
  maximo: number; // el oro que se puede apostar
  // Las baratijas que también se pueden apostar (con el Tasador), por su
  // valor de venta; vacío si no se puede.
  baratijas: readonly Baratija[];
  // Lo que cambian los bonos de set y la racha, si tocan las apuestas.
  notas: readonly string[];
  oro: number; // el que tiene ahora
  // El oro con el que se quedaría al ganar y al perder con esa apuesta.
  prever(cantidad: number, baratijas: string[]): { ganar: Prevision; perder: Prevision };
}

const ANCHO_FICHA = 96;
const POR_FILA = 6;

// La pregunta de la apuesta al empezar un combate: cuánto oro apostar, de 0
// a `maximo`, con botones de ±10 y ±100, y qué baratijas, tocándolas.
// Debajo se ve cómo queda el oro al ganar y al perder. Tapa la mesa hasta
// que se elige.
export function preguntarApuesta(
  escena: Phaser.Scene,
  { maximo, baratijas, notas, oro, prever }: OpcionesApuesta,
  alElegir: (cantidad: number, baratijas: string[]) => void,
): void {
  const { width, height } = escena.scale;
  const filas = Math.ceil(baratijas.length / POR_FILA);
  const lineas = [
    'Si ganas el combate te llevas lo apostado; si pierdes, lo pierdes.',
    `Oro: hasta ${maximo}${baratijas.length > 0 ? '. Baratijas: por su valor de venta' : ''}`,
    ...notas,
  ];
  const explicacion = escena.add
    .text(width / 2, 0, lineas.join('\n'), { ...estiloTexto(19, COLORES.textoSuave), align: 'center', wordWrap: { width: 700 } })
    .setOrigin(0.5, 0);
  // Lo que ocupan las notas además de las dos primeras líneas.
  const altoNota = Math.max(0, explicacion.height - 40);
  const alto = (filas > 0 ? 540 + (filas - 1) * 76 : 450) + altoNota;
  const arriba = height / 2 - alto / 2;
  explicacion.setY(arriba + 90);
  let cantidad = 0;
  const elegidas = new Set<string>();

  const velo = escena.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.85).setInteractive();
  const panel = escena.add.rectangle(width / 2, height / 2, 760, alto, COLORES.panel).setStrokeStyle(3, COLORES.oro);
  const titulo = escena.add.text(width / 2, arriba + 50, '¿Apuestas?', estiloTexto(40, COLORES.oro)).setOrigin(0.5);
  const yValor = arriba + 170 + altoNota;
  const valor = escena.add.text(width / 2, yValor, '0', estiloTexto(52, COLORES.oro)).setOrigin(0.5);

  // Debajo de los botones: cómo queda el oro si se gana y si se pierde.
  const yPrevision = yValor + 135;
  const siGanas = escena.add.text(width / 2, yPrevision - 14, '', estiloTexto(20, COLORES.acento)).setOrigin(0.5);
  const siPierdes = escena.add.text(width / 2, yPrevision + 14, '', estiloTexto(20, COLORES.multi)).setOrigin(0.5);
  const diferencia = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);
  const describir = (p: Prevision) => (p.terminaPartida ? `fin de la partida (${diferencia(p.oro - oro)})` : `${p.oro} de oro (${diferencia(p.oro - oro)})`);
  const total = () => cantidad + baratijas.filter((b) => elegidas.has(b.id)).reduce((suma, b) => suma + valorDeVenta(b), 0);
  const refrescar = () => {
    valor.setText(elegidas.size > 0 ? `${cantidad} + baratijas = ${total()}` : String(cantidad));
    apostar.activar(total() > 0);
    const { ganar, perder } = prever(cantidad, [...elegidas]);
    siGanas.setText(`Si ganas: ${describir(ganar)}`);
    siPierdes.setText(`Si pierdes: ${describir(perder)}${elegidas.size > 0 ? ' y las baratijas' : ''}`);
  };
  const cambiar = (delta: number) => {
    cantidad = Phaser.Math.Clamp(cantidad + delta, 0, maximo);
    refrescar();
  };
  // << resta 100, < resta 10, > suma 10, >> suma 100.
  const pasos = ([[-100, '<<'], [-10, '<'], [10, '>'], [100, '>>']] as const).map(([delta, etiqueta], i) => {
    const boton = crearBoton(escena, width / 2 + (i - 1.5) * 120, yValor + 75, etiqueta, COLORES.borde, () => cambiar(delta), 100);
    if (maximo === 0) boton.activar(false);
    return boton;
  });

  // Cada baratija es una ficha con su icono y su valor; tocarla la suma o
  // la quita de la apuesta.
  const yFichas = yValor + 225;
  const fichas = baratijas.map((baratija, i) => {
    const fila = Math.floor(i / POR_FILA);
    const enFila = Math.min(POR_FILA, baratijas.length - fila * POR_FILA);
    const x = width / 2 + ((i % POR_FILA) - (enFila - 1) / 2) * (ANCHO_FICHA + 12);
    const fondo = escena.add.rectangle(0, 0, ANCHO_FICHA, 66, COLORES.fondo).setStrokeStyle(2, COLORES.borde);
    const icono = escena.add.text(0, -12, baratija.icono, estiloTexto(26)).setOrigin(0.5);
    const precio = escena.add.text(0, 18, String(valorDeVenta(baratija)), estiloTexto(16, COLORES.oro)).setOrigin(0.5);
    const ficha = escena.add.container(x, yFichas + fila * 76, [fondo, icono, precio]).setSize(ANCHO_FICHA, 66);
    ficha.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (elegidas.has(baratija.id)) elegidas.delete(baratija.id);
      else elegidas.add(baratija.id);
      const marcada = elegidas.has(baratija.id);
      fondo.setStrokeStyle(marcada ? 3 : 2, marcada ? COLORES.oro : COLORES.borde).setFillStyle(marcada ? COLORES.panel : COLORES.fondo);
      refrescar();
    });
    return ficha;
  });
  const leyenda =
    baratijas.length > 0 ? [escena.add.text(width / 2, yFichas - 48, 'Toca las baratijas que quieras apostar', estiloTexto(17, COLORES.textoSuave)).setOrigin(0.5)] : [];

  const cerrar = (final: number, ids: string[]) => {
    capa.destroy();
    alElegir(final, ids);
  };
  const yBotones = arriba + alto - 50;
  const noApostar = crearBoton(escena, width / 2 - 130, yBotones, 'No apostar', COLORES.borde, () => cerrar(0, []), 220);
  const apostar = crearBoton(escena, width / 2 + 130, yBotones, 'Apostar', COLORES.oro, () => cerrar(cantidad, [...elegidas]), 220);
  refrescar();

  const capa = escena.add
    .container(0, 0, [velo, panel, titulo, explicacion, valor, ...pasos, siGanas, siPierdes, ...leyenda, ...fichas, noApostar, apostar])
    .setDepth(150);
}
