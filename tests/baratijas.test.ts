import { describe, expect, it } from 'vitest';
import { crearAleatorio } from '../src/juego/aleatorio.ts';
import {
  CATALOGO,
  PROBABILIDADES_INICIALES,
  aplicar,
  baratijasDe,
  CONJUNTOS,
  bonosActivos,
  efectosDe,
  buscarBaratija,
  miembrosDe,
  precioDe,
  valorDeVenta,
  sortearBaratijas,
  sortearRareza,
  type Baratija,
} from '../src/juego/baratijas.ts';
import { crearMazo, type Carta } from '../src/juego/cartas.ts';
import { crearCombate, jugar } from '../src/juego/combate.ts';
import {
  apostar,
  avanzar,
  cerrarOferta,
  comprarBaratija,
  costoDeTirada,
  costoDelPaso,
  crearPartida,
  hayQueApostar,
  elegirBaratija,
  enBancarrota,
  limiteDeDeuda,
  maximoApostable,
  nodoActual,
  puedeComprar,
  resolverCombate,
  responderEleccion,
  totalApostado,
  venderBaratija,
  volverATirar,
  type Partida,
} from '../src/juego/partida.ts';
import { puntuar } from '../src/juego/puntuacion.ts';

const carta = (id: string): Carta => {
  const [palo, rango] = id.split('-') as [Carta['palo'], string];
  return { id, palo, rango: Number(rango) as Carta['rango'] };
};

// Una partida parada en el nodo del tipo pedido (se fuerza el tipo del nodo
// del piso 1 para no depender de cómo salió el mapa).
function partidaEn(tipo: 'elite' | 'vendedor', oro = 300): Partida {
  const partida = crearPartida(7);
  const destino = partida.mapa.pisos[1]![0]!;
  destino.tipo = tipo;
  return { ...avanzar(partida, destino.id), oro };
}

// Baratijas de prueba, una por efecto, para no depender del catálogo.
const deMulti: Baratija = { id: 'm', nombre: 'm', descripcion: '', rareza: 'comun', icono: '', alPuntuar: (m) => ({ ...m, multi: m.multi + 4 }) };
const deFichas: Baratija = { id: 'f', nombre: 'f', descripcion: '', rareza: 'comun', icono: '', alPuntuar: (m) => ({ ...m, fichas: m.fichas + 30 }) };
const deManos: Baratija = { id: 'h', nombre: 'h', descripcion: '', rareza: 'comun', icono: '', alEmpezarCombate: (i) => ({ ...i, manos: i.manos + 1 }) };
const deOro: Baratija = { id: 'o', nombre: 'o', descripcion: '', rareza: 'comun', icono: '', alGanarCombate: (oro) => oro + 50 };

describe('baratijas', () => {
  it('el catálogo no repite ids', () => {
    expect(new Set(CATALOGO.map((b) => b.id)).size).toBe(CATALOGO.length);
  });

  it('se sortean distintas, sin las que ya se tienen', () => {
    const todas = sortearBaratijas(crearAleatorio(1), []);
    expect(todas).toHaveLength(Math.min(3, CATALOGO.length));
    expect(new Set(todas).size).toBe(todas.length);
    expect(sortearBaratijas(crearAleatorio(1), CATALOGO.map((b) => b.id))).toEqual([]);
  });

  it('cambian las fichas y el multiplicador de una mano', () => {
    const cartas = [carta('corazones-10'), carta('picas-10')];
    const sin = puntuar(cartas);
    const con = puntuar(cartas, [deMulti, deFichas]);
    expect(con.fichas).toBe(sin.fichas + 30);
    expect(con.multi).toBe(sin.multi + 4);
    expect(con.total).toBe(con.fichas * con.multi);
  });

  it('cambian las manos de un combate y el oro ganado', () => {
    expect(aplicar([deManos], 'alEmpezarCombate', { manos: 4, descartes: 3 })).toEqual({ manos: 5, descartes: 3 });
    expect(aplicar([deOro, deOro], 'alGanarCombate', 100)).toBe(200);
  });

  it('una baratija que ya no existe se ignora', () => {
    expect(baratijasDe(['no-existe', 'materialista']).map((b) => b.id)).toEqual(['materialista']);
  });
});

