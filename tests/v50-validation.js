"use strict";

const fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.resolve(__dirname,"..");global.window=global;
if(!global.crypto)global.crypto=require("crypto").webcrypto;
if(!global.performance)global.performance={now:()=>Date.now()};
const legacy=["world-data.js","data.js","catalog.js","politics.js","economy.js","simulation-plus.js","deep-systems.js","alpha-v13.js","alpha-v14.js","alpha-v15.js","alpha-v16.js","alpha-v17.js","alpha-v18.js","alpha-v19.js","alpha-v20.js"];
const v5=["kernel.js","state.js","systems-economy.js","systems-society.js","systems-governance.js","systems-geopolitics.js","systems-world.js","bridge.js"];
for(const file of legacy)vm.runInThisContext(fs.readFileSync(path.join(root,"js",file),"utf8"),{filename:file});
for(const file of v5)vm.runInThisContext(fs.readFileSync(path.join(root,"js","v5",file),"utf8"),{filename:`v5/${file}`});
const E=NEXUS_ECONOMY,V=NEXUS_V5,assert=(value,message)=>{if(!value)throw new Error(message)};
const finite=value=>{if(typeof value==="number")return Number.isFinite(value);if(Array.isArray(value))return value.every(finite);if(value&&typeof value==="object")return Object.values(value).every(finite);return true};

const state=E.createInitialState(),esp=E.getCountry(state,"ESP");
assert(state.version==="5.0.0-alpha","La versión v5 no está activa");
assert(state.v5.schema===5,"La migración no alcanza el esquema 5");
assert(state.countries.length===197,"La v5 debe conservar los 197 países");
assert(V.systems.length>=23,"Faltan sistemas modulares v5");
assert(Object.keys(esp.v5.economy.products).length===9,"Faltan mercados de productos");
assert(esp.v5.economy.firms.length>=3,"Faltan empresas agentes");
assert(esp.v5.society.cohorts.working>0,"Faltan cohortes demográficas");
assert(esp.v5.governance.institutions.stateCapacity>0,"Faltan instituciones");
assert(esp.v5.infrastructure.energy.capacity>0,"Falta red energética");
assert(esp.v5.military.logistics.supply===100,"Falta logística militar");

const selected=state.selectedCountryId,region=state.selectedRegionId;
for(let i=0;i<95;i++)E.tickDay(state);
assert(state.selectedCountryId===selected&&state.selectedRegionId===region,"El avance temporal cambió la selección");
assert(state.worldIndex.globalGDP>0&&state.worldIndex.globalPopulation>0,"No se actualizaron agregados mundiales");
assert(state.v5.lastRun.systems.length>0,"El pipeline modular no se ejecutó");
assert(esp.v5.factors.growth.length>0,"Faltan explicaciones causales");
assert(state.v5Networks.trade.edges.length>0,"La red global de suministro está vacía");
assert(state.organizations.length>=8,"Faltan organizaciones internacionales");
assert(esp.v5.society.cities.length>=2,"Falta la red urbana nacional");
assert(Number.isFinite(esp.v5.foreign.treatyCompliance),"El cumplimiento de tratados no se actualiza");
assert(finite(state),"La simulación contiene valores no finitos");
for(const p of Object.values(esp.v5.economy.products))assert(p.supply>=0&&p.demand>=0&&p.inventory>=0,"Mercado de productos inválido");

const a=E.createInitialState(),b=E.createInitialState();
for(let i=0;i<35;i++){E.tickDay(a);E.tickDay(b)}
const signature=s=>JSON.stringify({date:s.date,gdp:E.getCountry(s,"ESP").economy.gdp,inflation:E.getCountry(s,"ESP").economy.inflation,products:E.getCountry(s,"ESP").v5.economy.products,world:s.worldIndex,systems:s.v5.lastRun.systems});
assert(signature(a)===signature(b),"La semilla no produce resultados deterministas");

const annex=E.createInitialState(),attacker=E.getCountry(annex,"ESP"),defender=E.getCountry(annex,"PRT"),pop=attacker.economy.population,gdp=attacker.economy.gdp,firms=attacker.v5.economy.firms.length;
NEXUS_V5_BRIDGE.integrateAnnexation(annex,{id:"test-war"},attacker,defender);
assert(defender.sovereign===false&&defender.annexedBy==="ESP","La anexión no elimina la soberanía separada");
assert(attacker.economy.population>pop&&attacker.economy.gdp>gdp,"La anexión no absorbe población y PIB");
assert(attacker.v5.economy.firms.length>firms,"La anexión no integra empresas");
assert(annex.occupationZones.length===1&&annex.actionInbox.some(x=>x.status==="pending"),"Falta la transición de ocupación");
const decision=annex.actionInbox.find(x=>x.status==="pending"),resolved=E.resolveV5Decision(annex,decision.id,1);
assert(resolved.ok&&decision.status==="resolved","Las decisiones v5 no se resuelven");

const legacyState=NEXUS_V5_BRIDGE.legacy.create();delete legacyState.v5;const migrated=E.hydrateState(legacyState);
assert(migrated.v5.schema===5&&migrated.version==="5.0.0-alpha","Un guardado v2 no migra a v5");
console.log(`OK v5.0 · ${V.systems.length} sistemas · 197 países · 95 días · determinismo y migración validados`);
