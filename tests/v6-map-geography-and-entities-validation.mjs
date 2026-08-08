import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MapDataAdapter } from "../js/map/model/map-data-adapter.js";
import {
  geometryBounds,
  pointInGeometry,
  topologyToFeatureCollection,
  unwrapLongitude
} from "../js/map/model/geo-utils.js";
import { InfrastructureRenderer } from "../js/map/renderers/infrastructure-renderer.js";
import { TradeRenderer } from "../js/map/renderers/trade-renderer.js";
import { UnitRenderer } from "../js/map/renderers/unit-renderer.js";
import { WarRenderer } from "../js/map/renderers/war-renderer.js";
import { PoliticalRenderer } from "../js/map/renderers/political-renderer.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async relative => JSON.parse(await readFile(join(ROOT, relative), "utf8"));
const featureByIso = (collection, iso3) => collection.features.find(feature => feature.properties?.iso3 === iso3);
const collectVertices = node => {
  if (!Array.isArray(node)) return 0;
  if (node.length >= 2 && Number.isFinite(Number(node[0])) && Number.isFinite(Number(node[1]))) return 1;
  return node.reduce((total, child) => total + collectVertices(child), 0);
};

const [countries110, countries50, countries10, admin1, spainTopology, provinceTopology, land] = await Promise.all([
  readJson("assets/maps/v6/ne_110m_admin_0_countries.geojson"),
  readJson("assets/maps/v6/ne_50m_admin_0_countries.geojson"),
  readJson("assets/maps/v6/ne_10m_admin_0_countries.geojson"),
  readJson("assets/maps/v6/ne_50m_admin_1_states_provinces.geojson"),
  readJson("assets/maps/v6/spain_autonomous_regions.json"),
  readJson("assets/maps/v6/spain_provinces.json"),
  readJson("assets/maps/v6/ne_50m_land.geojson")
]);

assert.deepEqual([countries110.features.length, countries50.features.length, countries10.features.length], [177, 242, 258], "Los tres LOD nacionales no coinciden con los datasets publicados");
for (const [label, collection] of [["110m", countries110], ["50m", countries50], ["10m", countries10]]) {
  const ids = collection.features.map(feature => String(feature.id));
  assert.equal(new Set(ids).size, ids.length, `Natural Earth ${label} contiene ids duplicados`);
  for (const iso3 of ["RUS", "CAN", "USA", "ESP", "IDN", "JPN", "NZL", "FJI"]) assert.ok(featureByIso(collection, iso3), `${label}: falta ${iso3}`);
}
for (const iso3 of ["RUS", "CAN", "USA", "ESP"]) {
  const coarse = collectVertices(featureByIso(countries110, iso3).geometry.coordinates);
  const medium = collectVertices(featureByIso(countries50, iso3).geometry.coordinates);
  const detailed = collectVertices(featureByIso(countries10, iso3).geometry.coordinates);
  assert.ok(medium > coarse && detailed > medium, `${iso3}: 110m/50m/10m no aumentan el detalle geométrico`);
}

const russia = featureByIso(countries50, "RUS");
const canada = featureByIso(countries50, "CAN");
const usa = featureByIso(countries50, "USA");
const russiaBounds = geometryBounds(russia.geometry);
assert.ok(russiaBounds.crossesAntimeridian && russiaBounds.longitudeSpan < 180, "Rusia se deforma al cruzar el antimeridiano");
assert.equal(pointInGeometry(100, 60, russia.geometry), true, "El punto de control siberiano no está en Rusia");
assert.equal(pointInGeometry(100, 60, canada.geometry), false, "Rusia aparece sobre Canadá");
assert.equal(pointInGeometry(-100, 60, canada.geometry), true, "El punto de control canadiense no está en Canadá");
const canadaAppearsInRussia = pointInGeometry(-100, 60, russia.geometry);
assert.equal(pointInGeometry(-150, 64, usa.geometry), true, "Alaska no está contenida en la geometría de Estados Unidos");
const alaska = admin1.features.find(feature => feature.properties?.iso_3166_2 === "US-AK");
assert.ok(alaska && alaska.properties.name === "Alaska" && pointInGeometry(-150, 64, alaska.geometry), "La región administrativa real de Alaska no es seleccionable");

