# Arquitectura del motor cartográfico v6.0.0

## Alcance y principios

Strategic Command v6.0.0 sustituye el mapa monolítico anterior por un subsistema cartográfico desacoplado, sin crear una segunda simulación. El Estado estratégico que gobierna economía, población, política, diplomacia y guerra sigue siendo la única fuente de verdad del mundo. El mapa recibe una vista intermedia inmutable, la representa y devuelve intenciones de usuario mediante la API pública.

Los invariantes de esta arquitectura son:

1. Un solo estado de simulación.
2. Un solo estado geográfico y una única convención de coordenadas.
3. Una sola cámara lógica para Político, Híbrido y Terreno 3D.
4. Identificadores estables para países, regiones y entidades.
5. Los renderers nunca modifican directamente economía, diplomacia o guerra.
6. El cambio de representación no reconstruye la campaña ni reinicia la cronología.
7. Todos los recursos obligatorios para el modo empaquetado usan rutas relativas compatibles con GitHub Pages.
8. Cada fallo visual tiene una degradación que conserva interacción y jugabilidad.

La auditoría previa, incompatibilidades y riesgos del mapa anterior están en `MAP_ENGINE_AUDIT_V6.md`. Las fuentes GIS están descritas en `MAP_DATA_SOURCES.md` y sus obligaciones de redistribución en `LICENSES_MAP_V6.md`.

## Vista general

```text
Estado central de Strategic Command
  │
  ├── core/entry.mjs · schema 60 · reloj · eventos · auditoría
  ├── simulation/ · world/ · ai/ · compat/legacy-v52.bundle.js
  │
  ▼
MapDataAdapter
  ├── resuelve ISO/regionId y geometrías reales
  ├── normaliza coordenadas y entidades heredadas
  ├── genera posiciones reproducibles cuando faltan
  ├── publica revisiones por dominio
  └── devuelve un snapshot profundo e inmutable
  │
  ▼
MapEngine ─── MapState ─── CameraController
  ├── LayerManager          SelectionManager
  ├── LODManager            AssetManager
  ├── PerformanceManager    MapUIControls
  │
  ├── MapLibreRenderer
  │     ├── PoliticalRenderer
  │     └── TerrainRenderer
  ├── SimulationOverlayRenderer · deck.gl
  │     ├── UnitRenderer
  │     ├── InfrastructureRenderer
  │     ├── TradeRenderer
  │     ├── WarRenderer
  │     └── StrategicOverlayRenderer
  ├── ThreeRenderer
  └── FallbackRenderer → Canvas heredado
```

## Responsabilidades por módulo

### Fachada y orquestación

| Módulo | Responsabilidad |
| --- | --- |
| `js/map.js` | Fachada compatible con las llamadas históricas de la aplicación. Expone el motor v6 sin filtrar dependencias WebGL al simulador. |
| `js/map/map-engine.js` | Ciclo de vida, coordinación de renderers, cambios de modo/capa, actualización diferencial, foco, selección, calidad, diagnóstico y activación del fallback. |
| `js/map/map-config.js` | Modos, 58 capas, cuatro LOD, perfiles de calidad, objetivos y rutas de fuentes. |
| `js/map/map-state.js` | Única cámara lógica y estado visual persistente; sincroniza los campos cartográficos con el estado de campaña. |
| `js/map/camera-controller.js` | Traduce la cámara lógica a MapLibre y captura movimientos sin sustituir la selección. |
| `js/map/selection-manager.js` | Picking de país, región o entidad y envío de acciones a los controladores existentes. |

### Datos y recursos

| Módulo | Responsabilidad |
| --- | --- |
| `js/map/model/map-data-adapter.js` | Traduce el modelo del juego a dominios cartográficos; no muta la simulación. |
| `js/map/model/geo-utils.js` | TopoJSON/GeoJSON, límites, antimeridiano, punto en polígono y posición determinista. |
| `js/map/assets/asset-manager.js` | Carga, caché y errores de GIS, DEM, modelos y proveedor opcional; conserva plantillas `{z}/{x}/{y}`. |
| `data/map-v1/layers.json` | Contrato externo y orden canónico de las 58 capas. |
| `data/map-v1/assets-manifest.json` | Inventario reproducible con procedencia, versión, licencia, transformación, tamaño y SHA-256. |

