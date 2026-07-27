"use strict";

window.NEXUS_ECONOMY = (() => {
  const deepClone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, decimals = 2) => Number(value.toFixed(decimals));

  function createInitialState() {
    const countries = deepClone(NEXUS_DATA.countries).map(country => ({
      ...country,
      history: {
        gdp: [country.economy.gdp],
        inflation: [country.economy.inflation],
        unemployment: [country.economy.unemployment],
        treasury: [country.economy.treasury]
      },
      relations: {},
      sanctions: [],
      treaties: [],
      projects: [],
      units: [],
      productionQueue: [],
      regionInvestments: {}
    }));

    const state = {
      version: "1.0.1-alpha",
      date: "2028-01-01",
      monthIndex: 0,
      running: false,
      speed: 1,
      selectedCountryId: "ESP",
      selectedRegionId: "MAD",
      activePanel: "overview",
      mapMode: "world",
      countries,
      regions: deepClone(NEXUS_DATA.spainRegions),
      unitCatalog: deepClone(NEXUS_DATA.unitCatalog),
      companies: deepClone(NEXUS_DATA.companies).map(company => ({
        ...company,
        history: [company.price],
        ownership: { state: company.countryId === "ESP" ? 12 : 0, player: 0 }
      })),
      nationalProjects: deepClone(NEXUS_DATA.nationalProjects),
      events: [
        { id: crypto.randomUUID(), date: "2028-01-01", type: "system", title: "NEXUS Alpha v1.0", text: "La campaña ha comenzado. España parte reforzada como potencia industrial europea." }
      ],
      notifications: [],
      settings: { autosave: true, reducedMotion: false },
      lastTickSummary: null
    };

    initializeRelations(state);
    seedSpanishUnits(state);
    return state;
  }

  function initializeRelations(state) {
    for (const country of state.countries) {
      for (const other of state.countries) {
        if (country.id === other.id) continue;
        let relation = 50;
        const eu = ["ESP", "FRA", "DEU", "ITA", "PRT"];
        if (eu.includes(country.id) && eu.includes(other.id)) relation += 22;
        if ((country.id === "ESP" && other.id === "PRT") || (country.id === "PRT" && other.id === "ESP")) relation = 90;
        if ((country.id === "ESP" && other.id === "MAR") || (country.id === "MAR" && other.id === "ESP")) relation = 46;
        if ((country.id === "USA" && other.id === "CHN") || (country.id === "CHN" && other.id === "USA")) relation = 26;
        country.relations[other.id] = relation;
      }
    }
  }

  function seedSpanishUnits(state) {
    const seed = [
      ["infantry", "MAD", 2],
      ["mechanized", "CYL", 2],
      ["armor", "ARA", 1],
      ["artillery", "AND", 1],
      ["fighter", "MAD", 1],
      ["drone", "PVA", 1],
      ["frigate", "GAL", 1],
      ["submarine", "MUR", 1],
      ["satellite", "CAN", 1]
    ];

    for (const [typeId, regionId, quantity] of seed) {
      for (let i = 0; i < quantity; i++) {
        const def = state.unitCatalog.find(unit => unit.id === typeId);
        state.countries.find(c => c.id === "ESP").units.push({
          id: crypto.randomUUID(),
          typeId,
          regionId,
          name: `${def.name} ${i + 1}`,
          readiness: 82 + Math.random() * 12,
          experience: 58 + Math.random() * 20,
          strength: 100
        });
      }
    }
  }

  function getCountry(state, id = state.selectedCountryId) {
    return state.countries.find(country => country.id === id) || state.countries[0];
  }

  function getRegion(state, id = state.selectedRegionId) {
    return state.regions.find(region => region.id === id) || state.regions[0];
  }

  function calculateBudget(country) {
    const e = country.economy;
    const b = country.budgets;
    const annualRevenue = e.gdp * (e.taxRate / 100) + e.gdp * 0.018 + Math.max(0, e.growth) * 1.8;
    const debtService = e.gdp * (e.debtRatio / 100) * (0.022 + e.inflation / 1000);
    const administration = e.gdp * 0.034;
    const annualSpending = e.gdp * ((b.health + b.education + b.defense + b.infrastructure + b.research + b.welfare) / 100) + debtService + administration;
    const annualBalance = annualRevenue - annualSpending;
    return {
      annualRevenue: round(annualRevenue),
      annualSpending: round(annualSpending),
      annualBalance: round(annualBalance),
      monthlyBalance: round(annualBalance / 12),
      debtService: round(debtService),
      administration: round(administration)
    };
  }

  function calculatePotentialGrowth(country) {
    const e = country.economy;
    const s = country.systems;
    const b = country.budgets;
    const productivity = (s.industry + s.technology + s.logistics) / 300;
    const policy = (b.infrastructure - 3) * 0.12 + (b.research - 2) * 0.16 + (b.education - 4.5) * 0.10;
    const stability = (s.stability - 65) * 0.018;
    const confidence = (e.confidence - 60) * 0.025;
    const inflationPenalty = Math.max(0, e.inflation - 2.5) * 0.22;
    const unemploymentPenalty = Math.max(0, e.unemployment - 6) * 0.07;
    const debtPenalty = Math.max(0, e.debtRatio - 90) * 0.018;
    const energyBonus = (s.energy - 70) * 0.012;
    return clamp(0.8 + productivity * 1.6 + policy + stability + confidence + energyBonus - inflationPenalty - unemploymentPenalty - debtPenalty, -4, 8);
  }

  function tickCountry(country, state) {
    const e = country.economy;
    const s = country.systems;
    const b = country.budgets;
    const budget = calculateBudget(country);
    const potentialGrowth = calculatePotentialGrowth(country);
    const growthMomentum = (potentialGrowth - e.growth) * 0.18;
    e.growth = round(clamp(e.growth + growthMomentum + (Math.random() - 0.5) * 0.16, -5, 9), 2);
    e.gdp = round(e.gdp * (1 + e.growth / 1200), 2);
    e.treasury = round(e.treasury + budget.monthlyBalance, 2);

    if (e.treasury < 0) {
      const financing = Math.abs(e.treasury);
      e.treasury = 0;
      e.debtRatio = round(e.debtRatio + financing / Math.max(e.gdp, 1) * 100, 2);
    } else if (budget.annualBalance > 0) {
      e.debtRatio = round(Math.max(5, e.debtRatio - budget.annualBalance / Math.max(e.gdp, 1) * 0.12), 2);
    }

    const inflationTarget = 2 + Math.max(0, e.growth - 3) * 0.18 + Math.max(0, b.welfare - 10) * 0.08 - Math.max(0, s.energy - 80) * 0.012;
    e.inflation = round(clamp(e.inflation + (inflationTarget - e.inflation) * 0.15 + (Math.random() - 0.5) * 0.12, -1, 18), 2);
    e.unemployment = round(clamp(e.unemployment - (e.growth - 1.5) * 0.08 + (Math.random() - 0.5) * 0.08, 2, 28), 2);
    e.confidence = round(clamp(e.confidence + (e.growth - 1.5) * 0.16 - Math.max(0, e.inflation - 3) * 0.12 + (budget.annualBalance >= 0 ? 0.08 : -0.06), 20, 100), 1);

    s.approval = round(clamp(s.approval + (e.growth - 1.8) * 0.15 - (e.inflation - 2.5) * 0.28 - (e.unemployment - 6) * 0.14 + (b.health - 6) * 0.08 + (b.education - 5) * 0.06, 10, 95), 1);
    s.stability = round(clamp(s.stability + (s.approval - 55) * 0.015 + (e.confidence - 60) * 0.008 - Math.max(0, e.debtRatio - 110) * 0.01, 20, 98), 1);

    s.technology = round(clamp(s.technology + Math.max(0, b.research - 2.2) * 0.025, 20, 100), 2);
    s.logistics = round(clamp(s.logistics + Math.max(0, b.infrastructure - 3) * 0.018, 20, 100), 2);
    s.military = round(clamp(s.military + Math.max(0, b.defense - 1.8) * 0.012, 20, 100), 2);
    s.energy = round(clamp(s.energy + Math.max(0, b.infrastructure - 3.5) * 0.008, 20, 100), 2);

    processCountryQueues(country, state);
    recordHistory(country);
    return { countryId: country.id, budget, growth: e.growth };
  }

  function processCountryQueues(country, state) {
    /*
      Solo los proyectos heredados basados en meses deben procesarse aquí.
      Las colas unitV2/facilityV2/facilityV3 usan días y son procesadas por
      deep-systems/alpha-v14. El código anterior restaba 1 a `undefined`,
      generaba NaN y eliminaba esas órdenes al cerrar cada mes.
    */
    const monthlyKinds = new Set(["unit", "project", "building"]);
    for (const item of country.productionQueue) {
      if (!monthlyKinds.has(item.kind)) continue;
      item.monthsRemaining = Math.max(0, Number(item.monthsRemaining ?? item.totalMonths ?? 1) - 1);
    }
    const completed = country.productionQueue.filter(item => monthlyKinds.has(item.kind) && item.monthsRemaining <= 0);
    country.productionQueue = country.productionQueue.filter(item => !monthlyKinds.has(item.kind) || item.monthsRemaining > 0);

    for (const item of completed) {
      if (item.kind === "unit") {
        const def = state.unitCatalog.find(unit => unit.id === item.typeId);
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const existing = country.units.find(unit => unit.typeId === item.typeId && unit.regionId === item.regionId && !unit.movement);
        if (existing) {
          existing.quantity = (Number(existing.quantity) || 0) + quantity;
          existing.readiness = Math.max(existing.readiness || 0, 72);
          existing.strength = Math.max(existing.strength || 0, 100);
        } else {
          country.units.push({
            id: crypto.randomUUID(),
            typeId: item.typeId,
            regionId: item.regionId,
            name: item.name,
            quantity,
            readiness: 72,
            experience: 25,
            strength: 100,
            status: "desplegada"
          });
        }
        const region = state.regions.find(r => r.id === item.regionId);
        pushEvent(state, "military", `${def?.name || item.name} completada`, `${quantity.toLocaleString("es-ES")} ${def?.unitName || "unidades"} desplegadas en ${region?.name || "el territorio asignado"}.`);
      }
      if (item.kind === "project") completeNationalProject(country, item, state);
      if (item.kind === "building") {
        const region = state.regions.find(r => r.id === item.regionId);
        const def = window.NEXUS_CATALOG?.buildings?.find(b => b.id === item.buildingId);
        if (region && def) {
          region.buildings ||= [];
          region.buildings.push({ id: crypto.randomUUID(), typeId: def.id, level: 1, condition: 100, regionId: region.id, countryId: country.id });
          pushEvent(state, "region", `${def.name} completada`, `${region.name} incorpora una nueva instalación.`);
        }
      }
    }
  }

  function completeNationalProject(country, item, state) {
    const project = state.nationalProjects.find(p => p.id === item.projectId);
    if (!project) return;
    for (const [key, value] of Object.entries(project.effect)) {
      if (key === "growth") country.economy.growth = round(country.economy.growth + value, 2);
      else if (key in country.systems) country.systems[key] = clamp(country.systems[key] + value, 0, 100);
    }
    pushEvent(state, "project", `${project.name} finalizado`, "El proyecto nacional ya está generando efectos estructurales." );
  }

  function recordHistory(country) {
    const h = country.history;
    h.gdp.push(country.economy.gdp);
    h.inflation.push(country.economy.inflation);
    h.unemployment.push(country.economy.unemployment);
    h.treasury.push(country.economy.treasury);
    for (const values of Object.values(h)) {
      if (values.length > 36) values.shift();
    }
  }

  function tickCompanies(state) {
    for (const company of state.companies) {
      const country = getCountry(state, company.countryId);
      const sectorBonus = company.sector.includes("Defensa") ? country.budgets.defense * 0.002 : 0;
      const random = (Math.random() - 0.5) * 0.035;
      const monthlyReturn = country.economy.growth / 1200 + (country.economy.confidence - 60) / 6000 + sectorBonus + random;
      company.price = round(Math.max(1, company.price * (1 + monthlyReturn * company.growthBias)), 2);
      company.marketCap = round(company.price * company.shares / 1000, 2);
      company.history.push(company.price);
      if (company.history.length > 30) company.history.shift();
    }
  }

  function tickMonth(state) {
    state.monthIndex += 1;
    const date = new Date(`${state.date}T00:00:00`);
    date.setMonth(date.getMonth() + 1);
    state.date = date.toISOString().slice(0, 10);

    const summaries = state.countries.map(country => tickCountry(country, state));
    tickCompanies(state);
    processDiplomaticDrift(state);
    maybeGenerateEvent(state);

    const selectedSummary = summaries.find(s => s.countryId === state.selectedCountryId);
    state.lastTickSummary = selectedSummary;
    return selectedSummary;
  }

  function processDiplomaticDrift(state) {
    for (const country of state.countries) {
      for (const [otherId, value] of Object.entries(country.relations)) {
        const mean = 50;
        country.relations[otherId] = round(clamp(value + (mean - value) * 0.004, 0, 100), 1);
      }
    }
  }

  function maybeGenerateEvent(state) {
    if (Math.random() > 0.28) return;
    const country = getCountry(state);
    const events = [
      {
        type: "economy",
        title: "Nuevo contrato industrial",
        text: "Un consorcio europeo adjudica producción avanzada a plantas españolas.",
        apply: () => { country.economy.treasury += 3.2; country.systems.industry = clamp(country.systems.industry + 0.7, 0, 100); }
      },
      {
        type: "energy",
        title: "Récord renovable",
        text: "La red absorbe una cuota histórica de generación renovable.",
        apply: () => { country.systems.energy = clamp(country.systems.energy + 0.8, 0, 100); country.systems.renewables = clamp(country.systems.renewables + 0.5, 0, 100); }
      },
      {
        type: "social",
        title: "Tensión por vivienda",
        text: "El coste residencial presiona la aprobación del gobierno.",
        apply: () => { country.systems.approval = clamp(country.systems.approval - 1.4, 0, 100); }
      },
      {
        type: "diplomacy",
        title: "Iniciativa ibérica",
        text: "España y Portugal acuerdan reforzar energía y ferrocarril.",
        apply: () => { country.relations.PRT = clamp(country.relations.PRT + 3, 0, 100); country.systems.logistics = clamp(country.systems.logistics + 0.4, 0, 100); }
      }
    ];
    const chosen = events[Math.floor(Math.random() * events.length)];
    chosen.apply();
    pushEvent(state, chosen.type, chosen.title, chosen.text);
  }

  function pushEvent(state, type, title, text) {
    state.events.unshift({ id: crypto.randomUUID(), date: state.date, type, title, text });
    state.events = state.events.slice(0, 80);
  }

  function updateBudget(state, key, value) {
    const country = getCountry(state);
    if (!(key in country.budgets)) return;
    country.budgets[key] = round(clamp(Number(value), 0.5, 15), 1);
  }

  function updateTaxRate(state, value) {
    getCountry(state).economy.taxRate = round(clamp(Number(value), 10, 52), 1);
  }

  function investRegion(state, regionId, type) {
    const country = getCountry(state);
    const region = getRegion(state, regionId);
    const costs = { infrastructure: 8, industry: 10, energy: 9, stability: 5 };
    const gains = { infrastructure: 4, industry: 4, energy: 5, stability: 3 };
    const cost = costs[type];
    if (!cost || country.economy.treasury < cost) return { ok: false, message: "Tesorería insuficiente." };
    country.economy.treasury = round(country.economy.treasury - cost, 2);
    const key = type === "infrastructure" ? "infra" : type;
    region[key] = clamp(region[key] + gains[type], 0, 100);
    if (type === "industry") region.gdp = round(region.gdp * 1.015, 2);
    country.regionInvestments[regionId] = (country.regionInvestments[regionId] || 0) + cost;
    pushEvent(state, "region", `Inversión en ${region.name}`, `Se han destinado ${cost} mil M€ a ${type}.`);
    return { ok: true, message: "Inversión regional aprobada." };
  }

  function queueUnit(state, typeId, regionId) {
    const country = getCountry(state);
    const def = state.unitCatalog.find(unit => unit.id === typeId);
    if (!def) return { ok: false, message: "Unidad desconocida." };
    if (country.economy.treasury < def.cost) return { ok: false, message: "Tesorería insuficiente." };
    country.economy.treasury = round(country.economy.treasury - def.cost, 2);
    const serial = country.productionQueue.filter(item => item.typeId === typeId).length + country.units.filter(unit => unit.typeId === typeId).length + 1;
    country.productionQueue.push({
      id: crypto.randomUUID(), kind: "unit", typeId, regionId,
      name: `${def.name} ${serial}`, monthsRemaining: def.months, totalMonths: def.months
    });
    pushEvent(state, "military", "Producción militar iniciada", `${def.name} entrará en servicio en ${def.months} meses.`);
    return { ok: true, message: "Producción añadida a la cola." };
  }

  function startProject(state, projectId) {
    const country = getCountry(state);
    const project = state.nationalProjects.find(p => p.id === projectId);
    if (!project) return { ok: false, message: "Proyecto no encontrado." };
    if (country.projects.includes(projectId) || country.productionQueue.some(item => item.projectId === projectId)) return { ok: false, message: "Proyecto ya iniciado." };
    if (country.economy.treasury < project.cost) return { ok: false, message: "Tesorería insuficiente." };
    country.economy.treasury = round(country.economy.treasury - project.cost, 2);
    country.productionQueue.push({ id: crypto.randomUUID(), kind: "project", projectId, name: project.name, monthsRemaining: project.months, totalMonths: project.months });
    country.projects.push(projectId);
    pushEvent(state, "project", "Proyecto nacional aprobado", project.name);
    return { ok: true, message: "Proyecto iniciado." };
  }

  function buyShares(state, companyId, amountPct) {
    const country = getCountry(state);
    const company = state.companies.find(c => c.id === companyId);
    if (!company) return { ok: false, message: "Empresa no encontrada." };
    const pct = clamp(Number(amountPct), 1, 15);
    const available = 100 - company.ownership.player - company.ownership.state;
    const actualPct = Math.min(pct, available);
    const cost = company.marketCap * actualPct / 100 * 1.04;
    if (actualPct <= 0) return { ok: false, message: "No quedan acciones disponibles." };
    if (country.economy.treasury < cost) return { ok: false, message: "Tesorería insuficiente." };
    country.economy.treasury = round(country.economy.treasury - cost, 2);
    company.ownership.player = round(company.ownership.player + actualPct, 1);
    pushEvent(state, "market", `Compra de ${company.name}`, `El Estado adquiere el ${actualPct}% por ${cost.toFixed(1)} mil M€.`);
    return { ok: true, message: company.ownership.player >= 51 ? "Control empresarial adquirido." : "Participación comprada." };
  }

  function launchTakeover(state, companyId) {
    const country = getCountry(state);
    const company = state.companies.find(c => c.id === companyId);
    if (!company) return { ok: false, message: "Empresa no encontrada." };
    const needed = Math.max(0, 51 - company.ownership.player);
    if (needed <= 0) return { ok: false, message: "Ya controlas la empresa." };
    const cost = company.marketCap * needed / 100 * 1.28;
    if (country.economy.treasury < cost) return { ok: false, message: "Fondos insuficientes para la OPA." };
    const targetCountry = getCountry(state, company.countryId);
    const relation = country.relations[targetCountry.id] ?? 50;
    const chance = clamp(0.48 + (country.economy.confidence - 60) / 100 + relation / 400 - (company.sector.includes("Defensa") ? 0.20 : 0), 0.12, 0.88);
    country.economy.treasury = round(country.economy.treasury - cost, 2);
    if (Math.random() <= chance) {
      company.ownership.player = 51;
      country.relations[targetCountry.id] = clamp(relation - 8, 0, 100);
      pushEvent(state, "market", `OPA exitosa sobre ${company.name}`, `España adquiere el control por ${cost.toFixed(1)} mil M€.`);
      return { ok: true, message: "OPA completada con éxito." };
    }
    company.price = round(company.price * 1.09, 2);
    company.marketCap = round(company.price * company.shares / 1000, 2);
    country.relations[targetCountry.id] = clamp(relation - 4, 0, 100);
    pushEvent(state, "market", `OPA fallida sobre ${company.name}`, "La dirección de la empresa rechazó la operación." );
    return { ok: false, message: "La OPA ha fracasado." };
  }

  function diplomacyAction(state, targetId, action) {
    const country = getCountry(state);
    const target = getCountry(state, targetId);
    if (!target || target.id === country.id) return { ok: false, message: "Objetivo inválido." };
    const relation = country.relations[targetId] ?? 50;
    if (action === "trade") {
      if (country.economy.treasury < 1.5) return { ok: false, message: "Tesorería insuficiente." };
      country.economy.treasury -= 1.5;
      country.relations[targetId] = clamp(relation + 7, 0, 100);
      country.economy.growth = round(country.economy.growth + 0.08, 2);
      pushEvent(state, "diplomacy", `Acuerdo comercial con ${target.name}`, "Se reducen barreras y se abren corredores de inversión." );
      return { ok: true, message: "Acuerdo firmado." };
    }
    if (action === "aid") {
      if (country.economy.treasury < 3) return { ok: false, message: "Tesorería insuficiente." };
      country.economy.treasury -= 3;
      country.relations[targetId] = clamp(relation + 10, 0, 100);
      pushEvent(state, "diplomacy", `Ayuda a ${target.name}`, "España refuerza su influencia diplomática." );
      return { ok: true, message: "Ayuda enviada." };
    }
    if (action === "sanction") {
      country.relations[targetId] = clamp(relation - 15, 0, 100);
      target.economy.confidence = clamp(target.economy.confidence - 2, 0, 100);
      pushEvent(state, "diplomacy", `Sanciones a ${target.name}`, "Se aplican restricciones financieras y tecnológicas." );
      return { ok: true, message: "Sanciones aplicadas." };
    }
    if (action === "intel") {
      if (country.economy.treasury < 2.2) return { ok: false, message: "Tesorería insuficiente." };
      country.economy.treasury -= 2.2;
      const success = Math.random() < clamp(country.systems.intelligence / 120 + relation / 300, 0.25, 0.85);
      if (success) {
        pushEvent(state, "intel", `Inteligencia sobre ${target.name}`, `PIB ${target.economy.gdp.toFixed(0)} mil M€, poder militar ${target.systems.military.toFixed(0)}.` );
        return { ok: true, message: "Operación de inteligencia exitosa." };
      }
      country.relations[targetId] = clamp(relation - 5, 0, 100);
      return { ok: false, message: "La operación fue detectada." };
    }
    return { ok: false, message: "Acción no disponible." };
  }

  return {
    createInitialState,
    getCountry,
    getRegion,
    calculateBudget,
    calculatePotentialGrowth,
    tickMonth,
    updateBudget,
    updateTaxRate,
    investRegion,
    queueUnit,
    startProject,
    buyShares,
    launchTakeover,
    diplomacyAction,
    pushEvent,
    clamp,
    round
  };
})();
