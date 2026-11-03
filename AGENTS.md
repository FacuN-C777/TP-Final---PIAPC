# Guía para futuras sesiones

## Estado actual del proyecto

- TP Final Integrador de PIAPC, individual.
- Motor: Phaser 4.2.1 con Vite y TypeScript. El template original fue reemplazado por la escena de grilla de la Spec 01.
- `GDD.MD` está aprobado y es la fuente de verdad del diseño.
- `Specs.MD` contiene las 9 specs ordenadas y sus criterios de verificación. Las specs 01 a 08 están terminadas y aprobadas por el usuario. La Spec 09 está implementada y pendiente de aprobación.
- El usuario maneja los commits, las ramas y el push. No hacer commits, push ni crear ramas por cuenta propia. Al iniciar cada sesión, comprobar `git status` y `git branch --show-current`; si hay cambios sin commitear o la rama no es la esperada, preguntar antes de tocar código.
- La Spec 08 quedó commiteada en `30ba22b` (rama `eighth-Spec`). La sesión de la Spec 09 trabaja en la rama `ninth-Spec`.
- `src/game/scenes/Game.ts` contiene la escena completa: grilla de 17 × 13, escenario generado, ladrón, guardias, HUD en tres filas con selectores y botones, leyenda inferior, reinicio con `R` y navegación con `N`. `src/game/grid.ts` contiene la grilla y el mapa activo; `src/game/scenario.ts` genera y valida escenarios; `src/game/pathfinding.ts` (incluye `findGuardPath`, que trata la puerta cerrada como transitable) y `src/game/navigation.ts` contienen las búsquedas y el suavizado; `src/game/perception.ts` contiene la percepción pura del guardia; `src/game/guard.ts` contiene la FSM pura del guardia.
- No se creó la carpeta `specs/`; el documento acordado es `Specs.MD` en la raíz.

## Última spec implementada: Spec 08 — UI final y pulido

**Estado:** implementada, verificada, aprobada por el usuario y commiteada en `30ba22b`.

**Qué se hizo:**

- HUD en tres filas dentro de la franja superior (`y < 96`), con medidas comprobadas. Fila 1: estado de partida (`En juego`, `Victoria`, `Derrota`), detección y estado de cada guardia con nombre completo (`Patrulla`, `Investiga`, `Persigue`) y color. Fila 2: llave, puerta, selector de búsqueda (BFS (1), DFS (2), A* (3)) y botones de guardias 1/2. Fila 3: tesoros, selector de navegación (Por celdas, Suavizada) y botones de ruta (P) y nueva partida (R).
- Los selectores y botones llaman a las mismas funciones que las teclas (`setAlgorithm`, `setNavigationMode`, `toggleRoute`, `setGuardCount`, `startNewGame`).
- `init()` ya no reinicia algoritmo, navegación, guardias ni ruta visible; se conservan entre partidas.
- Leyenda inferior de una línea (y=734) y mensaje en una fila aparte (y=758). `GRID_Y` sigue en 96.
- Paleta: el ladrón es turquesa, la ruta blanca, el cono gris azulado y la última posición conocida rosa. Llave, puerta, tesoro, salida, escondite y guardia mantienen sus colores.
- Cono y audición visibles durante el juego, con textos de juego y recortados a la grilla con una máscara.
- Las selecciones no cambian la lógica de búsqueda, percepción ni FSM.

**Verificación realizada:**

- `npx.cmd tsc --noEmit`, `npm.cmd run build-nolog` y `npm.cmd run build` pasaron. `npm run build` se ejecutó con autorización explícita del usuario.
- Prueba CDP con clics reales en Chrome headless: 33 comprobaciones de HUD, selectores, botones, teclas, persistencia y clic en pared; 15 comprobaciones de partidas completas (victorias con A* suavizada y DFS suavizada; derrotas con A* por celdas, BFS suavizada con ruta oculta y DFS por celdas).
- Solapamientos medidos en todos los estados: 0. Consola sin errores ni excepciones.
- La escena temporal `window.__gameScene` se retiró antes de cerrar.