### Renderers

| Módulo | Responsabilidad |
| --- | --- |
| `renderers/maplibre-renderer.js` | Contexto WebGL, estilo base local, cámara, fuentes, capas, controles nativos y pérdida/restauración de contexto. |
| `renderers/political-renderer.js` | Soberanía, control, colores, fronteras, regiones, ocupaciones, reclamaciones, etiquetas, selección y hover. |
| `renderers/terrain-renderer.js` | DEM Terrarium, hillshade, masa terrestre, agua, ríos, lagos, carreteras, ferrocarriles, ciudades, puertos, aeropuertos, extrusiones e iluminación diaria/nocturna. |
| `renderers/simulation-overlay-renderer.js` | Composición de capas deck.gl y actualización animada/diferencial. |
| `renderers/unit-renderer.js` | Formaciones terrestres, aéreas y navales; agrupación, cantidades, estado y selección. |
| `renderers/infrastructure-renderer.js` | Industrias, centrales, infraestructura, recursos y nodos estratégicos. |
| `renderers/trade-renderer.js` | Rutas comerciales/logísticas, convoyes, barcos, camiones, sentido y progreso. |
| `renderers/war-renderer.js` | Frentes, campañas, batallas, avance, rutas de suministro, ocupación y objetivos. |
| `renderers/strategic-overlay-renderer.js` | Etiquetas y capas estratégicas transversales. |
| `renderers/three-renderer.js` | Modelo glTF del objeto seleccionado y geometría procedural si falla el modelo. |
| `renderers/fallback-renderer.js` | Activa el Canvas local preservado cuando WebGL no está disponible o se pierde el contexto. |

## Estado compartido del mapa

`MapState` contiene, como mínimo:

```js
{
  mode: "political" | "hybrid" | "terrain",
  longitude: Number,
  latitude: Number,
  zoom: Number,
  pitch: Number,
  bearing: Number,
  selectedCountryId: String | null,
  selectedRegionId: String | null,
  selectedEntityId: String | null,
  hoveredFeatureId: String | null,
  activeLayer: String,
  visibleLayers: Object,
  scope: "world" | "regions",
  visualBlend: Number,
  quality: "auto" | "ultra" | "high" | "medium" | "low",
  lod: 0 | 1 | 2 | 3
}
```

La compatibilidad exige diferenciar dos conceptos:

- `mapMode` heredado sigue indicando el alcance `world|regions` usado por los paneles históricos.
- `mapVisualMode` indica la representación `political|hybrid|terrain`.

Este desacoplamiento impide que abrir Regiones fuerce un estilo visual o que cambiar a Terreno 3D altere el panel activo. `MapState.syncToGameState()` conserva cámara, pitch, bearing, selección, capa, visibilidad, mezcla, calidad y LOD en el guardado. El tick diario de `js/app.js` conserva esos campos para evitar el antiguo salto al territorio inicial.

La referencia canónica es EPSG:4326 y el orden es `longitude, latitude`. Los renderers proyectan esa referencia mediante Web Mercator, pero el estado no almacena píxeles ni coordenadas dependientes de una librería.

## API pública y compatibilidad

La fachada mantiene las operaciones consumidas por la interfaz anterior:

```js
setMapMode(mode)
setMapLayer(layer)
focusCountry(countryId)
focusRegion(countryId, regionId)
selectCountry(countryId)
selectRegion(countryId, regionId)
updateMapEntities(gameState)
refreshPoliticalColors()
refreshIndustryMarkers()
refreshMilitaryMarkers()
refreshTradeRoutes()
refreshWarFronts()
```

`setMapMode` solo cambia cámara y opacidades propias de la representación. Las acciones de economía, guerra o diplomacia continúan en `NEXUS_ECONOMY`; las acciones de interfaz continúan en `NEXUS_APP`. El mapa devuelve selecciones a esos controladores mediante callbacks.

El runtime anterior no vuelve a encadenar archivos `alpha-vXX.js`: está congelado en `compat/legacy-v52.bundle.js`, documentado por `compat/legacy-v52.manifest.json`. La arquitectura v5.4 (`core/`, `simulation/`, `world/`, `ai/`, `ui/`) permanece activa y v6 añade el subsistema cartográfico sobre esa base.

