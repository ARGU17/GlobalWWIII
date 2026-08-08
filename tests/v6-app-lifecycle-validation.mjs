import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const mapFacadeSource = fs.readFileSync(path.join(root, "js/map.js"), "utf8");
const mapEngineSource = fs.readFileSync(path.join(root, "js/map/map-engine.js"), "utf8");

const bindBody = appSource.match(/function bindState\(\)\{([\s\S]*?)\n  \}/)?.[1] || "";
assert.ok(bindBody, "No se encontró bindState");
assert.doesNotMatch(bindBody, /hydrateState\s*\(/, "bindState vuelve a hidratar un estado ya normalizado");

const continueHandler = appSource.match(/continueBtn\?\.addEventListener\("click",([\s\S]*?)\);\n/)?.[1] || "";
assert.ok(continueHandler, "No se encontró el controlador Continuar");
assert.doesNotMatch(continueHandler, /loadState\s*\(|hydrateState\s*\(|rebind\s*\(/, "Continuar vuelve a cargar o hidratar el guardado de arranque");
assert.equal((appSource.match(/function launchWarCampaign\s*\(/g) || []).length, 1, "launchWarCampaign debe declararse exactamente una vez");
assert.match(mapFacadeSource, /setSelection:\(countryId,regionId\)=>engine\.setSelection\(countryId,regionId\)/, "La fachada no expone la sincronización de selección");
const engineSelectionBody = mapEngineSource.match(/setSelection\(countryId=null,regionId=null\)\{([^\n]+)\}/)?.[1] || "";
assert.ok(engineSelectionBody, "MapEngine no implementa setSelection");
assert.doesNotMatch(engineSelectionBody, /callbacks|selectCountry\(|selectRegion\(/, "setSelection no debe reentrar por callbacks de selección");

class FakeElement {
  constructor(id, initial = {}) {
    this.id = id;
    this.hidden = initial.hidden ?? false;
    this.value = initial.value ?? "";
    this.innerHTML = "";
    this.textContent = "";
    this.handlers = new Map();
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  addEventListener(type, handler) { this.handlers.set(type, handler); }
  setAttribute(name, value) { this[name] = value === "" ? true : value; }
  remove() { this.removed = true; }
  dispatch(type, event = {}) { return this.handlers.get(type)?.(event); }
}

class MemoryStorage {
  constructor() { this.rows = new Map(); }
  get length() { return this.rows.size; }
  key(index) { return [...this.rows.keys()][index] ?? null; }
  getItem(key) { return this.rows.get(key) ?? null; }
  setItem(key, value) { this.rows.set(key, String(value)); }
  removeItem(key) { this.rows.delete(key); }
  clear() { this.rows.clear(); }
}

const elements = new Map([
  ["startOverlay", new FakeElement("startOverlay")],
  ["startCountrySelect", new FakeElement("startCountrySelect", { value: "ESP" })],
  ["continueBtn", new FakeElement("continueBtn", { hidden: true })],
  ["startCampaignBtn", new FakeElement("startCampaignBtn")],
  ["observerBtn", new FakeElement("observerBtn")],
  ["startFlag", new FakeElement("startFlag")],
  ["startCountryName", new FakeElement("startCountryName")],
  ["startCountrySummary", new FakeElement("startCountrySummary")],
  ["bootLoader", new FakeElement("bootLoader")],
  ["bootError", new FakeElement("bootError", { hidden: true })],
  ["bootErrorText", new FakeElement("bootErrorText")]
]);

const country = (id, name, annexedBy = null) => ({
  id, name, annexedBy, flag: id === "ESP" ? "🇪🇸" : "🏳️",
  economy: { gdp: 100, population: 10 },
  systems: { industry: 50, technology: 50, military: 50 }
});
const loadedState = {
  countries: [country("ESP", "España"), country("CAN", "Canadá"), country("ANN", "Estado anexionado", "CAN")],
  controlledCountryId: "ESP",
  selectedCountryId: "ESP",
  selectedRegionId: "ES-AS",
  mapMode: "regions",
  mapLayer: "political",
  speed: 4,
  running: false,
  settings: { autosave: false },
  simulation: { clockFraction: 0, clockAnchor: null }
};

let domReady = null;
let restoreCalls = 0;
let hydrateCalls = 0;
let initializeCalls = 0;
let actions = null;
let mapCallbacks = null;
const selectionCalls = [];
const focusCalls = [];
const toasts = [];

const context = {
  console,
  document: {
    readyState: "loading",
    getElementById: id => elements.get(id) || null,
    body: { classList: { toggle() {} } }
  },
  localStorage: new MemoryStorage(),
  performance: { now: () => 1000 },
  requestAnimationFrame: callback => { callback(1000); return 1; },
  cancelAnimationFrame() {},
  setTimeout: () => 1,
  clearTimeout() {},
  confirm: () => true,
  NEXUS_AUTH: { storageKey: key => `${key}:test-user`, currentUser: () => ({ id: "test-user", guest: false }) },
  NEXUS_V60: {
    saveStore: { status: { mode: "indexeddb" } },
    restore: async () => { restoreCalls += 1; return loadedState; }
  },
  NEXUS_ECONOMY: {
    hydrateState: value => { hydrateCalls += 1; return { ...value }; },
    createInitialState: () => ({ ...loadedState }),
    getCountry: state => state.countries.find(item => item.id === state.controlledCountryId),
    getCountryRegions: (_state, countryId) => countryId === "CAN" ? [{ id: "CAN-ON" }] : countryId === "ESP" ? [{ id: "ES-AS" }] : []
  },
  NEXUS_UI: {
    initialize: (_state, nextActions) => { initializeCalls += 1; actions = nextActions; },
    renderAll() {},
    toast: (message, type) => toasts.push([message, type])
  },
  NEXUS_MAP_ENGINE: {
    initialize: (_state, callbacks) => { mapCallbacks = callbacks; },
    setSelection: (countryId, regionId) => selectionCalls.push([countryId, regionId]),
    focusCountry: countryId => focusCalls.push(["country", countryId]),
    focusRegion: (countryId, regionId) => focusCalls.push(["region", countryId, regionId]),
    render() {},
    showWorld() {}
  }
};
context.window = context;
context.addEventListener = (type, handler) => { if (type === "DOMContentLoaded") domReady = handler; };

vm.createContext(context);
vm.runInContext(appSource, context, { filename: "js/app.js" });
assert.equal(typeof domReady, "function", "app.js no registró el arranque DOM");
await domReady();

assert.equal(restoreCalls, 1, "El arranque debe restaurar una sola vez");
assert.equal(hydrateCalls, 0, "bindState no debe rehidratar el resultado de restore");
assert.equal(initializeCalls, 1, "El estado restaurado debe enlazarse una sola vez");
assert.equal(context.NEXUS_STATE, loadedState, "bindState sustituyó la referencia ya hidratada");
assert.equal(elements.get("continueBtn").hidden, false, "Continuar debe mostrarse cuando el arranque recuperó una campaña");

elements.get("continueBtn").dispatch("click");
assert.equal(restoreCalls, 1, "Continuar volvió a leer el guardado");
assert.equal(hydrateCalls, 0, "Continuar volvió a hidratar el guardado");
assert.equal(initializeCalls, 1, "Continuar volvió a enlazar toda la interfaz");
assert.equal(elements.get("startOverlay").hidden, true, "Continuar no cerró la pantalla inicial");

actions.selectCountry("CAN");
assert.equal(context.NEXUS_STATE.selectedCountryId, "CAN");
assert.equal(context.NEXUS_STATE.selectedRegionId, null, "Seleccionar país debe limpiar la región anterior");
assert.deepEqual(selectionCalls.at(-1), ["CAN", null], "La selección de país no llegó a MapState por la API pública");
assert.deepEqual(focusCalls.at(-1), ["country", "CAN"]);

const beforeMapCountry = selectionCalls.length;
mapCallbacks.selectCountry("ANN");
assert.equal(selectionCalls.length, beforeMapCountry + 1, "La selección originada en el mapa reentró o no sincronizó");
assert.deepEqual(selectionCalls.at(-1), ["CAN", null], "Un país anexionado no se resolvió al soberano antes de sincronizar");

actions.selectRegion("CAN", "CAN-ON");
assert.equal(context.NEXUS_STATE.selectedCountryId, "CAN");
assert.equal(context.NEXUS_STATE.selectedRegionId, "CAN-ON");
assert.equal(context.NEXUS_STATE.mapMode, "regions");
assert.deepEqual(selectionCalls.at(-1), ["CAN", "CAN-ON"], "La región no llegó a MapState por la API pública");
assert.deepEqual(focusCalls.at(-1), ["region", "CAN", "CAN-ON"]);

const beforeMapRegion = selectionCalls.length;
mapCallbacks.selectRegion("CAN", "CAN-ON");
assert.equal(selectionCalls.length, beforeMapRegion + 1, "La región originada en el mapa reentró o no sincronizó");

const beforeInvalid = selectionCalls.length;
actions.selectRegion("CAN", "CAN-INVALID");
assert.equal(selectionCalls.length, beforeInvalid, "Una región inválida se propagó al mapa");
assert.ok(toasts.some(([message]) => /Partida v6\.0 cargada/.test(message)), "Continuar no confirmó el estado ya cargado");

console.log("OK v6 app lifecycle · restauración única · Continuar sin rehidratar · selección MapState sin recursión · campaña única");
