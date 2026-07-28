"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
global.window = global;
if (!global.crypto) global.crypto = require("crypto").webcrypto;
if (!global.performance) global.performance = { now: () => Date.now() };

for (const file of [
  "world-data.js","data.js","catalog.js","politics.js","economy.js",
  "simulation-plus.js","deep-systems.js","alpha-v13.js","alpha-v14.js","alpha-v15.js","alpha-v16.js","alpha-v17.js","alpha-v18.js"
]) {
  vm.runInThisContext(fs.readFileSync(path.join(root,"js",file),"utf8"), { filename:file });
}

const E = global.NEXUS_ECONOMY;
const C = global.NEXUS_CATALOG;
const assert = (condition,message) => { if (!condition) throw new Error(message); };

const state = E.createInitialState();
assert(state.version === "1.8-alpha", "Versión incorrecta");
assert(state.countries.length === 197, "Deben existir 197 países");
assert(state.companies.length >= 170, "Bolsa insuficientemente ampliada");
assert(C.buildings.length >= 40, "Catálogo industrial insuficiente");
assert(C.technologies.length >= 60, "Árbol tecnológico insuficiente");
assert(E.getCountryRegions(state,"ESP").length === 17, "España debe tener 17 comunidades");

// Verifica que cada definición industrial pueda pasar de cola a activo territorial.
for (const def of C.buildings) {
  const s = E.createInitialState();
  const country = E.getCountry(s,"ESP");
  country.economy.treasury = 100000;
  country.systems.technology = 100;
  country.systems.industry = 100;
  country.systems.energy = 100;
  country.systems.logistics = 100;
  const region = E.getCountryRegions(s,"ESP")[0];
  region.capacitySlots = 999;
  region.infra = 100; region.energy = 100; region.stability = 100;
  // Evita que activos iniciales bloqueen la prueba de un tipo ya existente.
  for (const r of E.getCountryRegions(s,"ESP")) r.buildings = r.buildings.filter(x=>x.typeId!==def.id);
  country.productionQueue = country.productionQueue.filter(q=>q.buildingId!==def.id);
  const result = E.buildInRegion(s,region.id,def.id);
  assert(result.ok, `No se pudo iniciar ${def.id}: ${result.message}`);
  const queue = country.productionQueue.find(q=>q.kind==="facilityV3"&&q.buildingId===def.id);
  assert(queue, `Falta cola protegida para ${def.id}`);
  queue.daysRemaining = 1;
  E.tickDay(s);
  const current = E.getCountry(s,"ESP");
  const built = E.facilitiesInRegion(s,current,region.id).some(x=>x.typeId===def.id);
  assert(built, `La instalación ${def.id} desapareció sin construirse`);
  assert(!current.productionQueue.some(q=>q.id===queue.id), `La cola completada ${def.id} no se retiró`);
}

// Movimiento regional.
{
  const s = E.createInitialState(), country = E.getCountry(s,"ESP");
  const unit = country.units.find(u=>u.quantity>0), id=unit.id;
  const target = E.getCountryRegions(s,"ESP").find(r=>r.id!==unit.regionId);
  assert(E.moveUnit(s,id,target.id,"ESP").ok,"No se inició el movimiento regional");
  for(let i=0;i<30;i++) E.tickDay(s);
  const moved=E.getCountry(s,"ESP").units.find(u=>u.id===id);
  assert(moved.regionId===target.id&&!moved.movement,"La unidad no llegó a la región de destino");
}

