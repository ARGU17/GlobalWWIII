"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("js/app.js");
const ui = read("js/ui.js");
const html = read("index.html");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(app.includes("const SPEED_OPTIONS=[1,2,4,16,32]"), "El motor no admite todas las velocidades");
assert(app.includes("remaining*DAY_MS/normalizeSpeed(state.speed)"), "El temporizador no conserva el tiempo restante");
assert(app.includes('nexus_alpha_v1_8_2_save'), "La clave de guardado no corresponde a v1.8.2");
assert(app.includes('nexus_alpha_v1_8_1_save'), "Falta migración del guardado v1.8.1");
assert(app.includes('nexus_alpha_v1_8_save'), "Falta migración del guardado v1.8");
assert(ui.includes('[data-sim-action]'), "Los controles temporales no usan delegación estable");
for (const speed of [1,2,4,16,32]) assert(html.includes(`data-speed="${speed}"`), `Falta el botón x${speed}`);
assert(html.includes('data-sim-action="toggle"') && html.includes('data-sim-action="step"'), "Faltan acciones de iniciar/pausar o avance manual");
assert(html.includes("Alpha v1.8.2"), "La portada no muestra v1.8.2");

console.log(JSON.stringify({ok:true,version:"1.8.2-alpha",speeds:[1,2,4,16,32],delegatedControls:true,remainingTimeAware:true},null,2));
