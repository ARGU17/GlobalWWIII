# Fuentes cartográficas y dependencias del mapa v6

Este documento describe los recursos que se distribuyen con el repositorio para que el motor cartográfico funcione en GitHub Pages sin depender de un CDN. El inventario verificable está en `data/map-v1/assets-manifest.json`: cada entrada incluye ruta local, URL de origen, versión, licencia, atribución, transformación, fecha de acceso, tamaño y SHA-256.

## Dependencias WebGL fijadas

| Componente | Versión | Copia local | Licencia | Uso |
| --- | ---: | --- | --- | --- |
| MapLibre GL JS | 5.24.0 | `assets/vendor/maplibre-gl/5.24.0/` | BSD-3-Clause | Cámara, mapa base vectorial, terreno, capas y picking |
| deck.gl | 9.1.14 | `assets/vendor/deck.gl/9.1.14/deck.gl.min.js` | MIT | Grandes conjuntos de unidades, rutas, flujos y efectos |
| Three.js | 0.180.0 | `assets/vendor/three/` | MIT | Objetos 3D seleccionados y modelos ligeros |
| GLTFLoader | 0.180.0 | `assets/vendor/three/GLTFLoader.js` | MIT | Carga local de los modelos glTF 2.0 |

`GLTFLoader.js` y `BufferGeometryUtils.js` solo cambian sus importaciones para apuntar a los módulos locales. Three.js 0.180.0 divide el módulo en `three.module.min.js` y `three.core.min.js`; ambos están incluidos. Las copias versionadas permanecen bajo `assets/vendor/three/0.180.0/`, y la ruta corta se reserva para el renderer del mapa.

## Natural Earth

Los GeoJSON parten del repositorio `nvkelso/natural-earth-vector`, fijado al commit `ca96624a56bd078437bca8184e78163e5039ad19`. Natural Earth declara estos datos como dominio público. Se mantiene su atribución recomendada: **Made with Natural Earth**.

| Recurso local | Escala/filtro | Elementos | Función |
| --- | --- | ---: | --- |
| `ne_110m_admin_0_countries.geojson` | 1:110m | 177 | LOD mundial y selección política general |
| `ne_50m_admin_0_countries.geojson` | 1:50m | 242 | LOD continental/nacional, islas y territorios pequeños |
| `ne_10m_admin_0_countries.geojson` | 1:10m simplificado a `0,012°` | 258 | Contornos nacionales detallados al acercar la cámara |
| `ne_50m_admin_1_states_provinces.geojson` | 1:50m | 294 | Regiones administrativas disponibles a esta escala |
| `ne_10m_admin_1_states_provinces.geojson` | 1:10m simplificado a `0,04°` | 4.596 | Divisiones administrativas mundiales reales para LOD nacional/regional |
| `ne_50m_populated_places_simple.geojson` | `scalerank <= 7` | 1.239 | Capitales y ciudades principales |
| `ne_50m_rivers_lake_centerlines.geojson` | `scalerank <= 7` | 462 | Ríos principales |
| `ne_50m_lakes.geojson` | `scalerank <= 7` | 412 | Lagos principales |
| `ne_50m_land.geojson` | 1:50m | 1.420 polígonos | Masa terrestre física |
| `ne_50m_ocean.geojson` | 1:50m | 1 multipolígono | Océano físico |
| `ne_10m_roads_major.geojson` | `scalerank <= 3` | 10.024 | Red vial mundial principal |
| `ne_10m_railroads_major.geojson` | `scalerank <= 4` | 2.845 | Red ferroviaria mundial principal |
| `ne_10m_ports.geojson` | 1:10m | 1.081 | Puertos reales |
| `ne_10m_airports.geojson` | 1:10m | 893 | Aeropuertos reales |
| `offline_fallback_land.geojson` | 1:110m | 127 polígonos | Continentes cuando WebGL o una fuente detallada falla |

Los atributos se reducen a los identificadores y campos útiles para simulación, etiquetas y LOD. Las coordenadas generales se redondean a seis decimales. Los contornos 1:10m se simplifican de forma determinista con tolerancias distintas para países (`0,012°`) y Admin-1 (`0,04°`); las vías y ferrocarriles usan Ramer–Douglas–Peucker a `0,015°`, después de filtrar por importancia. El resultado conserva rutas y divisiones reales, pero no debe emplearse para navegación.

Los valores demográficos o de PIB que acompañan a Natural Earth corresponden a su edición (principalmente 2019). Sirven para reconciliar identificadores y mostrar contexto cartográfico; el estado económico actual del juego sigue siendo la fuente de verdad de la simulación.

## España: CCAA, provincias y territorios especiales

La fuente es `es-atlas` 0.6.0, que transforma datos del Instituto Geográfico Nacional. El código del paquete se distribuye bajo MIT; las geometrías de origen son datos IGN bajo licencia compatible con CC-BY 4.0. La atribución que debe mostrarse es:

> Obra derivada de BDLJE CC-BY 4.0 ign.es

Los ficheros se separan expresamente para evitar que una región ficticia sustituya a una división administrativa real:

