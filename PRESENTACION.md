# Presentación — Asecho Nocturno

TP Final Integrador de PIAPC · Facundo Castillo · Prototipo individual en Phaser 4, Vite y TypeScript.

**Jugar en el navegador:** `ENLACE_PENDIENTE_VERCEL`

Duración orientativa: 10 minutos de exposición y 5 de demo.

---

## 1. Idea del juego (1 min)

- Sigilo en grilla de 17 × 13 celdas, en una sola pantalla.
- El ladrón consigue la llave, abre la puerta, toma al menos un tesoro y escapa por la salida.
- Hay 1 o 2 guardias que patrullan, investigan y persiguen.
- El jugador no usa WASD: hace clic en una celda y el ladrón recorre el camino calculado.
- Foco del TP: la IA (búsqueda, navegación, percepción y FSM) y los escenarios variables.

**Objetivo del jugador:** al menos 1 tesoro y la salida. **Objetivo del guardia:** patrullar, investigar y atrapar.

---

## 2. Búsqueda (2 min)

| Algoritmo | Tecla | Qué garantiza | Uso en el juego |
|---|---|---|---|
| BFS | `1` | Camino de menos pasos en grilla sin pesos | Referencia de camino mínimo |
| DFS | `2` | Camino válido, no necesariamente óptimo | Muestra rutas largas y distintas |
| A* | `3` | Camino óptimo con heurística Manhattan | Ruta más corta, con una heurística que guía la búsqueda |

- Los tres usan la misma grilla y el mismo conjunto de celdas transitables.
- El algoritmo elegido sirve para el ladrón y para la patrulla de los guardias.
- Mostrar en pantalla: un mismo destino con BFS, DFS y A*. Las rutas se distinguen (tecla `P` para mostrar u ocultar).

---

## 3. Navegación (1 min)

| Modo | Tecla | Comportamiento |
|---|---|---|
| Por celdas | `N` | El ladrón pasa por el centro de cada celda del camino. |
| Suavizada | `N` | Se eliminan waypoints intermedios cuando hay línea de visión directa. |

- Ambos modos usan el mismo resultado de búsqueda: cambiar BFS por A* no cuenta como cambiar la navegación.
- El suavizado nunca cruza una pared ni una puerta cerrada.

---

## 4. Percepción del guardia (2 min)

- **Visión:** cono de 5 celdas y 90°. Las paredes y la puerta cerrada bloquean la línea de visión. Un escondite anula la visión.
- **Oído:** radio de 6 celdas. Se activa al abrir la puerta y al recoger un tesoro. Como simplificación, el sonido no atraviesa paredes.
- **Memoria:** al perder de vista al ladrón, el guardia guarda su última posición conocida.
- La detección no termina la partida: inicia una persecución. La derrota solo ocurre si el guardia alcanza al ladrón.

En pantalla: el cono se pone rojo cuando el guardia ve al ladrón; el círculo de audición muestra el alcance del oído.

---

## 5. Objetivos de cada entidad (1 min)

| Entidad | Rol |
|---|---|
| Ladrón | Guiado por el jugador con clics. |
| Guardia | NPC con patrulla, investigación y persecución. |
| Llave y puerta | La llave se recoge sola; sin ella la puerta bloquea el paso. |
| Tesoros | Se recogen solos. Al menos uno es necesario para ganar. |
| Escondite | Celda que anula la visión del guardia. |
| Salida | Zona de escape; con 0 tesoros no termina la partida. |

---

## 6. FSM del guardia (2 min)

```
PATRULLA ──ve al ladrón──▶ PERSEGUIR ──pierde de vista──▶ INVESTIGAR
   ▲                                                         │
   └──────── termina de observar (2 s) ◀─────── llega ───────┘
PATRULLA/INVESTIGAR ──oye ruido──▶ INVESTIGAR (origen del ruido)
```

- `PATRULLA`: elige una celda alcanzable al azar y recalcula la ruta al llegar. No usa una ruta fija.
- `INVESTIGAR`: va a la última posición conocida o al origen del ruido, observa 2 segundos y vuelve a patrullar.
- `PERSEGUIR`: sigue la posición actual del ladrón. Si alcanza su celda, hay derrota.
- Los guardias cruzan puertas cerradas para no quedar trabados.
- La lógica está en `src/game/guard.ts`, sin Phaser, y se probó por separado.

**Límite conocido:** la FSM del ladrón del GDD (`REPOSO`, `MOVIENDO`, `OCULTO`, `ATRAPADO`) no está implementada. Quedó fuera de las specs.

---

## 7. Escenarios variables (1 min)

- Cada "Nueva partida" genera paredes, llave, puerta, tesoros, salida, escondites y guardias en posiciones distintas.
- El generador coloca una barrera con una única puerta. La llave y el inicio quedan de un lado; la salida y los tesoros del otro.
- Validación por inundación: la llave es alcanzable desde el inicio, la salida y un tesoro lo son después de abrir la puerta, y los escondites son laterales o sin salida.
- Si una generación no cumple las garantías, se descarta y se genera otra. Hay un fallback determinístico.
- Verificación: 600 escenarios generados en la Spec 04, todos válidos.

