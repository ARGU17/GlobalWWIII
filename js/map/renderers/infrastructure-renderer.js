"use strict";

import{aggregateByCell,asArray,limitEntities,positionOf,rgba,validPosition,withinBounds}from"./render-utils.js";

const POWER=/nuclear|solar|wind|hydro|geothermal|power|grid|hydrogen/i;
const INDUSTRY=/plant|factory|mill|fab|shipyard|refiner|mine|industrial|gigafactory|chemical|cement|textile|machine/i;
const RESOURCE=/field|deposit|resource|oil|gas|uranium|coal|copper|lithium|grain/i;
const INFRASTRUCTURE_CHARACTERS=Array.from(" 0123456789☢⚡◆⚓▲═✚⌬⚙");
const iconOf=item=>{
  const type=String(item.typeId||item.type||item.category||"");
  if(POWER.test(type))return type.match(/nuclear/i)?"☢":"⚡";
  if(RESOURCE.test(type))return"◆";
  if(type.match(/port|naval/i))return"⚓";
  if(type.match(/airport|airbase/i))return"▲";
  if(type.match(/rail/i))return"═";
  if(type.match(/hospital/i))return"✚";
  if(type.match(/university|research/i))return"⌬";
  return"⚙";
};
const groupOf=item=>{const type=String(item.typeId||item.type||item.category||"");if(RESOURCE.test(type))return"resources";if(POWER.test(type))return"power";if(INDUSTRY.test(type))return"industries";return"infrastructure"};

export class InfrastructureRenderer{
  constructor({onSelect=()=>{}}={}){this.onSelect=onSelect}

  buildLayers(snapshot,{mode="political",lod=0,quality="high",entityLimit=9000,viewport=null}={}){
    const deck=globalThis.deck;if(!deck)return[];
    const visible=[...asArray(snapshot?.resources),...asArray(snapshot?.facilities),...asArray(snapshot?.industries),...asArray(snapshot?.powerPlants),...asArray(snapshot?.infrastructure)].filter(item=>validPosition(item)&&withinBounds(item,viewport)),raw=limitEntities(visible,Math.max(80,Math.round(entityLimit*.3)));
    const data=lod<=1?aggregateByCell(raw,lod===0?2:4,{cellDegrees:lod===0?7:1.5,key:"typeId"}):raw;
    const definitions={resources:{id:"30-resources",color:[207,160,85,225]},industries:{id:"31-industries",color:[115,210,224,230]},power:{id:"32-power-plants",color:[255,214,82,235]},infrastructure:{id:"33-infrastructure",color:[159,188,205,225]}};
    const layers=[];
    for(const[key,definition]of Object.entries(definitions)){
      const items=data.filter(item=>groupOf(item)===key);if(!items.length)continue;
      if(mode==="terrain"&&lod>=2&&quality!=="low"&&deck.ColumnLayer)layers.push(new deck.ColumnLayer({id:`${definition.id}-3d`,data:items,pickable:true,diskResolution:quality==="medium"?5:8,radius:item=>Math.max(450,Math.min(3500,700+Number(item.level||1)*420)),getPosition:positionOf,getFillColor:item=>rgba(item.color||definition.color,210),getLineColor:[235,245,244,220],lineWidthMinPixels:.7,extruded:true,getElevation:item=>Math.max(450,Number(item.level||1)*1200+Math.log10(1+Number(item.production||item.employees||0))*420),onClick:info=>info.object&&this.onSelect("facility",info.object.entityId||info.object.id,info.object)}));
      layers.push(new deck.ScatterplotLayer({id:`${definition.id}-markers`,data:items,pickable:true,stroked:true,radiusUnits:"meters",radiusMinPixels:5,radiusMaxPixels:15,getPosition:positionOf,getRadius:item=>Math.max(5000,9000+Number(item.level||1)*3800),getFillColor:item=>rgba(item.color||definition.color,mode==="terrain"?170:235),getLineColor:[238,248,250,240],lineWidthMinPixels:1,onClick:info=>info.object&&this.onSelect("facility",info.object.entityId||info.object.id,info.object)}));
      if(lod>=1&&deck.TextLayer)layers.push(new deck.TextLayer({id:`${definition.id}-icons`,data:items,pickable:false,getPosition:positionOf,getText:item=>`${iconOf(item)}${lod>=3&&item.level?` ${item.level}`:""}`,getColor:[248,250,245,255],getSize:lod>=2?14:12,sizeUnits:"pixels",fontFamily:"system-ui, sans-serif",fontWeight:700,characterSet:INFRASTRUCTURE_CHARACTERS,getTextAnchor:"middle",getAlignmentBaseline:"center"}));
    }
    return layers;
  }
}

globalThis.NEXUS_InfrastructureRenderer=InfrastructureRenderer;
