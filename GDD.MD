# GDD breve — “Asecho Nocturno”

TP Final Integrador — PIAPC  
Prototipo individual — Phaser 4, Vite y TypeScript

## 1. Idea

Prototipo de sigilo en grilla, una sola pantalla. Un ladrón entra a una casa, consigue la llave, abre la puerta, toma al menos un tesoro y escapa por la salida evitando a 1 o 2 guardias.

El jugador no mueve al ladrón con WASD: hace clic en una celda alcanzable y el ladrón recorre el camino calculado. El foco del TP es la IA: búsqueda, navegación, percepción, FSM y escenarios variables.

## 2. Bucle jugable

1. Se genera un escenario nuevo.
2. El jugador hace clic en una celda válida; se calcula una ruta con el algoritmo elegido.
3. El ladrón recoge llave y tesoros automáticamente; con la llave puede abrir la puerta.
4. Los guardias patrullan. Si ven u oyen al ladrón, investigan o persiguen.
5. El ladrón puede ocultarse en celdas de escondite.
6. Victoria: tener al menos 1 tesoro y llegar a la salida.
7. Derrota: un guardia alcanza al ladrón en la misma celda.

| Acción | Control |
|---|---|
| Mover al ladrón | Clic en celda válida |
| Elegir búsqueda | Teclas `1` BFS, `2` DFS, `3` A* |
| Alternar navegación | Tecla `N` |
| Mostrar/ocultar ruta | Tecla `P` |
| Nueva partida | Tecla `R` |
| Cantidad de guardias | Botón en pantalla: 1 o 2 |

Un clic en pared, fuera de la grilla o en una zona inalcanzable se rechaza con un aviso breve. Un clic nuevo mientras el ladrón se mueve cancela la ruta anterior y recalcula desde la celda actual.

## 3. Escenario

- Grilla de 17 × 13 celdas, una pantalla.
- Generado en cada partida con: paredes internas, 1 llave, 1 puerta, 2 o 3 tesoros, 1 salida, 1 o 2 escondites, 1 o 2 guardias y posiciones iniciales.
- Garantías de generación:
  - La llave es alcanzable desde el inicio.
  - La salida y al menos un tesoro son alcanzables después de abrir la puerta.
  - La puerta está en el recorrido hacia la salida, no es decorativa.
  - Los escondites son celdas sin salida o laterales.
  - El guardia no aparece pegado al ladrón.
  - Si el mapa no cumple las garantías, se descarta y se genera otro.
- Qué cambia entre escenarios: distribución de paredes, posición de puerta y llave, cantidad y posición de tesoros y escondites, cantidad de guardias y puntos de inicio. Cambian los caminos y las rutas de patrulla, no solo los colores.
- No se guardan semillas ni escenarios.

## 4. Entidades y percepción

| Entidad | Rol |
|---|---|
| Ladrón | Entidad guiada por el jugador |
| Guardia | NPC con patrulla, investigación y persecución |
| Llave | Se recoge automáticamente; habilita la puerta |
| Puerta | Bloquea al ladrón hasta tener la llave |
| Tesoro | Se recoge automáticamente |
| Salida | Zona de escape |
| Escondite | Celda que vuelve invisible al ladrón |

Percepción del guardia:

- Visión: cono de 5 celdas de alcance y 90°, con línea de visión bloqueada por paredes. Un escondite anula la visión.
- Oído: radio de 6 celdas. Se activa al abrir la puerta y al recoger un tesoro. Como simplificación, el sonido no es bloqueado por paredes.
- Memoria: al perder de vista al ladrón, recuerda su última posición conocida y la investiga.
- La detección no produce derrota inmediata: inicia persecución. La derrota ocurre solo si el guardia alcanza al ladrón.

## 5. Objetivos

- Jugador: conseguir al menos 1 tesoro y escapar por la salida. La llave es necesaria para atravesar la puerta.
- Guardia: patrullar, investigar ruidos y últimas posiciones, perseguir y atrapar.
- Ladrón: sobrevivir y escapar. Los tesoros extra se pueden recoger, pero no dan puntaje.

## 6. Comportamiento con FSM

### Guardia

| Estado | Comportamiento | Transiciones |
|---|---|---|
| `PATRULLA` | Elige una celda alcanzable al azar, calcula la ruta con el algoritmo activo y camina. Al llegar, elige otra. | Ve al ladrón → `PERSEGUIR`. Oye ruido → `INVESTIGAR`. |
| `INVESTIGAR` | Va al origen del ruido o a la última posición conocida. Al llegar espera unos segundos y observa. | Ve al ladrón → `PERSEGUIR`. Termina el tiempo → `PATRULLA`. |
| `PERSEGUIR` | Sigue la posición actual del ladrón; si lo pierde, va a la última posición conocida. | Alcanza al ladrón → derrota. Pierde de vista → `INVESTIGAR`. |

