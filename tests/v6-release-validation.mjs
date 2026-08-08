import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  CHECKSUM_PATH,
  RELEASE_DIRECTORIES,
  RELEASE_NAME,
  RELEASE_PATH,
  RELEASE_STATIC_FILES,
  ROOT_DIR,
  listReleaseSourceFiles,
  listRootDocuments
} from "../tools/build-v6-release.mjs";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: ROOT_DIR, encoding: "utf8" });
  if (result.error) throw result.error;
  assert(result.status === 0, `${command} ${args.join(" ")} falló\n${result.stdout || ""}${result.stderr || ""}`);
  return result.stdout || "";
};

assert(fs.existsSync(RELEASE_PATH), `No existe ${path.relative(ROOT_DIR, RELEASE_PATH)}; ejecuta tools/build-v6-release.mjs`);
assert(fs.existsSync(CHECKSUM_PATH), "Falta el fichero SHA-256 de la entrega");
run("unzip", ["-t", RELEASE_PATH]);

const listing = run("unzip", ["-Z1", RELEASE_PATH]).split(/\r?\n/).filter(Boolean);
const files = listing.filter(entry => !entry.endsWith("/")).sort((a, b) => a.localeCompare(b));
const expectedFiles = listReleaseSourceFiles();
assert(JSON.stringify(files) === JSON.stringify(expectedFiles), "El ZIP no reproduce exactamente los archivos publicables");

const expectedRoots = [...RELEASE_STATIC_FILES, ...RELEASE_DIRECTORIES, ...listRootDocuments()].sort();
const roots = [...new Set(listing.map(entry => entry.replace(/\/$/, "").split("/")[0]))].sort();
assert(JSON.stringify(roots) === JSON.stringify(expectedRoots), "La raíz del ZIP contiene entradas ausentes o inesperadas");
assert(files.includes("index.html") && files.includes("404.html") && files.includes(".nojekyll"), "Faltan archivos raíz de GitHub Pages");
for (const directory of RELEASE_DIRECTORIES) {
  assert(files.some(file => file.startsWith(`${directory}/`)), `El directorio ${directory}/ está vacío o ausente`);
}
assert(!listing.some(entry => /(^|\/)(\.git|dist)(\/|$)/.test(entry)), "El ZIP contiene .git o dist");
assert(!listing.some(entry => entry.startsWith("/") || entry.includes("\\") || entry.split("/").includes("..")), "El ZIP contiene una ruta no portable o insegura");

const actualHash = createHash("sha256").update(fs.readFileSync(RELEASE_PATH)).digest("hex");
const checksumText = fs.readFileSync(CHECKSUM_PATH, "utf8").trim();
assert(checksumText === `${actualHash}  ${RELEASE_NAME}`, "El fichero SHA-256 no corresponde al ZIP");
assert(/^[a-f0-9]{64}$/.test(actualHash), "El hash publicado no es SHA-256");

console.log(`OK v6 release · ${files.length} archivos · raíz directa · unzip -t · SHA-256 ${actualHash.slice(0, 12)}…`);
