# Licencias y atribuciones del mapa v6

Este documento acompaña a la distribución de Strategic Command v6.0.0. Resume las licencias del motor cartográfico y de sus datos; no sustituye los textos completos incluidos en `assets/vendor/`. Al copiar, publicar o modificar el proyecto deben conservarse este fichero, `THIRD_PARTY_NOTICES.md`, `MAP_DATA_SOURCES.md` y todos los avisos locales indicados a continuación.

`data/map-v1/assets-manifest.json` es el inventario autoritativo: registra cada asset por ruta, versión, origen, licencia, atribución, transformación, fecha de acceso, tamaño y SHA-256.

## Tabla de componentes

| Componente o dato | Versión/origen fijado | Licencia o condición | Aviso local obligatorio |
| --- | --- | --- | --- |
| MapLibre GL JS | 5.24.0 | BSD-3-Clause y avisos de componentes incluidos | `assets/vendor/maplibre-gl/5.24.0/LICENSE.txt` |
| deck.gl | 9.1.14 | MIT | `assets/vendor/deck.gl/9.1.14/LICENSE` |
| Three.js, GLTFLoader y BufferGeometryUtils | 0.180.0 | MIT | `assets/vendor/three/LICENSE` y `assets/vendor/three/0.180.0/LICENSE` |
| Natural Earth vector | commit `ca96624a56bd078437bca8184e78163e5039ad19` | Dominio público; se conserva la atribución recomendada | `assets/vendor/natural-earth/LICENSE.md` |
| `es-atlas` | 0.6.0 | Código MIT | `assets/vendor/es-atlas/0.6.0/package.json` y `README.md` |
| Geometrías IGN distribuidas por `es-atlas` | BDLJE/IGN | CC-BY 4.0 y condiciones IGN/CNIG | `assets/vendor/es-atlas/0.6.0/README.md` |
| Mapzen Terrain Tiles | snapshot Terrarium z0–z3 | Composición de fuentes abiertas con atribuciones específicas | `assets/vendor/mapzen-terrain/ATTRIBUTION.md` |
| Modelos glTF y texturas SVG de v6 | Generación propia del proyecto | MIT del proyecto | `LICENSE.txt` |

## MapLibre GL JS

La copia local se encuentra en `assets/vendor/maplibre-gl/5.24.0/`. MapLibre GL JS se distribuye bajo BSD-3-Clause e incorpora componentes con avisos adicionales. La redistribución del código o binarios debe conservar el copyright, las condiciones y el descargo completos presentes en `LICENSE.txt`.

Proyecto: <https://maplibre.org/maplibre-gl-js/>

## deck.gl

La copia local `assets/vendor/deck.gl/9.1.14/deck.gl.min.js` se distribuye bajo MIT. Debe conservarse el aviso de copyright y permiso de `assets/vendor/deck.gl/9.1.14/LICENSE` en copias sustanciales.

Proyecto: <https://deck.gl/>

## Three.js

`three.module.min.js`, `three.core.min.js`, `GLTFLoader.js` y `BufferGeometryUtils.js` corresponden a Three.js 0.180.0. Se distribuyen bajo MIT. Los dos módulos auxiliares solo se adaptan para importar las copias locales; esa transformación no elimina sus obligaciones.

Proyecto: <https://threejs.org/>

## Natural Earth

Los países, Admin-1, ciudades, hidrografía, tierra, océano, carreteras, ferrocarriles, puertos y aeropuertos derivan de Natural Earth y se fijan al commit documentado en el manifiesto. Natural Earth declara sus datos raster y vectoriales de dominio público. Aunque no exige crédito, la interfaz y la documentación mantienen la atribución recomendada:

> Made with Natural Earth

Texto completo: `assets/vendor/natural-earth/LICENSE.md`

Términos: <https://www.naturalearthdata.com/about/terms-of-use/>

Los GeoJSON de este repositorio pueden estar filtrados, simplificados, redondeados o reducidos en atributos. Las transformaciones exactas se registran por asset. Los datos no deben utilizarse para navegación.

## España: es-atlas e IGN/CNIG

Las 17 comunidades autónomas y 50 provincias proceden de `es-atlas` 0.6.0, cuyo código es MIT, generado a partir de datos del Instituto Geográfico Nacional. Las geometrías de origen están sujetas a CC-BY 4.0 y a las condiciones indicadas por IGN/CNIG.

