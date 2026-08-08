"use strict";

const freezeDeep=value=>{
  if(!value||typeof value!=="object"||Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const child of Object.values(value))freezeDeep(child);
  return value;
};

export const MAP_MODES=freezeDeep({
  political:{id:"political",label:"POLÍTICO",pitch:8,bearing:0,blend:0,minPitch:0,maxPitch:15,transitionMs:520},
  hybrid:{id:"hybrid",label:"HÍBRIDO",pitch:32,bearing:0,blend:50,minPitch:20,maxPitch:40,transitionMs:620},
  terrain:{id:"terrain",label:"TERRENO 3D",pitch:55,bearing:0,blend:100,minPitch:35,maxPitch:70,transitionMs:720}
});

export const MAP_LAYER_GROUPS=freezeDeep({
  physical:{id:"physical",label:"Capas físicas",range:[0,19],accent:"#58a8d8"},
  political:{id:"political",label:"Capas políticas",range:[20,29],accent:"#e8bf63"},
  simulation:{id:"simulation",label:"Capas de simulación",range:[30,49],accent:"#59d8ad"},
  interface:{id:"interface",label:"Capas de interfaz",range:[50,57],accent:"#c29cff"}
});

const P=["political"],H=["hybrid"],T=["terrain"],PH=["political","hybrid"],HT=["hybrid","terrain"],ALL=["political","hybrid","terrain"];
const rawLayers=[
  [0,"ocean","Océanos","physical","maplibre",true,0,3,ALL],
  [1,"bathymetry","Batimetría","physical","maplibre",true,0,3,HT],
  [2,"terrain-dem","Relieve DEM","physical","maplibre",true,0,3,T],
  [3,"hillshade","Sombreado del relieve","physical","maplibre",true,0,3,HT],
  [4,"landcover","Cobertura del suelo","physical","maplibre",true,1,3,HT],
  [5,"snow-desert","Nieve y desierto","physical","maplibre",true,1,3,HT],
  [6,"rivers-lakes","Ríos y lagos","physical","maplibre",true,1,3,ALL],
  [7,"roads","Carreteras","physical","maplibre",true,1,3,HT],
  [8,"railways","Ferrocarriles","physical","maplibre",true,1,3,HT],
  [9,"cities","Ciudades","physical","maplibre",true,0,3,ALL],
  [10,"buildings","Edificios","physical","maplibre",true,2,3,T],
  [11,"coastlines","Líneas de costa","physical","maplibre",true,0,3,ALL],
  [12,"terrain-contours","Curvas de nivel","physical","maplibre",false,2,3,T],
  [13,"glaciers","Glaciares y hielo","physical","maplibre",false,1,3,HT],
  [14,"climate-zones","Zonas climáticas","physical","maplibre",false,0,3,HT],
  [15,"vegetation","Vegetación","physical","three",false,2,3,T],
  [16,"terrain-lighting","Iluminación del terreno","physical","three",true,1,3,T],
  [17,"night-lights","Luces nocturnas","physical","maplibre",true,0,3,HT],
  [18,"weather","Meteorología y estaciones","physical","deck",false,0,3,HT],
  [19,"physical-labels","Etiquetas físicas","physical","maplibre",true,0,3,ALL],
  [20,"countries-fill","Países","political","maplibre",true,0,3,ALL],
  [21,"regions-fill","Regiones","political","maplibre",true,1,3,ALL],
  [22,"provinces-fill","Provincias","political","maplibre",false,2,3,ALL],
  [23,"occupation","Ocupaciones","political","maplibre",true,0,3,ALL],
  [24,"claims","Reclamaciones","political","maplibre",true,0,3,ALL],
  [25,"national-borders","Fronteras nacionales","political","maplibre",true,0,3,ALL],
  [26,"regional-borders","Fronteras regionales","political","maplibre",true,1,3,ALL],
  [27,"labels","Etiquetas políticas","political","maplibre",true,0,3,ALL],
  [28,"disputed-borders","Fronteras disputadas","political","maplibre",true,0,3,ALL],
  [29,"alliances","Alianzas y bloques","political","deck",false,0,3,PH],
  [30,"resources","Recursos","simulation","deck",true,1,3,ALL],
  [31,"industries","Industrias","simulation","deck",true,1,3,ALL],
  [32,"power-plants","Centrales energéticas","simulation","deck",true,1,3,ALL],
  [33,"infrastructure","Infraestructura","simulation","deck",true,1,3,ALL],
  [34,"trade-routes","Rutas comerciales","simulation","deck",true,0,3,ALL],
  [35,"land-units","Unidades terrestres","simulation","deck",true,0,3,ALL],
  [36,"air-units","Unidades aéreas","simulation","deck",true,0,3,ALL],
  [37,"naval-units","Unidades navales","simulation","deck",true,0,3,ALL],
  [38,"logistics","Logística","simulation","deck",true,1,3,ALL],
  [39,"war-fronts","Frentes de guerra","simulation","deck",true,0,3,ALL],
  [40,"battles","Batallas","simulation","deck",true,0,3,ALL],
  [41,"intelligence","Inteligencia","simulation","deck",false,0,3,ALL],
  [42,"migration","Migración","simulation","deck",false,0,3,ALL],
  [43,"influence","Influencia","simulation","deck",false,0,3,ALL],
  [44,"reconstruction","Reconstrucción","simulation","deck",true,1,3,ALL],
  [45,"supply-routes","Rutas de suministro","simulation","deck",false,1,3,ALL],
  [46,"naval-control","Control naval","simulation","deck",false,0,3,ALL],
  [47,"air-superiority","Superioridad aérea","simulation","deck",false,0,3,ALL],
  [48,"damage","Daños y contaminación","simulation","deck",false,1,3,ALL],
  [49,"strategic-nodes","Nodos estratégicos","simulation","deck",true,0,3,ALL],
  [50,"selection","Selección","interface","maplibre",true,0,3,ALL],
  [51,"hover","Elemento señalado","interface","maplibre",true,0,3,ALL],
  [52,"tooltip","Información contextual","interface","dom",true,0,3,ALL],
  [53,"orders","Órdenes","interface","deck",true,0,3,ALL],
  [54,"range","Alcance","interface","deck",false,1,3,ALL],
  [55,"targets","Objetivos","interface","deck",true,0,3,ALL],
  [56,"alerts","Alertas","interface","dom",true,0,3,ALL],
  [57,"path-preview","Previsualización de ruta","interface","deck",true,1,3,ALL]
];

