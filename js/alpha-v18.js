"use strict";

/* NEXUS Global Alpha v1.8
   Economía territorial dinámica, reconstrucción, I+D proporcional,
   anexión consolidada, IA geopolítica calibrada y logística visible.
*/
(() => {
  const E = window.NEXUS_ECONOMY;
  const C = window.NEXUS_CATALOG;
  if (!E || !C) throw new Error("alpha-v18.js requiere los motores de NEXUS.");

  const oldCreate = E.createInitialState;
  const oldHydrate = E.hydrateState;
  const oldTick = E.tickDay;
  const oldAnnexCountry = E.annexCountry;
  const oldUpgradeBuilding = E.upgradeBuilding;
  const oldRunElection = E.runElection;
  const oldCallElection = E.callElection;
  const oldEnactNationalDecision = E.enactNationalDecision;
  const oldRunAutonomousAI = E.runAutonomousAI;
  const oldSignPeace = E.signPeace;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  const round = (v, d = 2) => Number((Number(v) || 0).toFixed(d));
  const uid = () => crypto.randomUUID?.() || `nexus18-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  /*
   * Nombres administrativos y urbanos reales para los países que más aparecen
   * en las campañas y en las zonas de conflicto. Los IDs existentes se
   * conservan para no romper guardados anteriores.
   */
  const REAL_REGIONS = {
    USA:["District of Columbia","Texas · Austin","California · Sacramento","Louisiana · Baton Rouge","Nueva York · Albany","Florida · Tallahassee","Illinois · Springfield","Washington · Olympia"],
    COL:["Bogotá D.C.","Antioquia · Medellín","Valle del Cauca · Cali","Atlántico · Barranquilla","Bolívar · Cartagena","Santander · Bucaramanga"],
    MAR:["Rabat-Salé-Kénitra","Casablanca-Settat","Tánger-Tetuán-Alhucemas","Fez-Mequinez","Marrakech-Safí","Souss-Massa"],
    PRT:["Lisboa","Norte · Porto","Centro · Coimbra","Alentejo · Évora","Algarve · Faro","Madeira"],
    FRA:["Île-de-France · París","Auvergne-Rhône-Alpes · Lyon","Nouvelle-Aquitaine · Burdeos","Occitanie · Toulouse","Hauts-de-France · Lille","Provence-Alpes-Côte d’Azur · Marsella"],
    DEU:["Berlín","Baviera · Múnich","Renania del Norte-Westfalia · Düsseldorf","Baden-Württemberg · Stuttgart","Baja Sajonia · Hannover","Sajonia · Dresde"],
    ITA:["Lacio · Roma","Lombardía · Milán","Campania · Nápoles","Sicilia · Palermo","Piamonte · Turín","Véneto · Venecia"],
    GBR:["Inglaterra · Londres","Escocia · Edimburgo","Gales · Cardiff","Irlanda del Norte · Belfast","Noroeste · Manchester","West Midlands · Birmingham"],
    CAN:["Ontario · Toronto","Quebec · Quebec","Columbia Británica · Victoria","Alberta · Edmonton","Manitoba · Winnipeg","Nueva Escocia · Halifax"],
    MEX:["Ciudad de México","Jalisco · Guadalajara","Nuevo León · Monterrey","Veracruz · Xalapa","Puebla","Yucatán · Mérida"],
    BRA:["Distrito Federal · Brasília","São Paulo","Río de Janeiro","Bahía · Salvador","Minas Gerais · Belo Horizonte","Rio Grande do Sul · Porto Alegre"],
    ARG:["Ciudad de Buenos Aires","Provincia de Buenos Aires · La Plata","Córdoba","Santa Fe","Mendoza","Tucumán"],
    CHL:["Región Metropolitana · Santiago","Valparaíso","Biobío · Concepción","Antofagasta","Araucanía · Temuco","Los Lagos · Puerto Montt"],
    PER:["Lima","Arequipa","Cusco","La Libertad · Trujillo","Piura","Loreto · Iquitos"],
    VEN:["Distrito Capital · Caracas","Zulia · Maracaibo","Carabobo · Valencia","Bolívar · Ciudad Guayana","Lara · Barquisimeto","Táchira · San Cristóbal"],
    CHN:["Pekín","Guangdong · Guangzhou","Shanghái","Sichuan · Chengdu","Hubei · Wuhan","Xinjiang · Ürümqi","Shandong · Jinan","Yunnan · Kunming"],
    IND:["Delhi","Maharashtra · Mumbai","Uttar Pradesh · Lucknow","Tamil Nadu · Chennai","Karnataka · Bengaluru","Bengala Occidental · Calcuta","Gujarat · Gandhinagar","Rajastán · Jaipur"],
    RUS:["Moscú","San Petersburgo","Siberia · Novosibirsk","Tartaristán · Kazán","Krasnodar","Sverdlovsk · Ekaterimburgo","Primorie · Vladivostok"],
    JPN:["Tokio","Osaka","Hokkaidō · Sapporo","Aichi · Nagoya","Fukuoka","Miyagi · Sendai"],
    KOR:["Seúl","Busan","Incheon","Daegu","Daejeon","Gwangju"],
    PRK:["Pionyang","Hamgyŏng del Sur · Hamhŭng","Pyongan del Norte · Sinuiju","Kangwon · Wonsan","Hwanghae del Sur · Haeju"],
    TUR:["Ankara","Estambul","Esmirna","Gaziantep","Diyarbakır","Antalya"],
    IRN:["Teherán","Isfahán","Jorasán Razaví · Mashhad","Fars · Shiraz","Juzestán · Ahvaz","Azerbaiyán Oriental · Tabriz"],
    IRQ:["Bagdad","Basora","Nínive · Mosul","Erbil","Anbar · Ramadi","Kirkuk"],
    ISR:["Distrito de Jerusalén","Distrito de Tel Aviv","Distrito de Haifa","Distrito Central","Distrito Sur · Beerseba"],
    PSE:["Cisjordania · Ramala","Franja de Gaza","Nablus","Hebrón","Yenín"],
    UKR:["Kyiv","Járkiv","Óblast de Odesa","Óblast de Dnipró","Óblast de Leópolis","Óblast de Zaporiyia"],
    POL:["Mazovia · Varsovia","Silesia · Katowice","Pequeña Polonia · Cracovia","Baja Silesia · Breslavia","Pomerania · Gdańsk","Gran Polonia · Poznań"],
    SYR:["Damasco","Alepo","Homs","Idlib","Latakia","Deir ez-Zor"],
    LBN:["Beirut","Monte Líbano · Baabda","Norte · Trípoli","Bekaa · Zahlé","Sur · Sidón"],
    YEM:["Saná","Adén","Taiz","Hadramaut · Al Mukalla","Hodeida","Marib"],
    SDN:["Jartum","Darfur del Norte · El Fasher","Gezira · Wad Madani","Mar Rojo · Puerto Sudán","Kordofán del Sur · Kadugli"],
    SSD:["Ecuatoria Central · Yuba","Alto Nilo · Malakal","Unity · Bentiu","Jonglei · Bor","Bahr el Ghazal Occidental · Wau"],
    ETH:["Adís Abeba","Oromía · Adama","Amhara · Bahir Dar","Tigray · Mekele","Somalí · Jijiga","Naciones del Sur · Hawassa"],
    SOM:["Banaadir · Mogadiscio","Puntland · Garowe","Somalilandia · Hargeisa","Jubalandia · Kismayo","Galmudug · Dusamareb"],
    NGA:["Territorio de la Capital Federal · Abuja","Lagos","Kano","Rivers · Port Harcourt","Borno · Maiduguri","Kaduna"],
    MLI:["Bamako","Gao","Tombuctú","Mopti","Sikasso"],
    BFA:["Centro · Uagadugú","Hauts-Bassins · Bobo-Dioulasso","Sahel · Dori","Este · Fada N’Gourma","Norte · Ouahigouya"],
    NER:["Niamey","Agadez","Tillabéri","Diffa","Maradi","Zinder"],
    COD:["Kinshasa","Kivu del Norte · Goma","Kivu del Sur · Bukavu","Katanga · Lubumbashi","Ituri · Bunia","Kasai Central · Kananga"],
    CMR:["Centro · Yaundé","Litoral · Duala","Extremo Norte · Maroua","Noroeste · Bamenda","Suroeste · Buea"],
    MOZ:["Maputo","Cabo Delgado · Pemba","Nampula","Sofala · Beira","Tete"],
    MMR:["Naypyidaw","Yangón","Mandalay","Shan · Taunggyi","Rakhine · Sittwe","Kachin · Myitkyina"],
    PAK:["Territorio de Islamabad","Punjab · Lahore","Sindh · Karachi","Khyber Pakhtunkhwa · Peshawar","Baluchistán · Quetta"],
    AFG:["Kabul","Herat","Kandahar","Balkh · Mazar-e Sharif","Nangarhar · Jalalabad","Kunduz"],
    IDN:["Yakarta","Java Occidental · Bandung","Java Oriental · Surabaya","Sumatra Septentrional · Medan","Sulawesi Meridional · Makassar","Papúa · Jayapura"],
    PHL:["Metro Manila","Cebú","Dávao","Calabarzon","Luzón Central","Mindanao del Norte · Cagayán de Oro"],
    AUS:["Territorio de la Capital Australiana · Canberra","Nueva Gales del Sur · Sídney","Victoria · Melbourne","Queensland · Brisbane","Australia Occidental · Perth","Australia Meridional · Adelaida"],
    ZAF:["Gauteng · Johannesburgo","Cabo Occidental · Ciudad del Cabo","KwaZulu-Natal · Durban","Cabo Oriental · Bhisho","Estado Libre · Bloemfontein"],
    SAU:["Riad","La Meca · Yeda","Provincia Oriental · Dammam","Medina","Asir · Abha"],
    EGY:["El Cairo","Alejandría","Giza","Suez","Sinaí del Norte · El Arish","Asuán"],
    DZA:["Argel","Orán","Constantina","Tamanrasset","Annaba","Ouargla"],
    TUN:["Túnez","Sfax","Susa","Bizerta","Gabès"],
    GRC:["Ática · Atenas","Macedonia Central · Salónica","Creta · Heraclión","Tesalia · Larisa","Grecia Occidental · Patras"],
    ROU:["Bucarest-Ilfov","Cluj","Timiș","Iași","Constanța"],
    NOR:["Oslo","Vestland · Bergen","Trøndelag · Trondheim","Troms og Finnmark · Tromsø","Rogaland · Stavanger"],
    SWE:["Estocolmo","Västra Götaland · Gotemburgo","Escania · Malmö","Uppsala","Norrbotten · Luleå"],
    FIN:["Uusimaa · Helsinki","Pirkanmaa · Tampere","Ostrobotnia del Norte · Oulu","Finlandia Propia · Turku","Laponia · Rovaniemi"]
  };

  const FALLBACK_NAMES = {
    Europe:["Distrito de la capital","Provincia metropolitana","Área administrativa occidental","Área administrativa oriental","Distrito fronterizo"],
    Asia:["Distrito de la capital","Provincia metropolitana","Gobernación occidental","Gobernación oriental","Provincia fronteriza"],
    Africa:["Región de la capital","Provincia metropolitana","Gobernación septentrional","Gobernación meridional","Provincia fronteriza"],
    "North America":["Distrito de la capital","Estado metropolitano","Provincia atlántica","Provincia interior","Distrito del Pacífico"],
    "South America":["Distrito capital","Departamento metropolitano","Provincia andina","Provincia litoral","Departamento interior"],
    Oceania:["Territorio de la capital","Provincia metropolitana","Distrito insular","Provincia septentrional","Provincia meridional"],
    Other:["Distrito de la capital","Municipio principal","Distrito costero","Distrito interior","Municipio exterior"]
  };

  const HIGH_CONFLICT = new Set(["PSE","MMR","SYR","MEX","NGA","SDN","UKR","RUS","YEM","SOM","BFA","MLI","NER","COD","SSD","ETH","IRQ","AFG","PAK","ISR","LBN","CMR","MOZ"]);
  const MEDIUM_CONFLICT = new Set(["ARM","AZE","TUR","IRN","IND","CHN","PRK","KOR","VEN","COL","HTI","CAF","TCD","LBY","DZA","MAR","SRB","XKX"]);

  const EXTRA_DECISIONS = [
    {id:"debtReductionPlan",icon:"📉",name:"Programa de Reducción de Deuda",treasury:15,political:10,cooldown:120,description:"Amortiza deuda, reduce intereses y libera tesorería futura.",facility:null},
    {id:"hospitalNetwork",icon:"🏥",name:"Red Nacional de Hospitales",treasury:13,political:12,cooldown:180,description:"Crea capacidad hospitalaria y empleo sanitario regional.",facility:"hospital"},
    {id:"logisticsCorridors",icon:"🚄",name:"Corredores Logísticos Nacionales",treasury:17,political:14,cooldown:210,description:"Construye transporte productivo y mejora exportaciones.",facility:"rail"},
    {id:"strategicHousing",icon:"🏘️",name:"Vivienda en Zonas de Empleo",treasury:11,political:10,cooldown:150,description:"Genera vivienda donde la industria atrae población.",facility:"housing"},
    {id:"innovationClusters",icon:"🧩",name:"Clústeres Nacionales de Innovación",treasury:20,political:16,cooldown:240,description:"Universidad, semiconductores e I+D aplicada.",facility:"university"},
    {id:"energySecurity",icon:"⚡",name:"Plan de Seguridad Energética",treasury:16,political:13,cooldown:210,description:"Refuerza red, generación y autonomía energética.",facility:"grid"},
    {id:"industrialReshoring",icon:"🏭",name:"Retorno de Industria Estratégica",treasury:18,political:15,cooldown:240,description:"Crea capacidad fabril y empleo productivo nacional.",facility:"autoPlant"}
  ];

  const TECH_UNLOCKS = {
    aiGov:["Centro ciberespacial","Universidad tecnológica"],smartGrid:["Red eléctrica inteligente","Parque solar","Parque eólico"],
    advancedMaterials:["Acería eléctrica","Polo aeroespacial"],semis:["Fábrica de semiconductores"],fusion:["Reactor modular avanzado"],
    autonomousDefense:["Base aérea integrada","Centro ciberespacial"],hypersonics:["Polo aeroespacial"],quantum:["Centro ciberespacial"],
    greenHydrogen:["Red eléctrica inteligente","Acería eléctrica"],spaceISR:["Polo aeroespacial","Centro ciberespacial"],
    industrialRobotics:["Planta de automoción","Acería eléctrica"],biotech:["Hospital regional","Universidad tecnológica"]
  };

  function country(state, id = state.controlledCountryId) {
    return state.countries.find(c => c.id === id) || state.countries[0];
  }

  function regions(state, id) {
    return E.getCountryRegions?.(state, id) || [];
  }

  function facilityList(state, c, r) {
    return E.facilitiesInRegion?.(state, c, r.id) || [];
  }

  function upgradeCost(facility) {
    const def = C.buildings.find(x => x.id === facility?.typeId);
    return def ? round(def.cost * (.65 + (facility.level || 1) * .28), 2) : 0;
  }

  function applyRealRegionNames(state) {
    for (const c of state.countries) {
      if (c.id === "ESP") continue;
      const list = regions(state, c.id);
      const names = REAL_REGIONS[c.id] || FALLBACK_NAMES[c.continent] || FALLBACK_NAMES.Other;
      list.forEach((r, i) => {
        if (r.realNameApplied) return;
        const selected = names[i % names.length];
        r.name = REAL_REGIONS[c.id] ? selected : `${selected} · ${c.name}`;
        r.capital = selected.includes("·") ? selected.split("·").pop().trim() : selected;
        r.realNameApplied = true;
      });
    }
  }

  function ensureInternalTrade(state, c) {
    c.internalTradeNetworks ||= [];
    for (const item of c.annexedCountries || []) {
      if (c.internalTradeNetworks.some(x => x.sourceCountryId === item.countryId)) continue;
      c.internalTradeNetworks.push({
        id:uid(), sourceCountryId:item.countryId, name:`Mercado integrado de ${item.name}`,
        regionIds:item.regions || [], efficiency:100, automatic:true, monthlyBenefit:round(Math.max(.1, (item.absorbedGDP || 0) * .00045), 2)
      });
    }
  }

  function markAnnexedReconstruction(state, c) {
    for (const item of c.annexedCountries || []) {
      for (const id of item.regions || []) {
        const r = E.getRegion?.(state, c.id, id);
        if (!r || r.reconstruction) continue;
        const war = (state.wars || []).find(w => w.loser === item.countryId || w.defender === item.countryId);
        const intensity = clamp(war?.intensity ?? 55, 20, 100);
        const damage = round(clamp(18 + intensity * .34 + Math.random() * 12, 15, 70), 1);
        r.reconstruction = {
          sourceCountryId:item.countryId, damage, initialDamage:damage, status:"required",
          infrastructure:round(clamp(damage * .82, 0, 100), 1),
          industry:round(clamp(damage * .72, 0, 100), 1),
          energy:round(clamp(damage * .58, 0, 100), 1)
        };
        r.infra = clamp((r.infra || 50) - damage * .18, 5, 100);
        r.industry = clamp((r.industry || 50) - damage * .15, 5, 100);
        r.energy = clamp((r.energy || 50) - damage * .12, 5, 100);
        for (const f of facilityList(state, c, r)) f.condition = clamp((f.condition ?? 100) - damage * .55, 20, 100);
      }
    }
  }

  function calculateResearchRate(state, c) {
    const research = clamp(c.budgets?.research ?? 1, .5, 20);
    const education = clamp(c.budgets?.education ?? 3, .5, 20);
    const scienceFacilities = regions(state, c.id).reduce((sum, r) => sum + facilityList(state, c, r).reduce((n, f) => {
      const def = C.buildings.find(x => x.id === f.typeId);
      return n + ((def?.effects?.researchPoints || 0) / 22) * (f.level || 1) * ((f.condition ?? 100) / 100);
    }, 0), 0);
    const annexedPopulation = (c.annexedCountries || []).reduce((s, x) => s + (x.absorbedPopulation || 0), 0);
    const annexBonus = 1 + Math.min(1.25, Math.log1p(annexedPopulation) * .13 + (c.annexedCountries?.length || 0) * .08);
    const base = .65 + research * 1.45 + education * .18 + (c.systems.technology || 0) * .025 + scienceFacilities * .7;
    return round(base * annexBonus, 1);
  }

  function applyBudgetEffects(state, c) {
    const b = c.budgets || {};
    const research = clamp(b.research || 0, 0, 20);
    const defense = clamp(b.defense || 0, 0, 20);
    const infrastructure = clamp(b.infrastructure || 0, 0, 20);
    const health = clamp(b.health || 0, 0, 20);
    const education = clamp(b.education || 0, 0, 20);
    const welfare = clamp(b.welfare || 0, 0, 20);
    c.systems.technology = clamp(c.systems.technology + (research - 2) * .055 + (education - 4) * .018, 0, 100);
    c.systems.military = clamp(c.systems.military + (defense - 2) * .06, 0, 100);
    c.militaryReadiness = clamp(c.militaryReadiness + (defense - 2) * .12, 0, 100);
    c.systems.logistics = clamp(c.systems.logistics + (infrastructure - 3) * .055, 0, 100);
    c.systems.energy = clamp(c.systems.energy + (infrastructure - 3) * .018 + (research - 2) * .012, 0, 100);
    c.systems.stability = clamp(c.systems.stability + (health - 4) * .018 + (welfare - 5) * .022, 0, 100);
    c.economy.productivity = clamp((c.economy.productivity || 70) + (education - 4) * .025 + (infrastructure - 3) * .018, 0, 150);
    c.economy.growth = clamp(c.economy.growth + (infrastructure - 3) * .006 + (research - 2) * .005, -12, 15);
    c.budgetImpact = {
      technology:round((research - 2) * .055 + (education - 4) * .018, 3),
      military:round((defense - 2) * .06, 3),
      energy:round((infrastructure - 3) * .018 + (research - 2) * .012, 3),
      growth:round((infrastructure - 3) * .006 + (research - 2) * .005, 3)
    };
  }

  function updateRegionalEconomy(state, c) {
    let countryJobs = 0,gdpDelta=0,populationDelta=0;
    for (const r of regions(state, c.id)) {
      const gdpBefore=Number(r.gdp)||0,populationBefore=Number(r.population)||0;
      const facilities = facilityList(state, c, r);
      const jobs = Math.round(facilities.reduce((sum, f) => {
        const def = C.buildings.find(x => x.id === f.typeId);
        return sum + (def?.jobs || 0) * (f.level || 1) * ((f.condition ?? 100) / 100);
      }, 0));
      const previous = Number(r.dynamicEconomy?.facilityJobs || 0);
      const newJobs = Math.max(0, jobs - previous);
      r.dynamicEconomy ||= {};
      r.dynamicEconomy.facilityJobs = jobs;
      r.dynamicEconomy.employmentCreated = round((r.dynamicEconomy.employmentCreated || 0) + newJobs, 0);
      r.dynamicEconomy.gdpPerCapita = round((r.gdp || 0) * 1000 / Math.max(.001, r.population || 0), 0);
      if (newJobs > 0) {
        r.population = round((r.population || 0) + newJobs / 1e6 * .22, 5);
        r.gdp = round((r.gdp || 0) + newJobs / 1e6 * 42, 3);
      }
      const monthlyGrowth = clamp(((r.industry || 50) + (r.infra || 50) + (r.energy || 50)) / 3000, .005, .09);
      r.gdp = round((r.gdp || 0) * (1 + monthlyGrowth / 12), 3);
      r.dynamicEconomy.gdpPerCapita = round((r.gdp || 0) * 1000 / Math.max(.001, r.population || 0), 0);
      countryJobs += jobs;
      gdpDelta+=Math.max(0,(Number(r.gdp)||0)-gdpBefore);populationDelta+=Math.max(0,(Number(r.population)||0)-populationBefore);
    }
    c.economy.gdp=round((c.economy.gdp||0)+gdpDelta,3);c.economy.population=round((c.economy.population||0)+populationDelta,5);
    c.laborModel ||= {};
    c.laborModel.facilityJobs = countryJobs;
    c.economicModel ||= {};
    c.economicModel.facilityJobs = countryJobs;
  }

  function processInternalTrade(c) {
    for (const network of c.internalTradeNetworks || []) {
      if (!network.automatic) continue;
      const benefit = round((network.monthlyBenefit || .1) * (network.efficiency || 100) / 100, 2);
      c.economy.treasury = round(c.economy.treasury + benefit, 2);
      c.economy.internalTradeIncome = round((c.economy.internalTradeIncome || 0) + benefit, 2);
      c.economy.tradeBalance = round((c.economy.tradeBalance || 0) + benefit, 2);
    }
  }

  function reconstructRegion(state, regionId, scope = "all") {
    const c = country(state);
    const r = E.getRegion?.(state, c.id, regionId);
    if (!r || r.ownerId !== c.id) return {ok:false,message:"La región no pertenece al país controlado."};
    const rec = r.reconstruction;
    if (!rec || rec.status === "complete" || rec.damage <= 0) return {ok:false,message:"La región no necesita reconstrucción."};
    if ((c.productionQueue || []).some(q => q.kind === "reconstructionV18" && q.regionId === r.id)) return {ok:false,message:"Ya existe una reconstrucción activa en esta región."};
    const factor = scope === "all" ? 1 : .42;
    const cost = round(Math.max(1.2, (r.gdp || 1) * .006 * factor + rec.damage * .055 * factor), 2);
    if (c.economy.treasury < cost) return {ok:false,message:`Tesorería insuficiente: requiere ${cost} mil M€.`};
    const days = Math.max(30, Math.round((55 + rec.damage * 2.2) * factor));
    c.economy.treasury = round(c.economy.treasury - cost, 2);
    c.productionQueue.push({
      id:uid(),kind:"reconstructionV18",name:`Reconstrucción de ${r.name}`,regionId:r.id,targetRegionId:r.id,
      scope,totalDays:days,daysRemaining:days,cost,status:"reconstruction",startedDate:state.date
    });
    rec.status = "active";
    E.pushEvent(state,"decision",`Reconstrucción iniciada en ${r.name}`,`${scope === "all" ? "Plan integral" : `Recuperación de ${scope}`} · ${days} días · ${cost} mil M€.`);
    return {ok:true,message:`Reconstrucción iniciada en ${r.name}: ${days} días.`};
  }

  function reconstructCountry(state, sourceCountryId) {
    const c = country(state);
    const targets = regions(state, c.id).filter(r => r.reconstruction?.sourceCountryId === sourceCountryId && r.reconstruction.status !== "complete");
    if (!targets.length) return {ok:false,message:"No quedan regiones dañadas de ese territorio."};
    let started = 0;
    for (const r of targets) if (reconstructRegion(state, r.id, "all").ok) started += 1;
    return started ? {ok:true,message:`Plan nacional de reconstrucción: ${started} regiones en obras.`} : {ok:false,message:"No hay tesorería suficiente para iniciar el plan."};
  }

  function processReconstruction(state, c) {
    for (const q of (c.productionQueue || []).filter(x => x.kind === "reconstructionV18")) {
      q.daysRemaining = Math.max(0, (q.daysRemaining || 0) - 1);
      if (q.daysRemaining > 0) continue;
      const r = E.getRegion?.(state, c.id, q.regionId);
      if (r?.reconstruction) {
        const rec = r.reconstruction;
        const repair = q.scope === "all" ? rec.damage : rec.damage * .42;
        if (q.scope === "all" || q.scope === "infrastructure") r.infra = clamp((r.infra || 0) + repair * .22, 0, 100);
        if (q.scope === "all" || q.scope === "industry") r.industry = clamp((r.industry || 0) + repair * .2, 0, 100);
        if (q.scope === "all" || q.scope === "energy") r.energy = clamp((r.energy || 0) + repair * .18, 0, 100);
        for (const f of facilityList(state, c, r)) f.condition = clamp((f.condition ?? 50) + repair * .72, 0, 100);
        rec.damage = round(Math.max(0, rec.damage - repair), 1);
        rec.status = rec.damage <= 1 ? "complete" : "required";
        r.integration = clamp((r.integration || 40) + (q.scope === "all" ? 12 : 5), 0, 100);
        r.stability = clamp((r.stability || 50) + (q.scope === "all" ? 7 : 3), 0, 100);
        E.pushEvent(state,"decision",`Reconstrucción completada en ${r.name}`,"La infraestructura y el tejido productivo vuelven a operar bajo el nuevo Estado.");
      }
    }
    c.productionQueue = (c.productionQueue || []).filter(q => q.kind !== "reconstructionV18" || q.daysRemaining > 0);
  }

  function payDownDebt(state, share = 5) {
    const c = country(state);
    share = clamp(share, 1, 20);
    const debtStock = Math.max(0, c.economy.gdp * (c.economy.debtRatio || 0) / 100);
    const payment = round(debtStock * share / 100, 2);
    if (payment <= 0) return {ok:false,message:"El país no tiene deuda que amortizar."};
    if (c.economy.treasury < payment) return {ok:false,message:`Tesorería insuficiente: se necesitan ${payment} mil M€.`};
    const before = c.economy.debtRatio;
    c.economy.treasury = round(c.economy.treasury - payment, 2);
    c.economy.debtRatio = round(Math.max(0, before - payment / Math.max(.01, c.economy.gdp) * 100), 2);
    c.economy.interestRate = round(Math.max(.2, (c.economy.interestRate || 3) - share * .025), 2);
    c.economy.debtInterestSavings = round((c.economy.debtInterestSavings || 0) + payment * (c.economy.interestRate || 3) / 100 / 12, 3);
    c.economy.confidence = clamp(c.economy.confidence + share * .12, 0, 100);
    return {ok:true,message:`Deuda amortizada: ${payment} mil M€. Ratio ${before.toFixed(1)}% → ${c.economy.debtRatio.toFixed(1)}%.`};
  }

  function cleanSettlements(state) {
    for (const w of state.wars || []) {
      if (!w.ended) continue;
      if (w.winner || w.loser || country(state,w.defender)?.annexedBy || country(state,w.attacker)?.annexedBy) {
        w.settlement ||= {};
        w.settlement.status = "resolved";
        w.settlement.resolved = true;
        w.settlement.date ||= state.date;
      }
    }
    state.decisions = (state.decisions || []).filter(d => !(d.status === "pending" && d.category === "war" && (state.wars || []).some(w => w.ended && (d.warId === w.id || d.dedupeKey?.includes(w.id)))));
  }

  function decorateTradeRoutes(state) {
    const esp = country(state, "ESP");
    const spanish = {
      GAL:[42.8782,-8.5448], AST:[43.3619,-5.8494], CNT:[43.4623,-3.80998], PVA:[42.8467,-2.6716],
      AND:[37.3891,-5.9845], CAT:[41.3874,2.1686], VAL:[39.4699,-0.3763], MUR:[37.9922,-1.1307]
    };
    for (const route of state.tradeRoutes || []) {
      const [aId,bId] = route.countries || [];
      const a = country(state,aId), b = country(state,bId);
      if (!a || !b) continue;
      const distance = Math.hypot((a.map.lat-b.map.lat)*111,(a.map.lng-b.map.lng)*85);
      route.transportMode = distance < 1450 && a.continent === b.continent && !["AUS","NZL","JPN","PHL","IDN","GBR","IRL"].includes(a.id) && !["AUS","NZL","JPN","PHL","IDN","GBR","IRL"].includes(b.id) ? "land" : "sea";
      route.vehicleIcon = route.transportMode === "land" ? "🚚" : "🚢";
      if (!route.countries.includes("ESP")) continue;
      const other = aId === "ESP" ? b : a;
      let pool;
      if (other.continent === "Africa" || other.continent === "South America") pool = ["AND"];
      else if (other.continent === "Asia" || other.lng > 5) pool = ["CAT","VAL","MUR"];
      else if (other.lat > 48 && other.lng < 6) pool = ["AST","PVA"];
      else pool = ["GAL","AST","CNT"];
      const index = Math.abs(String(route.id || other.id).split("").reduce((s,x)=>s+x.charCodeAt(0),0)) % pool.length;
      route.points ||= {};
      route.points.ESP = spanish[pool[index]];
      route.spanishPortRegionId = pool[index];
      route.spanishPortName = E.getRegion?.(state,"ESP",pool[index])?.capital || pool[index];
      if (esp && route.transportMode === "land") route.points.ESP = [esp.map.lat,esp.map.lng];
    }
  }

  function geopoliticalRisk(c) {
    return HIGH_CONFLICT.has(c.id) ? 3 : MEDIUM_CONFLICT.has(c.id) ? 1.8 : .55;
  }

  function runRealisticAI(state, options = {}) {
    if (options.force) return oldRunAutonomousAI(state, options);
    const sovereign = state.countries.filter(c => c.sovereign !== false);
    const active = (state.wars || []).filter(w => !w.ended);
    if (active.length >= 6) return [];
    const annualOnset = 8;
    const weeklyChance = annualOnset / 52 * clamp((4-active.length)/2,.35,1.5);
    const available = sovereign.filter(c => !active.some(w => w.attacker === c.id || w.defender === c.id));
    const pairs = [];
    for (const a of available) for (const b of available) {
      if (a.id >= b.id) continue;
      const distance = Math.hypot((a.map.lat-b.map.lat)*111,(a.map.lng-b.map.lng)*85);
      const relation = Math.min(a.relations?.[b.id] ?? 50,b.relations?.[a.id] ?? 50);
      const risk = geopoliticalRisk(a) * geopoliticalRisk(b) * (distance < 900 ? 3 : distance < 2300 ? 1.5 : .25) * clamp((58-relation)/24,.15,3);
      if (risk > .25) pairs.push({a,b,risk});
    }
    pairs.sort((x,y)=>y.risk-x.risk);
    const candidates = pairs.slice(0, Math.min(20,pairs.length));
    if (!candidates.length) return [];
    const total = candidates.reduce((s,x)=>s+x.risk,0);
    let roll = Math.random()*total, selected=candidates[0];
    for (const pair of candidates) { roll -= pair.risk; if (roll <= 0) { selected=pair; break; } }
    if(Math.random()>weeklyChance){
      if(Math.random()<.38){
        const relation=Math.min(selected.a.relations?.[selected.b.id]??50,selected.b.relations?.[selected.a.id]??50);
        selected.a.relations[selected.b.id]=clamp(relation-3,0,100);selected.b.relations[selected.a.id]=clamp(relation-2,0,100);
        state.world.tension=clamp((state.world.tension||0)+.35,0,100);
        state.aiDirector.actions||=[];state.aiDirector.actions.unshift({type:"crisis",actor:selected.a.id,target:selected.b.id,date:state.date});
        if(relation<35)E.pushEvent(state,"military",`Crisis entre ${selected.a.name} y ${selected.b.name}`,"Movilizaciones y presión diplomática elevan el riesgo regional sin llegar todavía a una guerra.");
        return[{type:"crisis",actor:selected.a.id,target:selected.b.id}];
      }
      return[];
    }
    const attacker = (selected.a.militaryReadiness || 0) >= (selected.b.militaryReadiness || 0) ? selected.a : selected.b;
    const defender = attacker === selected.a ? selected.b : selected.a;
    const war = E.createAIWar?.(state,attacker,defender);
    if (!war) return [];
    war.riskModel = {version:"UCDP-ACLED-v18",annualInterstateBaseline:8,attackerRisk:geopoliticalRisk(attacker),defenderRisk:geopoliticalRisk(defender)};
    state.aiDirector.realisticConflicts = (state.aiDirector.realisticConflicts || 0) + 1;
    return [{type:"conflict",actor:attacker.id,target:defender.id,warId:war.id}];
  }

  function applyElectionCapital(c, beforeSeats) {
    const ruling = c.politics.parties.find(p => p.id === c.politics.rulingPartyId);
    const gain = ruling ? (ruling.seats || 0) - (beforeSeats.get(ruling.id) || 0) : 0;
    const performance = c.politics.lastElectionPerformance || c.politics.performanceIndex || 50;
    const bonus = clamp(Math.max(0,gain)*.18 + Math.max(0,performance-50)*.09,0,18);
    c.politics.politicalCapital = round(clamp((c.politics.politicalCapital || 0) + bonus,0,100),1);
    c.politics.lastElectionCapitalBonus = round(bonus,1);
    if (ruling && (ruling.axis || 0) > 15 && c.economy.growth > 1) {
      const rightBonus = clamp(c.economy.growth*.08 + c.systems.industry*.006,0,.9);
      ruling.popularity = round((ruling.popularity || 0) + rightBonus,2);
      c.economy.confidence = clamp(c.economy.confidence + rightBonus*.25,0,100);
    }
  }

  function runElection(state,c,automatic=false) {
    const before = new Map((c.politics.parties || []).map(p=>[p.id,p.seats||0]));
    const result = oldRunElection(state,c,automatic);
    if (result?.ok) applyElectionCapital(c,before);
    return result;
  }

  function callElection(state) {
    const c=country(state),before=new Map((c.politics.parties||[]).map(p=>[p.id,p.seats||0]));
    const result=oldCallElection(state);
    if(result?.ok)applyElectionCapital(c,before);
    return result;
  }

  function createDecisionFacility(state,c,typeId) {
    const def=C.buildings.find(x=>x.id===typeId);
    const target=[...regions(state,c.id)].sort((a,b)=>(b.population||0)-(a.population||0))[0];
    if(!def||!target)return null;
    const existing=facilityList(state,c,target).find(f=>f.typeId===typeId);
    if(existing){existing.level=(existing.level||1)+1;existing.condition=100;return existing}
    const f={id:uid(),typeId,level:1,condition:100,countryId:c.id,regionId:target.id,lat:target.lat,lng:target.lng,createdByDecision:true};
    if(target.buildings)target.buildings.push(f);else{c.facilities||=[];c.facilities.push(f)}
    return f;
  }

  function enactNationalDecision(state,id) {
    const def=EXTRA_DECISIONS.find(x=>x.id===id);
    if(!def){
      const result=oldEnactNationalDecision(state,id);
      if(result?.ok){
        const facility=({housingPlan:"housing",industrialPact:"autoPlant",healthCompact:"hospital",educationProgram:"university",greenTransition:"solar",regionalCompact:"rail",digitalState:"cyberCenter",foodSecurity:"housing"})[id];
        if(facility)createDecisionFacility(state,country(state),facility);
        country(state).economy.growth=clamp(country(state).economy.growth+.08,-12,15);
      }
      return result;
    }
    const c=country(state),last=c.nationalDecisions?.[id];
    if(last&&Math.floor((Date.parse(`${state.date}T12:00:00Z`)-Date.parse(`${last}T12:00:00Z`))/86400000)<def.cooldown)return{ok:false,message:"La decisión sigue en periodo de espera."};
    if(c.economy.treasury<def.treasury)return{ok:false,message:`Tesorería insuficiente: requiere ${def.treasury} mil M€.`};
    if(c.politics.politicalCapital<def.political)return{ok:false,message:`Capital político insuficiente: requiere ${def.political}.`};
    c.economy.treasury=round(c.economy.treasury-def.treasury,2);c.politics.politicalCapital=round(c.politics.politicalCapital-def.political,1);
    c.nationalDecisions||={};c.nationalDecisions[id]=state.date;
    if(def.facility)createDecisionFacility(state,c,def.facility);
    if(id==="debtReductionPlan"){c.economy.debtRatio=clamp(c.economy.debtRatio-2.2,0,300);c.economy.interestRate=clamp((c.economy.interestRate||3)-.25,.2,25)}
    if(id==="hospitalNetwork"){c.systems.stability=clamp(c.systems.stability+1.4,0,100);c.systems.approval=clamp(c.systems.approval+1.2,0,100)}
    if(id==="logisticsCorridors"){c.systems.logistics=clamp(c.systems.logistics+2.4,0,100);c.economy.exports=round((c.economy.exports||0)+2,2)}
    if(id==="strategicHousing"){c.economy.housingPressure=clamp((c.economy.housingPressure||20)-6,0,100);c.systems.approval=clamp(c.systems.approval+1,0,100)}
    if(id==="innovationClusters"){c.researchPoints=round((c.researchPoints||0)+45,1);c.systems.technology=clamp(c.systems.technology+2,0,100)}
    if(id==="energySecurity"){c.systems.energy=clamp(c.systems.energy+2.5,0,100);c.systems.renewables=clamp(c.systems.renewables+1,0,100)}
    if(id==="industrialReshoring"){c.systems.industry=clamp(c.systems.industry+2.5,0,100);c.economy.unemployment=clamp(c.economy.unemployment-.45,1,40)}
    c.economy.growth=clamp(c.economy.growth+.16,-12,15);c.economy.confidence=clamp(c.economy.confidence+1.2,0,100);
    E.pushEvent(state,"decision",def.name,`${c.name} ejecuta la medida y crea capacidad física asociada.`);
    return{ok:true,message:`Decisión aprobada: ${def.name}.`};
  }

  function annexCountry(state,warId) {
    const result=oldAnnexCountry(state,warId);
    if(!result?.ok)return result;
    const c=country(state);
    applyRealRegionNames(state);ensureInternalTrade(state,c);markAnnexedReconstruction(state,c);cleanSettlements(state);
    const last=c.annexedCountries?.at(-1);
    if(last)E.enqueueDecision?.(state,{category:"reconstruction",priority:"high",dedupeKey:`rebuild-${last.countryId}-${state.date}`,title:`Reconstrucción de ${last.name}`,text:"El nuevo territorio necesita recuperar infraestructuras, energía e industria para integrarse en el tejido productivo.",sourceCountryId:last.countryId,regionIds:last.regions,options:[{id:"rebuildAll",label:"Reconstrucción integral",description:"Recupera todas las regiones y su producción."},{id:"rebuildIndustry",label:"Priorizar industria",description:"Reabre instalaciones productivas primero."},{id:"rebuildInfrastructure",label:"Priorizar infraestructuras",description:"Restaura logística y servicios esenciales."}]});
    return{...result,message:`${result.message} Se ha activado el mercado interior al 100% y el plan de reconstrucción territorial.`};
  }

  function resolveDecision(state,decisionId,choiceId) {
    const d=(state.decisions||[]).find(x=>x.id===decisionId&&x.status==="pending");
    if(d?.category==="reconstruction"){
      const c=country(state),scope=choiceId==="rebuildIndustry"?"industry":choiceId==="rebuildInfrastructure"?"infrastructure":"all";
      let started=0;
      for(const id of d.regionIds||[])if(reconstructRegion(state,id,scope).ok)started++;
      d.status="resolved";d.resolvedDate=state.date;d.choiceId=choiceId;state.decisionHistory||=[];state.decisionHistory.unshift(d);
      return started?{ok:true,message:`Reconstrucción aprobada en ${started} regiones.`}:{ok:false,message:"No se pudo financiar ninguna obra."};
    }
    return E.resolveDecisionV17 ? E.resolveDecisionV17(state,decisionId,choiceId) : {ok:false,message:"Decisión no disponible."};
  }

  function ensureV18(state) {
    state.version="1.8-alpha";
    state.aiDirector||={};state.aiDirector.model="UCDP-ACLED realistic baseline";
    for(const c of state.countries){
      c.sovereign??=true;c.nationalDecisions||={};c.internalTradeNetworks||=[];
      c.researchMonthlyRate=calculateResearchRate(state,c);
      c.economy.interestRate??=round(clamp(1.5+(c.economy.debtRatio||50)*.025,.5,12),2);
      ensureInternalTrade(state,c);
    }
    const selected=state.countries.find(c=>c.id===state.selectedCountryId);if(selected?.annexedBy)state.selectedCountryId=selected.annexedBy;
    const controlled=state.countries.find(c=>c.id===state.controlledCountryId);if(controlled?.annexedBy)state.controlledCountryId=controlled.annexedBy;
    applyRealRegionNames(state);decorateTradeRoutes(state);cleanSettlements(state);
    return state;
  }

  function createInitialState(){
    const state=ensureV18(oldCreate());
    E.pushEvent(state,"system","NEXUS Global Alpha v1.8","I+D proporcional, anexión consolidada, reconstrucción, IA realista, economía regional dinámica y logística terrestre activadas.");
    return state;
  }

  function hydrateV18(state){return ensureV18(oldHydrate(state))}

  function tickDay(state){
    ensureV18(state);
    for(const c of state.countries.filter(x=>x.sovereign!==false&&x.id!==state.controlledCountryId)){c.ai||={};c.ai.geopoliticalCooldown=Math.max(c.ai.geopoliticalCooldown||0,14)}
    const electionSnapshots=new Map(state.countries.map(c=>[c.id,{date:c.politics?.lastElectionDate,seats:new Map((c.politics?.parties||[]).map(p=>[p.id,p.seats||0]))}]));
    const rpBefore=new Map(state.countries.map(c=>[c.id,Number(c.researchPoints)||0]));
    const summary=oldTick(state);
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      processReconstruction(state,c);
      if(summary?.crossedMonth){
        const desired=calculateResearchRate(state,c);
        c.researchPoints=round((rpBefore.get(c.id)||0)+desired,1);
        c.researchMonthlyRate=desired;c.lastResearchGain=desired;
        applyBudgetEffects(state,c);updateRegionalEconomy(state,c);processInternalTrade(c);
      }else c.researchMonthlyRate=calculateResearchRate(state,c);
      const snap=electionSnapshots.get(c.id);
      if(snap&&c.politics?.lastElectionDate&&c.politics.lastElectionDate!==snap.date)applyElectionCapital(c,snap.seats);
    }
    if((state.dayIndex||0)%7===0)runRealisticAI(state);
    decorateTradeRoutes(state);cleanSettlements(state);state.version="1.8-alpha";
    return summary;
  }

  const resolveDecisionV17=E.resolveDecision;
  E.resolveDecisionV17=resolveDecisionV17;
  Object.assign(E,{
    createInitialState,hydrateState:hydrateV18,tickDay,annexCountry,runAutonomousAI:runRealisticAI,
    calculateResearchRate,upgradeCost,reconstructRegion,reconstructCountry,payDownDebt,
    runElection,callElection,enactNationalDecision,resolveDecision,
    nationalDecisionDefinitions:[...(E.nationalDecisionDefinitions||[]),...EXTRA_DECISIONS],
    technologyUnlocks:TECH_UNLOCKS,importantEventTypes:new Set(["system","military","battle","politics","decision","objective","region","intel","intelligence"]),
    version18:true
  });

  E.upgradeBuilding=function(state,regionId,facilityId){
    const before=country(state).economy.treasury,result=oldUpgradeBuilding(state,regionId,facilityId);
    if(result?.ok){
      const c=country(state),r=E.getRegion(state,c.id,regionId),f=facilityList(state,c,r).find(x=>x.id===facilityId),spent=round(before-c.economy.treasury,2);
      updateRegionalEconomy(state,c);result.message+=` Coste: ${spent} mil M€. Empleo, población y PIB regional actualizados.`;
      if(f)f.lastUpgradeCost=spent;
    }
    return result;
  };

  E.signPeace=function(state,warId){const result=oldSignPeace(state,warId);if(result?.ok)cleanSettlements(state);return result};
})();