// Guerra y conquista regional frente a un Estado pequeño.
{
  const s=E.createInitialState(),attacker=E.getCountry(s,"ESP"),defender=E.getCountry(s,"AND");
  s.controlledCountryId="ESP";attacker.relations.AND=0;defender.relations.ESP=0;attacker.militaryReadiness=99;
  assert(E.warAction(s,"AND","declare").ok,"No se pudo declarar la guerra de validación");
  const unit=attacker.units.filter(u=>u.quantity>0&&!['frigate','destroyer','submarine','carrier','satellite','missile','cyber'].includes(u.typeId)).sort((a,b)=>b.quantity-a.quantity)[0];
  const region=E.getCountryRegions(s,"AND")[0];
  assert(E.attackRegion(s,unit.id,"AND",region.id).ok,"No se inició el ataque regional");
  for(let i=0;i<75&&E.getRegion(s,"AND",region.id).controllerId!=="ESP";i++)E.tickDay(s);
  assert(E.getRegion(s,"AND",region.id).controllerId==="ESP","La conquista regional no se resolvió");
  assert(E.getControlledRegions(s,"ESP").some(r=>r.id===region.id),"La región conquistada no aparece entre los territorios controlados");
  const occupiedProduction=Object.values(E.getCountry(s,"ESP").resourceBalance||{}).reduce((sum,row)=>sum+(row.occupationProduction||0),0);
  assert(occupiedProduction>0,"La ocupación no transfirió producción regional");
}


// Cruce de mes: las colas diarias no pueden desaparecer por el procesador mensual.
{
  const s=E.createInitialState(),c=E.getCountry(s,"ESP"),r=E.getCountryRegions(s,"ESP")[0];
  c.economy.treasury=100000;c.systems.technology=100;c.systems.energy=100;c.systems.industry=100;r.infra=100;r.energy=100;r.stability=100;r.capacitySlots=999;
  const def=C.buildings.find(x=>!E.facilitiesInRegion(s,c,r.id).some(f=>f.typeId===x.id));
  assert(E.buildInRegion(s,r.id,def.id).ok,"No se pudo iniciar industria para prueba mensual");
  const fq=c.productionQueue.find(q=>q.kind==="facilityV3"&&q.buildingId===def.id);fq.daysRemaining=2;s.date="2028-01-31";E.tickDay(s);
  assert(c.productionQueue.some(q=>q.id===fq.id),"La industria desapareció al cerrar el mes");
  E.tickDay(s);assert(E.facilitiesInRegion(s,c,r.id).some(f=>f.typeId===def.id),"La industria no se creó tras cruzar el mes");

  const before=(c.units.find(u=>u.typeId==="submarine")?.quantity||0);assert(E.queueUnitBatch(s,"submarine",r.id,10).ok,"No se pudo pedir submarinos");
  const uq=c.productionQueue.find(q=>q.kind==="unitV2"&&q.typeId==="submarine");uq.daysRemaining=2;s.date="2028-02-29";E.tickDay(s);
  assert(c.productionQueue.some(q=>q.id===uq.id),"La orden militar desapareció al cerrar el mes");
  E.tickDay(s);const after=c.units.filter(u=>u.typeId==="submarine").reduce((sum,u)=>sum+u.quantity,0);assert(after===before+10,"El recuento de submarinos no creció correctamente");
}