## Última spec implementada: Spec 09 — README y presentación

**Estado:** implementada, pendiente de aprobación del usuario. Sin commitear en la sesión.

**Decisiones confirmadas por el usuario:** presentación en Markdown en el repo; `Template-README.md` eliminado; `screenshot.png` reemplazado por una captura del juego; `public/favicon.png`, `public/assets/logo.png` y `public/assets/bg.png` eliminados (enlace al favicon quitado de `index.html`); `public/style.css` y `LICENSE` se mantienen; `package.json` y `package-lock.json` con `name` "asecho-nocturno" y descripción del TP.

**Qué se hizo:**

- `README.md` reescrito en español (instalación, scripts, controles, estructura, enlaces, estado de specs, limitaciones y nota sobre `log.js`).
- `PRESENTACION.md` nuevo, con el guion de la presentación, la Spec 07 como spec concreta y la demo.
- `log.js` sin cambios.

**Verificación realizada:**

- Copia limpia en `%TEMP%\opencode\clean-check` (solo archivos versionados o no ignorados): `npm install` sin errores, `tsc --noEmit` y `build-nolog` pasaron, `npm run dev-nolog` respondió 200 con el título del juego.
- Captura de `screenshot.png` tomada del juego con CDP.
- `npm run build` no se ejecutó en esta spec: la autorización de la Spec 08 era solo para esa spec.

**Pendientes:**

- Cambio de alcance: el juego se juega desde el navegador en un despliegue de Vercel (GDD sección 12 y Spec 09 actualizadas). Crear el proyecto en Vercel (Build Command `npm run build-nolog`, Output Directory `dist`) y reemplazar `ENLACE_PENDIENTE_VERCEL` en `README.md` y `PRESENTACION.md`. Hasta entonces el marcador sigue en la documentación. No se creó `vercel.json` ni ningún archivo de configuración de Vercel.
- Repetir el clon limpio desde git tras el commit del usuario.
- `package.json` conserva `repository`, `bugs`, `homepage` y `author` del template de Phaser. Pendiente de decisión.
- Limitaciones propias de la presentación: completar la sección 12 de `PRESENTACION.md` durante la exposición.

**Antes de empezar la próxima sesión:**

1. Comprobar `git status` y `git branch --show-current`.
2. Si la Spec 09 fue aprobada, cerrar la sesión; si hay cambios, preguntar antes de tocar código.

## Historial de specs

### Spec 07 — FSM del guardia y derrota

**Estado:** implementada, verificada, aprobada por el usuario y commiteada en `87bb3a5`.

- Nuevo `src/game/guard.ts` (sin Phaser): `GuardState` (`PATRULLA`, `INVESTIGAR`, `PERSEGUIR`), `GuardAgent`, `createGuardAgent`, `choosePatrolDestination` (aleatorio con `random` inyectable, excluye la celda actual) y `updateGuardAgent`, que devuelve `moverse`, `observar` o `idle`. `GUARD_OBSERVE_MS = 2000`.
- Prioridades de `updateGuardAgent`: ver al ladrón → `PERSEGUIR` (ruido recibido en ese momento queda atendido sin cambiar de estado); al perderlo → `INVESTIGAR` en `lastKnownPosition`; ruido nuevo → `INVESTIGAR` en el origen; al llegar a investigar, observa 2 s y vuelve a `PATRULLA`; en `PATRULLA` elige un destino al azar al llegar.
- `src/game/pathfinding.ts`: `findPathWithPassable` con predicado; `findPath` del ladrón sin cambios; `findGuardPath` trata la puerta como transitable.
- `src/game/perception.ts`: `GuardPerception.cell` es mutable para registrar el avance del guardia.
- `Game.ts`: `guardAgents` reemplaza a `guardPerceptions`; movimiento con tweens por waypoints (4 celdas/s); derrota (`gameLost`) si un guardia comparte celda con el ladrón.
- Notas: un ladrón inmóvil dentro del cono de un guardia termina derrotado (esperado); un guardia más lento que el ladrón (4 vs 5 celdas/s) puede no alcanzar a un ladrón en movimiento.

