"use strict";

(() => {
  const E = window.NEXUS_ECONOMY;
  const W = window.NEXUS_WORLD;
  const P = window.NEXUS_POLITICS;
  const C = window.NEXUS_CATALOG;
  if (!E || !W || !P || !C) throw new Error("deep-systems.js requiere economy, world-data, politics y catalog.");

  const clone = value => JSON.parse(JSON.stringify(value));
  const oldCreate = E.createInitialState;
  const oldHydrate = E.hydrateState;
  const oldTickMonth = E.tickMonth;
  const oldStartResearch = E.startResearch;
  const oldUpdateBudget = E.updateBudget;
  const oldUpdateTaxRate = E.updateTaxRate;
  const oldInvestRegion = E.investRegion;
  const oldStartProject = E.startProject;
  const oldBuyShares = E.buyShares;
  const oldSellShares = E.sellShares;
  const oldTakeover = E.launchTakeover;
  const oldTradeAction = E.tradeAction;
  const clamp = E.clamp;
  const round = E.round;
  const hydratedRuntimeStates = new WeakSet();

  const unitEconomics = {
    infantry:{unitCost:.00011,unitName:"efectivos",productionDays:22,mapGlyph:"◆"},
    mechanized:{unitCost:.0065,unitName:"vehículos",productionDays:55,mapGlyph:"▣"},
    armor:{unitCost:.013,unitName:"carros",productionDays:70,mapGlyph:"▰"},
    artillery:{unitCost:.0048,unitName:"piezas",productionDays:48,mapGlyph:"✦"},
    airDefense:{unitCost:.011,unitName:"sistemas",productionDays:65,mapGlyph:"⌁"},
    rocketArtillery:{unitCost:.0075,unitName:"lanzadores",productionDays:60,mapGlyph:"✹"},
    fighter:{unitCost:.095,unitName:"aeronaves",productionDays:120,mapGlyph:"▲"},
    drone:{unitCost:.0017,unitName:"drones",productionDays:25,mapGlyph:"◇"},
    bomber:{unitCost:.19,unitName:"aeronaves",productionDays:180,mapGlyph:"▼"},
    transport:{unitCost:.12,unitName:"aeronaves",productionDays:150,mapGlyph:"✈"},
    frigate:{unitCost:1.15,unitName:"buques",productionDays:620,mapGlyph:"≈"},
    destroyer:{unitCost:1.85,unitName:"buques",productionDays:760,mapGlyph:"≋"},
    submarine:{unitCost:1.70,unitName:"submarinos",productionDays:850,mapGlyph:"◒"},
    carrier:{unitCost:8.50,unitName:"grupos aeronavales",productionDays:1450,mapGlyph:"▱"},
    satellite:{unitCost:.36,unitName:"satélites",productionDays:220,mapGlyph:"✧"},
    missile:{unitCost:.006,unitName:"misiles",productionDays:40,mapGlyph:"↟"},
    cyber:{unitCost:.00024,unitName:"especialistas",productionDays:28,mapGlyph:"⌘"}
  };


  const landlockedCountries = new Set(["AFG","AND","ARM","AUT","AZE","BDI","BFA","BTN","BLR","BOL","BWA","CAF","TCD","CZE","ETH","HUN","KAZ","KGZ","LAO","LSO","LIE","LUX","MDA","MLI","MNG","MWI","MKD","NER","NPL","PRY","RWA","SMR","SRB","SVK","SSD","SWZ","CHE","TJK","TKM","UGA","UZB","VAT","XKX","ZMB","ZWE"]);

  const buildingEconomics = {
    housing:{family:"Social",maxLevel:5,slots:1,jobs:900,energy:-1.2,output:0,capacity:"18.000 viviendas/año",requires:{infra:35}},
    hospital:{family:"Servicios públicos",maxLevel:4,slots:1,jobs:2400,energy:-1.5,output:0,capacity:"650 camas",requires:{infra:45}},
    university:{family:"Conocimiento",maxLevel:4,slots:1,jobs:3200,energy:-1.0,output:1.4,capacity:"24.000 plazas",requires:{infra:50}},
    autoPlant:{family:"Industria",maxLevel:4,slots:2,jobs:8500,energy:-4.8,output:7.2,capacity:"250.000 vehículos/año",requires:{infra:62,energy:58,technology:58}},
    steelPlant:{family:"Industria pesada",maxLevel:4,slots:2,jobs:6200,energy:-7.5,output:6.4,capacity:"2,2 Mt/año",requires:{infra:58,energy:68}},
    chipFab:{family:"Alta tecnología",maxLevel:4,slots:2,jobs:4800,energy:-5.2,output:9.5,capacity:"35.000 obleas/mes",requires:{infra:72,energy:74,technology:80}},
    shipyard:{family:"Industria naval",maxLevel:4,slots:2,jobs:7200,energy:-4.0,output:6.8,capacity:"4 grandes buques/año",requires:{infra:58,energy:55,coastal:true}},
    aerospace:{family:"Aeroespacial",maxLevel:4,slots:2,jobs:5600,energy:-3.2,output:8.1,capacity:"48 aeronaves/año",requires:{infra:68,energy:60,technology:74}},
    solar:{family:"Energía",maxLevel:5,slots:1,jobs:850,energy:4.2,output:1.7,capacity:"1,1 GW",requires:{infra:42}},
    wind:{family:"Energía",maxLevel:5,slots:1,jobs:1000,energy:4.8,output:1.9,capacity:"1,2 GW",requires:{infra:45}},
    nuclear:{family:"Energía",maxLevel:3,slots:3,jobs:4200,energy:11.5,output:4.5,capacity:"1,4 GW",requires:{infra:72,technology:76,stability:70}},
    grid:{family:"Infraestructura",maxLevel:5,slots:1,jobs:1200,energy:2.0,output:2.2,capacity:"Red de 8 GW",requires:{infra:55}},
    rail:{family:"Infraestructura",maxLevel:5,slots:1,jobs:1800,energy:-.3,output:3.0,capacity:"320 km de corredor",requires:{infra:50}},
    port:{family:"Logística",maxLevel:5,slots:2,jobs:3600,energy:-1.0,output:4.8,capacity:"6 M TEU/año",requires:{infra:55,coastal:true}},
    airbase:{family:"Defensa",maxLevel:4,slots:2,jobs:1800,energy:-1.6,output:1.0,capacity:"72 aeronaves",requires:{infra:60}},
    navalBase:{family:"Defensa",maxLevel:4,slots:2,jobs:2100,energy:-1.5,output:1.1,capacity:"18 buques",requires:{infra:58,coastal:true}},
    cyberCenter:{family:"Defensa y digital",maxLevel:4,slots:1,jobs:1600,energy:-1.1,output:3.2,capacity:"Mando nacional",requires:{infra:65,technology:72}}
  };

  const extendedTechnologies = [
    {id:"cloudSovereignty",icon:"☁️",name:"Nube soberana distribuida",branch:"Digital",cost:155,months:15,requires:["aiGov"],effects:{technology:3,intelligence:2,efficiency:2},description:"Centros de datos federados, identidad digital y resiliencia pública."},
    {id:"sixG",icon:"📡",name:"Comunicaciones 6G",branch:"Digital",cost:225,months:24,requires:["semis"],effects:{technology:4,logistics:2,intelligence:2},description:"Redes ultradensas para industria, defensa y movilidad autónoma."},
    {id:"quantumCompute",icon:"🧮",name:"Computación cuántica aplicada",branch:"Digital",cost:310,months:34,requires:["quantum","semis"],effects:{technology:7,intelligence:3,researchPoints:65},description:"Optimización, criptografía y simulación molecular de gran escala."},
    {id:"batterySolid",icon:"🔋",name:"Baterías de estado sólido",branch:"Energía",cost:190,months:20,requires:["advancedMaterials"],effects:{energy:3,industry:3,exports:2},description:"Almacenamiento estacionario y movilidad eléctrica de alta densidad."},
    {id:"smr",icon:"☢️",name:"Reactores modulares avanzados",branch:"Energía",cost:235,months:26,requires:["smartGrid","advancedMaterials"],effects:{energy:6,technology:2,emissions:-2},description:"Generación nuclear flexible, estandarizada y de fabricación seriada."},
    {id:"carbonCapture",icon:"🌫️",name:"Captura industrial de carbono",branch:"Energía",cost:175,months:18,requires:["advancedMaterials"],effects:{industry:1,emissions:-5,energy:-1},description:"Descarbonización de cemento, acero, química y refino."},
    {id:"robotFactories",icon:"🦾",name:"Fábricas autónomas",branch:"Industria",cost:215,months:22,requires:["aiGov","advancedMaterials"],effects:{industry:5,technology:2,productivity:5},description:"Robótica flexible, gemelos digitales y control de calidad autónomo."},
    {id:"circularIndustry",icon:"♻️",name:"Industria circular",branch:"Industria",cost:145,months:15,requires:["advancedMaterials"],effects:{industry:2,energy:1,emissions:-3},description:"Reciclaje avanzado, recuperación de materiales críticos y ecodiseño."},
    {id:"biomanufacturing",icon:"🧬",name:"Biofabricación industrial",branch:"Industria",cost:205,months:22,requires:["aiGov"],effects:{industry:3,technology:3,food:2},description:"Fermentación de precisión, biomateriales y química de base biológica."},
    {id:"laserDefense",icon:"🔦",name:"Defensa láser de alta energía",branch:"Defensa",cost:245,months:25,requires:["autonomousDefense","smartGrid"],effects:{military:5,technology:3},description:"Intercepción de drones, cohetes y munición merodeadora."},
    {id:"underseaNetwork",icon:"🌊",name:"Red submarina de sensores",branch:"Defensa",cost:210,months:23,requires:["spaceISR"],effects:{military:3,intelligence:5},description:"Vigilancia persistente de accesos marítimos y cables estratégicos."},
    {id:"nextGenFighter",icon:"🛩️",name:"Caza de sexta generación",branch:"Defensa",cost:340,months:38,requires:["autonomousDefense","advancedMaterials","semis"],effects:{military:8,technology:4},description:"Combate colaborativo, baja observabilidad y enjambres de acompañamiento."},
    {id:"lunarIndustry",icon:"🌕",name:"Logística cislunar",branch:"Espacio",cost:360,months:42,requires:["spaceISR","fusion"],effects:{technology:7,influence:5,exports:2},description:"Transporte orbital, comunicaciones lunares y demostradores de recursos."},
    {id:"reusableLaunch",icon:"🚀",name:"Lanzador orbital reutilizable",branch:"Espacio",cost:275,months:30,requires:["advancedMaterials"],effects:{technology:5,industry:3,intelligence:2},description:"Acceso soberano y frecuente a órbita con costes reducidos."},
    {id:"genomics",icon:"🧬",name:"Medicina genómica nacional",branch:"Biotecnología",cost:185,months:19,requires:["aiGov"],effects:{technology:3,stability:2,approval:2},description:"Prevención personalizada, terapias avanzadas y biobancos interoperables."},
    {id:"syntheticFood",icon:"🌾",name:"Proteína de precisión",branch:"Biotecnología",cost:155,months:16,requires:[],effects:{food:5,emissions:-2,industry:1},description:"Producción alimentaria resiliente con menor uso de agua y suelo."},
    {id:"waterSecurity",icon:"💧",name:"Seguridad hídrica integral",branch:"Infraestructura",cost:175,months:19,requires:["smartGrid"],effects:{food:4,stability:2,energy:-1},description:"Desalación eficiente, reutilización y redes inteligentes de agua."},
    {id:"maglevFreight",icon:"🚄",name:"Corredores logísticos automatizados",branch:"Infraestructura",cost:230,months:26,requires:["robotFactories"],effects:{logistics:6,industry:2,exports:2},description:"Ferrocarril de mercancías digitalizado y terminales autónomas."},
    {id:"verticalFarming",icon:"🌱",name:"Agricultura controlada urbana",branch:"Agricultura",cost:130,months:14,requires:["smartGrid"],effects:{food:4,stability:1,energy:-1},description:"Producción cercana, estable y eficiente en agua."},
    {id:"droughtCrops",icon:"🌿",name:"Cultivos resistentes a sequía",branch:"Agricultura",cost:145,months:15,requires:["genomics"],effects:{food:5,stability:1},description:"Edición genética y selección acelerada para climas extremos."},
    {id:"adaptiveEducation",icon:"🎓",name:"Educación adaptativa universal",branch:"Sociedad",cost:150,months:16,requires:["aiGov"],effects:{technology:3,approval:2,productivity:3},description:"Tutoría digital personalizada y recualificación continua."},
    {id:"civilResilience",icon:"🧰",name:"Resiliencia civil nacional",branch:"Sociedad",cost:125,months:13,requires:[],effects:{stability:4,military:1,food:1},description:"Reservas, protección civil, continuidad de gobierno y preparación ciudadana."}
  ];

  for (const def of C.buildings) Object.assign(def, buildingEconomics[def.id] || {family:"Infraestructura",maxLevel:4,slots:1,jobs:1000,energy:0,output:1,capacity:"Capacidad regional",requires:{}});
  const knownTech = new Set(C.technologies.map(t=>t.id));
  for (const tech of extendedTechnologies) if (!knownTech.has(tech.id)) C.technologies.push(tech);

  function hashNumber(text) {
    let h=2166136261;
    for (let i=0;i<text.length;i++) { h^=text.charCodeAt(i); h=Math.imul(h,16777619); }
    return Math.abs(h>>>0);
  }
  function seeded(id,min,max,offset=0){const h=hashNumber(id+":"+offset);return min+(h%10000)/10000*(max-min)}

  function generatedCountry(meta) {
    const pc = Math.max(900, meta.gdp*1000/Math.max(meta.population,0.05));
    const dev = clamp((Math.log10(pc)-3)*25,18,96);
    const scale = clamp(Math.log10(Math.max(meta.gdp,0.4))*18+35,20,100);
    const energyBonus = ["Asia","Africa","South America"].includes(meta.continent)?3:7;
    const country = {
      id:meta.id,name:meta.name,flag:meta.flag,color:meta.color,map:{lat:meta.lat,lng:meta.lng,size:clamp(6+Math.log10(Math.max(meta.population,0.1))*4,6,22)},
      economy:{gdp:round(meta.gdp,2),population:round(meta.population,3),treasury:round(Math.max(1,meta.gdp*.055),2),debtRatio:round(seeded(meta.id,32,118,1),1),growth:round(seeded(meta.id,1.0,5.2,2),1),inflation:round(seeded(meta.id,1.5,7.5,3),1),unemployment:round(seeded(meta.id,3.2,14.5,4),1),taxRate:round(seeded(meta.id,20,42,5),1),confidence:round(clamp(dev*.65+seeded(meta.id,15,28,6),28,91),1)},
      systems:{industry:round(clamp(dev*.62+scale*.32+seeded(meta.id,-8,8,7),18,98),1),technology:round(clamp(dev*.82+seeded(meta.id,-8,8,8),14,98),1),logistics:round(clamp(dev*.68+scale*.22+seeded(meta.id,-7,7,9),18,97),1),energy:round(clamp(dev*.48+scale*.32+energyBonus+seeded(meta.id,-9,9,10),18,99),1),food:round(clamp(48+seeded(meta.id,-18,35,11),20,99),1),military:round(clamp(scale*.58+dev*.22+seeded(meta.id,-8,11,12),15,98),1),intelligence:round(clamp(dev*.66+scale*.18+seeded(meta.id,-8,8,13),12,97),1),stability:round(clamp(58+seeded(meta.id,-18,25,14),28,95),1),approval:round(clamp(55+seeded(meta.id,-16,22,15),25,91),1),renewables:round(clamp(25+seeded(meta.id,-12,48,16),5,88),1)},
      budgets:{health:round(seeded(meta.id,3.2,8.0,17),1),education:round(seeded(meta.id,3.4,6.8,18),1),defense:round(seeded(meta.id,1.0,4.3,19),1),infrastructure:round(seeded(meta.id,2.2,5.4,20),1),research:round(seeded(meta.id,1.0,4.0,21),1),welfare:round(seeded(meta.id,4.0,11.5,22),1)},
      strengths:[`${meta.continent} · posición estratégica`,dev>70?"Capital humano y tecnología":"Potencial de convergencia",scale>72?"Escala económica":"Especialización regional"],
      risks:[seeded(meta.id,0,1,23)>.5?"Presión fiscal y deuda":"Dependencia exterior",seeded(meta.id,0,1,24)>.5?"Desigualdad territorial":"Vulnerabilidad energética"]
    };
    return country;
  }

  function enrichAllCountries(state) {
    const existing = new Map(state.countries.map(c=>[c.id,c]));
    for (const meta of W.countries) {
      if (!existing.has(meta.id)) {
        const c=generatedCountry(meta);
        c.history={gdp:[c.economy.gdp],inflation:[c.economy.inflation],unemployment:[c.economy.unemployment],treasury:[c.economy.treasury]};
        c.relations={};c.sanctions=[];c.treaties=[];c.projects=[];c.units=[];c.productionQueue=[];c.regionInvestments={};
        state.countries.push(c);existing.set(c.id,c);
      } else {
        const c=existing.get(meta.id);c.map={...(c.map||{}),lat:meta.lat,lng:meta.lng,size:c.map?.size||10};c.color ||= meta.color;c.flag ||= meta.flag;c.name ||= meta.name;
      }
    }
    state.countries=state.countries.filter((c,i,a)=>a.findIndex(x=>x.id===c.id)===i);
    for (const country of state.countries) {
      country.relations ||= {};
      for (const other of state.countries) {
        if(other.id===country.id)continue;
        if(country.relations[other.id]==null){
          let rel=round(seeded(country.id+other.id,42,63,1),1);
          if(country.map&&other.map){
            const d=Math.hypot((country.map.lat||0)-(other.map.lat||0),((country.map.lng||0)-(other.map.lng||0))*.65);
            if(d<12)rel+=5;
          }
          country.relations[other.id]=clamp(rel,5,92);
        }
      }
    }
  }

  function seedCountryUnits(country,state) {
    const existingTotal=(country.units||[]).reduce((sum,u)=>sum+(Number(u.quantity)||0),0);
    if (existingTotal>=500) return;
    country.units=[]; // migra las unidades simbólicas heredadas de v1.1 a cantidades físicas.
    const m=country.systems.military;
    const pop=country.economy.population;
    const gdp=country.economy.gdp;
    const popFactor=Math.pow(Math.max(pop,.001)/50,.62);
    const q=(base,minimum=0)=>Math.max(minimum,Math.round(base*(m/70)*popFactor));
    const coastal=!landlockedCountries.has(country.id);
    const templates=[
      ["infantry",q(42000,pop<.05?20:pop<.5?150:600)],
      ["mechanized",q(520,pop>1?5:0)],["armor",q(260,pop>2?2:0)],["artillery",q(300,pop>.5?3:0)],
      ["airDefense",q(85,pop>1?2:0)],["rocketArtillery",q(140,pop>2?5:0)],
      ["fighter",m>45?q(90,pop>3?2:0):0],["drone",q(210,pop>.5?5:0)],["bomber",m>80&&gdp>1000?q(18,1):0],["transport",q(24,pop>3?1:0)],
      ["frigate",coastal&&pop>1?q(7,1):0],["destroyer",coastal&&m>70&&pop>3?q(5,1):0],["submarine",coastal&&m>55&&pop>3?q(3,1):0],["carrier",coastal&&m>88&&gdp>5000?q(1,1):0],
      ["satellite",m>65?q(8,1):0],["missile",m>50?q(450,pop>2?20:0):0],["cyber",q(1900,pop<.1?20:50)]
    ];
    for (const [typeId,quantity] of templates) {
      if(!quantity || (!coastal&&["frigate","destroyer","submarine","carrier"].includes(typeId)))continue;
      country.units.push({id:crypto.randomUUID(),typeId,regionId:country.id==="ESP"?"MAD":null,name:`${state.unitCatalog.find(u=>u.id===typeId)?.name||typeId}`,quantity,readiness:round(clamp(country.militaryReadiness||m,35,95),1),experience:round(seeded(country.id+typeId,35,82,5),1),strength:100,status:"desplegada",lat:country.map?.lat||0,lng:country.map?.lng||0});
    }
  }

  function normalizeUnits(country,state) {
    const grouped=new Map();
    for(const unit of country.units||[]){
      const key=`${unit.typeId}:${unit.regionId||"NAT"}`;
      if(!grouped.has(key)) grouped.set(key,{...unit,quantity:Number(unit.quantity)||1});
      else {const g=grouped.get(key);g.quantity+=(Number(unit.quantity)||1);g.readiness=(g.readiness+unit.readiness)/2;g.experience=(g.experience+unit.experience)/2;}
    }
    country.units=[...grouped.values()];
    for(const u of country.units){
      u.quantity=Math.max(0,Math.round(u.quantity||1));u.status||="desplegada";u.strength??=100;
      const p=u.regionId&&W.regionCapitals[u.regionId];if(p){u.lat=p[0];u.lng=p[1]}else{u.lat??=country.map?.lat||0;u.lng??=country.map?.lng||0}
    }
  }

  function ensureCountryV2(country,state) {
    country.economy ||= {};
    country.systems ||= {};
    country.budgets ||= {health:4.5,education:4.5,defense:2.0,infrastructure:3.2,research:2.0,welfare:7.0};
    const e=country.economy,s=country.systems;
    for(const key of ["industry","technology","logistics","energy","food","military","intelligence","stability","approval","renewables"]) s[key] ??= 50;
    e.gdp ??= 100;e.population ??= 10;e.treasury ??= Math.max(5,e.gdp*.05);e.debtRatio ??= 60;e.growth ??= 2;e.inflation ??= 3;e.unemployment ??= 7;e.taxRate ??= 28;e.confidence ??= 60;
    e.interestRate ??= clamp(e.inflation+.8,.5,15);e.exports ??= round(e.gdp*.27,1);e.imports ??= round(e.gdp*.26,1);e.tradeBalance ??= round(e.exports-e.imports,1);e.reserves ??= round(e.gdp*.075,1);e.exchangeRate ??= 1;
    e.productivity ??= round((s.industry+s.technology+s.logistics)/3,1);e.wageIndex ??= round(55+e.gdp/Math.max(e.population,1)*.9,1);e.housingPressure ??= 48;e.energyBalance ??= round((s.energy-70)*1.8,1);e.foodBalance ??= round((s.food-70)*1.4,1);e.monthlyRevenue ??= 0;e.monthlySpending ??= 0;e.monthlyBalance ??= 0;e.rating ??= e.debtRatio<55?"A":e.debtRatio<85?"BBB":"BB";
    country.sectors ||= {services:58,industry:20,public:14,agriculture:6,construction:6,tourism:5,automotive:3,energy:5,digital:5,defense:2};
    country.history ||= {gdp:[e.gdp],inflation:[e.inflation],unemployment:[e.unemployment],treasury:[e.treasury]};
    country.history.gdp ||= [e.gdp];country.history.inflation ||= [e.inflation];country.history.unemployment ||= [e.unemployment];country.history.treasury ||= [e.treasury];country.history.trade ||= [];country.history.debt ||= [];country.history.approval ||= [];country.history.energy ||= [];
    country.government ||= {};country.government.legitimacy ??= round((s.stability+s.approval)/2,1);country.government.efficiency ??= round((s.logistics+s.technology)/2,1);country.government.corruption ??= round(clamp(65-s.stability*.45,8,70),1);country.government.monthsToElection ??= 40;
    country.researchPoints ??= Math.round(s.technology*1.4);country.completedTechs ||= [];country.techQueue ||= [];country.activePolicies ||= [];country.portfolio ||= {};country.intelReports ||= {};country.projects ||= [];country.units ||= [];country.productionQueue ||= [];country.regionInvestments ||= {};country.relations ||= {};country.sanctions ||= [];country.treaties ||= [];
    country.strategicStockpile ||= {fuel:70,munitions:65,food:75,medical:72};country.militaryDoctrine ||= "Defensa nacional";country.militaryReadiness ??= round((s.military+s.logistics)/2,1);country.warExhaustion ??= 0;country.sanctionLevel ??= 0;country.influence ??= round((s.technology+s.military+s.stability+e.confidence)/4,1);country.objectiveScore ??= 0;country.ai ||= {focus:s.industry>s.military?"Desarrollo económico":"Seguridad nacional",cooldown:0};country.nuclear ||= {warheads:0,alert:0,doctrine:"Disuasión mínima",taboo:true};
    country.facilities ||= [];
  }

  function hydrateV2(state) {
    state=oldHydrate(state);
    state.version="1.2-alpha";
    state.controlledCountryId ||= state.selectedCountryId || "ESP";
    state.selectedCountryId ||= state.controlledCountryId;
    state.dayIndex ||= 0;
    state.simulation ||= {secondsPerDay:10,lastMonthlyTick:state.date};
    state.unitBatch ||= 1;
    state.mapBase ||= "osm";
    state.mapZoom ||= 2;
    state.mapCenter ||= [18,10];
    state.battleAnimations ||= [];
    enrichAllCountries(state);
    for(const country of state.countries){
      ensureCountryV2(country,state);
      country.politics ||= P.buildPolitics(country);
      const regime=P.getRegime(country.politics.regimeId);
      country.government ||= {};
      country.government.regime=regime.name;
      country.government.ideology ||= country.politics.parties.find(x=>x.id===country.politics.rulingPartyId)?.ideology||"Centrismo";
      country.facilities ||= [];
      country.productionQueue ||= [];
      country.strategicStockpile ||= {fuel:70,munitions:65,food:75,medical:72};
      country.militaryReadiness ??= round((country.systems.military+country.systems.logistics)/2,1);
      country.warExhaustion ??=0;
      seedCountryUnits(country,state);
      normalizeUnits(country,state);
      country.economicModel ||= {energyDemand:0,energySupply:0,industrialOutput:0,industrialUtilization:0,workforce:0,facilityJobs:0,capacityScore:0,tradeDependency:0,shortagePenalty:0};
    }
    for(const region of state.regions){
      region.capacitySlots ||= Math.max(5,Math.min(14,Math.round(4+region.population*1.3+region.infra/20)));
      region.buildings ||= [];
      const merged=new Map();
      for(const b of region.buildings){if(!merged.has(b.typeId))merged.set(b.typeId,{...b,level:b.level||1});else merged.get(b.typeId).level=Math.min(5,merged.get(b.typeId).level+(b.level||1));}
      region.buildings=[...merged.values()];
    }
    normalizeFacilityCoordinates(state);
    for(const def of state.unitCatalog){Object.assign(def,unitEconomics[def.id]||{unitCost:Math.max(.0001,(def.cost||1)/1000),unitName:"unidades",productionDays:60,mapGlyph:"◆"});def.stats ||= {attack:def.power||30,defense:def.power||30,range:40,mobility:50};}
    hydratedRuntimeStates.add(state);
    return state;
  }

  function normalizeFacilityCoordinates(state){
    for(const region of state.regions){
      const p=W.regionCapitals[region.id]||[40,-3];
      region.lat=p[0];region.lng=p[1];
      region.buildings.forEach((b,i)=>{b.lat??=p[0]+((i%3)-1)*.11;b.lng??=p[1]+(Math.floor(i/3)-1)*.15;b.level??=1;b.condition??=100;});
    }
    for(const country of state.countries){country.facilities.forEach((b,i)=>{b.lat??=(country.map?.lat||0)+((i%4)-1.5)*.22;b.lng??=(country.map?.lng||0)+(Math.floor(i/4)-1)*.28;b.level??=1;b.condition??=100;});}
  }

  function createInitialState(){
    const state=hydrateV2(oldCreate());
    state.date="2028-01-01";state.running=false;state.speed=1;state.controlledCountryId="ESP";state.selectedCountryId="ESP";
    state.events=(state.events||[]).filter(e=>!String(e.title||"").toLowerCase().includes("nexus"));
    E.pushEvent(state,"system","NEXUS Global Alpha v1.3","Bolsa global, rutas marítimas, balances productivos, reloj horario, regiones y economía demográfica activadas.");
    recalculateAllEconomies(state);
    return state;
  }

  function getCountry(state,id){return state.countries.find(c=>c.id===(id||state.controlledCountryId||state.selectedCountryId))||state.countries[0]}
  function getSelectedCountry(state){return state.countries.find(c=>c.id===state.selectedCountryId)||getCountry(state)}

  function tickDay(state){
    if(!hydratedRuntimeStates.has(state))hydrateV2(state);
    const oldDate=new Date(`${state.date}T12:00:00Z`);
    const next=new Date(oldDate);next.setUTCDate(next.getUTCDate()+1);
    const crossed=next.getUTCMonth()!==oldDate.getUTCMonth();
    let monthSummary=null;
    if(crossed){
      const anchor=new Date(Date.UTC(oldDate.getUTCFullYear(),oldDate.getUTCMonth(),1,12));
      state.date=anchor.toISOString().slice(0,10);
      monthSummary=oldTickMonth(state);
      const monthlyDate=new Date(`${state.date}T12:00:00Z`);
      if(monthlyDate.getUTCFullYear()!==next.getUTCFullYear()||monthlyDate.getUTCMonth()!==next.getUTCMonth())state.date=next.toISOString().slice(0,10);
      state.simulation.lastMonthlyTick=state.date;
      recalculateAllEconomies(state);
    }else state.date=next.toISOString().slice(0,10);
    state.dayIndex=(state.dayIndex||0)+1;
    processDailyQueues(state);
    processDailyPolitics(state);
    processDailyWars(state);
    dailyReadiness(state);
    if(state.dayIndex%7===0)weeklyWorldPulse(state);
    return {date:state.date,crossedMonth:crossed,budget:monthSummary?.budget||null,activeWars:state.wars.filter(w=>!w.ended).length};
  }

  function processDailyQueues(state){
    for(const country of state.countries){
      for(const item of country.productionQueue){if(item.kind==="unitV2"||item.kind==="facilityV2")item.daysRemaining=Math.max(0,(item.daysRemaining??item.totalDays??30)-1)}
      const done=country.productionQueue.filter(i=>(i.kind==="unitV2"||i.kind==="facilityV2")&&i.daysRemaining<=0);
      country.productionQueue=country.productionQueue.filter(i=>!done.includes(i));
      for(const item of done){
        if(item.kind==="unitV2")completeUnitOrder(state,country,item);
        if(item.kind==="facilityV2")completeFacilityOrder(state,country,item);
      }
    }
  }

  function completeUnitOrder(state,country,item){
    const p=item.regionId&&W.regionCapitals[item.regionId];
    let group=country.units.find(u=>u.typeId===item.typeId&&(u.regionId||null)===(item.regionId||null)&&(u.modelId||null)===(item.modelId||null));
    if(group){group.quantity+=item.quantity;group.readiness=Math.max(group.readiness,68);group.strength=100;}
    else country.units.push({id:crypto.randomUUID(),typeId:item.typeId,regionId:item.regionId||null,name:item.name,displayName:item.name,modelId:item.modelId||null,modelName:item.modelName||item.name,manufacturer:item.manufacturer||null,generation:item.generation||null,role:item.role||null,photo:item.photo||null,quantity:item.quantity,readiness:68,experience:22,strength:100,status:"desplegada",lat:p?.[0]??country.map?.lat??0,lng:p?.[1]??country.map?.lng??0});
    const def=state.unitCatalog.find(u=>u.id===item.typeId);
    E.pushEvent(state,"military",`${item.modelName||def?.name||item.typeId} entregado`,`${item.quantity.toLocaleString("es-ES")} ${def?.unitName||"unidades"} entran en servicio.`);
  }

  function completeFacilityOrder(state,country,item){
    const def=C.buildings.find(b=>b.id===item.buildingId);if(!def)return;
    const p=item.regionId&&W.regionCapitals[item.regionId];
    const facility={id:crypto.randomUUID(),typeId:item.buildingId,level:1,condition:100,lat:p?.[0]??country.map?.lat??0,lng:p?.[1]??country.map?.lng??0,commissioned:state.date};
    if(country.id==="ESP"&&item.regionId){const r=state.regions.find(x=>x.id===item.regionId);if(r)r.buildings.push(facility)}else country.facilities.push(facility);
    E.pushEvent(state,"industry",`${def.name} operativa`,`${country.name} incorpora ${def.capacity} de nueva capacidad.`);
    recalculateCountryEconomy(state,country);
  }

  function processDailyPolitics(state){
    for(const country of state.countries){
      const p=country.politics;p.politicalCapital=round(clamp(p.politicalCapital+.035,0,100),2);
      if(p.daysToElection<9000)p.daysToElection--;
      if(p.daysToElection===0)resolveElection(state,country,true);
      for(const party of p.parties){party.popularity=round(clamp(party.popularity+(Math.random()-.5)*.04+(party.id===p.rulingPartyId?(country.systems.approval-55)*.0007:0),1,75),2)}
    }
  }

  function dailyReadiness(state){
    for(const country of state.countries){
      const atWar=state.wars.some(w=>!w.ended&&(w.attacker===country.id||w.defender===country.id));
      const target=clamp((country.systems.military+country.systems.logistics+country.strategicStockpile.fuel)/3-(atWar?7:0),25,96);
      country.militaryReadiness=round(clamp(country.militaryReadiness+(target-country.militaryReadiness)*.012,10,99),2);
      if(!atWar)country.warExhaustion=round(Math.max(0,country.warExhaustion-.04),2);
    }
  }

  function weeklyWorldPulse(state){
    state.world.tension=round(clamp(state.world.tension+(Math.random()-.5)*.5+state.wars.filter(w=>!w.ended).length*.08,0,100),2);
  }

  function queueUnitBatch(state,typeId,regionId,quantity=1){
    const country=getCountry(state),def=state.unitCatalog.find(u=>u.id===typeId);quantity=Math.max(1,Math.floor(Number(quantity)||1));
    if(!def)return{ok:false,message:"Sistema militar desconocido."};
    const cost=round(def.unitCost*quantity,3);
    if(country.economy.treasury<cost)return{ok:false,message:`Tesorería insuficiente: se requieren ${cost.toLocaleString("es-ES")} mil M€.`};
    const industryFactor=clamp(110/Math.max(25,country.systems.industry),.75,2.8);
    const days=Math.max(7,Math.round(def.productionDays*industryFactor*Math.pow(quantity,.18)));
    country.economy.treasury=round(country.economy.treasury-cost,3);
    country.productionQueue.push({id:crypto.randomUUID(),kind:"unitV2",typeId,regionId:country.id==="ESP"?(regionId||state.selectedRegionId):null,quantity,name:def.name,totalDays:days,daysRemaining:days,cost});
    E.pushEvent(state,"military","Contrato de producción militar",`${country.name}: ${quantity.toLocaleString("es-ES")} ${def.unitName} de ${def.name}; entrega estimada en ${days} días.`);
    return{ok:true,message:`Pedido de ${quantity.toLocaleString("es-ES")} ${def.unitName} añadido. Coste ${cost.toLocaleString("es-ES")} mil M€.`};
  }

  function deployUnit(state,unitId,regionId){
    const country=getCountry(state),unit=country.units.find(u=>u.id===unitId);if(!unit)return{ok:false,message:"Unidad no encontrada."};
    if(country.id==="ESP"){
      const region=state.regions.find(r=>r.id===regionId);if(!region)return{ok:false,message:"Región inválida."};
      unit.regionId=region.id;unit.lat=W.regionCapitals[region.id][0];unit.lng=W.regionCapitals[region.id][1];
      E.pushEvent(state,"military","Despliegue completado",`${unit.name} se desplaza a ${region.name}.`);
    }else{unit.regionId=null;unit.lat=country.map.lat;unit.lng=country.map.lng;}
    unit.status="desplegada";return{ok:true,message:"Unidad desplegada en el mapa."};
  }

  function buildingTarget(state,country,regionId){
    if(country.id==="ESP"){const region=state.regions.find(r=>r.id===(regionId||state.selectedRegionId));return{region,list:region?.buildings||[]}}
    return{region:null,list:country.facilities};
  }

  function buildInRegion(state,regionId,buildingId){
    const country=getCountry(state),def=C.buildings.find(b=>b.id===buildingId);if(!def)return{ok:false,message:"Instalación no encontrada."};
    const target=buildingTarget(state,country,regionId);if(country.id==="ESP"&&!target.region)return{ok:false,message:"Selecciona una región española."};
    if(target.list.some(b=>b.typeId===buildingId)||country.productionQueue.some(q=>q.kind==="facilityV2"&&q.buildingId===buildingId&&(q.regionId||null)===(target.region?.id||null)))return{ok:false,message:"Ya existe esta capacidad en el territorio. Amplía su nivel en lugar de duplicarla."};
    if(target.region){
      const used=target.list.reduce((s,b)=>s+(C.buildings.find(d=>d.id===b.typeId)?.slots||1),0);
      if(used+def.slots>target.region.capacitySlots)return{ok:false,message:`Capacidad territorial agotada (${used}/${target.region.capacitySlots} slots). Mejora infraestructura o instalaciones existentes.`};
    }
    const req=def.requires||{},infra=target.region?.infra??country.systems.logistics,energy=target.region?.energy??country.systems.energy;
    if(req.infra&&infra<req.infra)return{ok:false,message:`Infraestructura insuficiente: ${infra.toFixed(0)}/${req.infra}.`};
    if(req.energy&&energy<req.energy)return{ok:false,message:`Sistema energético insuficiente: ${energy.toFixed(0)}/${req.energy}.`};
    if(req.technology&&country.systems.technology<req.technology)return{ok:false,message:`Tecnología insuficiente: ${country.systems.technology.toFixed(0)}/${req.technology}.`};
    if(req.stability&&country.systems.stability<req.stability)return{ok:false,message:`Estabilidad insuficiente: ${country.systems.stability.toFixed(0)}/${req.stability}.`};
    const coastalRegions=new Set(["GAL","AST","CNT","PVA","CAT","VAL","MUR","AND","BAL","CAN"]);
    if(req.coastal&&country.id==="ESP"&&!coastalRegions.has(target.region.id))return{ok:false,message:"Esta instalación requiere costa y acceso portuario."};
    const cost=round(def.cost*(1+country.productionQueue.filter(q=>q.kind==="facilityV2").length*.04),2);
    if(country.economy.treasury<cost)return{ok:false,message:`Tesorería insuficiente: ${cost.toFixed(1)} mil M€.`};
    const days=Math.max(60,Math.round(def.months*30*clamp(95/country.systems.industry,.8,1.8)));
    country.economy.treasury=round(country.economy.treasury-cost,2);
    country.productionQueue.push({id:crypto.randomUUID(),kind:"facilityV2",buildingId,regionId:target.region?.id||null,totalDays:days,daysRemaining:days,cost,name:def.name});
    return{ok:true,message:`${def.name}: proyecto único de ${def.capacity}; plazo ${days} días.`};
  }

  function upgradeBuilding(state,regionId,facilityId){
    const country=getCountry(state),target=buildingTarget(state,country,regionId);let facility=target.list.find(b=>b.id===facilityId);
    if(!facility&&country.id==="ESP"){for(const r of state.regions){facility=r.buildings.find(b=>b.id===facilityId);if(facility){target.region=r;break}}}
    if(!facility)return{ok:false,message:"Instalación no encontrada."};
    const def=C.buildings.find(b=>b.id===facility.typeId);if(facility.level>=def.maxLevel)return{ok:false,message:"La instalación ya está en su nivel máximo."};
    const cost=round(def.cost*(.65+facility.level*.28),2);if(country.economy.treasury<cost)return{ok:false,message:"Tesorería insuficiente."};
    country.economy.treasury=round(country.economy.treasury-cost,2);facility.level++;facility.condition=100;
    recalculateCountryEconomy(state,country);return{ok:true,message:`${def.name} ampliada a nivel ${facility.level}. Capacidad ${def.capacity} ×${facility.level}.`};
  }

  function recalculateAllEconomies(state){for(const country of state.countries)recalculateCountryEconomy(state,country)}
  function facilitiesOf(state,country){return country.id==="ESP"?state.regions.flatMap(r=>r.buildings.map(b=>({...b,region:r}))):country.facilities.map(b=>({...b,region:null}))}
  function recalculateCountryEconomy(state,country){
    const facilities=facilitiesOf(state,country);let generation=0,facilityUse=0,output=0,jobs=0,capacity=0,industrial=0,knowledge=0,logistics=0;
    for(const f of facilities){const def=C.buildings.find(b=>b.id===f.typeId);if(!def)continue;const level=f.level||1;const e=(def.energy||0)*level;if(e>=0)generation+=e;else facilityUse+=Math.abs(e);output+=(def.output||0)*level;jobs+=(def.jobs||0)*level;capacity+=level;industrial+=def.family.includes("Industria")?(def.output||0)*level:0;knowledge+=def.family.includes("Conocimiento")||def.family.toLowerCase().includes("digital")?(def.output||0)*level:0;logistics+=def.family.includes("Logística")||def.family.includes("Infraestructura")?(def.output||0)*level:0;}
    const baselineSupply=country.economy.population*.12+country.systems.energy*.14+country.systems.renewables*.04;
    const supply=Math.max(1,baselineSupply+generation);
    const demand=Math.max(1,country.economy.population*.09+country.systems.industry*.045+facilityUse*.35);
    const shortage=Math.max(0,(demand-supply)/Math.max(demand,1));
    const workforce=country.economy.population*1e6*.48;
    const baseUtilization=52+country.economy.confidence*.28+country.systems.logistics*.16;
    const utilization=clamp(baseUtilization*(1-shortage*.72),28,100);
    country.economicModel={energyDemand:round(demand,1),energySupply:round(supply,1),industrialOutput:round(output,1),industrialUtilization:round(utilization,1),workforce:Math.round(workforce),facilityJobs:jobs,capacityScore:round(capacity+output,1),tradeDependency:round(clamp(country.economy.imports/Math.max(country.economy.gdp,1)*100,5,95),1),shortagePenalty:round(shortage*100,1)};
    country.systems.industry=round(clamp(country.systems.industry+(industrial-country.systems.industry*.06)*.012-shortage*.8,10,100),2);
    country.systems.technology=round(clamp(country.systems.technology+knowledge*.006,10,100),2);
    country.systems.logistics=round(clamp(country.systems.logistics+logistics*.006,10,100),2);
    country.economy.growth=round(clamp(country.economy.growth+output*.0008-shortage*.45,-8,10),2);
    country.economy.exports=round(Math.max(0,country.economy.gdp*(.16+country.systems.industry/420+output/2500)),1);
    country.economy.imports=round(Math.max(0,country.economy.gdp*(.14+shortage*.12+(100-country.systems.food)/900)),1);
    country.economy.tradeBalance=round(country.economy.exports-country.economy.imports,1);
  }

  function takeControl(state,countryId){const target=state.countries.find(c=>c.id===countryId);if(!target)return{ok:false,message:"País no encontrado."};state.controlledCountryId=target.id;state.selectedCountryId=target.id;state.mapMode="world";E.pushEvent(state,"system",`Nuevo país controlado: ${target.name}`,"El jugador asume el control completo del gobierno, economía y fuerzas armadas.");return{ok:true,message:`Ahora controlas ${target.name}.`}}

  function changeRegime(state,regimeId){const country=getCountry(state),next=P.getRegime(regimeId),current=P.getRegime(country.politics.regimeId);if(next.id===current.id)return{ok:false,message:"Ese régimen ya está vigente."};const distance=Math.abs(next.pluralism-current.pluralism)/20+Math.abs(next.stateControl-current.stateControl)/25;const cost=round(28+distance*8,1);if(country.politics.politicalCapital<cost)return{ok:false,message:`Capital político insuficiente: ${country.politics.politicalCapital.toFixed(0)}/${cost}.`};country.politics.politicalCapital-=cost;country.politics.regimeId=next.id;country.politics.oppositionFreedom=next.pluralism;country.politics.lastTransition=state.date;country.government.regime=next.name;country.systems.stability=round(clamp(country.systems.stability-5-distance*2+next.stability,5,98),1);country.systems.approval=round(clamp(country.systems.approval+next.approval-distance,5,95),1);country.government.legitimacy=round(clamp(country.government.legitimacy-distance*4,10,95),1);E.pushEvent(state,"politics",`Cambio de régimen en ${country.name}`,`${current.name} es sustituido por ${next.name}. La transición modifica pluralismo, control estatal y estabilidad.`);return{ok:true,message:`Transición completada: ${next.name}.`}}

  function appointParty(state,partyId){const country=getCountry(state),party=country.politics.parties.find(p=>p.id===partyId);if(!party)return{ok:false,message:"Partido no disponible."};if(country.politics.politicalCapital<12)return{ok:false,message:"Capital político insuficiente."};country.politics.politicalCapital-=12;country.politics.rulingPartyId=party.id;country.politics.coalition=[party.id];country.government.ideology=party.ideology;country.government.legitimacy=round(clamp((country.government.legitimacy+party.popularity)/2-2,10,95),1);country.systems.approval=round(clamp(country.systems.approval+(party.popularity-25)*.05,5,95),1);E.pushEvent(state,"politics",`${party.name} asume el gobierno`,`${country.name} cambia de ejecutivo sin alterar automáticamente el régimen.`);return{ok:true,message:`${party.name} pasa a dirigir el gobierno.`}}

  function callElection(state){const country=getCountry(state),reg=P.getRegime(country.politics.regimeId);if(reg.pluralism<35)return{ok:false,message:"El régimen actual no permite elecciones competitivas."};if(country.politics.politicalCapital<18)return{ok:false,message:"Capital político insuficiente."};country.politics.politicalCapital-=18;return resolveElection(state,country,false)}
  function resolveElection(state,country,automatic){const parties=country.politics.parties.map(p=>({p,score:p.popularity+Math.random()*12+(p.id===country.politics.rulingPartyId?(country.systems.approval-50)*.16:0)})).sort((a,b)=>b.score-a.score);const winner=parties[0].p;const total=parties.reduce((s,x)=>s+Math.max(1,x.score),0);for(const x of parties)x.p.seats=Math.round(Math.max(1,x.score)/total*350);country.politics.rulingPartyId=winner.id;country.politics.coalition=[winner.id];country.politics.daysToElection=country.politics.electionCycleDays;country.government.ideology=winner.ideology;country.government.legitimacy=round(clamp(58+winner.popularity*.38,20,95),1);E.pushEvent(state,"politics",`Elecciones en ${country.name}`,`${winner.name} vence y forma gobierno con ${winner.seats||0} escaños estimados.`);return{ok:true,message:`Elecciones celebradas: victoria de ${winner.name}.`}}

  function warAction(state,targetId,type){
    const attacker=getCountry(state),defender=state.countries.find(c=>c.id===targetId);if(!defender||defender.id===attacker.id)return{ok:false,message:"Objetivo inválido."};
    const existing=state.wars.find(w=>!w.ended&&((w.attacker===attacker.id&&w.defender===defender.id)||(w.attacker===defender.id&&w.defender===attacker.id)));
    if(type==="declare"){
      if(existing)return{ok:false,message:"Ya existe una guerra activa."};
      if((attacker.relations[targetId]??50)>38)return{ok:false,message:"La relación debe ser hostil (<38). Aplica sanciones o embargo antes de la guerra."};
      if(attacker.militaryReadiness<55)return{ok:false,message:"Preparación militar insuficiente."};
      const midpoint={lat:((attacker.map?.lat||0)+(defender.map?.lat||0))/2,lng:((attacker.map?.lng||0)+(defender.map?.lng||0))/2};
      const war={id:crypto.randomUUID(),attacker:attacker.id,defender:defender.id,start:state.date,days:0,months:0,warScore:0,territoryControl:0,ended:false,attackerLosses:0,defenderLosses:0,civilianLosses:0,battles:[],lastBattle:null,front:{...midpoint},objective:`Forzar la capitulación de ${defender.name}`};
      state.wars.push(war);attacker.relations[targetId]=3;defender.relations[attacker.id]=3;state.world.tension=clamp(state.world.tension+12,0,100);E.pushEvent(state,"military",`Guerra: ${attacker.name} contra ${defender.name}`,"Se abren frentes terrestres, aéreos, marítimos, cibernéticos y logísticos.");return{ok:true,message:"Guerra declarada. El motor de combate diario está activo."};
    }
    if(type==="ceasefire"&&existing){existing.ended=true;existing.end=state.date;existing.result="Alto el fuego negociado";attacker.relations[targetId]=24;defender.relations[attacker.id]=24;state.world.tension=clamp(state.world.tension-5,0,100);E.pushEvent(state,"diplomacy",`Alto el fuego: ${attacker.name}–${defender.name}`,"Las fuerzas detienen las operaciones y consolidan las líneas actuales.");return{ok:true,message:"Alto el fuego acordado."}}
    return{ok:false,message:"Acción de guerra no disponible."};
  }

  function countryCombatPower(state,country){
    const units=(country.units||[]).filter(u=>u.quantity>0);let total=0;const byType=[];
    for(const u of units){const d=state.unitCatalog.find(x=>x.id===u.typeId);if(!d)continue;const value=(d.power||30)*Math.sqrt(Math.max(1,u.quantity))*(u.readiness/100)*(u.strength/100)*(0.65+u.experience/200);total+=value;byType.push({typeId:u.typeId,name:d.name,quantity:u.quantity,power:value});}
    total*=.55+country.systems.logistics/180;total*=.65+country.strategicStockpile.munitions/280;return{total:Math.max(8,total),byType:byType.sort((a,b)=>b.power-a.power)};
  }

  function processDailyWars(state){
    for(const war of state.wars.filter(w=>!w.ended)){
      const a=state.countries.find(c=>c.id===war.attacker),d=state.countries.find(c=>c.id===war.defender);if(!a||!d){war.ended=true;continue}
      war.days++;war.months=Math.floor(war.days/30);
      const ap=countryCombatPower(state,a),dp=countryCombatPower(state,d);const terrain=seeded(war.id+war.days,.88,1.12,1);const airA=airPower(state,a),airD=airPower(state,d);const intel=(a.systems.intelligence-d.systems.intelligence)/100;
      const aEff=ap.total*(1+intel*.12)*(1+airA/(airA+airD+1)*.08)*terrain;const dEff=dp.total*(1-intel*.08)*(1+airD/(airA+airD+1)*.08)*(2-terrain)*1.06;
      const balance=(aEff-dEff)/Math.max(30,(aEff+dEff)*.12);war.warScore=round(clamp(war.warScore+balance+(Math.random()-.5)*1.6,-100,100),2);war.territoryControl=round(clamp(war.territoryControl+balance*.45,-100,100),2);
      const intensity=clamp((aEff+dEff)/1200,.15,2.2);const aLoss=Math.max(1,Math.round(intensity*dp.total/Math.max(ap.total,1)*seeded(war.id,4,22,war.days)));const dLoss=Math.max(1,Math.round(intensity*ap.total/Math.max(dp.total,1)*seeded(war.id,4,22,war.days+2)));
      applyLosses(state,a,aLoss);applyLosses(state,d,dLoss);war.attackerLosses+=aLoss;war.defenderLosses+=dLoss;war.civilianLosses+=Math.round((aLoss+dLoss)*seeded(war.id,.08,.45,war.days));
      a.warExhaustion=round(clamp(a.warExhaustion+.08+intensity*.06+Math.max(0,-war.warScore)*.001,0,100),2);d.warExhaustion=round(clamp(d.warExhaustion+.09+intensity*.07+Math.max(0,war.warScore)*.001,0,100),2);a.strategicStockpile.munitions=round(clamp(a.strategicStockpile.munitions-.09*intensity,0,100),2);d.strategicStockpile.munitions=round(clamp(d.strategicStockpile.munitions-.1*intensity,0,100),2);
      if(war.days===1||war.days%3===0){const battle=createBattle(state,war,a,d,ap,dp,aLoss,dLoss,balance);war.battles.unshift(battle);war.battles=war.battles.slice(0,40);war.lastBattle=battle;state.battleAnimations.push({...battle,expires:Date.now()+12000});state.battleAnimations=state.battleAnimations.slice(-15);E.pushEvent(state,"battle",battle.title,`${battle.summary} Bajas: ${a.name} ${aLoss.toLocaleString("es-ES")}, ${d.name} ${dLoss.toLocaleString("es-ES")}.`)}
      if(war.days>10&&(Math.abs(war.warScore)>=96||a.warExhaustion>=96||d.warExhaustion>=96||ap.total<12||dp.total<12))endWar(state,war,a,d);
    }
  }

  function airPower(state,c){return c.units.filter(u=>["fighter","bomber","drone","airDefense"].includes(u.typeId)).reduce((s,u)=>s+Math.sqrt(u.quantity)*(state.unitCatalog.find(x=>x.id===u.typeId)?.power||20),0)}
  function applyLosses(state,country,losses){const groups=country.units.filter(u=>u.quantity>0);let remaining=losses;for(const group of groups.sort(()=>Math.random()-.5)){if(remaining<=0)break;const share=Math.min(group.quantity,Math.max(1,Math.round(remaining/groups.length)));group.quantity=Math.max(0,group.quantity-share);group.strength=round(clamp(group.strength-share/Math.max(1,group.quantity+share)*22,10,100),1);group.readiness=round(clamp(group.readiness-.05,10,100),1);remaining-=share}}
  function createBattle(state,war,a,d,ap,dp,aLoss,dLoss,balance){const fronts=["corredor fronterizo","nudo logístico","espacio aéreo disputado","litoral estratégico","zona urbana","eje de penetración","red de comunicaciones"];const front=fronts[(war.days+hashNumber(war.id))%fronts.length];const winner=balance>=0?a:d;const lat=war.front.lat+(Math.random()-.5)*3,lng=war.front.lng+(Math.random()-.5)*5;const aUnits=ap.byType.slice(0,3).map(x=>`${x.name} (${x.quantity.toLocaleString("es-ES")})`);const dUnits=dp.byType.slice(0,3).map(x=>`${x.name} (${x.quantity.toLocaleString("es-ES")})`);return{id:crypto.randomUUID(),date:state.date,day:war.days,title:`Batalla por ${front}`,summary:`${winner.name} obtiene la ventaja táctica`,winner:winner.id,lat,lng,intensity:round(clamp((ap.total+dp.total)/600,.2,3),1),attackerUnits:aUnits,defenderUnits:dUnits,attackerLosses:aLoss,defenderLosses:dLoss,scoreChange:round(balance,2)}}
  function endWar(state,war,a,d){war.ended=true;war.end=state.date;const winner=war.warScore>=0?a:d,loser=winner===a?d:a;war.winner=winner.id;war.loser=loser.id;war.result=`Victoria de ${winner.name}`;winner.systems.stability=clamp(winner.systems.stability+2,0,100);loser.systems.stability=clamp(loser.systems.stability-6,0,100);loser.economy.gdp=round(loser.economy.gdp*.985,2);E.pushEvent(state,"military",`Fin de la guerra: ${winner.name} vence`,`${loser.name} acepta la paz tras ${war.days} días. Bajas militares estimadas: ${(war.attackerLosses+war.defenderLosses).toLocaleString("es-ES")}.`)}

  function changeUnitBatch(state,value){state.unitBatch=[1,10,100,1000].includes(Number(value))?Number(value):1;return{ok:true,message:`Multiplicador de producción x${state.unitBatch}.`}}

  function asControlled(state,fn,...args){
    const inspected=state.selectedCountryId;state.selectedCountryId=state.controlledCountryId||inspected;
    try{return fn?.(state,...args)}finally{state.selectedCountryId=inspected}
  }
  function updateBudget(state,key,value){return asControlled(state,oldUpdateBudget,key,value)}
  function updateTaxRate(state,value){return asControlled(state,oldUpdateTaxRate,value)}
  function investRegion(state,regionId,type){return asControlled(state,oldInvestRegion,regionId,type)}
  function startProject(state,projectId){return asControlled(state,oldStartProject,projectId)}
  function buyShares(state,companyId,pct){return asControlled(state,oldBuyShares,companyId,pct)}
  function sellShares(state,companyId,pct){return asControlled(state,oldSellShares,companyId,pct)}
  function launchTakeover(state,companyId){return asControlled(state,oldTakeover,companyId)}
  function tradeAction(state,targetId,type){return asControlled(state,oldTradeAction,targetId,type)}

  Object.assign(E,{
    createInitialState,hydrateState:hydrateV2,getCountry,getSelectedCountry,tickDay,
    queueUnitBatch,deployUnit,buildInRegion,upgradeBuilding,takeControl,changeRegime,appointParty,callElection,
    warAction,recalculateAllEconomies,recalculateCountryEconomy,countryCombatPower,changeUnitBatch,
    updateBudget,updateTaxRate,investRegion,startProject,buyShares,sellShares,launchTakeover,tradeAction,
    catalog:C,politics:P
  });
})();