## Modos visuales sincronizados

| Modo | Pitch nominal | Transición | Prioridad |
| --- | ---: | ---: | --- |
| Político | 8° | 520 ms | Soberanía, control, fronteras, etiquetas, ocupación, unidades y lectura rápida. |
| Híbrido | 32° | 620 ms | Color político semitransparente, relieve moderado, redes, ciudades, instalaciones y unidades. |
| Terreno 3D | 55° | 720 ms | DEM, hillshade, redes, extrusiones, modelos, iluminación, infraestructura, movimiento y frentes. |

El intervalo de inclinación admitido es 0°–70°. El modo político restringe su intención visual a 0°–15°, Híbrido a 20°–40° y Terreno a 35°–70°. El usuario puede inclinar y rotar, y el cambio de modo conserva longitud, latitud, zoom y, cuando procede, bearing. Si `prefers-reduced-motion` o el ajuste del juego solicita movimiento reducido, la transición pasa a 0 ms.

El deslizador visual trabaja de 0 a 100 y selecciona Político en el extremo inicial, Terreno en el final e Híbrido entre ambos. No crea estilos de estado independientes.

## Catálogo de capas

Las capas `00`–`57` se declaran en código y JSON; sus identificadores son estables. El catálogo incluye:

- Físicas `00`–`19`: océano, batimetría, DEM, hillshade, cobertura, nieve/desierto, hidrografía, carreteras, ferrocarril, ciudades, edificios, costa, curvas, hielo, clima, vegetación, iluminación, luces nocturnas, meteorología y etiquetas físicas.
- Políticas `20`–`29`: países, regiones, provincias, ocupación, reclamaciones, fronteras nacionales/regionales, etiquetas, fronteras disputadas y alianzas.
- Simulación `30`–`49`: recursos, industrias, centrales, infraestructura, comercio, unidades por dominio, logística, frentes, batallas, inteligencia, migración, influencia, reconstrucción, suministro, control naval, superioridad aérea, daños y nodos estratégicos.
- Interfaz `50`–`57`: selección, hover, tooltip, órdenes, alcance, objetivos, alertas y previsualización de ruta.

`LayerManager` resuelve por id, código o slug; filtra por modo y LOD; y permite activar una capa o un grupo completo. La visibilidad elegida se serializa en `mapVisibleLayers`.

## Modelo intermedio y actualización diferencial

`MapDataAdapter` produce colecciones geográficas y listas normalizadas para:

- países, regiones y ciudades;
- instalaciones, industrias, centrales, recursos y nodos;
- unidades terrestres, aéreas y navales;
- rutas de comercio y suministro;
- frentes, batallas y campañas;
- ocupaciones, anexiones y reclamaciones;
- etiquetas políticas, regionales y urbanas.

Cada entidad mantiene su id del simulador, propietario, controlador, región y posición. El snapshot se congela para hacer visible cualquier intento de mutación. Un mapa de revisiones permite que una variación política no regenere unidades y que el avance de un convoy no obligue a reconstruir toda la geografía.

La colocación heredada sigue esta prioridad:

1. Coordenada persistida y válida.
2. Coordenada GIS de la entidad o nodo correspondiente.
3. Punto determinista contenido en la región.
4. Punto determinista contenido en el país.
5. Centro geográfico válido como último respaldo.

La semilla usa identificadores estables; por tanto, una instalación sin localización explícita no salta entre cargas. La geometría puede cruzar el antimeridiano y los límites se calculan en el intervalo longitudinal mínimo, no como una envolvente de casi 360°.

## Datos GIS y LOD

La entrega local combina:

- Natural Earth 1:110m para visión mundial.
- Natural Earth 1:50m para países, Admin-1, masas físicas, hidrografía y ciudades.
- Natural Earth 1:10m filtrado para carreteras, ferrocarriles, puertos y aeropuertos.
- `es-atlas` 0.6.0/IGN para 17 comunidades autónomas y 50 provincias.
- Mapzen Terrarium z0–z3 para el relieve global de baja resolución.