### Spec 06 — Percepción

**Estado:** implementada, verificada, aprobada por el usuario y commiteada en `cf990d9`.

- Nuevo `src/game/perception.ts` con lógica pura: `VISION_RANGE = 5`, `VISION_HALF_ANGLE = 45`, `HEARING_RANGE = 6`; tipos `GuardPerception`, `NoiseEvent` y `Direction`; helpers de orientación, distancia, ángulo, cono, línea de visión, visión efectiva, audición y ruido reciente.
- La visión usa distancia euclidiana y ±45°, y reutiliza `hasLineOfSight` de `navigation.ts`. Las paredes y la puerta cerrada bloquean; la puerta abierta deja ver; los escondites anulan la visión. Al ver, se guarda `lastKnownPosition`; al perder de vista, se conserva.
- El oído registra ruidos de puerta y tesoro a 6 celdas o menos, sin bloqueo por paredes, en `lastNoise`; no pisa `lastKnownPosition`.
- Orientación inicial provisional y determinística: mira hacia el inicio del ladrón por el eje de mayor diferencia.

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

`npm run dev` y `npm run build` ejecutan `log.js`, que hace una petición a `gryzor.co`. Para verificaciones se usan las variantes `-nolog`; `npm run build` solo con autorización explícita del usuario.

El servidor de desarrollo usa `http://localhost:8080` por defecto.

En este equipo `npm.ps1` está bloqueado por la política de ejecución de PowerShell. Usar `npm.cmd run ...` (por ejemplo, `npm.cmd run dev-nolog` o `npm.cmd run build-nolog`).

Si la consola del navegador muestra un error de `content-script-start.js` o `Could not establish connection`, proviene de una extensión del navegador y no del proyecto. En Chrome headless con perfil limpio no aparece.

## Notas de entorno para las pruebas

- `rg` (ripgrep) no está instalado en este equipo; para buscar en el código usar la herramienta Grep o `Select-String`.
- `npm run dev-nolog` puede usar 8080 u 8081 si el puerto está ocupado; comprobar cuál responde antes de abrir Chrome.
- Lanzar el servidor con `Start-Process cmd.exe -ArgumentList "/c npm.cmd run dev-nolog" -WindowStyle Hidden -PassThru`, guardar el PID, esperar a que responda y detenerlo al terminar.
- Chrome headless con `--remote-debugging-port=9222` y perfil temporal en la carpeta temporal del sistema. Para cerrarlo, usar solo el PID lanzado; no ejecutar `taskkill /IM chrome.exe`, porque cierra también el navegador personal.
- Esperar a que el servidor responda antes de navegar la pestaña; si no, la página queda en `ERR_CONNECTION_REFUSED`.
- Las pruebas que dependen de un escenario aleatorio pueden necesitar reintentos: un guardia puede atrapar al ladrón antes de llegar a la salida.
- Los scripts temporales de prueba viven fuera del repo, en la carpeta temporal. Si se usa `window.__gameScene` para inspeccionar la escena, debe retirarse antes de cerrar.

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
- FSM del ladrón: `REPOSO`, `MOVIENDO`, `OCULTO`, `ATRAPADO` (descrita en el GDD; fuera de alcance de la Spec 08; pendiente de decisión).
- Los guardias pueden cruzar puertas cerradas para no quedar trabados.

## Limitaciones esperadas

- Sin arte, audio, animaciones ni sprites externos.
- Sin puntaje, semillas, guardado, progresión ni comparación de métricas.
- Sin propagación realista del sonido.
- Sin menús complejos ni versión móvil.
- Las ideas recortadas están registradas en la sección “Posibles mejoras/cambios” de `GDD.MD`.
