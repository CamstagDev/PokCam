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
