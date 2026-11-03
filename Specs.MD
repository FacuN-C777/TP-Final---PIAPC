# Specs — “Asecho Nocturno”

TP Final Integrador — PIAPC  
Documento de specs ordenadas por dependencias. Cada spec es una entrega pequeña y verificable.

## Reglas de trabajo

- Implementar una spec por vez y esperar aprobación antes de empezar.
- No avanzar a la siguiente spec hasta verificar la actual jugando.
- No agregar funcionalidades fuera de la spec activa.
- No instalar dependencias nuevas ni usar frameworks de gestión de specs.
- Si cambia el alcance, actualizar primero `GDD.MD` y este archivo.
- Una spec se considera terminada cuando el comportamiento se comprobó, el build pasa y el usuario aprueba la revisión.

## Orden y estado

| Spec | Estado | Depende de |
|---|---|---|
| 01 — Grilla y escena | Terminada | — |
| 02 — Búsquedas y movimiento | Terminada | 01 |
| 03 — Navegación | Terminada | 02 |
| 04 — Escenarios variables | Terminada — aprobada | 02 |
| 05 — Interacción y victoria | Terminada — aprobada | 04 |
| 06 — Percepción | Terminada — aprobada | 05 |
| 07 — FSM del guardia y derrota | Terminada — aprobada | 06 |
| 08 — UI final y pulido | Terminada — aprobada | 01–07 |
| 09 — README y presentación | Implementada — pendiente de aprobación | 08 |

---

## Spec 01 — Grilla y escena

**Objetivo:** reemplazar la pantalla de bienvenida del template por una escena Phaser que muestre una grilla de 17 × 13 celdas con un mapa fijo de prueba, paredes visibles, suelo y un HUD base.

**Comportamiento esperado:**
- El juego abre directamente en la escena de grilla, sin pantalla de logo.
- Se ven las 17 columnas y 13 filas, con paredes y celdas transitables diferenciadas.
- El HUD muestra el título y un texto de ayuda mínimo.
- La tecla `R` reinicia la misma escena con el mapa fijo.
- La escena se adapta al tamaño de la ventana sin deformarse.
- No hay errores en consola ni en el build.

**Fuera de alcance:**
- Búsquedas, movimiento, clics, NPC, objetos interactivos, generación aleatoria y puntaje.

**Cómo comprobarla jugando:**
1. Ejecutar `npm run dev` y abrir la URL indicada.
2. Verificar que se ve la grilla completa y que no aparece el logo del template.
3. Presionar `R` y comprobar que la escena se reinicia.
4. Revisar la consola del navegador y confirmar que no hay errores.

---

## Spec 02 — Búsquedas y movimiento

**Objetivo:** implementar BFS, DFS y A* sobre la grilla, permitir que el jugador mueva al ladrón haciendo clic en una celda alcanzable y mostrar la ruta calculada.

**Comportamiento esperado:**
- El jugador hace clic en una celda transitable y el ladrón se mueve desde su celda actual hasta el destino.
- El movimiento es celda a celda, con velocidad constante y sin atravesar paredes.
- Se puede elegir BFS con `1`, DFS con `2` y A* con `3`; el HUD indica el algoritmo activo.
- A* y BFS producen caminos de longitud mínima; DFS produce un camino válido, posiblemente más largo.
- La ruta calculada se puede mostrar u ocultar con `P`.
- Un clic en una pared, fuera de la grilla o en una zona inalcanzable se rechaza con un mensaje breve.
- Si el jugador hace clic en otro destino mientras el ladrón se mueve, se cancela el recorrido anterior y se recalcula desde la celda actual.

**Fuera de alcance:**
- Navegación suavizada, generación aleatoria, guardias, llave, puerta, tesoros, salida y percepción.

**Enfoque acordado:**
- Extraer constantes, mapa fijo y helpers de grilla a `src/game/grid.ts`.
- Crear `src/game/pathfinding.ts` con BFS, DFS y A* sobre la misma grilla.
- Agregar el ladrón como figura simple en una celda inicial fija.
- Mover celda a celda con velocidad constante de 5 celdas por segundo.
- Mostrar la ruta por defecto como línea con puntos sobre las celdas.
- Rechazar clics inválidos con un aviso breve y recalcular si se hace clic mientras se mueve.
- Resaltar el algoritmo activo con un badge de color en el HUD.
- Recortar la ruta a medida que el ladrón avanza y hacerla desaparecer al completar el recorrido.

