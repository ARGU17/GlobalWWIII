#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const at = (path) => join(ROOT, path);
const readJson = async (path) => JSON.parse(await readFile(at(path), "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

const manifest = await readJson("data/map-v1/assets-manifest.json");
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.mapDataVersion, "map-v1");
assert.equal(manifest.reproducibility.naturalEarthCommit, "ca96624a56bd078437bca8184e78163e5039ad19");
assert.equal(manifest.reproducibility.esAtlasVersion, "0.6.0");
assert.equal(manifest.reproducibility.mapLibreVersion, "5.24.0");
assert.equal(manifest.reproducibility.deckGlVersion, "9.1.14");
assert.equal(manifest.reproducibility.threeJsVersion, "0.180.0");
assert.deepEqual(manifest.reproducibility.demZoomRange, [0, 3]);
assert.equal(manifest.offline.externalRequestsRequiredForBundledMode, false);
assert.equal(manifest.offline.terrainTileCount, 85);
assert.ok(manifest.assets.length >= 138, "El manifiesto debe inventariar todo el paquete local");

const byPath = new Map(manifest.assets.map((asset) => [asset.path, asset]));
assert.equal(byPath.size, manifest.assets.length, "No puede haber rutas repetidas en el manifiesto");
let totalBytes = 0;
for (const asset of manifest.assets) {
  assert.ok(asset.id && asset.kind && asset.path && asset.version, `${asset.path}: metadatos incompletos`);
  assert.ok(asset.source && asset.license && asset.attribution, `${asset.path}: procedencia o licencia ausente`);
  assert.match(asset.sha256, /^[a-f0-9]{64}$/, `${asset.path}: SHA-256 inválido`);
  assert.match(asset.accessedAt, /^\d{4}-\d{2}-\d{2}$/, `${asset.path}: fecha inválida`);
  const bytes = await readFile(at(asset.path));
  assert.equal(bytes.byteLength, asset.bytes, `${asset.path}: tamaño distinto al manifiesto`);
  assert.equal(digest(bytes), asset.sha256, `${asset.path}: SHA-256 distinto al manifiesto`);
  totalBytes += bytes.byteLength;
}
assert.equal(totalBytes, manifest.totalBytes);
assert.ok(totalBytes < 36 * 1024 * 1024, `El paquete cartográfico supera 36 MiB (${totalBytes})`);

const requiredRuntime = [
  "assets/vendor/maplibre-gl/5.24.0/maplibre-gl.js",
  "assets/vendor/maplibre-gl/5.24.0/maplibre-gl.css",
  "assets/vendor/maplibre-gl/5.24.0/LICENSE.txt",
  "assets/vendor/deck.gl/9.1.14/deck.gl.min.js",
  "assets/vendor/deck.gl/9.1.14/LICENSE",
  "assets/vendor/three/three.module.min.js",
  "assets/vendor/three/three.core.min.js",
  "assets/vendor/three/GLTFLoader.js",
  "assets/vendor/three/BufferGeometryUtils.js",
  "assets/vendor/three/LICENSE",
  "assets/vendor/natural-earth/LICENSE.md",
  "assets/vendor/es-atlas/0.6.0/README.md",
  "assets/vendor/mapzen-terrain/ATTRIBUTION.md"
];
for (const path of requiredRuntime) assert.ok(byPath.has(path), `Falta dependencia/licencia local: ${path}`);
assert.ok(byPath.get(requiredRuntime[0]).bytes > 900_000, "MapLibre parece truncado");
assert.ok(byPath.get(requiredRuntime[3]).bytes > 1_400_000, "deck.gl parece truncado");
assert.ok(byPath.get(requiredRuntime[5]).bytes > 300_000, "Three.js parece truncado");

const gltfLoaderSource = await readFile(at("assets/vendor/three/GLTFLoader.js"), "utf8");
const geometryUtilsSource = await readFile(at("assets/vendor/three/BufferGeometryUtils.js"), "utf8");
assert.match(gltfLoaderSource, /from '\.\/three\.module\.min\.js'/);
assert.match(gltfLoaderSource, /from '\.\/BufferGeometryUtils\.js'/);
assert.match(geometryUtilsSource, /from '\.\/three\.module\.min\.js'/);
assert.doesNotMatch(gltfLoaderSource, /from\s+['"]three['"]/);
assert.doesNotMatch(geometryUtilsSource, /from\s+['"]three['"]/);
const loaderModule = await import(pathToFileURL(at("assets/vendor/three/GLTFLoader.js")).href);
assert.equal(typeof loaderModule.GLTFLoader, "function", "GLTFLoader local no puede importarse");

const mapFiles = {
  countries110: "assets/maps/v6/ne_110m_admin_0_countries.geojson",
  countries50: "assets/maps/v6/ne_50m_admin_0_countries.geojson",
  countries10: "assets/maps/v6/ne_10m_admin_0_countries.geojson",
  admin1: "assets/maps/v6/ne_50m_admin_1_states_provinces.geojson",
  admin1Detail: "assets/maps/v6/ne_10m_admin_1_states_provinces.geojson",
  cities: "assets/maps/v6/ne_50m_populated_places_simple.geojson",
  rivers: "assets/maps/v6/ne_50m_rivers_lake_centerlines.geojson",
  lakes: "assets/maps/v6/ne_50m_lakes.geojson",
  land: "assets/maps/v6/ne_50m_land.geojson",
  ocean: "assets/maps/v6/ne_50m_ocean.geojson",
  roads: "assets/maps/v6/ne_10m_roads_major.geojson",
  rails: "assets/maps/v6/ne_10m_railroads_major.geojson",
  ports: "assets/maps/v6/ne_10m_ports.geojson",
  airports: "assets/maps/v6/ne_10m_airports.geojson",
  fallback: "assets/maps/v6/offline_fallback_land.geojson"
};
for (const path of Object.values(mapFiles)) assert.ok(byPath.has(path), `Falta fuente GIS: ${path}`);

const geo = Object.fromEntries(await Promise.all(Object.entries(mapFiles).map(async ([key, path]) => [key, await readJson(path)])));
for (const [name, collection] of Object.entries(geo)) {
  assert.equal(collection.type, "FeatureCollection", `${name} no es GeoJSON FeatureCollection`);
  assert.ok(collection.features.length > 0, `${name} está vacío`);
}
assert.equal(geo.countries110.features.length, 177);
assert.equal(geo.countries50.features.length, 242);
assert.ok(geo.countries10.features.length >= 250);
assert.equal(geo.admin1.features.length, 294);
assert.equal(geo.admin1Detail.features.length, 4596);
assert.equal(geo.cities.features.length, 1239);
assert.equal(geo.rivers.features.length, 462);
assert.equal(geo.lakes.features.length, 412);
assert.equal(geo.land.features.length, 1420);
assert.equal(geo.ocean.features.length, 1);
assert.equal(geo.roads.features.length, 10024);
assert.equal(geo.rails.features.length, 2845);
assert.equal(geo.ports.features.length, 1081);
assert.equal(geo.airports.features.length, 893);
assert.equal(geo.fallback.features.length, 127);

for (const collection of [geo.countries110, geo.countries50, geo.countries10, geo.admin1, geo.admin1Detail, geo.roads, geo.rails]) {
  const ids = collection.features.map((feature) => String(feature.id));
  assert.equal(new Set(ids).size, ids.length, "Los identificadores geográficos deben ser estables y únicos");
}

for (const iso3 of ["RUS", "CAN", "USA", "ESP"]) {
  const feature = geo.countries50.features.find((candidate) => candidate.properties.iso3 === iso3);
  assert.ok(feature, `Falta país crítico ${iso3}`);
  assert.ok(["Polygon", "MultiPolygon"].includes(feature.geometry.type), `${iso3}: geometría política inválida`);
}
const russia = geo.countries50.features.find((feature) => feature.properties.iso3 === "RUS");
const allLongitudes = [];
const collectLongitudes = (coordinates) => {
  if (typeof coordinates?.[0] === "number") allLongitudes.push(coordinates[0]);
  else if (Array.isArray(coordinates)) coordinates.forEach(collectLongitudes);
};
collectLongitudes(russia.geometry.coordinates);
assert.ok(Math.max(...allLongitudes) > 179 && Math.min(...allLongitudes) < -169, "Rusia debe conservar la geometría al cruzar el antimeridiano");

assert.ok(geo.roads.features.every((feature) => feature.properties.scalerank <= 3));
assert.ok(geo.rails.features.every((feature) => feature.properties.scalerank <= 4));
for (const collection of [geo.roads, geo.rails]) {
  for (const feature of collection.features) {
    const lines = feature.geometry.type === "LineString" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    assert.ok(lines.every((line) => line.length >= 2), `${feature.id}: línea degenerada tras simplificación`);
  }
}

const regions = await readJson("assets/maps/v6/spain_autonomous_regions.json");
const provinces = await readJson("assets/maps/v6/spain_provinces.json");
const special = await readJson("assets/maps/v6/spain_special_territories.json");
assert.equal(regions.type, "Topology");
assert.equal(provinces.type, "Topology");
assert.equal(regions.objects.autonomous_regions.geometries.length, 17);
assert.equal(provinces.objects.provinces.geometries.length, 50);
assert.equal(special.objects.special_territories.geometries.length, 3);

const regionNames = new Set(regions.objects.autonomous_regions.geometries.map((geometry) => geometry.properties.name));
for (const name of [
  "Andalucía", "Aragón", "Principado de Asturias", "Illes Balears", "Canarias", "Cantabria",
  "Castilla y León", "Castilla-La Mancha", "Cataluña/Catalunya", "Comunitat Valenciana", "Extremadura",
  "Galicia", "Comunidad de Madrid", "Región de Murcia", "Comunidad Foral de Navarra", "País Vasco/Euskadi", "La Rioja"
]) assert.ok(regionNames.has(name), `Falta CCAA real: ${name}`);
const provinceNames = new Set(provinces.objects.provinces.geometries.map((geometry) => geometry.properties.name));
for (const name of ["Asturias", "Barcelona", "Madrid", "Sevilla", "València/Valencia", "Zaragoza"]) {
  assert.ok(provinceNames.has(name), `Falta provincia real: ${name}`);
}
const specialNames = special.objects.special_territories.geometries.map((geometry) => geometry.properties.name).join("|");
assert.match(specialNames, /Ceuta/);
assert.match(specialNames, /Melilla/);
assert.match(specialNames, /Gibraltar/);

const demDirectory = at("assets/maps/v6/dem");
const pngPaths = [];
for (let z = 0; z <= 3; z += 1) {
  const dimension = 2 ** z;
  for (let x = 0; x < dimension; x += 1) {
    const children = await readdir(join(demDirectory, String(z), String(x)));
    assert.equal(children.filter((name) => name.endsWith(".png")).length, dimension, `DEM z${z}/x${x} incompleto`);
    for (let y = 0; y < dimension; y += 1) pngPaths.push(`assets/maps/v6/dem/${z}/${x}/${y}.png`);
  }
}
assert.equal(pngPaths.length, 85);
for (const path of pngPaths) {
  assert.ok(byPath.has(path), `Tesela DEM no inventariada: ${path}`);
  const png = await readFile(at(path));
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${path}: cabecera PNG inválida`);
  assert.equal(png.readUInt32BE(16), 256, `${path}: ancho distinto de 256 px`);
  assert.equal(png.readUInt32BE(20), 256, `${path}: alto distinto de 256 px`);
}
const tileJson = await readJson("assets/maps/v6/dem/tiles.json");
const demMetadata = await readJson("assets/maps/v6/dem/metadata.json");
assert.equal(tileJson.scheme, "xyz");
assert.equal(tileJson.minzoom, 0);
assert.equal(tileJson.maxzoom, 3);
assert.equal(demMetadata.encoding, "terrarium");
assert.equal(demMetadata.tileCount, 85);
assert.match(demMetadata.decodeMeters, /32768/);

const requiredModels = ["unit-land", "unit-air", "unit-naval", "industry", "power", "port"];
for (const name of requiredModels) {
  const path = `assets/models/${name}.gltf`;
  assert.ok(byPath.has(path), `Falta modelo principal ${name}`);
  const model = await readJson(path);
  assert.equal(model.asset.version, "2.0");
  assert.ok(model.meshes[0].primitives.length > 0);
  assert.ok(model.accessors[0].count >= 8, `${name}: geometría insuficiente`);
  const match = /^data:application\/octet-stream;base64,(.+)$/.exec(model.buffers[0].uri);
  assert.ok(match, `${name}: buffer glTF no está embebido`);
  assert.equal(Buffer.from(match[1], "base64").byteLength, model.buffers[0].byteLength);
}

for (const name of ["selection-ring", "occupation-hatch", "water-pattern", "terrain-relief", "unit-glow", "missing-tile"]) {
  const path = `assets/textures/${name}.svg`;
  assert.ok(byPath.has(path), `Falta textura ${name}`);
  const svg = await readFile(at(path), "utf8");
  assert.match(svg, /^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(svg.length > 240, `${name}: textura aparentemente vacía`);
}

const naturalEarthLicense = await readFile(at("assets/vendor/natural-earth/LICENSE.md"), "utf8");
const esAtlasReadme = await readFile(at("assets/vendor/es-atlas/0.6.0/README.md"), "utf8");
const terrainAttribution = await readFile(at("assets/vendor/mapzen-terrain/ATTRIBUTION.md"), "utf8");
assert.match(naturalEarthLicense, /public domain/i);
assert.match(esAtlasReadme, /CC-BY 4\.0/i);
assert.match(terrainAttribution, /Required attribution/i);

console.log(`v6 assets validation: ${manifest.assets.length} assets, ${(totalBytes / 1048576).toFixed(2)} MiB, 85 DEM tiles, 17 CCAA, 50 provinces, local WebGL runtime OK.`);
