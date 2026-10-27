// La mesa de un combate: la mano de 8 cartas abajo, se tocan de 1 a 5 para
// elegirlas y se juegan o se descartan. Entre los dos botones, otros dos
// redondos ordenan la mano por valor o por palo; empieza por valor y el orden elegido se
// mantiene con las cartas que se roban después. Arriba, cuánto falta para el
// objetivo. Las reglas están en juego/combate.ts; aquí solo se dibujan.
//
// Contra el jefe la mesa es una partida de duelos (juego/duelo.ts): arriba
// los 3 duelos con los puntos de cada uno, debajo la mano que juega el jefe
// en el duelo abierto, y "Cerrar duelo" pasa al siguiente. Con Faroleo, el
// botón 🎭 hace que la próxima mano puntúe como el tipo siguiente; con Mano
// de Dios, el 🙏 hace que cuente como escalera de color. Con Soborno, el 🤝
// baja el objetivo antes de la primera mano.

import Phaser from 'phaser';
import { crearAleatorio } from '../juego/aleatorio.ts';
import { SIMBOLO_PALO, fichasDeCarta, nombreRango, ordenarMano, type Carta, type Orden } from '../juego/cartas.ts';
import { MAX_CARTAS_JUGADAS, crearCombate, descartar, jugar, type Combate } from '../juego/combate.ts';
import { efectosDe } from '../juego/baratijas.ts';
import { DUELOS, cerrarDuelo, crearEnfrentamiento, descartarEnDuelo, dueloAbierto, duelosGanados, jugarEnDuelo, type Enfrentamiento } from '../juego/duelo.ts';
import { jefeDelMundo } from '../juego/jefes.ts';
import { MANOS, evaluarMano } from '../juego/manos.ts';
import { baratijasDe, bonosActivos, buscarBaratija, formatear } from '../juego/baratijas.ts';
import type { Partida } from '../juego/partida.ts';
import {
  apostar,
  costoDelSoborno,
  enBancarrota,
  hayQueApostar,
  maximoApostable,
  objetivoDelCombate,
  riesgoDelCombate,
  preverApuesta,
  puedeApostarBaratijas,
  puedeSobornar,
  resolverCombate,
  sobornar,
  totalApostado,
} from '../juego/partida.ts';
import type { TipoNodo } from '../mapa/mapa.ts';
import { crearBoton, crearBotonRedondo, type Boton, type BotonRedondo } from './boton.ts';
import { dibujarCarta } from './carta.ts';
import { preguntarApuesta } from './apuesta.ts';
import { confirmar } from './confirmar.ts';
import { COLORES, estiloTexto } from './estilo.ts';
import { mostrarBotonesInventario } from './inventario.ts';
import { mostrarCripto } from './cripto.ts';
import { mostrarOro, type Marcador } from './oro.ts';
import { mostrarRiesgo } from './riesgo.ts';
import { irAPartida, jugarPartida, partidaActual, terminarPartida } from './sesion.ts';

const ANCHO_CARTA = 110;
const ALTO_CARTA = 154;
const Y_CARTAS = 500;
const SUBIDA_ELEGIDA = 30;

export class EscenaMesa extends Phaser.Scene {
  private combate!: Combate;
  private tipo: TipoNodo = 'combate';
  private elegidas = new Set<string>();
  private cartas = new Map<string, Phaser.GameObjects.Container>();
  private marcador!: Phaser.GameObjects.Text;
  private jugada!: Phaser.GameObjects.Text;
  private botonJugar!: Boton;
  private botonDescartar!: Boton;
  private botonMenu!: Boton;
  private oro!: Marcador;
  // Mientras se espera la apuesta no se puede tocar la mano.
  private bloqueada = false;
  private orden: Orden = 'valor'; // la mano empieza ordenada por valor
  private botonesOrden = new Map<Orden, BotonRedondo>();
  private botonApostar: BotonRedondo | null = null;
  // Contra el jefe: la partida de duelos (si no, null), lo que se dibuja de
  // los duelos y el botón para cerrar el abierto.
  private duelo: Enfrentamiento | null = null;
  private dibujoDuelos: Phaser.GameObjects.Container | null = null;
  private botonCerrarDuelo: Boton | null = null;
  private botonFarol: BotonRedondo | null = null;
  private farol = false; // la próxima mano farolea
  private botonDivina: BotonRedondo | null = null;
  private divina = false; // la próxima mano es de Dios
  private botonSoborno: BotonRedondo | null = null;

