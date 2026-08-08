import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const RELEASE_VERSION = "6.0.0";
export const RELEASE_NAME = `GlobalWWIII-v${RELEASE_VERSION}.zip`;
export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DIST_DIR = path.join(ROOT_DIR, "dist");
export const RELEASE_PATH = path.join(DIST_DIR, RELEASE_NAME);
export const CHECKSUM_PATH = `${RELEASE_PATH}.sha256`;

export const RELEASE_STATIC_FILES = Object.freeze([
  "index.html",
  "404.html",
  ".nojekyll",
  "sw.js"
]);

export const RELEASE_DIRECTORIES = Object.freeze([
  "css",
  "js",
  "assets",
  "tests",
  "data",
  "core",
  "simulation",
  "world",
  "ai",
  "ui",
  "workers",
  "compat"
]);

const ignoredNames = new Set([".DS_Store"]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function posix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function assertSafeArchivePath(relativePath) {
  assert(relativePath && !path.isAbsolute(relativePath), `Ruta absoluta no permitida: ${relativePath}`);
  assert(!relativePath.includes("\\"), `Separador no portable: ${relativePath}`);
  const parts = relativePath.split("/");
  assert(!parts.includes("") && !parts.includes(".") && !parts.includes(".."), `Ruta no segura: ${relativePath}`);
  assert(!relativePath.startsWith("-"), `Nombre interpretable como opción: ${relativePath}`);
}

export function listRootDocuments(rootDir = ROOT_DIR) {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && (/\.md$/i.test(entry.name) || /\.txt$/i.test(entry.name)))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function releaseEntries(rootDir = ROOT_DIR) {
  const entries = [...RELEASE_STATIC_FILES, ...RELEASE_DIRECTORIES, ...listRootDocuments(rootDir)];
  for (const entry of entries) {
    assertSafeArchivePath(entry);
    assert(fs.existsSync(path.join(rootDir, entry)), `Falta una entrada obligatoria: ${entry}`);
  }
  return entries;
}

function walkFiles(rootDir, relativePath, output) {
  const absolutePath = path.join(rootDir, relativePath);
  const stat = fs.lstatSync(absolutePath);
  assert(!stat.isSymbolicLink(), `No se permiten enlaces simbólicos en la entrega: ${relativePath}`);
  if (stat.isFile()) {
    if (!ignoredNames.has(path.basename(relativePath))) output.push(posix(relativePath));
    return;
  }
  assert(stat.isDirectory(), `Tipo de entrada no permitido: ${relativePath}`);
  for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignoredNames.has(entry.name)) continue;
    walkFiles(rootDir, path.join(relativePath, entry.name), output);
  }
}

export function listReleaseSourceFiles(rootDir = ROOT_DIR) {
  const files = [];
  for (const entry of releaseEntries(rootDir)) walkFiles(rootDir, entry, files);
  return files.sort((a, b) => a.localeCompare(b));
}

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${label} (código ${result.status})\n${result.stdout || ""}${result.stderr || ""}`.trim());
  }
  return result.stdout || "";
}

function archiveListing(zipPath) {
  return run("unzip", ["-Z1", zipPath], "No se pudo listar el ZIP")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

function validateArchive(zipPath, expectedEntries, expectedFiles) {
  run("unzip", ["-t", zipPath], "La prueba de integridad unzip -t ha fallado");
  const listing = archiveListing(zipPath);
  assert(listing.length > 0, "El ZIP está vacío");
  for (const entry of listing) {
    const normalized = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    assertSafeArchivePath(normalized);
    assert(!normalized.startsWith(".git/") && normalized !== ".git", "El ZIP contiene .git");
    assert(!normalized.startsWith("dist/") && normalized !== "dist", "El ZIP contiene dist");
    assert(!normalized.startsWith("__MACOSX/"), "El ZIP contiene metadatos __MACOSX");
  }

  const actualRoots = [...new Set(listing.map(entry => entry.replace(/\/$/, "").split("/")[0]))].sort();
  const expectedRoots = [...expectedEntries].sort();
  assert(
    JSON.stringify(actualRoots) === JSON.stringify(expectedRoots),
    `Raíz ZIP incorrecta. Esperado ${expectedRoots.join(", ")}; recibido ${actualRoots.join(", ")}`
  );

  const actualFiles = listing.filter(entry => !entry.endsWith("/")).sort((a, b) => a.localeCompare(b));
  assert(
    JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
    "El contenido del ZIP no coincide exactamente con el manifiesto de publicación"
  );
}

export function buildRelease() {
  const entries = releaseEntries();
  const expectedFiles = listReleaseSourceFiles();
  fs.mkdirSync(DIST_DIR, { recursive: true });
  for (const artifact of [RELEASE_PATH, CHECKSUM_PATH]) {
    if (fs.existsSync(artifact)) fs.unlinkSync(artifact);
  }

  run(
    "zip",
    [
      "-q",
      "-X",
      "-r",
      RELEASE_PATH,
      ...entries,
      "-x",
      ".git/*",
      "*/.git/*",
      "dist/*",
      "*/dist/*",
      ".DS_Store",
      "*/.DS_Store",
      "__MACOSX/*"
    ],
    "No se pudo construir el ZIP con la herramienta del sistema"
  );

  validateArchive(RELEASE_PATH, entries, expectedFiles);
  const bytes = fs.readFileSync(RELEASE_PATH);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  assert(/^[a-f0-9]{64}$/.test(sha256), "SHA-256 inválido");
  fs.writeFileSync(CHECKSUM_PATH, `${sha256}  ${RELEASE_NAME}\n`, "utf8");

  const result = {
    version: RELEASE_VERSION,
    archive: path.relative(ROOT_DIR, RELEASE_PATH),
    checksum: path.relative(ROOT_DIR, CHECKSUM_PATH),
    sha256,
    files: expectedFiles.length,
    bytes: fs.statSync(RELEASE_PATH).size
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) buildRelease();
