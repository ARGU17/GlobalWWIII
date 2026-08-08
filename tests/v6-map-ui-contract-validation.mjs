import{readFile}from"node:fs/promises";
import{fileURLToPath,pathToFileURL}from"node:url";
import{dirname,join}from"node:path";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const assert=(condition,message)=>{if(!condition)throw new Error(`v6 mapa: ${message}`)};
const read=relative=>readFile(join(root,relative),"utf8");
const moduleAt=relative=>import(pathToFileURL(join(root,relative)).href);

const layerDocument=JSON.parse(await read("data/map-v1/layers.json"));
const{MAP_CONFIG,MAP_LAYERS,MAP_LOD_LEVELS,MAP_QUALITY_PROFILES}=await moduleAt("js/map/map-config.js");
const{MapState}=await moduleAt("js/map/map-state.js");
const{LayerManager}=await moduleAt("js/map/layer-manager.js");
const{LODManager}=await moduleAt("js/map/lod-manager.js");
const{PerformanceManager}=await moduleAt("js/map/performance-manager.js");
const{MapUIControls}=await moduleAt("js/map/ui-controls.js");

assert(layerDocument.version==="map-v1","layers.json debe estar versionado como map-v1");
assert(layerDocument.groups.length===4,"deben existir cuatro categorías de capas");
assert(layerDocument.layers.length===58,"el catálogo JSON debe contener exactamente 58 capas");
assert(MAP_LAYERS.length===58&&MAP_CONFIG.layers.length===58,"la configuración debe contener exactamente 58 capas");
assert(new Set(layerDocument.layers.map(layer=>layer.id)).size===58,"cada capa debe tener un identificador único");
assert(new Set(layerDocument.layers.map(layer=>layer.group)).size===4,"las 58 capas deben cubrir cuatro categorías");
for(let index=0;index<58;index+=1){
  const jsonLayer=layerDocument.layers[index],moduleLayer=MAP_LAYERS[index],code=String(index).padStart(2,"0");
  assert(jsonLayer.index===index&&jsonLayer.code===code,`la secuencia JSON debe incluir ${code}`);
  assert(moduleLayer.index===index&&moduleLayer.code===code,`la secuencia de configuración debe incluir ${code}`);
  assert(jsonLayer.id===moduleLayer.id&&jsonLayer.slug===moduleLayer.slug,`la capa ${code} debe coincidir entre datos y código`);
}
const requiredLayers=new Map([[0,"ocean"],[1,"bathymetry"],[2,"terrain-dem"],[3,"hillshade"],[4,"landcover"],[5,"snow-desert"],[6,"rivers-lakes"],[7,"roads"],[8,"railways"],[9,"cities"],[10,"buildings"],[20,"countries-fill"],[21,"regions-fill"],[22,"provinces-fill"],[23,"occupation"],[24,"claims"],[25,"national-borders"],[26,"regional-borders"],[27,"labels"],[30,"resources"],[31,"industries"],[32,"power-plants"],[33,"infrastructure"],[34,"trade-routes"],[35,"land-units"],[36,"air-units"],[37,"naval-units"],[38,"logistics"],[39,"war-fronts"],[40,"battles"],[41,"intelligence"],[42,"migration"],[43,"influence"],[50,"selection"],[51,"hover"],[52,"tooltip"],[53,"orders"],[54,"range"],[55,"targets"],[56,"alerts"],[57,"path-preview"]]);
for(const[index,slug]of requiredLayers)assert(MAP_LAYERS[index].slug===slug,`la capa ${index} debe ser ${slug}`);

assert(Object.keys(MAP_CONFIG.modes).join(",")==="political,hybrid,terrain","deben existir los modos político, híbrido y terreno");
for(const mode of Object.values(MAP_CONFIG.modes))assert(mode.transitionMs>=400&&mode.transitionMs<=800,`la transición ${mode.id} debe durar entre 400 y 800 ms`);
assert(MAP_LOD_LEVELS.length===4&&MAP_LOD_LEVELS.every((entry,index)=>entry.level===index),"deben existir cuatro LOD 0-3");
assert(["auto","ultra","high","medium","low"].every(id=>Object.hasOwn(MAP_QUALITY_PROFILES,id)),"deben existir los cinco perfiles de calidad");
for(const profile of Object.values(MAP_QUALITY_PROFILES))assert(["terrain","shadows","water","models3d","animations","vegetation","particles","urbanDensity","renderDistance","resolutionScale","antialias"].every(field=>Object.hasOwn(profile,field)),`el perfil ${profile.id} debe configurar todos los parámetros visuales`);

