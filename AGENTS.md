# Guía para futuras sesiones

## Estado actual del proyecto

- TP Final Integrador de PIAPC, individual.
- Motor: Phaser 4.2.1 con Vite y TypeScript. El template original fue reemplazado por la escena de grilla de la Spec 01.
- `GDD.MD` está aprobado y es la fuente de verdad del diseño.
- `Specs.MD` contiene las 9 specs ordenadas y sus criterios de verificación. La Spec 01 está terminada y aprobada. La Spec 02 está terminada y aprobada por el usuario, con los ajustes visuales incluidos. La Spec 03 está terminada y aprobada. La Spec 04 está terminada y aprobada por el usuario. La Spec 05 está implementada y verificada, pendiente de aprobación del usuario.
- El usuario maneja los commits, las ramas y el push. No hacer commits, push ni crear ramas por cuenta propia. Al iniciar cada sesión, comprobar `git status` y `git branch --show-current`; si hay cambios sin commitear o la rama no es la esperada, preguntar antes de tocar código.
- Al cierre de esta sesión, la implementación de la Spec 05 y estas actualizaciones de documentación quedaron sin commitear en la rama `fifth-Spec`. El usuario debe revisar, aprobar y commitear los cambios antes de implementar la Spec 06.
- `src/game/scenes/Game.ts` muestra la grilla de 17 × 13, el escenario generado, el ladrón, el HUD, el reinicio con `R` y la navegación con `N`; `src/game/grid.ts` contiene la grilla y el mapa activo; `src/game/scenario.ts` genera y valida escenarios; `src/game/pathfinding.ts` y `src/game/navigation.ts` contienen las búsquedas y el suavizado.
- La Spec 02 dejó el HUD con un badge verde para el algoritmo activo, la ruta recortándose al avanzar y desapareciendo al llegar, y los controles `1`/`2`/`3`, `P` y `R`.
- Verificación de la Spec 02: `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron; la prueba CDP en Chrome headless no mostró errores; BFS y A* dieron caminos mínimos, DFS caminos válidos; se comprobaron clics inválidos, `P`, `R`, cancelación en movimiento y llegada.
- No se creó la carpeta `specs/`; el documento acordado es `Specs.MD` en la raíz.

## Última spec implementada: Spec 05 — Interacción y victoria

**Estado:** implementada, verificada y pendiente de aprobación del usuario.

**Qué se hizo:**

- `Game.ts` ahora mantiene `hasKey`, `doorOpen`, `gameWon`, `treasuresCollected`, `collectedTreasures` y `pathIndex`, reiniciados en `init()` y en cada “nueva partida”.
- Las interacciones se resuelven al completar cada tramo de `currentPath` con `findPathIndex` y `resolveTraversedCells`, para no perder celdas intermedias en navegación suavizada.
- La llave y los tesoros se recogen automáticamente, se ocultan sus marcadores y se actualiza el HUD; los tesoros extra no cambian la victoria.
- La puerta sin llave rechaza el clic; con llave se abre al hacer clic en ella o al intentar cruzar, reemplazando `#` por `.` en `scenario.map`, llamando a `setActiveMap()` y cambiando el marcador a `A`.
- La salida sin tesoros solo muestra un aviso; con al menos uno marca `gameWon`, detiene el tween, limpia la ruta, muestra un mensaje persistente e ignora clics hasta `R`.
- El HUD suma badges de llave, puerta y tesoros (`recogidos / total`) en la franja superior, sin tapar la grilla.
- No se modificaron la generación, BFS, DFS, A* ni el suavizado.

**Verificación realizada:**

- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Prueba CDP con Chrome headless sobre `npm run dev-nolog` con exposición temporal de la escena (retirada al terminar): rechazo de puerta sin llave; recolección de llave con suavizada; apertura de puerta con `#` → `.`; aviso al tocar la salida sin tesoros; recolección de tesoro con HUD actualizado; victoria en la salida, ruta limpia y clics ignorados; `R` reinició llave, puerta, tesoros y marcadores; un waypoint posterior a la llave resolvió correctamente la celda intermedia; sin errores de consola.

## Próximo paso: Spec 06 — Percepción

**Estado:** pendiente. No implementar sin leer antes `Specs.MD` (Spec 06), las secciones 4, 5 y 6 de `GDD.MD` y esta guía.

**Objetivo:** implementar la percepción del guardia (visión en cono, línea de visión, oído por eventos y memoria de la última posición conocida) sin moverlo todavía.

**Antes de empezar:**

1. Comprobar `git status` y `git branch --show-current`; preguntar si hay cambios sin commitear o la rama no es la esperada. La Spec 05 debe estar aprobada y commiteada, y la sesión debe correr en una rama nueva.
2. Confirmar que el usuario pidió implementar la Spec 06.
3. Mantener el alcance: la FSM, patrulla, persecución y derrota quedan para la Spec 07.
4. No agregar dependencias nuevas.

**Puntos de partida:**

- Visión de 5 celdas de alcance y 90°, bloqueada por paredes; un escondite anula la visión.
- Oído de 6 celdas activado por la apertura de la puerta y la recolección de tesoros; los eventos ya ocurren en `Game.ts`.
- Al perder de vista al ladrón, conservar su última posición conocida.
- Mostrar una visualización de depuración del cono, el radio de oído, el estado de detección y la última posición conocida.
- No mover al guardia ni iniciar persecución completa en esta spec.

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
