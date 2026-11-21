// El mapa de la partida. Se recorre de abajo (inicio) hacia arriba (jefe),
// como en Inscryption: un tablero inclinado visto en perspectiva, con la
// cámara muy cerca: solo se ven el piso actual
// y los dos siguientes. Arrastrando (o con la rueda) se baja a mirar el
// camino ya hecho, pero nunca se puede subir más allá de esos dos pisos.
// Los nodos a los que se puede ir se iluminan al pasar el mouse. Tocar uno avanza: si es un
// combate abre la mesa, el vendedor abre su tienda de baratijas, el
// eliminador, la mano negra y el pintor sus servicios, la tienda la de
// cartas, el evento su regalo, y el descanso por ahora solo avanza. Cada vez que se elige un
// nodo la partida se guarda, y al volver al mapa la cámara sube suave
// hasta el piso nuevo.

import Phaser from 'phaser';
import { avanzar, enBancarrota, nivelDeRiesgo, nodoActual, nodosDisponibles, type Partida } from '../juego/partida.ts';
import { buscarNodo, type Nodo } from '../mapa/mapa.ts';
import { crearBoton } from './boton.ts';
import { avisar } from './confirmar.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarCripto } from './cripto.ts';
import { mostrarOro } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { FONDO_MAPA, type Tablero } from './fondoMapa.ts';
import { pintarFicha } from './fichaDePoker.ts';
import { Lamina } from './pixel/lamina.ts';
import { PALETA } from './pixel/paleta.ts';
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
const PERIODO_LATIDO = 1600; // ms de cada latido de los caminos que se pueden tomar
const INCLINACION = 60; // grados que el tablero se inclina hacia atrás (0 = plano, de frente)
const FOCAL = 800; // distancia de la cámara: más chica, más fuerte la perspectiva
const ESCALA_CERCA = 1.1; // tamaño del piso actual (1 = el de un mapa plano)
const PIXEL = 3; // píxeles de pantalla por píxel del mapa (el mismo que los iconos)
const CLAVE_LAMINA = 'mapa:lamina';

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

    // El fondo va en piezas separadas (ver fondoMapa.ts). Todo el mapa se
    // pinta en una lámina de píxeles grandes (ver pixel/lamina.ts) que se
    // agranda sin suavizar: el entorno una vez; la baranda, el paño, los
    // caminos y las fichas cada vez que algo cambia.
    const { entorno, baranda, pano } = FONDO_MAPA;
    const ancho = ENTRE_COLUMNAS * partida.mapa.columnas;
    const lamina = new Lamina(Math.ceil(width / PIXEL), Math.ceil(height / PIXEL), PIXEL);
    const quieto = new Lamina(lamina.ancho, lamina.alto, PIXEL);
    entorno.pintar(quieto);
    if (this.textures.exists(CLAVE_LAMINA)) this.textures.remove(CLAVE_LAMINA);
    const textura = this.textures.createCanvas(CLAVE_LAMINA, lamina.ancho, lamina.alto);
    if (!textura) throw new Error('No se pudo crear la lámina del mapa');
    textura.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const volcado = textura.getContext().createImageData(lamina.ancho, lamina.alto);
    this.add.image(0, 0, CLAVE_LAMINA).setOrigin(0).setScale(PIXEL);
    const cerca = pivote + 250; // la y del plano del borde de adelante
    const tablero: Tablero = {
      ancho: width,
      alto: height,
      proyectar,
      fila: (yPantalla) => {
        const k = (pivote - yPantalla) / (zoomAlto * Math.cos(angulo));
        const divisor = FOCAL - k * Math.sin(angulo);
        if (divisor <= 0) return undefined; // más allá del horizonte
        const d = (k * FOCAL) / divisor;
        if (d < -250) return undefined;
        return { yPlano: pivote - d, s: escala(d) * zoom };
      },
      desplazamiento: 0,
      centroX: width / 2,
      mitad: ancho / 2,
      cerca,
      lejos: -400,
    };

    let arrastrado = 0;
    let agarre: { y: number; scroll: number } | undefined;
    let listo = false;
    let encima: string | undefined; // el nodo con el mouse encima
    this.time.delayedCall(ESPERA_AL_ENTRAR, () => (listo = true));
    const disponibles = new Set(nodosDisponibles(partida).map((n) => n.id));
    const aplastado = Math.cos(angulo);
    // Cada ficha tiene una zona invisible que recibe los toques; el dibujo
    // va en la lámina.
    const dibujados: { nodo: Nodo; zona: Phaser.GameObjects.Zone }[] = [];
    for (const fila of partida.mapa.pisos) {
      for (const nodo of fila) {
        if (nodo.piso > pisoVisible) continue;
        const zona = this.add.zone(0, 0, RADIO * 2, RADIO * 2 * aplastado);
        dibujados.push({ nodo, zona });
        if (!disponibles.has(nodo.id)) continue;
        zona.setInteractive({
          hitArea: new Phaser.Geom.Ellipse(RADIO, RADIO * aplastado, RADIO * 2, RADIO * 2 * aplastado),
          hitAreaCallback: Phaser.Geom.Ellipse.Contains,
          useHandCursor: true,
        });
        zona.on('pointerup', () => {
          // Solo cuenta si el toque empezó en el mapa (no es el final del
          // clic que lo abrió) y pasó un momento desde que apareció.
          if (listo && agarre && arrastrado < ARRASTRE_MINIMO) this.ir(partida, nodo);
        });
        // La luz del borde, solo mientras el mouse está encima.
        zona.on('pointerover', () => (encima = nodo.id)).on('pointerout', () => encima === nodo.id && (encima = undefined));
      }
    }

    // El latido de los caminos que se pueden tomar, en tres tonos de oro.
    const ORO = [PALETA.G!, PALETA.g!, PALETA.y!];
    const latido = () => Math.min(2, Math.floor(1.5 + 1.5 * Math.sin((this.time.now / PERIODO_LATIDO) * Math.PI * 2)));

    let dibujado: string | undefined;
    const dibujar = () => {
      const pulso = latido();
      const llave = `${Math.round(vista.y * 4)}|${encima}|${pulso}`;
      if (llave === dibujado) return;
      dibujado = llave;
      const plano = (piso: number) => yDe(piso) - vista.y;
      const enLamina = (xPlano: number, yPlano: number) => {
        const p = proyectar(xPlano, yPlano);
        return { x: p.x / PIXEL, y: p.y / PIXEL, s: p.s };
      };
      tablero.desplazamiento = vista.y;
      lamina.px.set(quieto.px);
      baranda.pintar(lamina, tablero);
      pano.pintar(lamina, tablero);
      // Las líneas de los pisos, de tiza muy suave y punteadas.
      for (let piso = 0; piso <= pisoVisible; piso++) {
        if (!enPantalla(plano(piso))) continue;
        const izquierda = enLamina(width / 2 - ancho / 2, plano(piso));
        const derecha = enLamina(width / 2 + ancho / 2, plano(piso));
        lamina.linea(izquierda.x, izquierda.y, derecha.x, derecha.y, 1, (x, y, paso) => paso % 3 === 0 && lamina.mezclar(x, y, pano.camino, 0.18));
      }

      for (const fila of partida.mapa.pisos) {
        for (const nodo of fila) {
          if (nodo.piso >= pisoVisible) continue;
          for (const id of nodo.siguientes) {
            const otro = buscarNodo(partida.mapa, id);
            if (!enPantalla(plano(nodo.piso)) && !enPantalla(plano(otro.piso))) continue;
            const desde = enLamina(xDe(nodo), plano(nodo.piso));
            const hasta = enLamina(xDe(otro), plano(otro.piso));
            const recorrido = partida.visitados.includes(nodo.id) && partida.visitados.includes(id);
            // Los que salen del nodo actual (los que se pueden tomar) brillan
            // en oro y laten despacio; los recorridos van del color del
            // acento; los demás, de tiza punteada.
            const abierto = nodo.id === partida.nodoActual && disponibles.has(id);
            const grosor = Math.max(1, Math.round(((recorrido || abierto ? 6 : 4) * (desde.s + hasta.s)) / 2 / PIXEL));
            lamina.linea(desde.x, desde.y, hasta.x, hasta.y, grosor, (x, y, paso) => {
              if (abierto) lamina.punto(x, y, ORO[pulso]!);
              else if (recorrido) lamina.punto(x, y, COLORES.acento);
              else if (paso % 4 < 2) lamina.mezclar(x, y, pano.camino, 0.45);
            });
          }
        }
      }

      const fichas: { nodo: Nodo; x: number; y: number; s: number }[] = [];
      for (const { nodo, zona } of dibujados) {
        const yPlano = plano(nodo.piso);
        const visible = enPantalla(yPlano);
        zona.setVisible(visible).setActive(visible);
        if (!visible) continue;
        const { x, y, s } = proyectar(xDe(nodo), yPlano);
        zona.setPosition(x, y).setScale(s).setDepth(y);
        fichas.push({ nodo, x, y, s });
      }
      // De atrás hacia adelante: el canto de las de adelante tapa a las de atrás.
      fichas.sort((a, b) => a.y - b.y);
      for (const { nodo, x, y, s } of fichas) {
        const actual = nodo.id === partida.nodoActual;
        const visitado = partida.visitados.includes(nodo.id);
        const late = disponibles.has(nodo.id);
        pintarFicha(lamina, nodo.tipo, {
          x: x / PIXEL,
          y: y / PIXEL,
          radio: (RADIO * s) / PIXEL,
          aplastado,
          // Las ya recorridas quedan apagadas; las de adelante que no se
          // pueden tomar, un poco.
          alfa: visitado && !actual ? 0.5 : !visitado && !late ? 0.7 : 1,
          luz: late && encima === nodo.id,
          borde: actual ? COLORES.acento : undefined,
        });
      }

      lamina.volcar(volcado.data);
      textura.getContext().putImageData(volcado, 0, 0);
      textura.refresh();
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, dibujar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, dibujar));
    const mundo = [...this.children.list];

    // Barra fija de arriba, con su propia cámara.
    this.add.rectangle(0, 0, width, BARRA, COLORES.fondo).setOrigin(0).setDepth(40);
    this.add.text(width / 2, 50, `Mundo ${partida.mundo}`, estiloTexto(30)).setOrigin(0.5).setDepth(41);
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
