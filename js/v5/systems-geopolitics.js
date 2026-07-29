"use strict";

(() => {
  const V=window.NEXUS_V5,E=window.NEXUS_ECONOMY,{clamp,round}=V;
  const sovereign=state=>state.countries.filter(c=>c.sovereign!==false);
  const relation=(a,b)=>Number(a.relations?.[b.id]??50);
  const activeWar=(state,a,b)=>state.wars?.find(w=>{const attacker=w.attackerId||w.attacker,defender=w.defenderId||w.defender;return!w.ended&&((attacker===a.id&&defender===b.id)||(attacker===b.id&&defender===a.id))});

  V.registerSystem({id:"diplomacy.multidimensional-relations",order:80,frequency:"weekly",run:({state})=>{
    const countries=sovereign(state);
    for(const a of countries){
      const candidates=countries.filter(b=>b.id!==a.id).sort((x,y)=>Math.abs(relation(a,x)-50)-Math.abs(relation(a,y)-50)).slice(0,24);
      for(const b of candidates){const legacy=relation(a,b),war=!!activeWar(state,a,b),trade=Math.min(100,50+((a.economy.tradeBalance||0)+(b.economy.tradeBalance||0))/Math.max(1,a.economy.gdp+b.economy.gdp)*500),ideology=a.v5.profile.ideology===b.v5.profile.ideology?72:44;
        a.v5.foreign.relations[b.id]={overall:round(clamp(legacy+(war?-45:0),0,100)),security:war?0:round(clamp((legacy+a.systems.military-b.systems.military*.25)/1.25,0,100)),economic:round(clamp(trade,0,100)),ideological:ideology,public:round(clamp((legacy+a.v5.governance.media.trust)/2,0,100)),intelligenceConfidence:a.v5.intelligence.confidenceByCountry[b.id]||20};}
      a.v5.foreign.redLines=[{id:"homeland",label:"Ataque al territorio nacional",severity:100},{id:"allies",label:"Ataque a aliado formal",severity:80},{id:"chokepoint",label:"Bloqueo de ruta estratégica",severity:65}];
    }
  }});

  V.registerSystem({id:"intelligence.fog-and-estimates",order:82,frequency:"weekly",run:({state,rng})=>{
    const countries=sovereign(state);
    for(const a of countries){const intel=a.v5.intelligence,targets=countries.filter(b=>b.id!==a.id).sort((x,y)=>Math.abs(relation(a,x)-50)-Math.abs(relation(a,y)-50)).slice(0,20),rand=rng(`intel:${a.id}`);
      for(const b of targets){const access=(intel.collection+intel.cyber+b.v5.governance.media.freedom)/3-b.v5.intelligence.counterintelligence*.35,confidence=clamp((intel.confidenceByCountry[b.id]||10)+access*.012+(rand()-.5)*1.5,5,98);intel.confidenceByCountry[b.id]=round(confidence);const rel=a.v5.foreign.relations[b.id];if(rel)rel.intelligenceConfidence=round(confidence)}
      intel.deception=round(clamp(intel.deception+(a.systems.intelligence-60)*.006+(rand()-.5)*.4,0,90));a.v5.military.fog=round(clamp(100-intel.collection*.55-intel.cyber*.2,0,95));
    }
  }});

  V.registerSystem({id:"technology.knowledge-diffusion",order:84,frequency:"monthly",run:({state})=>{
    const countries=sovereign(state);
    for(const c of countries){c.v5.technology||={frontier:round(c.systems.technology),domains:{digital:c.systems.technology,aerospace:(c.systems.technology+c.systems.military)/2,energy:(c.systems.technology+c.systems.energy)/2,biotech:(c.systems.technology+(c.v5.society.health.capacity||50))/2,materials:(c.systems.technology+c.systems.industry)/2,agriculture:(c.systems.technology+c.systems.food)/2},diffusion:50,patents:round(c.economy.gdp*c.systems.technology/10000),secrets:[],dependencies:[]};const t=c.v5.technology,research=c.budgets.research||2,education=c.budgets.education||4,partners=countries.filter(x=>x.id!==c.id&&relation(c,x)>70),partnerFrontier=partners.length?partners.reduce((a,x)=>a+(x.v5.technology?.frontier||x.systems.technology),0)/partners.length:t.frontier;
      t.diffusion=round(clamp(t.diffusion+(education-4)*.03+(partnerFrontier-t.frontier)*.01,10,100));t.frontier=round(clamp(t.frontier+(research-2)*.035+(partnerFrontier-t.frontier)*t.diffusion/15000,5,150));for(const key of Object.keys(t.domains))t.domains[key]=round(clamp(t.domains[key]+(t.frontier-t.domains[key])*.018+(research-2)*.02,5,150));t.patents=round(Math.max(0,t.patents*(1+(research+education-5)/1200)));c.systems.technology=round(clamp(c.systems.technology*.85+t.frontier*.15,5,120));
    }
  }});

  V.registerSystem({id:"ai.strategic-director",order:88,frequency:"weekly",run:({state,rng})=>{
    const countries=sovereign(state),rand=rng("ai-director"),active=(state.wars||[]).filter(w=>!w.ended);
    for(const c of countries){if(c.id===state.controlledCountryId&&!state.observerMode)continue;const f=c.v5.foreign,threats=countries.filter(x=>x.id!==c.id).map(x=>({id:x.id,score:(x.systems.military-c.systems.military)*.45+(50-relation(c,x))*.8+(activeWar(state,c,x)?80:0)})).sort((a,b)=>b.score-a.score),opportunities=countries.filter(x=>x.id!==c.id).map(x=>({id:x.id,score:relation(c,x)*.4+x.economy.gdp/Math.max(100,c.economy.gdp)*10})).sort((a,b)=>b.score-a.score);
      f.objectives=[{type:"security",targetId:threats[0]?.id,priority:round(clamp(threats[0]?.score||20,0,100))},{type:"economic",targetId:opportunities[0]?.id,priority:round(clamp(opportunities[0]?.score||20,0,100))}];
      const pressure=(c.economy.inflation+c.economy.unemployment+(100-c.systems.approval)/4),strategy=pressure>35?"domestic_stabilization":threats[0]?.score>55?"deterrence":c.economy.growth<1?"economic_expansion":f.strategy;f.strategy=strategy;
    }
    // Aproximación moderada: unas 8 guerras interestatales nuevas/año en el mundo,
    // condicionadas por hostilidad, capacidad y ausencia de conflicto previo.
    const weeklyChance=8/52;if(active.length<14&&rand()<weeklyChance){const attackers=countries.filter(c=>c.id!==state.controlledCountryId||state.observerMode).sort((a,b)=>b.systems.military-a.systems.military),a=attackers[Math.floor(rand()*Math.min(30,attackers.length))],targets=countries.filter(b=>b.id!==a?.id&&!activeWar(state,a,b)&&relation(a,b)<35&&b.systems.military<a.systems.military*1.25);if(a&&targets.length){const b=targets[Math.floor(rand()*targets.length)],result=E.createAIWar?.(state,a,b)||E.warAction?.(state,b.id,"limited");if(result!==false){state.aiDirector||={actions:[],conflictsStarted:0};state.aiDirector.conflictsStarted=(state.aiDirector.conflictsStarted||0)+1;(state.aiDirector.actions||=[]).push({day:state.dayIndex,type:"strategic_conflict",actorId:a.id,targetId:b.id})}}}
  }});

  V.registerSystem({id:"war.operations-logistics",order:90,frequency:"daily",run:({state,rng})=>{
    for(const war of (state.wars||[]).filter(w=>!w.ended)){
      const a=state.countries.find(c=>c.id===(war.attackerId||war.attacker)),d=state.countries.find(c=>c.id===(war.defenderId||war.defender));if(!a||!d)continue;const rand=rng(`war:${war.id}`);
      for(const c of [a,d]){const mil=c.v5.military,load=(mil.operations.length+mil.fronts.length+1)*.09,freight=c.v5.infrastructure.logistics.utilization/100;mil.logistics.supply=round(clamp(mil.logistics.supply-load*(.8+freight),0,100));mil.logistics.fuel=round(clamp(mil.logistics.fuel-load*(1.1+rand()*.4),0,100));mil.logistics.munitions=round(clamp(mil.logistics.munitions-load*(1.2+rand()*.5),0,100));mil.logistics.spares=round(clamp(mil.logistics.spares-load*.6,0,100));mil.morale=round(clamp(mil.morale+(mil.logistics.supply-55)*.004-(war.casualties||0)*.0001,5,100));mil.readiness=round(clamp((mil.logistics.supply+mil.logistics.fuel+mil.logistics.munitions+mil.morale)/4,0,100))}
      const plans=war.operationalPlans||war.campaigns||[];for(const plan of plans){if(plan.v5Operation)continue;const type=plan.typeId||plan.campaignId||"ground_offensive";plan.v5Operation={domain:type.includes("air")?"air":type.includes("naval")||type.includes("blockade")?"sea":type.includes("cyber")?"cyber":"land",phases:["preparación","configuración","ejecución","consolidación"],currentPhase:0,supplyRequired:round(15+rand()*25),civilianRisk:round(5+rand()*35),confidence:round((a.v5.military.command.c2+a.v5.intelligence.collection-d.v5.intelligence.counterintelligence)/2)}}
      const aPower=a.v5.military.readiness*a.systems.military*(.8+rand()*.4),dPower=d.v5.military.readiness*d.systems.military*(.8+rand()*.4),ratio=aPower/Math.max(1,dPower);a.v5.military.airSuperiority=round(clamp((ratio-1)*35, -100,100));d.v5.military.airSuperiority=-a.v5.military.airSuperiority;
      const casualties=Math.max(0,round((aPower+dPower)/12000*(.6+rand()),2));a.v5.military.casualties.military=round(a.v5.military.casualties.military+casualties/(1+ratio));d.v5.military.casualties.military=round(d.v5.military.casualties.military+casualties*ratio/(1+ratio));war.v5={...(war.v5||{}),intensity:round(clamp((aPower+dPower)/180,1,100)),attackerSupply:a.v5.military.logistics.supply,defenderSupply:d.v5.military.logistics.supply,frontBalance:round(clamp((ratio-1)*50,-100,100)),civilianRisk:round(10+casualties*.3)};
    }
  }});

  V.registerSystem({id:"war.occupation-resistance",order:92,frequency:"weekly",run:({state,rng})=>{
    for(const zone of state.occupationZones||[]){const occupier=state.countries.find(c=>c.id===zone.occupierId),former=state.countries.find(c=>c.id===zone.formerOwnerId);if(!occupier||!former)continue;const rand=rng(`occupation:${zone.id}`);zone.legitimacy??=25;zone.security??=35;zone.reconstruction??=0;zone.resistance??=55;zone.collaboration??=15;zone.policy??="military_administration";zone.resistance=round(clamp(zone.resistance+(100-zone.legitimacy)*.025+(100-zone.security)*.012-zone.reconstruction*.015+(rand()-.5)*2,0,100));zone.collaboration=round(clamp(zone.collaboration+(zone.legitimacy+zone.reconstruction-zone.resistance)/180,0,100));zone.security=round(clamp(zone.security+occupier.v5.military.readiness*.01-zone.resistance*.018,0,100));if(zone.resistance>75&&rand()<.18)state.actionInbox.push({id:V.uuid(state,"occupation"),type:"occupation",countryId:occupier.id,title:"Escalada de resistencia",text:`La ocupación de ${former.name} afronta sabotajes y pérdida de control local.`,options:["Autonomía negociada","Refuerzo de seguridad","Reconstrucción acelerada","Retirada pactada"],status:"pending"})}
    }
  });
})();
