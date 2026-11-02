# Guía para futuras sesiones

## Estado actual del proyecto

- TP Final Integrador de PIAPC, individual.
- Motor: Phaser 4.2.1 con Vite y TypeScript. El template original fue reemplazado por la escena de grilla de la Spec 01.
- `GDD.MD` está aprobado y es la fuente de verdad del diseño.
- `Specs.MD` contiene las 9 specs ordenadas y sus criterios de verificación. La Spec 01 está terminada y aprobada. La Spec 02 está terminada y aprobada por el usuario, con los ajustes visuales incluidos. La Spec 03 está terminada y aprobada. La Spec 04 está terminada y aprobada por el usuario. La Spec 05 tiene el plan preparado y su implementación queda para una sesión nueva.
- El usuario maneja los commits, las ramas y el push. No hacer commits, push ni crear ramas por cuenta propia. Al iniciar cada sesión, comprobar `git status` y `git branch --show-current`; si hay cambios sin commitear o la rama no es la esperada, preguntar antes de tocar código.
- Al cierre de esta sesión de planificación, la aprobación de la Spec 04 y estas actualizaciones de documentación quedaron sin commitear en la rama `fourth-Spec`. El usuario debe commitear los cambios y crear una rama nueva antes de implementar la Spec 05.
- `src/game/scenes/Game.ts` muestra la grilla de 17 × 13, el escenario generado, el ladrón, el HUD, el reinicio con `R` y la navegación con `N`; `src/game/grid.ts` contiene la grilla y el mapa activo; `src/game/scenario.ts` genera y valida escenarios; `src/game/pathfinding.ts` y `src/game/navigation.ts` contienen las búsquedas y el suavizado.
- La Spec 02 dejó el HUD con un badge verde para el algoritmo activo, la ruta recortándose al avanzar y desapareciendo al llegar, y los controles `1`/`2`/`3`, `P` y `R`.
- Verificación de la Spec 02: `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron; la prueba CDP en Chrome headless no mostró errores; BFS y A* dieron caminos mínimos, DFS caminos válidos; se comprobaron clics inválidos, `P`, `R`, cancelación en movimiento y llegada.
- No se creó la carpeta `specs/`; el documento acordado es `Specs.MD` en la raíz.

## Última spec implementada: Spec 04 — Escenarios variables

**Estado:** implementada, verificada y aprobada por el usuario.

**Qué se hizo:**

- Se refactorizó `src/game/grid.ts` con `setActiveMap(map)` y `getActiveMap()`; `isWalkable` consulta el mapa activo y `TEST_MAP` queda como referencia.
- Se creó `src/game/scenario.ts` con `Scenario`, `generateScenario({ guardCount })` y validación independiente por inundación (puerta cerrada/abierta), límites de intentos y fallback determinístico.
- La generación crea una barrera vertical u horizontal con escalones de 1 celda y una única puerta marcada en `scenario.door` pero bloqueada en el mapa (`#`), con paredes decorativas aleatorias.
- Garantiza lado A (inicio/llave) y lado B (salida y al menos un tesoro) alcanzables según la validación; tesoros 2 o 3, escondites 1 o 2 válidos, guardias 1 o 2 lejos del inicio, sin superposiciones.
- `Game.ts` genera un escenario en `create()`, lo activa en el mapa, dibuja elementos con formas/colores y letras (`L`, `P`, `T`, `S`, `E`, `G`) en orden grilla → elementos → ruta → ladrón → HUD.
- `R` ahora es "nueva partida" y regenera el escenario conservando la cantidad de guardias elegida. Se agregó un botón HUD arriba a la derecha `Guardias: 1/2` que alterna y reinicia; los clics con `pointer.y < GRID_Y` se ignoran para no mover con el HUD.
- Al hacer clic en la puerta se muestra "La puerta está cerrada" sin abrirla; el movimiento sigue usando el mapa generado con BFS/DFS/A* y navegación por celdas/suavizada.

**Verificación realizada:**