| LOD | Zoom | Geografía y entidades |
| --- | ---: | --- |
| 0 · Mundo | 0–4 | Países simplificados, capitales, rutas globales, flotas/alas agrupadas, conflictos y alianzas. |
| 1 · País | 4–7 | Países detallados, Admin-1, ciudades principales, puertos, bases, recursos e instalaciones estratégicas. |
| 2 · Región | 7–10 | Regiones/provincias disponibles, redes, ciudades secundarias, industrias, energía, logística y unidades regionales. |
| 3 · Operacional | 10–16 | Entidades concretas, modelos permitidos, movimientos, frentes, suministro, daños, objetivos y rutas detalladas. |

El LOD no modifica el estado del mundo: cambia la fuente visual, el límite de objetos, el radio de agrupación y el nivel de detalle. Las geometrías políticas usan id lógico común aunque la escala pase de 110m a 50m.

## Composición WebGL

MapLibre GL JS es propietario del lienzo y de la cámara. Las capas políticas y físicas se insertan en su estilo. deck.gl usa la misma cámara para los conjuntos de objetos y rutas. Three.js comparte la transformación del mapa para el objeto 3D seleccionado y no crea un segundo mundo navegable.

La división responde al coste de cada técnica:

- MapLibre: polígonos, líneas, textos, terreno y picking GIS.
- deck.gl: grandes lotes, clustering, rutas animadas, formaciones, instalaciones y frentes.
- Three.js: unos pocos modelos glTF de alta saliencia, especialmente la selección.

Los modelos complejos no se crean por soldado ni por producto. Las cantidades estratégicas continúan en el estado y se expresan mediante fichas, etiquetas, instancias o agrupaciones.

## Día, noche y reloj

`TerrainRenderer` recibe la fracción del día simulada. El cálculo parte de `state.simulation.clockFraction`, su ancla y la velocidad actual; nunca usa la hora civil del dispositivo como reloj estratégico. La iluminación, el cielo, el terreno y las luces nocturnas se ajustan sin modificar la duración del día ni el scheduler.

En perfiles reducidos se desactivan animaciones, partículas, agua avanzada, sombras o modelos antes de degradar datos políticos.

## Rendimiento y calidad

Los cinco perfiles configuran escala de resolución, pixel ratio, objetivo de FPS, terreno, sombras, agua, modelos 3D, animaciones, partículas, vegetación, densidad urbana, distancia y antialiasing.

- Automático considera memoria declarada, núcleos, pixel ratio, ancho de viewport y movimiento reducido.
- Ultra prioriza 60 FPS objetivo y todos los efectos.
- Alto mantiene modelos y efectos con densidad moderada.
- Medio apunta a 45 FPS, reduce resolución/densidad y elimina partículas.
- Bajo apunta a 30 FPS, desactiva DEM, sombras, agua, modelos, animaciones, partículas y vegetación.

`PerformanceManager` mide duración media y percentil 95 de cuadros, cuadros omitidos y calidad efectiva. `LODManager` aplica límites de entidad y clustering. El contador de FPS es opcional: no forma parte del HUD mínimo.

Los objetivos declarados son presupuestos, no una afirmación de rendimiento universal. La validación real debe registrar dispositivo, viewport, perfil y escena, y se documenta por separado en `VALIDATION.md`.

## Fallos y funcionamiento sin conexión

La degradación prevista es:

```text
fuente detallada local
  → fuente local de menor escala
  → offline_fallback_land.geojson / missing-tile.svg
  → icono o geometría procedural
  → Canvas heredado si WebGL falla
```

- Un fallo DEM desactiva relieve y hillshade; los países y overlays continúan.
- Un modelo glTF ausente se reemplaza por geometría procedural o icono 2D.
- Un proveedor raster opcional que falla no afecta a las fuentes locales.
- Una pérdida del contexto WebGL activa el Canvas y muestra un aviso no intrusivo.
- El paquete no necesita servidores públicos de OpenStreetMap ni peticiones externas para el modo local incluido.

El DEM integrado solo cubre z0–z3. A mayor zoom, el terreno es una representación global de baja resolución salvo que el propietario configure un proveedor compatible. La geografía política y las entidades siguen funcionando a todos los LOD.

