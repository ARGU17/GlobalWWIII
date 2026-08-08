"use strict";

import{asArray,positionOf,rgba,routePath,validPosition,withinBounds}from"./render-utils.js";

const warColor=war=>war?.attackerColor?rgba(war.attackerColor,235):[244,78,82,235];

export class WarRenderer{
  constructor({onSelect=()=>{}}={}){this.onSelect=onSelect}

  buildLayers(snapshot,{mode="political",lod=0,time=0,viewport=null}={}){
    const deck=globalThis.deck;if(!deck)return[];
    const wars=asArray(snapshot?.wars),derived= wars.flatMap(war=>asArray(war.fronts).length?asArray(war.fronts).map(front=>({...front,warId:war.id,attackerColor:war.attackerColor})):war.active!==false&&routePath(war).length>=2?[{...war,warId:war.id}]:[]),fronts=asArray(snapshot?.fronts).length?asArray(snapshot.fronts):derived;
    const validFronts=fronts.filter(front=>routePath(front).length>=2),layers=[],pulse=.78+Math.sin(time/260)*.18;
    if(validFronts.length&&deck.PathLayer){
      layers.push(new deck.PathLayer({id:"39-war-fronts-shadow",data:validFronts,pickable:false,getPath:routePath,getColor:[20,6,8,205],getWidth:8,widthUnits:"pixels",capRounded:true,jointRounded:true}));
      layers.push(new deck.PathLayer({id:"39-war-fronts",data:validFronts,pickable:true,getPath:routePath,getColor:front=>{const color=warColor(front);color[3]=Math.round(color[3]*pulse);return color},getWidth:mode==="political"?4.2:3.2,widthUnits:"pixels",capRounded:true,jointRounded:true,onClick:info=>info.object&&this.onSelect("war-front",info.object.id||info.object.warId,info.object),updateTriggers:{getColor:[Math.round(pulse*10)]}}));
    }
    const battles=asArray(snapshot?.battles).filter(battle=>validPosition(battle)&&withinBounds(battle,viewport));
    if(battles.length&&deck.ScatterplotLayer){
      layers.push(new deck.ScatterplotLayer({id:"40-battles",data:battles,pickable:true,stroked:true,radiusUnits:"meters",radiusMinPixels:7,radiusMaxPixels:22,getPosition:positionOf,getRadius:battle=>Math.max(16000,Number(battle.intensity||battle.casualties||1)*120),getFillColor:battle=>[248,77,67,Math.round(175*pulse)],getLineColor:[255,218,115,245],lineWidthMinPixels:2,onClick:info=>info.object&&this.onSelect("battle",info.object.id||info.object.warId,info.object)}));
      if(deck.TextLayer)layers.push(new deck.TextLayer({id:"40-battle-symbols",data:battles,pickable:false,getPosition:positionOf,getText:()=>"⚔",getColor:[255,239,208,255],getSize:lod>=2?19:15,sizeUnits:"pixels",fontFamily:"system-ui, sans-serif",characterSet:["⚔"],getTextAnchor:"middle",getAlignmentBaseline:"center"}));
    }
    const orders=[...asArray(snapshot?.orders),...wars.flatMap(war=>asArray(war.campaigns))].filter(order=>routePath(order).length>=2);
    if(orders.length&&deck.PathLayer)layers.push(new deck.PathLayer({id:"53-orders",data:orders,pickable:true,getPath:routePath,getColor:order=>order.status==="retreat"?[255,178,83,220]:[255,235,120,225],getWidth:2.4,widthUnits:"pixels",capRounded:true,jointRounded:true,onClick:info=>info.object&&this.onSelect("order",info.object.id||info.object.warId,info.object)}));
    const supply=asArray(snapshot?.militaryLogistics).filter(route=>routePath(route).length>=2);
    if(supply.length&&deck.PathLayer)layers.push(new deck.PathLayer({id:"45-supply-routes",data:supply,pickable:true,getPath:routePath,getColor:[106,216,164,190],getWidth:1.8,widthUnits:"pixels",onClick:info=>info.object&&this.onSelect("supply-route",info.object.id,info.object)}));
    for(const[id,data,color]of[["46-naval-control",asArray(snapshot?.navalControlZones),[58,142,228,50]],["47-air-superiority",asArray(snapshot?.airSuperiorityZones),[118,199,255,45]]])if(data.length&&deck.ScatterplotLayer)layers.push(new deck.ScatterplotLayer({id,data:data.filter(item=>validPosition(item)&&withinBounds(item,viewport)),pickable:true,stroked:true,radiusUnits:"meters",radiusMinPixels:12,radiusMaxPixels:80,getPosition:positionOf,getRadius:item=>Math.max(75000,Number(item.control||1)*18000),getFillColor:color,getLineColor:[180,225,255,175],lineWidthMinPixels:1.2,onClick:info=>info.object&&this.onSelect(id.includes("naval")?"naval-control":"air-superiority",info.object.id,info.object)}));
    const damage=asArray(snapshot?.damageZones).filter(item=>validPosition(item)&&withinBounds(item,viewport));
    if(damage.length&&deck.ScatterplotLayer)layers.push(new deck.ScatterplotLayer({id:"48-damage",data:damage,pickable:true,stroked:true,radiusUnits:"meters",radiusMinPixels:6,radiusMaxPixels:28,getPosition:positionOf,getRadius:item=>Math.max(12000,Number(item.severity||1)*2400),getFillColor:[112,53,42,145],getLineColor:[255,126,85,225],lineWidthMinPixels:1.5,onClick:info=>info.object&&this.onSelect("damage",info.object.id,info.object)}));
    return layers;
  }
}

globalThis.NEXUS_WarRenderer=WarRenderer;