describe('rarezas', () => {
  it('cada lugar sortea su rareza con las probabilidades dadas', () => {
    const cuenta = { comun: 0, infrecuente: 0, rara: 0, legendaria: 0 };
    const aleatorio = crearAleatorio(5);
    for (let i = 0; i < 20_000; i++) cuenta[sortearRareza(aleatorio, PROBABILIDADES_INICIALES)]++;
    expect(cuenta.legendaria / 20_000).toBeCloseTo(0.05, 1);
    expect(cuenta.rara / 20_000).toBeCloseTo(0.1, 1);
    expect(cuenta.infrecuente / 20_000).toBeCloseTo(0.25, 1);
    expect(cuenta.comun / 20_000).toBeCloseTo(0.6, 1);
  });

  it('si no queda ninguna de la rareza sorteada, se busca en otra', () => {
    const soloRaras = { infrecuente: 0, rara: 1, legendaria: 0 };
    const raras = CATALOGO.filter((b) => b.rareza === 'rara').map((b) => b.id);
    const [sorteada] = sortearBaratijas(crearAleatorio(1), [], soloRaras, 1);
    expect(raras).toContain(sorteada);
    // Sin raras libres, sale de otra rareza.
    const [otra] = sortearBaratijas(crearAleatorio(1), raras, soloRaras, 1);
    expect(otra).toBeDefined();
    expect(raras).not.toContain(otra);
  });

  it('el precio sale de la rareza', () => {
    expect(precioDe({ ...deMulti, rareza: 'comun' })).toBe(200);
    expect(precioDe({ ...deMulti, rareza: 'infrecuente' })).toBe(300);
    expect(precioDe({ ...deMulti, rareza: 'rara' })).toBe(500);
    expect(precioDe({ ...deMulti, rareza: 'legendaria' })).toBe(1000);
  });

  it('una baratija puede cambiar las probabilidades', () => {
    const suerte: Baratija = { ...deMulti, alSortearRareza: (p) => ({ ...p, legendaria: p.legendaria * 2 }) };
    expect(aplicar([suerte], 'alSortearRareza', PROBABILIDADES_INICIALES).legendaria).toBe(0.1);
  });
});

describe('Diversidad', () => {
  const diversidad = [buscarBaratija('diversidad')];

  it('multiplica el multiplicador por 4 con los 4 palos en la mano', () => {
    const cartas = [carta('picas-2'), carta('corazones-5'), carta('treboles-9'), carta('diamantes-11')];
    expect(puntuar(cartas, diversidad).multi).toBe(puntuar(cartas).multi * 4);
  });

  it('sin los 4 palos no cambia nada', () => {
    const cartas = [carta('picas-2'), carta('corazones-5'), carta('treboles-9'), carta('treboles-11')];
    expect(puntuar(cartas, diversidad).multi).toBe(puntuar(cartas).multi);
  });
});

describe('baratijas de palos', () => {
  // Par de 8: 10 fichas de la mano + las de las dos cartas (8 cada una).
  const par = (palo1: string, palo2: string, id: string) =>
    puntuar([carta(`${palo1}-8`), carta(`${palo2}-8`)], [buscarBaratija(id)]).fichas;

  it('Altruista: ♥ ×1,5 y ♦ a la mitad', () => {
    expect(par('corazones', 'diamantes', 'altruista')).toBe(10 + 12 + 4);
  });

  it('El poder de las flores: ♣ ×1,5 y ♠ a la mitad', () => {
    expect(par('treboles', 'picas', 'flower-power')).toBe(10 + 12 + 4);
    expect(par('corazones', 'diamantes', 'flower-power')).toBe(10 + 8 + 8);
  });

  it('Corta hierbas: ♠ ×1,5 y ♣ a la mitad', () => {
    expect(par('picas', 'treboles', 'grass-mower')).toBe(10 + 12 + 4);
  });
});

