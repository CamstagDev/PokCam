# Cambios de PokCam

Cada versión publicada tiene su sección. Lo que se va haciendo se anota
en "Sin publicar"; `npm run version:nueva` la convierte en la sección de
la versión nueva (ver scripts/nueva-version.mjs).

## Sin publicar

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
