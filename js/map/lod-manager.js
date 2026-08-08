"use strict";

import{MAP_CONFIG}from"./map-config.js";

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const qualityMultipliers={auto:1,ultra:1.2,high:1,medium:.72,low:.42};

export class LODManager{
  constructor(config=MAP_CONFIG){
    this.config=config;
    this.levels=[...(config?.lod||[])].sort((a,b)=>a.level-b.level);
    if(this.levels.length!==4||this.levels.some((entry,index)=>entry.level!==index)){
      throw new Error("LODManager requiere cuatro niveles continuos 0-3");
    }
    for(let index=0;index<this.levels.length;index+=1){
      const level=this.levels[index];
      if(!Number.isFinite(level.minZoom)||!Number.isFinite(level.maxZoom)||level.maxZoom<=level.minZoom){
        throw new Error(`Intervalo de zoom inválido para LOD ${level.level}`);
      }
      if(index&&level.minZoom!==this.levels[index-1].maxZoom){
        throw new Error(`Los intervalos LOD no son continuos en el nivel ${level.level}`);
      }
    }
  }

  getLevel(zoom){
    const value=clamp(zoom,this.levels[0].minZoom,this.levels.at(-1).maxZoom);
    return(this.levels.find(level=>value>=level.minZoom&&value<level.maxZoom)||this.levels.at(-1)).level;
  }

  getDefinition(zoomOrLevel){
    const numeric=Number(zoomOrLevel);
    const level=Number.isInteger(numeric)&&numeric>=0&&numeric<=3?numeric:this.getLevel(numeric);
    return this.levels[level];
  }

  profile(zoom,quality="auto"){
    const definition=this.getDefinition(this.getLevel(zoom));
    const qualityId=Object.hasOwn(this.config.quality,quality)?quality:"auto";
    const qualityProfile=this.config.quality[qualityId];
    const density=qualityMultipliers[qualityId]??1;
    const isWorld=definition.level===0,isCountry=definition.level===1,isRegion=definition.level===2,isOperational=definition.level===3;
    return{
      ...definition,
      zoom:clamp(zoom,this.levels[0].minZoom,this.levels.at(-1).maxZoom),
      quality:qualityId,
      qualityProfile,
      clusterRadius:Math.round(definition.clusterRadius*(qualityId==="low"?1.35:qualityId==="medium"?1.15:1)),
      entityLimit:Math.max(150,Math.round(definition.entityLimit*density)),
      clustering:!isOperational,
      instancing:definition.level>=1,
      frustumCulling:true,
      progressiveLoading:true,
      simplifiedGeometry:isWorld||qualityId==="low",
      showCountries:true,
      showRegions:definition.level>=1,
      showProvinces:definition.level>=2,
      showLocalRoads:definition.level>=2&&qualityId!=="low",
      showDetailedUnits:isOperational,
      showBuildings:(isRegion||isOperational)&&qualityProfile.models3d,
      showVegetation:(isRegion||isOperational)&&qualityProfile.vegetation>0,
      showTerrain:qualityProfile.terrain&&(isCountry||isRegion||isOperational)
    };
  }

  getVisibleLayers(layerManager,zoom,options={}){
    const level=this.getLevel(zoom);
    layerManager?.setLod?.(level);
    return layerManager?.getLayerDefinitions?.({...options,lod:level,visible:true})||[];
  }
}

if(typeof globalThis!=="undefined"){
  const namespace=globalThis.NEXUS_MAP_V6 ||= {};
  namespace.LODManager=LODManager;
}