- `spain_autonomous_regions.json`: exactamente las 17 comunidades autónomas.
- `spain_provinces.json`: exactamente las 50 provincias.
- `spain_special_territories.json`: Ceuta, Melilla y Gibraltar como tres geometrías separadas. No se presentan como una comunidad o provincia adicional.

Se conservan los arcos TopoJSON originales de `es-atlas`; el proceso solo filtra los objetos, por lo que las fronteras compartidas y las islas no se recalculan ni se inventan. La evidencia de licencia se incluye en `assets/vendor/es-atlas/0.6.0/README.md` y `package.json`.

## Relieve 3D local

`assets/maps/v6/dem/` contiene 85 teselas PNG Terrarium globales en niveles `z0` a `z3` (6,74 MiB). Proceden del conjunto público **Mapzen Terrain Tiles** alojado en AWS Open Data. El valor en metros se decodifica con:

```text
(R * 256 + G + B / 256) - 32768
```

`dem/tiles.json` es el TileJSON local y `dem/metadata.json` documenta proyección, extensión, codificación, resolución y origen. Esta pirámide es suficiente para relieve mundial sin red y para una transición 3D coherente. No pretende sustituir a un DEM regional de alta resolución: si el usuario configura un proveedor propio, el motor puede usar niveles superiores y regresar automáticamente al DEM local al fallar.

Mapzen combina varias fuentes con obligaciones diferentes. Debe conservarse y hacerse accesible `assets/vendor/mapzen-terrain/ATTRIBUTION.md`, que enumera ArcticDEM, Geoscience Australia, Austria, Canadá, EU-DEM/Copernicus, ETOPO1/NOAA, INEGI, LINZ, Kartverket, Environment Agency y USGS, entre otras. En la interfaz puede resumirse como **Mapzen Terrain Tiles y proveedores DEM**, con enlace al documento completo.

## Modelos y texturas propios

Los modelos de `assets/models/` son glTF 2.0 indexados, válidos y autocontenidos: llevan su buffer binario embebido y material `KHR_materials_unlit`. No son archivos vacíos ni referencias a recursos externos. Se generan de forma determinista bajo la licencia MIT del proyecto.

- Renderers principales: `unit-land.gltf`, `unit-air.gltf`, `unit-naval.gltf`, `industry.gltf`, `power.gltf` y `port.gltf`.
- Compatibilidad semántica: `military-unit.gltf`, `cargo-ship.gltf`, `freight-truck.gltf`, `industrial-plant.gltf`, `port-crane.gltf` y `airport-tower.gltf`.
- Texturas SVG: anillo de selección, trama de ocupación, agua, relieve, halo de unidades y tesela ausente.

Son modelos low-poly deliberadamente ligeros para el objeto seleccionado o para cantidades moderadas. Los grandes ejércitos y flujos se instancian mediante deck.gl; si falla la carga de un glTF, el renderer puede usar geometría procedural sin perder la entidad lógica.

## LOD y funcionamiento sin conexión

El paquete soporta cuatro niveles de detalle sin cambiar de modelo geográfico:

1. Global: países 110m, continentes y DEM z0-z3.
2. Continental: países/elementos físicos 50m y ciudades principales.
3. Nacional: países 1:10m, Admin-1 mundial, puertos, aeropuertos y redes de transporte filtradas.
4. Regional/operacional: Admin-1 mundial 1:10m y, para España, 17 CCAA y 50 provincias reales.

En modo íntegramente local no se realiza ninguna petición externa. Si falta una fuente, el orden de degradación es: fuente detallada local → fuente Natural Earth de menor escala → `offline_fallback_land.geojson` y `missing-tile.svg`. Las capas lógicas de países, selección, unidades y simulación permanecen activas aunque no haya terreno.

## Reproducir y validar

Con Node.js 20 o posterior:

```bash
node tools/build-map-assets.mjs
node tools/build-map-assets.mjs --verify-only
node tests/v6-assets-validation.mjs
```

La reconstrucción descarga únicamente URLs fijadas por versión o commit, aplica transformaciones deterministas y vuelve a generar el manifiesto. `--verify-only` no usa red: recalcula tamaño y SHA-256 de cada fichero existente. Puede fijarse la fecha con `SOURCE_DATE_EPOCH`; si no se define, esta entrega usa `2026-07-30`.

## Referencias y licencias

- Natural Earth: <https://www.naturalearthdata.com/about/terms-of-use/>
- Repositorio Natural Earth fijado: <https://github.com/nvkelso/natural-earth-vector/tree/ca96624a56bd078437bca8184e78163e5039ad19>
- es-atlas 0.6.0: <https://github.com/martgnz/es-atlas/tree/v0.6.0>
- Licencia de datos IGN/CNIG: <https://centrodedescargas.cnig.es/CentroDescargas/aviso-legal>
- Registro AWS de Terrain Tiles: <https://registry.opendata.aws/terrain-tiles/>
- Atribución completa Mapzen/Joerd: <https://github.com/tilezen/joerd/blob/0b86765156d0612d837548c2cf70376c43b3405c/docs/attribution.md>
- MapLibre GL JS: <https://maplibre.org/maplibre-gl-js/docs/>
- deck.gl: <https://deck.gl/>
- Three.js: <https://threejs.org/>

No deben borrarse los avisos de `assets/vendor/` ni las atribuciones anteriores al redistribuir el juego.