## Guardados, IndexedDB y migración

El formato v6 usa:

```text
version: 6.0.0
saveVersion: 60
mapDataVersion: natural-earth-v6
format: nexus-global-save
```

`SaveManager` empaqueta un payload clonado, aplica migraciones explícitas, calcula checksum y verifica integridad al abrirlo. La cadena actual es `52 → 53 → 54 → 60`. La migración registra cada par `from/to` una sola vez y un esquema posterior a 60 produce `FutureSaveVersionError` en lugar de sobrescribirse.

La migración `54 → 60` añade:

- estado de cámara, modo, capa, selección y calidad;
- EPSG:4326 y orden longitud/latitud;
- política de coordenadas persistentes/deterministas;
- `mapDataVersion` y registro v60;
- contenedor de coordenadas migradas sin eliminar datos heredados.

`IndexedSaveStore` usa `nexus-global-v6` y `campaign-saves` como base/almacén principal. Antes de escribir mantiene una copia recuperable en el soporte local cuando es posible; las copias grandes pueden comprimirse con `CompressionStream`. Si IndexedDB está ausente, bloqueado o falla, la campaña utiliza el fallback sin presentarlo como sincronización remota. Las cuentas y partidas siguen separadas por la clave suministrada por `NEXUS_AUTH`.

La exportación JSON conserva el contenedor, esquema y checksum. Importar una partida pasa por verificación, migración e hidratación. Reiniciar elimina solo la clave de la cuenta activa.

## GitHub Pages y construcción

La aplicación es estática. `index.html` carga dependencias locales versionadas, el bundle de compatibilidad, `core/entry.mjs` y el bootstrap modular mediante rutas relativas. No existe requisito de Node.js en producción.

`tools/build-v6-release.mjs` construye `dist/GlobalWWIII-v6.0.0.zip`, excluye `.git/` y `dist/`, comprueba rutas seguras, valida la raíz directa mediante `unzip -t` y genera un fichero `.sha256`. El ZIP incluye `index.html`, `404.html`, `.nojekyll`, código, assets, tests y documentación en su raíz, sin directorio envolvente.

La publicación prevista es `main` y `/ (root)`. El estado real del despliegue y la comprobación del navegador se registran en `VALIDATION.md`; la arquitectura por sí sola no implica que Pages esté validado.

## Contratos de validación

La batería v6 separa evidencia estructural de evidencia de navegador:

- `v6-map-ui-contract-validation.mjs`: tres modos, 58 capas, 4 LOD, perfiles, cámara y selección.
- `v6-assets-validation.mjs`: integridad, SHA-256, librerías, GIS, antimeridiano, CCAA/provincias, DEM, modelos y avisos.
- `v6-map-data-adapter-validation.mjs`: snapshot inmutable, 197 países, normalización, actualización diferencial y colocación determinista.
- `v6-save-migration-validation.mjs`: migraciones, idempotencia, integridad, rechazo de futuro, IndexedDB y recuperación.
- `v6-static-map-contract-validation.mjs`: rutas relativas, recursos estáticos y bundle congelado.
- `v6-release-validation.mjs`: raíz, integridad y SHA-256 del ZIP final.

Estos contratos no sustituyen la comprobación visual. Los modos, picking, cámara, antimeridiano, WebGL, responsive, fallback y consola deben validarse en un navegador real antes de declarar completa la versión.

## Extensión segura

Para añadir una fuente o capa:

1. Añadir datos fuera del código y registrar procedencia/licencia en el manifiesto.
2. Añadir el id lógico a `map-config.js` y `layers.json` sin reutilizar un id existente.
3. Normalizar el dominio en `MapDataAdapter`; no leer estructuras heredadas desde el renderer.
4. Elegir MapLibre, deck.gl o Three.js según geometría y densidad.
5. Definir modo, LOD, calidad y fallback.
6. Persistir solo intención visual o coordenadas lógicas, no objetos de librería.
7. Añadir contrato determinista y prueba en navegador proporcional al riesgo.

No deben añadirse nuevas capas `alpha-vXX.js`, una segunda cámara o otro propietario del estado territorial.
