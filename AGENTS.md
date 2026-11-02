# Guía para futuras sesiones

## Estado actual del proyecto

- TP Final Integrador de PIAPC, individual.
- Motor: Phaser 4.2.1 con Vite y TypeScript. El template original fue reemplazado por la escena de grilla de la Spec 01.
- `GDD.MD` está aprobado y es la fuente de verdad del diseño.
- `Specs.MD` contiene las 9 specs ordenadas y sus criterios de verificación. La Spec 01 está terminada y aprobada. La Spec 02 está terminada y aprobada por el usuario, con los ajustes visuales incluidos. La Spec 03 está terminada.
- El usuario maneja los commits, las ramas y el push. No hacer commits, push ni crear ramas por cuenta propia. Al iniciar cada sesión, comprobar `git status` y `git branch --show-current`; si hay cambios sin commitear o la rama no es la esperada, preguntar antes de tocar código.
- Al cierre de esta sesión, la Spec 03 y estas actualizaciones de documentación quedaron sin commitear en la rama `third-Spec`. El usuario tiene que commitear la Spec 03 y cambiar a una rama nueva antes de implementar la Spec 04.
- `src/game/scenes/Game.ts` muestra la grilla de 17 × 13, el ladrón, el HUD, el reinicio con `R` y la navegación con `N`; `src/game/grid.ts` y `src/game/pathfinding.ts` contienen la grilla y las búsquedas BFS, DFS y A*; `src/game/navigation.ts` contiene el suavizado de rutas.
- La Spec 02 dejó el HUD con un badge verde para el algoritmo activo, la ruta recortándose al avanzar y desapareciendo al llegar, y los controles `1`/`2`/`3`, `P` y `R`.
- Verificación de la Spec 02: `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron; la prueba CDP en Chrome headless no mostró errores; BFS y A* dieron caminos mínimos, DFS caminos válidos; se comprobaron clics inválidos, `P`, `R`, cancelación en movimiento y llegada.
- No se creó la carpeta `specs/`; el documento acordado es `Specs.MD` en la raíz.

## Última spec implementada: Spec 03 — Navegación

**Estado:** implementada y verificada localmente. Pendiente de aprobación del usuario.

**Qué se hizo:**

- Se creó `src/game/navigation.ts` con `NavigationMode = 'cells' | 'smooth'`, `buildWaypoints(path, mode)` y `hasLineOfSight(a, b)`.
- `hasLineOfSight` muestrea la línea entre centros de celda con paso `CELL_SIZE / 8` y, cuando el muestreo cruza en diagonal, exige que las dos celdas ortogonales también sean transitables para no cortar esquinas.
- `buildWaypoints` en `cells` devuelve el camino completo; en `smooth` aplica string-pulling desde el inicio hasta el waypoint más lejano con línea de visión.
- `Game.ts` ahora separa `currentPath` (resultado de la búsqueda) de `waypoints` (movimiento) y usa `waypointIndex`.
- Cada tramo dura `distanciaEnCeldas * 1000 / MOVE_SPEED`, así la velocidad total es comparable entre modos.
- `N` alterna el modo y actualiza el HUD; si el ladrón se está moviendo, se cancela en `getCurrentCell()`, se recalcula el mismo destino con el mismo algoritmo y se arranca con el nuevo modo.
- El HUD tiene una segunda fila label + badge azul para la navegación en `y = 70`; los controles se movieron a `y = 88` y la grilla sigue en `GRID_Y = 96`.
- `drawRoute` dibuja los waypoints activos, manteniendo `P` y el recorte/desaparición progresiva.

**Verificación realizada:**

- `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron.
- Se comprobó la lógica de `navigation.ts` con un bundle temporal de esbuild + Node: línea de visión entre celdas adyacentes y a lo largo de un pasillo abierto; rechazo de líneas que cruzan paredes; `cells` conserva todo el camino; `smooth` reduce waypoints, no repite celdas y todos sus tramos tienen línea de visión.
- Se repitió la prueba CDP con Chrome headless sobre `npm run dev-nolog` y pasó: inicio en `Por celdas`/BFS; clic válido; `N` a `Suavizada` sin cambiar el algoritmo y reduciendo waypoints; `3` a A*; `P`; clic en pared rechazado; `N` en movimiento recalculando en `Por celdas`; `R` reiniciando; llegada al centro del destino; duración de 2992 ms en celdas y 2835 ms en suavizada para el mismo destino; sin errores de consola.
- Para la prueba CDP se expuso temporalmente la escena en `window.__gameScene`; la línea se eliminó al terminar. Los scripts de prueba quedaron solo en la carpeta temporal, fuera del repo.

## Próximo paso: Spec 04 — Escenarios variables

**Estado:** plan aprobado por el usuario; implementación pendiente para una sesión nueva. No implementar sin leer antes `Specs.MD` (Spec 04), la sección 3 de `GDD.MD` y esta guía.

**Objetivo:** generar un escenario nuevo en cada partida con paredes, llave, puerta, 2 o 3 tesoros, salida, 1 o 2 escondites, puntos de inicio y 1 o 2 guardias, garantizando que sea estructuralmente completable.

**Antes de empezar:**

