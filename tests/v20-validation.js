"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.resolve(__dirname,"..");global.window=global;
if(!global.crypto)global.crypto=require("crypto").webcrypto;
if(!global.performance)global.performance={now:()=>Date.now()};
for(const file of ["world-data.js","data.js","catalog.js","politics.js","economy.js","simulation-plus.js","deep-systems.js","alpha-v13.js","alpha-v14.js","alpha-v15.js","alpha-v16.js","alpha-v17.js","alpha-v18.js","alpha-v19.js","alpha-v20.js"]){
  vm.runInThisContext(fs.readFileSync(path.join(root,"js",file),"utf8"),{filename:file});
}
const E=NEXUS_ECONOMY,assert=(v,m)=>{if(!v)throw new Error(m)},s=E.createInitialState(),esp=E.getCountry(s,"ESP"),usa=E.getCountry(s,"USA");
const appSource=fs.readFileSync(path.join(root,"js","app.js"),"utf8"),mapSource=fs.readFileSync(path.join(root,"js","map.js"),"utf8"),cssSource=fs.readFileSync(path.join(root,"css","styles.css"),"utf8");
assert(s.version==="2.0.0-alpha","Versión v2.0.0 incorrecta");
assert(s.countries.length===197,"El mapa mundial no conserva 197 países");
assert(/function selectCountry\([^)]+\)[\s\S]*focusCountry/.test(appSource),"Seleccionar país no centra la cámara");
assert(mapSource.includes("function showWorld()")&&mapSource.includes("return{initialize,render,focusCountry,focusRegion,showWorld}"),"Falta el restablecimiento mundial");
assert(mapSource.includes('camera.zoom>=3.2&&!show.has(country.id)'),"La capa militar no filtra países vecinos al acercarse");
assert(cssSource.includes("height:650px"),"El mapa profesional no alcanza la altura prevista");
assert(E.campaignDefinitions.length>=13,"El catálogo operacional no contiene 13 campañas");
assert(E.campaignDefinitions.some(x=>x.id==="sead")&&E.campaignDefinitions.some(x=>x.id==="airborneAssault"),"Faltan operaciones aéreas avanzadas");
for(const src of new Set(Object.values(E.militaryPhotoPaths))){assert(fs.existsSync(path.join(root,src)),`Falta fotografía militar local: ${src}`)}
for(const u of esp.units){assert(u.modelId&&u.modelName&&u.photo,`Plataforma española sin identificar: ${u.typeId}`);assert(u.displayName.startsWith(u.modelName),`El nombre visible no empieza por la plataforma real: ${u.typeId}`)}
const usaFighters=E.nationalMilitaryPlatforms.USA.fighter.map(x=>x.name).join(" ");
assert(/F-35A/.test(usaFighters)&&/F-22A/.test(usaFighters)&&/F-16V/.test(usaFighters),"Catálogo estadounidense incompleto");
const espSystems=Object.values(E.nationalMilitaryPlatforms.ESP).flat().map(x=>x.name).join(" ");
assert(/Eurofighter/.test(espSystems)&&/S-80 Plus/.test(espSystems)&&/F-110/.test(espSystems),"Catálogo español incompleto");

esp.economy.treasury=100000;esp.systems.technology=100;esp.systems.industry=100;const region=E.getCountryRegions(s,"ESP")[0];
const order=E.queueUnitBatch(s,"fighter",region.id,2);assert(order.ok,"No se pudo contratar una plataforma real");
const queued=esp.productionQueue.find(q=>q.kind==="unitV2"&&q.typeId==="fighter");assert(queued?.modelName&&queued?.photo,"La orden no conserva modelo y fotografía");queued.daysRemaining=1;E.tickDay(s);
assert(esp.units.some(u=>u.typeId==="fighter"&&u.modelId===queued.modelId),"La unidad terminada perdió su modelo real");

const and=E.getCountry(s,"AND");esp.relations.AND=0;and.relations.ESP=0;esp.militaryReadiness=95;esp.politics.politicalCapital=100;esp.economy.treasury=1000;esp.strategicStockpile={fuel:100,munitions:100};
const declaration=E.warAction(s,"AND","declare");assert(declaration.ok,"No se pudo crear guerra de validación");
assert(E.setOperationalPlan(s,declaration.warId,"surge","discriminate","logistics",75).ok,"No se guardó el plan operacional");
const war=s.wars.find(w=>w.id===declaration.warId),side=war.attacker==="ESP"?"attacker":"defender";
assert(war.operationalPlan[side].tempo==="surge"&&war.operationalPlan[side].support===75,"El plan no persistió");
assert(!E.launchWarCampaign(s,war.id,"amphibiousAssault",E.getCountryRegions(s,"AND")[0].id).ok,"El asalto anfibio ignoró sus prerrequisitos");
assert(E.mobilizeReserves(s,war.id).ok&&war.operationalPlan[side].mobilized,"La movilización no habilita operaciones estratégicas");
const posture=E.defensePosture(s),situation=E.globalSituation(s);
assert(Object.values(posture).every(Number.isFinite),"La postura conjunta contiene datos inválidos");
assert(situation.wars>=1&&Array.isArray(situation.flashpoints)&&situation.chokepoints.length===5,"La sala de situación global está incompleta");

console.log(JSON.stringify({ok:true,version:s.version,countries:s.countries.length,campaigns:E.campaignDefinitions.length,photos:new Set(Object.values(E.militaryPhotoPaths)).size,spanishPlatform:esp.units[0].modelName,americanFighters:usaFighters,posture,flashpoints:situation.flashpoints.length},null,2));
