"use strict";

/* NEXUS Global Alpha v1.3
   Mercado de capitales, logística marítima, balances productivos y demografía.
   Las empresas usan nombres reales únicamente como elementos de simulación;
   precios, capitalización y resultados son ficticios y no son datos financieros en vivo.
*/
(() => {
  const E = window.NEXUS_ECONOMY;
  const C = window.NEXUS_CATALOG;
  if (!E || !C) throw new Error("alpha-v13.js requiere economy.js y catalog.js.");

  const oldCreate = E.createInitialState;
  const oldHydrate = E.hydrateState;
  const oldTickDay = E.tickDay;
  const oldTradeAction = E.tradeAction;
  const oldUpgradeBuilding = E.upgradeBuilding;
  const oldBuildInRegion = E.buildInRegion;
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const round = (v,d=2)=>Number((Number(v)||0).toFixed(d));
  const clone = v=>JSON.parse(JSON.stringify(v));

  const RESOURCE_DEFS = [
    {id:"electricity",icon:"⚡",name:"Electricidad",unit:"TWh"},
    {id:"food",icon:"🌾",name:"Alimentos",unit:"Mt"},
    {id:"fuel",icon:"🛢️",name:"Combustibles",unit:"Mt"},
    {id:"steel",icon:"🔩",name:"Acero",unit:"Mt"},
    {id:"vehicles",icon:"🚗",name:"Vehículos",unit:"mil"},
    {id:"electronics",icon:"💾",name:"Electrónica",unit:"índice"},
    {id:"machinery",icon:"⚙️",name:"Maquinaria",unit:"índice"},
    {id:"medicines",icon:"💊",name:"Medicamentos",unit:"índice"}
  ];

  const REAL_COMPANIES = [
    ["santander","Banco Santander","ESP","Banca",4.7,92,185000,1.03],
    ["bbva","BBVA","ESP","Banca",11.8,76,121000,1.08],
    ["inditex","Inditex","ESP","Consumo",49.2,154,165000,1.10],
    ["telefonica","Telefónica","ESP","Telecomunicaciones",4.2,24,104000,.94],
    ["repsol","Repsol","ESP","Energía",13.7,19,24000,1.01],
    ["naturgy","Naturgy","ESP","Energía",24.5,24,6800,.97],
    ["endesa","Endesa","ESP","Energía",20.4,22,9000,.98],
    ["acciona","Acciona","ESP","Infraestructura y energía",128,15,57000,1.04],
    ["acs","ACS","ESP","Infraestructura",43.5,13,135000,1.01],
    ["amadeus","Amadeus IT Group","ESP","Tecnología turística",68,36,19000,1.09],
    ["cellnex","Cellnex Telecom","ESP","Telecomunicaciones",35,18,3500,1.02],
    ["grifols","Grifols","ESP","Biotecnología",10.2,7,23000,1.08],
    ["mapfre","MAPFRE","ESP","Seguros",2.4,8,30000,.98],
    ["talgo","Talgo","ESP","Ferrocarril",4.1,1.5,3000,1.04],
    ["sacyr","Sacyr","ESP","Infraestructura",3.4,3,15000,1.02],
    ["apple","Apple","USA","Tecnología",218,3150,164000,1.11],
    ["microsoft","Microsoft","USA","Tecnología",455,3380,228000,1.12],
    ["nvidia","NVIDIA","USA","Semiconductores",132,3240,30000,1.22],
    ["alphabet","Alphabet","USA","Tecnología",184,2290,183000,1.10],
    ["amazon","Amazon","USA","Comercio y nube",201,2110,1525000,1.09],
    ["tesla","Tesla","USA","Automoción",248,790,140000,1.16],
    ["jpmorgan","JPMorgan Chase","USA","Banca",222,625,310000,1.05],
    ["exxon","ExxonMobil","USA","Energía",116,490,62000,.99],
    ["boeing","Boeing","USA","Aeroespacial",188,116,171000,1.05],
    ["sap","SAP","DEU","Software",205,240,107000,1.08],
    ["siemens","Siemens","DEU","Industria",176,140,320000,1.04],
    ["volkswagen","Volkswagen Group","DEU","Automoción",112,63,680000,.99],
    ["mercedes","Mercedes-Benz Group","DEU","Automoción",68,72,166000,1.01],
    ["bmw","BMW Group","DEU","Automoción",94,60,154000,1.02],
    ["basf","BASF","DEU","Química",49,43,112000,.97],
    ["allianz","Allianz","DEU","Seguros",285,112,159000,1.03],
    ["lvmh","LVMH","FRA","Consumo",690,347,213000,1.04],
    ["totalenergies","TotalEnergies","FRA","Energía",64,150,102000,1.00],
    ["schneider","Schneider Electric","FRA","Industria y energía",236,133,168000,1.09],
    ["safran","Safran","FRA","Aeroespacial",205,87,92000,1.10],
    ["asml","ASML","NLD","Semiconductores",910,359,42000,1.20],
    ["shell","Shell","GBR","Energía",31,205,103000,.99],
    ["astrazeneca","AstraZeneca","GBR","Farmacéutica",145,224,89900,1.08],
    ["unilever","Unilever","GBR","Consumo",57,144,128000,1.00],
    ["novo","Novo Nordisk","DNK","Farmacéutica",128,570,69000,1.17],
    ["nestle","Nestlé","CHE","Alimentación",101,278,270000,1.01],
    ["roche","Roche","CHE","Farmacéutica",279,240,103000,1.06],
    ["toyota","Toyota Motor","JPN","Automoción",22,305,380000,1.04],
    ["sony","Sony Group","JPN","Tecnología y medios",97,120,113000,1.06],
    ["samsung","Samsung Electronics","KOR","Electrónica",58,355,268000,1.08],
    ["skhynix","SK hynix","KOR","Semiconductores",145,105,36000,1.14],
    ["tsmc-global","TSMC","TWN","Semiconductores",185,960,76000,1.19],
    ["foxconn","Hon Hai Precision","TWN","Electrónica",6.4,77,826000,1.03],
    ["alibaba","Alibaba Group","CHN","Comercio y nube",91,224,235000,1.07],
    ["tencent","Tencent","CHN","Tecnología",48,460,105000,1.10],
    ["catl","CATL","CHN","Baterías",32,142,116000,1.14],
    ["saudi-aramco","Saudi Aramco","SAU","Energía",7.3,1780,73000,1.00],
    ["reliance","Reliance Industries","IND","Energía y telecom",35,235,389000,1.07],
    ["tata","Tata Consultancy Services","IND","Tecnología",48,175,601000,1.10],
    ["vale","Vale","BRA","Minería",12.8,58,64000,.99],
    ["petrobras","Petrobras","BRA","Energía",14.5,102,46000,1.00],
    ["rio-tinto","Rio Tinto","AUS","Minería",78,125,57000,1.00],
    ["bhp","BHP","AUS","Minería",29,148,80000,1.00]
  ].map(([id,name,countryId,sector,price,marketCap,employees,growthBias])=>({
    id,name,countryId,sector,price,marketCap,employees,growthBias,
    shares:Math.max(100,Math.round(marketCap*1000/Math.max(price,1))),
    realName:true
  }));

  const SECTOR_VOL = {
    "Tecnología":1.35,"Semiconductores":1.55,"Automoción":1.18,"Energía":.82,
    "Banca":1.05,"Farmacéutica":.95,"Biotecnología":1.4,"Aeroespacial":1.15,
    "Infraestructura":.86,"Industria":.95,"Defensa":1.1,"Consumo":.8
  };

  const PORT_OFFSETS = {
    ESP:[39.45,-.32],PRT:[38.7,-9.12],FRA:[43.3,5.35],DEU:[53.55,9.99],GBR:[51.51,-.1],
    USA:[40.7,-74],CHN:[31.23,121.47],JPN:[35.68,139.76],KOR:[35.18,129.08],IND:[19.08,72.88],
    BRA:[-23.96,-46.33],ARG:[-34.6,-58.38],MEX:[19.2,-96.14],CAN:[49.28,-123.12],AUS:[-33.86,151.2],
    SAU:[21.49,39.19],ZAF:[-33.92,18.42],ITA:[44.4,8.93],NLD:[51.92,4.48],NOR:[59.91,10.75],
    MAR:[35.77,-5.81],TUR:[41.0,28.98],IDN:[-6.1,106.88],SGP:[1.29,103.85],ARE:[25.27,55.3]
  };

  function makeCompany(def){
    const revenue=Math.max(1,def.marketCap*(.35+Math.random()*.55));
    const margin=clamp(7+Math.random()*20,3,38);
    return {...clone(def),history:[def.price],dayChange:0,ownership:{state:def.countryId==="ESP"?6:0,player:0},ownershipByCountry:{},financials:{revenue:round(revenue,1),profit:round(revenue*margin/100,1),margin:round(margin,1),debtRatio:round(18+Math.random()*58,1),pe:round(10+Math.random()*28,1),dividend:round(Math.random()*4.2,2),beta:round(.65+Math.random()*.9,2)}};
  }

  function ensureCompanies(state){
    state.companies ||= [];
    const byId=new Map(state.companies.map(c=>[c.id,c]));
    for(const def of REAL_COMPANIES){
      if(!byId.has(def.id)){const company=makeCompany(def);state.companies.push(company);byId.set(def.id,company)}
    }
    for(const company of state.companies){
      company.history=Array.isArray(company.history)&&company.history.length?company.history:[Number(company.price)||10];
      company.marketCap=Number(company.marketCap)||Math.max(1,(Number(company.price)||10)*(Number(company.shares)||1000)/1000);
      company.employees=Number(company.employees)||Math.round(company.marketCap*850);
      company.ownership ||= {state:0,player:0};
      company.ownershipByCountry ||= {};
      if(company.ownership.player>0&&!company.ownershipByCountry.ESP)company.ownershipByCountry.ESP=company.ownership.player;
      company.financials ||= makeCompany({...company,marketCap:company.marketCap,price:company.price}).financials;
      company.dayChange ||= 0;
    }
  }

  function hydrateV13(state){
    state=oldHydrate?oldHydrate(state):state;
    state.version="1.3-alpha";
    state.resourceDefinitions=clone(RESOURCE_DEFS);
    state.market ||= {sentiment:58,indices:{},history:{},lastUpdate:state.date};
    state.tradeRoutes ||= [];
    state.tradeFleet ||= [];
    state.simulation ||= {clockFraction:0,clockAnchor:null};
    ensureCompanies(state);
    for(const country of state.countries){
      country.resourceInventory ||= {};
      country.resourceBalance ||= {};
      country.laborModel ||= {facilityJobs:country.economicModel?.facilityJobs||0,netMigrationAnnual:0,naturalGrowthAnnual:0,jobVacancies:0};
      country.productiveModel ||= {...(country.sectors||{})};
      calculateResourceBalance(state,country);
    }
    normalizeTradeRoutes(state);
    seedStrategicTradeRoutes(state);
    updateMarketIndices(state);
    return state;
  }

  function createInitialState(){return hydrateV13(oldCreate())}

  function facilitiesOf(state,country){
    if(country.id==="ESP")return state.regions.flatMap(r=>(r.buildings||[]).map(f=>({...f,region:r})));
    return (country.facilities||[]).map(f=>({...f,region:null}));
  }

  function countFacility(state,country,type){return facilitiesOf(state,country).filter(f=>f.typeId===type).reduce((s,f)=>s+(f.level||1),0)}

  function calculateResourceBalance(state,country){
    const p=Math.max(.02,country.economy.population||.02),s=country.systems||{},fac=type=>countFacility(state,country,type);
    const oilCountries=new Set(["SAU","ARE","KWT","IRQ","IRN","QAT","RUS","USA","CAN","BRA","NOR","VEN","NGA","AGO","KAZ","AZE"]);
    const gasCountries=new Set(["QAT","RUS","USA","IRN","NOR","DZA","AUS","TKM"]);
    const manufacturing=(s.industry||40)/100,tech=(s.technology||40)/100,foodSystem=(s.food||50)/100;
    const production={
      electricity:p*.46+(s.energy||50)*1.15+(s.renewables||20)*.42+fac("solar")*5.2+fac("wind")*6.4+fac("nuclear")*11.8+fac("grid")*1.4,
      food:p*.50*foodSystem+Math.max(0,(s.food||50)-70)*.09,
      fuel:(oilCountries.has(country.id)?p*.34+(s.energy||50)*.18:p*.025+(s.energy||50)*.035)+(gasCountries.has(country.id)?p*.08:0),
      steel:p*.012+manufacturing*p*.028+fac("steelPlant")*2.2,
      vehicles:p*.22*manufacturing+fac("autoPlant")*250,
      electronics:tech*(p*.7+18)+fac("chipFab")*35,
      machinery:manufacturing*(p*.65+22)+fac("steelPlant")*4+fac("rail")*1.8,
      medicines:tech*(p*.36+10)+fac("hospital")*.7+fac("university")*.9
    };
    const utilization=(country.economicModel?.industrialUtilization||70)/100;
    for(const key of Object.keys(production))production[key]*=clamp(utilization,.4,1.08);
    const consumption={
      electricity:p*.58+(s.industry||50)*.72+fac("autoPlant")*3.8+fac("steelPlant")*6.5+fac("chipFab")*4.8,
      food:p*.54,
      fuel:p*.16+(s.logistics||50)*.09+(country.units||[]).reduce((sum,u)=>sum+Math.sqrt(Math.max(0,u.quantity||0))*.002,0),
      steel:p*.018+(s.industry||50)*.055+fac("rail")*.9,
      vehicles:p*1.9+(s.logistics||50)*.7,
      electronics:p*.62+(s.technology||50)*.28,
      machinery:p*.42+(s.industry||50)*.38,
      medicines:p*.46+(100-(s.stability||60))*.06
    };
    country.resourceBalance={};
    for(const def of RESOURCE_DEFS){
      const prod=round(Math.max(0,production[def.id]||0),1),cons=round(Math.max(.1,consumption[def.id]||0),1),balance=round(prod-cons,1);
      if(country.resourceInventory[def.id]==null)country.resourceInventory[def.id]=round(Math.max(0,cons/12),1);
      country.resourceBalance[def.id]={...def,production:prod,consumption:cons,balance,stock:round(country.resourceInventory[def.id]||0,1)};
    }
    return country.resourceBalance;
  }

  function recalculateAllResources(state){for(const country of state.countries)calculateResourceBalance(state,country)}

  function dailyMarket(state){
    const worldGrowth=state.countries.reduce((s,c)=>s+(c.economy.growth||0),0)/Math.max(1,state.countries.length);
    state.market.sentiment=round(clamp((state.market.sentiment||58)+(worldGrowth-2)*.008+(Math.random()-.5)*.45-(state.world?.tension||25)*.0015,15,92),1);
    for(const company of state.companies){
      const home=state.countries.find(c=>c.id===company.countryId)||state.countries[0];
      const vol=Object.entries(SECTOR_VOL).find(([k])=>company.sector.includes(k))?.[1]||1;
      const fundamental=((home.economy.growth||1)-2.2)*.00018+((state.market.sentiment||50)-50)*.000045+(company.growthBias-1)*.00022;
      const shock=(Math.random()-.5)*.018*vol;
      const previous=company.price;
      company.price=round(Math.max(.2,previous*(1+fundamental+shock)),2);
      company.dayChange=round((company.price/Math.max(.01,previous)-1)*100,2);
      company.marketCap=round(Math.max(.1,company.price*(company.shares||1000)/1000),1);
      company.history.push(company.price);if(company.history.length>120)company.history.shift();
      if(company.financials){company.financials.pe=round(clamp(company.financials.pe*(1+company.dayChange*.0008)+(Math.random()-.5)*.08,4,80),1)}
    }
    updateMarketIndices(state);state.market.lastUpdate=state.date;
  }

  function updateMarketIndices(state){
    const groups={
      "NEXUS WORLD":state.companies,
      "IBEX SIM":state.companies.filter(c=>c.countryId==="ESP"),
      "TECH GLOBAL":state.companies.filter(c=>/Tecnología|Semiconductores|Electrónica|Software|nube/i.test(c.sector)),
      "ENERGÍA":state.companies.filter(c=>/Energía|Minería/i.test(c.sector)),
      "INDUSTRIA":state.companies.filter(c=>/Industria|Infraestructura|Automoción|Aeroespacial|Ferrocarril/i.test(c.sector))
    };
    for(const [name,list] of Object.entries(groups)){
      const value=list.length?list.reduce((s,c)=>s+c.price*(1+(c.marketCap||1)/Math.max(1,list.reduce((x,y)=>x+(y.marketCap||0),0))),0)/list.length*100:1000;
      const prev=state.market.indices[name]?.value||value;
      state.market.indices[name]={value:round(value,1),change:round((value/Math.max(.1,prev)-1)*100,2)};
      state.market.history[name] ||= [];state.market.history[name].push(round(value,1));if(state.market.history[name].length>90)state.market.history[name].shift();
    }
  }

  function getHolding(state,companyId,countryId=state.controlledCountryId){const c=state.companies.find(x=>x.id===companyId);return Number(c?.ownershipByCountry?.[countryId]||0)}

  function buyShares(state,companyId,pct){
    const company=state.companies.find(c=>c.id===companyId),country=E.getCountry(state,state.controlledCountryId);pct=clamp(pct,.1,20);
    if(!company||!country)return{ok:false,message:"Empresa o país no encontrado."};
    const held=getHolding(state,companyId,country.id),available=Math.max(0,100-(company.ownership?.state||0)-Object.values(company.ownershipByCountry||{}).reduce((s,v)=>s+Number(v||0),0));
    const amount=Math.min(pct,available);if(amount<=0)return{ok:false,message:"No quedan acciones disponibles en el mercado."};
    const cost=round(company.marketCap*amount/100*1.012,2);if(country.economy.treasury<cost)return{ok:false,message:`Tesorería insuficiente: la operación cuesta ${cost.toLocaleString("es-ES")} mil M€.`};
    country.economy.treasury=round(country.economy.treasury-cost,2);company.ownershipByCountry[country.id]=round(held+amount,2);
    E.pushEvent(state,"market",`${country.name} compra ${amount.toFixed(1)}% de ${company.name}`,`Operación simulada por ${cost.toLocaleString("es-ES")} mil M€.`);
    return{ok:true,message:`Compra ejecutada: ${amount.toFixed(1)}% de ${company.name}.`};
  }

  function sellShares(state,companyId,pct){
    const company=state.companies.find(c=>c.id===companyId),country=E.getCountry(state,state.controlledCountryId);pct=clamp(pct,.1,20);
    if(!company||!country)return{ok:false,message:"Empresa o país no encontrado."};const held=getHolding(state,companyId,country.id),amount=Math.min(held,pct);if(amount<=0)return{ok:false,message:"No existe una participación para vender."};
    const proceeds=round(company.marketCap*amount/100*.988,2);company.ownershipByCountry[country.id]=round(held-amount,2);country.economy.treasury=round(country.economy.treasury+proceeds,2);
    return{ok:true,message:`Venta ejecutada: ${amount.toFixed(1)}% de ${company.name}; ingreso ${proceeds.toLocaleString("es-ES")} mil M€.`};
  }

  function launchTakeover(state,companyId){
    const company=state.companies.find(c=>c.id===companyId),country=E.getCountry(state,state.controlledCountryId);if(!company||!country)return{ok:false,message:"Empresa no encontrada."};
    const held=getHolding(state,companyId,country.id);if(held>=51)return{ok:false,message:"La empresa ya está controlada."};const needed=round(51-held,2),cost=round(company.marketCap*needed/100*1.22,2);if(country.economy.treasury<cost)return{ok:false,message:`La OPA requiere ${cost.toLocaleString("es-ES")} mil M€.`};
    country.economy.treasury=round(country.economy.treasury-cost,2);company.ownershipByCountry[country.id]=51;E.pushEvent(state,"market",`OPA sobre ${company.name}`,`${country.name} alcanza el 51% del capital en una operación simulada.`);return{ok:true,message:`OPA completada: ${country.name} controla ${company.name}.`};
  }

  function portOf(country){return PORT_OFFSETS[country.id]||[country.map?.lat||0,country.map?.lng||0]}
  function routeId(a,b){return[a,b].sort().join("-")}
  function hasTradeAgreement(a,b){return(a.treaties||[]).some(t=>{const type=String(t.type||"").toLowerCase();return(type==="trade"||type.includes("comerc"))&&[t.partner,t.countryId,t.with,t.targetId].includes(b.id)})||(a.relations?.[b.id]||0)>=72}

  function chooseCargo(state,source,destination){
    calculateResourceBalance(state,source);calculateResourceBalance(state,destination);
    const candidates=RESOURCE_DEFS.map(def=>({def,s:source.resourceBalance[def.id],d:destination.resourceBalance[def.id]})).filter(x=>x.s?.balance>0&&x.d?.balance<0).sort((a,b)=>(b.s.balance*Math.abs(b.d.balance))-(a.s.balance*Math.abs(a.d.balance)));
    const choice=candidates[0]||RESOURCE_DEFS.map(def=>({def,s:source.resourceBalance[def.id]})).sort((a,b)=>(b.s?.production||0)-(a.s?.production||0))[0];
    const qty=round(Math.max(.5,Math.min(Math.abs(choice?.d?.balance||8)*.12,(choice?.s?.balance||12)*.1,18)),1);
    return{resourceId:choice?.def?.id||"machinery",name:choice?.def?.name||"Maquinaria",icon:choice?.def?.icon||"⚙️",unit:choice?.def?.unit||"índice",quantity:qty};
  }

  function createTradeShip(state,route,a,b,index=0){
    return {
      id:crypto.randomUUID(),
      name:`NEXUS Trader ${Math.max(1,state.tradeRoutes.length+index+1)}`,
      from:a.id,to:b.id,progress:Math.random()*.72,
      cargo:chooseCargo(state,a,b),
      dailyStep:round(.018+Math.random()*.022,4),
      status:"En ruta"
    };
  }

  function normalizeTradeRoute(state,route){
    if(!route)return null;
    const ids=Array.isArray(route.countries)&&route.countries.length>=2
      ? route.countries.slice(0,2)
      : [route.a||route.from||route.sourceId,route.b||route.to||route.targetId];
    const a=state.countries.find(c=>c.id===ids[0]),b=state.countries.find(c=>c.id===ids[1]);
    if(!a||!b||a.id===b.id)return null;
    route.id=routeId(a.id,b.id);
    route.countries=[a.id,b.id];
    route.a=a.id;route.b=b.id;
    route.active=route.active!==false;
    route.agreementDate ||= state.date;
    route.volume=round(Number(route.volume)||Math.max(1,(a.economy.gdp+b.economy.gdp)*.00035),1);
    route.efficiency=round(Number(route.efficiency)||72,1);
    route.risk=round(Number(route.risk)||18,1);
    route.points ||= {};
    route.points[a.id]=route.points[a.id]||portOf(a);
    route.points[b.id]=route.points[b.id]||portOf(b);
    route.ships=Array.isArray(route.ships)?route.ships:[];
    const desiredShips=route.volume>=24?3:route.volume>=12?2:1;
    while(route.ships.length<desiredShips)route.ships.push(createTradeShip(state,route,a,b,route.ships.length));
    route.ships=route.ships.slice(0,5).map((ship,index)=>{
      const from=state.countries.find(c=>c.id===(ship.from||a.id))||a;
      const to=state.countries.find(c=>c.id===(ship.to||b.id))||b;
      return {
        id:ship.id||crypto.randomUUID(),
        name:ship.name||`NEXUS Trader ${index+1}`,
        from:from.id,to:to.id,
        progress:clamp(ship.progress??Math.random()*.7,0,.999),
        cargo:ship.cargo||chooseCargo(state,from,to),
        dailyStep:round(Number(ship.dailyStep)||(.018+Math.random()*.022),4),
        status:ship.status||"En ruta"
      };
    });
    return route;
  }

  function normalizeTradeRoutes(state){
    const merged=new Map();
    for(const raw of state.tradeRoutes||[]){
      const route=normalizeTradeRoute(state,raw);
      if(!route)continue;
      const existing=merged.get(route.id);
      if(!existing){merged.set(route.id,route);continue}
      existing.volume=round(Math.max(existing.volume,route.volume),1);
      existing.efficiency=round(Math.max(existing.efficiency,route.efficiency),1);
      existing.risk=round((existing.risk+route.risk)/2,1);
      const known=new Set(existing.ships.map(s=>s.id));
      for(const ship of route.ships)if(!known.has(ship.id)&&existing.ships.length<5)existing.ships.push(ship);
    }
    state.tradeRoutes=[...merged.values()];
  }

  function ensureTradeRoute(state,aId,bId){
    const a=state.countries.find(c=>c.id===aId),b=state.countries.find(c=>c.id===bId);if(!a||!b||a.id===b.id)return null;
    const id=routeId(a.id,b.id);
    let route=state.tradeRoutes.find(r=>r.id===id||((r.a===a.id&&r.b===b.id)||(r.a===b.id&&r.b===a.id))||(Array.isArray(r.countries)&&r.countries.includes(a.id)&&r.countries.includes(b.id)));
    if(route)return normalizeTradeRoute(state,route);
    const pa=portOf(a),pb=portOf(b);
    route={id,countries:[a.id,b.id],a:a.id,b:b.id,active:true,agreementDate:state.date,volume:round(Math.max(1,(a.economy.gdp+b.economy.gdp)*.00035),1),efficiency:76,risk:18,ships:[],points:{[a.id]:pa,[b.id]:pb}};
    normalizeTradeRoute(state,route);
    state.tradeRoutes.push(route);return route;
  }

  function seedStrategicTradeRoutes(state){
    const pairs=[["ESP","PRT"],["ESP","FRA"],["ESP","DEU"],["USA","CAN"],["USA","MEX"],["CHN","KOR"],["CHN","JPN"]];
    for(const [a,b] of pairs){const ca=state.countries.find(c=>c.id===a),cb=state.countries.find(c=>c.id===b);if(ca&&cb&&hasTradeAgreement(ca,cb))ensureTradeRoute(state,a,b)}
  }

  function processTradeFleet(state){
    for(const route of state.tradeRoutes.filter(r=>r.active!==false)){
      for(const ship of route.ships||[]){
        ship.progress=round((ship.progress||0)+(ship.dailyStep||.025),4);
        if(ship.progress<1)continue;
        deliverCargo(state,ship);const oldFrom=ship.from;ship.from=ship.to;ship.to=oldFrom;ship.progress=0;const source=state.countries.find(c=>c.id===ship.from),dest=state.countries.find(c=>c.id===ship.to);ship.cargo=chooseCargo(state,source,dest);ship.status="Cargando retorno";
      }
    }
  }

  function deliverCargo(state,ship){
    const source=state.countries.find(c=>c.id===ship.from),dest=state.countries.find(c=>c.id===ship.to);if(!source||!dest)return;
    const cargo=ship.cargo||chooseCargo(state,source,dest),value=round(cargo.quantity*.035,2);
    dest.resourceInventory[cargo.resourceId]=round((dest.resourceInventory[cargo.resourceId]||0)+cargo.quantity,1);source.resourceInventory[cargo.resourceId]=round(Math.max(0,(source.resourceInventory[cargo.resourceId]||0)-cargo.quantity*.15),1);
    source.economy.treasury=round(source.economy.treasury+value,2);dest.economy.treasury=round(Math.max(0,dest.economy.treasury-value),2);source.economy.exports=round((source.economy.exports||0)+value,2);dest.economy.imports=round((dest.economy.imports||0)+value,2);
    E.pushEvent(state,"shipping",`${ship.name} llega a ${dest.name}`,`${cargo.icon} Entrega ${cargo.quantity.toLocaleString("es-ES")} ${cargo.unit} de ${cargo.name} desde ${source.name}.`);
  }

  function tradeAction(state,targetId,type){
    const result=oldTradeAction?oldTradeAction(state,targetId,type):{ok:false,message:"Acción no disponible."};
    if(result?.ok&&type==="trade"){
      const source=E.getCountry(state,state.controlledCountryId),target=E.getCountry(state,targetId);
      if(source&&target){
        source.treaties ||= [];target.treaties ||= [];
        if(!source.treaties.some(t=>{const ty=String(t.type||"").toLowerCase();return(ty.includes("comerc")||ty==="trade")&&[t.partner,t.countryId,t.with,t.targetId].includes(target.id)}))
          source.treaties.push({id:crypto.randomUUID(),type:"Comercio",partner:target.id,date:state.date});
        if(!target.treaties.some(t=>[t.partner,t.countryId,t.with,t.targetId].includes(source.id)&&String(t.type).toLowerCase().includes("comerc")))
          target.treaties.push({id:crypto.randomUUID(),type:"Comercio",partner:source.id,date:state.date});
      }
      const route=ensureTradeRoute(state,state.controlledCountryId,targetId);if(route)result.message+=` Se ha activado la línea marítima ${route.ships[0]?.name||"comercial"}.`;
    }
    return result;
  }

  function updateLaborPopulation(state,country){
    const beforeJobs=country.laborModel?.facilityJobs||0,newJobs=country.economicModel?.facilityJobs||0,pop=Math.max(.02,country.economy.population),laborForce=pop*1e6*.48;
    const jobDelta=newJobs-beforeJobs,capacityVacancies=Math.max(0,newJobs*.08-jobDelta*.15),growth=country.economy.growth||0,stability=country.systems.stability||60;
    country.economy.unemployment=round(clamp(country.economy.unemployment-jobDelta/Math.max(1,laborForce)*42-(growth-1.5)*.025,2,32),2);
    const development=clamp((country.systems.technology+country.systems.logistics+country.systems.stability)/300,0,1);
    const naturalAnnual=clamp(.012-development*.0105,-.003,.014);
    const employmentPull=clamp((8-country.economy.unemployment)/22,-.3,.35),incomePull=clamp((country.economy.gdp/pop-25)/120,-.2,.45),stabilityPull=(stability-55)/180;
    const netMigrationAnnual=clamp(employmentPull+incomePull+stabilityPull,-.008,.018);
    country.economy.population=round(pop*(1+(naturalAnnual+netMigrationAnnual)/12),4);
    const productivityGain=clamp((country.economicModel?.industrialOutput||0)*.00006+(country.systems.technology-50)*.000004,-.001,.004);
    country.economy.gdp=round(country.economy.gdp*(1+productivityGain+(naturalAnnual+netMigrationAnnual)/24),2);
    country.laborModel={facilityJobs:newJobs,jobChange:jobDelta,jobVacancies:Math.round(capacityVacancies),naturalGrowthAnnual:round(naturalAnnual*100,2),netMigrationAnnual:round(netMigrationAnnual*100,2),laborForce:Math.round(laborForce)};
    updateProductiveModel(state,country);
    if(country.id==="ESP")updateSpanishRegions(state,jobDelta,naturalAnnual,netMigrationAnnual);
  }

  function updateProductiveModel(state,country){
    const model=country.productiveModel ||= {};
    const influences={industry:0,automotive:0,energy:0,digital:0,defense:0,construction:0,services:0};
    for(const f of facilitiesOf(state,country)){const lvl=f.level||1;if(["autoPlant"].includes(f.typeId))influences.automotive+=lvl*1.2;if(["steelPlant","shipyard","aerospace"].includes(f.typeId))influences.industry+=lvl;if(["solar","wind","nuclear","grid"].includes(f.typeId))influences.energy+=lvl;if(["chipFab","cyberCenter","university"].includes(f.typeId))influences.digital+=lvl;if(["airbase","navalBase","aerospace","cyberCenter"].includes(f.typeId))influences.defense+=lvl*.7;if(["rail","port","housing"].includes(f.typeId))influences.construction+=lvl*.4}
    for(const [key,value] of Object.entries(influences))model[key]=round(clamp((Number(model[key])||5)*.985+value*.12+(key==="services"?.05:0),0,55),2);
    country.productiveModelUpdated=state.date;
  }

  function updateSpanishRegions(state,totalJobDelta,naturalAnnual,migrationAnnual){
    const totalGDP=state.regions.reduce((s,r)=>s+r.gdp,0)||1;
    for(const region of state.regions){
      const direct=(region.buildings||[]).reduce((s,f)=>{const d=C.buildings.find(x=>x.id===f.typeId);return s+(d?.jobs||0)*(f.level||1)},0),prev=region.directJobs||0,delta=direct-prev;
      region.directJobs=direct;region.unemployment=round(clamp((region.unemployment||8)-delta/Math.max(10000,region.population*480000)*38-(state.countries.find(c=>c.id==="ESP").economy.growth-1.5)*.02,2,28),2);
      const share=region.gdp/totalGDP,migrationBoost=clamp((8-region.unemployment)/70,-.003,.007);
      region.population=round(region.population*(1+(naturalAnnual+migrationAnnual+ migrationBoost)/12),4);
      region.gdp=round(region.gdp*(1+(delta>0?Math.min(.006,delta/900000):0)+(naturalAnnual+migrationAnnual)/24),2);
      region.employmentImpact=Math.round(delta+totalJobDelta*share);
    }
  }

  function tickDay(state){
    const summary=oldTickDay(state);
    normalizeTradeRoutes(state);
    dailyMarket(state);processTradeFleet(state);
    if(summary?.crossedMonth){
      for(const country of state.countries){E.recalculateCountryEconomy?.(state,country);updateLaborPopulation(state,country)}
      recalculateAllResources(state);
    } else {
      const controlled=E.getCountry(state,state.controlledCountryId);calculateResourceBalance(state,controlled);
      const selected=E.getCountry(state,state.selectedCountryId);if(selected!==controlled)calculateResourceBalance(state,selected);
    }
    return summary;
  }

  function upgradeBuilding(state,regionId,facilityId){
    const country=E.getCountry(state,state.controlledCountryId),before=country.economicModel?.facilityJobs||0,result=oldUpgradeBuilding(state,regionId,facilityId);
    if(result?.ok){E.recalculateCountryEconomy?.(state,country);calculateResourceBalance(state,country);const after=country.economicModel?.facilityJobs||0,delta=Math.max(0,after-before);country.laborModel ||= {};country.laborModel.pendingJobs=round((country.laborModel.pendingJobs||0)+delta,0);updateProductiveModel(state,country);result.message+=` Empleo directo: +${delta.toLocaleString("es-ES")} puestos; producción actualizada. El impacto en desempleo, migración y población se integra en el cierre mensual.`}
    return result;
  }

  function buildInRegion(state,regionId,buildingId){const result=oldBuildInRegion(state,regionId,buildingId);if(result?.ok)calculateResourceBalance(state,E.getCountry(state,state.controlledCountryId));return result}

  Object.assign(E,{
    createInitialState,hydrateState:hydrateV13,tickDay,tradeAction,buyShares,sellShares,launchTakeover,upgradeBuilding,buildInRegion,
    resourceDefinitions:RESOURCE_DEFS,recalculateResourceBalances:recalculateAllResources,calculateResourceBalance,getHolding,ensureTradeRoute,
    marketSummary:state=>state.market,version13:true
  });
})();
