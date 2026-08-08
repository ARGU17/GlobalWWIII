import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const cleanReference = reference => reference.split("#", 1)[0].split("?", 1)[0];

for (const required of ["index.html", "404.html", ".nojekyll", "sw.js", "compat/legacy-v52.bundle.js", "compat/legacy-v52.manifest.json"]) {
  assert(fs.existsSync(path.join(root, required)), `Falta ${required}`);
}

const index = read("index.html");
assert(index.includes('serviceWorker.register("./sw.js"'), "index.html no registra el fallback offline local");
const serviceWorker=read("sw.js");
assert(serviceWorker.includes("caches.open")&&serviceWorker.includes('request.mode==="navigate"')&&serviceWorker.includes("offline_fallback_land.geojson"),"El Service Worker no cubre shell, navegación y mapa local");
assert(!/<base\s+[^>]*href=["']\/["']/i.test(index), "Un <base href=\"/\"> rompería GitHub Pages bajo /GlobalWWIII/");
assert(!/(?:src|href)=["']file:\/\//i.test(index), "index.html contiene una referencia file://");

const htmlReferences = [...index.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map(match => match[1]);
const localReferences = htmlReferences
  .filter(reference => !/^(?:https?:|data:|blob:|mailto:|#)/i.test(reference))
  .map(cleanReference)
  .filter(Boolean);
for (const reference of localReferences) {
  assert(!reference.startsWith("/"), `Referencia absoluta incompatible con Pages: ${reference}`);
  assert(fs.existsSync(path.join(root, reference)), `Recurso HTML inexistente: ${reference}`);
}

for (const cssFile of fs.readdirSync(path.join(root, "css")).filter(name => name.endsWith(".css"))) {
  const css = read(path.join("css", cssFile));
  const references = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map(match => match[1]);
  for (const rawReference of references) {
    if (/^(?:https?:|data:|blob:|#)/i.test(rawReference)) continue;
    const reference = cleanReference(rawReference);
    const target = path.resolve(root, "css", reference);
    assert(target.startsWith(`${root}${path.sep}`), `Ruta CSS fuera del proyecto: ${rawReference}`);
    assert(fs.existsSync(target), `Recurso CSS inexistente: css/${reference}`);
  }
}

const compatManifest = JSON.parse(read("compat/legacy-v52.manifest.json"));
assert(Array.isArray(compatManifest) && compatManifest.length > 0, "El manifiesto de compatibilidad está vacío");
const compatBundle = read("compat/legacy-v52.bundle.js");
for (const source of compatManifest) {
  assert(typeof source === "string" && !source.startsWith("/") && !source.includes(".."), `Fuente de compatibilidad no segura: ${source}`);
  assert(fs.existsSync(path.join(root, source)), `Fuente de compatibilidad inexistente: ${source}`);
  assert(compatBundle.includes(`/* ---- ${source} ---- */`), `El bundle no identifica la fuente ${source}`);
}

const assetFiles = [];
const collect = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(absolute);
    else if (entry.isFile()) assetFiles.push(absolute);
    else throw new Error(`Tipo de asset no publicable: ${path.relative(root, absolute)}`);
  }
};
collect(path.join(root, "assets"));
assert(assetFiles.length > 0, "assets/ está vacío");
for (const asset of assetFiles) {
  if (path.basename(asset) === ".gitkeep") continue;
  assert(fs.statSync(asset).size > 0, `Asset vacío: ${path.relative(root, asset)}`);
}

console.log(`OK v6 static · ${localReferences.length} referencias HTML · ${compatManifest.length} fuentes bundle · ${assetFiles.length} assets`);