**Cómo comprobarla jugando:**
1. Probar un mismo destino con BFS, DFS y A* y comparar visualmente las rutas.
2. Confirmar que A* y BFS llegan con la menor cantidad de pasos y que DFS puede tardar más.
3. Hacer clic en una pared y en una celda aislada; verificar que el movimiento se rechaza.
4. Iniciar un recorrido largo, hacer clic en otro destino a mitad de camino y comprobar que la ruta cambia desde la posición actual.
5. Ocultar y mostrar la ruta con `P`.
6. Confirmar que el HUD resalta el algoritmo activo y que la ruta se recorta y desaparece al llegar.

---

## Spec 03 — Navegación

**Objetivo:** agregar dos alternativas de navegación seleccionables que usen el mismo camino calculado: recorrido por celdas y recorrido suavizado.

**Comportamiento esperado:**
- La tecla `N` alterna entre “Por celdas” y “Suavizada”; el HUD muestra el modo activo.
- En “Por celdas”, el personaje pasa por el centro de cada celda del camino.
- En “Suavizada”, se eliminan waypoints intermedios cuando hay línea de visión directa, produciendo un recorrido más recto.
- El suavizado no atraviesa paredes ni celdas bloqueadas.
- La búsqueda utilizada sigue siendo la elegida con `1`, `2` o `3`; cambiar de navegación no cambia el algoritmo.
- La velocidad total del recorrido se mantiene comparable entre ambos modos.

**Fuera de alcance:**
- Persecución directa, campos de flujo, steering, movimiento libre y cambios al algoritmo de búsqueda.

**Enfoque implementado:**
- Mantener `findPath` sin cambios; la navegación solo transforma el camino de celdas en waypoints.
- Agregar un modo `Por celdas` / `Suavizada`, seleccionable con `N` y visible en el HUD.
- En `Suavizada`, aplicar string-pulling: conservar inicio y destino y eliminar waypoints intermedios cuando haya línea de visión directa.
- Validar la línea de visión muestreando la grilla y rechazando cualquier segmento que toque una pared o celda bloqueada.
- Mover al ladrón por waypoints con duración proporcional a la distancia recorrida, para que la velocidad total sea comparable entre modos.
- Dibujar la ruta visible según el modo activo, manteniendo `P` y el recorte/desaparición progresiva.
- Si se cambia de modo durante un recorrido, cancelar en la celda actual y recalcular el mismo destino con el nuevo modo.

**Cómo comprobarla jugando:**
1. Elegir un destino con BFS y observar el recorrido “Por celdas”.
2. Presionar `N` y repetir el mismo destino; comprobar que el camino se ve más recto.
3. Repetir con A* y DFS.
4. Verificar que el modo suavizado nunca cruza una pared.
5. Confirmar que `N` no cambia el algoritmo y que `P`, `R` y los clics inválidos siguen funcionando.

---

## Spec 04 — Escenarios variables

**Objetivo:** generar un escenario nuevo en cada partida con paredes, llave, puerta, tesoros, salida, escondites, puntos de inicio y 1 o 2 guardias, garantizando que sea completable.

**Comportamiento esperado:**
- Cada “Nueva partida” genera una distribución distinta de paredes y elementos.
- El escenario incluye exactamente 1 llave, 1 puerta, 2 o 3 tesoros, 1 salida y 1 o 2 escondites.
- La cantidad de guardias se puede seleccionar entre 1 y 2 y se refleja en el escenario.
- La llave es alcanzable desde el inicio.
- La salida y al menos un tesoro son alcanzables después de abrir la puerta.
- La puerta está en el recorrido hacia la salida y no es un elemento decorativo.
- Los escondites son celdas laterales o sin salida.
- El guardia no aparece pegado al ladrón.
- Si una generación no cumple las garantías, se descarta y se genera otra.
- Las rutas y la patrulla cambian porque cambia el mapa, no solo la apariencia.

**Fuera de alcance:**
- Interacciones de llave, puerta y tesoros; victoria; percepción; FSM; puntaje; semillas y guardado.

**Enfoque implementado:**
- Refactor mínimo de `grid.ts` con `setActiveMap`/`getActiveMap`; `isWalkable` consulta el mapa activo y `TEST_MAP` queda como referencia.
- Crear `scenario.ts` con `Scenario` y `generateScenario({ guardCount })`.
- Generar una barrera vertical u horizontal con una única puerta, paredes decorativas y lados A/B.
- Lado A: inicio y llave. Lado B: salida y al menos un tesoro. Validar por inundación con puerta cerrada y abierta.
- Tesoros 2 o 3; escondites 1 o 2 en celdas sin salida o laterales; guardias 1 o 2 lejos del inicio.
- Regenerar hasta 200 intentos si falla la validación y usar un fallback determinístico.
- La puerta queda como `#` (bloqueada) hasta la Spec 05; la validación simula la puerta abierta.
- Integrar en `Game.ts`: `R` genera una nueva partida, botón de guardias en el HUD y dibujo de elementos con formas y letras.
- No modificar BFS, DFS, A* ni el suavizado; todos deben funcionar sobre el mapa generado.