describe('Subsidio', () => {
  it('da 50 de oro al ganar y al perder', () => {
    const partida = { ...partidaEn('elite'), baratijas: ['subsidio'] };
    expect(resolverCombate(partida, true).oro).toBe(300 + 100 + 50);
    expect(resolverCombate(partida, false).oro).toBe(300 - 100 + 50);
  });
});

describe('De zero a héroe', () => {
  // Una partida en el vendedor con De zero a héroe a la venta.
  function conDeZero(baratijas: string[]): Partida {
    const partida = { ...partidaEn('vendedor', 5000), baratijas };
    return { ...partida, oferta: { tipo: 'vendedor' as const, baratijas: ['de-zero-a-heroe'] } };
  }
  const rarasDe = (p: Partida) => p.baratijas.filter((id) => buscarBaratija(id).rareza === 'rara');

  it('al comprarla pide un número de 1 a las raras que se tienen', () => {
    const partida = comprarBaratija(conDeZero(['diversidad', 'subsidio']), 'de-zero-a-heroe');
    expect(partida.eleccion).toEqual({ baratija: 'de-zero-a-heroe', maximo: 1 });
    expect(() => avanzar(partida, nodoActual(partida).siguientes[0]!)).toThrow();
    expect(() => responderEleccion(partida, 2)).toThrow();
  });

  it('sin raras no pide nada', () => {
    expect(comprarBaratija(conDeZero(['subsidio']), 'de-zero-a-heroe').eleccion).toBeNull();
  });

  it('vuelve comunes las raras elegidas y, tras el doble de combates, legendarias', () => {
    let partida = responderEleccion(comprarBaratija(conDeZero(['diversidad']), 'de-zero-a-heroe'), 1);
    expect(partida.eleccion).toBeNull();
    expect(rarasDe(partida)).toEqual([]);
    const comun = partida.baratijas[0]!;
    expect(buscarBaratija(comun).rareza).toBe('comun');
    expect(partida.transformaciones).toEqual([{ ids: [comun], combatesRestantes: 2, hacia: 'legendaria' }]);

    partida = resolverCombate(partida, true);
    expect(partida.transformaciones[0]?.combatesRestantes).toBe(1);
    expect(partida.baratijas[0]).toBe(comun);
    partida = resolverCombate(partida, false);
    expect(partida.transformaciones).toEqual([]);
    // No hay otra legendaria libre, así que sale la mejor rareza que quede.
    expect(partida.baratijas[0]).not.toBe(comun);
    expect(partida.baratijas).toContain('de-zero-a-heroe');
  });
});

describe('apuestas', () => {
  const enCombate = (oro: number, baratijas: string[] = []) => {
    const partida = { ...crearPartida(7), oro, baratijas };
    return avanzar(partida, nodoActual(partida).siguientes[0]!); // el piso 1 es combate
  };

  it('se puede apostar hasta la mitad del oro', () => {
    expect(maximoApostable(enCombate(301))).toBe(150);
    expect(() => apostar(enCombate(300), 151)).toThrow();
    expect(apostar(enCombate(300), 150).apuesta).toBe(150);
  });

  it('All In deja apostar todo', () => {
    expect(maximoApostable(enCombate(300, ['all-in']))).toBe(300);
  });

  it('ganar suma lo apostado y perder lo resta; después se vuelve a preguntar', () => {
    const conApuesta = apostar(enCombate(300), 100);
    const ganado = resolverCombate(conApuesta, true);
    expect(ganado.oro).toBe(300 + 100 + 100);
    expect(ganado.apuesta).toBeNull();
    expect(resolverCombate(conApuesta, false).oro).toBe(300 - 100 - 100);
  });

  it('en deuda no se puede apostar', () => {
    expect(maximoApostable(enCombate(-50, ['tarjeta-de-credito']))).toBe(0);
  });
});