- Prueba programática con esbuild + Node sobre 600 escenarios (300 con 1 guardia, 300 con 2): todos pasaron `validateScenario`, mapas/layouts únicos, tesoros 2/3, escondites 1/2 y rangos variables de paredes.
- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Prueba CDP con Chrome headless sobre `npm run dev-nolog`: inicio con 1 guardia, 2 tesoros, 2 escondites; clic en la puerta rechazado con "La puerta está cerrada" sin mover al ladrón; clic válido movió al ladrón al destino; `R` generó mapa distinto conservando 1 guardia; botón de guardias alternó a 2 y regeneró el escenario; `R` conservó 2 guardias; sin errores de consola.

## Próximo paso: Spec 05 — Interacción y victoria

**Estado:** planificación preparada y autorizada; implementación pendiente para una sesión nueva. No implementar sin leer antes `Specs.MD` (Spec 05), las secciones 2, 4, 5 y 6 de `GDD.MD` y esta guía.

**Objetivo:** implementar la recolección de llave y tesoros, la apertura de la puerta, la salida y la condición de victoria.

**Antes de empezar:**

1. Comprobar `git status` y `git branch --show-current`; preguntar si hay cambios sin commitear o la rama no es la esperada. La Spec 04 debe estar commiteada y la sesión debe correr en una rama nueva.
2. Confirmar que el usuario pidió implementar la Spec 05 en esa sesión.
3. Mantener el alcance: percepción, FSM, guardias y derrota quedan para las specs 06 y 07.
4. No agregar dependencias nuevas.

**Plan preparado:**

1. Estado de interacción en `Game.ts`: `hasKey`, cantidad de tesoros recogidos, `doorOpen` y `gameWon`. Reiniciar todo en `init()` y en cada “nueva partida”.
2. Resolver interacciones al completar **cada celda del recorrido**, no solo al llegar a un waypoint: la navegación suavizada saltea celdas. Llevar un índice sobre `currentPath` y procesar el tramo recorrido entre el waypoint anterior y el actual.
3. Llave: recogerla automáticamente al pisar su celda, ocultar su marcador, actualizar el HUD y mostrar un mensaje breve.
4. Tesoros: recogerlos automáticamente, ocultar cada marcador, incrementar el contador y actualizar el HUD. Los tesoros extra no modifican la victoria.
5. Puerta:
   - sin llave, rechazar el movimiento y mostrar “La puerta está cerrada.”;
   - con llave, abrirla automáticamente al hacer clic: reemplazar `#` por piso en `scenario.map`, llamar a `setActiveMap()`, marcar `doorOpen = true`, actualizar el marcador y el HUD;
   - permitir el paso después de abrirla y mantenerla abierta durante el resto de la partida.
6. Salida:
   - con 0 tesoros, mostrar un aviso y no terminar la partida;
   - con 1 o más, detener el movimiento, marcar `gameWon`, mostrar un mensaje de victoria persistente e ignorar clics de movimiento hasta `R`.
7. HUD: agregar estado de llave, estado de puerta y tesoros recogidos / total, sin superponerse a la grilla (`y < GRID_Y`). Mantener visibles algoritmo, navegación y botón de guardias.
8. No modificar la generación salvo que aparezca un bug; su validación ya simula la puerta abierta. Tampoco modificar BFS, DFS, A* ni el suavizado.

**Cuidados de implementación:**

- La puerta está en `scenario.door` y como `#` en `scenario.map`; al abrirla hay que actualizar también el mapa activo de `grid.ts`.
- En navegación suavizada, un tramo puede saltear la celda de la llave, un tesoro o la salida; por eso la resolución debe usar las celdas de `currentPath`.
- Al ganar hay que detener el tween y limpiar la ruta para que el ladrón no siga moviéndose.
- Ocultar o actualizar los marcadores de llave, tesoros y puerta cuando cambie su estado.
- Mantener `R` como nueva partida y el botón de guardias existente; el estado de interacción no debe filtrarse entre partidas.
- Mantener los mensajes y la documentación en español.
- No implementar todavía detección, persecución ni derrota.

**Verificación esperada:**