**Cómo comprobarla jugando:**
1. Generar al menos 10 partidas nuevas y comprobar que los mapas cambian.
2. En cada mapa, verificar que la llave es alcanzable desde el inicio.
3. Verificar que la salida y al menos un tesoro quedan del otro lado de la puerta.
4. Comprobar que no hay elementos inalcanzables ni guardias superpuestos con el ladrón.
5. Cambiar entre 1 y 2 guardias y confirmar que la cantidad se respeta.

**Verificación realizada:**
- Prueba programática con esbuild + Node sobre 600 escenarios (300 con 1 guardia, 300 con 2): todos pasaron `validateScenario`, mapas/layouts únicos, tesoros 2/3, escondites 1/2 y rangos variables de paredes.
- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Prueba CDP con Chrome headless sobre `npm run dev-nolog`: inicio con 1 guardia, 2 tesoros, 2 escondites; clic en la puerta rechazado con "La puerta está cerrada" sin mover al ladrón; clic válido movió al ladrón al destino; `R` generó mapa distinto conservando 1 guardia; botón de guardias alternó a 2 y regeneró el escenario; `R` conservó 2 guardias; sin errores de consola.

---

## Spec 05 — Interacción y victoria

**Objetivo:** implementar la recolección de llave y tesoros, la apertura de la puerta, la salida y la condición de victoria.

**Comportamiento esperado:**
- La llave se recoge automáticamente al pisar su celda.
- Sin llave, la puerta bloquea el paso del ladrón.
- Con llave, la puerta se abre automáticamente al intentar atravesarla y queda abierta.
- Los tesoros se recogen automáticamente al pisar sus celdas.
- El HUD muestra tesoros recogidos, tenencia de llave y estado de la puerta.
- La salida solo otorga la victoria si el ladrón ya recogió al menos 1 tesoro.
- Al ganar se muestra un mensaje de victoria y se puede iniciar una nueva partida.
- Tocar la salida sin tesoros no termina la partida; se muestra un aviso.
- Los tesoros extra se pueden recoger, pero no modifican la condición de victoria.

**Fuera de alcance:**
- Guardias y derrota, puntaje, bonificaciones, varias llaves o puertas, percepción y FSM.

**Enfoque implementado:**
- Estado de interacción en `Game.ts`: `hasKey`, tesoros recogidos, `doorOpen` y `gameWon`; todo se reinicia en `init()` y en cada nueva partida.
- Las interacciones se resuelven al completar cada celda del recorrido usando un índice sobre `currentPath`; en navegación suavizada se procesa el tramo entre waypoints, incluidas las celdas intermedias salteadas.
- Llave: se recoge automáticamente al pisar su celda, se oculta su marcador, se actualiza el HUD y se muestra un mensaje breve.
- Tesoros: se recogen automáticamente, se ocultan sus marcadores y se actualiza el contador `Tesoros: recogidos / total`. Los extra no cambian la victoria.
- Puerta:
  - sin llave, el clic se rechaza con un aviso y el ladrón no se mueve;
  - con llave, se abre automáticamente al hacer clic en ella o al intentar cruzar hacia una celda del otro lado: se reemplaza `#` por piso en `scenario.map`, se llama a `setActiveMap()`, se marca `doorOpen = true` y se actualiza el marcador (letra `A`) y el HUD;
  - una vez abierta, permite el paso normal y queda abierta durante el resto de la partida.
- Salida:
  - con 0 tesoros, muestra un aviso y no termina la partida;
  - con 1 o más, detiene el movimiento, limpia la ruta, marca `gameWon`, muestra un mensaje de victoria persistente e ignora clics de movimiento hasta `R`.
- HUD: se agregaron los badges de llave, puerta y tesoros en la franja superior (`y < GRID_Y`), sin superponerse a la grilla.
- No se modificaron la generación, BFS, DFS, A* ni el suavizado.