describe('Tarjeta de crédito', () => {
  // Una partida en el piso 3 (riesgo 3), con la tarjeta.
  function enPiso3(oro: number, baratijas = ['tarjeta-de-credito']): Partida {
    let partida = crearPartida(7);
    for (let i = 0; i < 3; i++) partida = cerrarOferta(resolverCombate(avanzar(partida, nodoActual(partida).siguientes[0]!), true));
    return { ...partida, oro, baratijas };
  }

  it('sin la tarjeta, 0 de oro es bancarrota', () => {
    expect(enBancarrota(enPiso3(0, []))).toBe(true);
  });

  it('con la tarjeta se puede deber hasta riesgo × 100', () => {
    expect(limiteDeDeuda(enPiso3(0))).toBe(300);
    expect(enBancarrota(enPiso3(-300))).toBe(false);
    expect(enBancarrota(enPiso3(-301))).toBe(true);
  });

  it('en deuda, cada paso cuesta riesgo × 10 % de la deuda', () => {
    const partida = enPiso3(-200);
    expect(costoDelPaso(partida)).toBe(60);
    expect(avanzar(partida, nodoActual(partida).siguientes[0]!).oro).toBe(-260);
    expect(costoDelPaso(enPiso3(50))).toBe(0);
  });

  it('deja comprar quedando en deuda dentro del límite', () => {
    const partida = { ...enPiso3(100), oferta: { tipo: 'vendedor' as const, baratijas: ['subsidio'] } };
    expect(puedeComprar(partida, 'subsidio')).toBe(true); // queda en −100
    expect(puedeComprar({ ...partida, baratijas: [] }, 'subsidio')).toBe(false);
  });
});

describe('Materialista', () => {
  const materialista = [buscarBaratija('materialista')];

  it('las ♥ valen la mitad y las ♦ 1,5 veces, redondeando', () => {
    // Par: 10 fichas de la mano + las de las dos cartas.
    expect(puntuar([carta('corazones-8'), carta('picas-8')], materialista).fichas).toBe(10 + 4 + 8);
    expect(puntuar([carta('diamantes-8'), carta('treboles-8')], materialista).fichas).toBe(10 + 12 + 8);
    expect(puntuar([carta('corazones-7'), carta('diamantes-7')], materialista).fichas).toBe(10 + 4 + 11);
  });

  it('no toca el multiplicador', () => {
    const cartas = [carta('corazones-8'), carta('diamantes-8')];
    expect(puntuar(cartas, materialista).multi).toBe(puntuar(cartas).multi);
  });
});

describe('recompensa del élite', () => {
  it('vencerlo ofrece elegir 1 de 3', () => {
    const partida = resolverCombate(partidaEn('elite'), true);
    expect(partida.oferta?.tipo).toBe('elite');
    expect(partida.oferta?.baratijas).toHaveLength(Math.min(3, CATALOGO.length));
    const elegida = partida.oferta!.baratijas[0]!;
    const despues = elegirBaratija(partida, elegida);
    expect(despues.baratijas).toEqual([elegida]);
    expect(despues.oferta).toBeNull();
  });

  it('pasar da 300 de oro', () => {
    const partida = resolverCombate(partidaEn('elite'), true);
    expect(cerrarOferta(partida).oro).toBe(partida.oro + 300);
  });

  it('irse del vendedor no da oro', () => {
    const partida = partidaEn('vendedor');
    expect(cerrarOferta(partida).oro).toBe(partida.oro);
  });

  it('perderlo no ofrece nada', () => {
    expect(resolverCombate(partidaEn('elite'), false).oferta).toBeNull();
  });

  it('no se puede seguir por el mapa sin elegir o saltear', () => {
    const partida = resolverCombate(partidaEn('elite'), true);
    const siguiente = nodoActual(partida).siguientes[0]!;
    expect(() => avanzar(partida, siguiente)).toThrow();
    expect(() => avanzar(cerrarOferta(partida), siguiente)).not.toThrow();
  });

  it('sin baratijas por conseguir no ofrece nada', () => {
    const partida = { ...partidaEn('elite'), baratijas: CATALOGO.map((b) => b.id) };
    expect(resolverCombate(partida, true).oferta).toBeNull();
  });
});

