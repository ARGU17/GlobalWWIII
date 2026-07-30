import fs from"node:fs";
import path from"node:path";
import vm from"node:vm";
import{fileURLToPath}from"node:url";
import{createArchitecture}from"../core/entry.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");globalThis.window=globalThis;if(!globalThis.crypto)globalThis.crypto=(await import("node:crypto")).webcrypto;if(!globalThis.performance)globalThis.performance={now:()=>Date.now()};
vm.runInThisContext(fs.readFileSync(path.join(root,"compat/legacy-v52.bundle.js"),"utf8"),{filename:"compat/legacy-v52.bundle.js"});
const read=name=>JSON.parse(fs.readFileSync(path.join(root,"data/v54",name),"utf8")),config={owners:read("ownership.json"),events:read("event-types.json"),schema:read("state.schema.json"),manifest:read("systems.json"),resources:read("market-resources.json")},architecture=createArchitecture({engine:globalThis.NEXUS_ECONOMY,config}),days=Math.max(0,Number(process.argv[2])||30),state=architecture.runHeadless(null,days),controlled=state.countries.find(x=>x.id===state.controlledCountryId);
console.log(JSON.stringify({version:state.version,schema:state.v54.schema,date:state.date,days,countries:state.countries.length,controlled:controlled.name,gdp:controlled.economy.gdp,systems:architecture.scheduler.manifest().length,audit:state.v54.audit.length,uiLoaded:Boolean(globalThis.NEXUS_UI)},null,2));
