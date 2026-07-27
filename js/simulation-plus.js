"use strict";

(() => {
  const base = window.NEXUS_ECONOMY;
  if (!base) throw new Error("NEXUS_ECONOMY debe cargarse antes de simulation-plus.js");
  const C = window.NEXUS_CATALOG;
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = base.clamp;
  const round = base.round;
  const originalCreate = base.createInitialState;
  const originalTick = base.tickMonth;

  const sectorDefaults = {
    services: 61, industry: 18, public: 15, agriculture: 3, construction: 6,
    tourism: 11, automotive: 6, energy: 4, digital: 7, defense: 2
  };

  function hydrateState(state) {
    state.version = "1.1-alpha";
    state.world ||= { tension:34, climate:1.34, energyStress:28, foodStress:19, tradeIndex:100, marketIndex:100, co2Index:100 };
    state.resources ||= [
      {id:"oil",name:"Petróleo",icon:"🛢️",price:82,trend:0,volatility:0.055},
      {id:"gas",name:"Gas natural",icon:"🔥",price:44,trend:0,volatility:0.070},
      {id:"uranium",name:"Uranio",icon:"☢️",price:91,trend:0,volatility:0.045},
      {id:"lithium",name:"Litio",icon:"🔋",price:68,trend:0,volatility:0.085},
      {id:"rare",name:"Tierras raras",icon:"💎",price:112,trend:0,volatility:0.080},
      {id:"food",name:"Alimentos",icon:"🌾",price:101,trend:0,volatility:0.035}
    ];
    state.tradeRoutes ||= [];
    state.wars ||= [];
    state.objectives ||= C.objectives.map(o => ({...clone(o), completed:false, completedDate:null}));
    state.research ||= { points:165, queue:[], completed:[], selectedBranch:"Digital" };
    state.activePolicies ||= [];
    state.mapLayer ||= "political";
    state.contextTab ||= "actions";
    state.portfolio ||= {};
    state.intelReports ||= {};
    state.score ||= 0;
    state.settings ||= {};
    state.settings.autosave ??= true;
    state.settings.reducedMotion ??= false;
    state.settings.denseUI ??= false;
    state.settings.showMapLabels ??= true;

    // Enrich units and companies.
    const knownUnits = new Set(state.unitCatalog.map(u => u.id));
    for (const unit of C.extraUnits) if (!knownUnits.has(unit.id)) state.unitCatalog.push(clone(unit));
    for (const unit of state.unitCatalog) {
      unit.stats ||= deriveUnitStats(unit);
      unit.description ||= unitDescription(unit.id);
    }
    const knownCompanies = new Set(state.companies.map(c => c.id));
    for (const company of C.extraCompanies) {
      if (!knownCompanies.has(company.id)) state.companies.push({...clone(company), history:[company.price], ownership:{state:0,player:0}});
    }
    for (const company of state.companies) {
      company.ownership ||= {state:0,player:0};
      company.controller ||= company.ownership.player >= 51 ? "ESP" : company.countryId;
      company.revenue ||= round(company.marketCap * (0.32 + Math.random()*0.18), 1);
      company.employees ||= Math.round(company.marketCap * 430 + 1500);
      company.risk ||= Math.round(25 + Math.random()*35);
      company.history ||= [company.price];
    }

    for (const country of state.countries) hydrateCountry(country, state);
    for (const region of state.regions) hydrateRegion(region);
    seedBuildings(state);
    seedTradeRoutes(state);
    seedSpanishTechnology(state);
    return state;
  }

  function hydrateCountry(country, state) {
    const e = country.economy;
    const s = country.systems;
    country.sectors ||= clone(sectorDefaults);
    if (country.id === "ESP") Object.assign(country.sectors, {services:63,industry:24,agriculture:4,construction:7,tourism:13,automotive:8,energy:6,digital:9,defense:4});
    if (country.id === "DEU") Object.assign(country.sectors, {industry:28,automotive:10,digital:9});
    if (country.id === "USA") Object.assign(country.sectors, {services:70,digital:15,defense:6});
    if (country.id === "CHN") Object.assign(country.sectors, {industry:36,automotive:12,digital:12});
    e.interestRate ??= clamp(e.inflation + 0.8, 0.5, 12);
    e.exports ??= round(e.gdp * (country.id === "ESP" ? 0.36 : 0.30), 1);
    e.imports ??= round(e.gdp * (country.id === "ESP" ? 0.31 : 0.28), 1);
    e.tradeBalance ??= round(e.exports - e.imports, 1);
    e.reserves ??= round(e.gdp * 0.085, 1);
    e.exchangeRate ??= 1;
    e.productivity ??= round((s.industry+s.technology+s.logistics)/3,1);
    e.wageIndex ??= round(70 + e.gdp/Math.max(e.population,1)*1.2,1);
    e.housingPressure ??= country.id === "ESP" ? 58 : 48;
    e.energyBalance ??= round((s.energy-70)*1.8,1);
    e.foodBalance ??= round((s.food-70)*1.4,1);
    e.monthlyRevenue ||= 0;
    e.monthlySpending ||= 0;
    e.monthlyBalance ||= 0;
    e.rating ||= debtRating(e.debtRatio, s.stability, e.growth);
    country.government ||= {
      regime:"Democracia parlamentaria", ideology:country.id === "ESP" ? "Centro reformista" : "Gobierno nacional",
      legitimacy:round((s.stability+s.approval)/2,1), efficiency:round((s.logistics+s.technology)/2,1), corruption:country.id === "ESP" ? 24 : 30,
      monthsToElection:country.id === "ESP" ? 31 : 40
    };
    country.researchPoints ??= country.id === "ESP" ? 165 : Math.round(s.technology*1.4);
    country.completedTechs ||= [];
    country.techQueue ||= [];
    country.activePolicies ||= [];
    country.portfolio ||= {};
    country.intelReports ||= {};
    country.strategicStockpile ||= {fuel:70,munitions:66,food:81,medical:74};
    country.militaryDoctrine ||= country.id === "ESP" ? "Defensa expedicionaria" : "Defensa nacional";
    country.militaryReadiness ??= round((s.military+s.logistics)/2,1);
    country.warExhaustion ??= 0;
    country.sanctionLevel ??= 0;
    country.influence ??= round((s.technology+s.military+s.stability+e.confidence)/4,1);
    country.objectiveScore ??= 0;
    country.ai ||= {focus: aiFocus(country), cooldown:0};
    const nuclearTable = {USA:3700,RUS:4300,CHN:500,FRA:290,GBR:225,IND:170};
    country.nuclear ||= { warheads:nuclearTable[country.id]||0, alert:0, doctrine:"Disuasión mínima", taboo:true };
    if (!country.history.trade) country.history.trade=[];
    if (!country.history.debt) country.history.debt=[];
    if (!country.history.approval) country.history.approval=[];
    if (!country.history.energy) country.history.energy=[];
  }

  function hydrateRegion(region) {
    region.buildings ||= [];
    region.jobs ||= Math.round(region.population * 500000 * (0.78 + region.industry/350));
    region.unemployment ??= round(clamp(13 - region.industry/14 - region.infra/32, 3.2, 18),1);
    region.approval ??= round(clamp(region.stability-7+Math.random()*5,35,92),1);
    region.energyDemand ??= round(region.population*1.8 + region.industry*0.08,1);
    region.energySupply ??= round(region.energy*0.14,1);
    region.research ??= Math.round((region.industry+region.infra)*0.45);
    region.logistics ??= region.infra;
    region.defense ??= round(45 + region.industry*0.22,1);
    region.housing ??= round(clamp(70-region.population*1.2+region.infra*.18,35,90),1);
    region.resources ||= regionResourceMix(region.id);
  }

  function seedBuildings(state) {
    const seeds = {
      MAD:["university","aerospace","cyberCenter"], CAT:["autoPlant","chipFab","port"], PVA:["steelPlant","autoPlant"],
      GAL:["shipyard","wind","port"], AST:["steelPlant","wind"], ARA:["autoPlant","rail","wind"],
      AND:["solar","aerospace","port"], VAL:["autoPlant","port","solar"], CYL:["wind","rail"],
      CLM:["solar","grid"], EXT:["solar"], MUR:["shipyard","solar"], CAN:["port","cyberCenter"], BAL:["housing","port"]
    };
    for (const region of state.regions) {
      if (region.buildings.length) continue;
      for (const id of seeds[region.id] || ["housing"]) region.buildings.push({id:crypto.randomUUID(),typeId:id,level:1,condition:100});
    }
  }

  function seedTradeRoutes(state) {
    if (state.tradeRoutes.length) return;
    const pairs = [["ESP","FRA",88],["ESP","DEU",82],["ESP","PRT",91],["ESP","USA",74],["ESP","MAR",61],["ESP","ITA",79],["USA","CHN",52],["DEU","CHN",67]];
    state.tradeRoutes = pairs.map(([a,b,eff]) => ({id:crypto.randomUUID(),a,b,efficiency:eff,volume:round(8+Math.random()*24,1),risk:round(10+Math.random()*20,1)}));
  }

  function seedSpanishTechnology(state) {
    const esp = state.countries.find(c=>c.id==="ESP");
    if (!esp.completedTechs.length) esp.completedTechs=["aiGov","smartGrid","advancedMaterials"];
    state.research.completed = [...new Set([...(state.research.completed||[]),...esp.completedTechs])];
  }

  function createInitialState() { return hydrateState(originalCreate()); }

  function tickMonth(state) {
    hydrateState(state);
    const baseSummary = originalTick(state);
    updateWorld(state);
    updateResources(state);
    updateRegions(state);
    updateBuildings(state);
    updateTechnology(state);
    updatePolicies(state);
    updateMilitary(state);
    updateWars(state);
    updateTrade(state);
    updateObjectives(state);
    simulateAI(state);
    enhancedEvents(state);
    const country = base.getCountry(state);
    recalcCountry(country, state);
    state.score = state.objectives.reduce((sum,o)=>sum+(o.completed?o.reward:0),0);
    return {...baseSummary, enhanced:true, score:state.score};
  }

  function recalcCountry(country, state) {
    const e=country.economy, s=country.systems;
    const budget=calculateDetailedBudget(country,state);
    e.monthlyRevenue=budget.monthlyRevenue; e.monthlySpending=budget.monthlySpending; e.monthlyBalance=budget.monthlyBalance;
    e.tradeBalance=round(e.exports-e.imports,1);
    e.productivity=round((s.industry+s.technology+s.logistics)/3,1);
    e.rating=debtRating(e.debtRatio,s.stability,e.growth);
    country.government.legitimacy=round(clamp((s.stability+s.approval)/2-(country.government.corruption-25)*.12,10,98),1);
    country.government.efficiency=round(clamp((s.logistics+s.technology+e.confidence)/3,20,98),1);
    country.influence=round((s.technology+s.military+s.stability+e.confidence+country.government.legitimacy)/5,1);
    recordExtraHistory(country);
  }

  function calculateDetailedBudget(country,state) {
    const e=country.economy,b=country.budgets,s=country.systems;
    const corporate=e.gdp*(e.taxRate/100)*0.31;
    const income=e.gdp*(e.taxRate/100)*0.49;
    const consumption=e.gdp*(e.taxRate/100)*0.20;
    const trade=Math.max(-8,e.tradeBalance*.025);
    const controlled=state.companies.filter(c=>c.ownership.player>=51).reduce((sum,c)=>sum+c.marketCap*.0025,0);
    const annualRevenue=corporate+income+consumption+trade+controlled;
    const ministries=e.gdp*(Object.values(b).reduce((a,v)=>a+v,0)/100);
    const debtService=e.gdp*(e.debtRatio/100)*(0.012+e.interestRate/100);
    const administration=e.gdp*(0.020+(100-country.government.efficiency)/5000);
    const militaryUpkeep=country.units.reduce((sum,u)=>sum+(state.unitCatalog.find(d=>d.id===u.typeId)?.upkeep||0),0)*12;
    const annualSpending=ministries+debtService+administration+militaryUpkeep;
    return {corporate:round(corporate),income:round(income),consumption:round(consumption),trade:round(trade),controlled:round(controlled),annualRevenue:round(annualRevenue),ministries:round(ministries),debtService:round(debtService),administration:round(administration),militaryUpkeep:round(militaryUpkeep),annualSpending:round(annualSpending),annualBalance:round(annualRevenue-annualSpending),monthlyRevenue:round(annualRevenue/12),monthlySpending:round(annualSpending/12),monthlyBalance:round((annualRevenue-annualSpending)/12)};
  }

  function updateWorld(state) {
    const w=state.world;
    const avgInfl=state.countries.reduce((a,c)=>a+c.economy.inflation,0)/state.countries.length;
    const avgEnergy=state.countries.reduce((a,c)=>a+c.systems.energy,0)/state.countries.length;
    const avgFood=state.countries.reduce((a,c)=>a+c.systems.food,0)/state.countries.length;
    w.energyStress=round(clamp(70-avgEnergy+state.resources.find(r=>r.id==="gas").price/8,0,100),1);
    w.foodStress=round(clamp(70-avgFood+state.resources.find(r=>r.id==="food").price/12,0,100),1);
    w.tradeIndex=round(clamp(w.tradeIndex+(Math.random()-.48)*1.5-state.countries.reduce((a,c)=>a+c.sanctionLevel,0)*.01,60,145),1);
    w.marketIndex=round(clamp(w.marketIndex+(avgInfl<4?.5:-.4)+(Math.random()-.5)*2,55,170),1);
    w.tension=round(clamp(w.tension+(Math.random()-.5)*1.4+state.wars.length*.4,5,100),1);
    w.climate=round(clamp(w.climate+0.0015+Math.random()*.001,1,4.8),3);
  }

  function updateResources(state) {
    for (const r of state.resources) {
      const old=r.price;
      const tension=state.world.tension/100;
      const stress=r.id==="food"?state.world.foodStress/100:state.world.energyStress/100;
      const shock=(Math.random()-.5)*r.volatility;
      r.price=round(clamp(r.price*(1+shock+tension*.004+stress*.003),20,250),2);
      r.trend=round((r.price-old)/old*100,2);
    }
  }

  function updateRegions(state) {
    const esp=state.countries.find(c=>c.id==="ESP");
    for (const r of state.regions) {
      const buildingBonus=r.buildings.reduce((sum,b)=>sum+(C.buildings.find(d=>d.id===b.typeId)?.effects.gdp||0)*b.level,0);
      const potential=(r.infra+r.industry+r.energy+r.stability+r.research)/500;
      r.gdp=round(r.gdp*(1+(esp.economy.growth/1200)*(.75+potential*.4))+buildingBonus/12,2);
      r.unemployment=round(clamp(r.unemployment-(esp.economy.growth-1.5)*.04-(r.industry-70)*.006+(Math.random()-.5)*.08,2.4,24),1);
      r.approval=round(clamp(r.approval+(esp.systems.approval-r.approval)*.035-(r.unemployment-7)*.03,20,96),1);
      r.stability=round(clamp(r.stability+(r.approval-55)*.01,35,98),1);
      r.energyDemand=round(r.population*1.8+r.industry*.08,1);
      r.energySupply=round(r.energy*.14+r.buildings.reduce((sum,b)=>sum+(C.buildings.find(d=>d.id===b.typeId)?.effects.energySupply||0)*b.level,0),1);
      r.jobs=Math.round(r.population*500000*(.78+r.industry/350));
    }
  }

  function updateBuildings(state) {
    const esp=state.countries.find(c=>c.id==="ESP");
    const totals={industry:0,technology:0,logistics:0,energy:0,renewables:0,military:0,intelligence:0,emissions:0,exports:0,researchPoints:0};
    for (const r of state.regions) for (const b of r.buildings) {
      const def=C.buildings.find(d=>d.id===b.typeId); if(!def) continue;
      for(const [k,v] of Object.entries(def.effects)) if(k in totals) totals[k]+=v*b.level*(b.condition/100);
      b.condition=round(clamp(b.condition-(Math.random()*.08),55,100),1);
    }
    esp.systems.industry=round(clamp(84+totals.industry*.16,0,100),2);
    esp.systems.technology=round(clamp(82+totals.technology*.18+esp.completedTechs.length*.8,0,100),2);
    esp.systems.logistics=round(clamp(90+totals.logistics*.25,0,100),2);
    esp.systems.energy=round(clamp(82+totals.energy*.22,0,100),2);
    esp.systems.renewables=round(clamp(75+totals.renewables*.25,0,100),2);
    esp.systems.military=round(clamp(76+totals.military*.19+esp.units.reduce((s,u)=>s+(state.unitCatalog.find(d=>d.id===u.typeId)?.power||0),0)*.012,0,100),2);
    esp.systems.intelligence=round(clamp(73+totals.intelligence*.24,0,100),2);
    esp.economy.exports=round(esp.economy.exports+totals.exports*.01,1);
    esp.researchPoints=round(esp.researchPoints+totals.researchPoints/12+esp.budgets.research*1.1,1);
  }

  function updateTechnology(state) {
    for(const country of state.countries){
      country.researchPoints=round(country.researchPoints+country.budgets.research*.9+country.systems.technology*.025,1);
      for(const q of country.techQueue) q.monthsRemaining--;
      const done=country.techQueue.filter(q=>q.monthsRemaining<=0);
      country.techQueue=country.techQueue.filter(q=>q.monthsRemaining>0);
      for(const q of done){
        const tech=C.technologies.find(t=>t.id===q.techId); if(!tech) continue;
        country.completedTechs.push(tech.id);
        for(const [k,v] of Object.entries(tech.effects)) applyEffect(country,k,v);
        base.pushEvent(state,"technology",`${tech.name} completada`,`${country.name} despliega una nueva capacidad tecnológica.`);
      }
    }
  }

  function startResearch(state,techId){
    const country=base.getCountry(state); const tech=C.technologies.find(t=>t.id===techId);
    if(!tech)return{ok:false,message:"Tecnología no encontrada."};
    if(country.completedTechs.includes(techId)||country.techQueue.some(q=>q.techId===techId))return{ok:false,message:"Tecnología ya investigada o en cola."};
    if(tech.requires.some(id=>!country.completedTechs.includes(id)))return{ok:false,message:"Faltan prerrequisitos."};
    if(country.researchPoints<tech.cost)return{ok:false,message:"Puntos de investigación insuficientes."};
    country.researchPoints=round(country.researchPoints-tech.cost,1);
    country.techQueue.push({id:crypto.randomUUID(),techId,name:tech.name,monthsRemaining:tech.months,totalMonths:tech.months});
    base.pushEvent(state,"technology","Investigación iniciada",tech.name);
    return{ok:true,message:"Investigación añadida a la cola."};
  }

  function updatePolicies(state){
    for(const country of state.countries){
      for(const p of country.activePolicies){
        p.months--;
        const def=C.policies.find(x=>x.id===p.policyId); if(!def)continue;
        for(const [k,v] of Object.entries(def.effects)) applyEffect(country,k,v/12);
      }
      country.activePolicies=country.activePolicies.filter(p=>p.months>0);
    }
  }

  function enactPolicy(state,policyId){
    const country=base.getCountry(state); const p=C.policies.find(x=>x.id===policyId);
    if(!p)return{ok:false,message:"Política desconocida."};
    if(country.activePolicies.some(x=>x.policyId===policyId))return{ok:false,message:"Política ya activa."};
    if(country.economy.treasury<p.cost)return{ok:false,message:"Tesorería insuficiente."};
    country.economy.treasury=round(country.economy.treasury-p.cost,2);
    country.activePolicies.push({id:crypto.randomUUID(),policyId,months:18});
    base.pushEvent(state,"policy",`Política aprobada: ${p.name}`,p.description);
    return{ok:true,message:"Política activada durante 18 meses."};
  }

  function applyEffect(country,key,value){
    const e=country.economy,s=country.systems;
    if(key in s)s[key]=round(clamp(s[key]+value,0,100),2);
    else if(key==="growth")e.growth=round(clamp(e.growth+value,-6,10),2);
    else if(key==="inflation")e.inflation=round(clamp(e.inflation+value,-1,25),2);
    else if(key==="unemployment")e.unemployment=round(clamp(e.unemployment+value,2,30),2);
    else if(key==="confidence")e.confidence=round(clamp(e.confidence+value,10,100),2);
    else if(key==="debt")e.debtRatio=round(clamp(e.debtRatio+value,5,300),2);
    else if(key==="approval")s.approval=round(clamp(s.approval+value,5,98),2);
    else if(key==="exports")e.exports=round(Math.max(0,e.exports+value),2);
    else if(key==="emissions")country.emissionsIndex=round(clamp((country.emissionsIndex||100)+value,20,180),1);
    else if(key==="research")country.researchPoints=round(country.researchPoints+value,1);
    else if(key==="efficiency")country.government.efficiency=round(clamp(country.government.efficiency+value,10,100),1);
  }

  function buildInRegion(state,regionId,buildingId){
    const country=base.getCountry(state); const r=base.getRegion(state,regionId); const d=C.buildings.find(b=>b.id===buildingId);
    if(!d)return{ok:false,message:"Construcción no encontrada."};
    if(country.economy.treasury<d.cost)return{ok:false,message:"Tesorería insuficiente."};
    country.economy.treasury=round(country.economy.treasury-d.cost,2);
    country.productionQueue.push({id:crypto.randomUUID(),kind:"building",buildingId,regionId,name:d.name,monthsRemaining:d.months,totalMonths:d.months});
    base.pushEvent(state,"region",`Construcción iniciada en ${r.name}`,d.name);
    return{ok:true,message:"Proyecto regional añadido a la cola."};
  }

  function upgradeBuilding(state,regionId,buildingInstanceId){
    const country=base.getCountry(state); const r=base.getRegion(state,regionId); const b=r.buildings.find(x=>x.id===buildingInstanceId); if(!b)return{ok:false,message:"Instalación no encontrada."};
    const d=C.buildings.find(x=>x.id===b.typeId); const cost=round(d.cost*(.55+b.level*.35),1);
    if(country.economy.treasury<cost)return{ok:false,message:"Tesorería insuficiente."};
    country.economy.treasury-=cost; b.level=Math.min(5,b.level+1); b.condition=100;
    return{ok:true,message:`${d.name} mejorada a nivel ${b.level}.`};
  }

  function processExtendedQueue(state,country){
    const complete=country.productionQueue.filter(q=>q.kind==="building"&&q.monthsRemaining<=0);
    country.productionQueue=country.productionQueue.filter(q=>!(q.kind==="building"&&q.monthsRemaining<=0));
    for(const q of complete){const r=state.regions.find(x=>x.id===q.regionId); const d=C.buildings.find(x=>x.id===q.buildingId); if(r&&d){r.buildings.push({id:crypto.randomUUID(),typeId:d.id,level:1,condition:100});base.pushEvent(state,"region",`${d.name} completada`,`${r.name} incorpora una nueva instalación.`)}}
  }

  // Wrap original queue behavior by ensuring building queues decrement and complete after base tick.
  function updateMilitary(state){
    for(const country of state.countries){
      processExtendedQueue(state,country);
      const upkeep=country.units.reduce((sum,u)=>sum+(state.unitCatalog.find(d=>d.id===u.typeId)?.upkeep||0),0);
      country.economy.treasury=round(Math.max(0,country.economy.treasury-upkeep),2);
      const supply=(country.strategicStockpile.fuel+country.strategicStockpile.munitions)/200;
      for(const u of country.units){u.readiness=round(clamp(u.readiness+(country.systems.logistics-65)*.008+(supply-.65)*.25-Math.random()*.08,25,100),1);u.experience=round(clamp(u.experience+.05,0,100),1)}
      country.militaryReadiness=round(clamp(country.units.length?country.units.reduce((a,u)=>a+u.readiness,0)/country.units.length:country.systems.military,0,100),1);
      country.strategicStockpile.fuel=round(clamp(country.strategicStockpile.fuel-upkeep*.08+country.systems.energy*.001,10,100),1);
      country.strategicStockpile.munitions=round(clamp(country.strategicStockpile.munitions-upkeep*.06+country.budgets.defense*.03,10,100),1);
    }
  }

  function updateTrade(state){
    for(const route of state.tradeRoutes){
      const a=base.getCountry(state,route.a),b=base.getCountry(state,route.b);
      route.efficiency=round(clamp(route.efficiency+(a.relations[b.id]-55)*.003-state.world.tension*.002+(Math.random()-.5),25,98),1);
      const value=route.volume*route.efficiency/100;
      a.economy.exports=round(a.economy.exports+value*.01,1); b.economy.imports=round(b.economy.imports+value*.01,1);
    }
  }

  function runOperation(state,targetId,operationId){
    const country=base.getCountry(state),target=base.getCountry(state,targetId),op=C.operations.find(o=>o.id===operationId);
    if(!target||target.id===country.id||!op)return{ok:false,message:"Operación inválida."};
    if(country.economy.treasury<op.cost)return{ok:false,message:"Tesorería insuficiente."};
    country.economy.treasury=round(country.economy.treasury-op.cost,2);
    const relation=country.relations[targetId]||50;
    const chance=clamp(op.base+(country.systems.intelligence-target.systems.intelligence)/180+(relation-50)/500,0.12,.92);
    const success=Math.random()<chance;
    if(success){
      if(op.effects.intel)country.intelReports[targetId]={date:state.date,quality:op.effects.intel,gdp:target.economy.gdp,military:target.systems.military,technology:target.systems.technology,readiness:target.militaryReadiness};
      if(op.effects.research)country.researchPoints+=op.effects.research;
      if(op.effects.relation)country.relations[targetId]=clamp(relation+op.effects.relation,0,100);
      if(op.effects.targetStability)target.systems.stability=clamp(target.systems.stability+op.effects.targetStability,0,100);
      if(op.effects.targetTech)target.systems.technology=clamp(target.systems.technology+op.effects.targetTech,0,100);
      if(op.effects.targetConfidence)target.economy.confidence=clamp(target.economy.confidence+op.effects.targetConfidence,0,100);
      if(op.effects.targetApproval)target.systems.approval=clamp(target.systems.approval+op.effects.targetApproval,0,100);
      if(op.effects.targetIndustry)target.systems.industry=clamp(target.systems.industry+op.effects.targetIndustry,0,100);
      if(op.effects.targetLogistics)target.systems.logistics=clamp(target.systems.logistics+op.effects.targetLogistics,0,100);
      base.pushEvent(state,"intel",`${op.name} completada`,`${country.name} obtiene una ventaja sobre ${target.name}.`);
      return{ok:true,message:"Operación completada con éxito."};
    }
    country.relations[targetId]=clamp(relation-8,0,100); country.systems.approval=clamp(country.systems.approval-.8,0,100);
    base.pushEvent(state,"intel",`${op.name} descubierta`,`${target.name} denuncia la operación encubierta.`);
    return{ok:false,message:"Operación fallida y descubierta."};
  }


  function warAction(state,targetId,type){
    const country=base.getCountry(state),target=base.getCountry(state,targetId);
    if(!target||target.id===country.id)return{ok:false,message:"Objetivo inválido."};
    const existing=state.wars.find(w=>!w.ended&&((w.attacker===country.id&&w.defender===target.id)||(w.attacker===target.id&&w.defender===country.id)));
    if(type==="declare"){
      if(existing)return{ok:false,message:"Ya existe un conflicto activo."};
      if((country.relations[targetId]||50)>38)return{ok:false,message:"La relación debe ser hostil (< 38)."};
      if(country.militaryReadiness<55)return{ok:false,message:"Preparación militar insuficiente."};
      state.wars.push({id:crypto.randomUUID(),attacker:country.id,defender:target.id,start:state.date,warScore:0,months:0,ended:false});
      state.world.tension=clamp(state.world.tension+12,0,100);country.relations[targetId]=5;target.relations[country.id]=5;
      base.pushEvent(state,"military",`Guerra entre ${country.name} y ${target.name}`,"Comienza un conflicto convencional de alta intensidad.");
      return{ok:true,message:"Conflicto declarado."};
    }
    if(type==="ceasefire"){
      if(!existing)return{ok:false,message:"No existe conflicto activo."};
      existing.ended=true;existing.end=state.date;state.world.tension=clamp(state.world.tension-6,0,100);country.relations[targetId]=25;target.relations[country.id]=25;
      base.pushEvent(state,"diplomacy",`Alto el fuego: ${country.name}–${target.name}`,"Las operaciones militares quedan suspendidas.");
      return{ok:true,message:"Alto el fuego acordado."};
    }
    return{ok:false,message:"Acción de guerra desconocida."};
  }

  function updateWars(state){
    for(const war of state.wars.filter(w=>!w.ended)){
      const a=base.getCountry(state,war.attacker),d=base.getCountry(state,war.defender);war.months++;
      const ap=a.systems.military*a.militaryReadiness/100*a.systems.logistics/100;
      const dp=d.systems.military*d.militaryReadiness/100*d.systems.logistics/100;
      war.warScore=round(clamp(war.warScore+(ap-dp)/18+(Math.random()-.5)*6,-100,100),1);
      a.warExhaustion=round(clamp(a.warExhaustion+1.2+Math.max(0,-war.warScore)*.012,0,100),1);
      d.warExhaustion=round(clamp(d.warExhaustion+1.3+Math.max(0,war.warScore)*.012,0,100),1);
      a.economy.gdp=round(a.economy.gdp*(1-.0015),2);d.economy.gdp=round(d.economy.gdp*(1-.0020),2);
      a.systems.approval=round(clamp(a.systems.approval-.18,5,98),1);d.systems.approval=round(clamp(d.systems.approval-.23,5,98),1);
      a.strategicStockpile.munitions=round(clamp(a.strategicStockpile.munitions-1.2,0,100),1);d.strategicStockpile.munitions=round(clamp(d.strategicStockpile.munitions-1.3,0,100),1);
      if(Math.abs(war.warScore)>92||a.warExhaustion>92||d.warExhaustion>92){war.ended=true;war.end=state.date;const winner=war.warScore>=0?a:d;const loser=winner===a?d:a;winner.systems.stability=clamp(winner.systems.stability+2,0,100);loser.systems.stability=clamp(loser.systems.stability-5,0,100);base.pushEvent(state,"military",`Fin de la guerra: victoria de ${winner.name}`,`${loser.name} acepta un tratado de paz tras ${war.months} meses.`)}
    }
  }

  function setNuclearAlert(state,delta){
    const country=base.getCountry(state);if(!country.nuclear.warheads)return{ok:false,message:"El país no dispone de arsenal nuclear."};
    country.nuclear.alert=clamp(country.nuclear.alert+Number(delta),0,5);state.world.tension=clamp(state.world.tension+Math.max(0,delta)*2-Math.max(0,-delta),0,100);
    base.pushEvent(state,"military",`${country.name}: alerta nuclear nivel ${country.nuclear.alert}`,country.nuclear.alert>=4?"Las fuerzas estratégicas entran en máxima disponibilidad.":"Se actualiza la postura de disuasión.");
    return{ok:true,message:`Alerta nuclear: ${country.nuclear.alert}/5.`};
  }
  function tradeAction(state,targetId,type){
    const country=base.getCountry(state),target=base.getCountry(state,targetId);if(!target||target.id===country.id)return{ok:false,message:"Objetivo inválido."};
    if(type==="alliance"){if((country.relations[targetId]||0)<72)return{ok:false,message:"La relación debe superar 72."};country.treaties.push({id:crypto.randomUUID(),type:"Alianza",partner:targetId});country.relations[targetId]=clamp(country.relations[targetId]+6,0,100);return{ok:true,message:"Alianza defensiva firmada."}}
    if(type==="lift"){target.sanctionLevel=Math.max(0,target.sanctionLevel-1);country.relations[targetId]=clamp(country.relations[targetId]+5,0,100);return{ok:true,message:"Sanciones reducidas."}}
    if(type==="embargo"){target.sanctionLevel+=1;country.relations[targetId]=clamp(country.relations[targetId]-12,0,100);state.world.tension=clamp(state.world.tension+2,0,100);return{ok:true,message:"Embargo estratégico aplicado."}}
    return base.diplomacyAction(state,targetId,type);
  }

  function sellShares(state,companyId,pct){
    const country=base.getCountry(state),company=state.companies.find(c=>c.id===companyId);if(!company)return{ok:false,message:"Empresa no encontrada."};
    const amount=Math.min(Number(pct)||5,company.ownership.player);if(amount<=0)return{ok:false,message:"No posees acciones."};
    const revenue=round(company.marketCap*amount/100*.97,2);company.ownership.player=round(company.ownership.player-amount,1);country.economy.treasury=round(country.economy.treasury+revenue,2);company.controller=company.ownership.player>=51?country.id:company.countryId;return{ok:true,message:`Venta ejecutada por ${revenue.toFixed(1)} mil M€.`};
  }

  function updateObjectives(state){
    const esp=state.countries.find(c=>c.id==="ESP");
    const sorted=[...state.countries].sort((a,b)=>b.economy.gdp-a.economy.gdp); const rank=sorted.findIndex(c=>c.id==="ESP")+1;
    const conditions={gdpTop:rank<=5,tech90:esp.systems.technology>=90,energy90:esp.systems.energy>=90&&esp.systems.renewables>=78,regions:state.regions.every(r=>r.infra>=75),companies:state.companies.filter(c=>c.countryId!=="ESP"&&c.ownership.player>=51).length>=3,military85:esp.systems.military>=85,debt70:esp.economy.debtRatio<70,alliances:Object.values(esp.relations).filter(v=>v>=80).length>=5};
    for(const o of state.objectives)if(!o.completed&&conditions[o.id]){o.completed=true;o.completedDate=state.date;base.pushEvent(state,"objective",`Objetivo completado: ${o.name}`,`Recompensa estratégica: ${o.reward} puntos.`)}
  }

  function simulateAI(state){
    for(const country of state.countries.filter(c=>c.id!=="ESP")){
      country.ai.cooldown=Math.max(0,country.ai.cooldown-1); if(country.ai.cooldown>0)continue;
      country.ai.cooldown=3+Math.floor(Math.random()*5);
      if(country.economy.debtRatio>120)country.economy.taxRate=clamp(country.economy.taxRate+.4,10,52);
      else if(country.economy.unemployment>9)country.budgets.infrastructure=clamp(country.budgets.infrastructure+.2,.5,15);
      else if(state.world.tension>58)country.budgets.defense=clamp(country.budgets.defense+.2,.5,15);
      else country.budgets.research=clamp(country.budgets.research+.1,.5,15);
      const target=state.countries[Math.floor(Math.random()*state.countries.length)];if(target&&target.id!==country.id)country.relations[target.id]=round(clamp((country.relations[target.id]||50)+(Math.random()-.5)*2,0,100),1);
    }
  }

  function enhancedEvents(state){
    if(Math.random()>.18)return;
    const esp=state.countries.find(c=>c.id==="ESP");
    const pool=[
      ["industry","Consorcio europeo de baterías","España capta una inversión industrial estratégica.",()=>{esp.systems.industry+=.6;esp.economy.treasury+=2.8}],
      ["energy","Interconexión ibérica récord","La exportación eléctrica mejora la balanza exterior.",()=>{esp.systems.energy+=.5;esp.economy.exports+=1.4}],
      ["social","Presión inmobiliaria en áreas metropolitanas","La vivienda reduce temporalmente la aprobación.",()=>{esp.systems.approval-=1.1;esp.economy.housingPressure+=1.5}],
      ["defense","Contrato para nueva fragata europea","Los astilleros españoles amplían cartera de pedidos.",()=>{esp.systems.military+=.4;esp.economy.treasury+=2.1}],
      ["climate","Sequía prolongada en el sureste","Agricultura y reservas hídricas sufren presión.",()=>{esp.systems.food-=.7;state.world.foodStress+=1.2}],
      ["technology","Centro europeo de IA en Madrid","La investigación y el empleo cualificado aumentan.",()=>{esp.systems.technology+=.6;esp.researchPoints+=12}]
    ];
    const [type,title,text,fn]=pool[Math.floor(Math.random()*pool.length)];fn();base.pushEvent(state,type,title,text);
  }

  function repairState(state){return hydrateState(state)}
  function debtRating(debt,stability,growth){if(debt<60&&stability>75)return"AAA";if(debt<85&&stability>65)return"AA";if(debt<110&&growth>0)return"A";if(debt<145)return"BBB";return"BB"}
  function aiFocus(c){if(c.systems.military>90)return"Seguridad";if(c.systems.industry>90)return"Industria";if(c.systems.technology>90)return"Tecnología";return"Crecimiento"}
  function regionResourceMix(id){const map={GAL:["Pesca","Eólica marina"],AST:["Acero","Carbón"],CNT:["Puerto","Industria"],PVA:["Máquina-herramienta","Gas"],NAV:["Eólica","Agro"],RIO:["Vino","Agro"],CYL:["Cereales","Eólica"],ARA:["Logística","Eólica"],CAT:["Química","Digital"],MAD:["Talento","Aeroespacial"],CLM:["Solar","Agro"],VAL:["Cerámica","Puerto"],EXT:["Solar","Litio"],MUR:["Agro","Naval"],AND:["Solar","Agro"],BAL:["Turismo","Mar"],CAN:["Puertos","Espacio"]};return map[id]||["Servicios"]}
  function deriveUnitStats(u){return{attack:Math.round(u.power*1.2),defense:Math.round(u.power),range:u.category==="Aire"?78:u.category==="Mar"?66:u.category==="Espacio"?100:42,mobility:u.category==="Aire"?86:u.category==="Mar"?55:48}}
  function unitDescription(id){return({infantry:"Fuerza terrestre flexible para defensa y estabilización.",mechanized:"Movilidad protegida y potencia de fuego combinada.",armor:"Ruptura, protección y maniobra de alta intensidad.",artillery:"Apoyo de fuegos de precisión y largo alcance.",fighter:"Superioridad aérea, defensa y ataque multirrol.",drone:"ISR persistente y ataque de precisión.",frigate:"Escolta oceánica, guerra antisubmarina y defensa aérea.",submarine:"Disuasión submarina y control marítimo encubierto.",satellite:"Observación, comunicaciones y alerta estratégica."})[id]||"Capacidad militar especializada."}
  function recordExtraHistory(c){for(const [key,val] of [["trade",c.economy.tradeBalance],["debt",c.economy.debtRatio],["approval",c.systems.approval],["energy",c.systems.energy]]){c.history[key].push(round(val,2));if(c.history[key].length>36)c.history[key].shift()}}

  Object.assign(base, {
    createInitialState, tickMonth, hydrateState:repairState, calculateDetailedBudget,
    buildInRegion, upgradeBuilding, startResearch, enactPolicy, runOperation, tradeAction, sellShares, warAction, setNuclearAlert,
    catalog:C, debtRating
  });
})();
