"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.resolve(__dirname,"..");global.window=global;
if(!global.crypto)global.crypto=require("crypto").webcrypto;
if(!global.performance)global.performance={now:()=>Date.now()};
for(const file of ["world-data.js","data.js","catalog.js","politics.js","economy.js","simulation-plus.js","deep-systems.js","alpha-v13.js","alpha-v14.js","alpha-v15.js","alpha-v16.js","alpha-v17.js","alpha-v18.js","alpha-v19.js"]){
  vm.runInThisContext(fs.readFileSync(path.join(root,"js",file),"utf8"),{filename:file});
}
const E=NEXUS_ECONOMY,assert=(v,m)=>{if(!v)throw new Error(m)},s=E.createInitialState(),esp=E.getCountry(s,"ESP");
assert(s.version==="1.9.0-alpha","Versión v1.9.0 incorrecta");
assert(s.mapBase==="vector","El mapa fijo vectorial no es el modo predeterminado");
assert(E.campaignDefinitions.length>=7&&E.warDoctrineDefinitions.length>=4,"Catálogo multidominio incompleto");
for(const def of s.unitCatalog){assert(/^assets\/icons\/.+\.svg$/.test(def.icon),`Icono militar roto: ${def.id}`);assert(def.mapGlyph,`Falta glifo cartográfico: ${def.id}`)}
assert(esp.units.every(u=>u.displayName&&u.displayName.length>8),"Las unidades no recibieron denominaciones nacionales");
assert(esp.units.some(u=>/Leopard 2E|Eurofighter|Álvaro de Bazán|S-80/.test(u.displayName)),"España no usa sistemas militares reconocibles");

const selectedParty=esp.politics.parties.find(p=>p.id!==esp.politics.rulingPartyId),before=selectedParty.popularity;
esp.politics.politicalCapital=100;esp.economy.treasury=1000;
assert(E.endorseParty(s,selectedParty.id).ok,"No se pudo elegir partido electoral");
assert(E.campaignForParty(s,selectedParty.id,"national").ok,"No se pudo hacer campaña por el partido elegido");
assert(esp.politics.electoralStrategy.endorsedPartyId===selectedParty.id&&selectedParty.popularity>before,"La campaña no alteró el apoyo electoral");
assert(E.electionForecast(s,esp).some(p=>p.id===selectedParty.id&&Number.isFinite(p.projectedSeats)),"Falta previsión electoral dinámica");

const and=E.getCountry(s,"AND");esp.relations.AND=0;and.relations.ESP=0;esp.militaryReadiness=95;esp.politics.politicalCapital=100;esp.economy.treasury=1000;esp.strategicStockpile={fuel:100,munitions:100};
const declaration=E.warAction(s,"AND","declare");assert(declaration.ok&&declaration.warId,"No se abrió guerra de validación");
assert(E.setWarDoctrine(s,declaration.warId,"precision").ok,"No se aplicó doctrina de guerra");
const operation=E.launchWarCampaign(s,declaration.warId,"airSuperiority",E.getCountryRegions(s,"AND")[0].id);assert(operation.ok,"No se inició la campaña aérea");
for(let i=0;i<7;i++)E.tickDay(s);
const war=s.wars.find(w=>w.id===declaration.warId),campaign=war.campaigns.find(x=>x.id===operation.campaignId);
assert(campaign.status==="completed"&&campaign.progress===100&&campaign.impact>0,"La campaña aérea no se resolvió");
assert(war.operations.some(x=>String(x.type).includes("airSuperiority")),"La campaña no dejó parte operacional");

console.log(JSON.stringify({ok:true,version:s.version,map:"vector",campaigns:E.campaignDefinitions.length,doctrines:E.warDoctrineDefinitions.length,icons:s.unitCatalog.length,unit:esp.units[0].displayName,electoralChoice:selectedParty.name,airImpact:campaign.impact},null,2));
