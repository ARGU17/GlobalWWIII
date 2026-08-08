"use strict";

const EMPTY={type:"FeatureCollection",features:[]};
const DATASETS={
  land:"assets/maps/v6/ne_50m_land.geojson",ocean:"assets/maps/v6/ne_50m_ocean.geojson",
  lakes:"assets/maps/v6/ne_50m_lakes.geojson",rivers:"assets/maps/v6/ne_50m_rivers_lake_centerlines.geojson",
  cities:"assets/maps/v6/ne_50m_populated_places_simple.geojson",roads:"assets/maps/v6/ne_10m_roads_major.geojson",
  railways:"assets/maps/v6/ne_10m_railroads_major.geojson",ports:"assets/maps/v6/ne_10m_ports.geojson",airports:"assets/maps/v6/ne_10m_airports.geojson"
};

export class TerrainRenderer{
  constructor({renderer,assetManager,layerManager}={}){this.renderer=renderer;this.assets=assetManager;this.layers=layerManager;this.loaded=new Set();this.datasets={};this.mode="political";this.demReady=false;this.dayFraction=.5;this.profile={terrain:true,water:true,models3d:true,animations:true,urbanDensity:.7,vegetation:.5};this.detailPromise=null;this.requestedDetail=0}

  async initialize(){
    const [land,ocean,lakes,rivers]=await Promise.all([
      this.assets.fetchJSON(DATASETS.land,{fallback:EMPTY}),this.assets.fetchJSON(DATASETS.ocean,{fallback:EMPTY}),
      this.assets.fetchJSON(DATASETS.lakes,{fallback:EMPTY}),this.assets.fetchJSON(DATASETS.rivers,{fallback:EMPTY})
    ]);
    const r=this.renderer;
    const raster=this.assets.getRasterProvider();
    if(raster){try{if(!r.map.getSource("nexus-raster-base"))r.map.addSource("nexus-raster-base",raster);r.ensureLayer({id:"nexus-raster-provider",type:"raster",source:"nexus-raster-base",paint:{"raster-opacity":.58,"raster-fade-duration":350}},"20-countries-fill")}catch(error){this.assets.recordFailure("raster-provider",error)}}
    r.ensureSource("nexus-land",{type:"geojson",data:land||EMPTY});r.ensureSource("nexus-ocean",{type:"geojson",data:ocean||EMPTY});
    r.ensureSource("nexus-lakes",{type:"geojson",data:lakes||EMPTY});r.ensureSource("nexus-rivers",{type:"geojson",data:rivers||EMPTY});
    r.ensureLayer({id:"00-ocean",type:"fill",source:"nexus-ocean",metadata:{nexusLayer:"00"},paint:{"fill-color":"#07334b","fill-opacity":1}},"20-countries-fill");
    r.ensureLayer({id:"01-bathymetry",type:"line",source:"nexus-ocean",metadata:{nexusLayer:"01"},paint:{"line-color":"#1b5870","line-width":3,"line-blur":4,"line-opacity":.3}},"20-countries-fill");
    r.ensureLayer({id:"04-landcover",type:"fill",source:"nexus-land",metadata:{nexusLayer:"04"},paint:{"fill-color":"#344d3a","fill-opacity":.86}},"20-countries-fill");
    r.ensureLayer({id:"05-snow-desert",type:"fill",source:"nexus-land",filter:["match",["get","featurecla"],["Antarctic Ice Shelf","Glaciated areas"],true,false],metadata:{nexusLayer:"05"},paint:{"fill-color":"#b9c8c6","fill-opacity":.26}},"20-countries-fill");
    r.ensureLayer({id:"06-lakes",type:"fill",source:"nexus-lakes",metadata:{nexusLayer:"06"},paint:{"fill-color":"#0b4a64","fill-opacity":.96}},"20-countries-fill");
    r.ensureLayer({id:"06-rivers",type:"line",source:"nexus-rivers",minzoom:2.3,metadata:{nexusLayer:"06"},paint:{"line-color":"#2a83a4","line-width":["interpolate",["linear"],["zoom"],2,.25,8,1.8],"line-opacity":.75}},"20-countries-fill");
    this.initializeDem();
    this.loaded.add("base");this.applyVisibility();
  }

  initializeDem(){
    try{
      const r=this.renderer,map=r.map;
      if(!map.getSource("nexus-terrain-dem"))map.addSource("nexus-terrain-dem",this.assets.getDemSource());
      r.ensureLayer({id:"03-hillshade",type:"hillshade",source:"nexus-terrain-dem",metadata:{nexusLayer:"03"},paint:{"hillshade-shadow-color":"#071014","hillshade-highlight-color":"#cbd6b7","hillshade-accent-color":"#71806d","hillshade-exaggeration":.55}} ,"20-countries-fill");
      this.demReady=true;
    }catch(error){this.assets.recordFailure("terrain-dem",error);this.demReady=false}
  }

  async loadDetail(level){
    this.requestedDetail=Math.max(this.requestedDetail,Number(level)||0);if(this.detailPromise)return this.detailPromise;
    this.detailPromise=this.loadRequestedDetail().finally(()=>{this.detailPromise=null;if(this.requestedDetail>level)this.loadDetail(this.requestedDetail)});return this.detailPromise;
  }