// Tratado y anexión total.
{
  const s=E.createInitialState(),a=E.getCountry(s,"ESP"),d=E.getCountry(s,"AND");s.controlledCountryId="ESP";a.relations.AND=0;d.relations.ESP=0;a.militaryReadiness=99;
  const annexedRegions=E.getCountryRegions(s,"AND").slice(),gdpBefore=a.economy.gdp+d.economy.gdp,populationBefore=a.economy.population+d.economy.population,unitsBefore=a.units.reduce((n,u)=>n+u.quantity,0)+d.units.reduce((n,u)=>n+u.quantity,0);
  assert(E.warAction(s,"AND","declare").ok,"No se declaró la guerra de tratado");const w=s.wars.find(x=>!x.ended&&x.defender==="AND");w.warScore=90;w.territoryControl=90;
  assert(E.demandSurrender(s,w.id).ok,"No se pudo exigir capitulación");assert(E.annexCountry(s,w.id).ok,"No se pudo anexar el país derrotado");
  assert(d.annexedBy==="ESP"&&!d.sovereign,"La anexión total no quedó registrada");
  assert(annexedRegions.every(r=>r.ownerId==="ESP"&&r.controllerId==="ESP"),"Las regiones anexionadas no cambiaron de propietario");
  assert(E.getCountryRegions(s,"AND").length===0&&E.getCountryRegions(s,"ESP").some(r=>annexedRegions.includes(r)),"El territorio no pasó al inventario soberano del vencedor");
  assert(Math.abs(a.economy.gdp-gdpBefore)<.1&&Math.abs(a.economy.population-populationBefore)<.01,"PIB o población no fueron absorbidos íntegramente");
  assert(a.units.reduce((n,u)=>n+u.quantity,0)===unitsBefore&&d.units.length===0,"Las fuerzas armadas derrotadas no fueron integradas");
  assert(s.decisions.some(x=>x.status==="pending"&&x.category==="annexation"),"La anexión no generó opciones de integración en Resumen");
  const region=annexedRegions[0],def=C.buildings.find(x=>!E.facilitiesInRegion(s,a,region.id).some(f=>f.typeId===x.id));a.economy.treasury=100000;a.systems.technology=100;a.systems.industry=100;region.infra=100;region.energy=100;region.stability=100;region.capacitySlots=999;
  assert(E.buildInRegion(s,region.id,def.id).ok,"No se puede construir en el territorio anexionado");const queue=a.productionQueue.find(q=>q.targetRegionId===region.id&&q.buildingId===def.id);assert(queue,"La obra anexionada no entró en cola");queue.daysRemaining=1;E.tickDay(s);assert(E.facilitiesInRegion(s,a,region.id).some(f=>f.typeId===def.id),"La instalación del territorio anexionado no se completó");
}

// Elecciones reactivas: un gobierno con alto rendimiento debe ganar apoyo y el reparto suma 350.
{
  const s=E.createInitialState(),c=E.getCountry(s,"ESP"),ruling=c.politics.parties.find(p=>p.id===c.politics.rulingPartyId),before=ruling.seats;
  c.systems.approval=95;c.economy.growth=7;c.economy.inflation=1;c.economy.unemployment=3;c.politics.politicalCapital=100;
  const result=E.callElection(s);assert(result.ok,"No se pudieron celebrar elecciones reactivas");
  assert(c.politics.parties.reduce((sum,p)=>sum+p.seats,0)===350,"El parlamento electoral no suma 350 escaños");
  assert(ruling.seats>before,"Un gobierno con excelente rendimiento no ganó escaños");
  assert(c.politics.parties.some(p=>p.seatChange!==0),"El mapa parlamentario quedó idéntico");
}

// Comercio rentable y recursos importados positivos.
{
  const s=E.createInitialState(),c=E.getCountry(s,"ESP"),target=E.getCountry(s,"PRT");c.economy.treasury=100;c.relations.PRT=80;target.relations.ESP=80;
  assert(E.tradeAction(s,"PRT","trade").ok,"No se firmó el acuerdo comercial rentable");
  assert(s.tradeContracts.some(x=>x.countries.includes("ESP")&&x.countries.includes("PRT")),"No se creó el contrato comercial");
  assert(Object.values(c.resourceBalance).every(row=>row.balance>=0&&row.imports>=0),"Las importaciones siguen apareciendo como balances negativos");
  assert(c.economy.tradeBalance>0&&c.economy.tradeAgreementIncome>0,"El comercio no genera saldo económico positivo");
}

