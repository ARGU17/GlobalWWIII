"use strict";

/* NEXUS Global Alpha v1.6
   Continuidad temporal indefinida, sala de guerra operativa,
   enfrentamientos unidad-a-unidad, decisiones de empresas controladas,
   decisiones nacionales y controles presupuestarios incrementales.
*/
(() => {
  const E = window.NEXUS_ECONOMY;
  const C = window.NEXUS_CATALOG;
  if (!E || !C) throw new Error("alpha-v16.js requiere NEXUS_ECONOMY y NEXUS_CATALOG.");

  const oldCreate = E.createInitialState;
  const oldHydrate = E.hydrateState;
  const oldTickDay = E.tickDay;
  const oldWarAction = E.warAction;
  const oldUpdateBudget = E.updateBudget;
  const oldAttackRegion = E.attackRegion;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  const round = (v, d = 2) => Number((Number(v) || 0).toFixed(d));
  const uid = () => crypto.randomUUID?.() || `nexus-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const DAY_MS = 86400000;
  const LAND_TYPES = new Set(["infantry", "mechanized", "armor", "artillery", "airDefense", "rocketArtillery"]);
  const AIR_TYPES = new Set(["fighter", "drone", "bomber", "transport"]);
  const NAVAL_TYPES = new Set(["frigate", "destroyer", "submarine", "carrier"]);
  const STRATEGIC_TYPES = new Set(["satellite", "missile", "cyber"]);

  const COMPANY_POLICIES = [
    {id:"reinvest", name:"Reinversión empresarial", icon:"🏭", description:"Retiene el beneficio para ampliar capacidad, ingresos y productividad."},
    {id:"dividend", name:"Dividendo al Tesoro", icon:"💶", description:"Transfiere la mayor parte del beneficio atribuible al presupuesto nacional."},
    {id:"research", name:"I+D soberana", icon:"🔬", description:"Convierte beneficio en investigación, patentes y tecnología nacional."},
    {id:"employment", name:"Empleo y expansión", icon:"👥", description:"Prioriza nuevas plantas, contrataciones y reducción del desempleo."},
    {id:"strategic", name:"Reserva estratégica", icon:"🛡️", description:"Refuerza capacidades nacionales asociadas al sector de la empresa."}
  ];

  const NATIONAL_DECISIONS = [
    {id:"housingPlan", icon:"🏘️", name:"Plan Nacional de Vivienda", treasury:8, political:12, cooldown:180, description:"Construcción asequible, suelo público y reducción de la presión residencial."},
    {id:"industrialPact", icon:"🏭", name:"Pacto Industrial 2035", treasury:12, political:14, cooldown:210, description:"Crédito productivo, automatización y cadenas de suministro nacionales."},
    {id:"sovereignFund", icon:"🏦", name:"Fondo Soberano Nacional", treasury:10, political:18, cooldown:365, description:"Capitaliza reservas y centraliza participaciones estratégicas."},
    {id:"laborReform", icon:"🧰", name:"Reforma del Mercado Laboral", treasury:4, political:22, cooldown:270, description:"Reduce desempleo estructural y mejora movilidad entre sectores."},
    {id:"healthCompact", icon:"🏥", name:"Pacto Sanitario", treasury:6, political:10, cooldown:150, description:"Capacidad hospitalaria, prevención y resiliencia farmacéutica."},
    {id:"educationProgram", icon:"🎓", name:"Programa Educativo y Científico", treasury:7, political:12, cooldown:180, description:"Educación técnica, universidades y atracción de talento."},
    {id:"defenseAct", icon:"🛡️", name:"Ley de Preparación Nacional", treasury:9, political:14, cooldown:210, description:"Munición, reservas, logística y disponibilidad militar."},
    {id:"greenTransition", icon:"🌱", name:"Transición Energética Acelerada", treasury:10, political:13, cooldown:240, description:"Red eléctrica, almacenamiento, renovables e independencia energética."},
    {id:"migrationCompact", icon:"🧭", name:"Pacto Migratorio y Demográfico", treasury:4, political:16, cooldown:180, description:"Migración laboral ordenada, integración y repoblación territorial."},
    {id:"regionalCompact", icon:"🗺️", name:"Pacto de Cohesión Territorial", treasury:5, political:20, cooldown:240, description:"Infraestructura regional, autonomía fiscal coordinada y estabilidad."},
    {id:"digitalState", icon:"🧠", name:"Estado Digital e IA Pública", treasury:8, political:15, cooldown:210, description:"Administración automatizada, identidad digital y servicios públicos predictivos."},
    {id:"foodSecurity", icon:"🌾", name:"Ley de Seguridad Alimentaria", treasury:6, political:11, cooldown:180, description:"Reservas, regadío eficiente, agroindustria y fertilizantes estratégicos."}
  ];

  function country(state, id = state.controlledCountryId) {
    return E.getCountry(state, id);
  }

  function regions(state, countryId) {
    return E.getCountryRegions?.(state, countryId) || [];
  }

  function validISO(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && Number.isFinite(Date.parse(`${value}T12:00:00Z`));
  }

  function nextDayISO(value) {
    const base = validISO(value) ? new Date(`${value}T12:00:00Z`) : new Date("2028-01-01T12:00:00Z");
    base.setUTCDate(base.getUTCDate() + 1);
    return base.toISOString().slice(0, 10);
  }

  function ensureTimeline(state) {
    state.timeline ||= {};
    state.timeline.mode = "indefinite";
    state.timeline.indefinite = true;
    state.timeline.startDate ||= "2028-01-01";
    state.timeline.lastValidDate = validISO(state.date) ? state.date : (state.timeline.lastValidDate || "2028-01-01");
    state.timeline.recoveries = Math.max(0, Number(state.timeline.recoveries) || 0);
    delete state.endDate;
    delete state.campaignEndDate;
    delete state.maxDate;
    if (state.simulation) {
      delete state.simulation.endDate;
      delete state.simulation.maxDate;
      state.simulation.indefinite = true;
    }
  }

  function ensureCompanyGovernance(state) {
    for (const company of state.companies || []) {
      company.controlPolicies ||= {};
      company.retainedEarnings = Number(company.retainedEarnings) || 0;
      company.lastDistribution ||= {};
      company.financials ||= {revenue:0, profit:0, margin:0, dividend:0};
      company.employees = Math.max(0, Math.floor(Number(company.employees) || 0));
      for (const [countryId, held] of Object.entries(company.ownershipByCountry || {})) {
        if (Number(held) >= 51 && !company.controlPolicies[countryId]) company.controlPolicies[countryId] = "reinvest";
      }
    }
  }

  function ensureNationalDecisions(state) {
    for (const c of state.countries || []) {
      c.nationalDecisions ||= {};
      c.corporateIncome ||= {lastMonth:0, total:0};
      c.politics ||= {};
      c.politics.politicalCapital = clamp(c.politics.politicalCapital ?? 50, 0, 100);
    }
  }

  function ensureWarDetail(state, war) {
    if (!war) return null;
    const attacker = country(state, war.attacker);
    const defender = country(state, war.defender);
    war.id ||= uid();
    war.operations ||= [];
    war.battles ||= [];
    war.theaters ||= [];
    war.phase ||= war.ended ? "Finalizada" : "Movilización";
    war.intensity = clamp(war.intensity ?? 35, 0, 100);
    war.logistics ||= {attacker:attacker?.systems?.logistics || 50, defender:defender?.systems?.logistics || 50};
    war.airSuperiority ||= {attacker:50, defender:50};
    war.navalControl ||= {attacker:50, defender:50};
    war.frontReadiness ||= {attacker:attacker?.militaryReadiness || 50, defender:defender?.militaryReadiness || 50};
    if (!war.theaters.length && attacker && defender) {
      const targetRegions = regions(state, defender.id).slice(0, 4);
      war.theaters = targetRegions.map((r, index) => ({
        id:`${war.id}-theater-${index}`,
        name:index===0?`Frente principal de ${r.name}`:`Eje secundario de ${r.name}`,
        regionId:r.id,
        targetCountryId:defender.id,
        control:0,
        intensity:clamp(42-index*7,15,75),
        status:"Preparación"
      }));
    }
    return war;
  }

  function ensureV16State(state) {
    ensureTimeline(state);
    state.unitEngagements ||= [];
    state.warRoom ||= {lastOpenedWarId:null};
    ensureCompanyGovernance(state);
    ensureNationalDecisions(state);
    for (const war of state.wars || []) ensureWarDetail(state, war);
    state.version = "1.6-alpha";
    return state;
  }

  function hydrateV16(state) {
    state = oldHydrate(state);
    return ensureV16State(state);
  }

  function createInitialState() {
    const state = ensureV16State(oldCreate());
    E.pushEvent(state, "system", "NEXUS Global Alpha v1.6", "Cronología indefinida, sala de guerra, enfrentamientos entre unidades, gobierno corporativo y nuevas decisiones nacionales activados.");
    return state;
  }

  function updateBudget(state, key, value) {
    const c = country(state);
    if (!c?.budgets || !(key in c.budgets)) return {ok:false, message:"Partida presupuestaria desconocida."};
    const next = round(clamp(Number(value) || 0, 0.5, 20), 1);
    c.budgets[key] = next;
    return {ok:true, message:`${budgetName(key)} actualizado al ${next.toFixed(1)}% del PIB.`};
  }

  function adjustBudget(state, key, delta) {
    const c = country(state);
    if (!c?.budgets || !(key in c.budgets)) return {ok:false, message:"Partida presupuestaria desconocida."};
    return updateBudget(state, key, (Number(c.budgets[key]) || 0) + Number(delta || 0));
  }

  function budgetName(key) {
    return ({health:"Sanidad", education:"Educación", defense:"Defensa", infrastructure:"Infraestructura", research:"I+D", welfare:"Protección social"})[key] || key;
  }

  function setCompanyPolicy(state, companyId, policyId) {
    const c = country(state);
    const company = state.companies.find(x => x.id === companyId);
    if (!company) return {ok:false, message:"Empresa no encontrada."};
    const holding = Number(E.getHolding?.(state, companyId, c.id) || company.ownershipByCountry?.[c.id] || 0);
    if (holding < 51) return {ok:false, message:"El Estado necesita al menos el 51% para dirigir la política de beneficios."};
    if (!COMPANY_POLICIES.some(x => x.id === policyId)) return {ok:false, message:"Política corporativa desconocida."};
    company.controlPolicies ||= {};
    company.controlPolicies[c.id] = policyId;
    E.pushEvent(state, "market", `Nueva política en ${company.name}`, `${c.name} ordena aplicar ${COMPANY_POLICIES.find(x=>x.id===policyId).name.toLowerCase()} a los beneficios atribuibles.`);
    return {ok:true, message:`${company.name}: política cambiada a ${COMPANY_POLICIES.find(x=>x.id===policyId).name}.`};
  }

  function sectorBoost(company, c, amount) {
    const sector = String(company.sector || "").toLowerCase();
    if (/energ|petr|gas|min|eléct/.test(sector)) c.systems.energy = clamp(c.systems.energy + amount, 0, 100);
    else if (/defen|aero|naval/.test(sector)) c.systems.military = clamp(c.systems.military + amount, 0, 100);
    else if (/tecn|software|semiconductor|electr|telecom/.test(sector)) c.systems.technology = clamp(c.systems.technology + amount, 0, 100);
    else if (/log|ferroc|infra|transport/.test(sector)) c.systems.logistics = clamp(c.systems.logistics + amount, 0, 100);
    else c.systems.industry = clamp(c.systems.industry + amount, 0, 100);
  }

  function processControlledCompanyProfits(state) {
    for (const c of state.countries) c.corporateIncome.lastMonth = 0;
    for (const company of state.companies || []) {
      for (const [countryId, heldRaw] of Object.entries(company.ownershipByCountry || {})) {
        const held = Number(heldRaw) || 0;
        if (held < 51) continue;
        const controller = country(state, countryId);
        if (!controller) continue;
        const annualProfit = Math.max(0, Number(company.financials?.profit) || 0);
        const attributable = round(annualProfit / 12 * held / 100, 3);
        if (attributable <= 0) continue;
        const policy = company.controlPolicies?.[countryId] || "reinvest";
        let treasury = 0;
        if (policy === "dividend") {
          treasury = attributable * 0.78;
          company.retainedEarnings += attributable * 0.22;
          controller.systems.approval = clamp(controller.systems.approval + 0.04, 0, 100);
        } else if (policy === "research") {
          treasury = attributable * 0.12;
          company.retainedEarnings += attributable * 0.28;
          controller.researchPoints = round((controller.researchPoints || 0) + attributable * 5.5, 1);
          controller.systems.technology = clamp(controller.systems.technology + Math.min(.12, attributable * .006), 0, 100);
        } else if (policy === "employment") {
          treasury = attributable * 0.18;
          company.retainedEarnings += attributable * 0.55;
          const jobs = Math.max(15, Math.round(attributable * 1150));
          company.employees += jobs;
          controller.laborModel ||= {};
          controller.laborModel.pendingJobs = Math.round((controller.laborModel.pendingJobs || 0) + jobs);
          controller.economy.unemployment = clamp(controller.economy.unemployment - Math.min(.08, jobs / Math.max(1, controller.economy.population * 900000)), 1.5, 35);
        } else if (policy === "strategic") {
          treasury = attributable * 0.32;
          company.retainedEarnings += attributable * 0.43;
          sectorBoost(company, controller, Math.min(.11, attributable * .005));
          controller.economy.reserves = round((controller.economy.reserves || 0) + attributable * .12, 2);
        } else {
          treasury = attributable * 0.08;
          company.retainedEarnings += attributable * 0.92;
          company.growthBias = clamp((company.growthBias || 1) + Math.min(.004, attributable * .00018), .75, 1.45);
          company.financials.revenue = round((company.financials.revenue || 0) * (1 + Math.min(.0035, attributable * .00014)), 2);
          company.financials.profit = round((company.financials.profit || 0) * (1 + Math.min(.004, attributable * .00017)), 2);
        }
        controller.economy.treasury = round(controller.economy.treasury + treasury, 3);
        controller.corporateIncome.lastMonth = round(controller.corporateIncome.lastMonth + treasury, 3);
        controller.corporateIncome.total = round(controller.corporateIncome.total + treasury, 3);
        company.lastDistribution[countryId] = {date:state.date, policy, attributable, treasury:round(treasury,3)};
      }
    }
  }

  function enactNationalDecision(state, decisionId) {
    const c = country(state);
    const def = NATIONAL_DECISIONS.find(x => x.id === decisionId);
    if (!def) return {ok:false, message:"Decisión nacional desconocida."};
    const last = c.nationalDecisions?.[decisionId];
    if (last) {
      const elapsed = Math.floor((Date.parse(`${state.date}T12:00:00Z`) - Date.parse(`${last}T12:00:00Z`)) / DAY_MS);
      if (elapsed < def.cooldown) return {ok:false, message:`Esta decisión estará disponible en ${def.cooldown - elapsed} días.`};
    }
    if (c.economy.treasury < def.treasury) return {ok:false, message:`Tesorería insuficiente: requiere ${def.treasury} mil M€.`};
    if (c.politics.politicalCapital < def.political) return {ok:false, message:`Capital político insuficiente: requiere ${def.political}.`};
    c.economy.treasury = round(c.economy.treasury - def.treasury, 2);
    c.politics.politicalCapital = round(c.politics.politicalCapital - def.political, 2);
    c.nationalDecisions[decisionId] = state.date;
    applyNationalDecision(state, c, decisionId);
    E.pushEvent(state, "politics", def.name, `${c.name} aprueba la medida. Coste: ${def.treasury} mil M€ y ${def.political} puntos de capital político.`);
    return {ok:true, message:`Decisión aprobada: ${def.name}.`};
  }

  function applyNationalDecision(state, c, id) {
    if (id === "housingPlan") { c.economy.housingPressure = clamp((c.economy.housingPressure || 20) - 5, 0, 100); c.systems.approval = clamp(c.systems.approval + 1.7, 0, 100); c.budgets.infrastructure = clamp(c.budgets.infrastructure + .3, .5, 20); }
    if (id === "industrialPact") { c.systems.industry = clamp(c.systems.industry + 1.3, 0, 100); c.economy.confidence = clamp(c.economy.confidence + 1.8, 0, 100); c.economicModel.industrialUtilization = clamp((c.economicModel.industrialUtilization || 60) + 2.2, 0, 100); }
    if (id === "sovereignFund") { c.economy.reserves = round((c.economy.reserves || 0) + 8, 2); c.economy.confidence = clamp(c.economy.confidence + 1.2, 0, 100); }
    if (id === "laborReform") { c.economy.unemployment = clamp(c.economy.unemployment - .65, 1.5, 35); c.economy.productivity = clamp((c.economy.productivity || 70) + 1.1, 0, 150); c.systems.approval = clamp(c.systems.approval - .6, 0, 100); }
    if (id === "healthCompact") { c.budgets.health = clamp(c.budgets.health + .5, .5, 20); c.systems.stability = clamp(c.systems.stability + .8, 0, 100); c.systems.approval = clamp(c.systems.approval + .8, 0, 100); }
    if (id === "educationProgram") { c.budgets.education = clamp(c.budgets.education + .5, .5, 20); c.researchPoints = round((c.researchPoints || 0) + 25, 1); c.systems.technology = clamp(c.systems.technology + .7, 0, 100); }
    if (id === "defenseAct") { c.budgets.defense = clamp(c.budgets.defense + .45, .5, 20); c.militaryReadiness = clamp(c.militaryReadiness + 5, 0, 100); c.strategicStockpile.munitions = clamp(c.strategicStockpile.munitions + 8, 0, 100); }
    if (id === "greenTransition") { c.systems.energy = clamp(c.systems.energy + 1.2, 0, 100); c.systems.renewables = clamp(c.systems.renewables + 2.2, 0, 100); c.resourceInventory ||= {}; c.resourceInventory.electricity = round((c.resourceInventory.electricity || 0) + 4, 1); }
    if (id === "migrationCompact") { c.laborModel ||= {}; c.laborModel.netMigrationAnnual = round((c.laborModel.netMigrationAnnual || 0) + .18, 2); c.systems.stability = clamp(c.systems.stability + .3, 0, 100); }
    if (id === "regionalCompact") { c.systems.stability = clamp(c.systems.stability + 1.3, 0, 100); c.systems.logistics = clamp(c.systems.logistics + .7, 0, 100); for (const r of regions(state, c.id)) r.infra = clamp((r.infra || 50) + .5, 0, 100); }
    if (id === "digitalState") { c.systems.technology = clamp(c.systems.technology + 1, 0, 100); c.systems.intelligence = clamp(c.systems.intelligence + .8, 0, 100); c.economy.productivity = clamp((c.economy.productivity || 70) + .8, 0, 150); }
    if (id === "foodSecurity") { c.systems.food = clamp(c.systems.food + 1.6, 0, 100); c.resourceInventory ||= {}; c.resourceInventory.food = round((c.resourceInventory.food || 0) + 8, 1); }
  }

  function unitPower(state, unit) {
    const def = state.unitCatalog.find(x => x.id === unit.typeId);
    return Math.max(1, (def?.power || 25) * Math.sqrt(Math.max(1, unit.quantity || 0)) * (unit.readiness || 50) / 100 * (unit.strength || 100) / 100 * (.75 + (unit.experience || 20) / 180));
  }

  function compatibleTargets(attacker, defender) {
    if (!attacker || !defender) return false;
    if (STRATEGIC_TYPES.has(attacker.typeId)) return true;
    if (AIR_TYPES.has(attacker.typeId)) return !defender.typeId.includes("satellite");
    if (NAVAL_TYPES.has(attacker.typeId)) return NAVAL_TYPES.has(defender.typeId) || AIR_TYPES.has(defender.typeId);
    if (LAND_TYPES.has(attacker.typeId)) return LAND_TYPES.has(defender.typeId) || AIR_TYPES.has(defender.typeId);
    return true;
  }

  function activeWar(state, a, b) {
    return (state.wars || []).find(w => !w.ended && ((w.attacker === a && w.defender === b) || (w.attacker === b && w.defender === a)));
  }

  function distanceDays(a, b, speed = 450) {
    const lat = ((b.lat || 0) - (a.lat || 0)) * 111;
    const lng = ((b.lng || 0) - (a.lng || 0)) * 85;
    return Math.max(1, Math.ceil(Math.hypot(lat, lng) / speed));
  }

  function attackUnit(state, attackerUnitId, targetCountryId, defenderUnitId) {
    const attackerCountry = country(state);
    const defenderCountry = country(state, targetCountryId);
    const attacker = attackerCountry.units.find(x => x.id === attackerUnitId && x.quantity > 0);
    const defender = defenderCountry?.units?.find(x => x.id === defenderUnitId && x.quantity > 0);
    if (!attacker || !defender) return {ok:false, message:"No se encuentran ambas unidades operativas."};
    const war = activeWar(state, attackerCountry.id, defenderCountry.id);
    if (!war) return {ok:false, message:`Debes declarar la guerra a ${defenderCountry.name} antes de atacar sus unidades.`};
    if (!compatibleTargets(attacker, defender)) return {ok:false, message:"La unidad seleccionada no puede atacar eficazmente ese tipo de objetivo."};
    if (attacker.movement || state.unitEngagements.some(x => !x.resolved && x.attackerUnitId === attacker.id)) return {ok:false, message:"La unidad atacante ya tiene una orden activa."};
    ensureWarDetail(state, war);
    const speed = AIR_TYPES.has(attacker.typeId) ? 1600 : NAVAL_TYPES.has(attacker.typeId) ? 650 : STRATEGIC_TYPES.has(attacker.typeId) ? 4000 : 350;
    const days = distanceDays(attacker, defender, speed);
    const engagement = {
      id:uid(), warId:war.id, kind:"unit", attackerCountryId:attackerCountry.id, defenderCountryId:defenderCountry.id,
      attackerUnitId:attacker.id, defenderUnitId:defender.id, startDate:state.date, status:"approach",
      totalDays:days, daysRemaining:days, days:0, attackerLosses:0, defenderLosses:0, resolved:false,
      lat:defender.lat ?? defenderCountry.map.lat, lng:defender.lng ?? defenderCountry.map.lng,
      title:`${state.unitCatalog.find(x=>x.id===attacker.typeId)?.name || attacker.typeId} contra ${state.unitCatalog.find(x=>x.id===defender.typeId)?.name || defender.typeId}`
    };
    state.unitEngagements.push(engagement);
    attacker.status = `interceptando a ${defenderCountry.name}`;
    attacker.movement = {mode:"engage", engagementId:engagement.id, startLat:attacker.lat, startLng:attacker.lng, endLat:engagement.lat, endLng:engagement.lng, totalDays:days, daysRemaining:days, progress:0};
    war.operations.unshift({id:uid(), date:state.date, type:"interception", text:`${attackerCountry.name} ordena interceptar una unidad de ${defenderCountry.name}.`, engagementId:engagement.id});
    E.pushEvent(state, "military", "Orden de ataque a unidad", `${attackerCountry.name} despliega ${attacker.quantity.toLocaleString("es-ES")} activos contra una formación de ${defenderCountry.name}. Contacto estimado en ${days} días.`);
    return {ok:true, message:`Ataque a unidad iniciado. Contacto estimado en ${days} días.`, warId:war.id, engagementId:engagement.id};
  }

  function bestTargetRegion(state, targetCountryId) {
    return [...regions(state, targetCountryId)].sort((a,b) => {
      const av = (a.gdp || 0) * .25 + (a.industry || 0) + (a.energy || 0) - (a.defense || 45) * .4;
      const bv = (b.gdp || 0) * .25 + (b.industry || 0) + (b.energy || 0) - (b.defense || 45) * .4;
      return bv - av;
    })[0];
  }

  function attackCountry(state, attackerUnitId, targetCountryId) {
    const attackerCountry = country(state);
    const targetCountry = country(state, targetCountryId);
    const unit = attackerCountry.units.find(x => x.id === attackerUnitId && x.quantity > 0);
    if (!unit || !targetCountry) return {ok:false, message:"Unidad o país objetivo no encontrado."};
    const war = activeWar(state, attackerCountry.id, targetCountry.id);
    if (!war) return {ok:false, message:`Debes declarar la guerra a ${targetCountry.name} antes de iniciar una ofensiva.`};
    const region = bestTargetRegion(state, targetCountry.id);
    if (LAND_TYPES.has(unit.typeId) && region) {
      const result = oldAttackRegion(state, unit.id, targetCountry.id, region.id);
      if (result?.ok) {
        ensureWarDetail(state, war).operations.unshift({id:uid(), date:state.date, type:"invasion", text:`Ofensiva de ${unit.quantity.toLocaleString("es-ES")} activos sobre ${region.name}.`});
        result.warId = war.id;
      }
      return result;
    }
    const candidates = (targetCountry.units || []).filter(x => x.quantity > 0 && compatibleTargets(unit, x)).sort((a,b)=>unitPower(state,b)-unitPower(state,a));
    if (candidates[0]) return attackUnit(state, unit.id, targetCountry.id, candidates[0].id);
    if (unit.movement) return {ok:false, message:"La unidad ya tiene una orden activa."};
    const days = Math.max(1, AIR_TYPES.has(unit.typeId) || STRATEGIC_TYPES.has(unit.typeId) ? 1 : 3);
    const engagement = {id:uid(), warId:war.id, kind:"strategic", attackerCountryId:attackerCountry.id, defenderCountryId:targetCountry.id, attackerUnitId:unit.id, defenderUnitId:null, startDate:state.date, status:"approach", totalDays:days, daysRemaining:days, days:0, attackerLosses:0, defenderLosses:0, resolved:false, lat:region?.lat ?? targetCountry.map.lat, lng:region?.lng ?? targetCountry.map.lng, regionId:region?.id || null, title:`Incursión estratégica sobre ${targetCountry.name}`};
    state.unitEngagements.push(engagement);
    unit.status = `misión contra ${targetCountry.name}`;
    unit.movement = {mode:"engage", engagementId:engagement.id, startLat:unit.lat, startLng:unit.lng, endLat:engagement.lat, endLng:engagement.lng, totalDays:days, daysRemaining:days, progress:0};
    ensureWarDetail(state, war).operations.unshift({id:uid(), date:state.date, type:"strategic", text:`${unit.name || unit.typeId} inicia una incursión sobre ${targetCountry.name}.`, engagementId:engagement.id});
    return {ok:true, message:`Incursión estratégica iniciada contra ${targetCountry.name}.`, warId:war.id, engagementId:engagement.id};
  }

  function processUnitEngagements(state) {
    for (const e of state.unitEngagements.filter(x => !x.resolved)) {
      const ac = country(state, e.attackerCountryId), dc = country(state, e.defenderCountryId);
      const au = ac?.units?.find(x => x.id === e.attackerUnitId);
      const du = e.defenderUnitId ? dc?.units?.find(x => x.id === e.defenderUnitId) : null;
      const war = (state.wars || []).find(x => x.id === e.warId);
      if (!ac || !dc || !au || au.quantity <= 0 || !war || war.ended) { resolveEngagement(state, e, au, du, "Operación cancelada"); continue; }
      if (e.status === "approach") {
        e.daysRemaining = Math.max(0, e.daysRemaining - 1);
        const progress = 1 - e.daysRemaining / Math.max(1, e.totalDays);
        if (au.movement) {
          au.movement.daysRemaining = e.daysRemaining;
          au.movement.progress = progress;
          au.lat = au.movement.startLat + (au.movement.endLat - au.movement.startLat) * progress;
          au.lng = au.movement.startLng + (au.movement.endLng - au.movement.startLng) * progress;
        }
        if (e.daysRemaining <= 0) { e.status = "combat"; au.movement = null; au.status = "en combate"; if (du) du.status = "bajo ataque"; }
        continue;
      }
      e.days += 1;
      if (e.kind === "strategic") {
        const p = unitPower(state, au);
        const defense = Math.max(10, (dc.systems.military || 50) * .8 + (dc.militaryReadiness || 50) * .5);
        const success = p / Math.max(1, p + defense);
        const damage = round(clamp(success * 4 + Math.random() * 1.5, .3, 4.5), 2);
        dc.militaryReadiness = clamp(dc.militaryReadiness - damage, 0, 100);
        dc.systems.logistics = clamp(dc.systems.logistics - damage * .18, 0, 100);
        dc.strategicStockpile.munitions = clamp(dc.strategicStockpile.munitions - damage * .5, 0, 100);
        war.warScore = round(clamp((war.warScore || 0) + (war.attacker === ac.id ? damage : -damage), -100, 100), 2);
        createEngagementBattle(state, e, ac, dc, au, null, 0, 0, success >= .45 ? ac.id : dc.id, `Incursión estratégica: ${damage.toFixed(1)} puntos de daño operativo`);
        resolveEngagement(state, e, au, null, success >= .45 ? "Misión completada" : "Misión contenida");
        continue;
      }
      if (!du || du.quantity <= 0) { resolveEngagement(state, e, au, du, "Objetivo destruido o retirado"); continue; }
      const ap = unitPower(state, au), dp = unitPower(state, du);
      const balance = (ap - dp) / Math.max(1, ap + dp);
      const aLoss = Math.min(au.quantity, Math.max(1, Math.round(Math.sqrt(Math.max(1, du.quantity)) * clamp(dp / Math.max(1, ap), .35, 2.4) * (.35 + Math.random() * .55))));
      const dLoss = Math.min(du.quantity, Math.max(1, Math.round(Math.sqrt(Math.max(1, au.quantity)) * clamp(ap / Math.max(1, dp), .35, 2.4) * (.35 + Math.random() * .55))));
      au.quantity = Math.max(0, au.quantity - aLoss);
      du.quantity = Math.max(0, du.quantity - dLoss);
      au.readiness = clamp(au.readiness - 1.1, 0, 100); du.readiness = clamp(du.readiness - 1.3, 0, 100);
      e.attackerLosses += aLoss; e.defenderLosses += dLoss;
      const score = clamp(balance * 5 + (dLoss - aLoss) / Math.max(1, Math.sqrt(au.quantity + du.quantity + aLoss + dLoss)), -5, 5);
      war.warScore = round(clamp((war.warScore || 0) + (war.attacker === ac.id ? score : -score), -100, 100), 2);
      const winner = dLoss >= aLoss ? ac.id : dc.id;
      createEngagementBattle(state, e, ac, dc, au, du, aLoss, dLoss, winner, `${ac.name} pierde ${aLoss.toLocaleString("es-ES")}; ${dc.name} pierde ${dLoss.toLocaleString("es-ES")}.`);
      if (au.quantity <= 0 || du.quantity <= 0 || e.days >= 12) resolveEngagement(state, e, au, du, au.quantity > du.quantity ? `${ac.name} domina el enfrentamiento` : `${dc.name} conserva la iniciativa`);
    }
    state.unitEngagements = state.unitEngagements.slice(-160);
  }

  function createEngagementBattle(state, e, ac, dc, au, du, aLoss, dLoss, winnerId, summary) {
    const war = (state.wars || []).find(x => x.id === e.warId);
    if (!war) return;
    const battle = {id:uid(), date:state.date, day:war.days || 0, title:e.title, summary, winner:winnerId, lat:e.lat, lng:e.lng, intensity:round(clamp((unitPower(state, au) + (du ? unitPower(state, du) : 30)) / 450, .4, 3),1), attackerUnits:[`${state.unitCatalog.find(x=>x.id===au.typeId)?.name || au.typeId} (${au.quantity.toLocaleString("es-ES")})`], defenderUnits:du?[`${state.unitCatalog.find(x=>x.id===du.typeId)?.name || du.typeId} (${du.quantity.toLocaleString("es-ES")})`]:["Defensas estratégicas"], attackerLosses:aLoss, defenderLosses:dLoss, engagementId:e.id};
    war.battles.unshift(battle); war.battles = war.battles.slice(0, 80); war.lastBattle = battle;
    war.operations.unshift({id:uid(), date:state.date, type:"battle", text:`${battle.title}: ${summary}`, battleId:battle.id}); war.operations = war.operations.slice(0, 120);
    state.battleAnimations ||= []; state.battleAnimations.push({...battle, expires:Date.now()+12000}); state.battleAnimations = state.battleAnimations.slice(-25);
    E.pushEvent(state, "battle", battle.title, summary);
  }

  function resolveEngagement(state, e, au, du, result) {
    e.resolved = true; e.status = "resolved"; e.endDate = state.date; e.result = result;
    if (au) { au.movement = null; au.status = au.quantity > 0 ? "desplegada" : "destruida"; }
    if (du) du.status = du.quantity > 0 ? "desplegada" : "destruida";
  }

  function warAction(state, targetId, type) {
    const result = oldWarAction(state, targetId, type);
    if (result?.ok && type === "declare") {
      const c = country(state), war = activeWar(state, c.id, targetId);
      if (war) {
        ensureWarDetail(state, war);
        war.phase = "Movilización y apertura de frentes";
        war.operations.unshift({id:uid(), date:state.date, type:"declaration", text:`Declaración formal de guerra. Objetivo: ${war.objective || "forzar una decisión política"}.`});
        result.warId = war.id;
      }
    }
    return result;
  }

  function updateWarPhases(state) {
    for (const war of state.wars || []) {
      ensureWarDetail(state, war);
      if (war.ended) { war.phase = war.settlement?.resolved ? "Tratado aplicado" : "Negociación de paz"; continue; }
      const activeEngagements = state.unitEngagements.filter(x => !x.resolved && x.warId === war.id).length;
      const activeRegional = (state.regionBattles || []).filter(x => !x.ended && x.warId === war.id).length;
      if ((war.days || 0) < 3) war.phase = "Movilización";
      else if (activeEngagements + activeRegional > 0) war.phase = "Operaciones de combate";
      else if (Math.abs(war.warScore || 0) > 70) war.phase = "Ruptura estratégica";
      else war.phase = "Guerra de desgaste";
      const a = country(state, war.attacker), d = country(state, war.defender);
      war.frontReadiness = {attacker:round(a?.militaryReadiness || 0,1), defender:round(d?.militaryReadiness || 0,1)};
      war.logistics = {attacker:round(a?.systems?.logistics || 0,1), defender:round(d?.systems?.logistics || 0,1)};
      const airA = (a?.units || []).filter(u=>AIR_TYPES.has(u.typeId)).reduce((s,u)=>s+unitPower(state,u),0);
      const airD = (d?.units || []).filter(u=>AIR_TYPES.has(u.typeId)).reduce((s,u)=>s+unitPower(state,u),0);
      const navalA = (a?.units || []).filter(u=>NAVAL_TYPES.has(u.typeId)).reduce((s,u)=>s+unitPower(state,u),0);
      const navalD = (d?.units || []).filter(u=>NAVAL_TYPES.has(u.typeId)).reduce((s,u)=>s+unitPower(state,u),0);
      war.airSuperiority = {attacker:round(airA/Math.max(1,airA+airD)*100,1), defender:round(airD/Math.max(1,airA+airD)*100,1)};
      war.navalControl = {attacker:round(navalA/Math.max(1,navalA+navalD)*100,1), defender:round(navalD/Math.max(1,navalA+navalD)*100,1)};
      war.intensity = round(clamp(22 + activeEngagements*12 + activeRegional*10 + Math.abs(war.warScore||0)*.25, 10, 100),1);
    }
  }

  function pruneLongCampaign(state) {
    state.events = (state.events || []).slice(0, 220);
    state.battleAnimations = (state.battleAnimations || []).filter(x => !x.expires || x.expires > Date.now() - 30000).slice(-30);
    state.regionBattles = (state.regionBattles || []).slice(-220);
    for (const war of state.wars || []) {
      war.battles = (war.battles || []).slice(0, 80);
      war.operations = (war.operations || []).slice(0, 120);
    }
    for (const c of state.countries || []) {
      c.units = (c.units || []).filter(u => (u.quantity || 0) > 0 || u.status !== "destruida").slice(-500);
      c.productionQueue = (c.productionQueue || []).slice(-400);
    }
  }

  function forceAdvanceDate(state, sourceDate = state.date) {
    const before = validISO(sourceDate) ? sourceDate : (state.timeline?.lastValidDate || "2028-01-01");
    state.date = nextDayISO(before);
    state.dayIndex = Math.max(0, Number(state.dayIndex) || 0) + 1;
    ensureTimeline(state);
    state.timeline.recoveries += 1;
    state.timeline.lastValidDate = state.date;
    return {date:state.date, crossedMonth:before.slice(0,7)!==state.date.slice(0,7), recovered:true, activeWars:(state.wars||[]).filter(w=>!w.ended).length};
  }

  function tickDay(state) {
    ensureV16State(state);
    const before = validISO(state.date) ? state.date : (state.timeline.lastValidDate || "2028-01-01");
    let summary;
    try {
      summary = oldTickDay(state);
    } catch (error) {
      console.error("NEXUS v1.6 recupera un tick fallido", error);
      summary = forceAdvanceDate(state, before);
      E.pushEvent(state, "system", "Recuperación automática del calendario", `El motor aisló un error de simulación y continuó en ${state.date}.`);
    }
    if (!validISO(state.date) || Date.parse(`${state.date}T12:00:00Z`) <= Date.parse(`${before}T12:00:00Z`)) {
      state.date = nextDayISO(before);
      state.dayIndex = Math.max(0, Number(state.dayIndex) || 0) + 1;
      summary = {...(summary || {}), date:state.date, crossedMonth:before.slice(0,7)!==state.date.slice(0,7), recovered:true};
      state.timeline.recoveries += 1;
    }
    state.timeline.lastValidDate = state.date;
    state.timeline.tickCount = Math.max(0, Number(state.timeline.tickCount) || 0) + 1;
    processUnitEngagements(state);
    updateWarPhases(state);
    if (summary?.crossedMonth) processControlledCompanyProfits(state);
    pruneLongCampaign(state);
    return summary || {date:state.date, crossedMonth:false, activeWars:(state.wars||[]).filter(w=>!w.ended).length};
  }

  function controlledCompanies(state, countryId = state.controlledCountryId) {
    return (state.companies || []).filter(company => Number(E.getHolding?.(state, company.id, countryId) || company.ownershipByCountry?.[countryId] || 0) >= 51);
  }

  Object.assign(E, {
    createInitialState,
    hydrateState:hydrateV16,
    tickDay,
    forceAdvanceDate,
    warAction,
    attackUnit,
    attackCountry,
    adjustBudget,
    updateBudget,
    setCompanyPolicy,
    enactNationalDecision,
    processControlledCompanyProfits,
    controlledCompanies,
    companyPolicies:COMPANY_POLICIES,
    nationalDecisionDefinitions:NATIONAL_DECISIONS,
    compatibleUnitTargets:compatibleTargets,
    ensureWarDetail,
    version16:true
  });
})();