describe('vendedor de baratijas', () => {
  it('al llegar ofrece hasta 3 baratijas, siempre las mismas', () => {
    const partida = partidaEn('vendedor');
    expect(partida.oferta?.tipo).toBe('vendedor');
    expect(partida.oferta?.baratijas).toHaveLength(Math.min(3, CATALOGO.length));
    expect(partidaEn('vendedor').oferta).toEqual(partida.oferta);
  });

  it('comprar resta el precio y la saca de la venta', () => {
    const partida = partidaEn('vendedor', 1000);
    const id = partida.oferta!.baratijas[0]!;
    const precio = precioDe(buscarBaratija(id));
    const despues = comprarBaratija(partida, id);
    expect(despues.oro).toBe(1000 - precio);
    expect(despues.baratijas).toEqual([id]);
    expect(despues.oferta?.baratijas).not.toContain(id);
  });

  it('no deja comprar si el oro no alcanza o quedaría en 0', () => {
    const id = partidaEn('vendedor').oferta!.baratijas[0]!;
    const precio = precioDe(buscarBaratija(id));
    expect(puedeComprar(partidaEn('vendedor', precio), id)).toBe(false);
    expect(puedeComprar(partidaEn('vendedor', precio + 1), id)).toBe(true);
    expect(() => comprarBaratija(partidaEn('vendedor', precio), id)).toThrow();
  });
});

describe('vender y volver a tirar en el vendedor', () => {
  const enVendedor = (oro: number, baratijas: string[]): Partida => ({
    ...crearPartida(7),
    oro,
    baratijas,
    oferta: { tipo: 'vendedor', baratijas: ['subsidio'] },
  });

  it('vender paga la mitad del precio y quita la baratija', () => {
    const vendida = venderBaratija(enVendedor(100, ['diversidad', 'materialista']), 'diversidad');
    expect(valorDeVenta(buscarBaratija('diversidad'))).toBe(250);
    expect(vendida.oro).toBe(350);
    expect(vendida.baratijas).toEqual(['materialista']);
    expect(() => venderBaratija(vendida, 'diversidad')).toThrow();
    expect(() => venderBaratija({ ...vendida, oferta: null }, 'materialista')).toThrow();
  });

  it('vender quita la baratija de su transformación pendiente', () => {
    const partida = { ...enVendedor(0, ['subsidio', 'altruista']), transformaciones: [{ ids: ['subsidio', 'altruista'], combatesRestantes: 2, hacia: 'legendaria' as const }] };
    expect(venderBaratija(partida, 'subsidio').transformaciones[0]!.ids).toEqual(['altruista']);
  });

  it('volver a tirar cuesta 100 × (baratijas + 1) y cambia la oferta', () => {
    const partida = enVendedor(1000, ['materialista', 'altruista']);
    expect(costoDeTirada(partida)).toBe(300);
    const tirada = volverATirar(partida);
    expect(tirada.oro).toBe(700);
    expect(tirada.oferta?.tipo).toBe('vendedor');
    expect(tirada.oferta?.baratijas).toHaveLength(3);
    expect(tirada.oferta?.baratijas.some((id) => partida.baratijas.includes(id))).toBe(false);
    // Cada tirada sortea otra cosa.
    expect(volverATirar(tirada).oferta?.baratijas).not.toEqual(tirada.oferta?.baratijas);
    expect(volverATirar(tirada).oferta?.tiradas).toBe(2);
  });

  it('no se puede volver a tirar si deja la partida en bancarrota', () => {
    expect(() => volverATirar(enVendedor(100, []))).toThrow();
    expect(volverATirar(enVendedor(101, [])).oro).toBe(1);
  });
});

