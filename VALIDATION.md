# Validación técnica — Strategic Command v6.0.0

## Estado de validación de v6

Esta sección distingue entre contratos automatizados, comprobación visual local y despliegue público. Una revisión de sintaxis o un test sin DOM no se presenta como prueba de WebGL.

Estado observado el 8 de agosto de 2026 en el árbol de trabajo antes del cierre de la entrega:

| Área | Estado | Evidencia disponible |
| --- | --- | --- |
| Assets y GIS | **Superado** | 140 assets (31,88 MiB), tamaños y SHA-256; runtime WebGL local; Natural Earth 110m/50m/10m; 4.596 Admin-1; antimeridiano; 85 DEM; 17 CCAA; 50 provincias; glTF y avisos. |
| Contrato de interfaz cartográfica | **Superado** | 3 modos, 58 capas, 4 LOD, 5 perfiles, estado de cámara, visibilidad y selección. |
| Guardado v6 | **Superado** | Esquema 60, migración explícita 54→60, idempotencia, checksum, rechazo de futuro, IndexedDB y recuperación. |
| Adaptador de datos | **Superado** | Dos lecturas idénticas conservan revisiones y referencias; 197 países, 1.016 regiones de simulación y 2.154 formaciones únicas. |
| Geografía y entidades | **Superado** | Rusia/Canadá/Alaska, archipiélagos y antimeridiano; entidades dentro de región; rutas, frentes, ocupación y anexión. |
| Resiliencia | **Superado** | Contratos de fallo de asset/tesela/DEM/modelo/WebGL, modo local, Canvas y degradación de perfiles. |
| Contrato estático | **Superado** | Rutas Pages relativas, 29 fuentes del bundle heredado, 175 referencias de assets y sin dependencias cartográficas CDN. |
| ZIP v6 | Pendiente de regeneración final | Cualquier cambio posterior vuelve obsoleto el ZIP y su SHA-256. |
| Navegador local v6 | **Pendiente** | Aún no se afirma resultado visual, de interacción, rendimiento ni consola para v6. |
| GitHub Pages v6 | **Pendiente** | Aún no se afirma que `main` esté desplegado ni que la URL pública sirva este commit. |

Antes de publicar, el responsable de la entrega debe actualizar esta tabla con fecha, commit, runtime y resultado real. Un fallo o una prueba no ejecutada debe mantenerse visible.

## Contratos automatizados v6

### Assets, GIS y funcionamiento local

```bash
node tools/build-map-assets.mjs --verify-only
node tests/v6-assets-validation.mjs
```

Comprueba:

- correspondencia exacta entre cada asset y su tamaño/SHA-256;
- versiones fijadas de MapLibre, deck.gl, Three.js y GLTFLoader;
- importación local de módulos Three.js sin `bare imports`;
- países Natural Earth a 110m/50m/10m, Admin-1 50m/10m, ciudades, hidrografía, tierra, océano, redes, puertos y aeropuertos;
- geometría válida de España, Rusia, Canadá, Estados Unidos y países que cruzan el antimeridiano;
- 17 comunidades autónomas, 50 provincias y territorios especiales separados;
- 85 teselas Terrarium PNG de 256 px entre z0 y z3;
- modelos glTF autocontenidos, texturas SVG y avisos de licencia.

### Modos, cámara, capas, LOD y perfiles

```bash
node tests/v6-map-ui-contract-validation.mjs
```

Comprueba el ciclo Político → Híbrido → Terreno → Político, conservación de cámara y selección, transición 400–800 ms, movimiento reducido, persistencia sin colisionar con `mapMode=world|regions`, 58 capas, cuatro grupos conmutables, LOD 0–3 y perfiles Automático/Ultra/Alto/Medio/Bajo.

### Adaptador cartográfico

```bash
node tests/v6-map-data-adapter-validation.mjs
```

