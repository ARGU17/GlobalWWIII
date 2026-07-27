"use strict";

/* NEXUS Global Alpha v1.7
   Soberanía integral, elecciones reactivas, comercio beneficioso,
   IA geopolítica y centro de decisiones en Resumen.
*/
(() => {
  const E = window.NEXUS_ECONOMY;
  const C = window.NEXUS_CATALOG;
  const P = window.NEXUS_POLITICS;
  if (!E || !C || !P) throw new Error("alpha-v17.js requiere los motores económico, industrial y político.");

  const oldCreate = E.createInitialState;
  const oldHydrate = E.hydrateState;
  const oldTickDay = E.tickDay;
  const oldTradeAction = E.tradeAction;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,Number(v)||0));
  const round = (v,d=2) => Number((Number(v)||0).toFixed(d));
  const uid = () => crypto.randomUUID?.() || `nexus-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const RESOURCE_IDS = ["electricity","food","fuel","steel","vehicles","electronics","machinery","medicines"];
  const regionCache = new WeakMap();
  const normalizedRegionStates = new WeakSet();

  function country(state,id=state.controlledCountryId){
    return state.countries.find(c=>c.id===id) || state.countries[0];
  }

  function allRegions(state){
    const cached=regionCache.get(state);if(cached)return cached;
    const result=[],seen=new Set();
    for(const r of state.regions||[])if(!seen.has(r.id)){seen.add(r.id);result.push(r)}
    for(const c of state.countries||[])for(const r of c.strategicRegions||[])if(!seen.has(r.id)){seen.add(r.id);result.push(r)}
    regionCache.set(state,result);return result;
  }

  function normalizeRegionOwnership(state){
    if(normalizedRegionStates.has(state))return;
    for(const r of allRegions(state)){
      const inferred=r.countryId || state.countries.find(c=>(c.strategicRegions||[]).includes(r))?.id || "ESP";
      r.originalOwnerId ||= inferred;
      r.countryId ||= r.originalOwnerId;
      r.ownerId ||= r.originalOwnerId;
      r.controllerId ||= r.ownerId;
      r.buildings ||= [];
      r.capacitySlots ??= 8;
    }
    normalizedRegionStates.add(state);
  }

  function getCountryRegions(state,countryId){
    normalizeRegionOwnership(state);
    return allRegions(state).filter(r=>r.ownerId===countryId);
  }

  function getRegion(state,countryId,regionId){
    if(regionId==null){regionId=countryId;countryId=null}
    return allRegions(state).find(r=>r.id===regionId && (!countryId || r.ownerId===countryId || r.controllerId===countryId || r.originalOwnerId===countryId)) || allRegions(state).find(r=>r.id===regionId) || null;
  }

  function facilitiesInRegion(state,owner,regionId){
    const c=typeof owner==="string"?country(state,owner):owner;
    const r=getRegion(state,null,regionId),items=[];
    for(const f of r?.buildings||[])if(!f.countryId || f.countryId===c.id || r.ownerId===c.id)items.push(f);
    for(const holder of state.countries||[])for(const f of holder.facilities||[])if(f.regionId===regionId && (f.countryId===c.id || holder.id===c.id))items.push(f);
    const seen=new Set();return items.filter(f=>{f.id ||= uid();if(seen.has(f.id))return false;seen.add(f.id);return true});
  }

  function facilitiesForCountry(state,countryId){
    const c=country(state,countryId),result=[];
    for(const r of getCountryRegions(state,c.id))for(const f of facilitiesInRegion(state,c,r.id))result.push({...f,region:r,place:r.name});
    const seen=new Set();return result.filter(f=>{if(seen.has(f.id))return false;seen.add(f.id);return true});
  }

  function regionResources(state,countryId,regionId){
    const c=country(state,countryId),r=getRegion(state,c.id,regionId);if(!r)return[];
    const output={...(r.resourceOutput||{})};
    for(const f of facilitiesInRegion(state,c,r.id)){
      const def=C.buildings.find(x=>x.id===f.typeId);
      for(const [key,value] of Object.entries(def?.resourceEffects||{}))output[key]=round((output[key]||0)+Number(value||0)*(f.level||1),1);
    }
    return Object.entries(output).map(([id,value])=>{
      const def=(state.resourceDefinitions||E.resourceDefinitions||[]).find(x=>x.id===id)||{};
      return{id,value:round(value,1),name:def.name||id,icon:def.icon||"📦",unit:def.unit||""};
    }).sort((a,b)=>b.value-a.value);
  }

  function allocateSeats(parties,totalSeats=350){
    const votes=parties.map(p=>Math.max(.01,Number(p.voteShare??p.popularity)||.01));
    const total=votes.reduce((s,v)=>s+v,0)||1;
    const exact=votes.map(v=>v/total*totalSeats),base=exact.map(Math.floor);
    let remaining=totalSeats-base.reduce((s,v)=>s+v,0);
    const order=exact.map((v,i)=>({i,remainder:v-base[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
    for(let i=0;i<remaining;i++)base[order[i%order.length].i]++;
    parties.forEach((p,i)=>{p.seats=base[i]});
    return base;
  }

  function normalizePartyShares(c){
    const parties=c.politics?.parties||[];if(!parties.length)return;
    const total=parties.reduce((s,p)=>s+Math.max(.1,Number(p.popularity)||.1),0)||1;
    for(const p of parties){p.popularity=round(Math.max(.1,p.popularity)/total*100,2);p.voteShare=round(p.popularity,2)}
    allocateSeats(parties);
    const coalition=c.politics.coalition||[];
    c.politics.coalitionSeats=parties.filter(p=>coalition.includes(p.id)).reduce((s,p)=>s+(p.seats||0),0);
    c.politics.coalitionSupport=round(c.politics.coalitionSeats/3.5,1);
  }

  function governmentPerformance(c){
    const e=c.economy,s=c.systems,b=e.monthlyBalance??0;
    return clamp(50+(s.approval-50)*.62+(e.growth-2)*3.2-(e.inflation-2.5)*1.8-(e.unemployment-6)*1.15+clamp(b,-8,8)*.7,4,96);
  }

  function updatePoliticalOpinion(c){
    const parties=c.politics?.parties||[];if(parties.length<2)return;
    const ruling=parties.find(p=>p.id===c.politics.rulingPartyId)||parties[0],performance=governmentPerformance(c);
    const incumbentDelta=clamp((performance-50)*.0035,-.16,.16)+(Math.random()-.5)*.025;
    ruling.popularity=clamp((ruling.popularity||1)+incumbentDelta,.1,85);
    const opposition=parties.filter(p=>p!==ruling),loss=-incumbentDelta;
    for(const p of opposition)p.popularity=clamp((p.popularity||1)+loss/opposition.length+(Math.random()-.5)*.014,.1,85);
    normalizePartyShares(c);
    c.politics.performanceIndex=round(performance,1);
  }

  function enqueueDecision(state,decision){
    state.decisions ||= [];
    if(state.decisions.some(d=>d.status==="pending"&&d.dedupeKey&&d.dedupeKey===decision.dedupeKey))return null;
    const item={id:uid(),date:state.date,status:"pending",targetCountryId:state.controlledCountryId,category:"state",priority:"normal",...decision};
    state.decisions.unshift(item);state.decisions=state.decisions.slice(0,80);
    E.pushEvent(state,"decision",item.title,item.text);
    return item;
  }

  function runElection(state,c,automatic=false){
    const parties=c.politics.parties||[];if(!parties.length)return{ok:false,message:"No hay partidos configurados."};
    const previous=new Map(parties.map(p=>[p.id,p.seats||0])),ruling=parties.find(p=>p.id===c.politics.rulingPartyId)||parties[0];
    const performance=governmentPerformance(c),incumbentBonus=(performance-50)*.28;
    const scores=parties.map((p,i)=>({p,score:Math.max(.2,(p.popularity||1)+(p===ruling?incumbentBonus:-incumbentBonus/Math.max(1,parties.length-1))+(Math.random()-.5)*2.8+i*.0001)}));
    const total=scores.reduce((s,x)=>s+x.score,0)||1;
    for(const x of scores){x.p.popularity=round(x.score/total*100,2);x.p.voteShare=x.p.popularity}
    allocateSeats(parties);
    const winner=[...parties].sort((a,b)=>b.seats-a.seats||b.voteShare-a.voteShare)[0];
    for(const p of parties){p.seatChange=(p.seats||0)-(previous.get(p.id)||0)}
    c.politics.rulingPartyId=winner.id;c.politics.coalition=[winner.id];c.politics.daysToElection=c.politics.electionCycleDays;c.politics.lastElectionDate=state.date;c.politics.lastElectionPerformance=round(performance,1);
    c.government.ideology=winner.ideology;c.government.legitimacy=round(clamp(48+winner.voteShare*.52+(performance-50)*.08,20,96),1);
    normalizePartyShares(c);
    const change=winner.seatChange||0;
    E.pushEvent(state,"politics",`Elecciones en ${c.name}`,`${winner.name} obtiene ${winner.seats} escaños (${change>=0?"+":""}${change}) con un rendimiento gubernamental de ${round(performance,1)}/100.`);
    if(c.id===state.controlledCountryId && winner.seats<176){
      const partners=parties.filter(p=>p.id!==winner.id).sort((a,b)=>b.seats-a.seats).slice(0,3);
      enqueueDecision(state,{category:"election",priority:"high",dedupeKey:`coalition-${state.date}-${c.id}`,title:"Formación de gobierno",text:`${winner.name} ha ganado sin mayoría absoluta. Debes decidir con quién negociar.`,options:[...partners.map(p=>({id:`coalition:${p.id}`,label:`Pactar con ${p.name}`,description:`Coalición de ${winner.seats+p.seats} escaños.`})),{id:"minority",label:"Gobernar en minoría",description:"Más autonomía, pero menor estabilidad parlamentaria."}]});
    }
    return{ok:true,message:`Elecciones celebradas: ${winner.name}, ${winner.seats} escaños (${change>=0?"+":""}${change}).`,winnerId:winner.id,seats:winner.seats,automatic};
  }

  function callElection(state){
    const c=country(state),reg=P.getRegime(c.politics.regimeId);
    if(reg.pluralism<35)return{ok:false,message:"El régimen actual no permite elecciones competitivas."};
    if(c.politics.politicalCapital<18)return{ok:false,message:"Capital político insuficiente."};
    c.politics.politicalCapital=round(c.politics.politicalCapital-18,1);
    return runElection(state,c,false);
  }

  function ensureTradeContract(state,aId,bId,quality=1){
    state.tradeContracts ||= [];
    let contract=state.tradeContracts.find(x=>x.active!==false&&x.countries?.includes(aId)&&x.countries?.includes(bId));
    if(contract){contract.quality=Math.max(contract.quality||1,quality);return contract}
    const a=country(state,aId),b=country(state,bId),scale=Math.max(.12,Math.min(a.economy.gdp,b.economy.gdp)*.000035);
    contract={id:uid(),countries:[aId,bId],active:true,startDate:state.date,quality,monthlyBenefit:round(scale*quality,2),resourceCoverage:1};
    state.tradeContracts.push(contract);return contract;
  }

  function applyTradeBenefits(state,monthly=false){
    for(const c of state.countries){c.economy.tradeAgreementIncome=0;c.tradeImportCoverage={}}
    for(const contract of state.tradeContracts||[]){
      if(contract.active===false)continue;
      for(const id of contract.countries){
        const c=country(state,id);if(c.sovereign===false)continue;
        const benefit=round((contract.monthlyBenefit||.1)*(contract.quality||1),2);
        c.economy.tradeAgreementIncome=round((c.economy.tradeAgreementIncome||0)+benefit,2);
        if(monthly){c.economy.treasury=round(c.economy.treasury+benefit,2);c.economy.exports=round((c.economy.exports||0)+benefit,2);c.economy.growth=round(clamp(c.economy.growth+.015,-8,12),2)}
      }
    }
    for(const c of state.countries){
      if(c.sovereign===false)continue;
      const contracts=(state.tradeContracts||[]).filter(x=>x.active!==false&&x.countries?.includes(c.id)).length;
      if(!contracts)continue;
      c.resourceBalance ||= {};
      for(const id of RESOURCE_IDS){
        const row=c.resourceBalance[id];if(!row)continue;
        const deficit=Math.max(0,(row.consumption||0)-(row.production||0)),imports=round(deficit+Math.max(.1,(row.consumption||1)*.025)*Math.min(3,contracts),1);
        row.domesticBalance=round((row.production||0)-(row.consumption||0),1);row.imports=imports;row.balance=round((row.production||0)+imports-(row.consumption||0),1);c.tradeImportCoverage[id]=imports;
        c.resourceInventory ||= {};c.resourceInventory[id]=round((c.resourceInventory[id]||0)+imports/30,1);
      }
      c.economy.tradeBalance=round(Math.max(0,(c.economy.exports||0)-(c.economy.imports||0))+(c.economy.tradeAgreementIncome||0),2);
    }
  }

  function tradeAction(state,targetId,type){
    const actor=country(state),before=actor.economy.treasury,result=oldTradeAction(state,targetId,type);
    if(result?.ok&&type==="trade"){
      actor.economy.treasury=Math.max(actor.economy.treasury,before);
      const target=country(state,targetId),contract=ensureTradeContract(state,actor.id,target.id,1);
      target.relations[actor.id]=clamp((target.relations[actor.id]??50)+7,0,100);
      applyTradeBenefits(state,false);
      result.message=`Acuerdo rentable con ${target.name}: +${contract.monthlyBenefit.toLocaleString("es-ES")} mil M€/mes por país y cobertura positiva de recursos importados.`;
      E.pushEvent(state,"trade",`Corredor comercial rentable: ${actor.name}–${target.name}`,"Las importaciones cubren déficits físicos y el acuerdo genera ingresos, actividad y reservas para ambos socios.");
    }
    return result;
  }

  function weighted(a,b,wa,wb){return round(((Number(a)||0)*wa+(Number(b)||0)*wb)/Math.max(.0001,wa+wb),2)}

  function recalculateUnifiedEconomy(state,c){
    const facilities=facilitiesForCountry(state,c.id);let jobs=0,output=0,capacity=0,generation=0,use=0;
    for(const f of facilities){const def=C.buildings.find(x=>x.id===f.typeId);if(!def)continue;const level=f.level||1;jobs+=(def.jobs||0)*level;output+=(def.output||0)*level;capacity+=level;if((def.energy||0)>=0)generation+=(def.energy||0)*level;else use+=Math.abs(def.energy||0)*level}
    c.economicModel ||= {};c.economicModel.facilityJobs=Math.round(jobs);c.economicModel.industrialOutput=round(output,1);c.economicModel.capacityScore=round(capacity+output,1);
    c.economicModel.energySupply=round(Math.max(1,c.economy.population*.12+c.systems.energy*.14+c.systems.renewables*.04+generation),1);
    c.economicModel.energyDemand=round(Math.max(1,c.economy.population*.09+c.systems.industry*.045+use*.35),1);
    c.economicModel.industrialUtilization=round(clamp(55+c.economy.confidence*.25+c.systems.logistics*.15,30,100),1);
    c.laborModel ||= {};c.laborModel.facilityJobs=Math.round(jobs);c.economy.productivity=round((c.systems.industry+c.systems.technology+c.systems.logistics)/3,1);
    E.calculateResourceBalance?.(state,c);applyTradeBenefits(state,false);
  }

  function transferFacilities(state,winner,loser,regions){
    winner.facilities ||= [];loser.facilities ||= [];
    const moved=loser.facilities.splice(0);
    for(const f of moved){f.countryId=winner.id;winner.facilities.push(f)}
    for(const r of regions)for(const f of r.buildings||[])f.countryId=winner.id;
  }

  function absorbCountry(state,winner,loser,regions,war){
    const wp=Math.max(.001,winner.economy.population||0),lp=Math.max(.001,loser.economy.population||0),wg=Math.max(.001,winner.economy.gdp||0),lg=Math.max(.001,loser.economy.gdp||0);
    loser.absorbedSnapshot={date:state.date,economy:JSON.parse(JSON.stringify(loser.economy)),systems:JSON.parse(JSON.stringify(loser.systems)),units:(loser.units||[]).length,facilities:(loser.facilities||[]).length};
    for(const r of regions){r.previousOwnerId=r.ownerId||loser.id;r.ownerId=winner.id;r.controllerId=winner.id;r.annexedDate=state.date;r.countryId=winner.id;r.integration=42}
    const additive=["gdp","population","treasury","exports","imports","reserves"];
    for(const key of additive)winner.economy[key]=round((winner.economy[key]||0)+(loser.economy[key]||0),key==="population"?4:2);
    for(const key of ["growth","inflation","unemployment","taxRate","confidence","productivity","wageIndex","housingPressure"])winner.economy[key]=weighted(winner.economy[key],loser.economy[key],wg,lg);
    winner.economy.debtRatio=weighted(winner.economy.debtRatio,loser.economy.debtRatio,wg,lg);
    for(const key of Object.keys(winner.systems||{}))if(Number.isFinite(Number(winner.systems[key]))&&Number.isFinite(Number(loser.systems?.[key])))winner.systems[key]=weighted(winner.systems[key],loser.systems[key],wp,lp);
    winner.systems.stability=clamp(winner.systems.stability-4,5,100);winner.systems.approval=clamp(winner.systems.approval-2,5,100);
    for(const [key,value] of Object.entries(loser.resourceInventory||{})){winner.resourceInventory ||= {};winner.resourceInventory[key]=round((winner.resourceInventory[key]||0)+Number(value||0),1)}
    for(const [key,value] of Object.entries(loser.strategicStockpile||{})){winner.strategicStockpile ||= {};winner.strategicStockpile[key]=weighted(winner.strategicStockpile[key],value,wp,lp)}
    for(const u of loser.units||[]){u.countryId=winner.id;u.status="integrada";winner.units.push(u)}loser.units=[];
    for(const q of loser.productionQueue||[]){q.targetCountryId=winner.id;q.countryId=winner.id;winner.productionQueue.push(q)}loser.productionQueue=[];
    transferFacilities(state,winner,loser,regions);
    for(const company of state.companies||[])if(company.countryId===loser.id){company.previousCountryId=loser.id;company.countryId=winner.id}
    winner.annexedCountries ||= [];winner.annexedCountries=winner.annexedCountries.filter(x=>x.countryId!==loser.id);winner.annexedCountries.push({countryId:loser.id,name:loser.name,date:state.date,type:"total",regions:regions.map(r=>r.id),absorbedGDP:lg,absorbedPopulation:lp});
    winner.absorbedCountries ||= [];winner.absorbedCountries.push(loser.id);
    loser.sovereign=false;loser.annexedBy=winner.id;loser.annexedDate=state.date;loser.government.regime=`Territorio integrado en ${winner.name}`;loser.facilities=[];loser.projects=[];
    for(const key of additive)loser.economy[key]=0;loser.economy.tradeBalance=0;
    for(const other of state.countries){if(other.id===loser.id)continue;if(other.relations?.[loser.id]!=null){other.relations[winner.id]=round(weighted(other.relations[winner.id]??50,other.relations[loser.id],wg,lg),1)}}
    for(const contract of state.tradeContracts||[])if(contract.countries?.includes(loser.id)){contract.countries=contract.countries.map(id=>id===loser.id?winner.id:id);if(new Set(contract.countries).size<2)contract.active=false}
    war.ended=true;war.end ||= state.date;war.winner=winner.id;war.loser=loser.id;war.result=`Anexión integral de ${loser.name}`;war.settlement={status:"resolved",resolved:true,type:"total-annexation",date:state.date,regions:regions.map(r=>r.id),absorbed:true};
    state.world.tension=clamp((state.world.tension||0)+18,0,100);state.selectedCountryId=winner.id;state.selectedRegionId=regions[0]?.id||state.selectedRegionId;
    recalculateUnifiedEconomy(state,winner);
  }

  function annexCountry(state,warId){
    const option=E.warSettlementOptions?.(state,warId);if(!option?.side)return{ok:false,message:"No participas en esta guerra."};
    if(!option.canAnnexCountry)return{ok:false,message:`No se cumplen las condiciones de anexión total. Ventaja actual: ${option.advantage}.`};
    const winner=country(state,state.controlledCountryId),loser=country(state,option.otherId),regions=getCountryRegions(state,loser.id).slice();
    if(!regions.length)return{ok:false,message:"El país derrotado ya no conserva territorios soberanos."};
    absorbCountry(state,winner,loser,regions,option.war);
    enqueueDecision(state,{category:"annexation",priority:"critical",dedupeKey:`annex-${loser.id}-${state.date}`,title:`Integración de ${loser.name}`,text:`Has absorbido ${round(loser.absorbedSnapshot.economy.population,2)} M de habitantes, ${round(loser.absorbedSnapshot.economy.gdp,1)} mil M€ de PIB, sus fuerzas, empresas, recursos e instalaciones. Define el modelo de integración.`,regionIds:regions.map(r=>r.id),sourceCountryId:loser.id,options:[{id:"integration",label:"Integración plena",description:"Más capacidad fiscal; tensión social inicial."},{id:"autonomy",label:"Autonomía territorial",description:"Mejora estabilidad a cambio de gasto público."},{id:"security",label:"Administración de seguridad",description:"Aumenta control y defensa, reduce aprobación."}]});
    E.pushEvent(state,"military",`${loser.name} queda completamente absorbido`,`${winner.name} incorpora territorios, ${round(loser.absorbedSnapshot.economy.population,2)} M de habitantes, PIB, Tesoro, fuerzas armadas, empresas, recursos, instalaciones y proyectos.`);
    return{ok:true,message:`Anexión integral completada: ${regions.length} regiones, población, PIB, Tesoro, ejército, empresas e industria ya pertenecen a ${winner.name}.`};
  }

  function buildInRegion(state,regionId,buildingId){
    const c=country(state),r=getRegion(state,c.id,regionId||state.selectedRegionId),def=C.buildings.find(x=>x.id===buildingId);
    if(!def)return{ok:false,message:"Instalación no encontrada."};if(!r||r.ownerId!==c.id||r.controllerId!==c.id)return{ok:false,message:"Solo puedes construir en una región bajo soberanía y control propios."};
    const facilities=facilitiesInRegion(state,c,r.id);if(facilities.some(f=>f.typeId===buildingId)||c.productionQueue.some(q=>q.kind==="facilityV3"&&q.buildingId===buildingId&&q.targetRegionId===r.id))return{ok:false,message:"Esta capacidad ya existe o está en construcción. Puedes ampliarla."};
    const used=facilities.reduce((s,f)=>s+(C.buildings.find(x=>x.id===f.typeId)?.slots||1),0);if(used+(def.slots||1)>(r.capacitySlots||8))return{ok:false,message:`Capacidad agotada (${used}/${r.capacitySlots||8}). Amplía los slots de la región.`};
    const req=def.requires||{},infra=r.infra??c.systems.logistics,energy=r.energy??c.systems.energy,stability=r.stability??c.systems.stability;
    if(req.infra&&infra<req.infra)return{ok:false,message:`Infraestructura insuficiente: ${round(infra,0)}/${req.infra}.`};if(req.energy&&energy<req.energy)return{ok:false,message:`Energía insuficiente: ${round(energy,0)}/${req.energy}.`};if(req.technology&&c.systems.technology<req.technology)return{ok:false,message:`Tecnología insuficiente: ${round(c.systems.technology,0)}/${req.technology}.`};if(req.stability&&stability<req.stability)return{ok:false,message:`Estabilidad insuficiente: ${round(stability,0)}/${req.stability}.`};
    const parallel=c.productionQueue.filter(q=>q.kind==="facilityV3").length,cost=round(def.cost*(1+parallel*.025),2);if(c.economy.treasury<cost)return{ok:false,message:`Tesorería insuficiente: ${cost} mil M€.`};
    const days=Math.max(45,Math.round((def.months||12)*30*clamp(92/Math.max(25,c.systems.industry),.72,1.9)));c.economy.treasury=round(c.economy.treasury-cost,2);
    c.productionQueue.push({id:uid(),kind:"facilityV3",buildingId,targetCountryId:c.id,targetRegionId:r.id,regionId:r.id,name:def.name,totalDays:days,daysRemaining:days,chargedCost:cost,cost,status:"construction",startedDate:state.date,commitAttempts:0});
    E.pushEvent(state,"industry",`Construcción en territorio integrado: ${def.name}`,`${r.name} · ${days} días · ${cost} mil M€.`);return{ok:true,message:`${def.name} inicia obras en ${r.name}.`};
  }

  function upgradeBuilding(state,regionId,facilityId){
    const c=country(state),r=getRegion(state,c.id,regionId||state.selectedRegionId);if(!r||r.ownerId!==c.id)return{ok:false,message:"La región no está bajo tu soberanía."};
    const f=facilitiesInRegion(state,c,r.id).find(x=>x.id===facilityId),def=C.buildings.find(x=>x.id===f?.typeId);if(!f||!def)return{ok:false,message:"Instalación no encontrada."};if((f.level||1)>=(def.maxLevel||5))return{ok:false,message:"La instalación ya está al máximo nivel."};
    const cost=round(def.cost*(.65+(f.level||1)*.28),2);if(c.economy.treasury<cost)return{ok:false,message:"Tesorería insuficiente."};c.economy.treasury=round(c.economy.treasury-cost,2);f.level=(f.level||1)+1;f.condition=100;r.industry=clamp((r.industry||50)+(def.output||1)*.12,0,100);recalculateUnifiedEconomy(state,c);return{ok:true,message:`${def.name} ampliada a nivel ${f.level} en ${r.name}.`};
  }

  function expandRegionSlots(state,countryId,regionId){
    const c=country(state),r=getRegion(state,c.id,regionId||state.selectedRegionId);if(!r||r.ownerId!==c.id)return{ok:false,message:"La región no está bajo tu soberanía."};const level=r.slotExpansionLevel||0,cost=round(.45+level*.22+(r.capacitySlots||8)*.025,2);if(c.economy.treasury<cost)return{ok:false,message:`Se necesitan ${cost} mil M€.`};c.economy.treasury=round(c.economy.treasury-cost,2);r.capacitySlots=(r.capacitySlots||8)+2;r.slotExpansionLevel=level+1;r.infra=clamp((r.infra||50)+.6,0,100);return{ok:true,message:`${r.name}: capacidad ampliada a ${r.capacitySlots} slots.`};
  }

  function investRegion(state,regionId,type){
    const c=country(state),r=getRegion(state,c.id,regionId||state.selectedRegionId),costs={infrastructure:8,industry:10,energy:9,stability:5},gains={infrastructure:4,industry:4,energy:5,stability:3},cost=costs[type];if(!r||r.ownerId!==c.id)return{ok:false,message:"La región no está bajo tu soberanía."};if(!cost)return{ok:false,message:"Inversión desconocida."};if(c.economy.treasury<cost)return{ok:false,message:"Tesorería insuficiente."};c.economy.treasury=round(c.economy.treasury-cost,2);const key=type==="infrastructure"?"infra":type;r[key]=clamp((r[key]||50)+gains[type],0,100);if(type==="industry")r.gdp=round((r.gdp||0)*1.015,2);E.pushEvent(state,"region",`Inversión en ${r.name}`,`Se destinan ${cost} mil M€ a ${type}.`);recalculateUnifiedEconomy(state,c);return{ok:true,message:"Inversión regional aprobada."};
  }

  function createAIWar(state,attacker,defender){
    if(!attacker||!defender||attacker.id===defender.id||attacker.sovereign===false||defender.sovereign===false)return null;if((state.wars||[]).some(w=>!w.ended&&(w.attacker===attacker.id||w.defender===attacker.id||w.attacker===defender.id||w.defender===defender.id)))return null;
    const midpoint={lat:((attacker.map?.lat||0)+(defender.map?.lat||0))/2,lng:((attacker.map?.lng||0)+(defender.map?.lng||0))/2};
    const war={id:uid(),attacker:attacker.id,defender:defender.id,start:state.date,days:0,months:0,warScore:0,territoryControl:0,ended:false,attackerLosses:0,defenderLosses:0,civilianLosses:0,battles:[],operations:[],theaters:[],lastBattle:null,front:midpoint,objective:`Forzar concesiones de ${defender.name}`,settlement:{status:"active",resolved:false,type:null,date:null},aiInitiated:true};
    state.wars.push(war);attacker.relations[defender.id]=3;defender.relations[attacker.id]=3;state.world.tension=clamp((state.world.tension||0)+10,0,100);E.ensureWarDetail?.(state,war);E.pushEvent(state,"military",`La IA inicia un conflicto: ${attacker.name} contra ${defender.name}`,"La crisis diplomática escala a operaciones militares autónomas.");
    if(defender.id===state.controlledCountryId||attacker.id===state.controlledCountryId)enqueueDecision(state,{category:"security",priority:"critical",dedupeKey:`war-${war.id}`,title:`Crisis militar con ${attacker.id===state.controlledCountryId?defender.name:attacker.name}`,text:"La guerra exige una respuesta inmediata del gabinete.",sourceCountryId:attacker.id===state.controlledCountryId?defender.id:attacker.id,options:[{id:"mobilize",label:"Movilización general",description:"+8 preparación; coste presupuestario."},{id:"sanctions",label:"Sanciones totales",description:"Aumenta presión y tensión mundial."},{id:"deescalate",label:"Canal diplomático",description:"Recupera relación a costa de capital político."}]});
    return war;
  }

  function runAutonomousAI(state,options={}){
    state.aiDirector ||= {lastActionDay:-99,actions:[],conflictsStarted:0};
    const sovereign=state.countries.filter(c=>c.sovereign!==false),controlled=country(state),result=[];
    if(options.force&&options.action==="conflict"){
      const a=country(state,options.attackerId||sovereign.find(c=>c.id!==controlled.id)?.id),d=country(state,options.defenderId||controlled.id),war=createAIWar(state,a,d);if(war)result.push({type:"conflict",warId:war.id});return result;
    }
    const actors=sovereign.filter(c=>c.id!==controlled.id).sort(()=>Math.random()-.5).slice(0,3);
    for(const actor of actors){
      actor.ai ||= {focus:"Crecimiento",cooldown:0};actor.ai.geopoliticalCooldown=Math.max(0,(actor.ai.geopoliticalCooldown||0)-7);if(actor.ai.geopoliticalCooldown>0)continue;
      const targets=sovereign.filter(c=>c.id!==actor.id&&!state.wars.some(w=>!w.ended&&(w.attacker===c.id||w.defender===c.id))).sort((a,b)=>(actor.relations[a.id]??50)-(actor.relations[b.id]??50));const target=targets[0];if(!target)continue;const relation=actor.relations[target.id]??50,roll=Math.random();
      if(relation<32&&(actor.militaryReadiness||0)>50&&roll<.34&&state.wars.filter(w=>!w.ended).length<5){const war=createAIWar(state,actor,target);if(war){result.push({type:"conflict",actor:actor.id,target:target.id});state.aiDirector.conflictsStarted++;actor.ai.geopoliticalCooldown=42}}
      else if(relation<48&&roll<.58){actor.relations[target.id]=clamp(relation-6,0,100);target.relations[actor.id]=clamp((target.relations[actor.id]??50)-4,0,100);state.world.tension=clamp((state.world.tension||0)+1.2,0,100);E.pushEvent(state,"diplomacy",`${actor.name} sanciona a ${target.name}`,"La IA aplica presión económica y deteriora la relación bilateral.");result.push({type:"sanction",actor:actor.id,target:target.id});actor.ai.geopoliticalCooldown=21}
      else {const partner=sovereign.filter(c=>c.id!==actor.id).sort((a,b)=>(actor.relations[b.id]??50)-(actor.relations[a.id]??50))[0];if(!partner)continue;if(partner.id===controlled.id){enqueueDecision(state,{category:"trade",priority:"normal",dedupeKey:`trade-offer-${actor.id}`,title:`Oferta comercial de ${actor.name}`,text:"Propone un corredor de suministros e inversión con beneficios mensuales y cobertura de déficits.",sourceCountryId:actor.id,options:[{id:"acceptTrade",label:"Aceptar",description:"Activa ingresos y recursos para ambos países."},{id:"counterTrade",label:"Negociar mejores términos",description:"Mayor beneficio, pequeño coste diplomático."},{id:"reject",label:"Rechazar",description:"Sin coste; la relación se enfría."}]});result.push({type:"proposal",actor:actor.id,target:partner.id})}else{ensureTradeContract(state,actor.id,partner.id,.8);actor.relations[partner.id]=clamp((actor.relations[partner.id]??50)+3,0,100);partner.relations[actor.id]=clamp((partner.relations[actor.id]??50)+3,0,100);E.pushEvent(state,"trade",`${actor.name} y ${partner.name} amplían el comercio`,"La IA abre un corredor económico bilateral.");result.push({type:"trade",actor:actor.id,target:partner.id})}actor.ai.geopoliticalCooldown=28}
    }
    state.aiDirector.lastActionDay=state.dayIndex;state.aiDirector.actions.unshift(...result.map(x=>({...x,date:state.date})));state.aiDirector.actions=state.aiDirector.actions.slice(0,100);return result;
  }

  function resolveDecision(state,decisionId,choiceId){
    const d=(state.decisions||[]).find(x=>x.id===decisionId&&x.status==="pending");if(!d)return{ok:false,message:"La decisión ya no está disponible."};const c=country(state),source=country(state,d.sourceCountryId);
    if(choiceId.startsWith("coalition:")){const partyId=choiceId.split(":")[1];c.politics.coalition=[c.politics.rulingPartyId,partyId];normalizePartyShares(c);c.systems.stability=clamp(c.systems.stability+1.5,0,100)}
    else if(choiceId==="minority"){c.politics.coalition=[c.politics.rulingPartyId];c.systems.stability=clamp(c.systems.stability-1.5,0,100);normalizePartyShares(c)}
    else if(choiceId==="acceptTrade"){ensureTradeContract(state,c.id,source.id,1);c.relations[source.id]=clamp((c.relations[source.id]??50)+5,0,100);source.relations[c.id]=clamp((source.relations[c.id]??50)+5,0,100);applyTradeBenefits(state,false)}
    else if(choiceId==="counterTrade"){const contract=ensureTradeContract(state,c.id,source.id,1.25);contract.quality=1.25;c.economy.treasury=round(Math.max(0,c.economy.treasury-.5),2);applyTradeBenefits(state,false)}
    else if(choiceId==="reject"){if(source)source.relations[c.id]=clamp((source.relations[c.id]??50)-3,0,100)}
    else if(choiceId==="mobilize"){c.militaryReadiness=clamp((c.militaryReadiness||50)+8,0,100);c.economy.treasury=round(Math.max(0,c.economy.treasury-2),2);c.strategicStockpile.munitions=clamp((c.strategicStockpile.munitions||50)+4,0,100)}
    else if(choiceId==="sanctions"){if(source){c.relations[source.id]=clamp((c.relations[source.id]??50)-12,0,100);source.relations[c.id]=clamp((source.relations[c.id]??50)-10,0,100)}state.world.tension=clamp((state.world.tension||0)+2,0,100)}
    else if(choiceId==="deescalate"){if(source){c.relations[source.id]=clamp((c.relations[source.id]??20)+8,0,100);source.relations[c.id]=clamp((source.relations[c.id]??20)+5,0,100)}c.politics.politicalCapital=clamp(c.politics.politicalCapital-3,0,100)}
    else if(["integration","autonomy","security"].includes(choiceId)){const regions=(d.regionIds||[]).map(id=>getRegion(state,c.id,id)).filter(Boolean);if(choiceId==="integration"){for(const r of regions){r.integration=clamp((r.integration||40)+18,0,100);r.stability=clamp((r.stability||50)-2,0,100)}c.economy.taxRate=clamp(c.economy.taxRate+.2,10,52)}if(choiceId==="autonomy"){for(const r of regions){r.integration=clamp((r.integration||40)+10,0,100);r.stability=clamp((r.stability||50)+7,0,100)}c.economy.treasury=round(Math.max(0,c.economy.treasury-Math.max(1,regions.reduce((s,r)=>s+(r.gdp||0),0)*.004)),2)}if(choiceId==="security"){for(const r of regions){r.integration=clamp((r.integration||40)+8,0,100);r.defense=clamp((r.defense||45)+12,0,100);r.stability=clamp((r.stability||50)-3,0,100)}c.systems.approval=clamp(c.systems.approval-2,0,100)}}
    else if(choiceId==="infrastructure"){c.budgets.infrastructure=clamp(c.budgets.infrastructure+.5,.5,20);c.economy.treasury=round(Math.max(0,c.economy.treasury-1),2)}
    else if(choiceId==="social"){c.budgets.health=clamp(c.budgets.health+.3,.5,20);c.budgets.education=clamp(c.budgets.education+.3,.5,20);c.systems.approval=clamp(c.systems.approval+1.2,0,100)}
    else if(choiceId==="defense"){c.budgets.defense=clamp(c.budgets.defense+.5,.5,20);c.militaryReadiness=clamp(c.militaryReadiness+3,0,100)}
    d.status="resolved";d.resolvedDate=state.date;d.choiceId=choiceId;state.decisionHistory ||= [];state.decisionHistory.unshift(d);E.pushEvent(state,"decision",`Decisión aplicada: ${d.title}`,d.options?.find(x=>x.id===choiceId)?.label||choiceId);return{ok:true,message:"Decisión aplicada y registrada en el Resumen."};
  }

  function maybeNationalBriefing(state,summary){
    if(!summary?.crossedMonth)return;const c=country(state);if((state.decisions||[]).some(d=>d.status==="pending"&&d.targetCountryId===c.id))return;
    enqueueDecision(state,{category:"cabinet",priority:"normal",dedupeKey:`brief-${state.date.slice(0,7)}-${c.id}`,title:"Consejo de ministros mensual",text:`Balance ${round(c.economy.monthlyBalance||0,1)} mil M€; aprobación ${round(c.systems.approval,1)}%; tensión mundial ${round(state.world.tension,1)}%. Elige la prioridad del mes.`,options:[{id:"infrastructure",label:"Infraestructura",description:"Aumenta inversión y capacidad territorial."},{id:"social",label:"Servicios públicos",description:"Refuerza aprobación, salud y educación."},{id:"defense",label:"Seguridad nacional",description:"Mejora preparación y presupuesto militar."}]});
  }

  function ensureV17State(state){
    state.version="1.7-alpha";state.decisions ||= [];state.decisionHistory ||= [];state.tradeContracts ||= [];state.aiDirector ||= {lastActionDay:-99,actions:[],conflictsStarted:0};normalizeRegionOwnership(state);
    for(const c of state.countries){c.sovereign ??= true;c.annexedCountries ||= [];c.absorbedCountries ||= [];c.facilities ||= [];c.units ||= [];c.productionQueue ||= [];if(c.sovereign!==false)normalizePartyShares(c)}
    applyTradeBenefits(state,false);return state;
  }

  function hydrateV17(state){state=oldHydrate(state);regionCache.delete(state);normalizedRegionStates.delete(state);return ensureV17State(state)}
  function createInitialState(){const state=ensureV17State(oldCreate());E.pushEvent(state,"system","NEXUS Global Alpha v1.7","Anexión integral, elecciones reactivas, comercio beneficioso, IA geopolítica y centro de decisiones activados.");return state}

  function tickDay(state){
    ensureV17State(state);const automatic=state.countries.filter(c=>c.sovereign!==false&&c.politics?.daysToElection===1).map(c=>c.id),summary=oldTickDay(state);
    for(const c of state.countries.filter(c=>c.sovereign!==false)){updatePoliticalOpinion(c);if(automatic.includes(c.id))runElection(state,c,true)}
    applyTradeBenefits(state,Boolean(summary?.crossedMonth));if((state.dayIndex||0)%7===0)runAutonomousAI(state);maybeNationalBriefing(state,summary);
    for(const c of state.countries.filter(c=>c.sovereign!==false))if(c.absorbedCountries?.length)recalculateUnifiedEconomy(state,c);
    state.version="1.7-alpha";
    return summary;
  }

  Object.assign(E,{createInitialState,hydrateState:hydrateV17,tickDay,getCountryRegions,getRegion,facilitiesInRegion,facilitiesForCountry,regionResources,callElection,runElection,tradeAction,applyTradeBenefits,annexCountry,buildInRegion,upgradeBuilding,expandRegionSlots,investRegion,runAutonomousAI,createAIWar,enqueueDecision,resolveDecision,recalculateUnifiedEconomy,version17:true});
})();
