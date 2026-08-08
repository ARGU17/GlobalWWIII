# Avisos de datos, software y referencias

Strategic Command v6.0.0 incluye dependencias WebGL y datos cartográficos locales de terceros. La tabla completa, las obligaciones de redistribución y las atribuciones visibles están en [LICENSES_MAP_V6.md](LICENSES_MAP_V6.md); procedencia, transformación, tamaño y SHA-256 de cada asset están en `data/map-v1/assets-manifest.json`.

## Motor WebGL local

- MapLibre GL JS 5.24.0 — BSD-3-Clause y avisos incluidos: `assets/vendor/maplibre-gl/5.24.0/LICENSE.txt`.
- deck.gl 9.1.14 — MIT: `assets/vendor/deck.gl/9.1.14/LICENSE`.
- Three.js, GLTFLoader y BufferGeometryUtils 0.180.0 — MIT: `assets/vendor/three/LICENSE`.

Las copias se distribuyen dentro del repositorio y la versión publicada no depende de un CDN.

## Natural Earth

Los límites, territorios, ciudades, ríos, lagos, tierra, océano, carreteras, ferrocarriles, puertos y aeropuertos locales se basan en Natural Earth, fijado al commit registrado en el manifiesto. Natural Earth declara sus datos de dominio público. Se mantiene la atribución recomendada `Made with Natural Earth`.

Proyecto: <https://www.naturalearthdata.com/>

Aviso local: `assets/vendor/natural-earth/LICENSE.md`

## Mapzen Terrain Tiles

El relieve global de baja resolución usa 85 teselas Terrarium Mapzen entre z0 y z3. El conjunto combina fuentes con obligaciones diferentes. Debe conservarse `assets/vendor/mapzen-terrain/ATTRIBUTION.md`, que enumera los créditos de ArcticDEM, Geoscience Australia, Austria, Canadá, Copernicus/EU-DEM, NOAA, INEGI, LINZ, Kartverket, Environment Agency y USGS, entre otros.

Registro: <https://registry.opendata.aws/terrain-tiles/>

## España: es-atlas e Instituto Geográfico Nacional

Las 17 comunidades autónomas y 50 provincias españolas proceden de `es-atlas` 0.6.0, proyecto de Martín González generado a partir de cartografía del Instituto Geográfico Nacional. El paquete es MIT; las geometrías de origen están bajo CC-BY 4.0 y condiciones IGN/CNIG.

Debe conservarse la atribución:

> Obra derivada de BDLJE CC-BY 4.0 ign.es

Repositorio: <https://github.com/martgnz/es-atlas/tree/v0.6.0>

Avisos locales: `assets/vendor/es-atlas/0.6.0/README.md` y `package.json`

## Proveedores cartográficos opcionales

El paquete v6 no incluye mosaicos OpenStreetMap ni usa sus servidores públicos estándar como backend de producción. Puede configurarse un proveedor raster o DEM externo; quien lo configure debe aportar su atribución y respetar licencia, límites y condiciones del servicio. Si el proveedor falla, el mapa mantiene las geometrías locales.

## Fotografías militares · Wikimedia Commons

Las miniaturas de `assets/military/` proceden de Wikimedia Commons. Se distribuyen en resolución reducida y se usan con finalidad ilustrativa. En las páginas enlazadas consta su autoría y licencia; las seleccionadas son obras de dominio público de organismos de Estados Unidos o material marcado como dominio público/CC0.

- Caza F-35A: <https://commons.wikimedia.org/wiki/File:An_F-35A_Lightning_II.jpg>
- Carro M1A2 Abrams: <https://commons.wikimedia.org/wiki/File:M1A2_SEP_V3_Abrams.jpg>
- Artillería HIMARS: <https://commons.wikimedia.org/wiki/File:HIMARS.jpg>
- Defensa aérea Patriot: <https://commons.wikimedia.org/wiki/File:Patriot_missile_is_launched.jpg>
- Vehículo M2A4 Bradley: <https://commons.wikimedia.org/wiki/File:M2A4_Bradley_(4).jpg>
- Infantería en patrulla: <https://commons.wikimedia.org/wiki/File:Flickr_-_The_U.S._Army_-_Afghanistan_patrol_(1).jpg>
- Dron MQ-9 Reaper: <https://commons.wikimedia.org/wiki/File:MQ-9_Reaper_UAV.jpg>
- Bombardero B-2 Spirit: <https://commons.wikimedia.org/wiki/File:B-2_Spirit.jpg>
- Transporte C-17: <https://commons.wikimedia.org/wiki/File:C-17_Globemaster_III_above_the_clouds.jpg>
- Destructor USS Milius: <https://commons.wikimedia.org/wiki/File:US_Navy_120125-N-XO220-481_The_Arleigh_Burke-class_guided-missile_destroyer_USS_Milius_(DDG_69)_transits_the_Atlantic_Ocean.jpg>
- Portaaviones USS Gerald R. Ford: <https://commons.wikimedia.org/wiki/File:USS_Gerald_R._Ford_(CVN-78)_underway_in_the_Atlantic_Ocean_on_9_October_2022_(221009-N-TL968-1248).JPG>
- Submarino clase Virginia: <https://commons.wikimedia.org/wiki/File:A_Virginia-class_submarine_departs_San_Diego._(8476430866).jpg>
- Satélite NPP: <https://commons.wikimedia.org/wiki/File:NPP_satellite_in_cleanroom.jpg>
- US Cyber Command: <https://commons.wikimedia.org/wiki/File:United_States_Cyber_Command_patch.jpg>

Las fotografías representan familias visuales de capacidad. La imagen de una ficha no implica que el modelo exacto mostrado en el texto sea el de la fotografía.

## Empresas y marcas

Los nombres de empresas y marcas pertenecen a sus respectivos titulares. Se usan de forma descriptiva dentro de un escenario ficticio de simulación.

Las cotizaciones, capitalizaciones, ingresos, beneficios, márgenes, dividendos, PER, movimientos diarios y operaciones corporativas incluidos en el juego son enteramente simulados. No representan información financiera actual ni recomendaciones de inversión.
