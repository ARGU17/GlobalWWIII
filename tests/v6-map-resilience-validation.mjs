import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AssetManager } from "../js/map/assets/asset-manager.js";
import { FallbackRenderer } from "../js/map/renderers/fallback-renderer.js";
import { MapLibreRenderer } from "../js/map/renderers/maplibre-renderer.js";
import { TerrainRenderer } from "../js/map/renderers/terrain-renderer.js";
import { ThreeRenderer } from "../js/map/renderers/three-renderer.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rootUrl = new URL("../", import.meta.url);
const previousFetch = globalThis.fetch;
const failures = [];
globalThis.fetch = async () => ({ ok: false, status: 503, statusText: "Service Unavailable", json: async () => { throw new Error("sin JSON"); }, text: async () => "" });
try {
  const assets = new AssetManager({ rootUrl });
  assets.addEventListener("asseterror", event => failures.push(event.detail));
  const jsonFallback = { type: "FeatureCollection", features: [] };
  assert.equal(await assets.fetchJSON("assets/maps/v6/tile-missing.json", { fallback: jsonFallback }), jsonFallback, "Un asset ausente no devolvió su fallback local");
  assert.equal(await assets.fetchText("assets/maps/v6/tile-missing.pbf", { fallback: "fallback" }), "fallback", "Un tile ausente no devolvió contenido de recuperación");
  await assert.rejects(() => assets.fetchJSON("assets/maps/v6/required-missing.json", { required: true }), /recurso obligatorio/, "Un asset obligatorio ausente no produce error recuperable");
  assert.ok(failures.some(item => item.asset.endsWith("tile-missing.json")) && failures.some(item => item.asset.endsWith("tile-missing.pbf")), "Los fallos de assets/tiles no quedaron auditados");
  assert.equal(assets.getStatus().failures.length, 3, "El estado de assets no enumera todos los fallos simulados");
  assets.dispose();
} finally {
  globalThis.fetch = previousFetch;
}

