# Guía para futuras sesiones

## Estado actual del proyecto

- TP Final Integrador de PIAPC, individual.
- Motor: Phaser 4.2.1 con Vite y TypeScript. El template original fue reemplazado por la escena de grilla de la Spec 01.
- `GDD.MD` está aprobado y es la fuente de verdad del diseño.
- `Specs.MD` contiene las 9 specs ordenadas y sus criterios de verificación. La Spec 01 está terminada y aprobada. La Spec 02 está terminada y aprobada por el usuario, con los ajustes visuales incluidos. La Spec 03 tiene el plan aprobado, pero todavía no está implementada.
- El usuario va a commitear la Spec 02 y crear una rama nueva antes de empezar la Spec 03. No hacer commits, push ni crear ramas por cuenta propia. Al iniciar la próxima sesión, comprobar `git status` y `git branch --show-current`; si hay cambios sin commitear o la rama no es la esperada, preguntar antes de tocar código.
- `src/game/scenes/Game.ts` muestra la grilla fija de 17 × 13, el ladrón, el HUD y el reinicio con `R`; `src/game/grid.ts` y `src/game/pathfinding.ts` contienen la grilla y las búsquedas BFS, DFS y A*.
- La Spec 02 dejó el HUD con un badge verde para el algoritmo activo, la ruta recortándose al avanzar y desapareciendo al llegar, y los controles `1`/`2`/`3`, `P` y `R`.
- Verificación de la Spec 02: `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog` pasaron; la prueba CDP en Chrome headless no mostró errores; BFS y A* dieron caminos mínimos, DFS caminos válidos; se comprobaron clics inválidos, `P`, `R`, cancelación en movimiento y llegada.
- No se creó la carpeta `specs/`; el documento acordado es `Specs.MD` en la raíz.

## Próximo paso: Spec 03 — Navegación

**Estado:** plan aprobado por el usuario; implementación pendiente. No implementar nada de la Spec 03 sin leer antes `Specs.MD` y la sección 8 de `GDD.MD`.

**Objetivo:** agregar dos modos de navegación seleccionables con `N`, “Por celdas” y “Suavizada”, usando el mismo camino calculado por BFS, DFS o A*.

**Plan aprobado:**

1. Agregar `navigationMode` con dos valores, `cells` y `smooth`, y reiniciarlo a `cells` en `init()`.
2. Mantener `findPath` sin cambios. La navegación solo transforma el camino de celdas en waypoints.
3. Crear `src/game/navigation.ts` (recomendado) con:
   - `NavigationMode = 'cells' | 'smooth'`.
   - `buildWaypoints(path, mode)`: en `cells` devuelve el camino completo; en `smooth` aplica string-pulling.
   - `hasLineOfSight(a, b)`: muestrea la línea entre centros de celda y rechaza el segmento si alguna muestra cae en una celda no transitable.
4. En `Game.ts`, mover al ladrón por waypoints y usar un índice de waypoint en lugar de mezclar índices de celdas. La duración de cada tramo debe ser proporcional a la distancia euclidiana: `distanciaEnCeldas * 1000 / MOVE_SPEED`, para que la velocidad total sea comparable entre modos.
5. `N` alterna el modo y actualiza el HUD. Si hay un recorrido activo, cancelar en la celda actual, recalcular el mismo destino con el mismo algoritmo y el nuevo modo. Si no hay recorrido, solo cambia el modo.
6. Mostrar el modo activo en el HUD. Se sugiere una segunda fila de label + badge alrededor de `y = 70` y mover los controles a `y = 88`, verificando que no se tape la grilla (`GRID_Y = 96`).
7. `drawRoute` debe usar los waypoints activos: en “Por celdas” se ve el recorrido por centros de celda; en “Suavizada”, segmentos rectos. Mantener `P` y el recorte/desaparición progresiva.
8. No modificar BFS, DFS, A*, el mapa ni el alcance de la Spec 03.

**Cuidados de implementación:**

- El suavizado nunca debe atravesar paredes. Muestrear con un paso menor o igual a `CELL_SIZE / 4` y ser conservador en esquinas y bordes.
- No usar una duración fija por waypoint: los tramos suavizados pueden abarcar varias celdas.
- Mantener separado el camino de búsqueda (`currentPath`) de los waypoints de movimiento (`waypoints`).
- Al cambiar `N` en movimiento, evitar saltos grandes: usar `getCurrentCell()` para cancelar y recalcular.
- Mantener la documentación y los mensajes del juego en español.
- No agregar dependencias nuevas.

**Verificación esperada:**

1. Elegir un destino con BFS en “Por celdas” y confirmar que pasa por el centro de cada celda.
2. Presionar `N`, repetir el mismo destino y comprobar que el recorrido se ve más recto y no cruza paredes.
3. Repetir con A* y DFS.
4. Confirmar que `N` no cambia el algoritmo activo.
5. Comparar la duración total de ambos modos para un mismo destino.
6. Probar `P`, `R`, clics inválidos, clic a mitad de recorrido y cambio de `N` durante el movimiento.
7. Ejecutar `npx.cmd tsc --noEmit` y `npm.cmd run build-nolog`; si sigue disponible la prueba CDP temporal, adaptarla y volver a correrla.
8. Al terminar, actualizar `Specs.MD` y este archivo. No commitear sin pedido explícito.

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
