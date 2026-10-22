// Genera partidas-de-prueba/todo-desbloqueado.json, una partida para
// importar desde "Importar" en las ranuras y probar cosas:
//   - la colección completa (todas las baratijas y los nodos desbloqueados)
//   - 99 999 de oro
//   - empieza con Claire obscure, en el vendedor con Crypto monedas, Bróker
//     y No gracias
//   - en los pisos 1 y 2 hay evento, pintor, vendedor, élite, eliminador, mano
//     negra y tienda de cartas
//
//   npm run partida:prueba

import { writeFileSync } from 'node:fs';
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
  version: 11,
  guardadoEn: Date.now(),
  partida: { ...partida, oro: 99_999, baratijas: ['claire-obscure'], oferta: { tipo: 'vendedor', baratijas: ['crypto-monedas', 'broker', 'no-gracias'] } },
  coleccion: CATALOGO.map((b) => b.id),
  nodos: Object.keys(DATOS_NODO),
};
writeFileSync(new URL('../partidas-de-prueba/todo-desbloqueado.json', import.meta.url), JSON.stringify(exportado, null, 2) + '\n');
console.log('Listo: partidas-de-prueba/todo-desbloqueado.json');
