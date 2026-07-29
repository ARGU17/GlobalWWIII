"use strict";

(() => {
  const V=window.NEXUS_V5,E=window.NEXUS_ECONOMY;
  if(!V||!E)throw new Error("state.js requiere NEXUS_V5 y NEXUS_ECONOMY");
  const {clamp,round}=V;
  const productDefs=[
    ["food","Alimentos",.18],["energy","Energía",.12],["materials","Materiales",.1],["consumer","Bienes de consumo",.18],
    ["capital","Bienes de capital",.13],["transport","Transporte",.07],["health","Sanidad",.08],["digital","Servicios digitales",.07],["defense","Defensa",.07]
  ].map(([id,name,weight])=>({id,name,weight}));
  const energyDefs=["carbón","gas","petróleo","nuclear","hidráulica","eólica","solar","almacenamiento"];
  const sectors=["agriculture","extractive","manufacturing","construction","utilities","transport","finance","digital","public","defense"];
  const seedEnergyMix=c=>Object.fromEntries(energyDefs.map((name,i)=>{
    const value=(i===4||i===5||i===6)?(c.systems.renewables||25)/3:i===3?clamp(c.systems.technology/6,2,18):clamp((100-(c.systems.renewables||25))/4,4,30);
    return[name,round(value)];
  }));
  const ideology=c=>c.government?.ideology||c.politics?.parties?.find(p=>p.id===c.politics?.rulingPartyId)?.ideology||"centro";
  const incomeClass=c=>c.economy.gdp/Math.max(.1,c.economy.population)>35?"high":c.economy.gdp/Math.max(.1,c.economy.population)>12?"middle":"developing";

  function baseCountry(c,state){
    c.v5||={};c.v5.id=c.id;c.v5.factors||={};c.v5.lastUpdated=state.dayIndex||0;
    c.v5.profile||={incomeClass:incomeClass(c),ideology:ideology(c),coastal:!!c.map?.coastal,resourceEndowment:round((c.systems.energy+c.systems.food+c.systems.industry)/3,1)};
  }
  function seedCities(c,state,urban,p){
    const regions=(state.regions||[]).filter(r=>(r.countryId||r.ownerId)===c.id).slice(0,5);
    if(!regions.length)return[{id:`${c.id}-capital`,name:c.capital||c.name,population:round(p*urban/100*.22),productivity:round((c.systems.industry+c.systems.technology)/2),housingPressure:30,congestion:25,services:clamp(c.systems.logistics,20,98)}];
    const weights=[.27,.18,.13,.1,.07],total=weights.slice(0,regions.length).reduce((a,b)=>a+b,0);
    return regions.map((r,i)=>({id:`${c.id}-city-${i+1}`,regionId:r.id,name:r.capital||r.name,population:round(p*urban/100*weights[i]/total),productivity:round((Number(r.industry)||c.systems.industry+c.systems.technology)/2),housingPressure:round(clamp(22+(Number(r.population)||1)*2,15,80)),congestion:round(clamp(18+(Number(r.infra)||c.systems.logistics)*.2,10,70)),services:clamp(Number(r.infra)||c.systems.logistics,20,98)}));
  }
  function seedProducts(c){
    const gdp=Math.max(1,c.economy.gdp),pop=Math.max(.1,c.economy.population),industry=c.systems.industry/100,food=c.systems.food/100,energy=c.systems.energy/100;
    return Object.fromEntries(productDefs.map(d=>{
      const demand=round(gdp*d.weight),supply=round(demand*clamp(.55+industry*.45+(d.id==="food"?food-.7:0)+(d.id==="energy"?energy-.7:0),.35,1.45));
      return[d.id,{price:100,supply,demand,inventory:round(supply*.12),imports:round(Math.max(0,demand-supply)),exports:round(Math.max(0,supply-demand)),shortage:0,trend:0}];
    }));
  }
  function seedFirms(c,state){
    const listed=(state.companies||[]).filter(x=>x.countryId===c.id);
    const count=clamp(Math.round(c.economy.gdp/180),3,18),firms=[];
    for(let i=0;i<count;i++){
      const company=listed[i%Math.max(1,listed.length)],sector=sectors[i%sectors.length],scale=clamp(c.economy.gdp/count*(.65+(i%5)*.1),.5,240);
      firms.push({id:company?.id||`${c.id.toLowerCase()}-${sector}-${i+1}`,name:company?.name||`${c.name} ${sector} ${i+1}`,sector:company?.sector||sector,ownership:company?.ownership?.state>25?"state":i%7===0?"cooperative":"private",revenue:round(scale),profit:round(scale*(.035+(c.systems.industry-50)/2000)),cash:round(scale*.12),debt:round(scale*.3),employment:round(scale*1100),productivity:round((c.systems.technology+c.systems.industry)/2),capacity:round(55+c.systems.industry*.38),investment:round(scale*.08),exports:round(scale*.18),health:75,listed:!!company});
    }
    return firms;
  }

  V.registerMigration(0,1,state=>{
    state.simulationSeed||=`nexus-global-${state.date||"2028-01-01"}`;state.dayIndex=Number(state.dayIndex)||0;
    state.v5.createdFrom=state.version||"legacy";state.v5.sequence=Number(state.v5.sequence)||0;state.v5.contracts={preserveLegacyFields:true,deterministicTicks:true,noCountryDeletion:true,annexationTransfersOwnership:true};
    state.worldIndex={globalGDP:0,globalPopulation:0,globalInflation:0,warRisk:0,foodIndex:100,energyIndex:100,freightIndex:100,climateRisk:0};
    for(const c of state.countries)baseCountry(c,state);
  });
  V.registerMigration(1,2,state=>{
    for(const c of state.countries){baseCountry(c,state);const e=c.economy;c.v5.economy={
      accounts:{nominalGDP:e.gdp,realGDP:e.gdp,gdpDeflator:100,consumption:round(e.gdp*.59),investment:round(e.gdp*.2),government:round(e.gdp*.2),exports:round(e.gdp*.24),imports:round(e.gdp*.23),potentialGDP:round(e.gdp*(1+Math.max(0,e.growth)/100)),outputGap:0,productivity:round((c.systems.technology+c.systems.industry+c.systems.logistics)/3),laborShare:58,capitalStock:round(e.gdp*2.7)},
      cycle:{phase:e.growth>3?"expansion":e.growth<0?"recession":"mature",momentum:e.growth,stress:round(clamp(e.inflation+e.unemployment/2+Math.max(0,e.debtRatio-90)/20,0,30))},
      products:seedProducts(c),currency:{code:`${c.id}X`,rate:1,reserves:round(e.gdp*.08),credibility:clamp(c.systems.stability,20,95),capitalControls:false},
      centralBank:{policyRate:round(Math.max(.25,e.inflation+.5)),inflationTarget:2,independence:clamp(45+c.systems.stability/2,35,95),stance:"neutral"},
      banking:{assets:round(e.gdp*1.15),deposits:round(e.gdp*.72),loans:round(e.gdp*.68),capitalRatio:12,liquidity:28,npl:round(clamp(e.unemployment/3,1,12)),creditGrowth:e.growth,stress:10},
      markets:{bondYield:round(Math.max(.4,e.inflation*.55+e.debtRatio/90)),equityIndex:100,riskPremium:round(Math.max(.2,(100-c.economy.confidence)/18)),housingIndex:100},
      firms:seedFirms(c,state),informalShare:round(clamp(38-c.systems.stability*.28,4,45)),taxCompliance:round(clamp(55+c.systems.stability*.42,50,96))};}
  });
  V.registerMigration(2,3,state=>{
    for(const c of state.countries){baseCountry(c,state);const p=c.economy.population,urban=clamp(48+c.systems.logistics*.36,42,92);c.v5.society={
      cohorts:{children:round(p*clamp(.26-c.systems.technology/1000,.12,.3)),working:round(p*.64),seniors:0},fertility:round(clamp(3.8-c.systems.technology/35,1.15,4.2)),lifeExpectancy:round(clamp(58+(c.budgets.health||4)*2.2+c.systems.technology*.12,55,86)),migrationRate:round((c.economy.growth-1.5)*.08),urbanization:round(urban),
      labor:{laborForce:round(p*.49),employment:round(p*.49*(1-c.economy.unemployment/100)),participation:clamp(54+c.systems.technology*.16,48,78),wageIndex:100,vacancies:2.5,skills:{basic:clamp(90-c.systems.technology*.25,35,80),technical:clamp(10+c.systems.industry*.45,20,60),advanced:clamp(c.systems.technology*.35,10,40)},sectorJobs:{}},
      education:{access:clamp(c.systems.education||c.systems.technology,25,98),quality:round((c.systems.technology+c.systems.stability)/2),graduates:round(p*.012),brainDrain:round(clamp(8-c.economy.growth,0,18))},
      health:{capacity:clamp(c.systems.health||c.systems.stability,20,98),coverage:clamp(30+(c.budgets.health||4)*8,30,99),diseaseBurden:round(clamp(35-(c.budgets.health||4)*3,4,35)),pandemicRisk:5},
      housing:{stock:round(p*.46),priceIndex:100,rentBurden:round(clamp(24+(urban-60)*.25,15,45)),vacancy:6,homelessness:round(clamp(10-c.systems.stability/12,1,12))},
      food:{calorieSecurity:clamp(c.systems.food,20,100),reservesDays:round(35+c.systems.food*.8),waterStress:round(clamp(80-c.systems.energy*.5,8,80)),malnutrition:round(clamp(28-c.systems.food*.25,1,30))},
      opinion:{government:c.systems.approval,polarization:round(clamp(70-c.systems.stability*.55,8,65)),protestPotential:round(clamp(c.economy.unemployment+c.economy.inflation+(60-c.systems.approval)/3,2,80)),issues:[]},
      cities:seedCities(c,state,urban,p)};
      c.v5.society.cohorts.seniors=round(Math.max(0,p-c.v5.society.cohorts.children-c.v5.society.cohorts.working));
      c.v5.governance={institutions:{stateCapacity:round((c.systems.stability+c.systems.intelligence+c.systems.logistics)/3),ruleOfLaw:clamp(c.systems.stability,20,96),bureaucracy:clamp((c.systems.stability+c.systems.technology)/2,20,95),judicialIndependence:clamp(c.systems.stability*.9,15,95),federalism:c.regions?.length>8?60:25},media:{freedom:clamp(30+c.systems.stability*.6,20,96),trust:55,polarization:25,reach:clamp(45+c.systems.technology*.5,50,99),narratives:[]},corruption:{perception:round(clamp(65-c.systems.stability*.55,5,65)),eliteCapture:20,procurementLeakage:5,investigations:[]},crime:{organized:round(clamp(35-c.systems.stability*.3,4,45)),violent:round(clamp(28-c.systems.stability*.22,3,35)),cyber:round(clamp(c.systems.technology*.25,5,35))},leaders:{head:{name:`Gobierno de ${c.name}`,age:54,competence:round((c.systems.stability+c.systems.intelligence)/2),charisma:55,health:85,traits:[]},eliteCohesion:65,successions:[]}};
    }
  });
  V.registerMigration(3,4,state=>{
    state.v5Networks={trade:{edges:[],chokepoints:[],disruptions:[]},energy:{grids:[],pipelines:[],interconnectors:[]},logistics:{corridors:[],ports:[],airports:[],hubs:[]},climate:{globalTemperature:1.5,emissions:0,disasters:[]},health:{outbreaks:[]},food:{worldStocks:100,priceIndex:100}};
    state.intelligenceReports||=[];state.organizations||=[];state.treatyRegistry||=[];state.occupationZones||=[];
    for(const c of state.countries){baseCountry(c,state);c.v5.infrastructure={energy:{capacity:round(c.economy.gdp*.04),demand:round(c.economy.gdp*.034),reserveMargin:15,gridReliability:clamp(c.systems.energy,20,99),mix:seedEnergyMix(c),blackoutRisk:0},logistics:{freightCapacity:round(c.economy.gdp*.08),utilization:62,portCapacity:round(c.economy.gdp*.025),railCapacity:round(c.economy.gdp*.02),roadCapacity:round(c.economy.gdp*.04),bottlenecks:[]},climate:{emissions:round(c.economy.gdp*(1-(c.systems.renewables||20)/130)*.18),adaptation:clamp(c.systems.infrastructure||c.systems.logistics,20,95),waterRisk:20,heatRisk:15,disasterDamage:0}};
      c.v5.foreign={strategy:c.systems.military>85?"power_projection":c.systems.stability<55?"regime_survival":"prosperity",objectives:[],redLines:[],influence:round((c.systems.technology+c.systems.military+c.economy.confidence)/3),softPower:round((c.systems.technology+c.systems.stability)/2),economicLeverage:round(clamp(Math.log10(Math.max(10,c.economy.gdp))*22,20,95)),relations:{},alliances:[],treatyCompliance:75};
      c.v5.intelligence={collection:clamp(c.systems.intelligence,15,99),counterintelligence:clamp(c.systems.intelligence*.9,15,95),cyber:clamp((c.systems.intelligence+c.systems.technology)/2,15,99),confidenceByCountry:{},knownOperations:[],deception:20};
      c.v5.military={command:{doctrine:c.militaryDoctrine||"balanced",initiative:50,c2:clamp((c.systems.intelligence+c.systems.technology)/2,20,98)},logistics:{supply:100,fuel:100,munitions:100,spares:100,medical:100,lift:clamp(c.systems.logistics,20,98)},readiness:clamp(c.militaryReadiness||c.systems.military,15,100),fronts:[],operations:[],airSuperiority:0,seaControl:0,fog:100-clamp(c.systems.intelligence,0,100),casualties:{military:0,civilian:0},morale:75};}
  });
  V.registerMigration(4,5,state=>{
    state.v5Analytics={series:{globalGDP:[],inflation:[],wars:[],food:[],energy:[]},alerts:[],explanations:{},lastSnapshot:null};
    const sovereign=state.countries.filter(c=>c.sovereign!==false),globalGDP=sovereign.reduce((a,c)=>a+(c.economy.gdp||0),0);
    state.worldIndex.globalGDP=round(globalGDP);state.worldIndex.globalPopulation=round(sovereign.reduce((a,c)=>a+(c.economy.population||0),0));state.worldIndex.globalInflation=round(sovereign.reduce((a,c)=>a+(c.economy.inflation||0)*(c.economy.gdp||0),0)/Math.max(1,globalGDP));
    state.actionInbox||=[];state.emergentEvents||=[];state.v5.schema=5;state.version=V.VERSION;
  });

  window.NEXUS_V5_STATE={productDefs,energyDefs,sectors,baseCountry};
})();
