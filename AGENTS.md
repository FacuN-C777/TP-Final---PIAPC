# Guía para futuras sesiones

## Estado actual del proyecto

- TP Final Integrador de PIAPC, individual.
- Motor: Phaser 4 con Vite y TypeScript. El repositorio todavía contiene el template original.
- `GDD.MD` está aprobado y es la fuente de verdad del diseño.
- `Specs.MD` contiene las 9 specs ordenadas y sus criterios de verificación. Todavía no hay specs implementadas.
- `src/game/scenes/Game.ts` sigue mostrando la pantalla de bienvenida del template. No hay código de juego.
- No se creó la carpeta `specs/`; el documento acordado es `Specs.MD` en la raíz.

## Próximo paso

Empezar por la **Spec 01 — Grilla y escena**. Antes de modificar archivos:

1. Leer `GDD.MD` y `Specs.MD`.
2. Proponer un plan corto para la Spec 01.
3. Esperar aprobación explícita del usuario.
4. Implementar solo esa spec.
5. Verificar y explicar cómo probarla jugando.
6. Esperar aprobación antes de pasar a la Spec 02.

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
