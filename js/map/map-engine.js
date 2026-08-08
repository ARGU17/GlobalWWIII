"use strict";

import{MAP_CONFIG}from"./map-config.js";
import{MapState}from"./map-state.js";
import{LayerManager}from"./layer-manager.js";
import{LODManager}from"./lod-manager.js";
import{PerformanceManager}from"./performance-manager.js";
import{MapUIControls}from"./ui-controls.js";
import{MapDataAdapter}from"./model/map-data-adapter.js";
import{AssetManager}from"./assets/asset-manager.js";
import{CameraController}from"./camera-controller.js";
import{SelectionManager}from"./selection-manager.js";
import{MapLibreRenderer}from"./renderers/maplibre-renderer.js";
import{PoliticalRenderer}from"./renderers/political-renderer.js";
import{TerrainRenderer}from"./renderers/terrain-renderer.js";
import{SimulationOverlayRenderer}from"./renderers/simulation-overlay-renderer.js";
import{ThreeRenderer}from"./renderers/three-renderer.js";
import{FallbackRenderer}from"./renderers/fallback-renderer.js";

const MODES=new Set(["political","hybrid","terrain"]);
const EMPTY={type:"FeatureCollection",features:[]};

function featureCollection(snapshot,key){return snapshot?.geography?.[key]||snapshot?.[`${key}GeoJSON`]||EMPTY}
function featureById(collection,key,id){return collection?.features?.find(feature=>feature.properties?.[key]===id||feature.id===id)||null}
function entityPosition(entity){const longitude=Number(entity?.longitude??entity?.position?.longitude),latitude=Number(entity?.latitude??entity?.position?.latitude);return Number.isFinite(longitude)&&Number.isFinite(latitude)?[longitude,latitude]:null}
function pathBetween(countries,fromId,toId){const from=entityPosition(countries.get(fromId)),to=entityPosition(countries.get(toId));return from&&to?[from,to]:[]}

function strategicOverlayData(gameState,source){
  const countries=new Map((source?.countries||[]).map(country=>[country.id,country])),controlledId=gameState?.controlledCountryId||gameState?.selectedCountryId,controlledState=(gameState?.countries||[]).find(country=>country.id===controlledId),relations=controlledState?.v51?.diplomacy?.relations||{},relationRows=Object.entries(relations).map(([targetId,value])=>({targetId,value:value||{},path:pathBetween(countries,controlledId,targetId)})).filter(row=>row.path.length===2);
  const intelligenceFlows=(gameState?.v52?.globalIntelOperations||[]).filter(operation=>operation.status==="active").map(operation=>({id:operation.id,ownerId:operation.ownerId,targetId:operation.targetId,type:operation.type,source:operation.source,strength:Number(operation.successChance)||1,path:pathBetween(countries,operation.ownerId,operation.targetId)})).filter(flow=>flow.path.length===2);
  const migrationFlows=relationRows.filter(row=>Number(row.value.migration)>0).sort((a,b)=>Number(b.value.migration)-Number(a.value.migration)).slice(0,8).map(row=>({id:`migration:${controlledId}:${row.targetId}`,origin:controlledId,destination:row.targetId,volume:Number(row.value.migration)||0,path:row.path}));
  const influenceFlows=relationRows.filter(row=>Number(row.value.culturalInfluence)>0).sort((a,b)=>Number(b.value.culturalInfluence)-Number(a.value.culturalInfluence)).slice(0,8).map(row=>({id:`influence:${controlledId}:${row.targetId}`,origin:controlledId,destination:row.targetId,strength:Number(row.value.culturalInfluence)||0,path:row.path}));
  const allianceTargets=new Set([...(controlledState?.v5?.foreign?.alliances||[]),...(controlledState?.v51?.diplomacy?.treaties||[]).filter(treaty=>treaty.status!=="ended").map(treaty=>treaty.targetId||treaty.countryId)].filter(Boolean)),allianceFlows=[...allianceTargets].map(targetId=>({id:`alliance:${controlledId}:${targetId}`,origin:controlledId,destination:targetId,strength:80,path:pathBetween(countries,controlledId,targetId)})).filter(flow=>flow.path.length===2);
  const alerts=(controlledState?.v52?.analysis?.alerts||[]).filter(alert=>alert.triggered||alert.severity>=70).map(alert=>{const target=countries.get(alert.countryId||controlledId),position=entityPosition(target);return{...alert,countryId:alert.countryId||controlledId,severity:Number(alert.severity||alert.lastValue||2),longitude:position?.[0],latitude:position?.[1]}}).filter(alert=>Number.isFinite(alert.longitude));
  const activeWars=(source?.wars||[]).filter(war=>war.active!==false),militaryLogistics=activeWars.filter(war=>war.path?.length>1).map(war=>({id:`supply:${war.id}`,warId:war.id,path:war.path,status:war.status,capacity:Number(war.supplyCapacity||war.logistics||1)}));
  const reconstructionSites=(source?.occupations||[]).filter(zone=>Number(zone.reconstruction)<100).map(zone=>{const target=countries.get(zone.targetId),position=entityPosition(target);return{...zone,longitude:position?.[0],latitude:position?.[1],progress:Number(zone.reconstruction)||0}}).filter(entity=>Number.isFinite(entity.longitude));
  const damageZones=[...(source?.facilities||[]).filter(item=>Number(item.damage)>0||Number(item.condition)<65).map(item=>({...item,severity:Math.max(Number(item.damage)||0,100-Number(item.condition||100))})),...(source?.battles||[]).filter(item=>item.active!==false).map(item=>({...item,severity:Number(item.intensity||40)}))];
  const navalControlZones=[],airSuperiorityZones=[];for(const war of activeWars){const midpoint=war.position||null;if(!midpoint)continue;const attackerState=(gameState?.countries||[]).find(country=>country.id===war.attackerId),attackerMilitary=attackerState?.v52?.military;navalControlZones.push({...midpoint,id:`naval:${war.id}`,warId:war.id,control:Number(war.navalControl??attackerMilitary?.operationalCapacity?.naval)||0});airSuperiorityZones.push({...midpoint,id:`air:${war.id}`,warId:war.id,control:Number(war.airSuperiority??attackerMilitary?.operationalCapacity?.air)||0})}
  return{intelligenceFlows,migrationFlows,influenceFlows,allianceFlows,alerts,militaryLogistics,reconstructionSites,damageZones,navalControlZones,airSuperiorityZones,strategicNodes:source?.logistics||[]};
}

