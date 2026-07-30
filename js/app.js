"use strict";

(() => {
  const SAVE_KEY="nexus_strategic_v5_4_1_save";
  const PREVIOUS_SAVE_KEY="nexus_strategic_v5_4_0_save";
  const LEGACY_CLAIM_KEY="nexus_strategic_v5_0_0_legacy_claimed";
  const LEGACY_KEYS=["nexus_strategic_v5_4_0_save","nexus_strategic_v5_2_0_save","nexus_strategic_v5_1_0_save","nexus_strategic_v5_0_0_save","nexus_alpha_v2_0_0_save","nexus_alpha_v1_9_0_save","nexus_alpha_v1_8_2_save","nexus_alpha_v1_8_1_save","nexus_alpha_v1_8_save","nexus_alpha_v1_7_save","nexus_alpha_v1_6_save","nexus_alpha_v1_5_save","nexus_alpha_v1_4_save","nexus_alpha_v1_3_save","nexus_alpha_v1_2_save","nexus_alpha_v1_1_save","nexus_alpha_v1_0_save"];
  const DAY_MS=10000;
  const SPEED_OPTIONS=[1,2,4,16,32];
  let state,timer=null,visualFrame=null,lastUIRender=0;

  const storageGet=key=>{try{return localStorage.getItem(key)}catch(_){return null}};
  const storageSet=(key,value)=>{try{localStorage.setItem(key,value);return true}catch(_){return false}};
  const storageRemove=key=>{try{localStorage.removeItem(key);return true}catch(_){return false}};
  const currentSaveKey=()=>window.NEXUS_AUTH?.storageKey?.(SAVE_KEY)||SAVE_KEY;
  const previousSaveKey=()=>window.NEXUS_AUTH?.storageKey?.(PREVIOUS_SAVE_KEY)||PREVIOUS_SAVE_KEY;

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
    stopLoop();state=NEXUS_ECONOMY.hydrateState(state);state.speed=normalizeSpeed(state.speed);window.NEXUS_STATE=state;window.NEXUS_ACTIONS=createActions();
    NEXUS_UI.initialize(state,window.NEXUS_ACTIONS);NEXUS_MAP_ENGINE.initialize(state,{selectCountry,selectRegion});syncLoop();
  }

  function createActions(){return{
    setPanel,setMapLayer,selectCountry,selectRegion,toggleRun,setSpeed,stepDay,
    updateBudget,adjustBudget,updateTaxRate,investRegion,buildInRegion,upgradeBuilding,expandRegionSlots,reconstructRegion,reconstructCountry,payDownDebt,
    queueUnit,setUnitBatch,deployUnit,moveUnit,attackRegion,attackUnit,attackCountry,splitUnit,startProject,buyShares,sellShares,takeover,
    diplomacy,operation,war,nuclearAlert,startResearch,enactPolicy,setDoctrine,
    takeControl,changeRegime,appointParty,endorseParty,campaignForParty,callElection,negotiateCoalition,removeCoalitionParty,setCompanyPolicy,enactNationalDecision,demandSurrender,annexOccupiedRegions,annexCountry,signPeace,resolveDecision,
    launchWarCampaign,setWarDoctrine,mobilizeReserves,setOperationalPlan,
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

  function setPanel(panel){const allowed=["overview","systems","markets51","society51","command52","knowledge52","analysis52","economy","regions","industry","stock","politics","technology","military","diplomacy","intelligence","objectives","events","architecture54","settings"];state.activePanel=allowed.includes(panel)?panel:"overview";if(panel==="regions"){state.mapMode="regions";const countryId=state.selectedCountryId||state.controlledCountryId,regions=NEXUS_ECONOMY.getCountryRegions?.(state,countryId)||[];if(!regions.some(r=>r.id===state.selectedRegionId))state.selectedRegionId=regions[0]?.id||null;NEXUS_MAP_ENGINE.focusCountry(countryId)}else{state.mapMode="world";if(panel==="overview")NEXUS_MAP_ENGINE.showWorld?.()}NEXUS_UI.renderAll();NEXUS_MAP_ENGINE.render()}
  function setMapLayer(layer){if(!["political","economy","military","industry","technology","stability"].includes(layer))return;state.mapLayer=layer;NEXUS_MAP_ENGINE.render();NEXUS_UI.renderAll()}
  function selectCountry(countryId){const target=state.countries.find(c=>c.id===countryId);if(!target)return;state.selectedCountryId=target.annexedBy||target.id;state.mapMode="world";NEXUS_MAP_ENGINE.focusCountry(state.selectedCountryId);NEXUS_UI.renderAll()}
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
  function normalizeSpeed(speed){const value=Number(speed);return SPEED_OPTIONS.includes(value)?value:1}
  function toggleRun(){if(state.running){freezeClock();state.running=false}else{state.running=true;resumeClock()}syncLoop();if(state.running&&state.speed>=16)NEXUS_UI.renderSimulationFrame?.();else NEXUS_UI.renderAll()}
  function setSpeed(speed){const next=normalizeSpeed(speed),wasRunning=state.running;if(wasRunning)freezeClock();state.speed=next;if(wasRunning)resumeClock();syncLoop();if(wasRunning&&next>=16)NEXUS_UI.renderSimulationFrame?.();else NEXUS_UI.renderAll()}
  function syncLoop(){stopLoop();if(!state.running)return;if(!state.simulation?.clockAnchor)resumeClock();scheduleNextTick()}
  function scheduleNextTick(){if(!state.running)return;const remaining=Math.max(0,1-currentClockFraction()),delay=Math.max(16,remaining*DAY_MS/normalizeSpeed(state.speed));timer=setTimeout(()=>{timer=null;stepDay();if(state.running)scheduleNextTick()},delay)}
  function stopLoop(){if(timer)clearTimeout(timer);timer=null}
  function stepDay(){const selectedCountryId=state.selectedCountryId,selectedRegionId=state.selectedRegionId,mapCenter=Array.isArray(state.mapCenter)?[...state.mapCenter]:null,mapZoom=state.mapZoom;let summary;try{summary=NEXUS_ECONOMY.tickDay(state)}catch(error){console.error("Tick recuperado por app.js",error);summary=NEXUS_ECONOMY.forceAdvanceDate?.(state)||null;NEXUS_UI.toast("Se aisló un error del motor; la cronología continúa.","warning")}const selectedCountry=state.countries.find(c=>c.id===selectedCountryId),ownerId=selectedCountry?.annexedBy||selectedCountryId;if(state.countries.some(c=>c.id===ownerId&&c.sovereign!==false))state.selectedCountryId=ownerId;if(selectedRegionId&&NEXUS_ECONOMY.getRegion?.(state,null,selectedRegionId))state.selectedRegionId=selectedRegionId;if(mapCenter)state.mapCenter=mapCenter;if(Number.isFinite(mapZoom))state.mapZoom=mapZoom;resetClock();if(state.settings.autosave&&state.dayIndex%7===0)saveState(false);queueVisualRefresh(false);if(summary?.budget?.monthlyBalance<-8)NEXUS_UI.toast("El déficit mensual está elevando la deuda.","warning");return summary}

  function updateBudget(key,value){NEXUS_ECONOMY.updateBudget(state,key,value);NEXUS_UI.renderAll()}
  function adjustBudget(key,delta){result(NEXUS_ECONOMY.adjustBudget(state,key,delta));NEXUS_UI.renderAll()}
  function updateTaxRate(value){NEXUS_ECONOMY.updateTaxRate(state,value);NEXUS_UI.renderAll()}
  function investRegion(type){result(NEXUS_ECONOMY.investRegion(state,state.selectedRegionId,type));refresh()}
  function buildInRegion(buildingId){result(NEXUS_ECONOMY.buildInRegion(state,state.selectedRegionId,buildingId));refresh()}
  function upgradeBuilding(id){result(NEXUS_ECONOMY.upgradeBuilding(state,state.selectedRegionId,id));refresh()}
  function expandRegionSlots(){result(NEXUS_ECONOMY.expandRegionSlots(state,state.controlledCountryId,state.selectedRegionId));refresh()}
  function reconstructRegion(regionId,scope){result(NEXUS_ECONOMY.reconstructRegion(state,regionId||state.selectedRegionId,scope||"all"));refresh()}
  function reconstructCountry(countryId){result(NEXUS_ECONOMY.reconstructCountry(state,countryId));refresh()}
  function payDownDebt(share){result(NEXUS_ECONOMY.payDownDebt(state,share));refresh()}
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
  function endorseParty(partyId){result(NEXUS_ECONOMY.endorseParty(state,partyId));refresh()}
  function campaignForParty(partyId,intensity){result(NEXUS_ECONOMY.campaignForParty(state,partyId,intensity));refresh()}
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
  function launchWarCampaign(warId,typeId,targetRegionId){result(NEXUS_ECONOMY.launchWarCampaign(state,warId,typeId,targetRegionId));refresh();if(warId)setTimeout(()=>NEXUS_UI.openWarModal?.(warId),0)}
  function setWarDoctrine(warId,doctrineId){result(NEXUS_ECONOMY.setWarDoctrine(state,warId,doctrineId));refresh();if(warId)setTimeout(()=>NEXUS_UI.openWarModal?.(warId),0)}
  function mobilizeReserves(warId){result(NEXUS_ECONOMY.mobilizeReserves(state,warId));refresh();if(warId)setTimeout(()=>NEXUS_UI.openWarModal?.(warId),0)}
  function setOperationalPlan(warId,tempo,roe,priority,support){result(NEXUS_ECONOMY.setOperationalPlan(state,warId,tempo,roe,priority,support));refresh();if(warId)setTimeout(()=>NEXUS_UI.openWarModal?.(warId),0)}
  function result(r){if(r)NEXUS_UI.toast(r.message,r.ok?"success":"error")}
  function queueVisualRefresh(force=false){const fast=state.speed>=16&&state.running;if(force||!fast||state.mapLayer==="military")NEXUS_MAP_ENGINE.render();const now=performance.now(),minimum=fast?250:state.speed>=4&&state.running?180:0;if(!force&&now-lastUIRender<minimum)return;if(visualFrame)return;visualFrame=requestAnimationFrame(()=>{visualFrame=null;lastUIRender=performance.now();if(fast&&!force)NEXUS_UI.renderSimulationFrame?.();else NEXUS_UI.renderAll()})}
  function refresh(){queueVisualRefresh(true)}

  function saveState(show=true){const payload=window.NEXUS_V54?.pack?.(state)||state,ok=storageSet(currentSaveKey(),JSON.stringify(payload));if(show)NEXUS_UI.toast(ok?"Partida v5.4.1 versionada y guardada.":"El navegador bloqueó el guardado local.",ok?"success":"warning");return ok}
  function loadState(){const key=currentSaveKey();let raw=storageGet(key),user=window.NEXUS_AUTH?.currentUser?.();if(!raw){raw=storageGet(previousSaveKey());if(raw)storageSet(key,raw)}if(!raw&&user&&!user.guest&&!storageGet(LEGACY_CLAIM_KEY)){raw=LEGACY_KEYS.map(storageGet).find(Boolean);if(raw&&storageSet(key,raw))storageSet(LEGACY_CLAIM_KEY,user.id)}if(!raw)return null;try{return JSON.parse(raw)}catch(_){return null}}
  function manualLoad(){const loaded=normalizeLoadedState(loadState());if(!loaded){NEXUS_UI.toast("No hay guardado compatible.","warning");return}state=loaded;rebind();NEXUS_UI.toast("Partida cargada.","success")}
  function normalizeLoadedState(candidate){if(!candidate||typeof candidate!=="object")return null;try{const payload=candidate.format==="nexus-global-save"?window.NEXUS_V54.saveManager.unpack(candidate):candidate;if(!Array.isArray(payload.countries))return null;return NEXUS_ECONOMY.hydrateState(payload)}catch(error){console.warn("Guardado incompatible",error);return null}}
  function exportSave(){const payload=window.NEXUS_V54?.pack?.(state)||state,blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`nexus-v5.4.1-${state.date}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);NEXUS_UI.toast("Guardado v5.4.1 exportado con integridad verificable.","success")}
  function importSave(raw){try{const normalized=normalizeLoadedState(JSON.parse(raw));if(!normalized)throw new Error("Formato incompatible");state=normalized;rebind();NEXUS_UI.closeModal();NEXUS_UI.toast("Partida importada.","success")}catch(error){NEXUS_UI.toast(`Importación fallida: ${error.message}`,"error")}}
  function reset(){if(!confirm("¿Reiniciar la campaña de esta cuenta?"))return;storageRemove(currentSaveKey());state=NEXUS_ECONOMY.createInitialState();rebind();NEXUS_UI.toast("Campaña de la cuenta reiniciada.","success")}
  function updateSetting(key,value){state.settings[key]=value;document.body.classList.toggle("reduced-motion",state.settings.reducedMotion);document.body.classList.toggle("dense-ui",state.settings.denseUI);NEXUS_UI.renderAll();NEXUS_MAP_ENGINE.render()}
  function repair(){try{state=NEXUS_ECONOMY.hydrateState(state);rebind();NEXUS_UI.toast("Estado reparado.","success")}catch(_){NEXUS_UI.toast("No se pudo reparar.","error")}}
  function hideBootLoader(){requestAnimationFrame(()=>document.getElementById("bootLoader")?.classList.add("hidden"));setTimeout(()=>document.getElementById("bootLoader")?.remove(),650)}
  function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
  function fmt(v){return Number(v||0).toLocaleString("es-ES",{maximumFractionDigits:1})}
  function escapeHTML(v){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c])}

  window.addEventListener("DOMContentLoaded",boot,{once:true});
})();