describe('sets de baratijas', () => {
  it('el apostador empedernido son All In, Tasador y Racha', () => {
    const apostador = CONJUNTOS.find((c) => c.id === 'apostador-empedernido')!;
    expect(apostador.nombre).toBe('Set del apostador empedernido');
    expect(miembrosDe(apostador).map((b) => b.id).sort()).toEqual(['all-in', 'racha', 'tasador']);
    expect(bonosActivos(['all-in', 'tasador'])).toEqual([]);
    expect(bonosActivos(['tasador', 'racha', 'all-in'])).toHaveLength(1);
  });

  it('todo set tiene baratijas del catálogo', () => {
    for (const conjunto of CONJUNTOS) expect(miembrosDe(conjunto).length).toBeGreaterThan(1);
    for (const b of CATALOGO) if (b.conjunto) expect(CONJUNTOS.some((c) => c.id === b.conjunto)).toBe(true);
  });
});

describe('Tasador y el set del apostador', () => {
  const enCombate = (oro: number, baratijas: string[]) => {
    const partida = { ...crearPartida(7), oro, baratijas };
    return avanzar(partida, nodoActual(partida).siguientes[0]!);
  };

  it('sin el Tasador no se apuestan baratijas', () => {
    expect(() => apostar(enCombate(300, ['diversidad']), 0, ['diversidad'])).toThrow();
  });

  it('con el Tasador se apuestan por su valor de venta, aun sin oro para apostar', () => {
    const partida = enCombate(0, ['tasador', 'diversidad', 'tarjeta-de-credito']);
    expect(hayQueApostar(partida)).toBe(true);
    expect(() => apostar(partida, 0, ['subsidio'])).toThrow();
    const conApuesta = apostar(partida, 0, ['diversidad']);
    expect(totalApostado(conApuesta)).toBe(250);
    expect(resolverCombate(conApuesta, true).oro).toBe(0 + 100 + 250);
    expect(resolverCombate(conApuesta, true).baratijas).toContain('diversidad');
  });

  it('al perder se pierden las baratijas apostadas y el oro apostado', () => {
    const conApuesta = apostar(enCombate(300, ['tasador', 'diversidad']), 100, ['diversidad']);
    const perdido = resolverCombate(conApuesta, false);
    expect(perdido.baratijas).toEqual(['tasador']);
    expect(perdido.oro).toBe(300 - 100 - 100);
    expect(perdido.baratijasApostadas).toEqual([]);
  });

  it('con el set completo se gana el doble y se pierde 1,5 veces', () => {
    const conApuesta = apostar(enCombate(300, ['all-in', 'tasador', 'racha', 'diversidad']), 100, ['diversidad']);
    expect(totalApostado(conApuesta)).toBe(350);
    expect(resolverCombate(conApuesta, true).oro).toBe(300 + 100 + 700);
    // Pierde 525: Diversidad cubre 250 y el resto sale del oro.
    const perdido = resolverCombate(conApuesta, false);
    expect(perdido.oro).toBe(300 - 100 - 275);
    expect(perdido.baratijas).toEqual(['all-in', 'tasador', 'racha']);
  });

  it('sin el set completo la apuesta paga lo apostado', () => {
    const conApuesta = apostar(enCombate(300, ['all-in']), 100);
    expect(resolverCombate(conApuesta, true).oro).toBe(500);
  });
});

