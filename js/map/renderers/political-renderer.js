"use strict";

import{RegionRenderer}from"./region-renderer.js";

const EMPTY={type:"FeatureCollection",features:[]};
const sourceData=(snapshot,key)=>snapshot?.geography?.[key]||snapshot?.[`${key}GeoJSON`]||snapshot?.[key]?.geojson||EMPTY;

function thematicExpression(layer){
  const property={economy:"economyColor",military:"militaryColor",industry:"industryColor",technology:"technologyColor",stability:"stabilityColor",resources:"resourceColor",political:"politicalColor"}[layer]||"politicalColor";
  return["coalesce",["get",property],["get","politicalColor"],"#315875"];
}

function hatchImage(){
  const size=8,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const index=(y*size+x)*4,on=(x+y)%8<2;
    data[index]=255;data[index+1]=205;data[index+2]=87;data[index+3]=on?150:18;
  }
  return{width:size,height:size,data};
}

export class PoliticalRenderer{
  constructor({renderer,layerManager}={}){this.renderer=renderer;this.layers=layerManager;this.regions=new RegionRenderer({renderer,layerManager});this.snapshot=null;this.activeLayer="political"}

  initialize(snapshot){
    this.snapshot=snapshot;const r=this.renderer;
    r.ensureSource("nexus-countries",{type:"geojson",data:sourceData(snapshot,"countries"),promoteId:"featureId"});
    r.ensureSource("nexus-occupations",{type:"geojson",data:sourceData(snapshot,"occupations"),promoteId:"featureId"});
    r.ensureSource("nexus-claims",{type:"geojson",data:sourceData(snapshot,"claims"),promoteId:"featureId"});
    if(!r.map.hasImage("nexus-occupation-hatch"))r.map.addImage("nexus-occupation-hatch",hatchImage(),{pixelRatio:1});
    r.ensureLayer({id:"20-countries-fill",type:"fill",source:"nexus-countries",metadata:{nexusLayer:"20"},paint:{"fill-color":thematicExpression(this.activeLayer),"fill-opacity":["case",["==",["get","sovereign"],false],.18,.72],"fill-antialias":true,"fill-color-transition":{duration:650},"fill-opacity-transition":{duration:650}}});
    r.ensureLayer({id:"23-occupation",type:"fill",source:"nexus-occupations",metadata:{nexusLayer:"23"},paint:{"fill-pattern":"nexus-occupation-hatch","fill-opacity":.7}});
    r.ensureLayer({id:"24-claims",type:"line",source:"nexus-claims",metadata:{nexusLayer:"24"},paint:{"line-color":"#ffb45e","line-width":1.8,"line-dasharray":[2,2],"line-opacity":.88}});
    r.ensureLayer({id:"25-national-borders",type:"line",source:"nexus-countries",metadata:{nexusLayer:"25"},paint:{"line-color":["case",["boolean",["get","selected"],false],"#ffffff",["boolean",["get","controlled"],false],"#ffe66d","#89bed3"],"line-width":["case",["boolean",["get","selected"],false],2.8,["boolean",["get","controlled"],false],2,0.75],"line-opacity":.92}});
    this.regions.initialize(snapshot);
    r.ensureLayer({id:"50-selection",type:"line",source:"nexus-countries",filter:["==",["get","selected"],true],metadata:{nexusLayer:"50"},paint:{"line-color":"#ffffff","line-width":4,"line-blur":1.2,"line-opacity":.95}});
    r.ensureLayer({id:"51-hover-country",type:"line",source:"nexus-countries",metadata:{nexusLayer:"51"},paint:{"line-color":"#a9ecff","line-width":["case",["boolean",["feature-state","hover"],false],3,0],"line-opacity":["case",["boolean",["feature-state","hover"],false],.95,0]}});
    r.ensureLayer({id:"51-hover-region",type:"line",source:"nexus-regions",minzoom:3.4,metadata:{nexusLayer:"51"},paint:{"line-color":"#fff2a8","line-width":["case",["boolean",["feature-state","hover"],false],2.4,0],"line-opacity":["case",["boolean",["feature-state","hover"],false],.95,0]}});
    this.applyVisibility();
  }

  refresh(snapshot){
    this.snapshot=snapshot;
    for(const key of["countries","occupations","claims"])this.renderer.setSourceData(`nexus-${key}`,sourceData(snapshot,key));this.regions.refresh(snapshot);
  }

  setActiveLayer(layer){this.activeLayer=layer||"political";this.renderer.setPaint("20-countries-fill","fill-color",thematicExpression(this.activeLayer),{duration:450})}

  setMode(mode,{duration=650}={}){
    const opacity=mode==="political"?.76:mode==="hybrid"?.43:.20;
    const border=mode==="political"?.95:mode==="hybrid"?.75:.52;
    this.renderer.setPaint("20-countries-fill","fill-opacity",["case",["==",["get","sovereign"],false],opacity*.25,opacity],{duration});
    this.renderer.setPaint("25-national-borders","line-opacity",border,{duration});
    this.regions.setMode(mode);
  }

  setBlend(value){const blend=Math.max(0,Math.min(1,Number(value)||0)),opacity=.76-(.56*blend);this.renderer.setPaint("20-countries-fill","fill-opacity",["case",["==",["get","sovereign"],false],opacity*.25,opacity]);this.renderer.setPaint("25-national-borders","line-opacity",.95-.43*blend)}

  applyVisibility(){
    const mapping={"20":"20-countries-fill","23":"23-occupation","24":"24-claims","25":"25-national-borders","50":"50-selection","51":["51-hover-country","51-hover-region"]};
    for(const[id,value]of Object.entries(mapping))for(const layer of(Array.isArray(value)?value:[value]))this.renderer.setVisibility(layer,this.layers?.isVisible?.(id)!==false);
    this.regions.applyVisibility();
  }
}

globalThis.NEXUS_PoliticalRenderer=PoliticalRenderer;
