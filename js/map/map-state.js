"use strict";

import{MAP_CONFIG,MAP_LAYERS,MAP_MODES}from"./map-config.js";

const clone=value=>globalThis.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,finite(value,min)));
const normalizeLongitude=value=>{let next=finite(value,0);while(next<-180)next+=360;while(next>180)next-=360;return next};
const normalizeBearing=value=>{let next=finite(value,0)%360;if(next>180)next-=360;if(next<=-180)next+=360;return next};
const validMode=value=>Object.hasOwn(MAP_MODES,value)?value:"political";
const validScope=value=>value==="regions"?"regions":"world";

function defaultsForLayers(input){
  const result=Object.fromEntries(MAP_LAYERS.map(layer=>[layer.id,layer.defaultVisible]));
  for(const [id,visible]of Object.entries(input||{}))result[id]=Boolean(visible);
  return result;
}

function initialFrom(input={}){
  const center=Array.isArray(input.mapCenter)?input.mapCenter:[];
  const candidateMode=input.mode||input.mapVisualMode||(Object.hasOwn(MAP_MODES,input.mapMode)?input.mapMode:null)||"political";
  const mode=validMode(candidateMode),modeConfig=MAP_MODES[mode];
  return{
    mode,
    longitude:normalizeLongitude(input.longitude??center[1]??MAP_CONFIG.camera.longitude),
    latitude:clamp(input.latitude??center[0]??MAP_CONFIG.camera.latitude,-85.0511,85.0511),
    zoom:clamp(input.zoom??input.mapZoom??MAP_CONFIG.camera.zoom,MAP_CONFIG.camera.minZoom,MAP_CONFIG.camera.maxZoom),
    pitch:clamp(input.pitch??input.mapPitch??modeConfig.pitch,MAP_CONFIG.camera.minPitch,MAP_CONFIG.camera.maxPitch),
    bearing:normalizeBearing(input.bearing??input.mapBearing??MAP_CONFIG.camera.bearing),
    selectedCountryId:input.selectedCountryId??null,
    selectedRegionId:input.selectedRegionId??null,
    selectedEntityId:input.selectedEntityId??input.mapSelectedEntityId??null,
    hoveredFeatureId:input.hoveredFeatureId??input.mapHoveredFeatureId??null,
    activeLayer:String(input.activeLayer??input.mapLayer??"political"),
    visibleLayers:defaultsForLayers(input.visibleLayers??input.mapVisibleLayers),
    scope:validScope(input.scope??input.mapScope??(input.mapMode==="regions"?"regions":"world")),
    visualBlend:clamp(input.visualBlend??input.mapVisualBlend??modeConfig.blend,0,100),
    quality:String(input.quality??input.mapQuality??input.settings?.mapQuality??"auto").toLowerCase(),
    showFps:Boolean(input.showFps??input.mapShowFps),
    lod:clamp(input.lod??input.mapLod??0,0,3),
    revision:Math.max(0,Math.trunc(finite(input.revision??input.mapViewRevision,0))),
    transition:{active:false,durationMs:0,startedAt:0,from:mode,to:mode}
  };
}

export class MapState{
  constructor(initialState={}){
    this._state=initialFrom(initialState);
    this._gameState=initialState&&typeof initialState==="object"?initialState:null;
    this._subscribers=new Set();
  }

  get mode(){return this._state.mode}
  get longitude(){return this._state.longitude}
  get latitude(){return this._state.latitude}
  get zoom(){return this._state.zoom}
  get pitch(){return this._state.pitch}
  get bearing(){return this._state.bearing}
  get selectedCountryId(){return this._state.selectedCountryId}
  get selectedRegionId(){return this._state.selectedRegionId}
  get selectedEntityId(){return this._state.selectedEntityId}
  get hoveredFeatureId(){return this._state.hoveredFeatureId}
  get activeLayer(){return this._state.activeLayer}
  get visibleLayers(){return{...this._state.visibleLayers}}
  get scope(){return this._state.scope}
  get quality(){return this._state.quality}
  get lod(){return this._state.lod}

  snapshot(){return clone(this._state)}

  subscribe(listener){
    if(typeof listener!=="function")throw new TypeError("MapState.subscribe requiere una función");
    this._subscribers.add(listener);
    return()=>this._subscribers.delete(listener);
  }

  patch(changes={},meta={}){
    if(!changes||typeof changes!=="object")return this.snapshot();
    const before=this.snapshot(),next={...this._state};
    if("mode"in changes)next.mode=validMode(changes.mode);
    if("longitude"in changes)next.longitude=normalizeLongitude(changes.longitude);
    if("latitude"in changes)next.latitude=clamp(changes.latitude,-85.0511,85.0511);
    if("zoom"in changes)next.zoom=clamp(changes.zoom,MAP_CONFIG.camera.minZoom,MAP_CONFIG.camera.maxZoom);
    if("pitch"in changes)next.pitch=clamp(changes.pitch,MAP_CONFIG.camera.minPitch,MAP_CONFIG.camera.maxPitch);
    if("bearing"in changes)next.bearing=normalizeBearing(changes.bearing);
    if("selectedCountryId"in changes)next.selectedCountryId=changes.selectedCountryId??null;
    if("selectedRegionId"in changes)next.selectedRegionId=changes.selectedRegionId??null;
    if("selectedEntityId"in changes)next.selectedEntityId=changes.selectedEntityId??null;
    if("hoveredFeatureId"in changes)next.hoveredFeatureId=changes.hoveredFeatureId??null;
    if("activeLayer"in changes)next.activeLayer=String(changes.activeLayer||"political");
    if("visibleLayers"in changes)next.visibleLayers=defaultsForLayers(changes.visibleLayers);
    if("scope"in changes)next.scope=validScope(changes.scope);
    if("visualBlend"in changes)next.visualBlend=clamp(changes.visualBlend,0,100);
    if("quality"in changes)next.quality=String(changes.quality||"auto").toLowerCase();
    if("showFps"in changes)next.showFps=Boolean(changes.showFps);
    if("lod"in changes)next.lod=clamp(changes.lod,0,3);
    if("transition"in changes)next.transition={...next.transition,...changes.transition};
    const changed=Object.keys(next).filter(key=>JSON.stringify(next[key])!==JSON.stringify(this._state[key]));
    if(!changed.length)return this.snapshot();
    next.revision=this._state.revision+1;
    this._state=next;
    if(this._gameState)this.syncToGameState(this._gameState);
    const detail={before,current:this.snapshot(),changed,source:meta.source||"patch",durationMs:finite(meta.durationMs,0)};
    for(const listener of this._subscribers){try{listener(detail)}catch(error){queueMicrotask(()=>{throw error})}}
    return detail.current;
  }

