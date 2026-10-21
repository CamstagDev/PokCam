// El mapa de la partida. Se recorre de abajo (inicio) hacia arriba (jefe),
// como en Inscryption, con la cámara muy cerca: solo se ven el piso actual
// y los dos siguientes. Arrastrando (o con la rueda) se baja a mirar el
// camino ya hecho, pero nunca se puede subir más allá de esos dos pisos.
// Los nodos a los que se puede ir laten. Tocar uno avanza: si es un
// combate abre la mesa, el vendedor abre su tienda de baratijas, el
// eliminador sus servicios, y el
// resto (tienda, evento, descanso) por ahora solo avanza. Cada vez que se elige un nodo la partida se guarda, y al
// volver al mapa la cámara sube suave hasta el piso nuevo.

import Phaser from 'phaser';
import { avanzar, enBancarrota, nivelDeRiesgo, nodoActual, nodosDisponibles, type Partida } from '../juego/partida.ts';
import { buscarNodo, type Nodo, type TipoNodo } from '../mapa/mapa.ts';
import { crearBoton } from './boton.ts';
import { avisar } from './confirmar.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { irAPartida, jugarPartida, partidaActual, terminarPartida } from './sesion.ts';

const ICONOS: Record<TipoNodo, string> = {
  inicio: '⌂',
  combate: '♠',
  elite: '♛',
  tienda: '$',
  vendedor: '✦',
  eliminador: '✂',
  manoNegra: '✋',
  evento: '?',
  descanso: '☕',
  jefe: '☠',
};

const PISOS_A_LA_VISTA = 2; // pisos por encima del actual que se ven
const ENTRE_PISOS = 210; // distancia vertical entre pisos
const ENTRE_COLUMNAS = 260;
const RADIO = 56;
const ARRIBA = 170; // dónde queda en pantalla el piso más alto a la vista
const ABAJO = 130; // margen bajo el piso del inicio
const BARRA = 100; // alto de la barra fija de arriba (título, menú, oro)
const ARRASTRE_MINIMO = 10; // por debajo de esto, soltar sobre un nodo es tocarlo
const ESPERA_AL_ENTRAR = 1000; // ms sin aceptar toques en los nodos al abrir el mapa

// Dónde quedó la cámara la última vez, para subir desde ahí al volver.
interface VistaMapa {
  semilla: number;
  scrollY: number;
}

export class EscenaMapa extends Phaser.Scene {
  constructor() {
    super('mapa');
  }