export const MAP_LAYERS=freezeDeep(rawLayers.map(([index,slug,label,group,renderer,defaultVisible,minLod,maxLod,modes])=>({
  index,
  code:String(index).padStart(2,"0"),
  id:`${String(index).padStart(2,"0")}-${slug}`,
  slug,label,group,renderer,defaultVisible,minLod,maxLod,modes:[...modes],
  interactive:["countries-fill","regions-fill","provinces-fill","industries","power-plants","infrastructure","land-units","air-units","naval-units","battles","strategic-nodes","selection","hover","targets"].includes(slug)
})));

export const MAP_LOD_LEVELS=freezeDeep([
  {level:0,id:"world",label:"Mundo",minZoom:0,maxZoom:4,clusterRadius:72,entityLimit:650,models3d:false,detail:"global"},
  {level:1,id:"country",label:"País",minZoom:4,maxZoom:7,clusterRadius:48,entityLimit:1800,models3d:false,detail:"national"},
  {level:2,id:"region",label:"Región",minZoom:7,maxZoom:10,clusterRadius:28,entityLimit:4800,models3d:true,detail:"regional"},
  {level:3,id:"operational",label:"Operacional",minZoom:10,maxZoom:24,clusterRadius:0,entityLimit:9000,models3d:true,detail:"operational"}
]);

export const MAP_QUALITY_PROFILES=freezeDeep({
  auto:{id:"auto",label:"Automático",resolutionScale:1,maxPixelRatio:2,targetFps:50,terrain:true,shadows:"auto",water:true,models3d:true,animations:true,particles:true,vegetation:.65,urbanDensity:.72,renderDistance:.78,antialias:true},
  ultra:{id:"ultra",label:"Ultra",resolutionScale:1,maxPixelRatio:2,targetFps:60,terrain:true,shadows:"high",water:true,models3d:true,animations:true,particles:true,vegetation:1,urbanDensity:1,renderDistance:1,antialias:true},
  high:{id:"high",label:"Alto",resolutionScale:.9,maxPixelRatio:1.75,targetFps:55,terrain:true,shadows:"medium",water:true,models3d:true,animations:true,particles:true,vegetation:.72,urbanDensity:.8,renderDistance:.82,antialias:true},
  medium:{id:"medium",label:"Medio",resolutionScale:.78,maxPixelRatio:1.5,targetFps:45,terrain:true,shadows:"low",water:true,models3d:true,animations:true,particles:false,vegetation:.38,urbanDensity:.58,renderDistance:.65,antialias:true},
  low:{id:"low",label:"Bajo",resolutionScale:.62,maxPixelRatio:1,targetFps:30,terrain:false,shadows:"off",water:false,models3d:false,animations:false,particles:false,vegetation:0,urbanDensity:.3,renderDistance:.45,antialias:false}
});

export const MAP_CONFIG=freezeDeep({
  version:"map-v1",
  stateVersion:1,
  dataVersion:1,
  transitionMs:620,
  transitionDuration:620,
  modes:MAP_MODES,
  groups:MAP_LAYER_GROUPS,
  layers:MAP_LAYERS,
  lod:MAP_LOD_LEVELS,
  quality:MAP_QUALITY_PROFILES,
  performanceTargets:{desktop:{political:60,hybrid:50,terrain:40},tablet:{political:45,hybrid:30,terrain:30},mobile:{political:30,hybrid:30,terrain:24}},
  camera:{longitude:8,latitude:18,zoom:2,pitch:8,bearing:0,minZoom:0,maxZoom:16,minPitch:0,maxPitch:70},
  sources:{layers:"data/map-v1/layers.json",countries110:"assets/maps/v6/ne_110m_admin_0_countries.geojson",countries50:"assets/maps/v6/ne_50m_admin_0_countries.geojson",regions50:"assets/maps/v6/ne_50m_admin_1_states_provinces.geojson",spainRegions:"assets/maps/v6/spain_autonomous_regions.json",spainProvinces:"assets/maps/v6/spain_provinces.json",dem:"assets/maps/v6/dem/{z}/{x}/{y}.png"},
  fallbacks:{canvasId:"strategicMapFallback",glHostId:"strategicMapGL",noticeId:"mapFallbackNotice",offlineBase:true}
});

if(typeof globalThis!=="undefined"){
  const namespace=globalThis.NEXUS_MAP_V6 ||= {};
  Object.assign(namespace,{MAP_CONFIG,MAP_MODES,MAP_LAYER_GROUPS,MAP_LAYERS,MAP_LOD_LEVELS,MAP_QUALITY_PROFILES});
}
