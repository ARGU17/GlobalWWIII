# Auditoría previa del motor cartográfico v6.0.0

Fecha: 30 de julio de 2026  
Alcance: estado, simulación, mapa, guardados, territorios, unidades, instalaciones, comercio, guerra, dependencias y validación.

## Resultado ejecutivo

La versión v5.4.1 conserva las 197 entidades políticas y todos los sistemas jugables, pero el mapa sigue siendo un renderer Canvas 2D monolítico. El nuevo motor debe colocarse delante de este renderer sin convertir MapLibre, deck.gl o Three.js en propietarios del estado de simulación. El Canvas actual se conservará como fallback local y funcional.

La integración adoptará un único modelo geográfico normalizado:

```text
GameState legado + v5/v5.1/v5.2/v5.4
  -> MapDataAdapter inmutable
  -> MapEngine / MapState / CameraController / SelectionManager
  -> MapLibre + deck.gl + Three.js
  -> CanvasFallbackRenderer
```

## Runtime actual

Orden real de carga:

```text
index.html
  -> compat/legacy-v52.bundle.js
  -> core/entry.mjs
  -> ui/bootstrap.mjs
  -> js/map.js
  -> js/v51/ui.js
  -> js/v52/ui.js
  -> js/ui.js
  -> js/app.js
```

`core/entry.mjs` envuelve el estado heredado y ejecuta después los trece sistemas modulares. El propietario de la simulación jugable completa sigue siendo `compat.v52`; v5.4 añade dominios y métricas, pero no sustituye el tick legado.

## Motor cartográfico actual

`js/map.js` contiene en un único módulo:

- cámara Mercator y tratamiento básico del antimeridiano;
- países, selección y capas temáticas;
- regiones españolas poligonales y regiones extranjeras circulares;
- instalaciones, unidades y movimientos;
- comercio marítimo/terrestre, barcos y camiones;
- batallas, arcos de frente y campañas;
- carga opcional de mosaicos OSM públicos.

Su API pública es `initialize`, `render`, `focusCountry`, `focusRegion` y `showWorld`. La fachada v6 conservará estos métodos y añadirá `setMapMode`, `setMapLayer`, `selectCountry`, `selectRegion`, `updateMapEntities` y los cinco métodos de refresco por dominio exigidos.

## Estado y compatibilidad que no se puede romper

- `selectedCountryId`, `selectedRegionId`, `mapCenter`, `mapZoom`, `mapBase` y `mapLayer`.
- `mapMode` conserva su significado heredado `world | regions`; el modo visual vive en `mapView.mode`.
- Los callbacks `selectCountry(countryId)` y `selectRegion(countryId, regionId)` siguen delegando en `NEXUS_ACTIONS`.
- Países no soberanos permanecen en el histórico; el mapa resuelve `ownerId`, `controllerId`, `annexedBy`, `occupiedBy` y `vassalOf`.
- El color político se deriva del propietario y el control militar del controlador, sin confundir ambos.
- Se preservan las velocidades x1, x2, x4, x16 y x32 y su limitación de refresco.

## Datos territoriales auditados

- `assets/maps/world-countries.geojson`: 206 features, 204 ISO3 únicos y cobertura de los 197 países simulados. Rusia, Canadá y Estados Unidos son multipolígonos. Chipre y Somalia tienen ISO duplicado y requieren IDs estables por feature.
- `assets/maps/spain-autonomous-regions.topojson`: en realidad es GeoJSON y declara geometrías aproximadas. Debe sustituirse por el dataset real y local de es-atlas, incluyendo provincias.
- No existen actualmente LOD 110m/50m/10m, ríos, lagos, carreteras, ferrocarriles, puertos, aeropuertos, ciudades, relieve, landcover, DEM, GLB/GLTF ni texturas optimizadas.
- De 1.016 regiones estratégicas, 665 centros sintéticos quedan fuera de su país. Además, 2.758 nodos logísticos, 217 ciudades, 872 plantas y 2.154 formaciones no tienen coordenadas propias.

