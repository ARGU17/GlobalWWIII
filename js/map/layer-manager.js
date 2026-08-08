"use strict";

import{MAP_CONFIG}from"./map-config.js";

const MODE_IDS=new Set(["political","hybrid","terrain"]);

export class LayerManager{
  constructor(config=MAP_CONFIG){
    const definitions=Array.isArray(config)?config:config?.layers;
    if(!Array.isArray(definitions)||definitions.length!==58)throw new Error("LayerManager requiere las 58 capas cartográficas 00-57");
    this.config=Array.isArray(config)?MAP_CONFIG:config;
    this.layers=[...definitions].sort((a,b)=>a.index-b.index);
    this.byId=new Map();
    for(const layer of this.layers){
      if(!Number.isInteger(layer.index)||layer.index<0||layer.index>57)throw new Error(`Índice de capa inválido: ${layer.index}`);
      if(this.byId.has(layer.id)||this.byId.has(layer.slug)||this.byId.has(layer.code))throw new Error(`Capa duplicada: ${layer.id}`);
      this.byId.set(layer.id,layer);this.byId.set(layer.slug,layer);this.byId.set(layer.code,layer);
    }
    if(new Set(this.layers.map(layer=>layer.index)).size!==58)throw new Error("La secuencia de capas 00-57 está incompleta");
    this.mode="political";
    this.activeLayer="political";
    this.lod=0;
    this.visible=Object.fromEntries(this.layers.map(layer=>[layer.id,Boolean(layer.defaultVisible)]));
    this.listeners=new Set();
  }

  resolve(id){return this.byId.get(String(id))||null}

  subscribe(listener){
    if(typeof listener!=="function")throw new TypeError("LayerManager.subscribe requiere una función");
    this.listeners.add(listener);return()=>this.listeners.delete(listener);
  }

  emit(type,detail={}){
    const event={type,mode:this.mode,activeLayer:this.activeLayer,lod:this.lod,...detail};
    for(const listener of this.listeners)listener(event);
    return event;
  }

  setMode(mode){
    if(!MODE_IDS.has(mode))throw new RangeError(`Modo cartográfico desconocido: ${mode}`);
    if(this.mode===mode)return this.mode;
    const previous=this.mode;this.mode=mode;this.emit("mode",{previous,current:mode});return mode;
  }

  setActiveLayer(layer){
    const value=String(layer||"political");
    if(this.activeLayer===value)return value;
    const previous=this.activeLayer;this.activeLayer=value;this.emit("active-layer",{previous,current:value,definition:this.resolve(value)});return value;
  }

  setLod(level){
    const next=Math.max(0,Math.min(3,Math.trunc(Number(level)||0)));
    if(next===this.lod)return next;
    const previous=this.lod;this.lod=next;this.emit("lod",{previous,current:next});return next;
  }

  setVisible(id,visible=true){
    const layer=this.resolve(id);if(!layer)throw new RangeError(`Capa cartográfica desconocida: ${id}`);
    const next=Boolean(visible);if(this.visible[layer.id]===next)return next;
    this.visible[layer.id]=next;this.emit("visibility",{id:layer.id,visible:next,layer});return next;
  }

  setGroupVisible(group,visible=true){
    const affected=this.layers.filter(layer=>layer.group===group);if(!affected.length)throw new RangeError(`Grupo cartográfico desconocido: ${group}`);
    for(const layer of affected)this.visible[layer.id]=Boolean(visible);
    this.emit("group-visibility",{group,visible:Boolean(visible),ids:affected.map(layer=>layer.id)});
    return affected.length;
  }

  isVisible(id,options={}){
    const layer=this.resolve(id);if(!layer)return false;
    const mode=options.mode||this.mode,lod=Number.isFinite(Number(options.lod))?Number(options.lod):this.lod;
    return this.visible[layer.id]!==false&&layer.modes.includes(mode)&&lod>=layer.minLod&&lod<=layer.maxLod;
  }

  getLayerDefinitions(options={}){
    const mode=options.mode||this.mode,lod=Number.isFinite(Number(options.lod))?Number(options.lod):this.lod;
    return this.layers.filter(layer=>{
      if(options.group&&layer.group!==options.group)return false;
      if(options.renderer&&layer.renderer!==options.renderer)return false;
      if(options.interactive!==undefined&&layer.interactive!==Boolean(options.interactive))return false;
      if(options.visible===true&&!this.isVisible(layer.id,{mode,lod}))return false;
      if(options.visible===false&&this.isVisible(layer.id,{mode,lod}))return false;
      if(options.available===true&&(!layer.modes.includes(mode)||lod<layer.minLod||lod>layer.maxLod))return false;
      return true;
    });
  }

  getRendererBuckets(options={visible:true}){
    const result={maplibre:[],deck:[],three:[],dom:[]};
    for(const layer of this.getLayerDefinitions(options))(result[layer.renderer]||=([])).push(layer);
    return result;
  }

  applyVisibility(visibleLayers={}){
    for(const [id,visible]of Object.entries(visibleLayers)){const layer=this.resolve(id);if(layer)this.visible[layer.id]=Boolean(visible)}
    this.emit("visibility-batch",{visible:{...this.visible}});return{...this.visible};
  }

  snapshot(){return{mode:this.mode,activeLayer:this.activeLayer,lod:this.lod,visible:{...this.visible}}}

  syncToMapState(mapState){
    const snapshot=this.snapshot();
    mapState?.patch?.({activeLayer:snapshot.activeLayer,visibleLayers:snapshot.visible},{source:"layer-manager"});
    return snapshot;
  }
}

if(typeof globalThis!=="undefined"){
  const namespace=globalThis.NEXUS_MAP_V6 ||= {};
  namespace.LayerManager=LayerManager;
}