describe('Racha', () => {
  const enCombate = (oro: number, baratijas: string[], racha: number) => {
    const partida = { ...crearPartida(7), oro, baratijas, racha };
    return apostar(avanzar(partida, nodoActual(partida).siguientes[0]!), 100);
  };

  it('cuenta los combates seguidos con el mismo resultado', () => {
    const partida = avanzar(crearPartida(7), nodoActual(crearPartida(7)).siguientes[0]!);
    expect(resolverCombate({ ...partida, racha: 2 }, true).racha).toBe(3);
    expect(resolverCombate({ ...partida, racha: 2 }, false).racha).toBe(-1);
    expect(resolverCombate({ ...partida, racha: -4 }, false).racha).toBe(-5);
    expect(resolverCombate({ ...partida, racha: -4 }, true).racha).toBe(1);
  });

  it('suma 10 % a la apuesta por combate de la racha si el resultado la sigue', () => {
    // 5 perdidos seguidos: perder otra vez cuesta 50 % más.
    expect(resolverCombate(enCombate(300, ['racha'], -5), false).oro).toBe(300 - 100 - 150);
    expect(resolverCombate(enCombate(300, ['racha'], 3), true).oro).toBe(300 + 100 + 130);
    // Romper la racha no suma nada.
    expect(resolverCombate(enCombate(300, ['racha'], -5), true).oro).toBe(300 + 100 + 100);
    expect(resolverCombate(enCombate(300, [], 3), true).oro).toBe(300 + 100 + 100);
  });
});

describe('set TOC TOC TOC', () => {
  const mazoDe = (...palos: Carta['palo'][]): Carta[] => palos.map((palo, i) => carta(`${palo}-${(i % 13) + 2}`));
  const fichasDe8 = (ids: string[], mazo: Carta[]) =>
    puntuar([carta('picas-8')], efectosDe(ids), { mazo, restantes: 0 }).fichas - 5; // carta alta: 5 fichas de base

  it('son Estético y Simétrico', () => {
    const toc = CONJUNTOS.find((c) => c.id === 'toc-toc-toc')!;
    expect(toc.nombre).toBe('TOC TOC TOC');
    expect(miembrosDe(toc).map((b) => b.id).sort()).toEqual(['estetico', 'simetrico']);
  });

  it('Estético: rojas y negras a la mitad, un color igual, un palo ×1,25', () => {
    expect(fichasDe8(['estetico'], mazoDe('picas', 'corazones'))).toBe(4);
    expect(fichasDe8(['estetico'], mazoDe('picas', 'treboles'))).toBe(8);
    expect(fichasDe8(['estetico'], mazoDe('picas', 'picas'))).toBe(10);
  });

  it('Simétrico: suma las cartas por robar si son pares y las resta si son impares', () => {
    const base = puntuar([carta('picas-8')]).fichas;
    const con = (restantes: number, ids = ['simetrico']) => puntuar([carta('picas-8')], efectosDe(ids), { mazo: [], restantes }).fichas;
    expect(con(20)).toBe(base + 20);
    expect(con(11)).toBe(base - 11);
    expect(con(0)).toBe(base);
    expect(con(41)).toBe(0); // no baja de 0
  });

  it('con el set completo los bonos valen el doble y los castigos no cambian', () => {
    const ambos = ['estetico', 'simetrico'];
    expect(fichasDe8(ambos, mazoDe('picas', 'picas'))).toBe(12);
    expect(fichasDe8(ambos, mazoDe('picas', 'corazones'))).toBe(4);
    const base = puntuar([carta('picas-8')]).fichas;
    expect(puntuar([carta('picas-8')], efectosDe(ambos), { mazo: [], restantes: 20 }).fichas).toBe(base + 40);
    expect(puntuar([carta('picas-8')], efectosDe(ambos), { mazo: [], restantes: 11 }).fichas).toBe(base - 11);
  });

  it('en combate miran el mazo de la partida y las cartas por robar', () => {
    const mazo = crearMazo();
    const combate = crearCombate(crearAleatorio(3), { objetivo: 100_000, mazo, baratijas: ['simetrico'] });
    const sin = crearCombate(crearAleatorio(3), { objetivo: 100_000, mazo });
    const id = combate.mano[0]!.id;
    // Quedan 44 por robar (52 − 8): par.
    expect(jugar(combate, [id]).puntos).toBe(jugar(sin, [id]).puntos + 44 * jugar(sin, [id]).ultimaJugada!.multi);
  });
});
