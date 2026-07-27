"use strict";

(() => {
  const SAVE_KEY="nexus_alpha_v1_7_save";
  const LEGACY_KEYS=["nexus_alpha_v1_6_save","nexus_alpha_v1_5_save","nexus_alpha_v1_4_save","nexus_alpha_v1_3_save","nexus_alpha_v1_2_save","nexus_alpha_v1_1_save","nexus_alpha_v1_0_save"];
  const DAY_MS=10000;
  let state,timer=null;

  const storageGet=key=>{try{return localStorage.getItem(key)}catch(_){return null}};
  const storageSet=(key,value)=>{try{localStorage.setItem(key,value);return true}catch(_){return false}};
  const storageRemove=key=>{try{localStorage.removeItem(key);return true}catch(_){return false}};

  function boot(){
    try{
      state=normalizeLoadedState(loadState())||NEXUS_ECONOMY.createInitialState();
      bindState();bindStartScreen();hideBootLoader();
    }catch(error){
      console.error("NEXUS boot error",error);document.getElementById("bootLoader")?.remove();document.getElementById("startOverlay")?.setAttribute("hidden","");
      const panel=document.getElementById("bootError");if(panel)panel.hidden=false;const text=document.getElementById("bootErrorText");if(text)text.textContent=error?.stack||error?.message||String(error);
    }
  }

  function bindState(){
    stopLoop();state=NEXUS_ECONOMY.hydrateState(state);window.NEXUS_STATE=state;window.NEXUS_ACTIONS=createActions();
    NEXUS_UI.initialize(state,window.NEXUS_ACTIONS);NEXUS_MAP_ENGINE.initialize(state,{selectCountry,selectRegion});syncLoop();
  }

  function createActions(){return{
    setPanel,setMapLayer,selectCountry,selectRegion,toggleRun,setSpeed,stepDay,
    updateBudget,adjustBudget,updateTaxRate,investRegion,buildInRegion,upgradeBuilding,expandRegionSlots,
    queueUnit,setUnitBatch,deployUnit,moveUnit,attackRegion,attackUnit,attackCountry,splitUnit,startProject,buyShares,sellShares,takeover,
    diplomacy,operation,war,nuclearAlert,startResearch,enactPolicy,setDoctrine,
    takeControl,changeRegime,appointParty,callElection,negotiateCoalition,removeCoalitionParty,setCompanyPolicy,enactNationalDecision,demandSurrender,annexOccupiedRegions,annexCountry,signPeace,resolveDecision,
    save:()=>saveState(true),load:manualLoad,exportSave,importSave,reset,updateSetting,repair
  }}

  function bindStartScreen(){
    const overlay=document.getElementById("startOverlay"),select=document.getElementById("startCountrySelect"),continueBtn=document.getElementById("continueBtn");
    const sorted=[...state.countries].sort((a,b)=>a.name.localeCompare(b.name,"es"));
    if(select){select.innerHTML=sorted.map(c=>`<option value="${c.id}" ${c.id==="ESP"?"selected":""}>${c.flag} ${escapeHTML(c.name)}</option>`).join("");select.addEventListener("change",()=>updateStartCard(select.value));}
    updateStartCard(select?.value||"ESP");continueBtn.hidden=!Boolean(normalizeLoadedState(loadState()));
    document.getElementById("startCampaignBtn")?.addEventListener("click",()=>{const id=select?.value||"ESP";state=NEXUS_ECONOMY.createInitialState();state.controlledCountryId=id;state.selectedCountryId=id;state.mapMode="world";rebind();overlay.hidden=true;NEXUS_UI.toast(`Campaña iniciada con ${NEXUS_ECONOMY.getCountry(state).name}.`,"success");NEXUS_MAP_ENGINE.focusCountry(id)});
    continueBtn?.addEventListener("click",()=>{const loaded=normalizeLoadedState(loadState());if(!loaded)return;state=loaded;rebind();overlay.hidden=true;NEXUS_UI.toast("Partida cargada.","success")});
    document.getElementById("observerBtn")?.addEventListener("click",()=>{state=NEXUS_ECONOMY.createInitialState();state.observerMode=true;state.running=true;state.selectedCountryId="USA";state.controlledCountryId="ESP";rebind();overlay.hidden=true;NEXUS_UI.toast("Modo observador activo. Puedes tomar el control de cualquier país.","info")});
  }

  function updateStartCard(id){const c=state.countries.find(x=>x.id===id)||state.countries.find(x=>x.id==="ESP");setText("startFlag",c.flag);setText("startCountryName",c.id==="ESP"?"España reforzada":c.name);setText("startCountrySummary",`PIB ${fmt(c.economy.gdp)} mil M€ · ${fmt(c.economy.population)} M habitantes · Industria ${c.systems.industry.toFixed(0)} · Tecnología ${c.systems.technology.toFixed(0)} · Militar ${c.systems.military.toFixed(0)}.`)}
  function rebind(){bindState()}

  function setPanel(panel){const allowed=["overview","economy","regions","industry","stock","politics","technology","military","diplomacy","intelligence","objectives","events","settings"];state.activePanel=allowed.includes(panel)?panel:"overview";if(panel==="regions"){state.mapMode="regions";const countryId=state.selectedCountryId||state.controlledCountryId,regions=NEXUS_ECONOMY.getCountryRegions?.(state,countryId)||[];if(!regions.some(r=>r.id===state.selectedRegionId))state.selectedRegionId=regions[0]?.id||null;NEXUS_MAP_ENGINE.focusCountry(countryId)}else state.mapMode="world";NEXUS_UI.renderAll();NEXUS_MAP_ENGINE.render()}
  function setMapLayer(layer){if(!["political","economy","military","technology","stability"].includes(layer))return;state.mapLayer=layer;NEXUS_MAP_ENGINE.render();NEXUS_UI.renderAll()}
  function selectCountry(countryId){const target=state.countries.find(c=>c.id===countryId);if(!target)return;state.selectedCountryId=target.annexedBy||target.id;state.mapMode="world";NEXUS_MAP_ENGINE.render();NEXUS_UI.renderAll()}
  function selectRegion(countryId,regionId){if(regionId==null){regionId=countryId;countryId=state.selectedCountryId||state.controlledCountryId}const regions=NEXUS_ECONOMY.getCountryRegions?.(state,countryId)||[];if(!regions.some(r=>r.id===regionId))return;state.selectedRegionId=regionId;state.selectedCountryId=countryId;state.mapMode="regions";NEXUS_MAP_ENGINE.focusRegion(countryId,regionId);NEXUS_UI.renderAll()}

  function currentClockFraction(){
    state.simulation ||= {clockFraction:0,clockAnchor:null};
    let fraction=Number(state.simulation.clockFraction)||0;
    if(state.running&&state.simulation.clockAnchor){fraction+=(Date.now()-state.simulation.clockAnchor)/(DAY_MS/Math.max(1,state.speed||1));}
    return Math.max(0,Math.min(.999999,fraction));
  }
  function freezeClock(){state.simulation ||= {};state.simulation.clockFraction=currentClockFraction();state.simulation.clockAnchor=null}
  function resumeClock(){state.simulation ||= {};state.simulation.clockAnchor=Date.now()}
  function resetClock(){state.simulation ||= {};state.simulation.clockFraction=0;state.simulation.clockAnchor=state.running?Date.now():null}
  function toggleRun(){if(state.running){freezeClock();state.running=false}else{state.running=true;resumeClock()}syncLoop();NEXUS_UI.renderAll()}
  function setSpeed(speed){const wasRunning=state.running;if(wasRunning)freezeClock();state.speed=[1,2,4].includes(Number(speed))?Number(speed):1;if(wasRunning)resumeClock();syncLoop();NEXUS_UI.renderAll()}
  function syncLoop(){stopLoop();if(!state.running)return;if(!state.simulation?.clockAnchor)resumeClock();scheduleNextTick()}
  function scheduleNextTick(){if(!state.running)return;timer=setTimeout(()=>{timer=null;stepDay();if(state.running)scheduleNextTick()},DAY_MS/state.speed)}
  function stopLoop(){if(timer)clearTimeout(timer);timer=null}
  function stepDay(){let summary;try{summary=NEXUS_ECONOMY.tickDay(state)}catch(error){console.error("Tick recuperado por app.js",error);summary=NEXUS_ECONOMY.forceAdvanceDate?.(state)||null;NEXUS_UI.toast("Se aisló un error del motor; la cronología continúa.","warning")}resetClock();if(state.settings.autosave&&state.dayIndex%7===0)saveState(false);NEXUS_MAP_ENGINE.render();NEXUS_UI.renderAll();if(summary?.budget?.monthlyBalance<-8)NEXUS_UI.toast("El déficit mensual está elevando la deuda.","warning");return summary}

  function updateBudget(key,value){NEXUS_ECONOMY.updateBudget(state,key,value);NEXUS_UI.renderAll()}
  function adjustBudget(key,delta){result(NEXUS_ECONOMY.adjustBudget(state,key,delta));NEXUS_UI.renderAll()}
  function updateTaxRate(value){NEXUS_ECONOMY.updateTaxRate(state,value);NEXUS_UI.renderAll()}
  function investRegion(type){result(NEXUS_ECONOMY.investRegion(state,state.selectedRegionId,type));refresh()}
  function buildInRegion(buildingId){result(NEXUS_ECONOMY.buildInRegion(state,state.selectedRegionId,buildingId));refresh()}
  function upgradeBuilding(id){result(NEXUS_ECONOMY.upgradeBuilding(state,state.selectedRegionId,id));refresh()}
  function expandRegionSlots(){result(NEXUS_ECONOMY.expandRegionSlots(state,state.controlledCountryId,state.selectedRegionId));refresh()}
  function queueUnit(typeId,quantity){result(NEXUS_ECONOMY.queueUnitBatch(state,typeId,state.selectedRegionId,quantity||state.unitBatch||1));refresh()}
  function setUnitBatch(value){result(NEXUS_ECONOMY.changeUnitBatch(state,value));NEXUS_UI.renderAll()}
  function deployUnit(unitId,regionId,countryId){result(NEXUS_ECONOMY.deployUnit(state,unitId,regionId,countryId||state.controlledCountryId));refresh()}
  function moveUnit(unitId,regionId,countryId){result(NEXUS_ECONOMY.moveUnit(state,unitId,regionId,countryId||state.controlledCountryId));refresh()}
  function attackRegion(unitId,targetCountryId,targetRegionId){const r=NEXUS_ECONOMY.attackRegion(state,unitId,targetCountryId,targetRegionId);result(r);refresh();const war=state.wars.find(w=>!w.ended&&((w.attacker===state.controlledCountryId&&w.defender===targetCountryId)||(w.defender===state.controlledCountryId&&w.attacker===targetCountryId)));if(r?.ok&&war)setTimeout(()=>NEXUS_UI.openWarModal?.(war.id),0)}
  function attackUnit(unitId,targetCountryId,targetUnitId){const r=NEXUS_ECONOMY.attackUnit(state,unitId,targetCountryId,targetUnitId);result(r);state.activePanel="military";refresh();if(r?.ok&&r.warId)setTimeout(()=>NEXUS_UI.openWarModal?.(r.warId),0)}
  function attackCountry(unitId,targetCountryId){const r=NEXUS_ECONOMY.attackCountry(state,unitId,targetCountryId);result(r);state.activePanel="military";refresh();if(r?.ok&&r.warId)setTimeout(()=>NEXUS_UI.openWarModal?.(r.warId),0)}
  function splitUnit(unitId,quantity,targetRegionId){result(NEXUS_ECONOMY.splitUnit(state,unitId,quantity,targetRegionId));refresh()}
  function startProject(projectId){result(NEXUS_ECONOMY.startProject(state,projectId));refresh()}
  function buyShares(companyId,pct){result(NEXUS_ECONOMY.buyShares(state,companyId,pct));refresh()}
  function sellShares(companyId,pct){result(NEXUS_ECONOMY.sellShares(state,companyId,pct));refresh()}
  function takeover(companyId){result(NEXUS_ECONOMY.launchTakeover(state,companyId));refresh()}
  function diplomacy(targetId,kind){result(NEXUS_ECONOMY.tradeAction(state,targetId,kind));refresh()}
  function operation(targetId,operationId){result(NEXUS_ECONOMY.runOperation(state,targetId,operationId));refresh()}
  function war(targetId,kind){const r=NEXUS_ECONOMY.warAction(state,targetId,kind);result(r);if(r?.ok&&kind==="declare")state.activePanel="military";refresh();if(r?.ok&&r.warId)setTimeout(()=>NEXUS_UI.openWarModal?.(r.warId),0)}
  function nuclearAlert(delta){result(NEXUS_ECONOMY.setNuclearAlert(state,delta));refresh()}
  function startResearch(techId){result(NEXUS_ECONOMY.startResearch(state,techId));refresh()}
  function enactPolicy(policyId){result(NEXUS_ECONOMY.enactPolicy(state,policyId));refresh()}
  function setDoctrine(value){NEXUS_ECONOMY.getCountry(state).militaryDoctrine=value;NEXUS_UI.toast(`Doctrina actualizada: ${value}`,"success");refresh()}
  function takeControl(countryId){result(NEXUS_ECONOMY.takeControl(state,countryId));refresh();NEXUS_MAP_ENGINE.focusCountry(countryId)}
  function changeRegime(regimeId){result(NEXUS_ECONOMY.changeRegime(state,regimeId));refresh()}
  function appointParty(partyId){result(NEXUS_ECONOMY.appointParty(state,partyId));refresh()}
  function callElection(){result(NEXUS_ECONOMY.callElection(state));refresh()}
  function negotiateCoalition(partyId){result(NEXUS_ECONOMY.negotiateCoalition(state,partyId));refresh()}
  function removeCoalitionParty(partyId){result(NEXUS_ECONOMY.removeCoalitionParty(state,partyId));refresh()}
  function setCompanyPolicy(companyId,policyId){result(NEXUS_ECONOMY.setCompanyPolicy(state,companyId,policyId));refresh()}
  function enactNationalDecision(decisionId){result(NEXUS_ECONOMY.enactNationalDecision(state,decisionId));refresh()}
  function demandSurrender(warId){result(NEXUS_ECONOMY.demandSurrender(state,warId));refresh()}
  function annexOccupiedRegions(warId){result(NEXUS_ECONOMY.annexOccupiedRegions(state,warId));refresh()}
  function annexCountry(warId){result(NEXUS_ECONOMY.annexCountry(state,warId));refresh()}
  function signPeace(warId){result(NEXUS_ECONOMY.signPeace(state,warId));refresh()}
  function resolveDecision(decisionId,choiceId){result(NEXUS_ECONOMY.resolveDecision(state,decisionId,choiceId));refresh()}
  function result(r){if(r)NEXUS_UI.toast(r.message,r.ok?"success":"error")}
  function refresh(){NEXUS_MAP_ENGINE.render();NEXUS_UI.renderAll()}

  function saveState(show=true){const ok=storageSet(SAVE_KEY,JSON.stringify(state));if(show)NEXUS_UI.toast(ok?"Partida guardada localmente.":"El navegador bloqueó el guardado local.",ok?"success":"warning");return ok}
  function loadState(){const raw=storageGet(SAVE_KEY)||LEGACY_KEYS.map(storageGet).find(Boolean);if(!raw)return null;try{return JSON.parse(raw)}catch(_){return null}}
  function manualLoad(){const loaded=normalizeLoadedState(loadState());if(!loaded){NEXUS_UI.toast("No hay guardado compatible.","warning");return}state=loaded;rebind();NEXUS_UI.toast("Partida cargada.","success")}
  function normalizeLoadedState(candidate){if(!candidate||typeof candidate!=="object"||!Array.isArray(candidate.countries))return null;try{return NEXUS_ECONOMY.hydrateState(candidate)}catch(error){console.warn("Guardado incompatible",error);return null}}
  function exportSave(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`nexus-v1.7-${state.date}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);NEXUS_UI.toast("Guardado exportado.","success")}
  function importSave(raw){try{const normalized=normalizeLoadedState(JSON.parse(raw));if(!normalized)throw new Error("Formato incompatible");state=normalized;rebind();NEXUS_UI.closeModal();NEXUS_UI.toast("Partida importada.","success")}catch(error){NEXUS_UI.toast(`Importación fallida: ${error.message}`,"error")}}
  function reset(){if(!confirm("¿Reiniciar la campaña?"))return;storageRemove(SAVE_KEY);for(const key of LEGACY_KEYS)storageRemove(key);state=NEXUS_ECONOMY.createInitialState();rebind();NEXUS_UI.toast("Campaña reiniciada.","success")}
  function updateSetting(key,value){state.settings[key]=value;document.body.classList.toggle("reduced-motion",state.settings.reducedMotion);document.body.classList.toggle("dense-ui",state.settings.denseUI);NEXUS_UI.renderAll();NEXUS_MAP_ENGINE.render()}
  function repair(){try{state=NEXUS_ECONOMY.hydrateState(state);rebind();NEXUS_UI.toast("Estado reparado.","success")}catch(_){NEXUS_UI.toast("No se pudo reparar.","error")}}
  function hideBootLoader(){requestAnimationFrame(()=>document.getElementById("bootLoader")?.classList.add("hidden"));setTimeout(()=>document.getElementById("bootLoader")?.remove(),650)}
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
  function fmt(v){return Number(v||0).toLocaleString("es-ES",{maximumFractionDigits:1})}
  function escapeHTML(v){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c])}

  window.addEventListener("DOMContentLoaded",boot,{once:true});
})();
