import{readFile}from"node:fs/promises";
import{fileURLToPath}from"node:url";
import{dirname,join}from"node:path";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const assert=(condition,message)=>{if(!condition)throw new Error(`v6 responsive: ${message}`)};
const[index,css]=await Promise.all([
  readFile(join(root,"index.html"),"utf8"),
  readFile(join(root,"css/styles.css"),"utf8")
]);

const main=index.match(/<main class="command-grid">([\s\S]*?)<\/main>/)?.[1]??"";
assert(main.includes('class="left-rail"')&&main.includes('class="center-stage"')&&main.includes('class="right-rail"'),"la rejilla debe conservar sus tres zonas funcionales");

const marker="/* v6 mobile: el mapa es la superficie primaria; los paneles contextuales siguen debajo. */";
const mobile=css.slice(css.indexOf(marker));
assert(css.includes(marker),"debe existir una regla móvil explícita y auditable");
assert(/^\/\*[^]*?@media\(max-width:720px\)\{/.test(mobile),"la reordenación debe limitarse al breakpoint móvil de 720 px");
assert(/grid-template-areas:\s*"map-stage"\s*"country-panels"\s*"decision-panels"/.test(mobile),"el escenario del mapa debe ocupar la primera fila móvil");
assert(/\.command-grid>\.center-stage\{grid-area:map-stage;min-width:0\}/.test(mobile),"center-stage debe asignarse al área superior");
assert(/\.command-grid>\.left-rail\{grid-area:country-panels;min-width:0\}/.test(mobile),"los paneles nacionales deben situarse después del mapa");
assert(/\.command-grid>\.right-rail\{grid-area:decision-panels;min-width:0\}/.test(mobile),"los paneles de decisiones deben cerrar el flujo móvil");

console.log("OK v6 responsive · mapa primero en móvil · escritorio/tableta intactos");
