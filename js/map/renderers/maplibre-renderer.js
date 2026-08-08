"use strict";

const EMPTY={type:"FeatureCollection",features:[]};

export class MapLibreRenderer extends EventTarget{
  constructor({host,mapState,assetManager,performanceManager}={}){
    super();this.host=host;this.state=mapState;this.assets=assetManager;this.performance=performanceManager;this.map=null;this.ready=false;this.contextLost=false;this.listeners=[];
  }

  isSupported(){return Boolean(this.assets?.capabilities?.webgl&&globalThis.maplibregl?.Map&&this.host)}

  async initialize(){
    if(!this.isSupported())throw new Error("WebGL o MapLibre no están disponibles");
    const view=this.state.snapshot?.()||this.state;
    this.host.hidden=false;
    const style={version:8,name:"NEXUS local",sources:{},layers:[{id:"nexus-background",type:"background",paint:{"background-color":"#071521","background-opacity":1}}]};
    this.map=new globalThis.maplibregl.Map({
      container:this.host,style,center:[view.longitude,view.latitude],zoom:view.zoom,pitch:view.pitch,bearing:view.bearing,
      minZoom:1,maxZoom:16,maxPitch:80,renderWorldCopies:true,hash:false,attributionControl:false,fadeDuration:300,
      canvasContextAttributes:{antialias:true,preserveDrawingBuffer:false,powerPreference:"high-performance"}
    });
    if(globalThis.maplibregl.AttributionControl)this.map.addControl(new globalThis.maplibregl.AttributionControl({compact:true,customAttribution:"Natural Earth · es-atlas · NEXUS"}),"bottom-right");
    if(globalThis.maplibregl.ScaleControl)this.map.addControl(new globalThis.maplibregl.ScaleControl({maxWidth:130,unit:"metric"}),"bottom-left");
    this.map.dragRotate.enable();this.map.touchZoomRotate.enableRotation();
    const canvas=this.map.getCanvas();
    const lost=event=>{event.preventDefault();this.contextLost=true;this.dispatchEvent(new CustomEvent("contextlost"))};
    const restored=()=>{this.contextLost=false;this.dispatchEvent(new CustomEvent("contextrestored"))};
    canvas.addEventListener("webglcontextlost",lost,false);canvas.addEventListener("webglcontextrestored",restored,false);
    this.listeners.push([canvas,"webglcontextlost",lost],[canvas,"webglcontextrestored",restored]);
    this.map.on("error",event=>{
      const error=event?.error||new Error("Error cartográfico desconocido");
      this.assets?.recordFailure?.("maplibre-runtime",error);
      this.dispatchEvent(new CustomEvent("rendererror",{detail:error}));
    });
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("MapLibre no terminó de iniciar en 12 segundos")),12000);
      this.map.once("load",()=>{clearTimeout(timer);resolve()});
      this.map.once("error",event=>{if(!this.map?.loaded()){clearTimeout(timer);reject(event.error||new Error("No se pudo cargar el estilo local"))}});
    });
    this.ready=true;this.setMode(view.mode,{duration:0});
    return this;
  }

  ensureSource(id,spec={type:"geojson",data:EMPTY}){
    if(!this.ready)return null;
    if(!this.map.getSource(id))this.map.addSource(id,spec);
    return this.map.getSource(id);
  }

  setSourceData(id,data){
    if(!this.ready)return false;
    const source=this.map.getSource(id);
    if(source?.setData){source.setData(data||EMPTY);return true}
    this.map.addSource(id,{type:"geojson",data:data||EMPTY,promoteId:"featureId"});return true;
  }

  ensureLayer(layer,beforeId){
    if(!this.ready||this.map.getLayer(layer.id))return false;
    this.map.addLayer(layer,beforeId&&this.map.getLayer(beforeId)?beforeId:undefined);return true;
  }

  setPaint(id,property,value,options){if(this.map?.getLayer(id))this.map.setPaintProperty(id,property,value,options)}
  setLayout(id,property,value){if(this.map?.getLayer(id))this.map.setLayoutProperty(id,property,value)}
  setVisibility(id,visible){this.setLayout(id,"visibility",visible?"visible":"none")}

  setMode(mode,{duration=650}={}){
    if(!this.map)return;
    this.host.dataset.mapMode=mode;
    const colors={political:"#071521",hybrid:"#071a23",terrain:"#02090f"};
    this.setPaint("nexus-background","background-color",colors[mode]||colors.political,{duration});
  }

  setQuality(profile={}){
    if(!this.map)return profile;
    const nativeRatio=Number(globalThis.devicePixelRatio)||1,maxRatio=Math.max(.5,Number(profile.maxPixelRatio)||nativeRatio),scale=Math.max(.5,Math.min(1,Number(profile.resolutionScale)||1)),ratio=Math.max(.5,Math.min(nativeRatio,maxRatio)*scale);
    try{this.map.setPixelRatio?.(ratio)}catch(error){this.assets?.recordFailure?.("map-pixel-ratio",error)}
    this.host.dataset.mapEffectiveQuality=profile.effectiveQuality||"medium";return profile;
  }

  resize(){this.map?.resize()}

  destroy(){
    for(const[element,type,handler]of this.listeners)element.removeEventListener(type,handler);
    this.listeners=[];this.ready=false;this.map?.remove();this.map=null;
  }
}

globalThis.NEXUS_MapLibreRenderer=MapLibreRenderer;
