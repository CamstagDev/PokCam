// El mapa de la partida. Se recorre de abajo (inicio) hacia arriba (jefe),
// como en Inscryption: un tablero inclinado visto en perspectiva, con la
// cámara muy cerca: solo se ven el piso actual
// y los dos siguientes. Arrastrando (o con la rueda) se baja a mirar el
// camino ya hecho, pero nunca se puede subir más allá de esos dos pisos.
// Los nodos a los que se puede ir laten. Tocar uno avanza: si es un
// combate abre la mesa, el vendedor abre su tienda de baratijas, el
// eliminador, la mano negra y el pintor sus servicios, la tienda la de
// cartas, el evento su regalo, y el descanso por ahora solo avanza. Cada vez que se elige un
// nodo la partida se guarda, y al volver al mapa la cámara sube suave
// hasta el piso nuevo.

import Phaser from 'phaser';
import { avanzar, enBancarrota, nivelDeRiesgo, nodoActual, nodosDisponibles, type Partida } from '../juego/partida.ts';
import { DATOS_NODO, buscarNodo, type Nodo } from '../mapa/mapa.ts';
import { crearBoton } from './boton.ts';
import { avisar } from './confirmar.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarCripto } from './cripto.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { FONDO_MAPA, type Tablero } from './fondoMapa.ts';
import { crearFichaDePoker, type FichaDePoker } from './fichaDePoker.ts';
import { irAPartida, jugarPartida, partidaActual, terminarPartida } from './sesion.ts';


