# Cambios de PokCam

Cada versión publicada tiene su sección. Lo que se va haciendo se anota
en "Sin publicar"; `npm run version:nueva` la convierte en la sección de
la versión nueva (ver scripts/nueva-version.mjs).

## Sin publicar

- Nombres nuevos: la mano negra es Helman O'Grande; el vendedor de
  baratijas y la tienda de cartas son Raimundo el vendedor del mundo (el
  mismo hombre en los dos nodos); el eliminador es Edmundo manos de
  cinceles; el pintor es Gustavo el austriaco.
- Eliminar una carta ahora se duplica cada 6 cartas menos (46 → 200,
  40 → 400, 34 → 800).
- Los eventos (?) ya hacen algo, uno de dos regalos al azar:
  - El regalo de Raimundo: hay que elegir 1 de 9 cartas al azar para el
    mazo. Traen +multi y +fichas, más cuanto mayor el riesgo (entre
    riesgo / 2 y riesgo × 1,5 modificaciones por carta).
  - El regalo de Gustavo: duplica los +multi y +fichas de tu carta más
    modificada (si empatan, una al azar). Si ninguna tiene, se ofende y se
    va.

- El pintor: al cambiar de palo, ahora eliges el palo nuevo (en los tres
  servicios).
- El eliminador ahora se llama Raimundo el destructor de mundos. Eliminar
  una carta cuesta 100 con 52 cartas en el mazo, el doble por cada 8 cartas
  menos (44 → 200, 36 → 400) y baja despacio con más (60 → 90, 104 → 60),
  redondeado a decenas. Ya no depende de la carta ni del riesgo.

- Nodo nuevo, El pintor 🖌: hace un solo trabajo por visita.
  - Pintura libre (100 de oro): muestra una carta del mazo al azar y, si
    pagas, le pone un modificador al azar.
  - Alquiler de servicio: el modificador ya está a la vista y eliges a cuál
    de 6 cartas del mazo ponérselo, por 100 × las modificaciones que ya
    tienen esas 6 (al menos 100).
  - Modificadores: +1 multiplicador, +5 fichas o cambiar de palo. Cada vez
    cuenta como una modificación, y las cartas muestran lo que suman.
- Set del artista, con la baratija rara Claire obscure 🎨: el pintor
  también ofrece Personalizado, donde eliges el modificador y la carta de
  todo el mazo, por 100 × las modificaciones de todo el mazo (al menos 100).

- Baratija infrecuente nueva, Bróker 📈: deja venderle tus baratijas al
  vendedor por la mitad de su precio. Sin ella, el botón "Vender baratijas"
  ya no aparece. El Tasador sigue apostando baratijas sin necesitarla.

- Nodos del mapa: fuera de los pisos fijos, el 40 % son combates y el 60 %
  restante se reparte por igual entre élite, vendedor, tienda de cartas,
  eliminador, mano negra, evento y descanso (cerca de 8,6 % cada uno).

- La tienda de cartas ($) ya funciona: ofrece 6 cartas al azar (por ahora
  sin modificar), cada una por 5 × el nivel de riesgo, y las compradas
  pasan al mazo.

- Apostar ya no abre una ventana sola al empezar el combate: entre los
  botones Valor y Palo hay un botón "Apostar", que se puede usar hasta
  jugar la primera mano (después desaparece y la apuesta queda en 0).
- La mano negra: al mejorar una mano la ficha se da vuelta mostrando el
  nivel nuevo y, un segundo después, se sigue sola al mapa.
- El mapa tiene de 15 a 20 pisos entre el inicio y el jefe (antes 7).

- Colecciones tiene pestañas: Baratijas y Nodos. La de nodos muestra cada
  tipo de nodo del mapa y qué hace; los que nunca se visitaron se ven en
  sombra. Exportar una ranura también lleva los nodos vistos.

- Baratija legendaria Crypto monedas: cada paso por el mapa deja una
  predicción (sube o baja) que se cumple dos pasos después, moviendo el
  oro de 0 a 200 % (casi siempre menos de 100 %). Debajo del oro se ven
  las predicciones pendientes y el resultado de la última.

- Las manos de póker tienen nivel: cada nivel suma fichas y multiplicador
  (como en Balatro), y la pantalla de Manos muestra el nivel de cada una.
- Nodo nuevo, la mano negra (✋): sortea 3 manos y deja subir un nivel a
  una de ellas por 100 × (la suma de los niveles − los tipos de mano + 1),
  así que la primera mejora cuesta 100, la segunda 200…

- La ventana de la apuesta muestra con cuánto oro quedarías si ganas y
  si pierdes el combate, con todo lo que cambian tus baratijas (y avisa
  si perder termina la partida).