function clockFraction(gameState){
  const simulation=gameState?.simulation||{};let fraction=Number(simulation.clockFraction)||0;
  if(gameState?.running&&simulation.clockAnchor)fraction+=(Date.now()-simulation.clockAnchor)/(10000/Math.max(1,Number(gameState.speed)||1));
  return Math.max(0,Math.min(.999,fraction));
}

export class MapEngine extends EventTarget{
  constructor(){
    super();this.gameState=null;this.callbacks={};this.mapState=null;this.layerManager=null;this.lodManager=null;this.performanceManager=null;this.assets=null;this.adapter=null;this.renderer=null;this.camera=null;this.selection=null;this.political=null;this.terrain=null;this.simulation=null;this.three=null;this.fallback=null;this.controls=null;this.snapshot=null;this.lastAdapterSignature="";this.initializing=null;this.initialized=false;this.resizeObserver=null;this.pendingRender=false;this.pendingLod=null;this.requestedLod=null;this.fallbackReason=null;
  }

  initialize(gameState,callbacks={}){
    this.gameState=gameState;this.callbacks=callbacks||{};
    if(this.initialized){this.rebind(gameState,callbacks);return Promise.resolve(this)}
    if(this.initializing)return this.initializing;
    this.initializing=this.start().catch(error=>{console.error("MapEngine v6 no pudo iniciar WebGL",error);this.activateFallback(error.message);return this}).finally(()=>{this.initializing=null});
    return this.initializing;
  }