const PISOS_A_LA_VISTA = 2; // pisos por encima del actual que se ven
const ENTRE_PISOS = 210; // distancia vertical entre pisos
const ENTRE_COLUMNAS = 260;
const RADIO = 56;
const ARRIBA = 170; // dónde queda en pantalla el piso más alto a la vista
const ABAJO = 130; // margen bajo el piso del inicio
const BARRA = 100; // alto de la barra fija de arriba (título, menú, oro)
const ARRASTRE_MINIMO = 10; // por debajo de esto, soltar sobre un nodo es tocarlo
const ESPERA_AL_ENTRAR = 1000; // ms sin aceptar toques en los nodos al abrir el mapa
const INCLINACION = 60; // grados que el tablero se inclina hacia atrás (0 = plano, de frente)
const FOCAL = 800; // distancia de la cámara: más chica, más fuerte la perspectiva
const ESCALA_CERCA = 1.1; // tamaño del piso actual (1 = el de un mapa plano)

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
    const xDe = (nodo: Nodo) => width / 2 + (nodo.columna - (partida.mapa.columnas - 1) / 2) * ENTRE_COLUMNAS;
    const alto = yDe(0) + ABAJO;

    // El mapa es un tablero inclinado hacia atrás, visto en perspectiva: lo
    // lejano (arriba) se ve más chico y más junto. Se calcula como si fuera
    // plano (x, y en pantalla con `vista.y` de desplazamiento) y después se
    // proyecta.
    const angulo = Phaser.Math.DegToRad(INCLINACION);
    const pivote = height + 40; // la línea del tablero que no se mueve al inclinar
    const escala = (d: number) => FOCAL / (FOCAL + d * Math.sin(angulo));
    // De ancho, el piso actual (abajo de la vista) queda a tamaño
    // ESCALA_CERCA. De alto se estira para que el piso más alto a la vista
    // quede en ARRIBA y se aproveche la pantalla: así lo lejano se ve más
    // chico y más angosto, pero los pisos no se amontonan.
    const zoom = ESCALA_CERCA / escala(pivote - (ARRIBA + PISOS_A_LA_VISTA * ENTRE_PISOS));
    const dArriba = pivote - ARRIBA;
    const zoomAlto = dArriba / (dArriba * Math.cos(angulo) * escala(dArriba));
    const vista = { y: 0 };
    const proyectar = (xPlano: number, yPlano: number) => {
      const d = Math.max(pivote - yPlano, -250); // más abajo de esto ya no se ve
      const s = escala(d);
      return { x: width / 2 + (xPlano - width / 2) * s * zoom, y: pivote - d * Math.cos(angulo) * s * zoomAlto, s: s * zoom };
    };
    const enPantalla = (yPlano: number) => yPlano > -RADIO * 3 && yPlano < pivote + 200;

    // El fondo va en piezas separadas (ver fondoMapa.ts): el entorno se
    // dibuja una vez; la baranda, el paño, las líneas de los pisos y los
    // caminos se vuelven a dibujar en cada cuadro.
    const { entorno, baranda, pano } = FONDO_MAPA;
    const ancho = ENTRE_COLUMNAS * partida.mapa.columnas;
    const fondo = this.add.graphics();
    entorno.dibujar(fondo, width, height);
    const graficosBaranda = this.add.graphics();
    const graficosPano = this.add.graphics();
    const lineas = this.add.graphics();
    const caminos = this.add.graphics();
    const lejos = -400; // la y del plano del borde del fondo del tablero
    const cerca = pivote + 250; // y la del borde de adelante
    const tablero: Tablero = {
      ancho: width,
      alto: height,
      contorno: (margen) => [
        proyectar(width / 2 - ancho / 2 - margen, lejos - margen),
        proyectar(width / 2 + ancho / 2 + margen, lejos - margen),
        proyectar(width / 2 + ancho / 2 + margen, cerca + margen),
        proyectar(width / 2 - ancho / 2 - margen, cerca + margen),
      ],
      proyectar,
      desplazamiento: 0,
      centroX: width / 2,
      mitad: ancho / 2,
      cerca,
    };

    let arrastrado = 0;
    let agarre: { y: number; scroll: number } | undefined;
    let listo = false;
    this.time.delayedCall(ESPERA_AL_ENTRAR, () => (listo = true));
    const disponibles = new Set(nodosDisponibles(partida).map((n) => n.id));
    const dibujados: { nodo: Nodo; ficha: FichaDePoker; late: boolean }[] = [];
    for (const fila of partida.mapa.pisos) {
      for (const nodo of fila) {
        if (nodo.piso > pisoVisible) continue;
        const actual = nodo.id === partida.nodoActual;
        const visitado = partida.visitados.includes(nodo.id);
        const late = disponibles.has(nodo.id);
        const ficha = crearFichaDePoker(this, nodo.tipo, DATOS_NODO[nodo.tipo].icono, RADIO, {
          conLuz: late,
          borde: actual ? COLORES.acento : undefined,
        });
        // Las ya recorridas quedan apagadas.
        if (visitado && !actual) ficha.contenedor.setAlpha(0.5);
        dibujados.push({ nodo, ficha, late });

        if (late) {
          ficha.cara.setInteractive({ useHandCursor: true }).on('pointerup', () => {
            // Solo cuenta si el toque empezó en el mapa (no es el final del
            // clic que lo abrió) y pasó un momento desde que apareció.
            if (listo && agarre && arrastrado < ARRASTRE_MINIMO) this.ir(partida, nodo);
          });
        }
      }
    }

    const dibujar = () => {
      const plano = (piso: number) => yDe(piso) - vista.y;
      tablero.desplazamiento = vista.y;
      graficosBaranda.clear();
      baranda.dibujar(graficosBaranda, tablero);
      graficosPano.clear();
      pano.dibujar(graficosPano, tablero);
      lineas.clear();
      for (let piso = 0; piso <= pisoVisible; piso++) {
        if (!enPantalla(plano(piso))) continue;
        const izquierda = proyectar(width / 2 - ancho / 2, plano(piso));
        const derecha = proyectar(width / 2 + ancho / 2, plano(piso));
        lineas.lineStyle(2, pano.camino, 0.12).lineBetween(izquierda.x, izquierda.y, derecha.x, derecha.y);
      }

      caminos.clear();
      for (const fila of partida.mapa.pisos) {
        for (const nodo of fila) {
          if (nodo.piso >= pisoVisible) continue;
          for (const id of nodo.siguientes) {
            const otro = buscarNodo(partida.mapa, id);
            if (!enPantalla(plano(nodo.piso)) && !enPantalla(plano(otro.piso))) continue;
            const desde = proyectar(xDe(nodo), plano(nodo.piso));
            const hasta = proyectar(xDe(otro), plano(otro.piso));
            const recorrido = partida.visitados.includes(nodo.id) && partida.visitados.includes(id);
            const grosor = (recorrido ? 6 : 4) * (desde.s + hasta.s) / 2;
            caminos.lineStyle(grosor, recorrido ? COLORES.acento : pano.camino, recorrido ? 1 : 0.55);
            caminos.lineBetween(desde.x, desde.y, hasta.x, hasta.y);
          }
        }
      }

      // Los nodos a los que se puede ir laten.
      const latido = 1 + 0.06 * (1 + Math.sin((this.time.now / 600) * Math.PI));
      for (const { nodo, ficha, late } of dibujados) {
        const yPlano = plano(nodo.piso);
        const visible = enPantalla(yPlano);
        ficha.contenedor.setVisible(visible);
        if (!visible) continue;
        const { x, y, s } = proyectar(xDe(nodo), yPlano);
        // Chatas, como apoyadas en el tablero inclinado.
        const tamano = s * (late ? latido : 1);
        ficha.contenedor.setPosition(x, y).setScale(tamano, tamano * (0.75 + 0.25 * Math.cos(angulo))).setDepth(y);
        ficha.animar(this.time.now);
      }
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, dibujar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, dibujar));
    const mundo = [...this.children.list];

    // Barra fija de arriba, con su propia cámara.
    this.add.rectangle(0, 0, width, BARRA, COLORES.fondo).setOrigin(0).setDepth(40);
    this.add.text(width / 2, 50, 'Elige tu camino', estiloTexto(30)).setOrigin(0.5).setDepth(41);
    crearBoton(this, 90, 50, 'Menú', COLORES.borde, () => this.scene.start('menu'), 130).setDepth(41);
    mostrarOro(this, partida.oro);
    mostrarCripto(this, partida);
    mostrarRiesgo(this, nivelDeRiesgo(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    const barra = this.children.list.filter((objeto) => !mundo.includes(objeto));

    this.cameras.main.ignore(barra);
    this.cameras.add(0, 0, width, height).ignore(mundo);

    // Límites: arriba, el piso más alto a la vista; abajo, el inicio.
    const scrollMinimo = yDe(pisoVisible) - ARRIBA;
    const scrollMaximo = Math.max(scrollMinimo, alto - height);
    const acotar = (scroll: number) => Phaser.Math.Clamp(scroll, scrollMinimo, scrollMaximo);

    // Al empezar la partida la vista arranca abajo del todo; si no, desde
    // donde estaba antes de avanzar, y sube hasta el piso nuevo.
    const anterior = this.registry.get('vistaMapa') as VistaMapa | undefined;
    const desde = anterior?.semilla === partida.mapa.semilla ? anterior.scrollY : scrollMaximo;
    vista.y = acotar(desde);
    let subida: Phaser.Tweens.Tween | undefined;
    if (vista.y !== scrollMinimo) {
      subida = this.tweens.add({ targets: vista, y: scrollMinimo, delay: 250, duration: 800, ease: 'Sine.easeInOut' });
    }
    this.registry.set('vistaMapa', { semilla: partida.mapa.semilla, scrollY: scrollMinimo } satisfies VistaMapa);
    dibujar();

    // Arrastrar con el ratón o el dedo, y la rueda. Se arrastra el tablero:
    // en perspectiva el dedo mueve un poco menos que en pantalla.
    this.input.setDefaultCursor('grab');
    this.input.on('pointerdown', (puntero: Phaser.Input.Pointer) => {
      subida?.stop();
      agarre = { y: puntero.y, scroll: vista.y };
      arrastrado = 0;
    });
    this.input.on('pointermove', (puntero: Phaser.Input.Pointer) => {
      if (!agarre || !puntero.isDown) return;
      const dy = puntero.y - agarre.y;
      arrastrado = Math.max(arrastrado, Math.abs(dy));
      vista.y = acotar(agarre.scroll - dy);
    });
    this.input.on('pointerup', () => (agarre = undefined));
    this.input.on('wheel', (_puntero: Phaser.Input.Pointer, _objetos: unknown, _dx: number, dy: number) => {
      subida?.stop();
      vista.y = acotar(vista.y + dy * 0.6);
    });
    this.events.once('shutdown', () => this.input.setDefaultCursor('default'));
  }

  private ir(partida: Partida, nodo: Nodo): void {
    const siguiente = avanzar(partida, nodo.id);
    // En deuda, el paso puede costar más de lo que queda por deber, y con
    // Crypto monedas una bajada puede llevarse todo el oro.
    if (enBancarrota(siguiente)) {
      const ultima = siguiente.cripto.ultima;
      const cripto = ultima?.paso === siguiente.visitados.length && ultima.oro < 0;
      terminarPartida(this);
      avisar(this, `${cripto ? 'Tus cripto se desplomaron.' : 'Las deudas te hundieron.'}\nFin de la partida.`, () => this.scene.start('menu'));
      return;
    }
    jugarPartida(this, siguiente);
    if (siguiente.combatePendiente || siguiente.oferta) irAPartida(this, siguiente);
    else this.scene.restart();
  }
}
