"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.resolve(__dirname,"..");
global.window=global;
if(!global.crypto)global.crypto=require("crypto").webcrypto;
if(!global.performance)global.performance={now:()=>Date.now()};
for(const file of ["world-data.js","data.js","catalog.js","politics.js","economy.js","simulation-plus.js","deep-systems.js","alpha-v13.js","alpha-v14.js","alpha-v15.js","alpha-v16.js","alpha-v17.js","alpha-v18.js"]){
  vm.runInThisContext(fs.readFileSync(path.join(root,"js",file),"utf8"),{filename:file});
}
const E=NEXUS_ECONOMY,assert=(v,m)=>{if(!v)throw new Error(m)},s=E.createInitialState(),c=E.getCountry(s,"ESP");
assert(s.version==="1.8.1-alpha","Versión incorrecta");
const low=E.calculateResearchRate(s,c);c.budgets.research+=5;const high=E.calculateResearchRate(s,c);
assert(high>low,"I+D no responde a la inversión");
assert(/Austin|Louisiana/.test(E.getCountryRegions(s,"USA").map(r=>r.name).join(" ")),"Regiones de EEUU sin nombres reales");
assert(/Medellín/.test(E.getCountryRegions(s,"COL").map(r=>r.name).join(" ")),"Regiones de Colombia sin nombres reales");
assert(/Tánger/.test(E.getCountryRegions(s,"MAR").map(r=>r.name).join(" ")),"Regiones de Marruecos sin nombres reales");
const debt=c.economy.debtRatio,interest=c.economy.interestRate;c.economy.treasury=100000;
assert(E.payDownDebt(s,5).ok&&c.economy.debtRatio<debt&&c.economy.interestRate<interest,"Amortización de deuda defectuosa");
const d=E.getCountry(s,"AND");c.relations.AND=0;d.relations.ESP=0;c.militaryReadiness=99;
assert(E.warAction(s,"AND","declare").ok,"Declaración de guerra fallida");
const w=s.wars.find(x=>!x.ended&&x.defender==="AND");w.warScore=90;w.territoryControl=90;
assert(E.demandSurrender(s,w.id).ok&&E.annexCountry(s,w.id).ok,"Anexión fallida");
const item=c.annexedCountries.at(-1),r=E.getRegion(s,"ESP",item.regions[0]);
assert(d.sovereign===false&&c.internalTradeNetworks.some(x=>x.sourceCountryId==="AND"),"Consolidación soberana o comercio interior fallidos");
assert(r.reconstruction?.damage>0,"No se generaron daños reconstruibles");
c.economy.treasury=100000;assert(E.reconstructRegion(s,r.id,"all").ok,"No se inició reconstrucción");
const q=c.productionQueue.find(x=>x.kind==="reconstructionV18"&&x.regionId===r.id);q.daysRemaining=1;E.tickDay(s);
assert(r.reconstruction.status==="complete","Reconstrucción no completada");
console.log(JSON.stringify({ok:true,version:s.version,research:{low,high},annexed:d.sovereign===false,internalTrade:true,reconstructed:true},null,2));