const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
try {
  Object.defineProperty(globalThis, "navigator", { value: { onLine: false }, configurable: true });
  const offlineAssets = new AssetManager({ rootUrl });
  const status = offlineAssets.getStatus();
  assert.equal(status.offline, true, "El gestor de assets no detectó el modo sin conexión");
  const localCountryPath = offlineAssets.getVectorDataset(0);
  const localDem = offlineAssets.getDemSource();
  assert.match(localCountryPath, /^assets\/maps\/v6\//, "Offline no mantiene geometría nacional local");
  assert.match(localDem.tiles[0], /assets\/maps\/v6\/dem\/\{z\}\/\{x\}\/\{y\}\.png$/, "Offline no mantiene el DEM empaquetado");
  assert.equal(localDem.encoding, "terrarium");
  assert.equal(offlineAssets.getRasterProvider(), null, "Sin proveedor configurado no se debe inventar un servicio externo");
  await access(join(ROOT, localCountryPath));
  await access(join(ROOT, "assets/maps/v6/offline_fallback_land.geojson"));
  offlineAssets.dispose();
} finally {
  if (navigatorDescriptor) Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
  else delete globalThis.navigator;
}

const terrainFailures = [];
const terrainBackend = {
  map: {
    getSource: () => null,
    addSource: id => { if (id === "nexus-raster-base") throw new Error("tile provider offline"); },
    setTerrain: () => {}
  },
  ensureSource: () => {},
  ensureLayer: () => {},
  setVisibility: () => {},
  setPaint: () => {}
};
const emptyGeoJSON = { type: "FeatureCollection", features: [] };
const terrainAssets = {
  fetchJSON: async () => emptyGeoJSON,
  getRasterProvider: () => ({ type: "raster", tiles: ["https://tiles.invalid/{z}/{x}/{y}.png"] }),
  getDemSource: () => ({ type: "raster-dem", tiles: ["local/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256 }),
  recordFailure: (asset, error) => terrainFailures.push({ asset, error })
};
const terrain = new TerrainRenderer({ renderer: terrainBackend, assetManager: terrainAssets, layerManager: { isVisible: () => true } });
await terrain.initialize();
assert.ok(terrainFailures.some(item => item.asset === "raster-provider"), "El fallo del proveedor de tiles no se registró");
assert.ok(terrain.loaded.has("base") && terrain.demReady, "El fallo de tiles externos bloqueó el mapa vectorial/DEM local");

const demFailures = [];
const failingDemBackend = {
  map: { getSource: () => null, addSource: () => { throw new Error("DEM corrupto"); } },
  ensureLayer: () => {}, setVisibility: () => {}, setPaint: () => {}
};
const failingDem = new TerrainRenderer({
  renderer: failingDemBackend,
  assetManager: { getDemSource: () => ({}), recordFailure: (asset, error) => demFailures.push({ asset, error }) },
  layerManager: { isVisible: () => true }
});
assert.doesNotThrow(() => failingDem.initializeDem(), "Un DEM fallido propagó una excepción fatal");
assert.equal(failingDem.demReady, false, "Un DEM fallido quedó marcado como operativo");
assert.equal(demFailures[0]?.asset, "terrain-dem", "El fallo DEM no quedó identificado");

class SceneNode {
  constructor() {
    this.children = [];
    this.userData = {};
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { setScalar(value) { this.value = value; } };
  }
  add(child) { this.children.push(child); }
  remove(child) { this.children = this.children.filter(item => item !== child); }
  traverse(callback) { callback(this); for (const child of this.children) child.traverse?.(callback) ?? callback(child); }
}
class Material { constructor(properties) { Object.assign(this, properties); } clone() { return new Material({ ...this }); } dispose() {} }
class Geometry { dispose() {} }
class Mesh extends SceneNode { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
class RejectingLoader { async loadAsync() { throw new Error("modelo glTF ausente"); } }
const fakeThree = {
  Group: SceneNode, Mesh, MeshStandardMaterial: Material, MeshBasicMaterial: Material,
  BoxGeometry: Geometry, ConeGeometry: Geometry, CylinderGeometry: Geometry, SphereGeometry: Geometry,
  PointLight: class extends SceneNode { constructor(color, intensity, distance) { super(); this.color = color; this.intensity = intensity; this.distance = distance; } }
};
const modelFailures = [];
const three = new ThreeRenderer({
  renderer: { map: { triggerRepaint: () => {} } },
  assetManager: { resolve: path => path, recordFailure: (asset, error) => modelFailures.push({ asset, error }) },
  mapState: { selectedEntityId: null, selectedRegionId: null }
});
three.THREE = fakeThree;
three.GLTFLoader = RejectingLoader;
three.scene = new SceneNode();
await three.setEntity({ id: "armor-1", name: "Brigada Acorazada", unitType: "armor", longitude: -3.7, latitude: 40.4 });
assert.ok(three.object instanceof SceneNode && three.scene.children.includes(three.object), "El fallo glTF no produjo un modelo procedural de recuperación");
assert.equal(modelFailures[0]?.asset, "model:land", "El fallo del modelo no quedó registrado");
three.setQuality({ models3d: false, particles: false });
assert.equal(three.enabled, false, "El perfil bajo no desactivó modelos 3D");
assert.equal(three.object.visible, false, "El objeto 3D existente no se ocultó al bajar calidad");

const classNames = new Set();
const host = {
  dataset: {},
  classList: {
    add: (...names) => names.forEach(name => classNames.add(name)),
    remove: (...names) => names.forEach(name => classNames.delete(name))
  }
};
const canvas = { hidden: true, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
const notice = { hidden: true, textContent: "" };
const fallbackCalls = [];
const previousCanvasEngine = globalThis.NEXUS_CANVAS_MAP_ENGINE;
globalThis.NEXUS_CANVAS_MAP_ENGINE = {
  initialize: state => fallbackCalls.push(["initialize", state]),
  render: () => fallbackCalls.push(["render"]),
  focusCountry: id => id === "ESP",
  focusRegion: (_countryId, regionId) => regionId === "MAD",
  showWorld: () => true
};
try {
  const fallbackState = { mapLayer: "political" };
  const fallback = new FallbackRenderer({ host, canvas, notice }).initialize(fallbackState, {}, "WebGL no disponible");
  assert.equal(fallback.active, true);
  assert.equal(canvas.hidden, false, "El Canvas de recuperación permaneció oculto");
  assert.equal(canvas.attributes["aria-hidden"], "false");
  assert.equal(notice.hidden, false);
  assert.match(notice.textContent, /WebGL/);
  assert.ok(classNames.has("canvas-fallback") && classNames.has("map-fallback-active"), "El host no activó el estado visual de recuperación");
  fallback.setMapMode("political");
  fallback.setMapLayer("military");
  assert.equal(fallbackState.mapLayer, "military");
  assert.ok(fallbackCalls.some(call => call[0] === "render"), "El fallback no puede seguir renderizando tras cambiar de capa");
  assert.equal(fallback.focusCountry("ESP"), true);
  assert.equal(fallback.focusRegion("ESP", "MAD"), true);
  assert.equal(fallback.showWorld(), true);
} finally {
  if (previousCanvasEngine === undefined) delete globalThis.NEXUS_CANVAS_MAP_ENGINE;
  else globalThis.NEXUS_CANVAS_MAP_ENGINE = previousCanvasEngine;
}

const unsupported = new MapLibreRenderer({ host: {}, mapState: {}, assetManager: { capabilities: { webgl: false } } });
assert.equal(unsupported.isSupported(), false, "MapLibre se considera soportado sin WebGL");
const fallbackSource = await readFile(join(ROOT, "js/map/renderers/fallback-renderer.js"), "utf8");
const engineSource = await readFile(join(ROOT, "js/map/map-engine.js"), "utf8");
assert.match(engineSource, /contextlost[\s\S]*activateFallback/, "La pérdida de contexto WebGL no está conectada al fallback");
assert.match(engineSource, /isSupported\(\)[\s\S]*activateFallback|isSupported\(\)[\s\S]*throw new Error/, "La ausencia inicial de WebGL no desemboca en recuperación");
assert.match(fallbackSource, /NEXUS_CANVAS_MAP_ENGINE/, "El renderer Canvas legado no está cableado como recuperación");

console.log("OK v6 resiliencia · offline local · fallo asset/tile/DEM/modelo · WebGL→Canvas · degradación de calidad");
