// Los nodos del mapa como fichas de póker apoyadas en el paño: un canto
// más oscuro abajo (se ve el grosor al inclinar el tablero), la cara del
// color del tipo de nodo, rayas blancas en el borde y el icono en el
// centro. Las que se pueden elegir llevan una luz en el borde, quieta, que
// se prende al pasar el mouse por encima.

import Phaser from 'phaser';
import type { TipoNodo } from '../mapa/mapa.ts';
import { pixelArt } from './pixel/texturas.ts';

export const COLOR_DE_FICHA: Record<TipoNodo, number> = {
  inicio: 0xe9e4d8,
  combate: 0xc63a32,
  elite: 0x7b3fb0,
  jefe: 0x26272e,
  vendedor: 0x2f6fd6,
  tienda: 0x2b9a58,
  eliminador: 0x7c858d,
  manoNegra: 0x15161b,
  pintor: 0xe0822a,
  evento: 0xd9b230,
  descanso: 0x1c9e95,
};

const RAYAS = 6;
const LUZ = 0xfff1b8;

export interface FichaDePoker {
  contenedor: Phaser.GameObjects.Container;
  cara: Phaser.GameObjects.Arc; // la que recibe los toques
  icono: Phaser.GameObjects.Image;
  // Prende o apaga la luz del borde (si la tiene).
  iluminar(prendida: boolean): void;
}

// Las rayas del canto, del mismo color que las del borde.
function blancoDeCanto(tipo: TipoNodo): number {
  return tipo === 'inicio' || tipo === 'evento' ? 0x8a6d3b : 0xf6f3ea;
}

function oscurecer(color: number, factor: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return Phaser.Display.Color.GetColor(c.red * factor, c.green * factor, c.blue * factor);
}

export function crearFichaDePoker(
  escena: Phaser.Scene,
  tipo: TipoNodo,
  radio: number,
  { conLuz, borde }: { conLuz: boolean; borde?: number },
): FichaDePoker {
  const color = COLOR_DE_FICHA[tipo];
  // El canto: la ficha repetida más abajo y la franja entre las dos. Como
  // la ficha se achata al acostarla, se dibuja alto para que se note.
  const grosor = radio * 0.42;
  const canto = escena.add.graphics();
  canto.fillStyle(oscurecer(color, 0.55)).fillCircle(0, grosor, radio).fillRect(-radio, 0, radio * 2, grosor);
  canto.fillStyle(blancoDeCanto(tipo), 0.85);
  for (const x of [-0.72, -0.2, 0.32, 0.8]) canto.fillRect(radio * x - radio * 0.07, radio * 0.25, radio * 0.14, grosor);
  const cara = escena.add.circle(0, 0, radio, color);
  const dibujo = escena.add.graphics();
  // Rayas del borde, alternadas con el color de la ficha.
  const blanco = blancoDeCanto(tipo);
  dibujo.lineStyle(radio * 0.2, blanco);
  for (let i = 0; i < RAYAS; i++) {
    const inicio = (i / RAYAS) * Math.PI * 2;
    dibujo.beginPath();
    dibujo.arc(0, 0, radio * 0.89, inicio, inicio + Math.PI / (RAYAS * 1.4));
    dibujo.strokePath();
  }
  // El círculo de adentro, con un anillo fino.
  dibujo.fillStyle(oscurecer(color, 0.85)).fillCircle(0, 0, radio * 0.62);
  dibujo.lineStyle(2, blanco, 0.8).strokeCircle(0, 0, radio * 0.66);
  if (borde !== undefined) dibujo.lineStyle(4, borde).strokeCircle(0, 0, radio);
  const texto = pixelArt(escena, 0, 0, 'nodo', tipo, Math.round((radio * 0.85) / 16) * 16 || 16);

  const partes: Phaser.GameObjects.GameObject[] = [canto, cara, dibujo, texto];
  let resplandor: Phaser.GameObjects.Graphics | undefined;
  let destello: Phaser.GameObjects.Graphics | undefined;
  if (conLuz) {
    // Un aro que brilla y un destello fijo arriba, apagados hasta iluminar.
    resplandor = escena.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    resplandor.lineStyle(radio * 0.34, LUZ, 0.25).strokeCircle(0, 0, radio * 1.1);
    resplandor.lineStyle(radio * 0.14, LUZ, 0.8).strokeCircle(0, 0, radio * 1.04);
    destello = escena.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 6; i++) {
      destello.lineStyle(radio * (0.1 + i * 0.03), 0xffffff, 0.12 + i * 0.08);
      destello.beginPath();
      destello.arc(0, 0, radio * 1.04, -0.5 + i * 0.08, 0.5 - i * 0.08);
      destello.strokePath();
    }
    destello.setRotation(-Math.PI / 2);
    resplandor.setVisible(false);
    destello.setVisible(false);
    partes.push(resplandor, destello);
  }
  const contenedor = escena.add.container(0, 0, partes);

  return {
    contenedor,
    cara,
    icono: texto,
    iluminar(prendida) {
      resplandor?.setVisible(prendida);
      destello?.setVisible(prendida);
    },
  };
}