  constructor() {
    super('mesa');
  }

  init(datos: { tipo: TipoNodo }): void {
    this.tipo = datos.tipo;
    this.elegidas.clear();
    this.cartas.clear();
    this.orden = 'valor';
    this.botonesOrden.clear();
    this.botonApostar = null;
    this.bloqueada = false;
    this.duelo = null;
    this.dibujoDuelos = null;
    this.botonCerrarDuelo = null;
    this.botonFarol = null;
    this.farol = false;
    this.botonDivina = null;
    this.divina = false;
    this.botonSoborno = null;
  }

  create(): void {
    const partida = partidaActual(this);
    // El oro entra en la semilla para que reintentar al jefe (con menos oro)
    // reparta otras cartas; continuar la misma partida reparte las mismas.
    // La Segunda oportunidad también, para que el combate repetido sea otro.
    const semilla = partida.mapa.semilla + partida.visitados.length + partida.oro + (partida.memoria['segunda-oportunidad']?.mundo ?? 0) * 7;
    const aleatorio = crearAleatorio(semilla);
    const opciones = {
      mazo: partida.mazo,
      baratijas: partida.baratijas,
      niveles: partida.niveles,
      riesgo: riesgoDelCombate(partida),
      mundo: partida.mundo,
      tipo: this.tipo,
      oro: partida.oro,
      semilla,
      memoria: partida.memoria,
    };
    if (this.tipo === 'jefe') {
      this.duelo = crearEnfrentamiento(aleatorio, jefeDelMundo(partida.mundo), opciones);
      this.combate = this.duelo.combate;
    } else {
      this.combate = crearCombate(aleatorio, { ...opciones, objetivo: objetivoDelCombate(partida) });
    }

    const { width } = this.scale;
    this.marcador = this.add.text(40, 30, '', estiloTexto(24)).setLineSpacing(8);
    this.jugada = this.add.text(width / 2, this.duelo ? 380 : 250, '', estiloTexto(this.duelo ? 28 : 34)).setOrigin(0.5);
    if (this.duelo) {
      this.botonCerrarDuelo = crearBoton(this, width - 150, 380, 'Cerrar duelo', COLORES.oro, () => this.cerrarDuelo(), 220);
    }
    // Los botones de las baratijas van a la derecha de Descartar, en fila.
    const huecos = [width / 2 + 385, width / 2 + 485, width / 2 + 585];
    if (this.combate.faroles > 0) {
      this.botonFarol = crearBotonRedondo(this, huecos.shift()!, 652, '🎭', 'Farolear', () => {
        if (this.bloqueada || this.combate.faroles === 0) return;
        this.farol = !this.farol;
        this.botonFarol?.marcar(this.farol);
      });
    }
    if (this.combate.divinas > 0) {
      this.botonDivina = crearBotonRedondo(this, huecos.shift()!, 652, '🙏', 'Mano de Dios', () => {
        if (this.bloqueada || this.combate.divinas === 0) return;
        this.divina = !this.divina;
        this.botonDivina?.marcar(this.divina);
        this.actualizar();
      });
    }
    if (puedeSobornar(partida) && this.combate.manosJugadas === 0) {
      this.botonSoborno = crearBotonRedondo(this, huecos.shift()!, 652, '🤝', 'Sobornar', () => this.pedirSoborno());
    }
    // Bien separados para que Valor, Apostar y Palo quepan entre los dos.
    this.botonJugar = crearBoton(this, width / 2 - 240, 660, 'Jugar mano', COLORES.fichas, () => this.accion('jugar'));
    this.botonDescartar = crearBoton(this, width / 2 + 240, 660, 'Descartar', COLORES.multi, () => this.accion('descartar'));
    this.botonesOrden.set('valor', crearBotonRedondo(this, width / 2 - 64, 652, 'A↓', 'Valor', () => this.ordenar('valor')));
    this.botonesOrden.set('palo', crearBotonRedondo(this, width / 2 + 64, 652, '♠♥', 'Palo', () => this.ordenar('palo')));
    this.botonesOrden.get(this.orden)!.marcar(true);
    this.combate = { ...this.combate, mano: ordenarMano(this.combate.mano, this.orden) };
    // La partida ya está guardada con este combate pendiente: al continuar
    // se vuelve a él, pero desde el principio.
    this.botonMenu = crearBoton(this, width - 90, 50, 'Menú', COLORES.borde, () =>
      confirmar(this, '¿Salir al menú?\nAl continuar, este combate empieza de nuevo.', 'Salir', COLORES.multi, () =>
        this.scene.start('menu'),
      ), 130);
    this.oro = mostrarOro(this, partida.oro);
    mostrarCripto(this, partida);
    mostrarRiesgo(this, riesgoDelCombate(partida));
    mostrarBotonesInventario(this, () => partidaActual(this));
    this.actualizar();
    // Mientras no se apostó en este combate, entre Valor y Palo queda el
    // botón para apostar; desaparece al apostar o al jugar la primera mano
    // (sin apostar, la apuesta es 0). Sin nada para apostar, no aparece.
    if (partida.apuesta === null) {
      if (hayQueApostar(partida)) this.botonApostar = crearBotonRedondo(this, width / 2, 652, '$', 'Apostar', () => this.pedirApuesta());
      else jugarPartida(this, apostar(partida, 0));
    }
  }