  async start(){
    const host=document.getElementById("strategicMap"),glHost=document.getElementById("strategicMapGL"),fallbackCanvas=document.getElementById("strategicMapFallback"),notice=document.getElementById("mapFallbackNotice"),tooltip=document.getElementById("mapTooltip");
    if(!host)throw new Error("No existe el contenedor #strategicMap");
    this.assets=new AssetManager();this.mapState=new MapState(this.gameState);this.layerManager=new LayerManager(MAP_CONFIG);this.layerManager.applyVisibility?.(this.mapState.visibleLayers);this.lodManager=new LODManager(MAP_CONFIG);this.performanceManager=new PerformanceManager({initialQuality:this.gameState?.settings?.mapQuality||"auto"});
    this.adapter=new MapDataAdapter({assetManager:this.assets});
    if(this.adapter.initialize)await this.adapter.initialize();
    this.snapshot=this.createSnapshot();
    this.fallback=new FallbackRenderer({host,canvas:fallbackCanvas,notice});
    this.renderer=new MapLibreRenderer({host:glHost||host,mapState:this.mapState,assetManager:this.assets,performanceManager:this.performanceManager});
    if(!this.renderer.isSupported())throw new Error("WebGL no está disponible; se mantiene el mapa vectorial local");
    await this.renderer.initialize();
    this.camera=new CameraController(this.mapState);this.camera.attach(this.renderer.map);
    this.selection=new SelectionManager({mapState:this.mapState,callbacks:this.selectionCallbacks(),tooltip});this.selection.attach(this.renderer.map);
    this.political=new PoliticalRenderer({renderer:this.renderer,layerManager:this.layerManager});this.political.initialize(this.snapshot);
    this.terrain=new TerrainRenderer({renderer:this.renderer,assetManager:this.assets,layerManager:this.layerManager});await this.terrain.initialize();
    const entitySelection=(type,id,data)=>this.selectEntity(type,id,data);
    this.simulation=new SimulationOverlayRenderer({renderer:this.renderer,layerManager:this.layerManager,performanceManager:this.performanceManager,onSelect:entitySelection});this.simulation.initialize(this.snapshot);
    this.three=new ThreeRenderer({renderer:this.renderer,assetManager:this.assets,mapState:this.mapState});await this.three.initialize();this.three.update(this.snapshot);this.applyQualityProfile();
    this.setupControls();
    this.bindRuntimeEvents(host);this.fallback.deactivate();host.classList.remove("canvas-fallback");host.classList.add("webgl-ready");if(glHost)glHost.setAttribute("aria-hidden","false");this.initialized=true;
    this.setMapLayer(this.gameState.mapLayer||this.mapState.activeLayer||"political");this.setMapMode(this.mapState.mode||"political",{duration:0});this.handleZoom();this.render(true);
    this.dispatchEvent(new CustomEvent("ready",{detail:this.getDiagnostics()}));return this;
  }

  selectionCallbacks(){return{selectCountry:id=>this.callbacks.selectCountry?.(id),selectRegion:(countryId,regionId)=>this.callbacks.selectRegion?.(countryId,regionId),selectEntity:(type,id,data)=>this.selectEntity(type,id,data)}}

  controlActions(){return{setMapMode:(mode,options)=>this.setMapMode(mode,options),setBlend:value=>this.setBlend(value),setMapLayer:layer=>this.setMapLayer(layer),setLayerVisible:(id,visible)=>this.setLayerVisible(id,visible),setGroupVisible:(group,visible)=>this.setGroupVisible(group,visible),setQuality:quality=>this.setQuality(quality),setPitch:pitch=>this.setPitch(pitch),rotateBy:degrees=>this.rotateBy(degrees),toggleBaseMap:()=>this.toggleBaseMap(),zoomIn:()=>this.zoomBy(1),zoomOut:()=>this.zoomBy(-1),reset:()=>this.showWorld(),resetBearing:()=>this.resetBearing()}}

  setupControls(){if(this.controls)return this.controls;this.controls=new MapUIControls({mapState:this.mapState,layerManager:this.layerManager,lodManager:this.lodManager,performanceManager:this.performanceManager,actions:this.controlActions()});this.controls.initialize?.();return this.controls}

  bindRuntimeEvents(host){
    this.renderer.map.on("zoom",()=>this.handleZoom());
    this.renderer.addEventListener("contextlost",()=>this.activateFallback("El contexto WebGL se perdió; el mapa vectorial local sigue operativo"));
    this.renderer.addEventListener("contextrestored",()=>{if(this.initialized){this.fallback?.deactivate();this.renderer.host.hidden=false;this.render(true)}});
    this.assets.addEventListener("asseterror",event=>this.controls?.reportAssetFailure?.(event.detail));
    if(globalThis.ResizeObserver){this.resizeObserver=new ResizeObserver(()=>this.renderer?.resize());this.resizeObserver.observe(host)}
    else window.addEventListener("resize",()=>this.renderer?.resize(),{passive:true});
  }

  createSnapshot(){
    const source=this.adapter.createSnapshot?.(this.gameState)||this.adapter.refresh?.(this.gameState)||{};
    return this.decorateSnapshot(source);
  }

