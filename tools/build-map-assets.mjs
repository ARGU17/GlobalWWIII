#!/usr/bin/env node
/**
 * Reproducible GIS/vendor asset builder for the v6 map engine.
 *
 * The checked-in output is deliberately self-contained so GitHub Pages can
 * render the political and physical map without a CDN. Run with Node >= 20.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DATE = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString().slice(0, 10)
  : "2026-07-30";
const USER_AGENT = "GlobalWWIII-map-assets/6.0 (+https://github.com/ARGU17/GlobalWWIII)";
const NE_COMMIT = "ca96624a56bd078437bca8184e78163e5039ad19";
const JOERD_COMMIT = "0b86765156d0612d837548c2cf70376c43b3405c";
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_COMMIT}/geojson`;
const records = [];

const textEncoder = new TextEncoder();

function asBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(String(value));
}

function sha256(value) {
  return createHash("sha256").update(asBuffer(value)).digest("hex");
}

async function fetchBytes(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  throw new Error(`No se pudo descargar ${url}: ${lastError?.message || lastError}`);
}

async function fetchJson(url) {
  return JSON.parse((await fetchBytes(url)).toString("utf8"));
}

async function emit(path, value, metadata) {
  const absolute = join(ROOT, path);
  const bytes = asBuffer(value);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  records.push({
    id: metadata.id,
    kind: metadata.kind,
    path,
    version: metadata.version,
    source: metadata.source,
    license: metadata.license,
    attribution: metadata.attribution,
    transform: metadata.transform || "none",
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
    accessedAt: BUILD_DATE
  });
}

async function download(path, metadata) {
  return emit(path, await fetchBytes(metadata.source), metadata);
}

function roundNumber(number, precision = 6) {
  if (!Number.isFinite(number)) return number;
  const scale = 10 ** precision;
  return Math.round(number * scale) / scale;
}

function roundCoordinates(value, precision = 6) {
  if (!Array.isArray(value)) return value;
  if (typeof value[0] === "number") return value.map((number) => roundNumber(number, precision));
  return value.map((part) => roundCoordinates(part, precision));
}

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyLine(points, tolerance) {
  if (!Array.isArray(points) || points.length <= 2 || tolerance <= 0) return points;
  const squaredTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let index = -1;
    let maxDistance = squaredTolerance;
    for (let cursor = first + 1; cursor < last; cursor += 1) {
      const distance = squaredSegmentDistance(points[cursor], points[first], points[last]);
      if (distance > maxDistance) {
        index = cursor;
        maxDistance = distance;
      }
    }
    if (index >= 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

function simplifyRing(points, tolerance) {
  if (!Array.isArray(points) || points.length <= 8 || tolerance <= 0) return points;
  const closed = points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1];
  const open = closed ? points.slice(0, -1) : [...points];
  const middle = Math.floor(open.length / 2);
  const firstHalf = simplifyLine(open.slice(0, middle + 1), tolerance);
  const secondHalf = simplifyLine([...open.slice(middle), open[0]], tolerance);
  const simplified = [...firstHalf, ...secondHalf.slice(1)];
  if (simplified.length < 4) return points;
  if (simplified.at(-1)[0] !== simplified[0][0] || simplified.at(-1)[1] !== simplified[0][1]) simplified.push(simplified[0]);
  return simplified;
}

function transformGeometry(geometry, options = {}) {
  if (!geometry) return geometry;
  const precision = options.precision ?? 6;
  let coordinates = geometry.coordinates;
  if (options.lineTolerance && geometry.type === "LineString") {
    coordinates = simplifyLine(coordinates, options.lineTolerance);
  } else if (options.lineTolerance && geometry.type === "MultiLineString") {
    coordinates = coordinates.map((line) => simplifyLine(line, options.lineTolerance));
  } else if (options.polygonTolerance && geometry.type === "Polygon") {
    coordinates = coordinates.map((ring) => simplifyRing(ring, options.polygonTolerance));
  } else if (options.polygonTolerance && geometry.type === "MultiPolygon") {
    coordinates = coordinates.map((polygon) => polygon.map((ring) => simplifyRing(ring, options.polygonTolerance)));
  }
  return { ...geometry, coordinates: roundCoordinates(coordinates, precision) };
}

function featureCollection(source, options = {}) {
  const selected = source.features
    .filter((feature) => !options.filter || options.filter(feature))
    .map((feature, index) => {
      const properties = options.properties ? options.properties(feature.properties || {}) : (feature.properties || {});
      const id = options.id ? options.id(feature, index) : (feature.id ?? properties.id ?? index);
      return {
        type: "Feature",
        id: String(id),
        properties,
        geometry: transformGeometry(feature.geometry, options)
      };
    });
  return { type: "FeatureCollection", features: selected };
}

function jsonLine(value) {
  return `${JSON.stringify(value)}\n`;
}

function countryProperties(properties) {
  const iso3 = properties.ADM0_A3 || properties.ISO_A3 || properties.SU_A3;
  return {
    id: iso3,
    iso2: properties.ISO_A2,
    iso3,
    name: properties.NAME,
    name_es: properties.NAME_ES || properties.NAME,
    name_long: properties.NAME_LONG || properties.NAME,
    sovereign: properties.SOVEREIGNT || properties.NAME,
    continent: properties.CONTINENT,
    subregion: properties.SUBREGION,
    type: properties.TYPE,
    economy: properties.ECONOMY,
    income_group: properties.INCOME_GRP,
    population_estimate: properties.POP_EST,
    population_year: properties.POP_YEAR,
    gdp_musd: properties.GDP_MD,
    gdp_year: properties.GDP_YEAR,
    label_longitude: properties.LABEL_X,
    label_latitude: properties.LABEL_Y,
    min_label_zoom: properties.MIN_LABEL,
    wikidata_id: properties.WIKIDATAID
  };
}

function simplePhysicalProperties(properties) {
  return {
    name: properties.name || properties.NAME || null,
    name_es: properties.name_es || properties.NAME_ES || properties.name || properties.NAME || null,
    scalerank: properties.scalerank ?? properties.SCALERANK ?? null,
    feature_class: properties.featurecla || properties.FEATURECLA || null
  };
}

async function buildVendorDependencies() {
  const vendor = [
    {
      id: "maplibre-gl-js",
      kind: "runtime-library",
      version: "5.24.0",
      source: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js",
      path: "assets/vendor/maplibre-gl/5.24.0/maplibre-gl.js",
      license: "BSD-3-Clause",
      attribution: "MapLibre contributors"
    },
    {
      id: "maplibre-gl-css",
      kind: "runtime-stylesheet",
      version: "5.24.0",
      source: "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css",
      path: "assets/vendor/maplibre-gl/5.24.0/maplibre-gl.css",
      license: "BSD-3-Clause",
      attribution: "MapLibre contributors"
    },
    {
      id: "maplibre-gl-license",
      kind: "license",
      version: "5.24.0",
      source: "https://unpkg.com/maplibre-gl@5.24.0/LICENSE.txt",
      path: "assets/vendor/maplibre-gl/5.24.0/LICENSE.txt",
      license: "BSD-3-Clause",
      attribution: "MapLibre contributors"
    },
    {
      id: "deck-gl",
      kind: "runtime-library",
      version: "9.1.14",
      source: "https://unpkg.com/deck.gl@9.1.14/dist.min.js",
      path: "assets/vendor/deck.gl/9.1.14/deck.gl.min.js",
      license: "MIT",
      attribution: "Copyright OpenJS Foundation and deck.gl contributors"
    },
    {
      id: "deck-gl-license",
      kind: "license",
      version: "9.1.14",
      source: "https://unpkg.com/deck.gl@9.1.14/LICENSE",
      path: "assets/vendor/deck.gl/9.1.14/LICENSE",
      license: "MIT",
      attribution: "Copyright OpenJS Foundation and deck.gl contributors"
    },
    {
      id: "three-js",
      kind: "runtime-library",
      version: "0.180.0",
      source: "https://unpkg.com/three@0.180.0/build/three.module.min.js",
      path: "assets/vendor/three/0.180.0/three.module.min.js",
      license: "MIT",
      attribution: "Copyright three.js authors"
    },
    {
      id: "three-js-core",
      kind: "runtime-library",
      version: "0.180.0",
      source: "https://unpkg.com/three@0.180.0/build/three.core.min.js",
      path: "assets/vendor/three/0.180.0/three.core.min.js",
      license: "MIT",
      attribution: "Copyright three.js authors"
    },
    {
      id: "three-js-map-runtime",
      kind: "runtime-library",
      version: "0.180.0",
      source: "https://unpkg.com/three@0.180.0/build/three.module.min.js",
      path: "assets/vendor/three/three.module.min.js",
      license: "MIT",
      attribution: "Copyright three.js authors"
    },
    {
      id: "three-js-map-runtime-core",
      kind: "runtime-library",
      version: "0.180.0",
      source: "https://unpkg.com/three@0.180.0/build/three.core.min.js",
      path: "assets/vendor/three/three.core.min.js",
      license: "MIT",
      attribution: "Copyright three.js authors"
    },
    {
      id: "three-js-license",
      kind: "license",
      version: "0.180.0",
      source: "https://unpkg.com/three@0.180.0/LICENSE",
      path: "assets/vendor/three/0.180.0/LICENSE",
      license: "MIT",
      attribution: "Copyright three.js authors"
    },
    {
      id: "three-js-map-runtime-license",
      kind: "license",
      version: "0.180.0",
      source: "https://unpkg.com/three@0.180.0/LICENSE",
      path: "assets/vendor/three/LICENSE",
      license: "MIT",
      attribution: "Copyright three.js authors"
    },
    {
      id: "natural-earth-license",
      kind: "license",
      version: NE_COMMIT,
      source: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_COMMIT}/LICENSE.md`,
      path: "assets/vendor/natural-earth/LICENSE.md",
      license: "Public Domain",
      attribution: "Made with Natural Earth"
    },
    {
      id: "es-atlas-package-metadata",
      kind: "license-metadata",
      version: "0.6.0",
      source: "https://unpkg.com/es-atlas@0.6.0/package.json",
      path: "assets/vendor/es-atlas/0.6.0/package.json",
      license: "MIT",
      attribution: "Martín González; source geometry: Instituto Geográfico Nacional de España"
    },
    {
      id: "es-atlas-readme-data-license",
      kind: "license-attribution",
      version: "0.6.0",
      source: "https://raw.githubusercontent.com/martgnz/es-atlas/aec9372249640fde14434b407618ed748cce27b8/README.md",
      path: "assets/vendor/es-atlas/0.6.0/README.md",
      license: "MIT package; CC-BY 4.0 IGN source data",
      attribution: "Obra derivada de BDLJE CC-BY 4.0 ign.es"
    },
    {
      id: "mapzen-terrain-attribution",
      kind: "license-attribution",
      version: JOERD_COMMIT,
      source: `https://raw.githubusercontent.com/tilezen/joerd/${JOERD_COMMIT}/docs/attribution.md`,
      path: "assets/vendor/mapzen-terrain/ATTRIBUTION.md",
      license: "Multiple open-data licences; see bundled attribution",
      attribution: "Mapzen Terrain Tiles and listed DEM providers"
    }
  ];
  for (const item of vendor) await download(item.path, item);

  const bufferUtilsSource = "https://unpkg.com/three@0.180.0/examples/jsm/utils/BufferGeometryUtils.js";
  const loaderSource = "https://unpkg.com/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
  const bufferUtils = (await fetchBytes(bufferUtilsSource)).toString("utf8")
    .replace("from 'three';", "from './three.module.min.js';");
  const loader = (await fetchBytes(loaderSource)).toString("utf8")
    .replace("from 'three';", "from './three.module.min.js';")
    .replace("from '../utils/BufferGeometryUtils.js';", "from './BufferGeometryUtils.js';");
  await emit("assets/vendor/three/BufferGeometryUtils.js", bufferUtils, {
    id: "three-buffer-geometry-utils",
    kind: "runtime-module",
    version: "0.180.0",
    source: bufferUtilsSource,
    license: "MIT",
    attribution: "Copyright three.js authors",
    transform: "bare module specifier changed to local ./three.module.min.js"
  });
  await emit("assets/vendor/three/GLTFLoader.js", loader, {
    id: "three-gltf-loader",
    kind: "runtime-module",
    version: "0.180.0",
    source: loaderSource,
    license: "MIT",
    attribution: "Copyright three.js authors",
    transform: "imports changed to local Three.js and BufferGeometryUtils modules"
  });
}

async function buildNaturalEarth() {
  const datasets = [
    {
      id: "ne-110m-admin-0-countries",
      sourceName: "ne_110m_admin_0_countries.geojson",
      output: "assets/maps/v6/ne_110m_admin_0_countries.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "properties reduced; coordinates rounded to 6 decimals",
      options: {
        properties: countryProperties,
        id: (feature) => feature.properties.ADM0_A3 || feature.properties.ISO_A3 || feature.properties.SU_A3
      }
    },
    {
      id: "ne-50m-admin-0-countries",
      sourceName: "ne_50m_admin_0_countries.geojson",
      output: "assets/maps/v6/ne_50m_admin_0_countries.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "properties reduced; coordinates rounded to 6 decimals",
      options: {
        properties: countryProperties,
        id: (feature) => feature.properties.ADM0_A3 || feature.properties.ISO_A3 || feature.properties.SU_A3
      }
    },
    {
      id: "ne-10m-admin-0-countries",
      sourceName: "ne_10m_admin_0_countries.geojson",
      output: "assets/maps/v6/ne_10m_admin_0_countries.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "LOD 3; ring simplification 0.012 degrees; properties reduced; coordinates rounded to 6 decimals",
      options: {
        polygonTolerance: 0.012,
        properties: countryProperties,
        id: (feature) => feature.properties.ADM0_A3 || feature.properties.ISO_A3 || feature.properties.SU_A3
      }
    },
    {
      id: "ne-50m-admin-1",
      sourceName: "ne_50m_admin_1_states_provinces.geojson",
      output: "assets/maps/v6/ne_50m_admin_1_states_provinces.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "properties reduced; coordinates rounded to 6 decimals",
      options: {
        properties: (p) => ({
          id: p.adm1_code,
          iso_3166_2: p.iso_3166_2,
          country_iso3: p.adm0_a3,
          country: p.admin,
          name: p.name,
          name_es: p.name_es || p.name,
          local_name: p.name_local || p.name,
          type: p.type_en || p.type,
          region: p.region,
          latitude: p.latitude,
          longitude: p.longitude,
          min_label_zoom: p.min_label,
          min_zoom: p.min_zoom,
          wikidata_id: p.wikidataid
        }),
        id: (feature, index) => feature.properties.adm1_code || feature.properties.iso_3166_2 || `adm1-${index}`
      }
    },
    {
      id: "ne-10m-admin-1",
      sourceName: "ne_10m_admin_1_states_provinces.geojson",
      output: "assets/maps/v6/ne_10m_admin_1_states_provinces.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "global Admin-1 LOD 1-3; ring simplification 0.04 degrees; properties reduced",
      options: {
        polygonTolerance: 0.04,
        precision: 5,
        properties: (p) => ({
          id: p.adm1_code,
          iso_3166_2: p.iso_3166_2,
          country_iso3: p.adm0_a3,
          country: p.admin,
          name: p.name,
          name_es: p.name_es || p.name,
          local_name: p.name_local || p.name,
          type: p.type_en || p.type,
          region: p.region,
          latitude: p.latitude,
          longitude: p.longitude,
          min_label_zoom: p.min_label,
          min_zoom: p.min_zoom,
          wikidata_id: p.wikidataid
        }),
        id: (feature, index) => feature.properties.adm1_code || feature.properties.iso_3166_2 || `adm1-detail-${index}`
      }
    },
    {
      id: "ne-50m-populated-places",
      sourceName: "ne_50m_populated_places_simple.geojson",
      output: "assets/maps/v6/ne_50m_populated_places_simple.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "scalerank <= 7; properties reduced; coordinates rounded to 6 decimals",
      options: {
        filter: (f) => Number(f.properties.scalerank) <= 7,
        properties: (p) => ({
          name: p.name,
          local_or_alternate_name: p.namepar || p.name,
          country_iso3: p.adm0_a3,
          country: p.adm0name,
          capital: p.capin || p.capital,
          world_city: p.worldcity,
          megacity: p.megacity,
          population: p.pop_max,
          latitude: p.latitude,
          longitude: p.longitude,
          scalerank: p.scalerank,
          min_zoom: p.min_zoom,
          wikidata_id: p.wikidataid
        }),
        id: (feature, index) => feature.properties.ne_id || `${feature.properties.adm0_a3}-${feature.properties.name}-${index}`
      }
    },
    {
      id: "ne-50m-rivers",
      sourceName: "ne_50m_rivers_lake_centerlines.geojson",
      output: "assets/maps/v6/ne_50m_rivers_lake_centerlines.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "scalerank <= 7; properties reduced; coordinates rounded to 6 decimals",
      options: {
        filter: (f) => Number(f.properties.scalerank) <= 7,
        properties: simplePhysicalProperties,
        id: (feature, index) => feature.properties.ne_id || `river-${index}`
      }
    },
    {
      id: "ne-50m-lakes",
      sourceName: "ne_50m_lakes.geojson",
      output: "assets/maps/v6/ne_50m_lakes.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "scalerank <= 7; properties reduced; coordinates rounded to 6 decimals",
      options: {
        filter: (f) => Number(f.properties.scalerank) <= 7,
        properties: simplePhysicalProperties,
        id: (feature, index) => feature.properties.ne_id || `lake-${index}`
      }
    },
    {
      id: "ne-50m-land",
      sourceName: "ne_50m_land.geojson",
      output: "assets/maps/v6/ne_50m_land.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "properties reduced; coordinates rounded to 6 decimals",
      options: { properties: simplePhysicalProperties, id: (_, index) => `land-${index}` }
    },
    {
      id: "ne-50m-ocean",
      sourceName: "ne_50m_ocean.geojson",
      output: "assets/maps/v6/ne_50m_ocean.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "properties reduced; coordinates rounded to 6 decimals",
      options: { properties: simplePhysicalProperties, id: (_, index) => `ocean-${index}` }
    },
    {
      id: "ne-10m-roads-major",
      sourceName: "ne_10m_roads.geojson",
      output: "assets/maps/v6/ne_10m_roads_major.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "major roads scalerank <= 3; RDP 0.015 degrees; properties reduced",
      options: {
        filter: (f) => Number(f.properties.scalerank) <= 3,
        lineTolerance: 0.015,
        precision: 5,
        properties: (p) => ({ name: p.name || null, name_alt: p.namealt || null, type: p.type || null, scalerank: p.scalerank }),
        id: (feature, index) => feature.properties.ne_id || `road-${index}`
      }
    },
    {
      id: "ne-10m-railroads-major",
      sourceName: "ne_10m_railroads.geojson",
      output: "assets/maps/v6/ne_10m_railroads_major.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "major railroads scalerank <= 4; RDP 0.015 degrees; properties reduced",
      options: {
        filter: (f) => Number(f.properties.scalerank) <= 4,
        lineTolerance: 0.015,
        precision: 5,
        properties: (p) => ({ name: p.name || null, scalerank: p.scalerank }),
        id: (feature, index) => feature.properties.ne_id || `rail-${index}`
      }
    },
    {
      id: "ne-10m-ports",
      sourceName: "ne_10m_ports.geojson",
      output: "assets/maps/v6/ne_10m_ports.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "properties reduced; coordinates rounded to 6 decimals",
      options: {
        properties: (p) => ({ name: p.name, website: p.website || null, scalerank: p.scalerank, national_scale: p.natlscale }),
        id: (feature, index) => feature.properties.ne_id || `port-${index}`
      }
    },
    {
      id: "ne-10m-airports",
      sourceName: "ne_10m_airports.geojson",
      output: "assets/maps/v6/ne_10m_airports.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "properties reduced; coordinates rounded to 6 decimals",
      options: {
        properties: (p) => ({
          name: p.name,
          name_es: p.name_es || p.name,
          type: p.type,
          abbreviation: p.abbrev,
          gps_code: p.gps_code,
          iata_code: p.iata_code,
          scalerank: p.scalerank,
          national_scale: p.natlscale,
          wikidata_id: p.wikidataid
        }),
        id: (feature, index) => feature.properties.ne_id || feature.properties.gps_code || `airport-${index}`
      }
    },
    {
      id: "ne-110m-offline-land",
      sourceName: "ne_110m_land.geojson",
      output: "assets/maps/v6/offline_fallback_land.geojson",
      version: `Natural Earth ${NE_COMMIT}`,
      transform: "offline fallback; properties reduced; coordinates rounded to 5 decimals",
      options: { precision: 5, properties: simplePhysicalProperties, id: (_, index) => `fallback-land-${index}` }
    }
  ];

  for (const dataset of datasets) {
    const source = `${NE_BASE}/${dataset.sourceName}`;
    const data = featureCollection(await fetchJson(source), dataset.options);
    await emit(dataset.output, jsonLine(data), {
      id: dataset.id,
      kind: "map-data",
      version: dataset.version,
      source,
      license: "Public Domain",
      attribution: "Made with Natural Earth",
      transform: dataset.transform
    });
  }
}

function filteredTopology(topology, objectName, keep, extras = {}) {
  const selected = topology.objects[objectName];
  if (!selected?.geometries) throw new Error(`TopoJSON sin objeto ${objectName}`);
  return {
    ...topology,
    objects: {
      [objectName]: { ...selected, geometries: selected.geometries.filter(keep) },
      ...extras
    }
  };
}

async function buildSpain() {
  const regionsSource = "https://unpkg.com/es-atlas@0.6.0/es/autonomous_regions.json";
  const provincesSource = "https://unpkg.com/es-atlas@0.6.0/es/provinces.json";
  const [regionsRaw, provincesRaw] = await Promise.all([fetchJson(regionsSource), fetchJson(provincesSource)]);
  const regionGeometries = regionsRaw.objects.autonomous_regions.geometries;
  const isCommunity = (geometry) => Number(geometry.id) >= 1 && Number(geometry.id) <= 17;
  const isSpecial = (geometry) => [18, 19, 20].includes(Number(geometry.id));
  const isProvince = (geometry) => Number(geometry.id) >= 1 && Number(geometry.id) <= 50;

  const regions = filteredTopology(regionsRaw, "autonomous_regions", isCommunity, {
    border: regionsRaw.objects.border
  });
  const provinces = filteredTopology(provincesRaw, "provinces", isProvince, {
    border: provincesRaw.objects.border
  });
  const special = {
    ...regionsRaw,
    objects: {
      special_territories: {
        ...regionsRaw.objects.autonomous_regions,
        geometries: regionGeometries.filter(isSpecial)
      },
      border: regionsRaw.objects.border
    }
  };

  if (regions.objects.autonomous_regions.geometries.length !== 17) throw new Error("Se esperaban 17 comunidades autónomas");
  if (provinces.objects.provinces.geometries.length !== 50) throw new Error("Se esperaban 50 provincias");
  if (special.objects.special_territories.geometries.length !== 3) throw new Error("Se esperaban Ceuta, Melilla y Gibraltar separados");

  await emit("assets/maps/v6/spain_autonomous_regions.json", jsonLine(regions), {
    id: "es-atlas-autonomous-regions",
    kind: "map-data",
    version: "es-atlas 0.6.0",
    source: regionsSource,
    license: "MIT package; CC-BY 4.0 IGN source data",
    attribution: "Obra derivada de BDLJE CC-BY 4.0 ign.es; es-atlas by Martín González",
    transform: "17 CCAA retained; Ceuta, Melilla and Gibraltar split into a separate factual layer"
  });
  await emit("assets/maps/v6/spain_provinces.json", jsonLine(provinces), {
    id: "es-atlas-provinces",
    kind: "map-data",
    version: "es-atlas 0.6.0",
    source: provincesSource,
    license: "MIT package; CC-BY 4.0 IGN source data",
    attribution: "Obra derivada de BDLJE CC-BY 4.0 ign.es; es-atlas by Martín González",
    transform: "50 provinces retained; Ceuta, Melilla and Gibraltar excluded from province object"
  });
  await emit("assets/maps/v6/spain_special_territories.json", jsonLine(special), {
    id: "es-atlas-special-territories",
    kind: "map-data",
    version: "es-atlas 0.6.0",
    source: regionsSource,
    license: "MIT package; CC-BY 4.0 IGN source data",
    attribution: "Obra derivada de BDLJE CC-BY 4.0 ign.es; es-atlas by Martín González",
    transform: "Ceuta, Melilla and Gibraltar preserved as three separately selectable geometries"
  });
}

function box(x, y, z, width, height, depth) {
  const x0 = x - width / 2;
  const x1 = x + width / 2;
  const y0 = y;
  const y1 = y + height;
  const z0 = z - depth / 2;
  const z1 = z + depth / 2;
  return {
    positions: [
      x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0,
      x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1
    ],
    indices: [
      0,1,2, 0,2,3, 4,6,5, 4,7,6,
      0,4,5, 0,5,1, 3,2,6, 3,6,7,
      1,5,6, 1,6,2, 0,3,7, 0,7,4
    ]
  };
}

function pyramid(x, y, z, width, height, depth) {
  const x0 = x - width / 2;
  const x1 = x + width / 2;
  const z0 = z - depth / 2;
  const z1 = z + depth / 2;
  return {
    positions: [x0,y,z0, x1,y,z0, x1,y,z1, x0,y,z1, x,y+height,z],
    indices: [0,2,1, 0,3,2, 0,1,4, 1,2,4, 2,3,4, 3,0,4]
  };
}

function mergeParts(parts) {
  const positions = [];
  const indices = [];
  for (const part of parts) {
    const offset = positions.length / 3;
    positions.push(...part.positions);
    indices.push(...part.indices.map((index) => index + offset));
  }
  return { positions, indices };
}

function minMaxPositions(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[index + axis]);
      max[axis] = Math.max(max[axis], positions[index + axis]);
    }
  }
  return { min, max };
}

function createGltf(name, parts, color) {
  const { positions, indices } = mergeParts(parts);
  const positionBytes = Buffer.from(new Float32Array(positions).buffer);
  const padding = (4 - (positionBytes.length % 4)) % 4;
  const indexBytes = Buffer.from(new Uint16Array(indices).buffer);
  const binary = Buffer.concat([positionBytes, Buffer.alloc(padding), indexBytes]);
  const bounds = minMaxPositions(positions);
  return {
    asset: { version: "2.0", generator: "GlobalWWIII tools/build-map-assets.mjs" },
    extensionsUsed: ["KHR_materials_unlit"],
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{
      name,
      primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0, mode: 4 }]
    }],
    materials: [{
      name: `${name} material`,
      pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0.15, roughnessFactor: 0.72 },
      extensions: { KHR_materials_unlit: {} }
    }],
    buffers: [{ uri: `data:application/octet-stream;base64,${binary.toString("base64")}`, byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes.length, target: 34962 },
      { buffer: 0, byteOffset: positionBytes.length + padding, byteLength: indexBytes.length, target: 34963 }
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: "VEC3", min: bounds.min, max: bounds.max },
      { bufferView: 1, componentType: 5123, count: indices.length, type: "SCALAR", min: [Math.min(...indices)], max: [Math.max(...indices)] }
    ]
  };
}

async function buildModels() {
  const models = [
    {
      name: "unit-land",
      color: [0.16, 0.72, 0.98, 1],
      parts: [box(0, 0, 0, 1.2, 0.18, 0.82), box(0, 0.18, 0, 0.7, 0.28, 0.58), box(0.28, 0.46, 0, 0.62, 0.09, 0.1)]
    },
    {
      name: "unit-air",
      color: [0.62, 0.82, 0.98, 1],
      parts: [box(0, 0.08, 0, 0.18, 0.18, 1.9), box(0, 0.1, 0.05, 1.65, 0.08, 0.48), box(0, 0.17, 0.78, 0.72, 0.08, 0.28), pyramid(0, 0.05, -1.03, 0.2, 0.12, 0.28)]
    },
    {
      name: "unit-naval",
      color: [0.08, 0.48, 0.78, 1],
      parts: [box(0, 0, 0, 0.62, 0.18, 2.0), pyramid(0, 0.08, -1.18, 0.62, 0.16, 0.45), box(0, 0.18, 0.5, 0.45, 0.36, 0.52)]
    },
    {
      name: "industry",
      color: [0.47, 0.54, 0.61, 1],
      parts: [box(0, 0, 0, 1.7, 0.72, 1.2), box(-0.55, 0.72, 0.2, 0.25, 1.1, 0.25), box(0.2, 0.72, 0.25, 0.2, 0.75, 0.2)]
    },
    {
      name: "power",
      color: [0.98, 0.76, 0.18, 1],
      parts: [box(0, 0, 0, 1.5, 0.58, 1.1), box(-0.42, 0.58, 0.16, 0.22, 1.28, 0.22), box(0.38, 0.58, 0.16, 0.22, 0.92, 0.22), pyramid(0, 0.58, -0.22, 0.72, 0.52, 0.62)]
    },
    {
      name: "port",
      color: [0.1, 0.78, 0.72, 1],
      parts: [box(0, 0, 0, 1.45, 0.14, 0.72), box(-0.5, 0.14, 0, 0.16, 1.42, 0.16), box(0.15, 1.38, 0, 1.45, 0.14, 0.16), box(0.72, 0.72, 0, 0.08, 0.72, 0.08)]
    },
    {
      name: "military-unit",
      color: [0.16, 0.72, 0.98, 1],
      parts: [box(0, 0, 0, 1.2, 0.18, 0.82), box(0, 0.18, 0, 0.7, 0.28, 0.58), box(0.28, 0.46, 0, 0.62, 0.09, 0.1)]
    },
    {
      name: "cargo-ship",
      color: [0.08, 0.48, 0.78, 1],
      parts: [box(0, 0, 0, 0.62, 0.18, 2.0), pyramid(0, 0.08, -1.18, 0.62, 0.16, 0.45), box(0, 0.18, 0.5, 0.45, 0.36, 0.52)]
    },
    {
      name: "freight-truck",
      color: [0.98, 0.62, 0.15, 1],
      parts: [box(0, 0.14, 0.25, 0.82, 0.64, 1.45), box(0, 0.14, -0.72, 0.76, 0.56, 0.48)]
    },
    {
      name: "industrial-plant",
      color: [0.47, 0.54, 0.61, 1],
      parts: [box(0, 0, 0, 1.7, 0.72, 1.2), box(-0.55, 0.72, 0.2, 0.25, 1.1, 0.25), box(0.2, 0.72, 0.25, 0.2, 0.75, 0.2)]
    },
    {
      name: "port-crane",
      color: [0.1, 0.78, 0.72, 1],
      parts: [box(0, 0, 0, 1.45, 0.14, 0.72), box(-0.5, 0.14, 0, 0.16, 1.42, 0.16), box(0.15, 1.38, 0, 1.45, 0.14, 0.16), box(0.72, 0.72, 0, 0.08, 0.72, 0.08)]
    },
    {
      name: "airport-tower",
      color: [0.67, 0.45, 0.96, 1],
      parts: [box(0, 0, 0, 0.48, 1.25, 0.48), box(0, 1.25, 0, 0.82, 0.32, 0.82), pyramid(0, 1.57, 0, 0.9, 0.3, 0.9)]
    }
  ];
  for (const model of models) {
    const output = `assets/models/${model.name}.gltf`;
    await emit(output, jsonLine(createGltf(model.name, model.parts, model.color)), {
      id: `model-${model.name}`,
      kind: "gltf-model",
      version: "1.0.0",
      source: "generated:tools/build-map-assets.mjs",
      license: "MIT (GlobalWWIII project)",
      attribution: "GlobalWWIII",
      transform: "deterministic indexed glTF 2.0 mesh with embedded binary buffer"
    });
  }
}

async function buildTextures() {
  const textures = {
    "selection-ring.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><radialGradient id="g"><stop offset="58%" stop-color="#22d3ee" stop-opacity="0"/><stop offset="72%" stop-color="#22d3ee" stop-opacity=".22"/><stop offset="74%" stop-color="#67e8f9" stop-opacity=".95"/><stop offset="79%" stop-color="#0ea5e9" stop-opacity=".15"/><stop offset="100%" stop-color="#0ea5e9" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="62" fill="url(#g)"/><circle cx="64" cy="64" r="44" fill="none" stroke="#a5f3fc" stroke-width="2" stroke-dasharray="7 5"/></svg>`,
    "occupation-hatch.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" fill="#ef4444" fill-opacity=".08"/><path d="M-6 6L6-6M-6 18L18-6M6 30L30 6M18 30L30 18" stroke="#fb7185" stroke-width="3" stroke-opacity=".65"/></svg>`,
    "water-pattern.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="w" x2="0" y2="1"><stop stop-color="#0b2842"/><stop offset="1" stop-color="#061827"/></linearGradient></defs><rect width="128" height="128" fill="url(#w)"/><g fill="none" stroke="#38bdf8" stroke-opacity=".16"><path d="M-20 24Q0 10 20 24T60 24T100 24T140 24"/><path d="M-20 58Q0 44 20 58T60 58T100 58T140 58"/><path d="M-20 94Q0 80 20 94T60 94T100 94T140 94"/></g></svg>`,
    "terrain-relief.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="t" x2="0" y2="1"><stop stop-color="#182f2a"/><stop offset=".5" stop-color="#354b36"/><stop offset="1" stop-color="#18251f"/><filter id="n"><feTurbulence baseFrequency=".018" numOctaves="4" seed="541" type="fractalNoise"/><feColorMatrix values=".4 0 0 0 0 .4 0 0 0 0 .4 0 0 0 0 0 0 0 .48 0"/></filter></defs><rect width="256" height="256" fill="url(#t)"/><rect width="256" height="256" filter="url(#n)" opacity=".58"/><path d="M0 190Q42 118 82 163T158 111T256 137V256H0Z" fill="#8aa06f" fill-opacity=".3"/></svg>`,
    "unit-glow.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><radialGradient id="u"><stop stop-color="#f8fafc" stop-opacity=".9"/><stop offset=".15" stop-color="#38bdf8" stop-opacity=".78"/><stop offset=".5" stop-color="#0ea5e9" stop-opacity=".22"/><stop offset="1" stop-color="#0284c7" stop-opacity="0"/></radialGradient></defs><circle cx="64" cy="64" r="64" fill="url(#u)"/></svg>`,
    "missing-tile.svg": `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#07131f"/><path d="M0 0L256 256M256 0L0 256" stroke="#19344a" stroke-width="2"/><path d="M32 128H224M128 32V224" stroke="#10293c"/><circle cx="128" cy="128" r="48" fill="none" stroke="#3b82f6" stroke-opacity=".35" stroke-width="3"/><text x="128" y="134" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="#7dd3fc">SIN MAPA</text></svg>`
  };
  for (const [name, source] of Object.entries(textures)) {
    await emit(`assets/textures/${name}`, source, {
      id: `texture-${name.replace(/\.svg$/, "")}`,
      kind: "svg-texture",
      version: "1.0.0",
      source: "generated:tools/build-map-assets.mjs",
      license: "MIT (GlobalWWIII project)",
      attribution: "GlobalWWIII",
      transform: "deterministic authored vector texture"
    });
  }
}

async function parallelLimit(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

async function buildTerrainDem() {
  const tiles = [];
  for (let z = 0; z <= 3; z += 1) {
    const dimension = 2 ** z;
    for (let x = 0; x < dimension; x += 1) {
      for (let y = 0; y < dimension; y += 1) tiles.push({ z, x, y });
    }
  }
  await parallelLimit(tiles, 8, async ({ z, x, y }) => {
    const source = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
    await download(`assets/maps/v6/dem/${z}/${x}/${y}.png`, {
      id: `mapzen-terrarium-${z}-${x}-${y}`,
      kind: "raster-dem-tile",
      version: "Mapzen Terrain Tiles public AWS snapshot",
      source,
      license: "Multiple open-data licences; see assets/vendor/mapzen-terrain/ATTRIBUTION.md",
      attribution: "Mapzen Terrain Tiles and listed DEM providers",
      transform: "none; original 256 px Terrarium PNG"
    });
  });

  const tileJson = {
    tilejson: "3.0.0",
    name: "GlobalWWIII local Terrarium DEM",
    description: "Offline global low-resolution elevation pyramid encoded as Mapzen Terrarium RGB.",
    version: "1.0.0",
    scheme: "xyz",
    tiles: ["./{z}/{x}/{y}.png"],
    minzoom: 0,
    maxzoom: 3,
    bounds: [-180, -85.05112878, 180, 85.05112878],
    attribution: "Mapzen Terrain Tiles and listed DEM providers"
  };
  const metadata = {
    schemaVersion: 1,
    encoding: "terrarium",
    decodeMeters: "(R * 256 + G + B / 256) - 32768",
    projection: "EPSG:3857",
    tileSize: 256,
    minzoom: 0,
    maxzoom: 3,
    tileCount: tiles.length,
    bounds: tileJson.bounds,
    sourceTemplate: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
    sourceRegistry: "https://registry.opendata.aws/terrain-tiles/",
    attributionFile: "../../../../vendor/mapzen-terrain/ATTRIBUTION.md",
    accessedAt: BUILD_DATE,
    limitation: "Global offline fallback for low zooms 0-3; a configured provider may add higher zooms."
  };
  await emit("assets/maps/v6/dem/tiles.json", jsonLine(tileJson), {
    id: "mapzen-terrarium-tilejson",
    kind: "tilejson",
    version: "1.0.0",
    source: "generated:tools/build-map-assets.mjs",
    license: "Multiple open-data licences; see bundled attribution",
    attribution: "Mapzen Terrain Tiles and listed DEM providers",
    transform: "index for the 85 checked-in z0-z3 tiles"
  });
  await emit("assets/maps/v6/dem/metadata.json", `${JSON.stringify(metadata, null, 2)}\n`, {
    id: "mapzen-terrarium-metadata",
    kind: "metadata",
    version: "1.0.0",
    source: "generated:tools/build-map-assets.mjs",
    license: "Multiple open-data licences; see bundled attribution",
    attribution: "Mapzen Terrain Tiles and listed DEM providers",
    transform: "describes encoding, coverage, provenance and offline limitation"
  });
}

async function writeManifest() {
  const byPath = [...records].sort((a, b) => a.path.localeCompare(b.path));
  const totalBytes = byPath.reduce((sum, record) => sum + record.bytes, 0);
  const manifest = {
    schemaVersion: 1,
    mapDataVersion: "map-v1",
    buildDate: BUILD_DATE,
    generatedBy: "tools/build-map-assets.mjs",
    reproducibility: {
      naturalEarthCommit: NE_COMMIT,
      esAtlasVersion: "0.6.0",
      mapLibreVersion: "5.24.0",
      deckGlVersion: "9.1.14",
      threeJsVersion: "0.180.0",
      demZoomRange: [0, 3],
      sourceDateEpochSupported: true
    },
    lod: {
      global: "ne_110m_admin_0_countries.geojson + offline_fallback_land.geojson",
      continental: "ne_50m_admin_0_countries.geojson + physical layers",
      national: "ne_50m_admin_1_states_provinces.geojson + transport/city nodes",
      regional: "ne_10m_admin_0_countries.geojson + ne_10m_admin_1_states_provinces.geojson",
      regionalSpain: "spain_autonomous_regions.json + spain_provinces.json"
    },
    offline: {
      vectorCoverage: "global",
      terrainCoverage: "global at zoom 0-3",
      externalRequestsRequiredForBundledMode: false,
      terrainEncoding: "terrarium",
      terrainTileCount: 85
    },
    attribution: [
      "Made with Natural Earth (public domain)",
      "Spain boundaries: Obra derivada de BDLJE CC-BY 4.0 ign.es; es-atlas / Martín González (MIT package)",
      "Mapzen Terrain Tiles and the DEM providers listed in assets/vendor/mapzen-terrain/ATTRIBUTION.md",
      "MapLibre GL JS (BSD-3-Clause), deck.gl (MIT), Three.js (MIT)"
    ],
    totalBytes,
    assets: byPath
  };
  const output = `${JSON.stringify(manifest, null, 2)}\n`;
  const path = join(ROOT, "data/map-v1/assets-manifest.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, output);
}

async function verifyManifest() {
  const manifestPath = join(ROOT, "data/map-v1/assets-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const errors = [];
  for (const asset of manifest.assets) {
    try {
      const bytes = await readFile(join(ROOT, asset.path));
      if (bytes.byteLength !== asset.bytes) errors.push(`${asset.path}: tamaño esperado ${asset.bytes}, real ${bytes.byteLength}`);
      if (sha256(bytes) !== asset.sha256) errors.push(`${asset.path}: checksum SHA-256 distinto`);
    } catch (error) {
      errors.push(`${asset.path}: ${error.message}`);
    }
  }
  if (errors.length) throw new Error(`Verificación fallida:\n${errors.join("\n")}`);
  console.log(`OK: ${manifest.assets.length} assets, ${manifest.totalBytes} bytes, mapDataVersion=${manifest.mapDataVersion}`);
}

async function main() {
  if (process.argv.includes("--verify-only")) {
    await verifyManifest();
    return;
  }
  await buildVendorDependencies();
  await buildNaturalEarth();
  await buildSpain();
  await buildModels();
  await buildTextures();
  await buildTerrainDem();
  await writeManifest();
  await verifyManifest();
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
