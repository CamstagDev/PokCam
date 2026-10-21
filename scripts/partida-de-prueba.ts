// Genera partidas-de-prueba/todo-desbloqueado.json, una partida para
// importar desde "Importar" en las ranuras y probar cosas:
//   - la colección completa (todas las baratijas desbloqueadas)
//   - 99 999 de oro
//   - empieza en el vendedor con Estético, Simétrico y No gracias
//   - en el piso 1 hay un vendedor, un élite y un eliminador
//
//   npm run partida:prueba

import { writeFileSync } from 'node:fs';
import { CATALOGO } from '../src/juego/baratijas.ts';
import type { Exportado } from '../src/juego/guardado.ts';
import { crearPartida } from '../src/juego/partida.ts';

const partida = crearPartida(20261021);
const [primero, segundo, tercero] = partida.mapa.pisos[1]!;
primero!.tipo = 'vendedor';
segundo!.tipo = 'elite';
tercero!.tipo = 'eliminador';

const exportado: Exportado = {
  version: 9,
  guardadoEn: Date.now(),
  partida: { ...partida, oro: 99_999, oferta: { tipo: 'vendedor', baratijas: ['estetico', 'simetrico', 'no-gracias'] } },
  coleccion: CATALOGO.map((b) => b.id),
};
writeFileSync(new URL('../partidas-de-prueba/todo-desbloqueado.json', import.meta.url), JSON.stringify(exportado, null, 2) + '\n');
console.log('Listo: partidas-de-prueba/todo-desbloqueado.json');