const mapState=new MapState({mapMode:"regions",mapCenter:[40,-3],mapZoom:6,mapLayer:"military",selectedCountryId:"ESP",selectedRegionId:"ES-MD"});
const requiredStateFields=["mode","longitude","latitude","zoom","pitch","bearing","selectedCountryId","selectedRegionId","hoveredFeatureId","activeLayer","visibleLayers"];
assert(requiredStateFields.every(field=>Object.hasOwn(mapState.snapshot(),field)),"MapState debe exponer todos los campos de estado requeridos");
const cameraBefore=mapState.snapshot();
const hybrid=mapState.setMode("hybrid");
assert(hybrid.mode==="hybrid"&&hybrid.pitch===MAP_CONFIG.modes.hybrid.pitch,"cambiar a híbrido debe aplicar su inclinación");
assert(hybrid.longitude===cameraBefore.longitude&&hybrid.latitude===cameraBefore.latitude&&hybrid.zoom===cameraBefore.zoom&&hybrid.bearing===cameraBefore.bearing,"cambiar modo no debe perder la cámara");
assert(hybrid.selectedCountryId==="ESP"&&hybrid.selectedRegionId==="ES-MD","cambiar modo no debe perder la selección");
assert(hybrid.transition.durationMs>=400&&hybrid.transition.durationMs<=800,"MapState debe registrar la transición visual");
assert(mapState.setMode("terrain",{reducedMotion:true}).transition.durationMs===0,"movimiento reducido debe eliminar la transición");
const politicalAgain=mapState.setMode("political");assert(politicalAgain.mode==="political"&&politicalAgain.selectedCountryId==="ESP"&&politicalAgain.selectedRegionId==="ES-MD","el ciclo político-híbrido-terreno-político debe conservar la selección");
mapState.setMode("terrain",{reducedMotion:true});
mapState.setHoveredFeature("feature-1");mapState.setLayerVisibility("31-industries",false);
const gameState={mapMode:"regions"};mapState.syncToGameState(gameState);
assert(gameState.mapMode==="regions"&&gameState.mapVisualMode==="terrain","la sincronización debe conservar el alcance heredado y guardar el modo visual");
assert(gameState.mapCenter.length===2&&gameState.mapVisibleLayers["31-industries"]===false,"la sincronización debe guardar cámara y visibilidad");
mapState.setSelection("ESP",null);mapState.syncToGameState(gameState);assert(gameState.selectedRegionId===null,"limpiar una región seleccionada debe propagarse al estado del juego");

const layers=new LayerManager(MAP_CONFIG);
assert(layers.getLayerDefinitions().length===58,"LayerManager debe devolver las 58 definiciones");
assert(layers.resolve("31-industries")?.slug==="industries"&&layers.resolve("31")?.slug==="industries"&&layers.resolve("industries")?.code==="31","LayerManager debe resolver id, código y slug");
layers.setMode("terrain");layers.setLod(2);layers.setVisible("02-terrain-dem",true);
assert(layers.isVisible("02-terrain-dem"),"el relieve DEM activado debe ser visible en terreno");
assert(!layers.isVisible("29-alliances"),"una capa incompatible con terreno debe quedar filtrada");
assert(layers.getRendererBuckets({visible:true}).maplibre.length>0,"debe construir lotes por renderer");
assert(layers.setGroupVisible("interface",false)===8&&layers.getLayerDefinitions({group:"interface"}).every(layer=>layers.visible[layer.id]===false),"cada grupo debe poder desactivarse completo");

const lod=new LODManager(MAP_CONFIG);
assert(lod.getLevel(2)===0&&lod.getLevel(5)===1&&lod.getLevel(8)===2&&lod.getLevel(11)===3,"los cuatro niveles LOD deben responder a sus intervalos de zoom");
const operational=lod.profile(11,"high");
assert(operational.showDetailedUnits&&operational.showRegions&&operational.showProvinces,"LOD operacional debe mostrar entidades detalladas");
assert(lod.profile(2,"low").simplifiedGeometry,"LOD mundo con calidad baja debe simplificar geometría");