Los assets v6 se versionarán localmente, tendrán procedencia/licencia/checksum y se cargarán progresivamente por LOD. No se utilizará `tile.openstreetmap.org` como proveedor de producción.

## Fuentes canónicas para el adaptador

- Países: `state.countries` y soberanía/propiedad vigente.
- Regiones: `NEXUS_ECONOMY.getCountryRegions()` y `getRegion()`.
- Instalaciones: `facilitiesForCountry()` y `facilitiesInRegion()`.
- Unidades visibles: `country.units`; las formaciones v5.2 se enlazan por ID, no se renderizan como duplicado.
- Comercio visible: `state.tradeRoutes`; la red v5 y la logística v5.1 se normalizan como fuentes adicionales.
- Guerra: `state.wars`, `state.regionBattles`, campañas, teatros, zonas de ocupación y expedientes de posguerra.

El mapa solo leerá snapshots del adaptador y nunca escribirá directamente en los dominios de economía, diplomacia o guerra.

## Guardados y migración

El estado inicial serializado ocupa aproximadamente 30,19 MiB. `localStorage` no es un soporte suficiente y el test existente solo valida serialización en memoria.

La versión v6 adopta:

- `schema = 60`, `saveVersion = "6.0.0"`, `mapDataVersion = 1` y `migrationLog`;
- migración explícita 54 -> 60, determinista e idempotente;
- coordenadas persistentes con `coordinateSource` y `coordinateVersion`;
- enlace real entre unidad legacy y formación;
- rechazo de guardados creados por un esquema futuro;
- IndexedDB como almacenamiento principal y `localStorage` solo para metadatos/fallback;
- copia de recuperación antes de migrar y error visible en vez de reemplazar silenciosamente la campaña.

## Riesgos de integración WebGL

- La cámara Canvas usa mundo de 256 px y MapLibre 512 px: la cámara lógica evita saltos de escala.
- Los tres modos compartirán un único style graph; no se ejecutará `setStyle()` al cambiar.
- La selección tendrá una prioridad única: UI, unidades/instalaciones, regiones y países.
- deck.gl se integrará de forma interleaved y Three.js como custom layer para compartir cámara/contexto.
- Los recursos se resolverán mediante URL relativa compatible con el subdirectorio de GitHub Pages.
- Habrá listeners de pérdida/restauración WebGL, fallo de tiles, DEM y modelos.
- Las actualizaciones se separarán por revisión de dominio; no se reenviará todo el mundo cada tick.

## Validación mínima obligatoria

1. Regresión completa v1.8-v5.4.1.
2. Contratos de los tres modos, transición, cámara y selección.
3. Rusia, Canadá, Alaska, antimeridiano, archipiélagos y las 17 comunidades españolas.
4. Coordenadas deterministas dentro del territorio para entidades migradas.
5. Barcos en rutas marítimas, unidades e industrias en regiones, frentes y ocupaciones.
6. Guardado v54 real -> v60, idempotencia, rollback y rechazo de save futuro.
7. Tiles, DEM y modelos fallidos; modo offline y WebGL deshabilitado.
8. Navegador real en escritorio, tableta y móvil, con consola limpia.
9. Presupuesto de rendimiento, validación de GitHub Pages y ZIP con raíz exacta.

## Decisiones

- Versión del producto: v6.0.0.
- Esquema de guardado: 60.
- Motor principal: MapLibre GL JS con overlays deck.gl y Three.js locales de versión fijada.
- Fallback: renderer Canvas existente, desacoplado y conservado íntegramente.
- Datos: Natural Earth multiescala y es-atlas locales; proveedor DEM configurable con fallback de relieve local.
- Propiedad: `MapEngine` es dueño exclusivo de `MapState`; el estado de juego sigue perteneciendo a la simulación.

