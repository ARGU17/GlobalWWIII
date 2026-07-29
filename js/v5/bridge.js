"use strict";

(() => {
  const V=window.NEXUS_V5,E=window.NEXUS_ECONOMY;
  if(!V||!E)throw new Error("bridge.js requiere el núcleo y el motor legacy");
  if(E.version5)return;
  const legacy={create:E.createInitialState,hydrate:E.hydrateState,tick:E.tickDay,annex:E.annexCountry,resolveDecision:E.resolveDecision};
  const withDeterminism=(state,scope,run)=>{const original=Math.random,seeded=V.random(state,scope);Math.random=seeded;try{return run()}finally{Math.random=original}};
  const migrate=state=>{V.migrate(state);state.settings||={};state.settings.explainableSimulation??=true;state.settings.v5AdvancedSystems??=true;state.uiPreferences||={};state.uiPreferences.analyticsMetric??="growth";return state};

  function createInitialState(){const state=withDeterminism({simulationSeed:"nexus-global-2028",dayIndex:0,v5:{sequence:0}},"legacy-create",()=>legacy.create());state.simulationSeed||="nexus-global-2028";migrate(state);E.pushEvent?.(state,"system","NEXUS Global v5.0 · Simulación sistémica","Núcleo determinista, agentes económicos, sociedad, instituciones, IA estratégica, inteligencia y guerra logística activados.");return state}
  function hydrateState(state){const hydrated=legacy.hydrate(state);return migrate(hydrated)}
  function tickDay(state){migrate(state);const summary=withDeterminism(state,`legacy-day:${state.dayIndex||0}`,()=>legacy.tick(state));const context=V.runDay(state);snapshot(state);state.version=V.VERSION;state.lastTickSummary={...(summary||{}),v5:context.metrics,systems:state.v5.lastRun.systems};return state.lastTickSummary}

  function snapshot(state){
    const a=state.v5Analytics.series,index=state.worldIndex;a.globalGDP.push(index.globalGDP);a.inflation.push(index.globalInflation);a.wars.push((state.wars||[]).filter(w=>!w.ended).length);a.food.push(index.foodIndex);a.energy.push(index.energyIndex);for(const series of Object.values(a))if(series.length>180)series.splice(0,series.length-180);
    state.v5Analytics.lastSnapshot={day:state.dayIndex,date:state.date,...index,activeWars:(state.wars||[]).filter(w=>!w.ended).length,pendingActions:(state.actionInbox||[]).filter(x=>x.status==="pending").length};
    state.worldIndex.warRisk=V.round(V.clamp(state.v5Analytics.lastSnapshot.activeWars*6+(state.aiDirector?.conflictsStarted||0)*.4,0,100));
  }

  function integrateAnnexation(state,war,attacker,defender){
    if(!attacker||!defender||attacker.id===defender.id)return;
    defender.sovereign=false;defender.annexedBy=attacker.id;defender.v5.integratedInto=attacker.id;defender.v5.annexedDay=state.dayIndex;
    const ae=attacker.v5.economy,de=defender.v5.economy,share=Math.max(.01,defender.economy.gdp/Math.max(1,attacker.economy.gdp+defender.economy.gdp));
    ae.firms.push(...de.firms.map(f=>({...f,id:`annex-${defender.id.toLowerCase()}-${f.id}`,name:`${f.name} · ${defender.name}`,health:V.round(f.health*.72)})));
    for(const [id,p] of Object.entries(ae.products)){const q=de.products[id];if(!q)continue;p.supply=V.round(p.supply+q.supply*.7);p.demand=V.round(p.demand+q.demand);p.inventory=V.round(p.inventory+q.inventory*.6)}
    attacker.economy.population=V.round(attacker.economy.population+defender.economy.population,4);attacker.economy.gdp=V.round(attacker.economy.gdp+defender.economy.gdp*.68);ae.accounts.realGDP=attacker.economy.gdp;ae.accounts.nominalGDP=attacker.economy.gdp;
    for(const [key,value] of Object.entries(defender.v5.society.cohorts))attacker.v5.society.cohorts[key]=V.round(attacker.v5.society.cohorts[key]+value);
    attacker.regions=Array.from(new Set([...(attacker.regions||[]),...(defender.regions||[])]));for(const region of state.regions.filter(r=>r.countryId===defender.id||r.ownerId===defender.id)){region.countryId=attacker.id;region.ownerId=attacker.id;region.controllerId=attacker.id;region.annexedFrom=defender.id}
    state.occupationZones.push({id:V.uuid(state,"occupation-zone"),warId:war?.id||null,occupierId:attacker.id,formerOwnerId:defender.id,policy:"civil_integration",legitimacy:20,security:40,reconstruction:10,resistance:55,collaboration:15,startedDay:state.dayIndex});
    state.actionInbox.push({id:V.uuid(state,"annexation-choice"),type:"occupation",countryId:attacker.id,title:`Integración de ${defender.name}`,text:"El territorio, su población y su tejido productivo ya forman parte del Estado. Define el modelo político de integración.",options:["Integración plena","Autonomía regional","Administración transitoria","Estado asociado"],status:"pending"});
    attacker.v5.factors.growth=[{label:"Anexión e integración",impact:V.round(share*8),detail:`${defender.name}: capacidad productiva parcial en reconstrucción`}];
  }
  function annexCountry(state,warId){const war=(state.wars||[]).find(w=>w.id===warId),attacker=state.countries.find(c=>c.id===(war?.attackerId||war?.attacker||state.controlledCountryId)),defender=state.countries.find(c=>c.id===(war?.defenderId||war?.defender)),result=legacy.annex?.(state,warId);if(result?.ok!==false&&defender&&!defender.v5?.integratedInto)integrateAnnexation(state,war,attacker,defender);return result}

  function resolveV5Decision(state,id,choice){const decision=(state.actionInbox||[]).find(x=>x.id===id);if(!decision||decision.status!=="pending")return{ok:false,message:"La decisión ya no está disponible."};decision.status="resolved";decision.choice=choice;decision.resolvedDay=state.dayIndex;const c=state.countries.find(x=>x.id===decision.countryId);if(c){if(decision.type==="health"){c.v5.society.health.pandemicRisk=V.round(V.clamp(c.v5.society.health.pandemicRisk-(choice===1?28:choice===2?18:10),0,100));c.economy.treasury=V.round(Math.max(0,c.economy.treasury-(choice===1?c.economy.gdp*.002:c.economy.gdp*.0008)))}if(decision.type==="climate"){c.v5.infrastructure.climate.adaptation=V.round(V.clamp(c.v5.infrastructure.climate.adaptation+(choice===1?8:3),0,100))}if(decision.type==="governance"){c.v5.governance.corruption.perception=V.round(V.clamp(c.v5.governance.corruption.perception-(choice===0?12:choice===1?6:-2),0,100));c.politics.politicalCapital=V.round(V.clamp(c.politics.politicalCapital+(choice===0?-4:2),0,150))}if(decision.type==="occupation"){const zone=state.occupationZones.find(z=>z.occupierId===c.id&&z.formerOwnerId===decision.formerOwnerId)||state.occupationZones.find(z=>z.occupierId===c.id);if(zone){zone.policy=["full_integration","regional_autonomy","transitional_administration","associated_state"][choice]||zone.policy;zone.legitimacy=V.round(V.clamp(zone.legitimacy+(choice===1?18:choice===3?24:6),0,100));zone.resistance=V.round(V.clamp(zone.resistance-(choice===1?15:choice===3?22:5),0,100))}}}
    if(c&&decision.type==="financial"){c.v5.economy.banking.stress=V.round(V.clamp(c.v5.economy.banking.stress-(choice===1?24:14),0,100));c.v5.economy.banking.capitalRatio=V.round(V.clamp(c.v5.economy.banking.capitalRatio+(choice===1?4:2),3,30));c.economy.treasury=V.round(Math.max(0,c.economy.treasury-c.economy.gdp*(choice===1?.012:.004)))}
    if(c&&decision.type==="food"){const food=c.v5.economy.products.grains||c.v5.economy.products.food;food.inventory=V.round(food.inventory+food.demand*(choice===1?.16:.1));food.shortage=V.round(V.clamp(food.shortage-(choice===1?24:14),0,100))}
    if(c&&decision.type==="social"){c.v5.society.opinion.protestPotential=V.round(V.clamp(c.v5.society.opinion.protestPotential-(choice===0?18:choice===1?14:7),0,100));c.systems.approval=V.round(V.clamp(c.systems.approval+(choice===0?4:choice===1?3:-2),0,100))}
    if(c&&decision.type==="energy"){c.v5.infrastructure.energy.reserveMargin=V.round(c.v5.infrastructure.energy.reserveMargin+(choice===1?15:choice===2?10:6));c.v5.infrastructure.energy.blackoutRisk=V.round(V.clamp(c.v5.infrastructure.energy.blackoutRisk-(choice===1?25:15),0,100))}
    return{ok:true,message:`Decisión aplicada: ${decision.options?.[choice]||"opción seleccionada"}.`}
  }
  function strategicBrief(state,countryId=state.controlledCountryId){const c=state.countries.find(x=>x.id===countryId)||state.countries[0],m=c.v5.economy,s=c.v5.society,g=c.v5.governance;return{country:c,headline:`${m.cycle.phase} · ${c.economy.growth}% crecimiento · ${c.systems.approval}% aprobación`,risks:[...Object.values(m.products).map((p,i)=>({label:Object.keys(m.products)[i],value:p.shortage,type:"shortage"})),{label:"Banca",value:m.banking.stress,type:"financial"},{label:"Protesta",value:s.opinion.protestPotential,type:"social"},{label:"Corrupción",value:g.corruption.perception,type:"institutional"},{label:"Apagón",value:c.v5.infrastructure.energy.blackoutRisk,type:"energy"}].sort((a,b)=>b.value-a.value).slice(0,6),drivers:{growth:V.explain(state,c.id,"growth"),inflation:V.explain(state,c.id,"inflation"),approval:V.explain(state,c.id,"approval")},pending:(state.actionInbox||[]).filter(x=>x.status==="pending"&&(x.countryId===c.id||!x.countryId))}}

  Object.assign(E,{createInitialState,hydrateState,tickDay,annexCountry,resolveV5Decision,strategicBrief,integrateAnnexation,version5:true});
  window.NEXUS_V5_BRIDGE={legacy,withDeterminism,integrateAnnexation,resolveV5Decision,strategicBrief};
})();