  setMode(mode,options={}){
    const nextMode=validMode(mode),from=this._state.mode,reduced=Boolean(options.reducedMotion),durationMs=reduced?0:clamp(options.durationMs??MAP_MODES[nextMode].transitionMs,400,800);
    const changes={
      mode:nextMode,
      pitch:options.preservePitch?this._state.pitch:MAP_MODES[nextMode].pitch,
      visualBlend:options.preserveBlend?this._state.visualBlend:MAP_MODES[nextMode].blend,
      transition:{active:durationMs>0,durationMs,startedAt:Date.now(),from,to:nextMode}
    };
    return this.patch(changes,{source:"setMode",durationMs});
  }

  setCamera(camera={},meta={}){return this.patch(camera,{source:meta.source||"camera",durationMs:meta.durationMs||0})}
  setSelection(countryId=null,regionId=null){return this.patch({selectedCountryId:countryId,selectedRegionId:regionId},{source:"selection"})}
  setHoveredFeature(featureId=null){return this.patch({hoveredFeatureId:featureId},{source:"hover"})}
  setActiveLayer(layer){return this.patch({activeLayer:layer},{source:"active-layer"})}
  setLayerVisibility(id,visible){return this.patch({visibleLayers:{...this._state.visibleLayers,[id]:Boolean(visible)}},{source:"layer-visibility"})}

  hydrateFromGameState(gameState={}){
    this._gameState=gameState;
    const center=Array.isArray(gameState.mapCenter)?gameState.mapCenter:[];
    const normalized=initialFrom({...this._state,...gameState,mode:gameState.mapVisualMode??this._state.mode,longitude:gameState.longitude??center[1]??this._state.longitude,latitude:gameState.latitude??center[0]??this._state.latitude,zoom:gameState.mapZoom??gameState.zoom??this._state.zoom,pitch:gameState.mapPitch??gameState.pitch??this._state.pitch,bearing:gameState.mapBearing??gameState.bearing??this._state.bearing,hoveredFeatureId:gameState.mapHoveredFeatureId??gameState.hoveredFeatureId??this._state.hoveredFeatureId,activeLayer:gameState.mapLayer??gameState.activeLayer??this._state.activeLayer,visibleLayers:gameState.mapVisibleLayers??gameState.visibleLayers??this._state.visibleLayers,scope:gameState.mapScope??(gameState.mapMode==="regions"?"regions":"world"),visualBlend:gameState.mapVisualBlend??gameState.visualBlend??this._state.visualBlend,quality:gameState.mapQuality??gameState.settings?.mapQuality??this._state.quality,showFps:gameState.mapShowFps??gameState.showFps??this._state.showFps,lod:gameState.mapLod??gameState.lod??this._state.lod,selectedEntityId:gameState.mapSelectedEntityId??gameState.selectedEntityId??this._state.selectedEntityId});
    normalized.revision=this._state.revision;
    return this.patch(normalized,{source:"hydrate-game-state"});
  }

  bindGameState(gameState={}){return this.hydrateFromGameState(gameState)}

  syncToGameState(gameState=this._gameState||{}){
    const current=this._state;
    gameState.mapVisualMode=current.mode;
    gameState.mapCenter=[current.latitude,current.longitude];
    gameState.mapZoom=current.zoom;
    gameState.mapPitch=current.pitch;
    gameState.mapBearing=current.bearing;
    gameState.mapHoveredFeatureId=current.hoveredFeatureId;
    gameState.mapSelectedEntityId=current.selectedEntityId;
    gameState.mapLayer=current.activeLayer;
    gameState.mapVisibleLayers={...current.visibleLayers};
    gameState.mapScope=current.scope;
    gameState.mapVisualBlend=current.visualBlend;
    gameState.mapQuality=current.quality;
    gameState.mapShowFps=current.showFps;
    gameState.mapLod=current.lod;
    gameState.mapViewRevision=current.revision;
    gameState.selectedCountryId=current.selectedCountryId;
    gameState.selectedRegionId=current.selectedRegionId;
    if(gameState.mapMode!=="world"&&gameState.mapMode!=="regions")gameState.mapMode=current.scope;
    return gameState;
  }
}

export const createMapState=initialState=>new MapState(initialState);

if(typeof globalThis!=="undefined"){
  const namespace=globalThis.NEXUS_MAP_V6 ||= {};
  Object.assign(namespace,{MapState,createMapState});
}
