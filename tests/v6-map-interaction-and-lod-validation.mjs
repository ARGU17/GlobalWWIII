import assert from "node:assert/strict";
import { MapState } from "../js/map/map-state.js";
import { CameraController, geometryBounds as cameraGeometryBounds } from "../js/map/camera-controller.js";
import { SelectionManager } from "../js/map/selection-manager.js";
import { LODManager } from "../js/map/lod-manager.js";
import { PerformanceManager } from "../js/map/performance-manager.js";
import { AssetManager } from "../js/map/assets/asset-manager.js";
import { MAP_CONFIG, MAP_MODES, MAP_QUALITY_PROFILES } from "../js/map/map-config.js";

const viewFields = ["longitude", "latitude", "zoom", "bearing"];
const selectionFields = ["selectedCountryId", "selectedRegionId", "selectedEntityId"];
const project = (value, fields) => Object.fromEntries(fields.map(field => [field, value[field]]));

const gameState = {
  mapMode: "regions",
  mapVisualMode: "political",
  mapCenter: [61.25, 104.5],
  mapZoom: 4.75,
  mapPitch: 8,
  mapBearing: 23,
  mapLayer: "political",
  mapSelectedEntityId: "unit:RUS:guard-1",
  selectedCountryId: "RUS",
  selectedRegionId: "RUS-SIB",
  mapVisibleLayers: { "34-trade-routes": true, "39-war-fronts": true }
};
const state = new MapState(gameState);
const initial = state.snapshot();

for (const mode of ["hybrid", "terrain", "political"]) {
  const before = state.snapshot();
  const after = state.setMode(mode);
  assert.equal(after.mode, mode, `No se activó el modo ${mode}`);
  assert.deepEqual(project(after, viewFields), project(before, viewFields), `El modo ${mode} alteró la cámara lógica`);
  assert.deepEqual(project(after, selectionFields), project(before, selectionFields), `El modo ${mode} perdió la selección`);
  assert.ok(after.transition.durationMs >= 400 && after.transition.durationMs <= 800, `La transición ${mode} no está entre 400 y 800 ms`);
  assert.equal(after.pitch, MAP_MODES[mode].pitch, `El modo ${mode} no aplicó su inclinación declarada`);
}
assert.deepEqual(project(state.snapshot(), viewFields), project(initial, viewFields), "El ciclo completo de modos no conservó la cámara");
assert.deepEqual(project(state.snapshot(), selectionFields), project(initial, selectionFields), "El ciclo completo de modos no conservó país, región y entidad");
assert.equal(state.setMode("terrain", { reducedMotion: true }).transition.durationMs, 0, "Movimiento reducido debe eliminar la animación de transición");

state.syncToGameState(gameState);
const restored = new MapState(gameState).snapshot();
assert.deepEqual(project(restored, [...viewFields, "pitch"]), project(state.snapshot(), [...viewFields, "pitch"]), "La cámara no sobrevivió a guardar/restaurar");
assert.deepEqual(project(restored, selectionFields), project(state.snapshot(), selectionFields), "La selección no sobrevivió a guardar/restaurar");
assert.equal(gameState.mapMode, "regions", "El alcance world/regions fue confundido con el modo visual");
assert.equal(gameState.mapVisualMode, "terrain", "El modo visual no se persistió separado del alcance");

class FakeMap {
  constructor() {
    this.handlers = new Map();
    this.view = { lng: 12.25, lat: 48.5, zoom: 6.25, pitch: 31, bearing: -17 };
    this.calls = [];
  }
  on(type, listener) { this.handlers.set(type, listener); }
  off(type) { this.handlers.delete(type); }
  getCenter() { return { lng: this.view.lng, lat: this.view.lat }; }
  getZoom() { return this.view.zoom; }
  getPitch() { return this.view.pitch; }
  getBearing() { return this.view.bearing; }
  jumpTo(options) { this.calls.push(["jumpTo", options]); }
  easeTo(options) { this.calls.push(["easeTo", options]); }
  fitBounds(bounds, options) { this.calls.push(["fitBounds", { bounds, options }]); }
}

const fakeMap = new FakeMap();
const camera = new CameraController(state);
camera.attach(fakeMap);
await Promise.resolve();
camera.capture();
const captured = state.snapshot();
assert.deepEqual(project(captured, viewFields), { longitude: 12.25, latitude: 48.5, zoom: 6.25, bearing: -17 }, "CameraController no capturó una vista completa");
assert.deepEqual(project(captured, selectionFields), project(initial, selectionFields), "Capturar la cámara alteró la selección");
camera.setMode("hybrid", { duration: 610 });
assert.deepEqual(project(state.snapshot(), viewFields), project(captured, viewFields), "CameraController.setMode desplazó la cámara");
assert.equal(fakeMap.calls.at(-1)[0], "easeTo", "El cambio de modo no se aplicó a la cámara compartida");

