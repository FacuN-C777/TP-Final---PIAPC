# Specs — “Golpe Nocturno”

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
| 01 — Grilla y escena | Pendiente | — |
| 02 — Búsquedas y movimiento | Pendiente | 01 |
| 03 — Navegación | Pendiente | 02 |
| 04 — Escenarios variables | Pendiente | 02 |
| 05 — Interacción y victoria | Pendiente | 04 |
| 06 — Percepción | Pendiente | 05 |
| 07 — FSM del guardia y derrota | Pendiente | 06 |
| 08 — UI final y pulido | Pendiente | 01–07 |
| 09 — README y presentación | Pendiente | 08 |

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

**Cómo comprobarla jugando:**
1. Probar un mismo destino con BFS, DFS y A* y comparar visualmente las rutas.
2. Confirmar que A* y BFS llegan con la menor cantidad de pasos y que DFS puede tardar más.
3. Hacer clic en una pared y en una celda aislada; verificar que el movimiento se rechaza.
4. Iniciar un recorrido largo, hacer clic en otro destino a mitad de camino y comprobar que la ruta cambia desde la posición actual.
5. Ocultar y mostrar la ruta con `P`.

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

**Cómo comprobarla jugando:**
1. Elegir un destino con BFS y observar el recorrido “Por celdas”.
2. Presionar `N` y repetir el mismo destino; comprobar que el camino se ve más recto.
3. Repetir con A* y DFS.
4. Verificar que el modo suavizado nunca cruza una pared.

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

**Cómo comprobarla jugando:**
1. Generar al menos 10 partidas nuevas y comprobar que los mapas cambian.
2. En cada mapa, verificar que la llave es alcanzable desde el inicio.
3. Verificar que la salida y al menos un tesoro quedan del otro lado de la puerta.
4. Comprobar que no hay elementos inalcanzables ni guardias superpuestos con el ladrón.
5. Cambiar entre 1 y 2 guardias y confirmar que la cantidad se respeta.

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

**Fuera de alcance:**
- Informe extenso, carpeta de evidencias, video obligatorio, diapositivas con arte elaborado o métricas comparativas.

**Cómo comprobarla jugando:**
1. Seguir el README desde cero: `npm install`, `npm run dev` y `npm run build`.
2. Confirmar que los controles documentados coinciden con el juego.
3. Ensayar la demo con las combinaciones principales.
4. Verificar que la spec mostrada coincide con el estado real del código.