**Verificación realizada:**
- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Prueba CDP con Chrome headless sobre `npm run dev-nolog`, con exposición temporal de la escena (retirada al terminar):
  - clic en la puerta sin llave: rechazo con aviso, `doorOpen` falso y ladrón sin moverse;
  - recorrido hasta la llave con navegación suavizada: se recogió, el marcador desapareció y el HUD mostró `Llave: sí`;
  - clic en la puerta con llave: se abrió, el mapa pasó a `.`, el HUD mostró `Puerta: abierta` y el marcador cambió a `A`;
  - salida sin tesoros: aviso y sin victoria;
  - recolección de un tesoro: contador y HUD actualizados y marcador oculto;
  - llegada a la salida con 1 tesoro: victoria, movimiento detenido, ruta limpia y clics posteriores ignorados;
  - `R`: nueva partida con llave no, puerta cerrada (`#`), tesoros en 0 y marcadores visibles de nuevo;
  - prueba del salteo de celdas intermedias en suavizada: un waypoint posterior a la llave resolvió correctamente la celda intermedia;
  - sin errores de consola.

**Cómo comprobarla jugando:**
1. Intentar cruzar la puerta sin llave y confirmar que el clic se rechaza o el paso queda bloqueado.
2. Recoger la llave y comprobar que la puerta se abre.
3. Llegar a la salida sin tesoros y verificar que no se gana.
4. Recoger al menos un tesoro y llegar a la salida para ganar.
5. Confirmar que los contadores del HUD coinciden con lo recolectado.

---

## Spec 06 — Percepción

**Objetivo:** implementar la percepción del guardia con visión en cono, línea de visión, oído por eventos y memoria de la última posición conocida.

**Comportamiento esperado:**
- El guardia tiene un cono de visión de 5 celdas de alcance y 90°.
- Las paredes bloquean la línea de visión.
- Si el ladrón está dentro del cono y sin obstáculos, el guardia lo detecta.
- Estar en un escondite anula la detección visual.
- El guardia tiene un radio de oído de 6 celdas.
- Abrir la puerta y recoger un tesoro generan un evento de ruido; el guardia registra el origen.
- Al perder de vista al ladrón, el guardia conserva la última posición conocida.
- Una visualización de depuración muestra el cono, el radio de oído, el estado de detección y la última posición conocida.
- La percepción todavía no necesita mover al guardia ni iniciar persecución completa.

**Fuera de alcance:**
- FSM completa, patrulla, persecución, captura, propagación realista del sonido y exploración de varias celdas.

**Enfoque implementado:**
- Crear `src/game/perception.ts` con la lógica pura de percepción, separada de la escena y verificable sin Phaser:
  - `VISION_RANGE = 5`, `VISION_HALF_ANGLE = 45` y `HEARING_RANGE = 6`.
  - `GuardPerception` con `cell`, `facing`, `seesThief`, `lastKnownPosition` y `lastNoise`.
  - `NoiseEvent` con `origin`, `kind` (`'door' | 'treasure'`) y momento del evento.
  - Funciones para calcular la orientación inicial, comprobar distancia/ángulo, línea de visión, visión efectiva y audición.
- Estado de guardias en `Game.ts`:
  - Inicializar un `GuardPerception` por cada celda de `scenario.guards` en `create()` y reiniciarlo en `init()` y en cada nueva partida.
  - Mientras no exista patrulla (Spec 07), cada guardia queda quieto con una orientación provisional determinística: mira hacia el inicio del ladrón por el eje de mayor diferencia (horizontal o vertical). No rota ni se mueve.
- Visión:
  - El ladrón debe estar a 5 celdas o menos (distancia euclidiana entre centros) y dentro de ±45° respecto de `facing`.
  - La línea de visión se bloquea con paredes y con la puerta cerrada; se reutiliza el muestreo de línea de visión existente en `navigation.ts` sobre el mapa activo. Con la puerta abierta se puede ver a través de ella.
  - Si el ladrón está en una celda de `scenario.hidingSpots`, `seesThief` siempre es `false`, aunque esté dentro del cono.
  - Al detectar, actualizar `lastKnownPosition` con la celda actual del ladrón. Al dejar de verlo, conservar ese valor sin borrarlo.
- Oído:
  - `openDoor()` y la recolección de tesoros en `resolveCell()` emiten un `NoiseEvent` en esa celda.
  - Cada guardia a 6 celdas o menos (distancia euclidiana) registra el origen en `lastNoise`; las paredes no bloquean el sonido.
  - El ruido no pisa `lastKnownPosition`: son datos distintos y la FSM de la Spec 07 decidirá cómo usarlos.
- Actualización:
  - Recalcular la percepción al crear la escena, al abrir la puerta, al emitir un ruido y cuando cambie la celda del ladrón durante el recorrido.
  - En navegación suavizada, evaluar también en `onUpdate` del tween al cambiar de celda redondeada, para no perder detecciones entre waypoints.
