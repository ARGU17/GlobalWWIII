"use strict";

import{asArray,limitEntities,positionOf,routePath,validPosition,withinBounds}from"./render-utils.js";

const LABEL_CHARACTERS=Array.from(" ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ÁÉÍÓÚÜÑÇÀÈÌÒÙÂÊÎÔÛÄËÏÖÃÕÅÆØŒŠŽÞÐáéíóúüñçàèìòùâêîôûäëïöãõåæøœšžþðßĄĆĘŁŃŚŹŻČĞİŞŽąćęłńśźżčğışžĂȘȚășț’'.,·-–—()/");

const endpoints=flow=>{
  const path=routePath(flow);return path.length>=2?{source:path[0],target:path.at(-1)}:null;
};

export class StrategicOverlayRenderer{
  constructor({onSelect=()=>{}}={}){this.onSelect=onSelect}

  buildLayers(snapshot,{mode="political",lod=0,entityLimit=9000,viewport=null}={}){
    const deck=globalThis.deck;if(!deck)return[];const layers=[];
    const labels=limitEntities([...asArray(snapshot?.countryLabels),...(lod>=1?asArray(snapshot?.regionLabels):[]),...(lod>=2?asArray(snapshot?.cityLabels):[])].filter(item=>validPosition(item)&&withinBounds(item,viewport)),Math.max(120,Math.round(entityLimit*.22)),{priority:item=>Boolean(item?.selected||item?.labelType==="country")});
    if(labels.length&&deck.TextLayer)layers.push(new deck.TextLayer({id:"27-labels",data:labels,pickable:true,getPosition:positionOf,getText:item=>item.name||item.displayName||"",getColor:item=>item.selected?[255,241,150,255]:mode==="terrain"?[240,244,232,235]:[216,239,248,245],getSize:item=>item.labelType==="country"?Math.max(12,Math.min(22,10+Number(item.rank||2)*2)):item.labelType==="region"?12:10,sizeUnits:"pixels",fontFamily:"system-ui, sans-serif",fontWeight:700,characterSet:LABEL_CHARACTERS,getTextAnchor:"middle",getAlignmentBaseline:"center",onClick:info=>info.object&&this.onSelect(info.object.labelType||"place",info.object.entityId||info.object.id,info.object)}));
    const flows=[
      {id:"29-alliances",data:asArray(snapshot?.allianceFlows),source:[102,182,255,185],target:[126,239,192,205]},
      {id:"41-intelligence",data:asArray(snapshot?.intelligenceFlows),source:[172,109,255,205],target:[114,211,245,220]},
      {id:"42-migration",data:asArray(snapshot?.migrationFlows),source:[76,218,162,190],target:[255,207,105,220]},
      {id:"43-influence",data:asArray(snapshot?.influenceFlows),source:[255,159,84,185],target:[236,99,141,220]}
    ];
    if(deck.ArcLayer)for(const flow of flows){const data=flow.data.map(item=>({...item,_endpoints:endpoints(item)})).filter(item=>item._endpoints);if(!data.length)continue;layers.push(new deck.ArcLayer({id:flow.id,data,pickable:true,getSourcePosition:item=>item._endpoints.source,getTargetPosition:item=>item._endpoints.target,getSourceColor:flow.source,getTargetColor:flow.target,getWidth:item=>Math.max(1,Math.min(8,Math.log10(1+Number(item.volume||item.strength||1))*1.5)),widthUnits:"pixels",greatCircle:true,onClick:info=>info.object&&this.onSelect(flow.id.split("-")[1],info.object.id,info.object)}))}
    const entities=[...asArray(snapshot?.units),...asArray(snapshot?.facilities),...asArray(snapshot?.industries),...asArray(snapshot?.powerPlants),...asArray(snapshot?.logistics)],selected=entities.find(item=>(item.entityId||item.id)===snapshot?.selectedEntityId&&validPosition(item));
    if(selected&&deck.ScatterplotLayer){const fallbackRange=selected.domain==="air"?650000:selected.domain==="naval"?900000:120000,radius=Math.max(15000,Number(selected.range||selected.operationalRange||selected.properties?.range)||fallbackRange);layers.push(new deck.ScatterplotLayer({id:"54-range",data:[selected],pickable:false,stroked:true,filled:true,radiusUnits:"meters",getPosition:positionOf,getRadius:radius,getFillColor:[97,184,242,28],getLineColor:[116,210,255,175],lineWidthMinPixels:1.2}))}
    const previewCandidates=[...asArray(snapshot?.pathPreview),...(selected?.movement?.path?.length>1?[{id:`preview:${selected.id}`,path:selected.movement.path}]:[])].filter(item=>routePath(item).length>=2);
    if(previewCandidates.length&&deck.PathLayer)layers.push(new deck.PathLayer({id:"57-path-preview",data:previewCandidates,pickable:false,getPath:routePath,getColor:[255,236,126,230],getWidth:3,widthUnits:"pixels",capRounded:true,jointRounded:true}));
    const targets=[...asArray(snapshot?.targets)];for(const order of asArray(snapshot?.orders)){const path=routePath(order),point=path.at(-1);if(point)targets.push({...order,id:`target:${order.id}`,longitude:point[0],latitude:point[1]})}
    if(targets.length&&deck.ScatterplotLayer)layers.push(new deck.ScatterplotLayer({id:"55-targets",data:limitEntities(targets.filter(validPosition),Math.max(20,Math.round(entityLimit*.03))),pickable:true,stroked:true,filled:false,radiusUnits:"meters",radiusMinPixels:8,radiusMaxPixels:18,getPosition:positionOf,getRadius:item=>Math.max(18000,Number(item.radius||35000)),getLineColor:[255,112,96,235],lineWidthMinPixels:2,onClick:info=>info.object&&this.onSelect("target",info.object.id,info.object)}));
    const reconstruction=limitEntities(asArray(snapshot?.reconstructionSites).filter(item=>validPosition(item)&&withinBounds(item,viewport)),Math.max(20,Math.round(entityLimit*.04)));
    if(reconstruction.length&&deck.ScatterplotLayer)layers.push(new deck.ScatterplotLayer({id:"44-reconstruction",data:reconstruction,pickable:true,stroked:true,radiusUnits:"meters",radiusMinPixels:6,radiusMaxPixels:16,getPosition:positionOf,getRadius:item=>Math.max(16000,(100-Number(item.progress||0))*900),getFillColor:[103,214,153,165],getLineColor:[222,255,230,235],lineWidthMinPixels:1.5,onClick:info=>info.object&&this.onSelect("reconstruction",info.object.id,info.object)}));
    const strategicNodes=limitEntities(asArray(snapshot?.strategicNodes).filter(item=>validPosition(item)&&withinBounds(item,viewport)),Math.max(40,Math.round(entityLimit*.08)));
    if(strategicNodes.length&&deck.ScatterplotLayer)layers.push(new deck.ScatterplotLayer({id:"49-strategic-nodes",data:strategicNodes,pickable:true,stroked:true,radiusUnits:"meters",radiusMinPixels:4,radiusMaxPixels:12,getPosition:positionOf,getRadius:item=>Math.max(9000,Number(item.capacity||1)*30),getFillColor:[235,188,92,210],getLineColor:[255,245,209,240],lineWidthMinPixels:1,onClick:info=>info.object&&this.onSelect("strategic-node",info.object.id,info.object)}));
    const alerts=limitEntities(asArray(snapshot?.alerts).filter(item=>validPosition(item)&&withinBounds(item,viewport)),Math.max(30,Math.round(entityLimit*.05)));
    if(alerts.length&&deck.ScatterplotLayer)layers.push(new deck.ScatterplotLayer({id:"56-alerts",data:alerts,pickable:true,stroked:true,radiusUnits:"meters",radiusMinPixels:7,radiusMaxPixels:18,getPosition:positionOf,getRadius:alert=>Math.max(12000,Number(alert.severity||1)*9000),getFillColor:[248,82,74,190],getLineColor:[255,225,130,245],lineWidthMinPixels:2,onClick:info=>info.object&&this.onSelect("alert",info.object.id,info.object)}));
    return layers;
  }
}

globalThis.NEXUS_StrategicOverlayRenderer=StrategicOverlayRenderer;
