// Los tres botones redondos de abajo a la izquierda, presentes en el mapa,
// la mesa, el vendedor y la recompensa del élite: muestran las baratijas
// del jugador, su mazo y lo que vale cada mano de póker.

import Phaser from 'phaser';
import { DATOS_RAREZA, RAREZAS, baratijasDe, buscarConjunto, probabilidadComun, type Baratija, type Rareza } from '../juego/baratijas.ts';
import { PALOS, ordenarMano } from '../juego/cartas.ts';
import { datosDeMano, type TipoMano } from '../juego/manos.ts';
import { mesaDePartida, probabilidadesDeRareza, type Partida } from '../juego/partida.ts';
import { crearBotonRedondo } from './boton.ts';
import { dibujarCarta } from './carta.ts';
import { abrirCapa } from './capa.ts';
import { COLORES, estiloTexto } from './estilo.ts';

// Lee la partida al tocar, para mostrar siempre lo último (por ejemplo,
// recién comprada una baratija).
export function mostrarBotonesInventario(escena: Phaser.Scene, partida: () => Partida): Phaser.GameObjects.Container[] {
  const y = escena.scale.height - 60;
  return [
    crearBotonRedondo(escena, 50, y, '✦', 'Baratijas', () => verBaratijas(escena, partida())),
    crearBotonRedondo(escena, 120, y, '▤', 'Mazo', () => verMazo(escena, partida())),
    crearBotonRedondo(escena, 190, y, '≡', 'Manos', () => verManos(escena, partida())),
  ].map((boton) => boton.setDepth(60));
}

// De a POR_PAGINA fichas (4 por fila); con más, ◀ y ▶ pasan de página.
const POR_PAGINA = 8;

function verBaratijas(escena: Phaser.Scene, partida: Partida, pagina = 0): void {
  const { width, height } = escena.scale;
  const todas = baratijasDe(partida.baratijas);
  const capa = abrirCapa(escena, `Tus baratijas (${todas.length})`);
  const paginas = Math.ceil(todas.length / POR_PAGINA);
  const baratijas = todas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  if (paginas > 1) {
    const cambiar = (otra: number) => {
      capa.destroy();
      verBaratijas(escena, partida, (otra + paginas) % paginas);
    };
    capa.add([
      crearBotonRedondo(escena, width / 2 - 150, height - 50, '◀', '', () => cambiar(pagina - 1)),
      crearBotonRedondo(escena, width / 2 + 150, height - 50, '▶', '', () => cambiar(pagina + 1)),
      escena.add.text(width / 2 + 190, height - 50, `${pagina + 1} de ${paginas}`, estiloTexto(18, COLORES.textoSuave)).setOrigin(0, 0.5),
    ]);
  }

  // Con qué probabilidad sale cada rareza en cada lugar de una oferta.
  const probabilidades = probabilidadesDeRareza(partida);
  const porRareza: Record<Rareza, number> = { comun: probabilidadComun(probabilidades), ...probabilidades };
  const partes = RAREZAS.map((r) => `${DATOS_RAREZA[r].nombre} ${Math.round(porRareza[r] * 100)}%`);
  capa.add(escena.add.text(width / 2, height - 150, 'Al ofrecer baratijas, cada lugar sale:', estiloTexto(18, COLORES.textoSuave)).setOrigin(0.5));
  RAREZAS.forEach((rareza, i) => {
    const x = width / 2 + (i - 1.5) * 190;
    capa.add(escena.add.text(x, height - 120, partes[i]!, estiloTexto(20, COLOR_RAREZA[rareza])).setOrigin(0.5));
  });

  if (baratijas.length === 0) {
    capa.add(escena.add.text(width / 2, height / 2 - 40, 'Todavía no tienes baratijas.', estiloTexto(26, COLORES.textoSuave)).setOrigin(0.5));
    return;
  }
  // En filas de 4 fichas.
  const ancho = 290;
  const alto = 170;
  const porFila = 4;
  baratijas.forEach((baratija, i) => {
    const fila = Math.floor(i / porFila);
    const enFila = Math.min(porFila, baratijas.length - fila * porFila);
    const x = width / 2 + ((i % porFila) - (enFila - 1) / 2) * (ancho + 12);
    const y = 205 + fila * (alto + 14);
    capa.add(fichaDeBaratija(escena, x, y, baratija, ancho, alto, baratija.estado?.(mesaDePartida(partida))));
    // Las que esperan transformarse dicen en cuántos combates.
    const espera = partida.transformaciones.find((t) => t.ids.includes(baratija.id));
    if (espera) {
      const aviso = `→ ${DATOS_RAREZA[espera.hacia].nombre} en ${espera.combatesRestantes} combate${espera.combatesRestantes === 1 ? '' : 's'}`;
      capa.add(escena.add.text(x, y + alto / 2 - 14, aviso, estiloTexto(15, COLOR_RAREZA[espera.hacia])).setOrigin(0.5, 1));
    }
  });
}

export const COLOR_RAREZA: Record<Rareza, number> = {
  comun: COLORES.textoSuave,
  infrecuente: COLORES.fichas,
  rara: COLORES.rara,
  legendaria: COLORES.oro,
};