1. `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog`.
2. Prueba CDP con Chrome headless y exposición temporal de la escena (eliminarla al terminar):
   - clic en la puerta sin llave: rechazo, HUD “cerrada” y ladrón sin moverse;
   - recorrido hasta la llave: se recoge, desaparece el marcador y el HUD la indica;
   - clic en la puerta con llave: se abre, HUD “abierta” y permite cruzar;
   - salida sin tesoros: no hay victoria y aparece el aviso;
   - recoger un tesoro y llegar a la salida: victoria, movimiento detenido y clics ignorados;
   - `R`: nueva partida con llave no, puerta cerrada, tesoros en 0 y HUD actualizado;
   - repetir la recolección con navegación suavizada para comprobar celdas intermedias;
   - sin errores de consola.
3. Actualizar `Specs.MD` y este archivo al terminar. No commitear sin pedido explícito.

**Archivos previstos:** `src/game/scenes/Game.ts` y, si hace falta, `src/game/scenario.ts` o `src/game/grid.ts`, más `Specs.MD` y `AGENTS.md`.

**Entorno preparado:** solo se actualizaron `Specs.MD` y este archivo; no se modificó código de la Spec 05.

## Reglas de trabajo

- Implementar una spec por vez.
- No avanzar si la anterior no fue verificada y aprobada.
- No agregar funcionalidades fuera de la spec activa.
- No instalar dependencias nuevas sin pedir permiso.
- No hacer commits, push ni publicar nada sin pedido explícito.
- No afirmar que algo funciona sin haberlo comprobado.
- Si un cambio altera el alcance, actualizar `GDD.MD` y `Specs.MD` antes de programar.
- Mantener la documentación y los mensajes del juego en español.
- Priorizar claridad y bajo alcance sobre sistemas adicionales.

## Comandos disponibles

```bash
npm install
npm run dev
npm run build
```

También existen `npm run dev-nolog` y `npm run build-nolog` para evitar el envío de datos del template.

El servidor de desarrollo usa `http://localhost:8080` por defecto.

En este equipo `npm.ps1` está bloqueado por la política de ejecución de PowerShell. Usar `npm.cmd run ...` (por ejemplo, `npm.cmd run dev-nolog` o `npm.cmd run build-nolog`).

Si la consola del navegador muestra un error de `content-script-start.js` o `Could not establish connection`, proviene de una extensión del navegador y no del proyecto. En Chrome headless con perfil limpio no aparece.

## Restricciones del TP

- Al menos 2 algoritmos de búsqueda seleccionables: BFS, DFS y A*.
- Al menos 2 alternativas de navegación seleccionables: por celdas y suavizada.
- Al menos un NPC con percepción, objetivos y comportamiento.
- Comportamiento organizado con FSM.
- Escenarios variables que cambien recorridos, no solo la apariencia.
- Escenarios jugables y completables.
- Alternativas observables y seleccionables jugando.
- Sin MCP, modelos de lenguaje dentro del juego, servicios pagos ni métricas obligatorias.
- Repositorio público con prototipo, instrucciones, README, GDD breve, specs y presentación.

## Detalles importantes del diseño

- Grilla de 17 × 13 celdas en una sola pantalla.
- El jugador mueve al ladrón con clic en una celda alcanzable.
- Victoria: al menos 1 tesoro y llegar a la salida.
- Derrota: un guardia alcanza al ladrón.
- 1 llave, 1 puerta, 2 o 3 tesoros, 1 salida, 1 o 2 escondites y 1 o 2 guardias.
- Guardia con visión de 5 celdas y 90°, oído de 6 celdas y última posición conocida.
- Ruido al abrir la puerta y al recoger un tesoro.
- FSM del guardia: `PATRULLA`, `INVESTIGAR`, `PERSEGUIR`.
- FSM del ladrón: `REPOSO`, `MOVIENDO`, `OCULTO`, `ATRAPADO`.
- Los guardias pueden cruzar puertas cerradas para no quedar trabados.

## Limitaciones esperadas

- Sin arte, audio, animaciones ni sprites externos.
- Sin puntaje, semillas, guardado, progresión ni comparación de métricas.
- Sin propagación realista del sonido.
- Sin menús complejos ni versión móvil.
- Las ideas recortadas están registradas en la sección “Posibles mejoras/cambios” de `GDD.MD`.
