"use strict";

const EMPTY={type:"FeatureCollection",features:[]};
const sourceData=(snapshot,key)=>snapshot?.geography?.[key]||snapshot?.[`${key}GeoJSON`]||EMPTY;

export class RegionRenderer{
  constructor({renderer,layerManager}={}){this.renderer=renderer;this.layers=layerManager}

  initialize(snapshot){
    const r=this.renderer;
    r.ensureSource("nexus-regions",{type:"geojson",data:sourceData(snapshot,"regions"),promoteId:"featureId"});
    r.ensureSource("nexus-provinces",{type:"geojson",data:sourceData(snapshot,"provinces"),promoteId:"featureId"});
    r.ensureLayer({id:"21-regions-fill",type:"fill",source:"nexus-regions",minzoom:3.4,metadata:{nexusLayer:"21"},paint:{"fill-color":["coalesce",["get","politicalColor"],"#2b6881"],"fill-opacity":["case",["boolean",["get","selected"],false],.42,.12],"fill-opacity-transition":{duration:650}}});
    r.ensureLayer({id:"22-provinces-fill",type:"fill",source:"nexus-provinces",minzoom:6.2,metadata:{nexusLayer:"22"},paint:{"fill-color":"#6f9baa","fill-opacity":.07,"fill-opacity-transition":{duration:650}}});
    r.ensureLayer({id:"26-regional-borders",type:"line",source:"nexus-regions",minzoom:3.4,metadata:{nexusLayer:"26"},paint:{"line-color":["case",["boolean",["get","selected"],false],"#ffe46a","#72cee8"],"line-width":["case",["boolean",["get","selected"],false],2.4,.7],"line-opacity":.78,"line-opacity-transition":{duration:650}}});
    this.applyVisibility();
  }

  refresh(snapshot){this.renderer.setSourceData("nexus-regions",sourceData(snapshot,"regions"));this.renderer.setSourceData("nexus-provinces",sourceData(snapshot,"provinces"))}
  setMode(mode){this.renderer.setPaint("21-regions-fill","fill-opacity",mode==="terrain"?.04:mode==="hybrid"?.09:.14)}
  applyVisibility(){for(const[id,layer]of[["21","21-regions-fill"],["22","22-provinces-fill"],["26","26-regional-borders"]])this.renderer.setVisibility(layer,this.layers?.isVisible?.(id)!==false)}
}

globalThis.NEXUS_RegionRenderer=RegionRenderer;