const performance=new PerformanceManager({quality:"auto",environment:{deviceMemory:8,hardwareConcurrency:8,devicePixelRatio:1,compactViewport:false}});
performance.beginFrame(0);performance.endFrame(16.67);performance.beginFrame(16.67);performance.endFrame(33.34);
const metrics=performance.getMetrics();
assert(Number.isFinite(metrics.fps)&&metrics.fps>0&&Number.isFinite(metrics.averageFrameMs),"PerformanceManager debe calcular FPS y duración de fotograma");
for(const quality of["auto","ultra","high","medium","low"])assert(performance.setQuality(quality).requestedQuality===quality,`debe admitir calidad ${quality}`);
assert(Number.isFinite(performance.targetFps)&&performance.getProfile().name===performance.quality,"debe ofrecer la interfaz de rendimiento consumida por los renderers");
const controls=new MapUIControls({root:null,mapState,layerManager:layers,lodManager:lod,performanceManager:performance});
assert(controls instanceof MapUIControls&&["initialize","update","setMode","setActiveLayer","setBlend","setQuality","setLOD","setFallback"].every(method=>typeof controls[method]==="function"),"los controles deben ofrecer el contrato de integración del motor incluso sin DOM");
assert(controls.setBlend(.5)===50&&mapState.snapshot().visualBlend===50,"la UI debe traducir la mezcla normalizada del renderer al porcentaje del control");

const[index,css,uiSource]=await Promise.all([read("index.html"),read("css/styles.css"),read("js/map/ui-controls.js")]);
assert(/<div[^>]+id="strategicMap"/.test(index),"strategicMap debe ser un host DIV compatible con MapLibre");
assert(index.indexOf('id="strategicMapGL"')>index.indexOf('id="strategicMap"')&&index.indexOf('id="strategicMapFallback"')>index.indexOf('id="strategicMapGL"'),"el host debe contener MapLibre y el Canvas de compatibilidad");
for(const id of["mapModePolitical","mapModeHybrid","mapModeTerrain","mapModeBlend","mapBlendValue","mapLayersToggle","mapQualitySelect","mapFpsToggle","mapZoomIn","mapZoomOut","mapTopDown","mapTilt","mapRotateLeft","mapRotateRight","mapCompass","mapReset","mapBaseToggle","mapScale","mapCoordinates","mapLodBadge","mapFpsCounter","mapFallbackNotice","mapLayerPanel","mapLayerPanelContent","mapLegend"]){
  assert(index.includes(`id="${id}"`),`la interfaz debe incluir #${id}`);
}
assert(index.includes('data-map-mode="political"')&&index.includes('data-map-mode="hybrid"')&&index.includes('data-map-mode="terrain"'),"la interfaz debe ofrecer los tres botones de modo");
assert(css.includes("prefers-reduced-motion:reduce")&&css.includes("body.reduced-motion"),"CSS debe respetar movimiento reducido");
assert(css.includes("@media(max-width:720px)")&&css.includes(".map-layer-panel"),"CSS debe adaptar mapa y panel de capas a móvil");
assert(uiSource.includes("export class MapUIControls")&&uiSource.includes("renderLayerPanel")&&uiSource.includes("setGroupVisible"),"los controles deben exportarse y gestionar las 58 capas por grupo");

const reviewedSources=await Promise.all(["js/map/map-config.js","js/map/map-state.js","js/map/layer-manager.js","js/map/lod-manager.js","js/map/performance-manager.js","js/map/ui-controls.js","data/map-v1/layers.json"].map(read));
const unfinishedTokens=["TO"+"DO","FIX"+"ME","place"+"holder","Not "+"implemented"];
assert(reviewedSources.every(source=>unfinishedTokens.every(token=>!source.toLowerCase().includes(token.toLowerCase()))),"los nuevos contratos no deben contener trabajo pendiente ni marcadores vacíos");

console.log("OK v6 map UI contracts · 58 capas · 4 LOD · 5 perfiles · 3 modos");