  // La ventana de la apuesta. "No apostar" la cierra sin decidir: el botón
  // sigue ahí hasta jugar la primera mano.
  private pedirApuesta(): void {
    const partida = partidaActual(this);
    if (partida.apuesta !== null || this.bloqueada || this.combate.estado !== 'jugando') return;
    const opciones = {
      maximo: maximoApostable(partida),
      baratijas: puedeApostarBaratijas(partida) ? baratijasDe(partida.baratijas) : [],
      notas: notasDeApuesta(partida),
      oro: partida.oro,
      prever: (cantidad: number, baratijas: string[]) => preverApuesta(partida, cantidad, baratijas),
    };
    this.bloqueada = true;
    preguntarApuesta(this, opciones, (cantidad, baratijas) => {
      this.bloqueada = false;
      if (cantidad > 0 || baratijas.length > 0) this.fijarApuesta(cantidad, baratijas);
      this.actualizar();
    });
  }

  // Soborno: pagar parte del oro para bajar el objetivo de este combate.
  private pedirSoborno(): void {
    const partida = partidaActual(this);
    if (this.bloqueada || !puedeSobornar(partida) || this.combate.manosJugadas > 0) return;
    const costo = costoDelSoborno(partida);
    const antes = this.combate.objetivo;
    const sobornada = sobornar(partida);
    const despues = objetivoDelCombate(sobornada);
    const texto = `¿Sobornar ${costo === 0 ? 'gratis' : `por ${costo} de oro`}?\nEl objetivo baja de ${antes} a ${despues}.`;
    confirmar(this, texto, 'Sobornar', COLORES.oro, () => {
      jugarPartida(this, sobornada);
      this.combate = { ...this.combate, objetivo: despues, oroInicial: sobornada.oro };
      this.oro.cambiar(sobornada.oro);
      this.quitarSoborno();
      this.actualizar();
    });
  }