Debe comprobar 197 países, regiones y formaciones únicas; snapshot inmutable; ausencia de mutación del estado central; preferencia por GIS real; coordenadas planas y normalizadas; ocupaciones/reclamaciones; revisiones diferenciales; antimeridiano; TopoJSON; y puntos reproducibles dentro de polígonos. Una lectura idéntica debe reutilizar dominios y no incrementar revisiones.

### Interacción, geografía, entidades y resiliencia

```bash
node tests/v6-map-interaction-and-lod-validation.mjs
node tests/v6-map-geography-and-entities-validation.mjs
node tests/v6-map-resilience-validation.mjs
```

Comprueba transiciones de modo sin estado paralelo, persistencia de cámara/selección, Rusia, Canadá, Alaska, España y CCAA; los cuatro LOD; antimeridiano y archipiélagos; colocación persistente sin colisiones; instalaciones, unidades, rutas, barcos, frentes, batallas, anexión y ocupación; y degradación local ante fallos de recursos o WebGL.

### Guardados y migraciones

```bash
node tests/v6-save-migration-validation.mjs
```

Comprueba formato `nexus-global-save`, versión `6.0.0`, esquema `60`, `mapDataVersion`, checksum, cadena `52 → 53 → 54 → 60`, migración idempotente, rechazo de esquemas posteriores, compatibilidad de campos heredados, coordenadas persistentes o deterministas e IndexedDB con copia recuperable/fallback.

### Publicación estática y ZIP

```bash
node tests/v6-static-map-contract-validation.mjs
node tools/build-v6-release.mjs
node tests/v6-release-validation.mjs
git diff --check
```

Comprueba rutas relativas bajo `/GlobalWWIII/`, ausencia de `file://` o base absoluta, referencias HTML/CSS existentes, bundle heredado completo, assets no vacíos, raíz directa del ZIP, ausencia de `.git/` y `dist/`, lectura completa con `unzip -t` y SHA-256 coincidente.

## Prueba obligatoria en navegador real para v6

Sirve la raíz por HTTP; no abras mediante `file://`:

```bash
python3 -m http.server 8000
```

Registra navegador, versión, sistema, GPU, viewport, perfil, URL y commit. Verifica como mínimo:

1. Arranque sin error crítico de consola ni recursos 404.
2. Político → Híbrido → Terreno → Político sin reiniciar campaña.
3. Misma longitud, latitud, zoom, bearing, país y región antes/después.
4. Selección y foco de Rusia, Canadá, Alaska y España.
5. Antimeridiano y archipiélagos sin solapes ni líneas que crucen el mundo.
6. Las 17 CCAA seleccionables y provincias visibles en el LOD previsto.
7. Zoom mundo, país, región y operacional con carga progresiva.
8. Instalaciones y unidades dentro de su región; rutas terrestres y marítimas coherentes.
9. Barcos sobre el mar, convoyes en ruta, frentes, batallas, ocupaciones y reclamaciones.
10. Simulación avanzada varios días sin que la selección salte al territorio inicial.
11. Día/noche ligado a la hora simulada y sin cambiar la velocidad del reloj.
12. Fallo provocado de proveedor raster, DEM y modelo sin mapa en blanco.
13. WebGL no disponible o contexto perdido activa Canvas y permite seguir jugando.
14. Recarga sin red mantiene geografía local, unidades e instalaciones; solo desactiva fuentes externas configuradas.
15. Guardado, recarga, exportación, importación y migración por cuenta.
16. Escritorio, tableta y móvil; teclado, foco visible, tooltips y controles táctiles.
17. Movimiento reducido sin transiciones no esenciales.
18. FPS, tiempo de cuadro y memoria en escenas comparables para cada perfil; anota cifras, no solo “fluido”.

### Matriz mínima