  decorateSnapshot(source){const profile=this.performanceManager?.getRenderProfile?.()||{},strategic=strategicOverlayData(this.gameState,source);return{...source,...strategic,clockFraction:clockFraction(this.gameState),clockAnchorTime:performance.now(),running:this.gameState.running,speed:this.gameState.speed,animations:this.gameState.settings?.mapAnimations!==false&&profile.animations!==false,particles:profile.particles!==false,quality:profile.effectiveQuality||this.performanceManager?.quality||"medium",selectedEntityId:this.mapState?.selectedEntityId||this.gameState?.mapSelectedEntityId||null,hoveredFeatureId:this.mapState?.hoveredFeatureId||null}}

  rebind(gameState,callbacks={}){
    this.gameState=gameState;this.callbacks=callbacks;this.mapState?.bindGameState?.(gameState);this.selection?.setCallbacks(this.selectionCallbacks());
    if(this.fallback?.active){this.fallback.initialize(gameState,callbacks,this.fallbackReason||"Mapa vectorial local");return}
    const view=this.mapState?.snapshot?.()||{};this.layerManager?.applyVisibility?.(view.visibleLayers);this.camera?.apply?.({animate:false});this.setMapMode(view.mode||"political",{duration:0});this.setMapLayer(view.activeLayer||gameState.mapLayer||"political");this.render(true);
  }

  render(force=false){
    if(this.fallback?.active){this.fallback.render();return}
    if(!this.initialized){this.pendingRender=true;return}
    const previous=this.snapshot,signature=`${this.gameState.dayIndex}|${this.gameState.selectedCountryId}|${this.gameState.selectedRegionId}|${this.gameState.countries?.length}|${this.gameState.wars?.length}|${this.gameState.tradeRoutes?.length}`;
    const source=!force&&signature===this.lastAdapterSignature?previous:(this.adapter.refresh?.(this.gameState)||{});this.lastAdapterSignature=signature;this.snapshot=this.decorateSnapshot(source);
    const revisions=this.snapshot.revisions||{},old=previous?.revisions||{};
    if(force||revisions.political!==old.political||revisions.selection!==old.selection)this.political.refresh(this.snapshot);
    this.simulation.update(this.snapshot,{immediate:force});this.three.update(this.snapshot);this.terrain.updateDayNight(this.snapshot.clockFraction);this.controls?.update?.(this.getDiagnostics());this.pendingRender=false;
  }

  setMapMode(mode,{duration}={}){
    if(!MODES.has(mode))throw new Error(`Modo cartográfico desconocido: ${mode}`);
    const transition=Number.isFinite(duration)?duration:Number(MAP_CONFIG?.transitionDuration||650);
    if(this.fallback?.active){this.mapState?.setMode?.(mode,{durationMs:transition,reducedMotion:transition===0});this.layerManager?.setMode?.(mode);this.fallback.setMapMode(mode);this.controls?.setMode?.(mode);return mode}
    if(!this.initialized){this.mapState?.setMode?.(mode,{durationMs:transition,reducedMotion:transition===0});this.layerManager?.setMode?.(mode);return mode}
    const before=this.camera.capture();this.mapState.setMode?.(mode,{durationMs:transition,reducedMotion:transition===0});this.layerManager.setMode?.(mode);this.camera.setMode(mode,{duration:transition});this.renderer.setMode(mode,{duration:transition});this.political.setMode(mode,{duration:transition});this.terrain.setMode(mode,{duration:transition});this.political.applyVisibility();this.terrain.applyVisibility();this.simulation.setMode(mode);this.three.setMode(mode);this.controls?.setMode?.(mode);
    this.dispatchEvent(new CustomEvent("modechange",{detail:{from:before.mode,to:mode,camera:this.mapState.snapshot()}}));return mode;
  }

  setBlend(value){
    const blend=Math.max(0,Math.min(1,Number(value)||0)),mode=blend<=.02?"political":blend>=.98?"terrain":"hybrid";
    this.mapState?.patch?.({visualBlend:blend*100});if(this.mapState?.mode!==mode)this.setMapMode(mode,{duration:0});
    this.political?.setBlend?.(blend);this.terrain?.setBlend?.(blend);this.setPitch(8+blend*50);this.controls?.setBlend?.(blend);return blend;
  }

  setMapLayer(layer){
    const value=String(layer||"political");if(this.gameState)this.gameState.mapLayer=value;this.mapState?.setActiveLayer?.(value);this.layerManager?.setActiveLayer?.(value);this.political?.setActiveLayer(value);this.fallback?.setMapLayer(value);this.controls?.setActiveLayer?.(value);this.render(true);return value;
  }