  private quitarSoborno(): void {
    this.botonSoborno?.destroy();
    this.botonSoborno = null;
  }

  private fijarApuesta(cantidad: number, baratijas: string[]): void {
    jugarPartida(this, apostar(partidaActual(this), cantidad, baratijas));
    this.botonApostar?.destroy();
    this.botonApostar = null;
  }

  private accion(cual: 'jugar' | 'descartar'): void {
    if (cual === 'jugar' && partidaActual(this).apuesta === null) this.fijarApuesta(0, []);
    const ids = [...this.elegidas];
    for (const id of ids) this.cartas.get(id)?.destroy();
    for (const id of ids) this.cartas.delete(id);
    this.elegidas.clear();
    const farol = cual === 'jugar' && this.farol;
    const divina = cual === 'jugar' && this.divina;
    if (this.duelo) {
      this.duelo = cual === 'jugar' ? jugarEnDuelo(this.duelo, ids, farol, divina) : descartarEnDuelo(this.duelo, ids);
      this.combate = this.duelo.combate;
    } else {
      this.combate = cual === 'jugar' ? jugar(this.combate, ids, farol, divina) : descartar(this.combate, ids);
    }
    if (farol) {
      this.farol = false;
      this.botonFarol?.marcar(false);
    }
    if (divina) {
      this.divina = false;
      this.botonDivina?.marcar(false);
    }
    if (cual === 'jugar') this.quitarSoborno();
    // El oro que dieron las baratijas al puntuar se ve enseguida.
    this.oro.cambiar(this.combate.oroInicial + this.combate.oroGanado);
    this.combate = { ...this.combate, mano: ordenarMano(this.combate.mano, this.orden) };
    if (this.duelo) this.duelo = { ...this.duelo, combate: this.combate };
    this.actualizar();
    if (cual === 'jugar') {
      this.tweens.add({ targets: this.jugada, scale: { from: 1.3, to: 1 }, duration: 250, ease: 'Back.easeOut' });
    }
    if (this.terminado()) this.terminar();
  }

  private terminado(): boolean {
    return (this.duelo?.estado ?? this.combate.estado) !== 'jugando';
  }

  private cerrarDuelo(): void {
    if (!this.duelo || this.bloqueada || this.terminado()) return;
    if (partidaActual(this).apuesta === null) this.fijarApuesta(0, []);
    this.duelo = cerrarDuelo(this.duelo);
    this.combate = { ...this.duelo.combate, mano: ordenarMano(this.duelo.combate.mano, this.orden) };
    this.duelo = { ...this.duelo, combate: this.combate };
    this.actualizar();
    if (this.terminado()) this.terminar();
  }