| Escena | Escritorio | Tableta | Móvil |
| --- | --- | --- | --- |
| Político mundial | Ultra/Alto | Automático/Medio | Bajo |
| Híbrido nacional | Alto | Medio | Bajo |
| Terreno regional | Alto/Medio | Medio/Bajo | Bajo simplificado |
| Guerra con rutas y frentes | Alto/Medio | Medio | Bajo |
| Offline y fallo WebGL | Fallback | Fallback | Fallback |

Los objetivos declarados en configuración son presupuestos. Solo deben escribirse como alcanzados si una medición real los respalda.

## Validación de GitHub Pages v6

Después de integrar en `main`:

1. Comprueba la ejecución `pages build and deployment` en <https://github.com/ARGU17/GlobalWWIII/actions>.
2. Abre <https://argu17.github.io/GlobalWWIII/> con recarga forzada.
3. Confirma que la versión visible y los query strings corresponden a v6.0.0.
4. Repite el arranque, tres modos, selección, consola, guardado y responsive en la URL pública.
5. Anota aquí commit desplegado, URL de la ejecución, fecha y resultado.

Hasta completar estos pasos, el estado de Pages debe seguir marcado como pendiente.

## Evidencia histórica conservada

Las secciones siguientes corresponden a versiones anteriores. Demuestran regresiones históricas, pero no validan por sí solas el nuevo renderer v6.

## Validación v5.4.1

Ejecutar `node tests/v541-market-strip-validation.mjs`. Comprueba el catálogo exacto y ordenado de 21 mercados; sus metadatos visuales; la presencia de las diez magnitudes económicas exigidas; 21 tarjetas renderizadas; producción, demanda, balance, inventario, comercio y precio; valores finitos y actualización real después de 35 días. También verifica que el runtime y el guardado declaren `5.4.1`.

## Validación v5.4

Ejecutar `node tests/v54-architecture-validation.mjs`. Verifica que `index.html` no cargue capas alpha, el bundle de compatibilidad y el entrypoint modular; 197 países; 13 sistemas; propiedad exclusiva de estado; eventos tipados; cálculo diario, semanal, mensual, trimestral y anual; migraciones explícitas; checksum de guardados; Worker y fallback; ejecución sin interfaz; conservación de selección y determinismo. El runner `node headless/runner.mjs 45` permite probar la campaña sin DOM.

## Validación v5.2

Ejecutar `node tests/v52-validation.js`. Comprueba los catálogos exactos solicitados, 197 países, los ocho sistemas nuevos, formaciones y suministros, guerra multidominio, posguerra y resistencia, niebla de guerra, operaciones de inteligencia, conocimiento y difusión, clima, mapas y riesgos. Además ejecuta acciones reales, renderiza los tres paneles, simula 100 días, busca valores no finitos, verifica determinismo y migra una partida v5.1. Las pruebas v5.1 y v5.0 se mantienen como regresión.

## Validación v5.1

Ejecutar `node tests/v51-validation.js`. La prueba comprueba el catálogo exacto de 21 mercados y todos sus saldos; cuentas nacionales; inflación y ciclo; moneda, banca y mercados; empresas y plantas; logística y 12 puntos estratégicos; 15 tecnologías energéticas; demografía, migración, empleo y educación; ciudades; instituciones, partidos, Gobierno, opinión, medios y crimen; diplomacia, 16 tratados, 15 organizaciones y 11 canales de influencia. También ejecuta las decisiones del jugador, renderiza ambos paneles, simula 92 días, descarta valores no finitos, compara dos partidas deterministas y migra una partida v5.0.

## Validación v5.0 ejecutada