  setLayerVisible(id,visible){const layer=this.layerManager?.resolve?.(id);this.layerManager?.setVisible?.(id,visible);if(layer)this.mapState?.setLayerVisibility?.(layer.id,visible);this.political?.applyVisibility();this.terrain?.applyVisibility();this.simulation?.draw?.(performance.now());this.controls?.update?.(this.getDiagnostics())}
  setGroupVisible(group,visible){if(this.layerManager?.setGroupVisible)this.layerManager.setGroupVisible(group,visible);else for(const layer of this.layerManager?.getLayerDefinitions?.()||[])if(layer.group===group)this.layerManager.setVisible?.(layer.id,visible);const visibility={...this.mapState?.visibleLayers};for(const layer of this.layerManager?.getLayerDefinitions?.({group})||[])visibility[layer.id]=Boolean(visible);this.mapState?.patch?.({visibleLayers:visibility});this.political?.applyVisibility();this.terrain?.applyVisibility();this.simulation?.draw?.(performance.now());this.controls?.update?.(this.getDiagnostics())}

  applyQualityProfile(){const profile=this.performanceManager?.getRenderProfile?.()||{};this.renderer?.setQuality?.(profile);this.terrain?.setQuality?.(profile);this.three?.setQuality?.(profile);return profile}
  setQuality(quality){this.performanceManager?.setQuality?.(quality);this.mapState?.patch?.({quality});if(this.gameState?.settings)this.gameState.settings.mapQuality=quality;this.applyQualityProfile();this.controls?.setQuality?.(quality);this.handleZoom();this.render(true)}

  handleZoom(){
    const zoom=this.renderer?.map?.getZoom?.()??this.mapState?.zoom??2,lod=this.lodManager?.getLevel?.(zoom)??0,profile=this.lodManager?.profile?.(zoom,this.performanceManager?.quality||"auto")||null;
    this.mapState?.patch?.({zoom,lod});this.layerManager?.setLod?.(lod);this.simulation?.setLOD(lod,profile);this.terrain?.loadDetail(lod);this.controls?.setLOD?.(lod);
    this.requestedLod=lod;
    if(this.adapter?.setLod&&!this.pendingLod){this.pendingLod=(async()=>{while(this.requestedLod!==null){const target=this.requestedLod;this.requestedLod=null;try{const changed=await this.adapter.setLod(target);if(changed&&this.initialized)this.render(true)}catch(error){this.assets?.recordFailure?.(`country-lod-${target}`,error)}}})().finally(()=>{this.pendingLod=null;if(this.requestedLod!==null)this.handleZoom()})}
  }

  zoomBy(delta){if(this.renderer?.map)this.renderer.map.easeTo({zoom:this.renderer.map.getZoom()+delta,duration:420,essential:true});else if(this.gameState){this.gameState.mapZoom=Math.max(1,Math.min(16,Number(this.gameState.mapZoom||2)+delta));this.fallback?.render()}}
  resetBearing(){if(this.renderer?.map)this.renderer.map.easeTo({bearing:0,pitch:this.mapState.mode==="terrain"?58:this.mapState.mode==="hybrid"?28:8,duration:500,essential:true})}
  setPitch(pitch){const value=Math.max(0,Math.min(75,Number(pitch)||0));this.mapState?.patch?.({pitch:value});this.renderer?.map?.easeTo({pitch:value,duration:420,essential:true});return value}
  rotateBy(degrees){if(!this.renderer?.map)return 0;const bearing=this.renderer.map.getBearing()+(Number(degrees)||0);this.renderer.map.easeTo({bearing,duration:420,essential:true});return bearing}
  toggleBaseMap(){const layer="nexus-raster-provider",map=this.renderer?.map;if(!map?.getLayer(layer)){const next=this.mapState?.mode==="political"?"hybrid":"political";return this.setMapMode(next)}const visible=map.getLayoutProperty(layer,"visibility")!=="none";this.renderer.setVisibility(layer,!visible);if(this.gameState)this.gameState.mapBase=visible?"vector":"configured";return!visible}
  unproject(point){if(!this.renderer?.map)return null;const value=Array.isArray(point)?{x:Number(point[0]),y:Number(point[1])}:point;return this.renderer.map.unproject(value)}