Debe conservarse y mostrarse de forma accesible:

> Obra derivada de BDLJE CC-BY 4.0 ign.es

Repositorio: <https://github.com/martgnz/es-atlas/tree/v0.6.0>

Aviso legal CNIG: <https://centrodedescargas.cnig.es/CentroDescargas/aviso-legal>

`spain_special_territories.json` separa Ceuta, Melilla y Gibraltar para impedir que se contabilicen como una comunidad o provincia adicional. Esa separación cartográfica no constituye una afirmación política del simulador.

## Mapzen Terrain Tiles y proveedores DEM

Las 85 teselas Terrarium incluidas en `assets/maps/v6/dem/` proceden del conjunto Mapzen Terrain Tiles en AWS Open Data. Mapzen combina fuentes con licencias y fórmulas de crédito diferentes. El aviso completo y redistribuible es:

`assets/vendor/mapzen-terrain/ATTRIBUTION.md`

La atribución resumida visible puede ser:

> Mapzen Terrain Tiles y proveedores DEM

Pero la redistribución debe mantener accesible el aviso completo, que incluye, entre otros:

- ArcticDEM/DigitalGlobe y los premios NSF indicados en el aviso;
- Geoscience Australia;
- modelo de elevación de Austria;
- Open Government Licence – Canada;
- EU-DEM/Copernicus;
- ETOPO1/NOAA;
- INEGI México;
- LINZ/Nueva Zelanda;
- Kartverket/Noruega;
- Environment Agency/Reino Unido;
- USGS 3DEP, GMTED2010 y SRTM.

Registro AWS: <https://registry.opendata.aws/terrain-tiles/>

Atribución de Joerd fijada como referencia: <https://github.com/tilezen/joerd/blob/0b86765156d0612d837548c2cf70376c43b3405c/docs/attribution.md>

El relieve es una visualización general y no es apto para navegación, ingeniería, defensa real ni análisis de riesgos.

## Modelos y texturas del proyecto

Los glTF de `assets/models/` y SVG de `assets/textures/` se generan dentro del proyecto, se distribuyen bajo `LICENSE.txt` y no incorporan texturas o binarios externos. Son representaciones estilizadas; no acreditan fabricante, escala ni configuración exacta de una plataforma real.

## Proveedor raster o DEM configurable

El paquete no incluye mosaicos públicos de OpenStreetMap y no usa sus servidores estándar como infraestructura de producción. El propietario puede configurar un proveedor externo mediante `NEXUS_MAP_TILE_PROVIDER` o `NEXUS_MAP_PROVIDERS`. Ese proveedor no forma parte de esta distribución.

Quien lo configure es responsable de:

- tener derecho a usar el servicio y respetar sus límites;
- indicar la URL y versión correctas;
- proporcionar la atribución exigida;
- cumplir términos de caché, privacidad y redistribución;
- no presentar el modo externo como disponible sin conexión.

La aplicación muestra la cadena de atribución configurada y vuelve a los datos locales cuando ese proveedor falla.

## Atribución mínima en la interfaz

La interfaz del mapa debe mantener accesible, como mínimo:

```text
Natural Earth · IGN/es-atlas · Mapzen Terrain · MapLibre/deck.gl/Three.js
```

La forma abreviada no sustituye los ficheros completos. Debe enlazar o conducir a estos avisos cuando el medio lo permita.

## Redistribución

Antes de publicar un fork o ZIP:

1. No borrar `assets/vendor/**/LICENSE*`, `README.md` o `ATTRIBUTION.md`.
2. Conservar `LICENSE.txt`, `THIRD_PARTY_NOTICES.md`, `MAP_DATA_SOURCES.md` y este documento.
3. Regenerar y verificar `data/map-v1/assets-manifest.json` si cambia cualquier asset.
4. Añadir al manifiesto cualquier fuente GIS, modelo o textura nueva con licencia y transformación explícitas.
5. Revisar por separado los avisos de fotografías militares heredadas en `THIRD_PARTY_NOTICES.md`.
6. No afirmar que una fuente pública garantiza exactitud, actualidad o idoneidad operativa.

La licencia MIT del proyecto no convierte datos de terceros en MIT ni elimina sus atribuciones.