  async loadRequestedDetail(){
    const level=this.requestedDetail;
    const requests=[];
    if(level>=1&&!this.loaded.has("cities"))requests.push(this.loadGeoLayer("cities","nexus-cities",DATASETS.cities));
    if(level>=1&&!this.loaded.has("strategic-nodes"))requests.push(this.loadStrategicNodes());
    if(level>=1&&!this.loaded.has("transport"))requests.push(this.loadTransport());
    if(level>=2&&!this.loaded.has("urban"))requests.push(this.loadUrbanFootprints());
    await Promise.all(requests);this.ensureDetailLayers();this.applyVisibility();
  }

  async loadGeoLayer(key,id,path){const data=await this.assets.fetchJSON(path,{fallback:EMPTY});this.datasets[key]=data||EMPTY;this.renderer.ensureSource(id,{type:"geojson",data:data||EMPTY,promoteId:"featureId"});this.loaded.add(key);return data}

  async loadUrbanFootprints(){
    const cities=this.datasets.cities||await this.loadGeoLayer("cities","nexus-cities",DATASETS.cities),features=[];
    const cityLimit=Math.max(180,Math.round(1800*Math.max(.1,Number(this.profile.urbanDensity)||.1)));for(const feature of(cities?.features||[]).slice(0,cityLimit)){const point=feature.geometry?.coordinates;if(feature.geometry?.type!=="Point"||!point)continue;const rank=Number(feature.properties?.scalerank??feature.properties?.rank_max??6),radius=Math.max(.006,.035-rank*.003),[lng,lat]=point,dx=radius/Math.max(.25,Math.cos(lat*Math.PI/180));features.push({type:"Feature",properties:{featureId:`urban:${feature.properties?.name||features.length}`,height:Math.max(10,46-rank*4)},geometry:{type:"Polygon",coordinates:[[[lng-dx,lat-radius],[lng+dx,lat-radius],[lng+dx,lat+radius],[lng-dx,lat+radius],[lng-dx,lat-radius]]]}})}
    this.datasets.urban={type:"FeatureCollection",features};this.renderer.ensureSource("nexus-urban",{type:"geojson",data:this.datasets.urban,promoteId:"featureId"});this.loaded.add("urban");return this.datasets.urban;
  }

  async loadTransport(){
    const [roads,railways]=await Promise.all([this.assets.fetchJSON(DATASETS.roads,{fallback:EMPTY}),this.assets.fetchJSON(DATASETS.railways,{fallback:EMPTY})]);
    this.renderer.ensureSource("nexus-roads",{type:"geojson",data:roads||EMPTY});this.renderer.ensureSource("nexus-railways",{type:"geojson",data:railways||EMPTY});this.loaded.add("transport");
  }

  async loadStrategicNodes(){
    const [ports,airports]=await Promise.all([this.assets.fetchJSON(DATASETS.ports,{fallback:EMPTY}),this.assets.fetchJSON(DATASETS.airports,{fallback:EMPTY})]);
    const normalize=(collection,type)=>({type:"FeatureCollection",features:(collection?.features||[]).map((feature,index)=>({...feature,properties:{...feature.properties,featureId:`${type}:${feature.properties?.name||index}`,entityId:`${type}:${feature.properties?.name||index}`,entityType:type,type,name:feature.properties?.name||feature.properties?.name_en||type}}))});
    this.renderer.ensureSource("nexus-ports",{type:"geojson",data:normalize(ports,"port"),promoteId:"featureId"});this.renderer.ensureSource("nexus-airports",{type:"geojson",data:normalize(airports,"airport"),promoteId:"featureId"});this.loaded.add("strategic-nodes");
  }

  ensureDetailLayers(){
    const r=this.renderer;
    if(this.loaded.has("cities"))r.ensureLayer({id:"09-cities",type:"circle",source:"nexus-cities",minzoom:3,metadata:{nexusLayer:"09"},paint:{"circle-radius":["interpolate",["linear"],["zoom"],3,1.2,8,4.5],"circle-color":"#ffd98b","circle-stroke-color":"#172029","circle-stroke-width":.8,"circle-opacity":.9}});
    if(this.loaded.has("transport")){
      r.ensureLayer({id:"07-roads",type:"line",source:"nexus-roads",minzoom:5,metadata:{nexusLayer:"07"},paint:{"line-color":"#d5b985","line-width":["interpolate",["linear"],["zoom"],5,.35,11,2.2],"line-opacity":.72}});
      r.ensureLayer({id:"08-railways",type:"line",source:"nexus-railways",minzoom:5,metadata:{nexusLayer:"08"},paint:{"line-color":"#aebac2","line-width":["interpolate",["linear"],["zoom"],5,.4,11,1.6],"line-dasharray":[3,2],"line-opacity":.78}});
    }
    if(this.loaded.has("strategic-nodes")){
      r.ensureLayer({id:"33-infrastructure-ports",type:"circle",source:"nexus-ports",minzoom:3.6,metadata:{nexusLayer:"33"},paint:{"circle-radius":["interpolate",["linear"],["zoom"],4,2.5,9,6],"circle-color":"#55cce8","circle-stroke-color":"#eafaff","circle-stroke-width":1,"circle-opacity":.9}});
      r.ensureLayer({id:"33-infrastructure-airports",type:"circle",source:"nexus-airports",minzoom:4.2,metadata:{nexusLayer:"33"},paint:{"circle-radius":["interpolate",["linear"],["zoom"],4,2,9,5],"circle-color":"#d8c17a","circle-stroke-color":"#fff5d3","circle-stroke-width":1,"circle-opacity":.88}});
    }
    if(this.loaded.has("urban"))r.ensureLayer({id:"10-buildings",type:"fill-extrusion",source:"nexus-urban",minzoom:7,metadata:{nexusLayer:"10"},paint:{"fill-extrusion-color":"#8c9288","fill-extrusion-height":["*",["coalesce",["get","height"],12],["interpolate",["linear"],["zoom"],7,.35,12,1]],"fill-extrusion-opacity":.32}});
  }

