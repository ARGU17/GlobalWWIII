"use strict";

import{aggregateByCell,asArray,limitEntities,positionOf,rgba,routePath,validPosition,withinBounds}from"./render-utils.js";

const AIR=new Set(["fighter","bomber","transport","drone","awacs","air","wing"]);
const NAVAL=new Set(["frigate","destroyer","submarine","carrier","cruiser","corvette","naval","fleet"]);
const UNIT_CHARACTERS=Array.from(" 0123456789.,≋▲▰✦▣◆");
const symbolOf=unit=>{
  const type=String(unit.unitType||unit.typeId||unit.type||"").toLowerCase();
  if(NAVAL.has(type))return"≋";if(AIR.has(type))return"▲";
  if(type.includes("armor")||type.includes("tank"))return"▰";
  if(type.includes("artillery"))return"✦";
  if(type.includes("mechan"))return"▣";
  return"◆";
};
const domainOf=unit=>{const type=String(unit.domain||unit.unitType||unit.typeId||unit.type||"").toLowerCase();if([...NAVAL].some(key=>type.includes(key)))return"naval";if([...AIR].some(key=>type.includes(key)))return"air";return"land"};

export class UnitRenderer{
  constructor({onSelect=()=>{}}={}){this.onSelect=onSelect}

  buildLayers(snapshot,{mode="political",lod=0,quality="high",entityLimit=9000,viewport=null}={}){
    const deck=globalThis.deck;if(!deck)return[];
    const visible=asArray(snapshot?.units).filter(unit=>validPosition(unit)&&withinBounds(unit,viewport)),source=limitEntities(visible,Math.max(100,Math.round(entityLimit*.45))),units=lod===0?aggregateByCell(source,1.8,{cellDegrees:8,key:"domain"}):lod===1?aggregateByCell(source,4,{cellDegrees:2,key:"domain"}):source;
    const layers=[];
    for(const domain of["land","air","naval"]){
      const data=units.filter(unit=>domainOf(unit)===domain),id=domain==="land"?"35-land-units":domain==="air"?"36-air-units":"37-naval-units";
      if(!data.length)continue;
      const baseColor=domain==="land"?[75,216,151,225]:domain==="air"?[103,198,255,235]:[76,169,255,235];
      if(mode==="terrain"&&lod>=2&&quality!=="low"&&deck.ColumnLayer){layers.push(new deck.ColumnLayer({id:`${id}-columns`,data,pickable:true,diskResolution:quality==="medium"?5:7,radius:4200,elevationScale:1,getPosition:positionOf,getFillColor:unit=>rgba(unit.ownerColor||baseColor,210),getLineColor:[235,248,255,230],lineWidthMinPixels:1,extruded:true,getElevation:unit=>Math.max(1800,Math.log10(1+Number(unit.quantity||unit.count||1))*5200),onClick:info=>info.object&&this.onSelect("unit",info.object.entityId||info.object.id,info.object),updateTriggers:{getFillColor:[snapshot?.revisions?.military]}}))}
      layers.push(new deck.ScatterplotLayer({id:`${id}-markers`,data,pickable:true,stroked:true,filled:true,radiusUnits:"meters",radiusMinPixels:lod===0?5:7,radiusMaxPixels:lod>=2?20:15,getPosition:positionOf,getRadius:unit=>Math.max(10000,Math.sqrt(Number(unit.quantity||unit.count||1))*900),getFillColor:unit=>rgba(unit.ownerColor||baseColor,mode==="terrain"?175:230),getLineColor:unit=>rgba(unit.controllerColor||"#f4fbff",240),lineWidthMinPixels:1.5,onClick:info=>info.object&&this.onSelect("unit",info.object.entityId||info.object.id,info.object),updateTriggers:{getFillColor:[snapshot?.revisions?.military,mode]}}));
      if(lod>=1&&deck.TextLayer)layers.push(new deck.TextLayer({id:`${id}-symbols`,data,pickable:false,getPosition:positionOf,getText:unit=>`${symbolOf(unit)}${lod>=2?` ${Number(unit.quantity||unit.count||1).toLocaleString("es-ES")}`:""}`,getColor:[245,250,252,255],getSize:lod>=2?14:12,sizeUnits:"pixels",fontFamily:"system-ui, sans-serif",fontWeight:700,characterSet:UNIT_CHARACTERS,getTextAnchor:"middle",getAlignmentBaseline:"center"}));
    }
    const movements=source.filter(unit=>routePath(unit.movement||unit).length>=2);
    if(movements.length&&deck.PathLayer)layers.push(new deck.PathLayer({id:"53-orders-unit-paths",data:movements,pickable:false,getPath:unit=>routePath(unit.movement||unit),getColor:[255,222,95,220],getWidth:2.2,widthUnits:"pixels",jointRounded:true,capRounded:true,getDashArray:[6,4],dashJustified:true}));
    return layers;
  }
}

globalThis.NEXUS_UnitRenderer=UnitRenderer;
