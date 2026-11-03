# Guía para futuras sesiones

## Estado actual del proyecto

- TP Final Integrador de PIAPC, individual.
- Motor: Phaser 4.2.1 con Vite y TypeScript. El template original fue reemplazado por la escena de grilla de la Spec 01.
- `GDD.MD` está aprobado y es la fuente de verdad del diseño.
- `Specs.MD` contiene las 9 specs ordenadas y sus criterios de verificación. La Spec 01 está terminada y aprobada. La Spec 02 está terminada y aprobada por el usuario, con los ajustes visuales incluidos. La Spec 03 está terminada y aprobada. La Spec 04 está terminada y aprobada por el usuario. La Spec 05 está terminada y aprobada por el usuario. La Spec 06 está terminada y aprobada por el usuario. La Spec 07 está terminada y aprobada por el usuario. La Spec 08 está planificada y pendiente de implementación.
- El usuario maneja los commits, las ramas y el push. No hacer commits, push ni crear ramas por cuenta propia. Al iniciar cada sesión, comprobar `git status` y `git branch --show-current`; si hay cambios sin commitear o la rama no es la esperada, preguntar antes de tocar código.
- La Spec 07 quedó commiteada en `87bb3a5` (rama `seventh-Spec`) y aprobada. La sesión de la Spec 08 empieza en la rama `eighth-Spec`, con el árbol limpio.
- `src/game/scenes/Game.ts` muestra la grilla de 17 × 13, el escenario generado, el ladrón, los guardias, el HUD, el reinicio con `R` y la navegación con `N`; `src/game/grid.ts` contiene la grilla y el mapa activo; `src/game/scenario.ts` genera y valida escenarios; `src/game/pathfinding.ts` (incluye `findGuardPath`, que trata la puerta cerrada como transitable) y `src/game/navigation.ts` contienen las búsquedas y el suavizado; `src/game/perception.ts` contiene la percepción pura del guardia; `src/game/guard.ts` contiene la FSM pura del guardia.
- La Spec 02 dejó el HUD con un badge verde para el algoritmo activo, la ruta recortándose al avanzar y desapareciendo al llegar, y los controles `1`/`2`/`3`, `P` y `R`.
- Verificación de la Spec 02: `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron; la prueba CDP en Chrome headless no mostró errores; BFS y A* dieron caminos mínimos, DFS caminos válidos; se comprobaron clics inválidos, `P`, `R`, cancelación en movimiento y llegada.
- No se creó la carpeta `specs/`; el documento acordado es `Specs.MD` en la raíz.

## Última spec implementada: Spec 06 — Percepción

**Estado:** implementada, verificada, aprobada por el usuario y commiteada en `cf990d9`.

**Qué se hizo:**

- Nuevo `src/game/perception.ts` con lógica pura y sin Phaser: constantes `VISION_RANGE = 5`, `VISION_HALF_ANGLE = 45`, `HEARING_RANGE = 6`; tipos `GuardPerception`, `NoiseEvent` y `Direction`; helpers de orientación inicial, distancia, ángulo, cono, línea de visión, visión efectiva, audición y ruido reciente.
- `Game.ts` crea una percepción por guardia desde `scenario.guards`, reiniciada en `init()` y en cada nueva partida. La orientación es provisional y determinística: mira hacia el inicio del ladrón por el eje de mayor diferencia; el guardia no se mueve ni rota.
- La visión usa distancia euclidiana y ±45°, y reutiliza `hasLineOfSight` de `navigation.ts` sobre el mapa activo. Las paredes y la puerta cerrada bloquean; la puerta abierta deja ver; los escondites anulan la visión. Al ver, se guarda `lastKnownPosition`; al perder de vista, se conserva.
- El oído registra ruidos de puerta y tesoro a 6 celdas o menos, sin bloqueo por paredes, en `lastNoise`; no pisa `lastKnownPosition`.
- La percepción se recalcula al crear la escena, al abrir la puerta, al emitir ruido, al cambiar de celda durante el recorrido (incluido `onUpdate` del tween en suavizada) y al cancelar un movimiento.
- Visualización de depuración: cono de 5 celdas y 90°, círculo de oído de 6 celdas, línea guardia → ladrón al ver, marca de última posición conocida, aviso temporal de ruido, anillo resaltado en el guardia y badge `Detección: no / vista / ruido` en la franja superior.
- No se modificaron `scenario.ts`, BFS/DFS/A*, el suavizado, la generación ni las reglas de victoria.

**Verificación realizada:**

- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Prueba programática con esbuild + Node sobre `perception.ts` (21 casos): cono, borde de 45°, fuera de ángulo/alcance, pared, puerta cerrada/abierta, escondite, ruido dentro/fuera y sin bloqueo por paredes, conservación de última posición, ruido que no pisa la memoria visual y orientación inicial.
- Prueba CDP con Chrome headless sobre `npm run dev-nolog` con exposición temporal de la escena (retirada al terminar), 32 comprobaciones: detección y badge `vista`; pérdida de visión conservando la última posición; escondite dentro del cono con contraprueba; puerta cerrada/abierta; ruido, badge `ruido` y aviso temporal; `R` reinició percepciones, ruidos, llave y puerta; sin errores de consola ni excepciones.

## Última spec implementada: Spec 07 — FSM del guardia y derrota

**Estado:** implementada, verificada, aprobada por el usuario y commiteada en `87bb3a5`.

**Qué se hizo:**

- Nuevo `src/game/guard.ts` (sin Phaser): `GuardState` (`PATRULLA`, `INVESTIGAR`, `PERSEGUIR`), `GuardAgent`, `createGuardAgent`, `choosePatrolDestination` (aleatorio con `random` inyectable, excluye la celda actual) y `updateGuardAgent`, que devuelve `moverse`, `observar` o `idle`. `GUARD_OBSERVE_MS = 2000`.
- Prioridades de `updateGuardAgent`: ver al ladrón → `PERSEGUIR` (ruido recibido en ese momento queda atendido sin cambiar de estado); al perderlo → `INVESTIGAR` en `lastKnownPosition`; ruido nuevo → `INVESTIGAR` en el origen; al llegar a investigar, observa 2 s y vuelve a `PATRULLA`; en `PATRULLA` elige un destino al azar al llegar.
- `src/game/pathfinding.ts`: `findPathWithPassable` con predicado; `findPath` del ladrón sin cambios; `findGuardPath` trata la puerta como transitable.
- `src/game/perception.ts`: `GuardPerception.cell` pasa a ser mutable para registrar el avance del guardia.
- `Game.ts`: `guardAgents` reemplaza a `guardPerceptions`; `update()` avanza la FSM de cada guardia; movimiento con tweens por waypoints (velocidad 4 celdas/s, algoritmo y navegación activos); la orientación sigue el eje dominante del tramo; celdas de patrulla calculadas una vez por escenario con la puerta transitable; derrota (`gameLost`) si un guardia comparte celda con el ladrón, con mensaje rojo persistente y clics ignorados hasta `R`; badge `Guardias: P · I · PE` en la franja superior derecha.
- Victoria también detiene a los guardias.

**Verificación realizada:**

- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Prueba programática con esbuild + Node (63 casos): transiciones, observación y timeout, ruido atendido una sola vez, ruido durante persecución, destino de patrulla distinto del actual, puerta cerrada transitable para guardias y bloqueada para el ladrón (BFS, DFS y A*).
- Prueba CDP con Chrome headless (38 comprobaciones, repetida tres veces con escenarios aleatorios): patrulla y cambio de destino, ruido → `INVESTIGAR`, observación y timeout, visión → `PERSEGUIR`, pérdida de visión → `INVESTIGAR`, derrota, `R` reinicia, 2 guardias, A* con suavizada, sin excepciones ni errores de consola. Exposición temporal de la escena retirada al terminar.
- Se corrigieron dos fallos durante la verificación: tweens detenidos dentro de su propio callback (Phaser dejaba de actualizar todos los tweens) y cancelaciones diferidas que detenían tweens nuevos.

**Notas para la próxima sesión:**

- Un ladrón inmóvil dentro del cono de un guardia termina derrotado; es el comportamiento esperado.
- Guardia más lento que el ladrón (4 vs 5 celdas/s): la persecución puede no alcanzar a un ladrón en movimiento.
- Pendiente de la spec 08: ajustar textos y estilo del HUD para el estado de los guardias.

## Próximo paso: Spec 08 — UI final y pulido

**Estado:** planificada, pendiente de implementación en una sesión nueva. No implementar sin leer antes `Specs.MD` (Spec 08, incluido "Enfoque preparado"), la sección 9 de `GDD.MD` y esta guía.

**Objetivo:** HUD completo y legible, selectores y botones usables con mouse y teclado, mensajes breves, paleta distinguible y build de producción sin errores.

**Decisiones abiertas que hay que confirmar con el usuario antes de programar:**

1. Persistir algoritmo, navegación, cantidad de guardias y visibilidad de la ruta entre partidas (recomendado: sí).
2. Mantener visibles el cono y la zona de audición de los guardias durante el juego (recomendado: sí).
3. Verificar el build con `npm run build-nolog` y pedir autorización para `npm run build`, porque `log.js` envía una petición externa.

**Antes de empezar:**

1. Comprobar `git status` y `git branch --show-current`; se espera la rama `eighth-Spec` con árbol limpio.
2. Confirmar que el usuario pidió implementar la Spec 08 en esa sesión.
3. Reutilizar las funciones existentes (`setAlgorithm`, `toggleNavigation`, `toggleRoute`, `scene.restart`) para que los botones y las teclas compartan el mismo camino; no duplicar lógica.
4. No tocar la lógica de búsqueda, percepción ni FSM salvo lo necesario para la UI.
5. No agregar dependencias nuevas.

**Notas de entorno para las pruebas (aprendidas en la Spec 07):**

- `npm run dev-nolog` puede usar 8080 u 8081 si el puerto está ocupado; comprobar cuál responde antes de abrir Chrome.
- Lanzar el servidor desde `cmd.exe /c npm.cmd run dev-nolog` con `-WindowStyle Hidden`, esperar a que responda y detenerlo al terminar.
- Chrome headless con `--remote-debugging-port=9222` y perfil temporal. Para cerrarlo, usar solo el PID lanzado; no ejecutar `taskkill /IM chrome.exe`, porque cierra también el navegador personal.
- Esperar a que el servidor responda antes de navegar la pestaña; si no, la página queda en `ERR_CONNECTION_REFUSED`.
- Las pruebas que dependen de un escenario aleatorio deben colocar al ladrón lejos de los guardias antes de medir patrulla, y no acelerar el tiempo si el ladrón está inmóvil dentro de un cono.
- Los scripts temporales (`spec*-test.ts`, `spec*-cdp.mjs`, `check-page.mjs`) y la exposición `window.__gameScene` deben retirarse antes de cerrar.

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
