"use strict";

import{asArray,clamp01,limitEntities,pointAlongPath,positionOf,rgba,routePath,validPosition,withinBounds}from"./render-utils.js";

const commodityColor=commodity=>{
  const key=String(commodity||"").toLowerCase();
  if(/oil|petrol|gas|coal|uran/.test(key))return[255,161,78,220];
  if(/food|grain|meat|cereal|fertil/.test(key))return[112,218,126,220];
  if(/steel|copper|aluminium|lithium/.test(key))return[166,190,210,225];
  if(/defen|weapon/.test(key))return[235,99,99,225];
  if(/chip|digital|machine/.test(key))return[114,211,244,225];
  return[82,199,231,215];
};

function vehiclesForRoute(route,clockFraction){
  const path=routePath(route);if(path.length<2)return[];
  const vehicles=asArray(route.vehicles).length?route.vehicles:asArray(route.ships).length?route.ships:[{id:`${route.id||"route"}:convoy`,progress:route.progress||0,type:route.mode}];
  return vehicles.map((vehicle,index)=>{
    const speed=Number(vehicle.dailyStep||route.dailyStep||.02),progress=(Number(vehicle.progress||0)+clockFraction*speed+index/Math.max(1,vehicles.length))%1;
    const position=pointAlongPath(path,vehicle.direction==="reverse"?1-progress:progress);
    return{...vehicle,routeId:route.id,commodity:vehicle.cargo||route.commodity||route.product,mode:route.mode||route.transportMode,longitude:position?.[0],latitude:position?.[1],progress,path};
  }).filter(validPosition);
}

export class TradeRenderer{
  constructor({onSelect=()=>{}}={}){this.onSelect=onSelect}

  buildLayers(snapshot,{mode="political",lod=0,clockFraction=0,entityLimit=9000,viewport=null}={}){
    const deck=globalThis.deck;if(!deck)return[];
    const routes=limitEntities(asArray(snapshot?.routes).filter(route=>route.active!==false&&routePath(route).length>=2),Math.max(40,Math.round(entityLimit*.15)));
    const layers=[];
    if(routes.length&&deck.PathLayer)layers.push(new deck.PathLayer({id:"34-trade-routes",data:routes,pickable:true,getPath:routePath,getColor:route=>commodityColor(route.commodity||route.product),getWidth:route=>Math.max(1.2,Math.min(7,1+Math.log10(1+Number(route.volume||route.capacity||1)))),widthUnits:"pixels",capRounded:true,jointRounded:true,opacity:mode==="political"?.78:.58,onClick:info=>info.object&&this.onSelect("trade-route",info.object.id,info.object),updateTriggers:{getColor:[snapshot?.revisions?.trade],getWidth:[snapshot?.revisions?.trade]}}));
    const vehicles=routes.flatMap(route=>vehiclesForRoute(route,clockFraction));
    if(vehicles.length&&deck.ScatterplotLayer)layers.push(new deck.ScatterplotLayer({id:"38-logistics-vehicles",data:vehicles,pickable:true,stroked:true,radiusUnits:"meters",radiusMinPixels:4,radiusMaxPixels:10,getPosition:positionOf,getRadius:vehicle=>vehicle.mode==="sea"||vehicle.mode==="maritime"?18000:9000,getFillColor:vehicle=>commodityColor(vehicle.commodity),getLineColor:[245,251,255,245],lineWidthMinPixels:1,onClick:info=>info.object&&this.onSelect("convoy",info.object.id,info.object)}));
    if(lod>=1&&vehicles.length&&deck.TextLayer)layers.push(new deck.TextLayer({id:"38-logistics-icons",data:vehicles,pickable:false,getPosition:positionOf,getText:vehicle=>vehicle.mode==="sea"||vehicle.mode==="maritime"?"≋":vehicle.mode==="rail"?"▰":"▣",getColor:[245,250,252,255],getSize:mode==="terrain"?16:13,sizeUnits:"pixels",fontFamily:"system-ui, sans-serif",characterSet:Array.from("≋▰▣"),getTextAnchor:"middle",getAlignmentBaseline:"center"}));
    const nodes=limitEntities(asArray(snapshot?.logistics).filter(node=>validPosition(node)&&withinBounds(node,viewport)),Math.max(40,Math.round(entityLimit*.1)));
    if(lod>=1&&nodes.length&&deck.ScatterplotLayer)layers.push(new deck.ScatterplotLayer({id:"38-logistics-nodes",data:nodes,pickable:true,radiusUnits:"meters",radiusMinPixels:3,radiusMaxPixels:8,getPosition:positionOf,getRadius:node=>Math.max(4000,Number(node.capacity||1)*25),getFillColor:node=>rgba(node.color||"#d9b56d",220),getLineColor:[35,45,52,240],lineWidthMinPixels:1,onClick:info=>info.object&&this.onSelect("logistics-node",info.object.id,info.object)}));
    return layers;
  }
}

globalThis.NEXUS_TradeRenderer=TradeRenderer;
