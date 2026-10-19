# PokCam

Roguelike de cartas: se recorre un mapa de caminos que se ramifican (como
el primer acto de Inscryption, pero en 2D) y cada combate se gana armando
manos de póker (como Balatro). Juego 100 % offline.

## Plataformas

- **Windows** (instalador), empaquetado con Electron.
- **Android** (en horizontal), empaquetado con Capacitor.
- **Navegador**, para desarrollar.

Todas comparten el mismo código del juego (`src/`); cada plataforma solo
aporta un envoltorio delgado.

## Tecnologías

- **TypeScript** en modo estricto. `npm run tipos` revisa los tipos; Vite
  compila.
- **Phaser 4** para dibujar (WebGL), las animaciones (tweens), la entrada
  con mouse o dedo y el escalado a cualquier pantalla. El juego se dibuja
  siempre en 1280×720 y Phaser lo ajusta.
- **Vite** para el servidor de desarrollo y el build; **Vitest** para las
  pruebas.

## Comandos

En Windows, doble clic en `Iniciar PokCam.cmd` (en la raíz) hace lo mismo
que `npm run dev` y abre el navegador; la primera vez instala las
librerías. Cerrar su ventana apaga el servidor.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre el juego en el navegador en http://localhost:5175, con recarga al guardar |
| `npm test` | Corre las pruebas automáticas |
| `npm run tipos` | Revisa los tipos de TypeScript |
| `npm run escritorio` | Compila y abre la app de Windows |
| `npm run escritorio:dev` | Abre la app de Windows contra `npm run dev` (hay que tenerlo corriendo) |
| `npm run instalador:windows` | Genera `release/PokCam Setup <versión>.exe` |
| `npm run android:apk` | Genera `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run version:nueva -- parche` | Nueva versión (parche, menor o mayor): cambia el número, cierra el CHANGELOG, hace commit y etiqueta. Con `git push --follow-tags`, GitHub compila y publica el instalador y el APK |

Para Android no hace falta Android Studio: basta con un JDK 21 y las
herramientas de línea de comandos del SDK de Android, con las variables
`JAVA_HOME` y `ANDROID_HOME` apuntando a ellos. Si cambias el icono
(`public/icons/`), vuelve a generar los de Android con
`scripts/generar-iconos-android.ps1`.

## Dónde está cada cosa

```
src/
  juego/      reglas, sin nada de pantalla (se prueban solas)
                cartas, manos de póker, puntuación, combate, partida, azar con semilla
  mapa/       generación del mapa (pisos, nodos y caminos)
  escenas/    escenas de Phaser: el mapa y la mesa del combate
  main.ts     arranca Phaser
  plataforma.ts  en qué plataforma corre
electron/     la app de Windows (ventana)
android/      la app de Android (proyecto de Capacitor)
scripts/      utilidades (versiones, Gradle, iconos de Android)
tests/        pruebas automáticas (Vitest)
```

Las reglas viven en `src/juego/` y `src/mapa/` y no importan Phaser: así
se prueban sin abrir el juego y las escenas solo dibujan lo que dicen.
Todo el azar sale de una semilla, así que la misma semilla repite la
misma partida.