  create(): void {
    const partida = partidaActual(this);
    const { width, height } = this.scale;
    const ultimo = partida.mapa.pisos.length - 1;
    const pisoActual = nodoActual(partida).piso;
    const pisoVisible = Math.min(pisoActual + PISOS_A_LA_VISTA, ultimo);

    const yDe = (piso: number) => ARRIBA + (ultimo - piso) * ENTRE_PISOS;
    const posicion = (nodo: Nodo) => ({
      x: width / 2 + (nodo.columna - (partida.mapa.columnas - 1) / 2) * ENTRE_COLUMNAS,
      y: yDe(nodo.piso),
    });
    const alto = yDe(0) + ABAJO;

    // Mundo: caminos y nodos, hasta dos pisos por encima del actual.
    const caminos = this.add.graphics();
    for (const fila of partida.mapa.pisos) {
      for (const nodo of fila) {
        if (nodo.piso >= pisoVisible) continue;
        const desde = posicion(nodo);
        for (const id of nodo.siguientes) {
          const hasta = posicion(buscarNodo(partida.mapa, id));
          const recorrido = partida.visitados.includes(nodo.id) && partida.visitados.includes(id);
          caminos.lineStyle(recorrido ? 6 : 4, recorrido ? COLORES.acento : COLORES.borde);
          caminos.lineBetween(desde.x, desde.y, hasta.x, hasta.y);
        }
      }
    }

    let arrastrado = 0;
    let agarre: { y: number; scroll: number } | undefined;
    let listo = false;
    this.time.delayedCall(ESPERA_AL_ENTRAR, () => (listo = true));
    const disponibles = new Set(nodosDisponibles(partida).map((n) => n.id));
    for (const fila of partida.mapa.pisos) {
      for (const nodo of fila) {
        if (nodo.piso > pisoVisible) continue;
        const { x, y } = posicion(nodo);
        const actual = nodo.id === partida.nodoActual;
        const visitado = partida.visitados.includes(nodo.id);
        const relleno = actual ? COLORES.acento : visitado ? COLORES.borde : COLORES.panel;
        const circulo = this.add.circle(x, y, RADIO, relleno).setStrokeStyle(4, disponibles.has(nodo.id) ? COLORES.acento : COLORES.borde);
        this.add.text(x, y, ICONOS[nodo.tipo], estiloTexto(46, visitado && !actual ? COLORES.textoSuave : COLORES.texto)).setOrigin(0.5);

        if (disponibles.has(nodo.id)) {
          this.tweens.add({ targets: circulo, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          circulo.setInteractive({ useHandCursor: true }).on('pointerup', () => {
            // Solo cuenta si el toque empezó en el mapa (no es el final del
            // clic que lo abrió) y pasó un momento desde que apareció.
            if (listo && agarre && arrastrado < ARRASTRE_MINIMO) this.ir(partida, nodo);
          });
        }
      }
    }
    const mundo = [...this.children.list];

    // Barra fija de arriba, con su propia cámara para que no se mueva.
    this.add.rectangle(0, 0, width, BARRA, COLORES.fondo).setOrigin(0).setDepth(40);
    this.add.text(width / 2, 50, 'Elige tu camino', estiloTexto(30)).setOrigin(0.5).setDepth(41);
    crearBoton(this, 90, 50, 'Menú', COLORES.borde, () => this.scene.start('menu'), 130).setDepth(41);
    mostrarOro(this, partida.oro);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    const barra = this.children.list.filter((objeto) => !mundo.includes(objeto));

    const camara = this.cameras.main;
    camara.ignore(barra);
    this.cameras.add(0, 0, width, height).ignore(mundo);

    // Límites: arriba, el piso más alto a la vista; abajo, el inicio.
    const scrollMinimo = yDe(pisoVisible) - ARRIBA;
    const scrollMaximo = Math.max(scrollMinimo, alto - height);
    const acotar = (scroll: number) => Phaser.Math.Clamp(scroll, scrollMinimo, scrollMaximo);

    // Al empezar la partida la cámara arranca abajo del todo; si no, desde
    // donde estaba antes de avanzar, y sube hasta el piso nuevo.
    const anterior = this.registry.get('vistaMapa') as VistaMapa | undefined;
    const desde = anterior?.semilla === partida.mapa.semilla ? anterior.scrollY : scrollMaximo;
    camara.scrollY = acotar(desde);
    let subida: Phaser.Tweens.Tween | undefined;
    if (camara.scrollY !== scrollMinimo) {
      subida = this.tweens.add({ targets: camara, scrollY: scrollMinimo, delay: 250, duration: 800, ease: 'Sine.easeInOut' });
    }
    this.registry.set('vistaMapa', { semilla: partida.mapa.semilla, scrollY: scrollMinimo } satisfies VistaMapa);

    // Arrastrar con el ratón o el dedo, y la rueda.
    this.input.setDefaultCursor('grab');
    this.input.on('pointerdown', (puntero: Phaser.Input.Pointer) => {
      subida?.stop();
      agarre = { y: puntero.y, scroll: camara.scrollY };
      arrastrado = 0;
    });
    this.input.on('pointermove', (puntero: Phaser.Input.Pointer) => {
      if (!agarre || !puntero.isDown) return;
      const dy = puntero.y - agarre.y;
      arrastrado = Math.max(arrastrado, Math.abs(dy));
      camara.scrollY = acotar(agarre.scroll - dy);
    });
    this.input.on('pointerup', () => (agarre = undefined));
    this.input.on('wheel', (_puntero: Phaser.Input.Pointer, _objetos: unknown, _dx: number, dy: number) => {
      subida?.stop();
      camara.scrollY = acotar(camara.scrollY + dy * 0.6);
    });
    this.events.once('shutdown', () => this.input.setDefaultCursor('default'));
  }

  private ir(partida: Partida, nodo: Nodo): void {
    const siguiente = avanzar(partida, nodo.id);
    // En deuda, el paso puede costar más de lo que queda por deber.
    if (enBancarrota(siguiente)) {
      terminarPartida(this);
      avisar(this, 'Las deudas te hundieron.\nFin de la partida.', () => this.scene.start('menu'));
      return;
    }
    jugarPartida(this, siguiente);
    if (siguiente.combatePendiente || siguiente.oferta) irAPartida(this, siguiente);
    else this.scene.restart();
  }
}