  setMode(mode,{duration=650}={}){
    this.mode=mode;const map=this.renderer.map,terrain=mode==="terrain",hybrid=mode==="hybrid",terrainEnabled=this.profile.terrain!==false;
    this.renderer.setVisibility("nexus-raster-provider",terrain||hybrid);
    this.renderer.setPaint("04-landcover","fill-opacity",terrain?.92:hybrid?.62:.08,{duration});
    this.renderer.setPaint("00-ocean","fill-color",terrain?"#063047":hybrid?"#083a52":"#071d2b",{duration});
    this.renderer.setPaint("03-hillshade","hillshade-exaggeration",terrain?.72:hybrid?.42:.12,{duration});
    if(this.demReady&&map?.setTerrain){
      try{map.setTerrain(terrainEnabled&&(terrain||hybrid)?{source:"nexus-terrain-dem",exaggeration:terrain?1.25:.55}:null)}catch(error){this.assets.recordFailure("terrain-mode",error)}
    }
    for(const id of["07-roads","08-railways","09-cities","10-buildings","33-infrastructure-ports","33-infrastructure-airports"])this.renderer.setVisibility(id,mode!=="political"&&this.layers?.isVisible?.(id.slice(0,2))!==false);
  }

  setBlend(value){const blend=Math.max(0,Math.min(1,Number(value)||0));this.renderer.setPaint("04-landcover","fill-opacity",.08+.84*blend);this.renderer.setPaint("03-hillshade","hillshade-exaggeration",.12+.6*blend);if(this.demReady&&this.renderer.map?.setTerrain)try{this.renderer.map.setTerrain(this.profile.terrain!==false&&blend>.02?{source:"nexus-terrain-dem",exaggeration:.25+blend}:null)}catch(error){this.assets.recordFailure("terrain-blend",error)}}

  setQuality(profile={}){this.profile={...this.profile,...profile};if(!this.renderer?.map)return this.profile;if(this.profile.terrain===false)try{this.renderer.map.setTerrain?.(null)}catch(error){this.assets.recordFailure("terrain-quality",error)}this.applyVisibility();this.renderer.setPaint("10-buildings","fill-extrusion-opacity",this.profile.models3d===false ? .12 : .32);return this.profile}

  updateDayNight(dayFraction=.5){
    this.dayFraction=((Number(dayFraction)||0)%1+1)%1;
    const solar=Math.cos((this.dayFraction-.5)*Math.PI*2),night=Math.max(0,Math.min(1,(.12-solar)/.5));
    const dayColor=[7,48,71],nightColor=[2,10,20],mix=(a,b)=>Math.round(a+(b-a)*night);
    const ocean=`rgb(${mix(dayColor[0],nightColor[0])},${mix(dayColor[1],nightColor[1])},${mix(dayColor[2],nightColor[2])})`;
    this.renderer.setPaint("00-ocean","fill-color",ocean);
    this.renderer.setPaint("09-cities","circle-opacity",.65+night*.35);
    if(this.renderer.map?.setLight){try{this.renderer.map.setLight({anchor:"map",color:night?"#6a7791":"#fff4d5",intensity:.28+(1-night)*.55,position:[1.5,210-this.dayFraction*360,35]})}catch(_){}}
  }

  applyVisibility(){
    const map={"00":"00-ocean","01":"01-bathymetry","02":"nexus-terrain-dem","03":"03-hillshade","04":"04-landcover","05":"05-snow-desert","06":["06-lakes","06-rivers"],"07":"07-roads","08":"08-railways","09":"09-cities","10":"10-buildings","33":["33-infrastructure-ports","33-infrastructure-airports"]};
    for(const[id,layers]of Object.entries(map))for(const layer of(Array.isArray(layers)?layers:[layers]))if(layer!=="nexus-terrain-dem"){const enabled=this.layers?.isVisible?.(id)!==false&&(id!=="03"||this.profile.terrain!==false)&&(id!=="10"||this.profile.urbanDensity>0);this.renderer.setVisibility(layer,enabled)}
  }
}

globalThis.NEXUS_TerrainRenderer=TerrainRenderer;