const datelineGeometry = {
  type: "MultiPolygon",
  coordinates: [
    [[[178, -19], [180, -19], [180, -16], [178, -16], [178, -19]]],
    [[[-180, -19], [-178, -19], [-178, -16], [-180, -16], [-180, -19]]]
  ]
};
const datelineBounds = cameraGeometryBounds(datelineGeometry);
assert.ok(datelineBounds.crossesAntimeridian && datelineBounds.spanLongitude < 5, "La cámara interpretó un archipiélago del antimeridiano como casi todo el mundo");
assert.equal(camera.focusGeometry(datelineGeometry), true, "No se pudo enfocar una geometría que cruza el antimeridiano");
const focused = fakeMap.calls.at(-1)[1].bounds;
assert.ok(focused[1][0] - focused[0][0] < 5, "fitBounds recibió una extensión deformada en el antimeridiano");

const callbacks = [];
const selection = new SelectionManager({
  mapState: state,
  callbacks: {
    selectCountry: id => callbacks.push(["country", id]),
    selectRegion: (countryId, regionId) => callbacks.push(["region", countryId, regionId])
  }
});
for (const countryId of ["RUS", "CAN", "ESP"]) {
  assert.equal(selection.selectFeature({ properties: { countryId, name: countryId } }), countryId, `No se pudo seleccionar ${countryId}`);
  assert.equal(state.selectedCountryId, countryId, `El estado no conservó la selección ${countryId}`);
  assert.equal(state.selectedRegionId, null, `Seleccionar ${countryId} no limpió la región anterior`);
}
assert.equal(selection.selectFeature({ properties: { countryId: "USA", regionId: "US-AK", name: "Alaska" } }), "US-AK", "No se pudo seleccionar Alaska");
assert.equal(state.selectedCountryId, "USA");
assert.equal(state.selectedRegionId, "US-AK");
assert.equal(selection.selectFeature({ properties: { countryId: "ESP", regionId: "ES-AS", name: "Principado de Asturias" } }), "ES-AS", "No se pudo seleccionar una CCAA española");
assert.equal(state.selectedCountryId, "ESP");
assert.equal(state.selectedRegionId, "ES-AS");
assert.ok(callbacks.some(entry => entry.join(":") === "region:USA:US-AK"), "La selección de Alaska no llegó al controlador de regiones");
assert.ok(callbacks.some(entry => entry.join(":") === "region:ESP:ES-AS"), "La selección de CCAA no llegó al controlador de regiones");

const lod = new LODManager(MAP_CONFIG);
const lodCases = [[2, 0, "world"], [5, 1, "country"], [8, 2, "region"], [12, 3, "operational"]];
for (const [zoom, level, id] of lodCases) {
  assert.equal(lod.getLevel(zoom), level, `Zoom ${zoom} no resolvió LOD ${level}`);
  assert.equal(lod.profile(zoom, "high").id, id, `LOD ${level} no expuso el perfil ${id}`);
}
const operational = lod.profile(12, "ultra");
assert.ok(operational.showDetailedUnits && operational.showBuildings && operational.showProvinces && !operational.clustering, "LOD operacional no habilita su detalle obligatorio");
const world = lod.profile(2, "low");
assert.ok(world.simplifiedGeometry && world.clustering && !world.showTerrain && !world.showBuildings, "LOD mundo/bajo no aplica simplificación y agrupación agresivas");

const assets = new AssetManager({ rootUrl: new URL("../", import.meta.url) });
assert.match(assets.getVectorDataset(0), /ne_110m_admin_0_countries\.geojson$/, "LOD mundial no usa Natural Earth 1:110m");
assert.match(assets.getVectorDataset(1), /ne_50m_admin_0_countries\.geojson$/, "LOD medio no usa Natural Earth 1:50m");
assert.match(assets.getVectorDataset(3), /ne_10m_admin_0_countries\.geojson$/, "LOD cercano no usa Natural Earth 1:10m");

const mobile = new PerformanceManager({ quality: "auto", environment: { deviceMemory: 4, hardwareConcurrency: 4, devicePixelRatio: 2, compactViewport: true } });
assert.equal(mobile.quality, "medium", "Un móvil medio no seleccionó un perfil conservador");
assert.ok(mobile.getProfile().resolutionScale < 1 && mobile.getProfile().vegetation < MAP_QUALITY_PROFILES.ultra.vegetation, "El perfil móvil no reduce carga visual");
const constrained = new PerformanceManager({ quality: "auto", environment: { deviceMemory: 2, hardwareConcurrency: 2, devicePixelRatio: 3, compactViewport: true } });
assert.equal(constrained.quality, "low", "Un dispositivo muy limitado no seleccionó calidad baja");
for (const quality of ["ultra", "high", "medium", "low", "auto"]) {
  const profile = mobile.setQuality(quality, mobile.environment);
  assert.equal(profile.requestedQuality, quality, `No se pudo solicitar el perfil ${quality}`);
}
const low = mobile.setQuality("low");
assert.equal(low.terrain, false);
assert.equal(low.models3d, false);
assert.equal(low.animations, false);
assert.equal(low.particles, false);
mobile.setReducedMotion(true);
assert.equal(mobile.getProfile().transitionMs, 0, "Movimiento reducido no anuló transiciones del perfil gráfico");

camera.detach();
assets.dispose();
console.log("OK v6 interacción/LOD · 3 transiciones · cámara/selección persistentes · RUS/CAN/Alaska/ESP/CCAA · 4 LOD · 5 perfiles");