- Sintaxis validada para todos los módulos `js/v5/*.js`, `ui.js` y `app.js`.
- Batería histórica completa ejecutada sin regresiones.
- Prueba `tests/v50-validation.js`: 23 sistemas, 197 países, 95 días, migración y determinismo validados.
- Mercados de nueve productos, empresas agentes, cohortes, instituciones, redes energéticas y logística militar presentes desde el estado inicial.
- Anexión verificada con transferencia de población, PIB, empresas, productos, cohortes y soberanía; ocupación y decisión política generadas.
- Dos campañas con la misma semilla producen la misma firma de PIB, inflación, productos, índices mundiales y sistemas ejecutados.
- Todos los valores numéricos permanecen finitos y los balances físicos no se vuelven negativos.
- Interfaz local: arranque sin panel de error, mapa disponible y panel **Sistemas** renderizado con productos, empresas, causalidad y riesgos.
- Fluidez de navegador: 13 días a x32 en 4,3 segundos, con pausa inmediata e interfaz sensible.
- El país y la región seleccionados permanecieron estables durante 95 días de avance.

## Validaciones históricas ejecutadas antes de v6

- Sintaxis de todos los archivos JavaScript mediante `node --check`.
- Verificación de referencias CSS, JavaScript e imágenes locales desde `index.html`.
- Validación JSON de los archivos cartográficos.
- Integridad del ZIP mediante lectura completa de sus entradas.
- Prueba del modelo y prueba DOM aislada de los paneles.

## Resultado del modelo

- Versión: `2.0.0-alpha`.
- 197 países.
- 176 empresas.
- 42 instalaciones.
- 62 tecnologías.
- 17 comunidades autónomas españolas.
- Construcción industrial y producción militar conservadas al cruzar un cierre mensual.
- Movimiento regional, conquista, ocupación y anexión verificados.
- Cronología probada desde `2029-04-30` hasta `2029-05-03` sin límite final.
- Incrementos presupuestarios de 0,5 puntos verificados.
- Política de beneficios de empresa controlada verificada.
- Decisión nacional verificada.
- Declaración de guerra con identificador de Sala de Guerra verificada.
- Ataque directo entre unidades y registro de operaciones verificados.
- Anexión integral de regiones, población, PIB, Tesoro, ejército, empresas, instalaciones y colas verificada.
- Construcción y ampliación en territorio anexionado verificadas.
- Elecciones con variación de escaños y suma exacta de 350 verificadas.
- Comercio con saldo económico e importaciones de recursos positivos verificado.
- Conflicto iniciado por IA y decisión de respuesta en Resumen verificados.
- Generación de I+D proporcional a la inversión: 11,6 puntos/mes de base y 18,9 tras aumentar cinco puntos el presupuesto.
- Bonificación científica de territorios absorbidos verificada.
- Nombres reales Texas · Austin, Louisiana · Baton Rouge, Antioquia · Medellín y Tánger-Tetuán-Alhucemas verificados.
- Efectos del presupuesto sobre tecnología, capacidad militar y energía verificados al cierre mensual.
- Amortización de deuda, reducción de ratio, intereses y ahorro futuro verificados.
- Mercado interior automático y eliminación soberana del país anexionado verificados.
- Daño territorial, cola de reconstrucción y recuperación de instalaciones verificados.
- Costes de ampliación industrial expuestos por el motor y por la interfaz.
- Limpieza de tratados tras anexión verificada.
- Trece campañas multidominio verificadas: superioridad aérea, ataque de precisión, bloqueo naval, asalto anfibio, invasión terrestre, ofensiva cibernética, guerra total, ISR, SEAD, guerra antisubmarina, ataque naval, asalto aerotransportado e incursiones especiales.
- Cuatro doctrinas operativas, movilización de reservas, requisitos de fuerza, costes y efectos territoriales verificados.
- Selección libre del partido apoyado, tres intensidades de campaña electoral y previsión dinámica de votos/escaños verificadas.
- Catorce fotografías militares locales, diecisiete familias de unidad y nombres de plataformas reales verificados.
- Contratos militares con modelo, fabricante, generación y función conservados al terminar la producción.
- Plan operacional con tempo, reglas de enfrentamiento, prioridad, apoyo y prerrequisitos verificado.
- Postura conjunta y Sala de Situación Global verificadas con valores finitos y focos de riesgo.
- Rendimiento del motor sobre 197 Estados: entre 16 y 27 ms por día simulado en la medición local, frente a aproximadamente 1,1 s antes de eliminar la normalización cuadrática.