Las rutas de patrulla se calculan en cada ciclo sobre las celdas alcanzables del escenario actual, no son trayectorias fijas preparadas.

### Ladrón

| Estado | Comportamiento | Transiciones |
|---|---|---|
| `REPOSO` | Sin destino. | Recibe un clic válido → `MOVIENDO`. |
| `MOVIENDO` | Recorre el camino calculado. | Termina el camino → `REPOSO`. Entra a un escondite → `OCULTO`. Guardia lo alcanza → `ATRAPADO`. |
| `OCULTO` | No puede ser visto mientras permanezca en el escondite. | Sale del escondite → `MOVIENDO` o `REPOSO`. |
| `ATRAPADO` | Fin de la partida. | Nueva partida. |

La llave, la puerta y los tesoros se resuelven automáticamente al pisar sus celdas.

## 7. Búsquedas seleccionables

| Algoritmo | Uso |
|---|---|
| BFS | Camino de menor cantidad de pasos en grilla sin pesos. |
| DFS | Camino válido pero no necesariamente óptimo; sirve para mostrar rutas largas y distintas. |
| A* | Camino óptimo con heurística Manhattan. |

Los tres se ejecutan sobre la misma grilla de celdas transitables. El algoritmo elegido se usa para el ladrón y para la navegación de los guardias. El cambio se aplica en el siguiente cálculo de ruta.

## 8. Alternativas de navegación

| Modo | Comportamiento |
|---|---|
| Por celdas | El personaje pasa por el centro de cada celda del camino. |
| Suavizada | Se conserva el camino calculado, pero se eliminan waypoints intermedios cuando hay línea de visión directa, produciendo un recorrido más recto. |

Ambas alternativas usan el mismo resultado de búsqueda, son seleccionables con `N` y deben verse distintas al jugar. Cambiar BFS por A* no cuenta como cambiar la navegación.

## 9. Interfaz

HUD con:

- Algoritmo activo.
- Modo de navegación activo.
- Tesoros recogidos / tesoros necesarios.
- Estado de llave y puerta.
- Cantidad de guardias.
- Botones para nueva partida y para elegir 1 o 2 guardias.
- Ruta calculada visible u oculta con `P`.
- Mensajes breves de victoria, derrota o clic inválido.

## 10. Fuera de alcance

- Puntaje, bonificaciones y tablas de posiciones.
- Más de una llave o puerta.
- Modo sigilo o control con WASD.
- Propagación realista del sonido a través de paredes.
- Arte, animaciones, audio, sprites externos.
- Guardado, semillas, comparación de métricas y escenarios idénticos.
- Progresión, varios niveles, menús complejos o versión móvil.
- MCP, modelos de lenguaje, servicios pagos y dependencias nuevas.

## 11. Posibles mejoras/cambios

Ideas del borrador original que se recortaron para este prototipo. No forman parte del alcance actual ni de los criterios de aceptación; quedan registradas por si sobra tiempo.

- Puntaje por tesoros y bonificación de 1.5 por terminar sin haber sido detectado.
- Varias llaves y puertas, con rutas bloqueadas en distintos sectores del mapa.
- Modo sigilo: caminar despacio sin hacer ruido o correr generando ruido.
- Propagación del sonido bloqueada o atenuada por paredes.
- Investigación más rica: explorar celdas cercanas a la última posición conocida, en lugar de ir solo al punto exacto.
- Más escondites y guardias que revisen escondites sospechosos.
- Más de 2 guardias, con zonas de patrulla asignadas.
- Rutas de patrulla con waypoints definidos por zona en lugar de destino aleatorio.
- Algoritmos adicionales, como Dijkstra, o comparación entre algoritmos.
- Árboles de comportamiento, utilidad o GOAP como alternativa a la FSM.
- Semillas visibles, guardado de escenarios y comparación con condiciones idénticas.
- Varios niveles, progresión y menú de inicio.
- Arte, animaciones, audio y efectos visuales.
- Controles táctiles o versión móvil.
- Tablas de puntaje y guardado local de resultados.

## 12. Criterios de aceptación

- Se pueden elegir BFS, DFS y A* y sus rutas se distinguen en pantalla.
- Se pueden alternar las dos navegaciones y el recorrido cambia visualmente.
- La FSM del guardia transita entre patrulla, investigación y persecución sin quedar trabada.
- “Nueva partida” cambia paredes, elementos y posiciones; todos los escenarios generados son completables.
- La patrulla se recalcula según el escenario y no usa una ruta fija.
- Se puede ganar y perder jugando en menos de dos minutos.
- El prototipo inicia con `npm install` y `npm run dev`.

## 13. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Escenario imposible | Validación por inundación y regeneración. |
| Guardia trabado por la puerta | Los guardias pueden cruzar puertas cerradas. |
| DFS genera rutas largas o raras | Conjunto de visitados y visualización de ruta. |
| Alcance excesivo | Sin puntaje, arte, audio ni sistemas extra. |
