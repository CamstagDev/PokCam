import Phaser from 'phaser';
import { baratijasDe } from '../juego/baratijas.ts';
import type { Partida } from '../juego/partida.ts';
import { COLORES, estiloTexto } from './estilo.ts';

// Con Crypto monedas, debajo del oro: las predicciones pendientes (↑ sube,
// ↓ baja, y en cuántos pasos) y lo que movió la última que se cumplió.
export function mostrarCripto(escena: Phaser.Scene, partida: Partida): void {
  if (!baratijasDe(partida.baratijas).some((b) => b.cripto)) return;
  const pendientes = partida.cripto.predicciones.map((p) => `${p.sube ? '↑' : '↓'} en ${p.pasos}`).join(' · ');
  const ultima = partida.cripto.ultima;
  const resultado = ultima ? `  ·  última: ${ultima.oro >= 0 ? '+' : '−'}${Math.abs(ultima.oro)} (${ultima.sube ? '↑' : '↓'}${ultima.porcentaje} %)` : '';
  const color = ultima && ultima.paso === partida.visitados.length ? (ultima.oro >= 0 ? COLORES.acento : COLORES.multi) : COLORES.textoSuave;
  escena.add
    .text(escena.scale.width - 250, 88, `🪙 ${pendientes || 'sin predicciones'}${resultado}`, estiloTexto(15, color))
    .setOrigin(0.5)
    .setDepth(50);
}