for (const [iso3, sample, minimumParts] of [
  ["IDN", [120, -2], 100],
  ["JPN", [138, 36], 25],
  ["NZL", [174, -41], 10],
  ["FJI", [178, -18], 15]
]) {
  const feature = featureByIso(countries50, iso3);
  assert.equal(feature.geometry.type, "MultiPolygon", `${iso3} dejó de ser un archipiélago multipolígono`);
  assert.ok(feature.geometry.coordinates.length >= minimumParts, `${iso3} perdió islas en la simplificación 50m`);
  assert.equal(pointInGeometry(sample[0], sample[1], feature.geometry), true, `${iso3} no contiene su punto de control insular`);
  assert.ok(geometryBounds(feature.geometry).longitudeSpan < 60, `${iso3} se expandió de forma anómala alrededor del mundo`);
}

const communities = topologyToFeatureCollection(spainTopology, "autonomous_regions");
const provinces = topologyToFeatureCollection(provinceTopology, "provinces");
assert.equal(communities.features.length, 17, "España no contiene exactamente 17 CCAA");
assert.equal(provinces.features.length, 50, "España no contiene exactamente 50 provincias");
assert.equal(new Set(communities.features.map(feature => String(feature.id))).size, 17, "Las CCAA no tienen ids únicos");
assert.equal(new Set(provinces.features.map(feature => String(feature.id))).size, 50, "Las provincias no tienen ids únicos");
assert.ok(communities.features.every(feature => ["Polygon", "MultiPolygon"].includes(feature.geometry.type) && geometryBounds(feature.geometry)), "Hay CCAA sin geometría utilizable");
assert.ok(provinces.features.every(feature => ["Polygon", "MultiPolygon"].includes(feature.geometry.type) && geometryBounds(feature.geometry)), "Hay provincias sin geometría utilizable");
const communityNames = new Set(communities.features.map(feature => feature.properties.name));
for (const name of ["Andalucía", "Principado de Asturias", "Canarias", "Cataluña/Catalunya", "Comunidad de Madrid", "País Vasco/Euskadi"]) assert.ok(communityNames.has(name), `Falta la CCAA real ${name}`);
const provinceNames = new Set(provinces.features.map(feature => feature.properties.name));
for (const name of ["Asturias", "Barcelona", "Madrid", "Sevilla", "València/Valencia", "Zaragoza"]) assert.ok(provinceNames.has(name), `Falta la provincia real ${name}`);