// La ficha de una baratija: icono, nombre, descripción, rareza (que pinta
// también el borde) y, abajo, el set al que pertenece. La usan también el vendedor, la recompensa del élite
// y la colección.
export function fichaDeBaratija(
  escena: Phaser.Scene,
  x: number,
  y: number,
  baratija: Baratija,
  ancho = 300,
  alto = 170,
  estado?: string, // cómo va su efecto, abajo a la izquierda
): Phaser.GameObjects.Container {
  const color = COLOR_RAREZA[baratija.rareza];
  const fondo = escena.add.rectangle(0, 0, ancho, alto, COLORES.panel).setStrokeStyle(2, color);
  const rareza = escena.add.text(-ancho / 2 + 72, -alto / 2 + 44, DATOS_RAREZA[baratija.rareza].nombre, estiloTexto(15, color));
  const icono = escena.add.text(-ancho / 2 + 20, -alto / 2 + 16, baratija.icono, estiloTexto(34)).setOrigin(0, 0);
  const nombre = escena.add.text(-ancho / 2 + 72, -alto / 2 + 16, baratija.nombre, estiloTexto(22)).setOrigin(0, 0);
  const descripcion = escena.add
    .text(-ancho / 2 + 20, -alto / 2 + 76, baratija.descripcion, { ...estiloTexto(16, COLORES.textoSuave), wordWrap: { width: ancho - 40 } })
    .setOrigin(0, 0);
  // Los nombres largos se achican, y las descripciones largas bajan de
  // tamaño hasta caber sobre las etiquetas de abajo.
  const libre = ancho - 92;
  if (nombre.width > libre) nombre.setScale(libre / nombre.width);
  for (let tamano = 15; descripcion.height > alto - 76 - 24 && tamano >= 12; tamano--) descripcion.setFontSize(tamano);
  const partes = [fondo, icono, nombre, descripcion, rareza];
  if (baratija.conjunto) {
    const set = buscarConjunto(baratija.conjunto).nombre;
    partes.push(escena.add.text(ancho / 2 - 14, alto / 2 - 8, set, estiloTexto(13, COLORES.acento)).setOrigin(1, 1));
  }
  // Con el nombre del set al lado no cabe el "Ahora:".
  const textoEstado = baratija.conjunto ? estado?.replace(/^Ahora: /, '') : estado;
  if (textoEstado) partes.push(escena.add.text(-ancho / 2 + 20, alto / 2 - 8, textoEstado, estiloTexto(14, COLORES.oro)).setOrigin(0, 1));
  return escena.add.container(x, y, partes).setSize(ancho, alto);
}

function verMazo(escena: Phaser.Scene, partida: Partida): void {
  const { width } = escena.scale;
  const capa = abrirCapa(escena, `Tu mazo (${partida.mazo.length} cartas)`);
  // Una fila por palo, de mayor a menor.
  const ordenadas = ordenarMano(partida.mazo, 'palo');
  const ancho = 62;
  const alto = 86;
  const separacion = ancho + 6;
  PALOS.forEach((palo, fila) => {
    const cartas = ordenadas.filter((c) => c.palo === palo);
    const inicio = width / 2 - ((cartas.length - 1) * separacion) / 2;
    cartas.forEach((carta, i) => capa.add(dibujarCarta(escena, inicio + i * separacion, 160 + fila * (alto + 18), carta, ancho, alto)));
  });
}

// De la mejor mano a la peor, con el nivel de cada una en la partida.
const ORDEN_MANOS: readonly TipoMano[] = ['escaleraColor', 'poker', 'full', 'color', 'escalera', 'trio', 'doblePar', 'par', 'cartaAlta'];

function verManos(escena: Phaser.Scene, partida: Partida): void {
  const { width } = escena.scale;
  const capa = abrirCapa(escena, 'Manos de póker');
  const ancho = 640;
  ORDEN_MANOS.forEach((tipo, i) => {
    const nivel = partida.niveles[tipo];
    const { nombre, fichas, multi } = datosDeMano(tipo, nivel);
    const y = 135 + i * 54;
    capa.add([
      escena.add.rectangle(width / 2, y, ancho, 46, COLORES.panel).setStrokeStyle(2, COLORES.borde),
      escena.add.text(width / 2 - ancho / 2 + 24, y, nombre, estiloTexto(22)).setOrigin(0, 0.5),
      escena.add.text(width / 2 + 40, y, `Nv. ${nivel}`, estiloTexto(18, nivel > 1 ? COLORES.oro : COLORES.textoSuave)).setOrigin(0.5),
      ficha(escena, width / 2 + 150, y, String(fichas), COLORES.fichas),
      escena.add.text(width / 2 + 205, y, '×', estiloTexto(22, COLORES.textoSuave)).setOrigin(0.5),
      ficha(escena, width / 2 + 260, y, String(multi), COLORES.multi),
    ]);
  });
  capa.add([
    escena.add.text(width / 2 + 150, 98, 'Fichas', estiloTexto(16, COLORES.textoSuave)).setOrigin(0.5),
    escena.add.text(width / 2 + 260, 98, 'Multi', estiloTexto(16, COLORES.textoSuave)).setOrigin(0.5),
  ]);
}

function ficha(escena: Phaser.Scene, x: number, y: number, texto: string, color: number): Phaser.GameObjects.Container {
  const fondo = escena.add.graphics().fillStyle(color).fillRoundedRect(-40, -16, 80, 32, 8);
  return escena.add.container(x, y, [fondo, escena.add.text(0, 0, texto, estiloTexto(20)).setOrigin(0.5)]);
}
