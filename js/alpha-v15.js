"use strict";

/* NEXUS Global Alpha v1.5
   Correcciones de integridad para colas, inventario militar, frentes,
   resultados de guerra, anexiones y coaliciones parlamentarias.
*/
(() => {
  const E = window.NEXUS_ECONOMY;
  const C = window.NEXUS_CATALOG;
  if (!E || !C) throw new Error("alpha-v15.js requiere NEXUS_ECONOMY y NEXUS_CATALOG.");

  const oldCreate = E.createInitialState;
  const oldHydrate = E.hydrateState;
  const oldTickDay = E.tickDay;
  const oldBuildInRegion = E.buildInRegion;
  const oldQueueUnitBatch = E.queueUnitBatch;

  const clamp = (v,a,b) => Math.max(a,Math.min(b,Number(v)||0));
  const round = (v,d=2) => Number((Number(v)||0).toFixed(d));
  const uid = () => crypto.randomUUID?.() || `nexus-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const OCCUPATION_TYPES = new Set(["infantry","mechanized","armor","artillery","airDefense","rocketArtillery","fighter","drone","bomber","transport"]);

  function country(state,id){ return E.getCountry(state,id); }
  function regions(state,id){ return E.getCountryRegions?.(state,id) || []; }
  function regionById(state,id){
    for (const c of state.countries) {
      const found = regions(state,c.id).find(r=>r.id===id);
      if (found) return {country:c,region:found};
    }
    return null;
  }

  function normalizeUnit(state,c,u,index=0){
    const def=state.unitCatalog.find(x=>x.id===u.typeId);
    u.id ||= uid();
    u.countryId ||= c.id;
    u.name ||= def?.name || u.typeId || "Unidad";
    u.quantity = Math.max(0,Math.floor(Number(u.quantity ?? u.count ?? u.amount ?? 1) || 0));
    u.readiness = clamp(u.readiness ?? 68,0,100);
    u.experience = clamp(u.experience ?? 20,0,100);
    u.strength = clamp(u.strength ?? 100,0,100);
    u.status ||= "desplegada";
    const own=regions(state,c.id);
    if (!u.regionId || !regionById(state,u.regionId)) u.regionId=own[index%Math.max(1,own.length)]?.id || null;
    const rr=regionById(state,u.regionId)?.region || own[0];
    if (rr && !u.movement) { u.lat=Number.isFinite(u.lat)?u.lat:rr.lat; u.lng=Number.isFinite(u.lng)?u.lng:rr.lng; }
    return u;
  }

  function normalizeQueue(state,c,q){
    q.id ||= uid();
    if (q.kind === "facilityV3") {
      q.targetCountryId ||= c.id;
      q.targetRegionId ||= q.regionId || regions(state,c.id)[0]?.id || null;
      q.regionId ||= q.targetRegionId;
      q.totalDays = Math.max(1,Number(q.totalDays ?? (q.totalMonths||q.monthsRemaining||1)*30) || 1);
      q.daysRemaining = Math.max(0,Number(q.daysRemaining ?? q.totalDays) || 0);
      q.status ||= "construction";
      q.chargedCost = Number(q.chargedCost ?? q.cost ?? 0) || 0;
    }
    if (q.kind === "unitV2") {
      q.quantity = Math.max(1,Math.floor(Number(q.quantity)||1));
      q.totalDays = Math.max(1,Number(q.totalDays ?? 30) || 30);
      q.daysRemaining = Math.max(0,Number(q.daysRemaining ?? q.totalDays) || 0);
      const valid = regions(state,c.id).find(r=>r.id===q.regionId && (r.controllerId||r.ownerId||c.id)===c.id);
      q.regionId = valid?.id || regions(state,c.id).find(r=>(r.controllerId||r.ownerId||c.id)===c.id)?.id || regions(state,c.id)[0]?.id || null;
      q.status ||= "production";
    }
    return q;
  }

  function ensurePoliticalSeats(c){
    const parties=c.politics?.parties||[];
    if (!parties.length) return;
    const totalPopularity=Math.max(1,parties.reduce((s,p)=>s+(Number(p.popularity)||0),0));
    let assigned=0;
    parties.forEach((p,i)=>{
      p.axis = Number.isFinite(p.axis) ? p.axis : E.ideologyAxis?.(p.ideology) || 0;
      p.seats = i===parties.length-1 ? Math.max(0,350-assigned) : Math.max(0,Math.round((Number(p.popularity)||0)/totalPopularity*350));
      assigned += p.seats;
    });
    c.politics.coalition ||= [c.politics.rulingPartyId].filter(Boolean);
    c.politics.coalitionSeats=parties.filter(p=>c.politics.coalition.includes(p.id)).reduce((s,p)=>s+(p.seats||0),0);
    c.politics.coalitionSupport=round(c.politics.coalitionSeats/350*100,1);
  }

  function ensureWarState(state,w){
    w.id ||= uid();
    w.days ||= 0; w.battles ||= [];
    w.attackerLosses ||= 0; w.defenderLosses ||= 0; w.civilianLosses ||= 0;
    w.territoryControl ||= 0; w.warScore ||= 0;
    if (!w.settlement) {
      if (w.ended && !w.winner) w.settlement={status:"resolved",resolved:true,type:"ceasefire",date:w.end||state.date};
      else w.settlement={status:w.ended?"pending":"active",resolved:false,type:null,date:null};
    }
    if (w.ended && w.winner && !w.settlement.resolved) w.settlement.status="pending";
    return w;
  }

  function hydrateV15(state){
    state=oldHydrate(state);
    state.version="1.5-alpha";
    state.regionBattles ||= [];
    state.warSettlements ||= [];
    state.constructionLedger ||= {};
    for (const c of state.countries) {
      c.productionQueue ||= [];
      c.units ||= [];
      c.facilities ||= [];
      c.annexedCountries ||= [];
      c.units.forEach((u,i)=>normalizeUnit(state,c,u,i));
      c.productionQueue.forEach(q=>normalizeQueue(state,c,q));
      ensurePoliticalSeats(c);
    }
    for (const w of state.wars||[]) ensureWarState(state,w);
    repairOrphanedFacilities(state);
    return state;
  }

  function createInitialState(){
    const state=hydrateV15(oldCreate());
    E.pushEvent(state,"system","NEXUS Global Alpha v1.5","Colas mensuales corregidas, inventario militar real, frentes regionales, tratados de paz, anexiones y coaliciones operativas.");
    return state;
  }

  function buildInRegion(state,regionId,buildingId){
    const result=oldBuildInRegion(state,regionId,buildingId);
    if (result?.ok) {
      const c=country(state,state.controlledCountryId);
      const q=[...(c.productionQueue||[])].reverse().find(x=>x.kind==="facilityV3"&&x.buildingId===buildingId&&(x.targetRegionId||x.regionId)===(regionId||state.selectedRegionId));
      if (q) state.constructionLedger[q.id]={id:q.id,countryId:c.id,regionId:q.targetRegionId||q.regionId,buildingId:q.buildingId,cost:q.chargedCost||q.cost||0,status:"active",startedDate:state.date};
    }
    return result;
  }

  function queueUnitBatch(state,typeId,regionId,quantity=1){
    const c=country(state,state.controlledCountryId);
    const controlled=regions(state,c.id).filter(r=>(r.controllerId||r.ownerId||c.id)===c.id);
    const valid=controlled.find(r=>r.id===regionId) || controlled[0] || regions(state,c.id)[0];
    const result=oldQueueUnitBatch(state,typeId,valid?.id||null,quantity);
    if (result?.ok) {
      const q=[...(c.productionQueue||[])].reverse().find(x=>x.kind==="unitV2"&&x.typeId===typeId);
      if (q) { q.regionId=valid?.id||q.regionId; q.destinationName=valid?.name||c.name; q.status="production"; }
    }
    return result;
  }

  function repairOrphanedFacilities(state){
    for (const c of state.countries) {
      const ids=new Set((c.productionQueue||[]).map(q=>q.id));
      for (const entry of Object.values(state.constructionLedger||{})) {
        if (entry.countryId!==c.id || entry.status!=="active" || ids.has(entry.id)) continue;
        const rr=regions(state,c.id).find(r=>r.id===entry.regionId);
        const exists=rr && E.facilitiesInRegion?.(state,c,rr.id)?.some(f=>f.typeId===entry.buildingId);
        if (exists) { entry.status="completed"; continue; }
        c.productionQueue.push({id:entry.id,kind:"facilityV3",buildingId:entry.buildingId,targetCountryId:c.id,targetRegionId:entry.regionId,regionId:entry.regionId,name:C.buildings.find(b=>b.id===entry.buildingId)?.name||entry.buildingId,totalDays:30,daysRemaining:1,chargedCost:entry.cost||0,cost:entry.cost||0,status:"recovered",commitAttempts:0});
        E.pushEvent(state,"industry","Proyecto industrial recuperado",`${entry.buildingId} vuelve a la cola tras detectar una pérdida de integridad del guardado.`);
      }
    }
  }

  function reconcileConstructionLedger(state){
    for (const c of state.countries) {
      const queued=new Set((c.productionQueue||[]).filter(q=>q.kind==="facilityV3").map(q=>q.id));
      for (const entry of Object.values(state.constructionLedger||{})) {
        if (entry.countryId!==c.id || entry.status!=="active") continue;
        const rr=regions(state,c.id).find(r=>r.id===entry.regionId);
        const exists=rr && E.facilitiesInRegion?.(state,c,rr.id)?.some(f=>f.typeId===entry.buildingId);
        if (exists) entry.status="completed";
        else if (!queued.has(entry.id)) {
          c.productionQueue.push({id:entry.id,kind:"facilityV3",buildingId:entry.buildingId,targetCountryId:c.id,targetRegionId:entry.regionId,regionId:entry.regionId,name:C.buildings.find(b=>b.id===entry.buildingId)?.name||entry.buildingId,totalDays:1,daysRemaining:1,chargedCost:entry.cost||0,cost:entry.cost||0,status:"recovered",commitAttempts:0});
        }
      }
    }
  }

  function splitUnit(state,unitId,quantity,targetRegionId){
    const c=country(state,state.controlledCountryId),u=c.units.find(x=>x.id===unitId);
    if (!u) return {ok:false,message:"Unidad no encontrada."};
    quantity=Math.floor(Number(quantity)||0);
    if (quantity<1 || quantity>=u.quantity) return {ok:false,message:`La separación debe ser entre 1 y ${Math.max(1,u.quantity-1).toLocaleString("es-ES")}.`};
    const rr=regions(state,c.id).find(r=>r.id===targetRegionId&&(r.controllerId||r.ownerId||c.id)===c.id) || regionById(state,u.regionId)?.region;
    if (!rr) return {ok:false,message:"Región de destino inválida."};
    u.quantity-=quantity;
    const det={...u,id:uid(),quantity,regionId:u.regionId,movement:null,status:"destacamento formado"};
    c.units.push(det);
    const move=E.deployUnit(state,det.id,rr.id,c.id);
    E.pushEvent(state,"military","Nuevo destacamento",`${quantity.toLocaleString("es-ES")} ${state.unitCatalog.find(x=>x.id===u.typeId)?.unitName||"unidades"} se separan para operar desde ${rr.name}.`);
    return {ok:true,message:`Destacamento de ${quantity.toLocaleString("es-ES")} creado. ${move.message||""}`};
  }

  function militaryInventory(state,countryId=state.controlledCountryId){
    const c=country(state,countryId),byType={};
    for (const u of c.units||[]) {
      if (!byType[u.typeId]) byType[u.typeId]={typeId:u.typeId,quantity:0,groups:0,regions:new Set(),moving:0,readiness:0};
      const x=byType[u.typeId]; x.quantity+=u.quantity||0; x.groups++; if(u.regionId)x.regions.add(u.regionId); if(u.movement)x.moving+=u.quantity||0; x.readiness+=(u.readiness||0)*(u.quantity||0);
    }
    return Object.values(byType).map(x=>({...x,regions:[...x.regions],readiness:x.quantity?round(x.readiness/x.quantity,1):0})).sort((a,b)=>b.quantity-a.quantity);
  }

  function occupiedRegions(state,winnerId,loserId){
    return regions(state,loserId).filter(r=>(r.controllerId||r.ownerId||loserId)===winnerId);
  }

  function warAdvantage(w,sideId){
    const raw=w.attacker===sideId?(w.warScore||0):-(w.warScore||0);
    const occupied=(w.attacker===sideId?Math.max(0,w.territoryControl||0):Math.max(0,-(w.territoryControl||0)));
    return round(raw+occupied*.25,1);
  }

  function warSettlementOptions(state,warId){
    const w=(state.wars||[]).find(x=>x.id===warId); if(!w)return null;
    ensureWarState(state,w);
    const controlled=state.controlledCountryId;
    const side=controlled===w.attacker||controlled===w.defender;
    const otherId=w.attacker===controlled?w.defender:w.attacker;
    const advantage=side?warAdvantage(w,controlled):0;
    const won=w.winner===controlled || advantage>=65;
    const occupied=side?occupiedRegions(state,controlled,otherId):[];
    return {war:w,side,otherId,advantage,occupied,canDemand:side&&!w.ended&&advantage>=55,canAnnexOccupied:side&&(w.ended||advantage>=45)&&occupied.length>0,canAnnexCountry:side&&(w.winner===controlled||advantage>=85||occupied.length>=Math.ceil(regions(state,otherId).length*.75)),won};
  }

  function demandSurrender(state,warId){
    const o=warSettlementOptions(state,warId); if(!o?.side)return{ok:false,message:"No participas en esta guerra."};
    if(!o.canDemand)return{ok:false,message:`Se requiere una ventaja mínima de 55. Ventaja actual: ${o.advantage}.`};
    const w=o.war,loser=country(state,o.otherId),winner=country(state,state.controlledCountryId);
    w.ended=true;w.end=state.date;w.winner=winner.id;w.loser=loser.id;w.result=`Capitulación de ${loser.name}`;w.settlement={status:"pending",resolved:false,type:null,date:null};
    loser.warExhaustion=100;winner.relations[loser.id]=8;loser.relations[winner.id]=8;
    E.pushEvent(state,"military",`${loser.name} capitula`,`${winner.name} obtiene el derecho a imponer un tratado: paz, anexión territorial o anexión estatal.`);
    return{ok:true,message:`${loser.name} ha capitulado. Selecciona las condiciones de paz.`};
  }

  function annexOccupiedRegions(state,warId){
    const o=warSettlementOptions(state,warId); if(!o?.side)return{ok:false,message:"No participas en esta guerra."};
    if(!o.canAnnexOccupied)return{ok:false,message:"No existen regiones enemigas ocupadas que puedan anexionarse."};
    const winner=country(state,state.controlledCountryId),loser=country(state,o.otherId),list=o.occupied;
    for (const r of list) { r.ownerId=winner.id; r.controllerId=winner.id; r.annexedDate=state.date; r.previousOwnerId=loser.id; }
    o.war.ended=true;o.war.end ||= state.date;o.war.winner=winner.id;o.war.loser=loser.id;o.war.result=`Victoria territorial de ${winner.name}`;o.war.settlement={status:"resolved",resolved:true,type:"occupied-regions",date:state.date,regions:list.map(r=>r.id)};
    winner.annexedCountries ||= []; winner.annexedCountries.push({countryId:loser.id,date:state.date,type:"partial",regions:list.map(r=>r.id)});
    winner.economy.treasury=round(winner.economy.treasury+Math.min(20,loser.economy.treasury*.12),2);loser.economy.treasury=round(Math.max(0,loser.economy.treasury*.88),2);
    E.calculateResourceBalance?.(state,winner);E.calculateResourceBalance?.(state,loser);
    E.pushEvent(state,"military",`Anexión territorial`,`${winner.name} incorpora ${list.map(r=>r.name).join(", ")} tras el tratado con ${loser.name}.`);
    return{ok:true,message:`Se anexionan ${list.length} regiones: ${list.map(r=>r.name).join(", ")}.`};
  }

  function annexCountry(state,warId){
    const o=warSettlementOptions(state,warId); if(!o?.side)return{ok:false,message:"No participas en esta guerra."};
    if(!o.canAnnexCountry)return{ok:false,message:`No se cumplen las condiciones para una anexión total. Ventaja ${o.advantage}; ocupa al menos el 75% del país o fuerza su capitulación.`};
    const winner=country(state,state.controlledCountryId),loser=country(state,o.otherId),all=regions(state,loser.id);
    for (const r of all) { r.previousOwnerId=r.ownerId||loser.id; r.ownerId=winner.id; r.controllerId=winner.id; r.annexedDate=state.date; }
    loser.sovereign=false;loser.annexedBy=winner.id;loser.annexedDate=state.date;loser.government.regime=`Administración territorial de ${winner.name}`;loser.systems.stability=clamp(loser.systems.stability-18,5,60);
    winner.annexedCountries ||= []; if(!winner.annexedCountries.some(x=>x.countryId===loser.id&&x.type==="total"))winner.annexedCountries.push({countryId:loser.id,date:state.date,type:"total",regions:all.map(r=>r.id)});
    const reparations=Math.min(45,loser.economy.treasury*.45);winner.economy.treasury=round(winner.economy.treasury+reparations,2);loser.economy.treasury=round(Math.max(0,loser.economy.treasury-reparations),2);
    o.war.ended=true;o.war.end ||= state.date;o.war.winner=winner.id;o.war.loser=loser.id;o.war.result=`Anexión de ${loser.name}`;o.war.settlement={status:"resolved",resolved:true,type:"total-annexation",date:state.date,regions:all.map(r=>r.id)};
    state.world.tension=clamp((state.world.tension||0)+18,0,100);winner.systems.stability=clamp(winner.systems.stability-3,5,100);
    E.calculateResourceBalance?.(state,winner);E.calculateResourceBalance?.(state,loser);
    E.pushEvent(state,"military",`${loser.name} es anexionado`,`${winner.name} incorpora todas sus regiones. La tensión internacional aumenta y comienza una administración de ocupación.`);
    return{ok:true,message:`Anexión total completada: ${all.length} regiones de ${loser.name} quedan bajo control de ${winner.name}.`};
  }

  function signPeace(state,warId){
    const o=warSettlementOptions(state,warId); if(!o?.side)return{ok:false,message:"No participas en esta guerra."};
    const w=o.war,a=country(state,w.attacker),d=country(state,w.defender);
    w.ended=true;w.end=state.date;w.result="Paz negociada";w.settlement={status:"resolved",resolved:true,type:"white-peace",date:state.date};
    a.relations[d.id]=22;d.relations[a.id]=22;
    E.pushEvent(state,"diplomacy",`Tratado de paz: ${a.name}–${d.name}`,"Se conservan las fronteras salvo las regiones cuya propiedad ya hubiera sido modificada por un tratado anterior.");
    return{ok:true,message:"Tratado de paz firmado."};
  }

  function updateWarSettlements(state){
    for (const w of state.wars||[]) {
      ensureWarState(state,w);
      if (w.ended && w.winner && !w.settlement.resolved) w.settlement.status="pending";
      if (!w.ended) {
        const a=country(state,w.attacker),d=country(state,w.defender);
        if (a&&d) w.liveSummary={date:state.date,attackerPower:E.countryCombatPower?.(state,a)?.total||0,defenderPower:E.countryCombatPower?.(state,d)?.total||0,attackerRegions:occupiedRegions(state,a.id,d.id).length,defenderRegions:occupiedRegions(state,d.id,a.id).length,lastBattle:w.lastBattle||null};
      }
    }
  }

  function tickDay(state){
    reconcileConstructionLedger(state);
    const summary=oldTickDay(state);
    for (const c of state.countries) {
      c.units.forEach((u,i)=>normalizeUnit(state,c,u,i));
      c.productionQueue.forEach(q=>normalizeQueue(state,c,q));
      ensurePoliticalSeats(c);
    }
    updateWarSettlements(state);
    reconcileConstructionLedger(state);
    return summary;
  }

  Object.assign(E,{
    createInitialState,hydrateState:hydrateV15,tickDay,buildInRegion,queueUnitBatch,
    splitUnit,militaryInventory,warSettlementOptions,demandSurrender,annexOccupiedRegions,annexCountry,signPeace,
    version15:true
  });
})();