- Visualización de depuración (visible durante la Spec 06):
  - Cono de visión de 5 celdas y 90° con relleno translúcido; color distinto si el guardia ve al ladrón.
  - Círculo de oído de 6 celdas solo con contorno.
  - Línea desde el guardia al ladrón cuando lo ve.
  - Marca persistente en la última posición conocida y aviso temporal en el origen del último ruido.
  - Anillo del marcador del guardia resaltado cuando ve o cuando registra un ruido reciente, y badge `Detección: no / vista / ruido` en la franja superior.
  - Mantener la visualización por debajo del HUD y con transparencia para no tapar la grilla.
- No modificar `scenario.ts` (los guardias siguen siendo solo celdas), BFS/DFS/A*, el suavizado, la generación ni las reglas de victoria. No mover al guardia, no perseguir y no implementar derrota.

**Verificación realizada:**
- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Prueba programática con esbuild + Node sobre `perception.ts` (21 casos): dentro del cono, borde de 45°, fuera de ángulo, fuera de alcance, pared de por medio, puerta cerrada/abierta, escondite, ruido dentro/fuera del radio y sin bloqueo por paredes, conservación de la última posición, el ruido no pisa la memoria visual y orientación inicial por eje.
- Prueba CDP con Chrome headless sobre `npm run dev-nolog`, con exposición temporal de la escena (retirada al terminar), 32 comprobaciones:
  - detección dentro del cono, badge `vista` y última posición conocida guardada;
  - pérdida de visión con conservación de la última posición;
  - escondite dentro del cono sin detección y contraprueba fuera del escondite;
  - puerta cerrada bloquea la visión, puerta abierta deja ver y genera ruido;
  - ruido registrado, badge `ruido`, aviso temporal y desaparición posterior;
  - `R` reinicia percepciones, ruidos, llave, puerta y avisos;
  - sin errores de consola ni excepciones.

**Cómo comprobarla jugando:**
1. Pasar frente al guardia dentro del cono y confirmar la detección.
2. Pasar detrás de una pared y verificar que no hay detección visual.
3. Entrar a un escondite dentro del cono y confirmar que no se detecta.
4. Abrir la puerta y recoger un tesoro para comprobar el registro de ruido.
5. Salir del cono después de ser visto y verificar que se conserva la última posición conocida.

---

## Spec 07 — FSM del guardia y derrota

**Objetivo:** implementar la máquina de estados del guardia y la derrota cuando atrapa al ladrón.

**Comportamiento esperado:**
- El guardia tiene los estados `PATRULLA`, `INVESTIGAR` y `PERSEGUIR`.
- En `PATRULLA`, elige una celda alcanzable al azar y recalcula su ruta al llegar; no usa una trayectoria fija preparada.
- Al oír un ruido o recibir una última posición conocida, pasa a `INVESTIGAR`.
- Al ver al ladrón, pasa a `PERSEGUIR` y actualiza el destino con su posición.
- Si pierde de vista al ladrón, investiga la última posición conocida.
- Después de investigar sin encontrar nada, vuelve a `PATRULLA`.
- Si el guardia alcanza la celda del ladrón, la partida termina en derrota.
- Funciona con 1 o 2 guardias, usando el algoritmo de búsqueda y la navegación seleccionados.
- Los guardias pueden cruzar puertas cerradas para no quedar trabados.
- Se muestra un mensaje de derrota y se puede iniciar una nueva partida.

**Fuera de alcance:**
- Tácticas coordinadas entre guardias, GOAP, árboles de comportamiento, puntaje, búsqueda de escondites sospechosos y percepción realista del sonido.

**Enfoque implementado:**
- Crear `src/game/guard.ts` con la FSM pura, sin Phaser y verificable de forma programática:
  - `GuardState = 'PATRULLA' | 'INVESTIGAR' | 'PERSEGUIR'`.
  - `GuardAgent` con `perception`, `state`, `destination`, `path`, `waypoints`, `waypointIndex`, `moving`, `observeUntil` y `handledNoiseAt`.
  - Funciones puras para crear el agente, elegir un destino de patrulla al azar entre celdas alcanzables (excluyendo la actual), decidir la transición según visión, ruido y tiempo, y devolver una acción (`moverse`, `observar` o `quieto`).
  - `INVESTIGAR` observa durante un tiempo fijo (por ejemplo 2 s) al llegar; si no encuentra nada, vuelve a `PATRULLA`.
  - La selección aleatoria recibe `random` inyectable para poder testear.
