import fs from"node:fs";
import path from"node:path";
import{fileURLToPath}from"node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),manifestPath=path.join(root,"compat/legacy-v52.manifest.json"),output=path.join(root,"compat/legacy-v52.bundle.js"),manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const banner=`/* GENERATED FILE — Strategic Command v5.4\n * Fuente congelada v5.2. No editar: npm-free build con tools/build-v54-compat.mjs.\n * El desarrollo nuevo vive en core/, simulation/, world/, ai/ y ui/.\n */\n`;
const body=manifest.map(file=>`\n/* ---- ${file} ---- */\n${fs.readFileSync(path.join(root,file),"utf8")}\n`).join("");fs.writeFileSync(output,banner+body);console.log(`v5.4 compat: ${manifest.length} fuentes → ${path.relative(root,output)} (${fs.statSync(output).size} bytes)`);
