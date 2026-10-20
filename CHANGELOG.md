# Cambios de PokCam

Cada versión publicada tiene su sección. Lo que se va haciendo se anota
en "Sin publicar"; `npm run version:nueva` la convierte en la sección de
la versión nueva (ver scripts/nueva-version.mjs).

## Sin publicar

- El mapa ya no toma como elegido un nodo con el mismo clic que lo abrió
  (por ejemplo al sobrescribir una ranura): los nodos responden después
  de un segundo y solo a toques que empiezan en el mapa.

- Nivel de riesgo: es el piso del mapa en el que se está (el inicio es
  el 0) y se ve arriba, junto al oro. Cada nivel sube 100 el objetivo de
  los combates (300 / 500 / 800 de base para combate / élite / jefe).
- El mazo ahora es parte de la partida y se guarda con ella; cada
  combate reparte de ese mazo. Las partidas guardadas de antes siguen
  con el mazo de 52 cartas.

- Base del proyecto: TypeScript, Phaser 4 y Vite, con Electron para
  Windows y Capacitor para Android (en horizontal).
- Mapa de la partida con caminos que se ramifican, del inicio al jefe,
  con combates, élites, tiendas, eventos y descansos (por ahora solo los
  combates hacen algo).
- Combate de póker: mano de 8 cartas, se juegan o descartan de 1 a 5, y
  hay que llegar al objetivo con 4 manos y 3 descartes. Puntos =
  (fichas de la mano + fichas de las cartas) × multiplicador.
- Menú principal con el título del juego, "Nueva partida" y "Continuar".
- 3 ranuras de guardado: al empezar se elige una (si está ocupada se
  pide confirmar antes de sobrescribirla), y desde "Continuar" se puede
  seguir o borrar cada partida. Se guarda sola al elegir un nodo del
  mapa y al ganar un combate; si se sale a mitad de un combate, al
  continuar se vuelve a ese combate. Al perder o vencer al jefe, la
  ranura queda libre.
- Oro: se empieza con 300, cada combate ganado da 100 y cada uno
  perdido quita 100 (al perder se sigue por el mapa, salvo con el jefe,
  que hay que reintentar). Con 0 de oro la partida termina. El oro se ve
  siempre arriba a la derecha y en cada ranura de guardado.
- En el combate, al elegir cartas se ve qué mano se va a jugar (por
  ejemplo "Doble pareja") antes de jugarla.
- Botón "Menú" también en el combate, con confirmación: la partida
  queda guardada y al continuar el combate empieza de nuevo.
- Mapa vertical, como en Inscryption: se sube desde el inicio hasta el
  jefe, con la cámara de cerca y nodos más grandes. Solo se ven el piso
  actual y los dos siguientes; arrastrando (o con la rueda) se baja a
  ver el camino hecho. Al avanzar, la cámara sube sola al piso nuevo.
- Mesa: dos botones redondos entre "Jugar mano" y "Descartar" ordenan
  la mano por valor o por palo; el orden se mantiene al robar.
- Baratijas: objetos que cambian las reglas de la partida. Al vencer a
  un élite se elige 1 de 3 (o se saltea), y el nuevo nodo del vendedor
  de baratijas (✦) las vende por oro, sin dejar que el oro llegue a 0.
  Hay 6 de ejemplo; se agregan más en src/juego/baratijas.ts.
- Botones "Baratijas" y "Mazo" abajo a la izquierda en el mapa, la mesa
  y las pantallas de baratijas, para ver las que se tienen y el mazo.