- Rutas de guardia:
  - Refactorizar `pathfinding.ts` para aceptar un predicado de transitabilidad y agregar `findGuardPath`, que trata la puerta cerrada como transitable. El `findPath` del ladrón conserva el comportamiento actual.
  - Los guardias usan el algoritmo activo y `buildWaypoints` con la navegación activa. Si la puerta está cerrada, el suavizado no corta a través de ella, pero el recorrido celda a celda sí la cruza.
- Movimiento en `Game.ts`:
  - Un `GuardAgent` por celda de `scenario.guards`, reiniciado en `init()` y en cada nueva partida.
  - Mover el marcador del guardia con tweens por waypoints; al cambiar de celda actualizar `perception.cell`, recalcular la percepción y comprobar la derrota.
  - Actualizar `perception.facing` hacia el eje dominante del siguiente waypoint al iniciar cada tramo.
  - Velocidad de guardia fija y algo menor que la del ladrón (por ejemplo 4 celdas/s).
  - Calcular una vez por escenario las celdas alcanzables para patrulla con un flood que considere la puerta transitable.
- Transiciones:
  - Ver al ladrón → `PERSEGUIR` con destino en la celda actual del ladrón.
  - En `PERSEGUIR`, si deja de verlo → `INVESTIGAR` con destino en `lastKnownPosition`.
  - Ruido nuevo (`lastNoise.at` mayor que el último atendido) → `INVESTIGAR` al origen, salvo que esté persiguiendo.
  - En `PATRULLA`, al llegar a destino elegir otra celda alcanzable al azar y recalcular la ruta.
- Derrota:
  - Si un guardia comparte celda con el ladrón (al completar un tramo, al cambiar la celda redondeada durante el tween o al moverse el ladrón), marcar `gameLost`, detener tweens de ladrón y guardias, limpiar la ruta y mostrar un mensaje persistente de derrota. Ignorar clics hasta `R`.
- HUD y depuración:
  - Badge compacto con el estado de cada guardia en la franja superior para observar la FSM.
  - Mantener la visualización de percepción de la Spec 06.
- No agregar dependencias nuevas.

**Verificación realizada:**
- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Prueba programática con esbuild + Node (63 casos): transiciones de `guard.ts` (patrulla, visión, pérdida de visión, ruido, observación y timeout, ruido atendido una sola vez, ruido durante persecución, ruido nuevo durante investigación, ruido en la celda actual); destino de patrulla distinto del actual; `findGuardPath` cruza la puerta cerrada con BFS, DFS y A*, mientras `findPath` del ladrón no la cruza; con la puerta abierta ambos la cruzan.
- Prueba CDP con Chrome headless sobre `npm run dev-nolog` con exposición temporal de la escena (retirada al terminar), 38 comprobaciones, repetida tres veces con escenarios aleatorios: patrulla y cambio de destino; ruido → `INVESTIGAR` hacia el origen; llegada y observación; timeout → `PATRULLA`; visión → `PERSEGUIR`; pérdida de visión → `INVESTIGAR` hacia la última posición; derrota al alcanzar con ladrón y guardias detenidos; `R` reinicia y limpia la derrota; 2 guardias patrullan; A* con suavizada mueve al guardia; sin excepciones ni errores de consola.
- Durante la verificación se corrigieron dos fallos: tweens cancelados dentro de su propio callback (Phaser dejaba de actualizar todos los tweens) y cancelaciones diferidas que detenían tweens nuevos.
- Se comprobó además que un ladrón inmóvil dentro del cono de un guardia termina derrotado: es el comportamiento esperado.

**Cómo comprobarla jugando:**
1. Observar al guardia patrullar y comprobar que cambia de destino al llegar.
2. Generar ruido y verificar que se dirige al origen.
3. Entrar en su cono de visión y comprobar que comienza la persecución.
4. Romper la línea de visión y verificar que investiga la última posición.
5. Esperar a que el guardia toque al ladrón y confirmar la derrota y el reinicio.
6. Repetir con 2 guardias y con las distintas búsquedas y navegaciones.

---

## Spec 08 — UI final y pulido

**Objetivo:** completar la interfaz y pulir la experiencia para que todas las alternativas se puedan seleccionar y observar jugando.

**Comportamiento esperado:**
- El HUD muestra algoritmo, navegación, tesoros, llave, puerta, cantidad de guardias y estado de la partida.
- Hay botones para nueva partida, elegir 1 o 2 guardias y alternar la ruta.
- Los selectores de algoritmo y navegación se pueden usar con mouse y con las teclas indicadas.
- Los mensajes de victoria, derrota, clic inválido, ruido y detección son claros y breves.
- Se distinguen visualmente paredes, piso, llave, puerta, tesoros, salida, escondites, ladrón y guardias.
- El bucle completo se puede jugar sin depender de la consola ni de herramientas de depuración.
- No hay elementos de UI superpuestos ni información desactualizada.
- El build de producción termina sin errores.

