// Genera partidas-de-prueba/todo-desbloqueado.json, una partida para
// importar desde "Importar" en las ranuras y probar cosas:
//   - la colección completa (todas las baratijas, los nodos y las barajas)
//   - 99 999 de oro
//   - empieza con Claire obscure, Paleta, Callo, Especialista (en par),
//     Soborno, Mano de Dios, Cartas marcadas, Cambiazo, Vista de lince y el
//     Gemelo malvado (que copia a Vista de lince), un comodín en el mazo, y en el
//     vendedor con Bróker, Cupón y Descuento de veterano
//   - en los pisos 1 y 2 hay evento, pintor, vendedor, élite, eliminador, mano
//     negra y tienda de cartas
//
//   npm run partida:prueba

import { writeFileSync } from 'node:fs';
import { IDS_DE_BARAJA } from '../src/juego/barajas.ts';
import { CATALOGO } from '../src/juego/baratijas.ts';
import type { Exportado } from '../src/juego/guardado.ts';
import { crearPartida } from '../src/juego/partida.ts';
import { DATOS_NODO } from '../src/mapa/mapa.ts';

const partida = crearPartida(20261021);
// Los nodos especiales, repartidos entre los pisos 1 y 2 en este orden.
const especiales = ['evento', 'pintor', 'vendedor', 'elite', 'eliminador', 'manoNegra', 'tienda'] as const;
[...partida.mapa.pisos[1]!, ...partida.mapa.pisos[2]!].forEach((nodo, i) => {
  nodo.tipo = especiales[i % especiales.length]!;
});

const exportado: Exportado = {
  version: 16,
  guardadoEn: Date.now(),
  partida: {
    ...partida,
    oro: 99_999,
    mazo: partida.mazo.map((c) => (c.id === 'corazones-14' ? { ...c, comodin: true } : c)),
    baratijas: ['claire-obscure', 'paleta', 'callo', 'especialista', 'soborno', 'mano-de-dios', 'cartas-marcadas', 'cambiazo', 'vista-de-lince', 'gemelo-malvado'],
    memoria: { callo: { par: 3 }, especialista: { eleccion: 2 } },
    oferta: { tipo: 'vendedor', baratijas: ['broker', 'cupon', 'descuento-de-veterano'] },
  },
  coleccion: CATALOGO.map((b) => b.id),
  barajas: [...IDS_DE_BARAJA],
  nodos: Object.keys(DATOS_NODO),
};
writeFileSync(new URL('../partidas-de-prueba/todo-desbloqueado.json', import.meta.url), JSON.stringify(exportado, null, 2) + '\n');
console.log('Listo: partidas-de-prueba/todo-desbloqueado.json');