- La recompensa de un élite ya no se puede pasar: hay que elegir una
  baratija, salvo con la nueva baratija común No gracias, que trae de
  vuelta el botón "Pasar" (+300 de oro).
- Nodo nuevo, el eliminador (✂), con dos servicios de una vez por visita:
  Ruleta rusa (100 de oro: entran hasta 6 de tus baratijas al azar y se
  elimina una) y Eliminar (quitar una carta del mazo por sus fichas × el
  nivel de riesgo).

- Set TOC TOC TOC: con el set completo, los bonos y los castigos de sus
  baratijas valen el doble. Trae dos baratijas infrecuentes:
  Estético (mazo de un solo palo: cartas ×1,25 de fichas; de un solo
  color: igual; con rojas y negras: ×0,5) y Simétrico (si quedan por
  robar un número par de cartas, la mano suma esa cantidad de fichas; si
  es impar, la resta). La mesa ahora muestra cuántas cartas quedan en el
  mazo.

- Baratija infrecuente Racha, del set del apostador empedernido (que ahora
  se completa con tres): cada combate seguido ganado o perdido suma un
  10 % a la apuesta si el resultado sigue la racha. La partida cuenta la
  racha y la pregunta de la apuesta la muestra.

- En el vendedor de baratijas se pueden vender las propias por la mitad
  de su precio ("Vender baratijas") y volver a tirar lo que ofrece por
  100 × (baratijas que tienes + 1) de oro.
- Sets de baratijas: algunas pertenecen a un set y tener varias da bonos.
  La colección las agrupa por set con sus bonos, y se desplaza con la
  rueda o arrastrando. Primer set, el del apostador empedernido (All In y
  Tasador): con el set completo las apuestas ganadas pagan el doble y las
  perdidas cuestan 1,5 veces lo apostado.
- Baratija rara Tasador: deja apostar baratijas por su valor de venta; si
  se pierde la apuesta, se pierden también las baratijas apostadas.

- En Colecciones, el botón "Volver" de abajo tapaba la última fila de
  baratijas: ahora es una flecha arriba a la derecha.

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
  Cada una tiene rareza (común, infrecuente, rara, legendaria), que fija
  su precio (200, 300, 500, 1000); cada lugar de una oferta sortea su
  rareza (60 %, 25 %, 10 %, 5 %), y eso se ve en "Baratijas". Pasar la
  recompensa del élite da 300 de oro. Por ahora hay dos: Materialista
  (común: ♥ dan la mitad de fichas, ♦ 1,5 veces más) y Diversidad (rara:
  ×4 al multiplicador si la mano tiene los 4 palos). Se agregan más en
  src/juego/baratijas.ts.
- Baratijas comunes nuevas: Subsidio (+50 de oro en cada combate, ganado
  o perdido), Altruista (♥ ×1,5, ♦ a la mitad), El poder de las flores
  (♣ ×1,5, ♠ a la mitad) y Corta hierbas (♠ ×1,5, ♣ a la mitad).
- Colecciones, desde el menú principal: todas las baratijas del juego,
  en sombra hasta conseguirlas por primera vez en cualquier partida.
- Botones "Baratijas", "Mazo" y "Manos" abajo a la izquierda en el
  mapa, la mesa y las pantallas de baratijas, para ver las que se
  tienen, el mazo y las fichas y el multiplicador de cada mano.
- Ranuras: una ✕ en la esquina de cada ranura ocupada la borra, tras
  confirmar (reemplaza al botón Borrar).
- Baratija legendaria De zero a héroe: al conseguirla se elige cuántas
  de las raras propias (de 1 a las que se tengan) se vuelven comunes al
  azar; tras el doble de combates, esas se vuelven legendarias al azar.
  "Baratijas" muestra cuántos combates faltan.
- Ranuras: botones Exportar (guarda la partida y la colección en un
  .json) e Importar (abre uno en esa ranura, confirmando si está
  ocupada). partidas-de-prueba/todo-desbloqueado.json es una partida
  para probar: colección completa, 99 999 de oro y empieza en un
  vendedor (se regenera con `npm run partida:prueba`).
- Apuestas: antes de jugar la primera mano de un combate se puede
  apostar (botones < > de 10 y << >> de 100), hasta la mitad del oro. Ganar el combate suma lo apostado y perderlo lo resta.
- Baratija rara All In: se puede apostar todo el oro.
- Baratija legendaria Tarjeta de crédito: se puede quedar en deuda hasta
  riesgo × 100 de oro; mientras se deba, cada paso en el mapa cuesta
  riesgo × 10 % de la deuda. El oro en deuda se ve en rojo.
