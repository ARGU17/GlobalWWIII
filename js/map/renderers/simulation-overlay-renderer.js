"use strict";

import{UnitRenderer}from"./unit-renderer.js";
import{InfrastructureRenderer}from"./infrastructure-renderer.js";
import{TradeRenderer}from"./trade-renderer.js";
import{WarRenderer}from"./war-renderer.js";
import{StrategicOverlayRenderer}from"./strategic-overlay-renderer.js";
import{asArray,positionOf,routePath,validPosition}from"./render-utils.js";

const EMPTY={type:"FeatureCollection",features:[]};
const prefixId=id=>String(id||"").slice(0,2);

export class SimulationOverlayRenderer{
  constructor({renderer,layerManager,performanceManager,onSelect=()=>{}}={}){
    this.renderer=renderer;this.layers=layerManager;this.performance=performanceManager;this.onSelect=onSelect;this.overlay=null;this.snapshot=null;this.mode="political";this.lod=0;this.lodProfile=null;this.frame=0;this.lastFrameAt=0;this.usingDeck=false;this.clockFraction=0;
    this.builders=[new InfrastructureRenderer({onSelect}),new TradeRenderer({onSelect}),new UnitRenderer({onSelect}),new WarRenderer({onSelect}),new StrategicOverlayRenderer({onSelect})];
  }

  initialize(snapshot){
    this.snapshot=snapshot;
    if(globalThis.deck?.MapboxOverlay){
      try{this.overlay=new globalThis.deck.MapboxOverlay({interleaved:false,layers:[]});this.renderer.map.addControl(this.overlay);this.usingDeck=true}
      catch(error){this.renderer.assets?.recordFailure?.("deck-overlay",error);this.initializeMapLibreFallback()}
    }else this.initializeMapLibreFallback();
    this.update(snapshot,{immediate:true});this.startAnimation();
  }

  initializeMapLibreFallback(){
    const r=this.renderer;this.usingDeck=false;
    r.ensureSource("nexus-simulation-points",{type:"geojson",data:EMPTY,promoteId:"featureId"});
    r.ensureSource("nexus-simulation-lines",{type:"geojson",data:EMPTY,promoteId:"featureId"});
    r.ensureLayer({id:"34-trade-routes",type:"line",source:"nexus-simulation-lines",filter:["==",["get","kind"],"trade"],paint:{"line-color":"#51c7e7","line-width":2,"line-dasharray":[4,4],"line-opacity":.75}});
    r.ensureLayer({id:"39-war-fronts",type:"line",source:"nexus-simulation-lines",filter:["==",["get","kind"],"front"],paint:{"line-color":"#f05256","line-width":4,"line-opacity":.9}});
    for(const[id,kind,color]of[["31-industries","facility","#73d2e0"],["35-land-units","unit","#4bd897"],["40-battles","battle","#f84d43"]])r.ensureLayer({id,type:"circle",source:"nexus-simulation-points",filter:["==",["get","kind"],kind],paint:{"circle-radius":6,"circle-color":color,"circle-stroke-color":"#edf8fb","circle-stroke-width":1.2}});
  }

  update(snapshot,{immediate=false}={}){this.snapshot=snapshot||this.snapshot;this.clockFraction=Number(snapshot?.clockFraction||0);if(immediate||!this.frame)this.draw(performance.now())}
  setMode(mode){this.mode=mode;this.draw(performance.now())}
  setLOD(lod,profile=null){const changed=this.lod!==lod||profile?.entityLimit!==this.lodProfile?.entityLimit;this.lod=lod;this.lodProfile=profile||this.lodProfile;if(changed)this.draw(performance.now())}

  viewportBounds(){const bounds=this.renderer?.map?.getBounds?.();if(!bounds)return null;return{west:Number(bounds.getWest?.()??bounds._sw?.lng),east:Number(bounds.getEast?.()??bounds._ne?.lng),south:Number(bounds.getSouth?.()??bounds._sw?.lat),north:Number(bounds.getNorth?.()??bounds._ne?.lat)}}

  buildDeckLayers(time){
    const quality=this.performance?.quality||this.performance?.getProfile?.()?.name||"high";
    return this.builders.flatMap(builder=>builder.buildLayers(this.snapshot,{mode:this.mode,lod:this.lod,quality,clockFraction:this.animatedClock(time),time,entityLimit:this.lodProfile?.entityLimit||9000,viewport:this.lod===0?null:this.viewportBounds()})).filter(layer=>this.layers?.isVisible?.(prefixId(layer.id))!==false);
  }

  animatedClock(time){const running=this.snapshot?.running!==false,speed=Number(this.snapshot?.speed||1),anchor=Number(this.snapshot?.clockAnchorTime||time);return running?(this.clockFraction+(time-anchor)/10000*speed)%1:this.clockFraction}

  draw(time){
    if(!this.snapshot)return;const started=performance.now();
    if(this.usingDeck)this.overlay?.setProps({layers:this.buildDeckLayers(time)});else this.updateMapLibreFallback();
    this.performance?.recordRenderCost?.(performance.now()-started);this.performance?.recordPresentedFrame?.(time);this.lastFrameAt=time;
  }

  updateMapLibreFallback(){
    const pointFeatures=[],lineFeatures=[];
    for(const[kind,items]of[["facility",[...asArray(this.snapshot.facilities),...asArray(this.snapshot.industries)]],["unit",asArray(this.snapshot.units)],["battle",asArray(this.snapshot.battles)]])for(const item of items)if(validPosition(item))pointFeatures.push({type:"Feature",id:item.entityId||item.id,properties:{...item,kind,featureId:item.entityId||item.id},geometry:{type:"Point",coordinates:positionOf(item)}});
    for(const[kind,items]of[["trade",asArray(this.snapshot.routes)],["front",asArray(this.snapshot.fronts)]])for(const item of items){const path=routePath(item);if(path.length>=2)lineFeatures.push({type:"Feature",id:item.entityId||item.id,properties:{kind,featureId:item.entityId||item.id,name:item.name||kind},geometry:{type:"LineString",coordinates:path}})}
    this.renderer.setSourceData("nexus-simulation-points",{type:"FeatureCollection",features:pointFeatures});this.renderer.setSourceData("nexus-simulation-lines",{type:"FeatureCollection",features:lineFeatures});
  }

  startAnimation(){
    if(this.frame)return;
    const loop=time=>{
      const animated=this.snapshot?.animations!==false&&(asArray(this.snapshot?.routes).length||asArray(this.snapshot?.wars).length||asArray(this.snapshot?.orders).length);
      const target=Number(this.performance?.targetFps||30),interval=1000/Math.max(12,target);
      if(animated&&time-this.lastFrameAt>=interval&&!document.hidden)this.draw(time);
      this.frame=requestAnimationFrame(loop);
    };
    this.frame=requestAnimationFrame(loop);
  }

  destroy(){if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;if(this.overlay&&this.renderer.map){try{this.renderer.map.removeControl(this.overlay)}catch(_){}}this.overlay=null}
}

globalThis.NEXUS_SimulationOverlayRenderer=SimulationOverlayRenderer;
