"use strict";

const ROOT_URL=new URL("../../../",import.meta.url);

function supportsWebGL(){
  try{
    const canvas=document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2",{failIfMajorPerformanceCaveat:true})||canvas.getContext("webgl",{failIfMajorPerformanceCaveat:true}));
  }catch(_){return false}
}

export class AssetManager extends EventTarget{
  constructor({rootUrl=ROOT_URL,providers=globalThis.NEXUS_MAP_PROVIDERS||{}}={}){
    super();
    this.rootUrl=rootUrl;
    this.providers=providers;
    this.cache=new Map();
    this.failures=new Map();
    this.capabilities={webgl:supportsWebGL(),maplibre:Boolean(globalThis.maplibregl?.Map),deck:Boolean(globalThis.deck?.MapboxOverlay),three:Boolean(globalThis.THREE)};
  }

  resolve(path){return new URL(String(path).replace(/^\//,""),this.rootUrl).href}
  resolveTemplate(path){return this.resolve(String(path).replaceAll("{z}","__NEXUS_Z__").replaceAll("{x}","__NEXUS_X__").replaceAll("{y}","__NEXUS_Y__")).replaceAll("__NEXUS_Z__","{z}").replaceAll("__NEXUS_X__","{x}").replaceAll("__NEXUS_Y__","{y}")}

  async fetchJSON(path,{fallback=null,required=false}={}){
    const url=this.resolve(path);
    if(this.cache.has(url))return this.cache.get(url);
    const request=fetch(url,{cache:"force-cache"}).then(async response=>{
      if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);
      return response.json();
    }).catch(error=>{
      this.recordFailure(path,error);
      if(fallback!==null)return typeof fallback==="function"?fallback(error):fallback;
      if(required)throw new Error(`No se pudo cargar el recurso obligatorio ${path}: ${error.message}`);
      return null;
    });
    this.cache.set(url,request);
    return request;
  }

  async fetchText(path,{fallback="",required=false}={}){
    const url=this.resolve(path);
    if(this.cache.has(url))return this.cache.get(url);
    const request=fetch(url,{cache:"force-cache"}).then(async response=>{
      if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);
      return response.text();
    }).catch(error=>{
      this.recordFailure(path,error);
      if(required)throw new Error(`No se pudo cargar el recurso obligatorio ${path}: ${error.message}`);
      return fallback;
    });
    this.cache.set(url,request);
    return request;
  }

  recordFailure(asset,error){
    const detail={asset,message:error?.message||String(error),at:Date.now()};
    this.failures.set(asset,detail);
    this.dispatchEvent(new CustomEvent("asseterror",{detail}));
  }

  clearFailure(asset){this.failures.delete(asset)}

  getStatus(){
    return{...this.capabilities,offline:typeof navigator!=="undefined"&&navigator.onLine===false,failures:[...this.failures.values()]};
  }

  getVectorDataset(lod=0){
    if(lod<=0)return"assets/maps/v6/ne_110m_admin_0_countries.geojson";
    if(lod>=3)return"assets/maps/v6/ne_10m_admin_0_countries.geojson";
    return"assets/maps/v6/ne_50m_admin_0_countries.geojson";
  }

  getDemSource(){
    const configured=this.providers.demUrlTemplate||globalThis.NEXUS_MAP_TILE_PROVIDER?.demUrlTemplate;
    const local=this.resolveTemplate("assets/maps/v6/dem/{z}/{x}/{y}.png");
    return{
      type:"raster-dem",
      tiles:[configured||local],
      encoding:this.providers.demEncoding||"terrarium",
      tileSize:256,
      minzoom:0,
      maxzoom:Number(this.providers.demMaxZoom??3),
      attribution:"Elevación Mapzen/AWS Terrain Tiles"
    };
  }

  getRasterProvider(){
    const template=this.providers.rasterUrlTemplate||globalThis.NEXUS_MAP_TILE_PROVIDER?.urlTemplate;
    if(!template)return null;
    return{type:"raster",tiles:[template],tileSize:256,minzoom:0,maxzoom:Number(this.providers.rasterMaxZoom??14),attribution:this.providers.attribution||"Proveedor cartográfico configurado por el usuario"};
  }

  dispose(){this.cache.clear();this.failures.clear()}
}

globalThis.NEXUS_AssetManager=AssetManager;