const rectangle = (west, south, east, north) => ({ type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] });
const fixtureCountries = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", id: "ESP", properties: { ISO3: "ESP", NAME_ES: "España" }, geometry: rectangle(-5, 38.5, -2, 42.5) },
    { type: "Feature", id: "CAN", properties: { ISO3: "CAN", NAME_ES: "Canadá" }, geometry: rectangle(-120, 49, -60, 72) },
    { type: "Feature", id: "USA", properties: { ISO3: "USA", NAME_ES: "Estados Unidos" }, geometry: rectangle(-170, 18, -65, 72) },
    { type: "Feature", id: "RUS", properties: { ISO3: "RUS", NAME_ES: "Rusia" }, geometry: rectangle(30, 42, 179, 77) }
  ]
};
const madridGeometry = rectangle(-4.8, 39.6, -3, 41.2);
const ontarioGeometry = rectangle(-95, 49, -74, 57);
const fixtureRegions = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", id: "CAN-ONT", properties: { adm0_a3: "CAN", adm1_code: "CAN-ONT", name: "Ontario" }, geometry: ontarioGeometry },
    { type: "Feature", id: "USA-AK", properties: { adm0_a3: "USA", adm1_code: "USA-AK", name: "Alaska" }, geometry: rectangle(-170, 52, -130, 72) }
  ]
};
const fixtureSpain = {
  type: "FeatureCollection",
  features: [{ type: "Feature", id: "MAD", properties: { regionId: "MAD", name: "Comunidad de Madrid" }, geometry: madridGeometry }]
};
const fixtureCities = {
  type: "FeatureCollection",
  features: [{ type: "Feature", id: "city-madrid", properties: { ADM0_A3: "ESP", name: "Madrid" }, geometry: { type: "Point", coordinates: [-3.7038, 40.4168] } }]
};
const fixtures = new Map([
  ["countries.json", fixtureCountries], ["countries-110.json", fixtureCountries], ["regions.json", fixtureRegions],
  ["spain.json", fixtureSpain], ["cities.json", fixtureCities]
]);
const fixtureFetch = async url => {
  const key = String(url).split("/").at(-1);
  const value = fixtures.get(key);
  return { ok: Boolean(value), status: value ? 200 : 404, statusText: value ? "OK" : "Not Found", json: async () => value };
};
const makeAdapter = async () => {
  const adapter = new MapDataAdapter({
    assetBase: "https://example.invalid/",
    fetchFn: fixtureFetch,
    sources: {
      countries: ["countries.json"], regions: ["regions.json"], spainRegions: ["spain.json"],
      spainProvinces: ["missing-provinces.json"], cities: ["cities.json"]
    }
  });
  await adapter.initialize();
  return adapter;
};

const facilities = Array.from({ length: 24 }, (_, index) => ({
  id: `factory-${index}`,
  name: `Industria ${index}`,
  typeId: index % 2 ? "semiconductor-fab" : "steel-plant",
  regionId: "MAD",
  level: 1 + index % 4,
  ...(index === 0 ? { longitude: 60, latitude: 60 } : {})
}));
const formations = Array.from({ length: 24 }, (_, index) => ({
  id: `formation-${index}`,
  name: `Brigada ${index}`,
  domain: index % 5 === 0 ? "air" : "ground",
  typeId: index % 5 === 0 ? "fighter" : "armor",
  echelon: "brigade",
  regionId: "MAD",
  properties: { personnel: 3200 + index, readiness: 70, morale: 75, supply: 80 },
  ...(index === 1 ? { movement: { mode: "advance", startLat: 40.4, startLng: -3.8, endLat: 50, endLng: -45, progress: 0.35 } } : {})
}));
const gameState = {
  version: "6.0.0-test",
  saveVersion: 60,
  mapDataVersion: "natural-earth-v6",
  dayIndex: 7,
  selectedCountryId: "ESP",
  selectedRegionId: "MAD",
  controlledCountryId: "ESP",
  countries: [
    { id: "ESP", name: "España", color: "#f0bd43", map: { lng: -3.7, lat: 40.4 }, economy: { population: 48, gdp: 1700 }, systems: {}, facilities, units: [], strategicRegions: [{ id: "MAD", name: "Comunidad de Madrid", population: 7, gdp: 300 }], v52: { military: { formations } }, v51: { cities: [{ id: "madrid", name: "Madrid", regionId: "MAD", population: 3.3 }] } },
    { id: "CAN", name: "Canadá", color: "#d95757", annexedBy: "ESP", controllerId: "ESP", economy: { population: 40, gdp: 2200 }, systems: {}, units: [], strategicRegions: [{ id: "CAN-ONT", name: "Ontario" }], v52: { military: { formations: [] } } },
    { id: "USA", name: "Estados Unidos", color: "#4f83d1", economy: { population: 340, gdp: 27000 }, systems: {}, units: [], strategicRegions: [{ id: "USA-AK", name: "Alaska" }], v52: { military: { formations: [] } } },
    { id: "RUS", name: "Rusia", color: "#5b8fca", economy: { population: 145, gdp: 2100 }, systems: {}, units: [], strategicRegions: [], v52: { military: { formations: [] } } }
  ],
  regions: [],
  tradeRoutes: [{
    id: "atlantic-route", a: "ESP", b: "CAN", transportMode: "maritime", commodity: "machinery", active: true,
    points: { ESP: [40.4, -3.7], CAN: [60, -90] },
    ships: [{ id: "ship-1", name: "MV Atlántico", from: "ESP", to: "CAN", progress: 0.5, cargo: { machinery: 80 } }]
  }],
  wars: [{
    id: "war-1", attackerId: "ESP", defenderId: "CAN", status: "active", warScore: 15,
    campaigns: [{ id: "air-campaign", status: "active", domain: "air", progress: 0.4, from: [40.4, -3.7], to: [52, -80] }]
  }],
  regionBattles: [{ id: "battle-ontario", warId: "war-1", targetCountryId: "CAN", regionId: "CAN-ONT", attackerId: "ESP", defenderId: "CAN", controlProgress: 35 }],
  occupationZones: [{ id: "occupation-can", warId: "war-1", occupierId: "ESP", formerOwnerId: "CAN", regionIds: ["CAN-ONT"], policy: "military_administration", status: "active", resistance: 42 }],
  territorialClaims: [],
  v51: { logistics: { nodes: [], routes: [], shipments: [] } },
  v60: { schema: 60, version: "6.0.0", mapDataVersion: "natural-earth-v6", map: {}, audit: [], mapCoordinates: { version: 1, mapDataVersion: "natural-earth-v6", entities: {} } }
};