1. Comprobar `git status` y `git branch --show-current`; preguntar si hay cambios sin commitear o la rama no es la esperada. La Spec 03 debe estar commiteada y la sesión debe correr en la rama nueva.
2. Confirmar que el usuario mantiene aprobada la Spec 03.
3. Mantener el alcance: la Spec 04 genera y dibuja escenarios, pero las interacciones de llave, puerta y tesoros, la victoria, la percepción y la FSM quedan para las specs 05, 06 y 07.
4. No agregar dependencias nuevas.

**Plan aprobado:**

1. Refactor mínimo de `src/game/grid.ts`:
   - Agregar `setActiveMap(map)` y `getActiveMap()` con un mapa activo mutable.
   - `isWalkable(cell)` debe consultar el mapa activo en lugar de `TEST_MAP`.
   - Mantener `TEST_MAP` como mapa de referencia/fallback.
   - No modificar `pathfinding.ts` ni `navigation.ts`: ambos siguen usando `isWalkable`.
2. Crear `src/game/scenario.ts`:
   - Tipo `Scenario` con `map: string[]`, `start`, `key`, `door`, `treasures`, `exit`, `hidingSpots` y `guards`.
   - `generateScenario({ guardCount })`.
   - La puerta se marca en `scenario.door` pero queda como `#` en el mapa (bloqueada) hasta la Spec 05.
3. Generación:
   - Grilla 17 × 13 con borde de paredes.
   - Barrera divisoria vertical u horizontal, conectada a dos bordes, con escalones de a 1 celda y una única puerta.
   - Paredes decorativas aleatorias para variar recorridos.
   - Lado A: inicio y llave alcanzables sin cruzar la puerta.
   - Lado B: salida y al menos un tesoro alcanzables solo cruzando la puerta.
   - Tesoros totales 2 o 3; escondites 1 o 2 en celdas sin salida o laterales.
   - Guardias según la cantidad elegida, sin superponerse y lejos del inicio.
4. Validación independiente por inundación:
   - llave alcanzable desde el inicio con puerta cerrada;
   - salida no alcanzable con puerta cerrada;
   - salida y al menos un tesoro alcanzables con puerta abierta;
   - todos los elementos alcanzables y sin superposiciones;
   - guardia no pegado al inicio;
   - escondites válidos.
   - Si falla, descartar y regenerar hasta 200 intentos; dejar un fallback determinístico simple para no fallar nunca.
5. Integración en `Game.ts`:
   - `create()` genera el escenario, llama a `setActiveMap()` y dibuja paredes/piso desde `getActiveMap()`.
   - El ladrón inicia en `scenario.start`; clics, BFS, DFS, A* y navegación usan el mapa generado.
   - Dibujar elementos con formas/colores simples y letra identificatoria: `L` llave, `P` puerta, `T` tesoro, `S` salida, `E` escondite, `G` guardia.
   - Orden de profundidades: grilla → elementos → ruta → ladrón → HUD.
   - `R` pasa a ser “nueva partida”: regenera el escenario con la cantidad actual de guardias.
   - Clic en la puerta muestra “La puerta está cerrada”; no se implementa apertura.
6. HUD:
   - Botón simple arriba a la derecha: `Guardias: 1/2`.
   - Al hacer clic alterna la cantidad y regenera el escenario.
   - `guardCount` no se reinicia en `init()` para conservar la elección al reiniciar.
   - Ignorar clics en la zona del HUD (`pointer.y < GRID_Y`) para que el botón no dispare movimientos.
   - Actualizar los controles para que `R` diga “nueva partida”.

**Cuidados de implementación:**

- La puerta debe quedar bloqueada para el movimiento hasta la Spec 05, pero la validación de generación debe simular la puerta abierta.
- Validar con inundación propia del generador; no confiar solo en `findPath`, porque la puerta está cerrada en el mapa.
- Evitar superposiciones entre inicio, llave, puerta, tesoros, salida, escondites y guardias.
- La barrera debe separar realmente el lado A del lado B; si la validación falla, regenerar.
- No usar semillas, guardado ni comparación de métricas.
- Mantener la documentación y los mensajes del juego en español.

**Verificación esperada:**

1. Prueba programática del generador con esbuild + Node: cientos de escenarios con 1 y 2 guardias, comprobando todas las garantías y que mapas/posiciones varían.
2. Confirmar que cada mapa generado tiene exactamente 1 llave, 1 puerta, 2 o 3 tesoros, 1 salida, 1 o 2 escondites y la cantidad pedida de guardias.
3. `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog`.
4. Prueba CDP con Chrome headless y exposición temporal de la escena (eliminarla al terminar):
   - `R` cambia mapa y elementos;
   - el botón de guardias alterna 1↔2 y el escenario lo refleja;
   - movimiento válido sobre el mapa generado;
   - clic en puerta bloqueado;
   - HUD sin superponerse a la grilla;
   - sin errores de consola.
5. Actualizar `Specs.MD` y este archivo al terminar. No commitear sin pedido explícito.

**Archivos previstos:** `src/game/grid.ts`, `src/game/scenario.ts` (nuevo), `src/game/scenes/Game.ts`, `Specs.MD` y `AGENTS.md`.

**Entorno preparado:** no se creó código de la Spec 04 ni archivos de escenarios; solo quedó registrado este plan.

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