// IA geopolítica y decisiones accionables.
{
  const s=E.createInitialState(),actions=E.runAutonomousAI(s,{force:true,action:"conflict",attackerId:"FRA",defenderId:"ESP"});
  assert(actions.some(x=>x.type==="conflict")&&s.wars.some(w=>w.aiInitiated&&!w.ended),"La IA no fue capaz de iniciar un conflicto");
  const decision=s.decisions.find(x=>x.status==="pending"&&x.category==="security");assert(decision&&decision.options.length>=3,"La crisis de IA no llegó a Resumen con opciones");
  assert(E.resolveDecision(s,decision.id,"mobilize").ok&&decision.status==="resolved","No se pudo resolver la decisión de crisis");
}

// División de fuerzas para operar desde varios flancos.
{
  const s=E.createInitialState(),c=E.getCountry(s,"ESP"),u=c.units.find(x=>x.typeId==="infantry"&&x.quantity>100),targets=E.getCountryRegions(s,"ESP").filter(r=>r.id!==u.regionId);
  const before=c.units.length;assert(E.splitUnit(s,u.id,100,targets[0].id).ok,"No se pudo dividir la unidad");assert(c.units.length===before+1,"No se creó el destacamento");
}


// Alpha v1.6: cronología indefinida, presupuestos, empresas, decisiones y combate directo.
{
  const s=E.createInitialState(),c=E.getCountry(s,"ESP");
  assert(s.timeline?.indefinite===true&&s.timeline?.mode==="indefinite","La cronología no está marcada como indefinida");
  s.date="2029-04-30";for(let i=0;i<3;i++)E.tickDay(s);assert(s.date==="2029-05-03","La simulación no superó el 30 de abril de 2029");
  const healthBefore=c.budgets.health;assert(E.adjustBudget(s,"health",.5).ok&&c.budgets.health===Math.round((healthBefore+.5)*10)/10,"El botón presupuestario no incrementa el porcentaje");

  const controlled=s.companies.find(x=>x.countryId==="ESP")||s.companies[0];
  controlled.ownershipByCountry ||= {};controlled.ownershipByCountry.ESP=60;
  assert(controlled,"No hay empresa para probar gobierno corporativo");
  controlled.financials.profit=Math.max(120,Number(controlled.financials.profit)||0);
  assert(E.setCompanyPolicy(s,controlled.id,"dividend").ok,"No se pudo fijar política de dividendos");
  const treasuryBefore=c.economy.treasury;E.processControlledCompanyProfits(s);assert(c.economy.treasury>treasuryBefore,"Los beneficios controlados no llegaron al Tesoro");
  c.economy.treasury=1000;c.politics.politicalCapital=100;assert(E.enactNationalDecision(s,"housingPlan").ok,"No se pudo adoptar una decisión nacional");

  const d=E.getCountry(s,"AND");c.relations.AND=0;d.relations.ESP=0;c.militaryReadiness=99;
  const declaration=E.warAction(s,"AND","declare");assert(declaration.ok&&declaration.warId,"La declaración de guerra no devuelve identificador para la sala de guerra");
  const attacker=c.units.find(u=>u.quantity>0&&!['frigate','destroyer','submarine','carrier','satellite','missile','cyber'].includes(u.typeId));
  const defender=d.units.find(u=>u.quantity>0)||d.units[0];
  assert(attacker&&defender,"Faltan fuerzas para validar el combate directo");
  const direct=E.attackUnit(s,attacker.id,"AND",defender.id);assert(direct.ok&&direct.warId===declaration.warId,"No se pudo ordenar un ataque directo entre unidades");
  for(let i=0;i<20;i++)E.tickDay(s);
  const war=s.wars.find(w=>w.id===declaration.warId);assert(war&&Array.isArray(war.operations)&&war.operations.length>0,"La guerra no registra operaciones");
}

// Compatibilidad política: extremos incompatibles, espacios próximos negociables.
{
  const extreme=E.coalitionCompatibility(186),near=E.coalitionCompatibility(15);
  assert(extreme.chance===0,"Los extremos opuestos no deben coaligarse");
  assert(near.chance>=.8,"Partidos ideológicamente próximos deben negociar con facilidad");
}