const adapter = await makeAdapter();
const snapshot = adapter.createSnapshot(gameState);
assert.equal(snapshot.facilities.length, facilities.length, "El adaptador perdió instalaciones");
assert.equal(snapshot.units.length, formations.length, "El adaptador perdió formaciones");
for (const item of [...snapshot.facilities, ...snapshot.units]) {
  assert.equal(pointInGeometry(item.longitude, item.latitude, madridGeometry), true, `${item.id} quedó fuera de su región`);
}
assert.notDeepEqual([snapshot.facilities[0].longitude, snapshot.facilities[0].latitude], [60, 60], "Una coordenada heredada fuera de región no fue corregida");

const placed = [...snapshot.facilities, ...snapshot.units];
for (let left = 0; left < placed.length; left += 1) {
  for (let right = left + 1; right < placed.length; right += 1) {
    const longitudeDistance = Math.abs(unwrapLongitude(placed[left].longitude, placed[right].longitude) - placed[right].longitude);
    const latitudeDistance = Math.abs(placed[left].latitude - placed[right].latitude);
    assert.ok(longitudeDistance >= 0.018 || latitudeDistance >= 0.018, `Colisión cartográfica entre ${placed[left].id} y ${placed[right].id}`);
  }
}
const ledger = gameState.v60.mapCoordinates.entities;
for (const item of snapshot.facilities) assert.ok(ledger[`facility:${item.id}`], `No se guardó la coordenada de ${item.id}`);
for (const item of snapshot.units) assert.ok(ledger[`unit:ESP:${item.id}`], `No se guardó la coordenada de ${item.id}`);

const firstPositions = new Map(placed.map(item => [item.id, [item.longitude, item.latitude]]));
const restoredAdapter = await makeAdapter();
const restoredSnapshot = restoredAdapter.createSnapshot(gameState);
for (const item of [...restoredSnapshot.facilities, ...restoredSnapshot.units]) assert.deepEqual([item.longitude, item.latitude], firstPositions.get(item.id), `${item.id} cambió de posición tras restaurar el guardado`);