**Fuera de alcance:**
- Menú de inicio, progresión, arte externo, audio, versión móvil, tablas de puntaje y nuevas mecánicas.

**Enfoque implementado:**
- Diagnóstico del estado actual antes de cambiar nada:
  - Algoritmo y navegación solo se cambian con teclas (`1/2/3`, `N`); no hay selectores con mouse.
  - No hay botón de nueva partida (solo `R`) ni botón de mostrar u ocultar la ruta (solo `P`).
  - `init()` reinicia algoritmo y navegación en cada partida.
  - El ladrón, la llave y la última posición conocida usan tonos amarillos muy parecidos.
  - La franja superior tiene 96 px y reparte el título, dos badges de detección y guardias, llave, puerta, selectores, tesoros, botón de guardias y una línea de controles. Hay que comprobar solapamientos con medidas reales.
- HUD en tres filas dentro de la franja superior (`y < 96`), con medidas comprobadas:
  - Fila 1: título centrado; detección a la izquierda; estado de guardias a la derecha.
  - Fila 2: llave y puerta a la izquierda; selector de algoritmo (BFS, DFS, A*) centrado; botón de guardias (1/2) a la derecha.
  - Fila 3: tesoros a la izquierda; selector de navegación (Por celdas, Suavizada) centrado; botones de ruta (P) y nueva partida (R) a la derecha.
  - La línea de controles con teclas se elimina o se reduce a una pista debajo de la grilla, para no competir con las filas.
- Selectores y botones clicables:
  - Botones de algoritmo y navegación con estado activo visible (color distinto); reutilizan las mismas funciones que las teclas `1/2/3` y `N`.
  - Botón de nueva partida equivalente a `R`, y botón de ruta equivalente a `P`.
  - Botón de guardias existente, pero con etiqueta clara (`Guardias: 1` / `Guardias: 2`).
- Persistencia entre partidas (confirmada): algoritmo, navegación, cantidad de guardias y visibilidad de la ruta se conservan al iniciar una nueva partida (`R` o botón). `init()` ya no los reinicia.
- Estados y mensajes:
  - Badge de estado de partida: `En juego`, `Victoria` o `Derrota`.
  - Estado de guardias con nombres completos en lugar de `P / I / PE`: `Patrulla`, `Investiga`, `Persigue`, con color por estado.
  - Mensajes de victoria, derrota, clic inválido, ruido y detección revisados para que sean breves y consistentes.
- Paleta: el ladrón pasa a un color que no comparta tono con la llave ni con la última posición conocida. Se revisan también puerta cerrada/abierta, tesoros, salida, escondites y guardias.
- Leyenda inferior de una línea (símbolos y colores de llave, puerta, tesoro, salida, escondite, ladrón, guardia), ubicada debajo de la grilla y por encima del borde inferior. El mensaje de estado queda en una fila separada, sin superponerse.
- Visualización de cono y audición de los guardias: visible durante el juego (confirmado), porque es la única forma de leer la visión en partida. Los textos de depuración se reemplazaron por textos de juego. Se recorta a la grilla para no tapar la franja superior ni la leyenda.
- Fuera de alcance de esta spec: menú de inicio, progresión, arte externo, audio, móvil, tablas de puntaje, nuevas mecánicas y la FSM del ladrón (`REPOSO`, `MOVIENDO`, `OCULTO`, `ATRAPADO`) descrita en el GDD, que no aparece en los criterios de la Spec 08.
- Build: `npm run build` ejecuta `log.js`, que hace una petición a `gryzor.co`. Decidido: verificar con `npm run build-nolog` y ejecutar `npm run build` con autorización explícita del usuario, que fue dada.

**Verificación realizada:**
1. `npx.cmd tsc --noEmit`, `npm.cmd run build-nolog` y `npm.cmd run build` pasaron.
2. Prueba CDP con Chrome headless y clics reales (`Input.dispatchMouseEvent`) sobre `npm run dev-nolog`: 33 comprobaciones de estado inicial, selectores, botones, teclas `1/2/3`, `N`, `P`, `R`, persistencia tras `R` y tras los botones, cantidad de guardias y clic en pared.
3. Partidas completas (15 comprobaciones): victorias con A* suavizada (2 guardias) y DFS suavizada (1 guardia); derrotas con A* por celdas (2 guardias), BFS suavizada con ruta oculta (1 guardia) y DFS por celdas (2 guardias). Cada derrota verificó que los clics se ignoran y que `R` reinicia conservando selecciones. Dos victorias fallaron en los primeros intentos porque el guardia atrapó al ladrón; se obtuvieron con reintentos. Es comportamiento de juego, no un error.
4. Solapamientos medidos en todos los estados: 0. HUD dentro del canvas; franja superior hasta y=89; leyenda desde y=726.
5. Capturas revisadas: inicio, dos guardias, victoria y derrota con ruta oculta.
6. Sin errores de consola ni excepciones.
7. Correcciones durante la verificación: la visión y la audición se recortan a la grilla con una máscara.

