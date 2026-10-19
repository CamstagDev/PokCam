// Colores y tipografía del juego, en un solo lugar. Los mismos tonos
// oscuros de SudoCam y TaskCam.

export const COLORES = {
  fondo: 0x0d0e13,
  panel: 0x1a1c25,
  borde: 0x2e3140,
  texto: 0xe8e9ef,
  textoSuave: 0x8a8fa3,
  acento: 0x2ec4a6,
  fichas: 0x3d8bfd,
  multi: 0xf0544f,
  carta: 0xf4f1ea,
  cartaRoja: 0xd23c3c,
  cartaNegra: 0x22232b,
} as const;

export const FUENTE = 'system-ui, "Segoe UI", Roboto, sans-serif';

// Phaser pide los colores de texto como '#rrggbb'.
export function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function estiloTexto(tamano: number, color: number = COLORES.texto): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FUENTE, fontSize: `${tamano}px`, color: css(color) };
}