assert.equal(snapshot.routes.length, 1, "La ruta comercial no llegó al snapshot");
assert.equal(snapshot.routes[0].mode, "maritime");
assert.equal(snapshot.routes[0].path.length, 2);
assert.equal(snapshot.routes[0].vehicles.length, 1, "El barco no quedó asociado a su ruta");
const ship = snapshot.routes[0].vehicles[0];
assert.equal(ship.mode, "ship");
assert.ok(Number.isFinite(ship.longitude) && Number.isFinite(ship.latitude), "El barco carece de posición interpolada");
const shipAppearsOnLand = land.features.some(feature => pointInGeometry(ship.longitude, ship.latitude, feature.geometry));
assert.ok(snapshot.fronts.length >= 2 && snapshot.fronts.every(front => front.path.length >= 2), "La guerra activa no produjo frentes estratégicos/operacionales");
assert.ok(snapshot.orders.some(order => order.operationId === "air-campaign" || order.id === "order:air-campaign"), "La campaña activa no produjo una orden visible");
assert.equal(snapshot.occupations.length, 1, "La ocupación desapareció del modelo intermedio");
assert.equal(snapshot.geography.occupations.features.length, 1, "La ocupación no produjo geometría rayable");
assert.equal(snapshot.geography.occupations.features[0].properties.controllerId, "ESP");
const annexedCanada = snapshot.countries.find(country => country.id === "CAN");
assert.equal(annexedCanada.sovereign, false, "El país anexionado sigue marcado como soberano");
assert.equal(annexedCanada.ownerId, "ESP");
assert.equal(annexedCanada.controllerId, "ESP");

class DeckLayer { constructor(properties) { Object.assign(this, properties); } }
const previousDeck = globalThis.deck;
globalThis.deck = { PathLayer: DeckLayer, ScatterplotLayer: DeckLayer, TextLayer: DeckLayer, ColumnLayer: DeckLayer };
try {
  const infrastructureLayers = new InfrastructureRenderer().buildLayers(snapshot, { mode: "terrain", lod: 3, quality: "high" });
  const tradeLayers = new TradeRenderer().buildLayers(snapshot, { mode: "hybrid", lod: 2, clockFraction: 0.5 });
  const unitLayers = new UnitRenderer().buildLayers(snapshot, { mode: "terrain", lod: 3, quality: "high" });
  const warLayers = new WarRenderer().buildLayers(snapshot, { mode: "political", lod: 3, time: 1000 });
  assert.ok(infrastructureLayers.some(layer => layer.id === "31-industries-markers"), "No se creó la capa visible de industrias");
  assert.ok(tradeLayers.some(layer => layer.id === "34-trade-routes") && tradeLayers.some(layer => layer.id === "38-logistics-vehicles"), "Rutas y barcos no se entregaron al renderer");
  assert.ok(unitLayers.some(layer => layer.id.startsWith("35-land-units")) && unitLayers.some(layer => layer.id.startsWith("36-air-units")), "No se crearon capas terrestres y aéreas");
  assert.ok(warLayers.some(layer => layer.id === "39-war-fronts") && warLayers.some(layer => layer.id === "40-battles"), "Frentes y batallas no se entregaron al renderer");
} finally {
  if (previousDeck === undefined) delete globalThis.deck;
  else globalThis.deck = previousDeck;
}

const sources = new Map(), layers = [];
const politicalBackend = {
  map: { hasImage: () => false, addImage: () => {} },
  ensureSource: (id, spec) => sources.set(id, spec.data),
  ensureLayer: layer => layers.push(layer),
  setSourceData: (id, data) => sources.set(id, data),
  setVisibility: () => {},
  setPaint: () => {}
};
const political = new PoliticalRenderer({ renderer: politicalBackend, layerManager: { isVisible: () => true } });
political.initialize(snapshot);
assert.equal(sources.get("nexus-occupations").features.length, 1, "PoliticalRenderer no recibió la ocupación");
assert.ok(layers.some(layer => layer.id === "23-occupation" && layer.paint["fill-pattern"] === "nexus-occupation-hatch"), "La ocupación no usa una capa visual diferenciada");
assert.equal(shipAppearsOnLand, false, `El barco de control aparece sobre tierra en ${ship.longitude},${ship.latitude}`);
assert.equal(canadaAppearsInRussia, false, "Canadá aparece sobre Rusia");

console.log(`OK v6 geografía/entidades · LOD 177/242/258 · 17 CCAA/50 provincias · ${snapshot.facilities.length} instalaciones · ${snapshot.units.length} unidades · rutas/frentes/ocupación`);