  focusCountry(countryId){
    const feature=featureById(featureCollection(this.snapshot,"countries"),"countryId",countryId);
    if(feature&&this.camera?.focusGeometry(feature.geometry))return true;
    const country=this.gameState?.countries?.find(item=>item.id===countryId);if(country?.map&&this.camera){this.camera.focusPoint(country.map.lng,country.map.lat,{zoom:4.4});return true}
    return this.fallback?.focusCountry(countryId)||false;
  }

  focusRegion(countryOrRegionId,maybeRegionId){
    const regionId=maybeRegionId||countryOrRegionId,countryId=maybeRegionId?countryOrRegionId:null,feature=featureById(featureCollection(this.snapshot,"regions"),"regionId",regionId);
    if(feature&&this.camera?.focusGeometry(feature.geometry,{maxZoom:8.5}))return true;
    const region=this.snapshot?.regions?.find(item=>item.id===regionId||item.regionId===regionId);if(region&&this.camera){this.camera.focusPoint(region.longitude??region.lng,region.latitude??region.lat,{zoom:7});return true}
    return this.fallback?.focusRegion(countryId||this.gameState?.selectedCountryId,regionId)||false;
  }

  selectCountry(countryId){const result=this.selection?.selectCountry(countryId)??false;if(!this.selection)this.callbacks.selectCountry?.(countryId);this.render(true);return result}
  selectRegion(countryOrRegionId,maybeRegionId){const regionId=maybeRegionId||countryOrRegionId,countryId=maybeRegionId?countryOrRegionId:this.gameState?.selectedCountryId;const result=this.selection?.selectRegion(countryId,regionId)??false;if(!this.selection)this.callbacks.selectRegion?.(countryId,regionId);this.render(true);return result}
  setSelection(countryId=null,regionId=null){this.mapState?.setSelection?.(countryId,regionId);if(this.gameState){this.gameState.selectedCountryId=countryId;this.gameState.selectedRegionId=regionId}this.render(true);return{countryId,regionId}}
  selectEntity(type,id,data){this.mapState?.patch?.({selectedEntityId:id});this.callbacks.selectEntity?.(type,id,data);this.three?.setEntity?.(data);this.controls?.showEntity?.(type,data);return id}

  showWorld(){if(this.camera){this.camera.showWorld();this.gameState.mapMode="world";return true}return this.fallback?.showWorld()||false}
  updateMapEntities(gameState=this.gameState){this.gameState=gameState;this.render(true);return this.snapshot}
  refreshPoliticalColors(){this.adapter?.refresh?.(this.gameState,["political"]);this.render(true)}
  refreshIndustryMarkers(){this.adapter?.refresh?.(this.gameState,["industry"]);this.render(true)}
  refreshMilitaryMarkers(){this.adapter?.refresh?.(this.gameState,["military"]);this.render(true)}
  refreshTradeRoutes(){this.adapter?.refresh?.(this.gameState,["trade","logistics"]);this.render(true)}
  refreshWarFronts(){this.adapter?.refresh?.(this.gameState,["war","occupation"]);this.render(true)}

  activateFallback(reason="No se pudo iniciar el renderer WebGL"){
    this.fallbackReason=reason;const host=document.getElementById("strategicMap"),canvas=document.getElementById("strategicMapFallback"),notice=document.getElementById("mapFallbackNotice");
    this.renderer?.host&&(this.renderer.host.hidden=true);if(!this.fallback)this.fallback=new FallbackRenderer({host,canvas,notice});
    this.setupControls();
    if(!this.fallback.active)this.fallback.initialize(this.gameState,this.callbacks,reason);else this.fallback.render();
    this.dispatchEvent(new CustomEvent("fallback",{detail:{reason}}));return this.fallback;
  }

  getDiagnostics(){return{version:"6.0.0",mode:this.mapState?.mode||"political",camera:this.mapState?.snapshot?.()||null,lod:this.mapState?.lod??0,quality:this.performanceManager?.quality||"auto",performance:this.performanceManager?.getMetrics?.()||{},assets:this.assets?.getStatus?.()||{},fallback:Boolean(this.fallback?.active),counts:this.snapshot?.counts||{}}}

  destroy(){this.resizeObserver?.disconnect();this.resizeObserver=null;this.controls?.destroy?.();this.three?.destroy();this.simulation?.destroy();this.selection?.detach();this.camera?.detach();this.renderer?.destroy();this.assets?.dispose();this.initialized=false}
}

globalThis.NEXUS_MapEngine=MapEngine;