**Cómo comprobarla jugando:**
1. Jugar partidas completas con BFS, DFS y A*.
2. Probar ambos modos de navegación y ambas cantidades de guardias.
3. Ganar al menos una partida y perder al menos una.
4. Verificar que todos los botones y teclas funcionan y que el HUD se actualiza.
5. Ejecutar `npm run build` y comprobar que termina correctamente.

---

## Spec 09 — README y presentación

**Objetivo:** dejar instrucciones claras de ejecución y un guion de presentación del prototipo.

**Comportamiento esperado:**
- El README explica requisitos, instalación, ejecución, build, controles y estructura del proyecto.
- El README indica qué spec está implementada y cuáles quedan pendientes.
- El README enlaza el GDD y las specs.
- El README enumera limitaciones conocidas del prototipo.
- La presentación cubre búsqueda, navegación, percepción, objetivos, decisiones, FSM, escenarios variables y uso de OpenCode/spec-driven.
- La presentación muestra una spec concreta y explica cómo se verificó.
- La presentación incluye una demo corta y un espacio para limitaciones.
- Las instrucciones se pueden seguir desde un clon limpio del repositorio.
- El juego se puede jugar desde el navegador en un despliegue público en Vercel. El README y la presentación enlazan ese despliegue.

**Fuera de alcance:**
- Informe extenso, carpeta de evidencias, video obligatorio, diapositivas con arte elaborado o métricas comparativas.

**Enfoque implementado:**
- Decisiones confirmadas por el usuario:
  - Presentación en Markdown dentro del repo (`PRESENTACION.md`).
  - `Template-README.md` eliminado.
  - `screenshot.png` reemplazado por una captura del juego. `public/favicon.png`, `public/assets/logo.png` y `public/assets/bg.png` eliminados, junto con el enlace al favicon en `index.html` (ningún código los usaba). `public/style.css` y `LICENSE` se mantienen.
  - `package.json` y `package-lock.json`: `name` pasa a `asecho-nocturno` y `description` describe el TP.
- `README.md` reescrito en español: descripción, requisitos, instalación, ejecución, scripts, controles, estructura, enlaces al GDD, Specs y presentación, estado de las specs, limitaciones y nota sobre `log.js`.
- `PRESENTACION.md` nuevo: idea, búsqueda, navegación, percepción, objetivos, FSM, escenarios variables, decisiones, uso de OpenCode y spec-driven, Spec 07 con su verificación, guion de demo, limitaciones (con espacio para completar) y cierre.
- `log.js` sin cambios: sigue enviando el nombre del proyecto en `npm run dev` y `npm run build`; las variantes `-nolog` no envían nada.
- Despliegue en Vercel (cambio de alcance confirmado por el usuario): el juego se publica como sitio estático generado por Vite. Configuración recomendada en Vercel: Build Command `npm run build-nolog`, Output Directory `dist`, Install Command `npm install`. El enlace al despliegue queda en el README y en la presentación. Pendiente: crear el proyecto en Vercel y completar el enlace.

**Verificación realizada:**
- Copia limpia en una carpeta temporal con los archivos versionados o no ignorados (sin `node_modules` ni `dist`): `npm install` sin errores ni vulnerabilidades, `tsc --noEmit` y `build-nolog` pasaron, `npm run dev-nolog` respondió 200 y la página contiene el título del juego.
- `npm run build` no se ejecutó: la autorización dada en la Spec 08 era para esa spec.
- Pendiente tras el commit del usuario: repetir el clon limpio desde git, porque la copia actual incluye cambios sin commitear.
- Pendiente: `package.json` aún tiene `repository`, `bugs`, `homepage` y `author` apuntando al template de Phaser. No se cambiaron por no estar en la decisión; conviene decidirlo.

**Cómo comprobarla jugando:**
1. Seguir el README desde cero: `npm install`, `npm run dev` y `npm run build`.
2. Confirmar que los controles documentados coinciden con el juego.
3. Ensayar la demo con las combinaciones principales.
4. Verificar que la spec mostrada coincide con el estado real del código.
