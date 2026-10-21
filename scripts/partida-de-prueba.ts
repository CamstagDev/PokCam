// Genera partidas-de-prueba/todo-desbloqueado.json, una partida para
// importar desde "Importar" en las ranuras y probar cosas:
//   - la colección completa (todas las baratijas desbloqueadas)
//   - 99 999 de oro
//   - empieza en el vendedor con Diversidad, De zero a héroe y Subsidio
//   - en el piso 1 hay un vendedor y un élite
//
//   npm run partida:prueba

import { writeFileSync } from 'node:fs';
import { CATALOGO } from '../src/juego/baratijas.ts';
import type { Exportado } from '../src/juego/guardado.ts';
import { crearPartida } from '../src/juego/partida.ts';

const partida = crearPartida(20261021);
const [primero, segundo] = partida.mapa.pisos[1]!;
primero!.tipo = 'vendedor';
segundo!.tipo = 'elite';

const exportado: Exportado = {
  version: 6,
  guardadoEn: Date.now(),
  partida: { ...partida, oro: 99_999, oferta: { tipo: 'vendedor', baratijas: ['diversidad', 'de-zero-a-heroe', 'subsidio'] } },
  coleccion: CATALOGO.map((b) => b.id),
};
writeFileSync(new URL('../partidas-de-prueba/todo-desbloqueado.json', import.meta.url), JSON.stringify(exportado, null, 2) + '\n');
console.log('Listo: partidas-de-prueba/todo-desbloqueado.json');