// Alpha v1.8: I+D proporcional, nombres reales, deuda, presupuesto y reconstrucción.
{
  const s=E.createInitialState(),c=E.getCountry(s,"ESP");
  const baseRate=E.calculateResearchRate(s,c);c.budgets.research+=4;
  const highRate=E.calculateResearchRate(s,c);assert(highRate>baseRate+4,"La inversión adicional no aumenta proporcionalmente la generación de I+D");
  const techBefore=c.systems.technology,militaryBefore=c.systems.military,energyBefore=c.systems.energy;
  c.budgets.research=12;c.budgets.defense=10;c.budgets.infrastructure=10;s.date="2028-01-31";E.tickDay(s);
  assert(c.systems.technology>techBefore&&c.systems.military>militaryBefore&&c.systems.energy>energyBefore,"El presupuesto no modifica las capacidades nacionales");

  const usa=E.getCountryRegions(s,"USA").map(r=>r.name).join(" · "),col=E.getCountryRegions(s,"COL").map(r=>r.name).join(" · "),mar=E.getCountryRegions(s,"MAR").map(r=>r.name).join(" · ");
  assert(/Austin|Louisiana/.test(usa)&&/Medellín/.test(col)&&/Tánger/.test(mar),"Faltan nombres territoriales reales solicitados");

  c.economy.treasury=100000;const debtBefore=c.economy.debtRatio,interestBefore=c.economy.interestRate;
  assert(E.payDownDebt(s,5).ok&&c.economy.debtRatio<debtBefore&&c.economy.interestRate<interestBefore,"La amortización de deuda no mejora deuda e intereses");

  const facility=E.facilitiesForCountry(s,"ESP")[0];assert(E.upgradeCost(facility)>0,"No se expone el coste de mejora industrial");
  assert(E.nationalDecisionDefinitions.some(x=>x.id==="hospitalNetwork"),"No se añadieron decisiones nacionales v1.8");
}

// La anexión v1.8 consolida diplomacia, mercado interior y reconstrucción.
{
  const s=E.createInitialState(),a=E.getCountry(s,"ESP"),d=E.getCountry(s,"AND");s.controlledCountryId="ESP";a.relations.AND=0;d.relations.ESP=0;a.militaryReadiness=99;
  assert(E.warAction(s,"AND","declare").ok,"No se declaró la guerra de reconstrucción");const w=s.wars.find(x=>!x.ended&&x.defender==="AND");w.warScore=90;w.territoryControl=90;
  assert(E.demandSurrender(s,w.id).ok&&E.annexCountry(s,w.id).ok,"No se completó la anexión v1.8");
  const annexed=a.annexedCountries.at(-1),region=E.getRegion(s,"ESP",annexed.regions[0]);
  assert(d.sovereign===false&&a.internalTradeNetworks.some(x=>x.sourceCountryId==="AND"&&x.efficiency===100),"El Estado anexionado no desaparece o no activa comercio interior");
  assert(region.reconstruction?.damage>0,"La región conquistada no tiene daños reconstruibles");
  a.economy.treasury=100000;assert(E.reconstructRegion(s,region.id,"all").ok,"No se inició la reconstrucción");
  const q=a.productionQueue.find(x=>x.kind==="reconstructionV18"&&x.regionId===region.id);q.daysRemaining=1;E.tickDay(s);
  assert(region.reconstruction.status==="complete","La reconstrucción no devuelve la región al tejido productivo");
  assert(w.settlement?.resolved===true&&!s.wars.some(x=>x.id===w.id&&x.ended&&!x.settlement?.resolved),"El tratado quedó pendiente tras la anexión");
}

console.log(JSON.stringify({
  ok:true,
  version:state.version,
  countries:state.countries.length,
  companies:state.companies.length,
  industries:C.buildings.length,
  technologies:C.technologies.length,
  regionsSpain:E.getCountryRegions(state,"ESP").length
},null,2));