---

## 8. Decisiones de diseño (2 min)

| Decisión | Motivo |
|---|---|
| Sin puntaje ni tesoros extra con valor | El TP evalúa la IA, no un sistema de recompensas. |
| Sin propagación realista del sonido | Mantiene la percepción simple y verificable. |
| Clic en lugar de WASD | El foco es la búsqueda y la navegación elegidas por el jugador. |
| Lógica pura separada de Phaser (`perception.ts`, `guard.ts`, `pathfinding.ts`) | Permite probarla con scripts sin navegador. |
| Selecciones persistentes entre partidas | Permite comparar algoritmos y navegación en el mismo escenario de sesión. |
| Cono y audición visibles en partida | Es la única forma de leer la visión del guardia. |

---

## 9. Uso de OpenCode y desarrollo guiado por specs (2 min)

- El GDD define el diseño. `Specs.MD` divide el trabajo en nueve specs con criterios de verificación.
- Cada spec se implementa sola, se verifica y se aprueba antes de pasar a la siguiente.
- `AGENTS.md` guarda el estado del proyecto, las reglas de trabajo y las notas de entorno para las sesiones siguientes.
- OpenCode se usó para leer la documentación, implementar cada spec, escribir scripts de prueba temporales con Chrome headless y revisar capturas.
- Las pruebas de cada spec se registraron en `Specs.MD`: qué se comprobó, con cuántos casos y qué se corrigió.

---

## 10. Spec mostrada: Spec 07 — FSM del guardia y derrota (2 min)

**Objetivo de la spec:** la FSM del guardia transita entre patrulla, investigación y persecución, y la derrota termina la partida.

**Criterios principales:**
- Patrulla con destinos al azar, recalculados al llegar.
- Ruido → investigación en el origen. Visión → persecución. Pérdida de visión → investigación de la última posición.
- Derrota cuando un guardia comparte celda con el ladrón.

**Cómo se verificó:**
1. **Prueba programática** de `guard.ts` con esbuild y Node: 63 casos (transiciones, observación y timeout, ruido atendido una sola vez, destino de patrulla distinto del actual, puerta cerrada transitable para guardias y bloqueada para el ladrón).
2. **Prueba en navegador** con Chrome headless y CDP: 38 comprobaciones, repetidas tres veces con escenarios aleatorios. Incluyó patrulla, ruido, persecución, derrota, reinicio con `R` y dos guardias.
3. Se corrigieron dos fallos en la verificación: tweens detenidos desde su propio callback y cancelaciones diferidas que detenían tweens nuevos.

**Qué quedó abierto:** un ladrón inmóvil dentro del cono termina derrotado (esperado). Un guardia más lento que el ladrón puede no alcanzarlo.

---

## 11. Demo (5 min)

Orden sugerido:

1. Abrir el enlace de Vercel (`ENLACE_PENDIENTE_VERCEL`) en el navegador. Mostrar el HUD en tres filas y la leyenda inferior. Como plan B, si no hay conexión: `npm run dev-nolog` en local.
2. Elegir un destino con BFS y comparar con DFS y A* (teclas `1`, `2`, `3`). Mostrar `P` para ocultar la ruta.
3. Pulsar `N` y repetir el mismo destino: el recorrido suavizado se ve más recto.
4. Ir a la llave, abrir la puerta (se genera ruido) y recoger un tesoro. Mostrar el aviso de ruido y el estado `Investiga` si el guardia lo oye.
5. Entrar en el cono de un guardia: el cono se pone rojo y el estado pasa a `Persigue`.
6. Mostrar una derrota (un guardia alcanza al ladrón) y `R` para una nueva partida con las mismas selecciones.
7. Mostrar una victoria: tesoro recogido, llegada a la salida y mensaje de victoria.
8. Cambiar a 2 guardias con el botón y repetir una partida corta.

Si un guardia atrapa al ladrón antes de lo previsto, repetir la partida: el escenario cambia en cada una.

---

## 12. Limitaciones y trabajo futuro (espacio para completar)

Del prototipo, ya conocidas:

- Sin arte, audio ni animaciones: solo formas y texto.
- Sin puntaje, semillas, guardado ni menú de inicio.
- Sonido sin propagación realista; sin control de sigilo.
- FSM del ladrón (`REPOSO`, `MOVIENDO`, `OCULTO`, `ATRAPADO`) pendiente.
- Sin versión móvil.

Del equipo o del tiempo disponible:

- _(completar durante la presentación)_

---

## 13. Cierre

- Qué se logró: un prototipo jugable con tres búsquedas (BFS, DFS y A*), dos navegaciones, percepción, FSM, escenarios variables y victoria y derrota completables.
- Qué se aprendió sobre la IA: la percepción y la FSM se entienden mejor cuando se ven en pantalla (cono, memoria y estados).
- Dónde están los materiales: juego jugable en `ENLACE_PENDIENTE_VERCEL`; `README.md` (instalación, controles y despliegue), `GDD.MD` (diseño), `Specs.MD` (specs y verificaciones).