## Resultado de interfaz DOM

Se renderizaron correctamente los 13 paneles:

- Resumen.
- Economía.
- Regiones.
- Industria.
- Bolsa.
- Política.
- Tecnología.
- Militar.
- Diplomacia.
- Inteligencia.
- Objetivos.
- Eventos.
- Configuración.

También se verificó:

- Registro e inicio de sesión por usuario o correo.
- Derivación PBKDF2-SHA-256 con sal aleatoria y ausencia de contraseña en texto plano.
- Sesión persistente o temporal, modo invitado y guardados separados por cuenta.
- Perfil, cambio de contraseña y cierre de sesión.

- Sala de Guerra con teatros y operaciones.
- Parlamento semicircular y Mesa de Coalición.
- Directorio diplomático con países desde Afganistán hasta Zimbabue.
- Bolsa con 176 compañías.
- Ventana **Mis participaciones** en Bolsa.
- Impacto presupuestario y gestión de deuda en Economía.
- Industrias desbloqueadas o potenciadas en Tecnología.
- Sala de Guerra con sostenimiento, reservas, marchas, objetivos y daño reconstruible.
- Diplomacia sin Estados anexionados.
- Centro de decisiones accionables en Resumen.
- Tablero mundial fijo ampliado, geometría cartográfica cacheada, rejilla estratégica y campañas militares animadas.
- Sala de Guerra multidominio con selector de región objetivo, doctrina, reservas y cronología de campañas.
- Estrategia electoral con partido elegible, impulso, proyección y acciones de campaña.

## Prueba funcional histórica en navegador (Strategic Command v2.0.0)

Se sirvió el proyecto mediante HTTP local y se verificó en el navegador integrado:

- Arranque completo de Strategic Command v2.0.0 sin errores de consola.
- Cambio de mapa desde España a Estados Unidos verificado: país, cámara y panel de inspección se actualizaron conjuntamente.
- Botón `MUNDO` verificado: mapa global completo y panel territorial oculto.
- Inicio, pausa y avance manual operativos tras comenzar la campaña.
- Cambios x1, x2, x4, x16 y x32 aplicados durante la simulación.
- Conservación del progreso parcial del día al cambiar de velocidad.
- Capa Industria con título y estado activo correctos.
- Capa Militar con título y estado activo correctos.
- Economía con I+D prevista y Gestión de deuda.
- Tecnología con generación prevista y desbloqueos industriales.
- Bolsa con Mis participaciones.
- Persistencia de la región seleccionada: Asturias siguió activa al avanzar del 1 al 2 de enero de 2028.
- Prueba sostenida a x32: seis días simulados en 2,7 segundos incluyendo la interacción de pausa, con interfaz sensible y pausa inmediata.
- Mapa vectorial visible a `736 × 600 px` en la ventana de prueba adaptativa y zoom mundial funcional.
- Capa Militar con miniaturas separadas por rejilla, sin superposición de países vecinos al acercarse.
- Cuarenta y siete usos fotográficos renderizados, catorce archivos únicos cargados, cero imágenes rotas y cero errores de consola.
- Inventario visible con Leopard 2E, Eurofighter Typhoon Tranche 4 y S-80 Plus clase Isaac Peral.

## Comandos históricos ejecutados

```bash
node --check js/alpha-v20.js
node --check js/alpha-v19.js
node --check js/auth.js
node --check js/ui.js
node --check js/map.js
node --check js/app.js
node tests/v18-validation.js
node tests/v181-time-validation.js
node tests/v182-auth-validation.js
node tests/v19-validation.js
node tests/v20-validation.js
node tests/ui-render-validation.js
node tests/model-validation.js
git diff --check
```