  // Los duelos: puntos de cada lado y quién ganó (con el desempate, si
  // hubo), y la mano que juega el jefe en el abierto.
  private dibujarDuelos(): void {
    this.dibujoDuelos?.destroy();
    const e = this.duelo;
    if (!e) return;
    const { width } = this.scale;
    const jefe = jefeDelMundo(partidaActual(this).mundo);
    const objetos: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < DUELOS; i++) {
      const x = width / 2 + 70 + (i - 1) * 250; // corridos para no tapar el marcador
      const duelo = e.duelos[i];
      const abierto = duelo && !duelo.ganador && e.estado === 'jugando';
      const color = duelo?.ganador === 'jugador' ? COLORES.acento : duelo?.ganador === 'jefe' ? COLORES.multi : abierto ? COLORES.oro : COLORES.borde;
      objetos.push(this.add.rectangle(x, 150, 230, 110, COLORES.panel).setStrokeStyle(abierto ? 3 : 2, color));
      objetos.push(this.add.text(x, 110, `Duelo ${i + 1}`, estiloTexto(18, color)).setOrigin(0.5));
      if (!duelo) {
        objetos.push(this.add.text(x, 152, 'Por jugar', estiloTexto(18, COLORES.textoSuave)).setOrigin(0.5));
        continue;
      }
      objetos.push(this.add.text(x, 140, `Tú: ${duelo.jugador}`, estiloTexto(20)).setOrigin(0.5));
      objetos.push(this.add.text(x, 166, `${jefe.nombre}: ${duelo.jefe}`, estiloTexto(20)).setOrigin(0.5));
      const ultima = duelo.desempate.at(-1);
      const pie = duelo.ganador
        ? `${duelo.ganador === 'jugador' ? 'Ganaste' : 'Perdiste'}${ultima ? ` · desempate ${cartaCorta(ultima.jugador)} vs ${cartaCorta(ultima.jefe)}` : ''}`
        : `${duelo.manosDelJugador} mano${duelo.manosDelJugador === 1 ? '' : 's'} tuya${duelo.manosDelJugador === 1 ? '' : 's'}`;
      objetos.push(this.add.text(x, 192, pie, estiloTexto(14, color)).setOrigin(0.5));
    }
    // Lo que juega el jefe en el duelo abierto.
    const abierto = e.estado === 'jugando' ? dueloAbierto(e) : null;
    if (abierto && jefe.revela) {
      const jugadas = abierto.jugadasDelJefe;
      const texto = jugadas.map((j) => `${MANOS[j.puntuacion.tipo].nombre} · ${j.puntuacion.fichas} × ${formatear(j.puntuacion.multi)} = ${j.puntuacion.total}`).join('  +  ');
      objetos.push(this.add.text(width / 2, 232, `${jefe.icono} ${jefe.nombre} juega: ${texto}`, estiloTexto(20, COLORES.textoSuave)).setOrigin(0.5));
      const cartas = jugadas.flatMap((j) => j.cartas);
      cartas.forEach((carta, i) => objetos.push(dibujarCarta(this, width / 2 + (i - (cartas.length - 1) / 2) * 62, 295, carta, 56, 78)));
    }
    this.dibujoDuelos = this.add.container(0, 0, objetos);
  }

  private actualizar(): void {
    const c = this.combate;
    const e = this.duelo;
    this.marcador.setText([
      ...(e
        ? [`Duelos: ${duelosGanados(e, 'jugador')} – ${duelosGanados(e, 'jefe')}`, `Manos: ${c.manosRestantes}   Descartes: ${c.descartesRestantes}`, `Mazo: ${c.pila.length}`]
        : [`Objetivo: ${c.objetivo}`, `Puntos: ${c.puntos}`, `Manos: ${c.manosRestantes}   Descartes: ${c.descartesRestantes}   Mazo: ${c.pila.length}`]),
      ...this.lineaDeApuesta(),
      ...this.lineaDeSiguiente(),
    ]);
    this.dibujarDuelos();
    this.botonCerrarDuelo?.activar(!this.terminado());
    if (this.botonFarol && c.faroles === 0) {
      this.botonFarol.destroy();
      this.botonFarol = null;
    }
    if (this.botonDivina && c.divinas === 0) {
      this.botonDivina.destroy();
      this.botonDivina = null;
    }
    // Con cartas elegidas se anticipa qué mano se jugaría (solo el nombre);
    // sin elegir, queda el resultado de la última jugada.
    if (this.elegidas.size > 0) {
      const cartas = c.mano.filter((carta) => this.elegidas.has(carta.id));
      const efectos = efectosDe(c.baratijas);
      const reglas = { corta: efectos.some((e) => e.escaleraCorta), puente: efectos.some((e) => e.puente) };
      this.jugada.setText(this.divina ? MANOS.escaleraColor.nombre : MANOS[evaluarMano(cartas, reglas).tipo].nombre);
    } else if (c.ultimaJugada) {
      const j = c.ultimaJugada;
      this.jugada.setText(`${MANOS[j.tipo].nombre}: ${j.fichas} × ${formatear(j.multi)} = ${j.total}`);
    } else {
      this.jugada.setText('');
    }
    this.dibujarMano();
    const hayElegidas = this.elegidas.size > 0;
    this.botonJugar.activar(hayElegidas && !this.terminado());
    this.botonDescartar.activar(hayElegidas && c.descartesRestantes > 0 && !this.terminado());
  }

  // La apuesta en curso, con los iconos de las baratijas apostadas.
  private lineaDeApuesta(): string[] {
    const partida = partidaActual(this);
    const total = totalApostado(partida);
    if (total === 0) return [];
    const iconos = baratijasDe(partida.baratijasApostadas).map((b) => b.icono).join('');
    return [`Apuesta: ${total}${iconos ? ` (${iconos})` : ''}`];
  }

  // Cartas marcadas: la próxima carta del mazo.
  private lineaDeSiguiente(): string[] {
    const siguiente = this.combate.pila[0];
    if (!siguiente || !efectosDe(this.combate.baratijas).some((e) => e.verSiguiente)) return [];
    return [`Siguiente: ${cartaCorta(siguiente)}`];
  }

  // Las cartas que ya estaban se deslizan a su lugar nuevo; las recién
  // robadas entran desde la derecha.
  private dibujarMano(): void {
    const { width } = this.scale;
    const separacion = ANCHO_CARTA + 14;
    const inicio = width / 2 - ((this.combate.mano.length - 1) * separacion) / 2;
    this.combate.mano.forEach((carta, i) => {
      const x = inicio + i * separacion;
      const y = Y_CARTAS - (this.elegidas.has(carta.id) ? SUBIDA_ELEGIDA : 0);
      let objeto = this.cartas.get(carta.id);
      if (!objeto) {
        objeto = this.crearCarta(carta, width + ANCHO_CARTA, Y_CARTAS);
        this.cartas.set(carta.id, objeto);
      }
      this.tweens.add({ targets: objeto, x, y, duration: 220, ease: 'Cubic.easeOut' });
    });
  }

  private crearCarta(carta: Carta, x: number, y: number): Phaser.GameObjects.Container {
    const objeto = dibujarCarta(this, x, y, carta, ANCHO_CARTA, ALTO_CARTA);
    objeto.setSize(ANCHO_CARTA, ALTO_CARTA).setInteractive({ useHandCursor: true });
    objeto.on('pointerdown', () => this.alternar(carta.id));
    return objeto;
  }

  private ordenar(orden: Orden): void {
    if (this.terminado() || this.bloqueada) return;
    this.orden = orden;
    for (const [cual, boton] of this.botonesOrden) boton.marcar(cual === orden);
    this.combate = { ...this.combate, mano: ordenarMano(this.combate.mano, orden) };
    if (this.duelo) this.duelo = { ...this.duelo, combate: this.combate };
    this.actualizar();
  }

  private alternar(id: string): void {
    if (this.terminado() || this.bloqueada) return;
    if (this.elegidas.has(id)) this.elegidas.delete(id);
    else if (this.elegidas.size < MAX_CARTAS_JUGADAS) this.elegidas.add(id);
    this.actualizar();
  }

  private terminar(): void {
    const { width, height } = this.scale;
    const gano = (this.duelo?.estado ?? this.combate.estado) === 'ganado';
    const antes = partidaActual(this).oro;
    const teniaAntes = partidaActual(this).baratijas;
    const partida = resolverCombate(partidaActual(this), gano, this.combate);
    const perdidas = baratijasDe(teniaAntes.filter((id) => !partida.baratijas.includes(id)));
    const quebrado = enBancarrota(partida);
    const jefeVencido = gano && this.tipo === 'jefe';
    // Segunda oportunidad: un combate normal perdido se repite.
    const otraVez = !gano && this.tipo !== 'jefe' && partida.combatePendiente;
    // Vencer al jefe no termina la partida: resolverCombate la pasa al
    // mundo siguiente.
    const finDePartida = quebrado;
    const titulo = jefeVencido
      ? `¡Venciste a ${jefeDelMundo(partidaActual(this).mundo).nombre}!`
      : gano ? '¡Combate ganado!' : quebrado ? 'Te quedaste sin oro' : otraVez ? 'Segunda oportunidad' : 'Perdiste el combate';
    const diferencia = partida.oro - antes;

    this.botonJugar.activar(false);
    this.botonDescartar.activar(false);
    this.botonMenu.activar(false);
    this.botonCerrarDuelo?.activar(false);
    // Al terminar la partida (bancarrota) su ranura queda libre; si no, se
    // guarda con el oro nuevo.
    if (finDePartida) terminarPartida(this);
    else jugarPartida(this, partida);
    this.oro.cambiar(partida.oro);

    this.add.rectangle(width / 2, height / 2, width, height, COLORES.fondo, 0.85);
    this.add.text(width / 2, height / 2 - 80, titulo, estiloTexto(48, gano ? COLORES.acento : COLORES.multi)).setOrigin(0.5);
    const oro = `${diferencia >= 0 ? '+' : '−'}${Math.abs(diferencia)} de oro`;
    const sinBaratijas = perdidas.length > 0 ? `\nPerdiste ${perdidas.map((b) => `${b.icono} ${b.nombre}`).join(', ')}` : '';
    const nuevas = partida.baratijas.filter((id) => !teniaAntes.includes(id)).map(buscarBaratija);
    const ganada = nuevas.length > 0 ? `\nTe llevas ${nuevas.map((b) => `${b.icono} ${b.nombre}`).join(', ')}` : '';
    const mundoNuevo = jefeVencido ? `\nSigues en el mundo ${partida.mundo}` : '';
    const repetir = otraVez ? '\nEl combate se vuelve a jugar, sin perder nada' : '';
    const detalle = quebrado ? 'Fin de la partida' : oro + sinBaratijas + ganada + mundoNuevo + repetir;
    this.add
      .text(width / 2, height / 2 - 20, detalle, { ...estiloTexto(28, quebrado ? COLORES.textoSuave : COLORES.oro), align: 'center' })
      .setOrigin(0.5);

    if (finDePartida) {
      crearBoton(this, width / 2, height / 2 + 60, 'Menú principal', COLORES.acento, () => this.scene.start('menu'));
    } else if (partida.combatePendiente) {
      crearBoton(this, width / 2, height / 2 + 60, 'Reintentar', COLORES.acento, () => this.scene.restart({ tipo: this.tipo }));
    } else {
      crearBoton(this, width / 2, height / 2 + 60, 'Seguir', COLORES.acento, () => irAPartida(this, partida));
    }
  }
}

// Una carta en pocas letras (sin carta: "—"), con sus fichas.
function cartaCorta(carta: Carta | null): string {
  return carta ? `${nombreRango(carta.rango)}${SIMBOLO_PALO[carta.palo]} (${fichasDeCarta(carta)})` : '—';
}

// Lo que cambia la apuesta: los bonos de set y, con Racha, la racha actual.
function notasDeApuesta(partida: Partida): string[] {
  const notas = bonosActivos(partida.baratijas)
    .filter((b) => b.alResolverApuesta)
    .map((b) => `Set completo: ${b.descripcion}`);
  if (partida.baratijas.includes('racha')) {
    const n = Math.abs(partida.racha);
    notas.push(
      n === 0
        ? 'Racha: todavía sin racha'
        : `Racha: ${n} ${partida.racha > 0 ? 'ganado' : 'perdido'}${n === 1 ? '' : 's'} seguido${n === 1 ? '' : 's'} (+${n * 10}\u00a0% si ${partida.racha > 0 ? 'vuelves a ganar' : 'vuelves a perder'})`,
    );
  }
  return notas;
}
