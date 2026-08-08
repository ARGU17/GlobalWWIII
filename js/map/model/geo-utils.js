const EARTH_LAT_LIMIT=85.051129;
const BOUNDS_CACHE=new WeakMap();

export function stableHash(value){let hash=2166136261>>>0;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0}
export function createDeterministicRandom(seed){let state=stableHash(seed)||0x9e3779b9;return()=>{state+=0x6D2B79F5;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296}}
export function normalizeLongitude(value){let longitude=Number(value)||0;while(longitude>180)longitude-=360;while(longitude<-180)longitude+=360;return longitude}
export function clampLatitude(value){return Math.max(-EARTH_LAT_LIMIT,Math.min(EARTH_LAT_LIMIT,Number(value)||0))}
export function unwrapLongitude(value,reference=0){let longitude=normalizeLongitude(value),anchor=normalizeLongitude(reference);while(longitude-anchor>180)longitude-=360;while(longitude-anchor<-180)longitude+=360;return longitude}
export function isPosition(value){return Boolean(value)&&Number.isFinite(Number(value.longitude))&&Number.isFinite(Number(value.latitude))}
export function position(longitude,latitude,metadata={}){return{longitude:normalizeLongitude(longitude),latitude:clampLatitude(latitude),...metadata}}
export function normalizeName(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}

export function deepFreeze(value,seen=new WeakSet()){
  if(!value||typeof value!=="object"||Object.isFrozen(value)||seen.has(value))return value;seen.add(value);
  for(const child of Object.values(value))deepFreeze(child,seen);return Object.freeze(value)
}

function collectCoordinates(node,target){
  if(!Array.isArray(node))return;if(node.length>=2&&Number.isFinite(Number(node[0]))&&Number.isFinite(Number(node[1]))){target.push([Number(node[0]),Number(node[1])]);return}
  for(const child of node)collectCoordinates(child,target)
}

export function geometryBounds(geometry){
  if(!geometry)return null;if(BOUNDS_CACHE.has(geometry))return BOUNDS_CACHE.get(geometry);if(geometry.type==="GeometryCollection"){const parts=(geometry.geometries||[]).map(geometryBounds).filter(Boolean);if(!parts.length)return null;const points=parts.flatMap(bounds=>[[bounds.west,bounds.south],[bounds.east,bounds.north]]),bounds=geometryBounds({type:"MultiPoint",coordinates:points});BOUNDS_CACHE.set(geometry,bounds);return bounds}
  const coordinates=[];collectCoordinates(geometry.coordinates,coordinates);if(!coordinates.length)return null;
  const latitudes=coordinates.map(item=>item[1]),longitudes=coordinates.map(item=>normalizeLongitude(item[0])).sort((a,b)=>a-b);let largestGap=-1,gapEnd=longitudes[0];
  for(let index=0;index<longitudes.length;index++){const current=longitudes[index],next=index===longitudes.length-1?longitudes[0]+360:longitudes[index+1],gap=next-current;if(gap>largestGap){largestGap=gap;gapEnd=next}}
  const west=normalizeLongitude(gapEnd),span=Math.max(0,360-largestGap),unwrapped=coordinates.map(item=>unwrapLongitude(item[0],west)).map(value=>value<west?value+360:value),unwrappedWest=Math.min(...unwrapped),unwrappedEast=Math.max(...unwrapped),centerLongitude=normalizeLongitude((unwrappedWest+unwrappedEast)/2),south=Math.min(...latitudes),north=Math.max(...latitudes);
  const bounds={west:normalizeLongitude(unwrappedWest),east:normalizeLongitude(unwrappedEast),south,north,longitudeSpan:Math.min(span,unwrappedEast-unwrappedWest),latitudeSpan:north-south,crossesAntimeridian:normalizeLongitude(unwrappedWest)>normalizeLongitude(unwrappedEast),center:position(centerLongitude,(south+north)/2)};BOUNDS_CACHE.set(geometry,bounds);return bounds
}

function pointInRing(longitude,latitude,ring){
  if(!Array.isArray(ring)||ring.length<3)return false;
  const continuous=[];let previousLongitude=normalizeLongitude(ring[0][0]);continuous.push([previousLongitude,Number(ring[0][1])]);
  for(let index=1;index<ring.length;index++){
    let currentLongitude=normalizeLongitude(ring[index][0]);while(currentLongitude-previousLongitude>180)currentLongitude-=360;while(currentLongitude-previousLongitude<-180)currentLongitude+=360;continuous.push([currentLongitude,Number(ring[index][1])]);previousLongitude=currentLongitude
  }
  const longitudes=continuous.map(item=>item[0]),center=(Math.min(...longitudes)+Math.max(...longitudes))/2,y=Number(latitude);let x=normalizeLongitude(longitude);while(x-center>180)x-=360;while(x-center<-180)x+=360;let inside=false;
  for(let current=0,previous=continuous.length-1;current<continuous.length;previous=current++){
    const [ax,ay]=continuous[current],[bx,by]=continuous[previous];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/((by-ay)||Number.EPSILON)+ax)inside=!inside
  }
  return inside
}
function pointInPolygon(longitude,latitude,rings){return Boolean(rings?.length)&&pointInRing(longitude,latitude,rings[0])&&!rings.slice(1).some(ring=>pointInRing(longitude,latitude,ring))}
export function pointInGeometry(longitude,latitude,geometry){
  if(!geometry)return false;if(geometry.type==="Point")return Math.abs(unwrapLongitude(geometry.coordinates[0],longitude)-longitude)<1e-7&&Math.abs(geometry.coordinates[1]-latitude)<1e-7;
  if(geometry.type==="Polygon")return pointInPolygon(longitude,latitude,geometry.coordinates);
  if(geometry.type==="MultiPolygon")return geometry.coordinates.some(polygon=>pointInPolygon(longitude,latitude,polygon));
  if(geometry.type==="GeometryCollection")return(geometry.geometries||[]).some(item=>pointInGeometry(longitude,latitude,item));return false
}

export function deterministicPosition(seed,{anchor={longitude:0,latitude:0},geometry=null,spread=1,attempts=96}={}){
  if(geometry?.type==="Point")return position(geometry.coordinates[0],geometry.coordinates[1],{coordinateSource:"geometry-point"});
  const random=createDeterministicRandom(seed),bounds=geometryBounds(geometry);
  if(bounds&&["Polygon","MultiPolygon","GeometryCollection"].includes(geometry.type)){
    const west=bounds.west,span=Math.max(.0001,bounds.longitudeSpan),height=Math.max(.0001,bounds.latitudeSpan);
    for(let index=0;index<attempts;index++){const longitude=normalizeLongitude(west+random()*span),latitude=bounds.south+random()*height;if(pointInGeometry(longitude,latitude,geometry))return position(longitude,latitude,{coordinateSource:"geometry-seeded",placementAttempt:index+1})}
    if(pointInGeometry(bounds.center.longitude,bounds.center.latitude,geometry))return position(bounds.center.longitude,bounds.center.latitude,{coordinateSource:"geometry-center"})
  }
  const base=isPosition(anchor)?anchor:{longitude:Number(anchor?.lng)||0,latitude:Number(anchor?.lat)||0};return position(base.longitude+(random()-.5)*2*spread,base.latitude+(random()-.5)*1.4*spread,{coordinateSource:"anchor-seeded"})
}

export function countryCodeFromFeature(feature){const properties=feature?.properties||{};return String(feature?.id||properties.gameCountryId||properties.ISO3||properties.ISO_A3_EH||properties.ADM0_A3||properties.SOV_A3||properties.iso_a3||properties.adm0_a3||"").toUpperCase()}
export function regionCodeFromFeature(feature){const properties=feature?.properties||{};return String(feature?.id||properties.gameRegionId||properties.regionId||properties.adm1_code||properties.iso_3166_2||properties.ISO_3166_2||properties.code_hasc||properties.gn_id||"")}
export function featureName(feature){const properties=feature?.properties||{};return String(properties.name_es||properties.NAME_ES||properties.name||properties.NAME||properties.name_en||properties.NAME_EN||"")}

function decodeArc(topology,index,cache){
  const reversed=index<0,key=reversed?~index:index;if(!cache.has(key)){let x=0,y=0;const transform=topology.transform||null,arc=(topology.arcs?.[key]||[]).map(pair=>{x+=Number(pair[0])||0;y+=Number(pair[1])||0;return transform?[x*transform.scale[0]+transform.translate[0],y*transform.scale[1]+transform.translate[1]]:[x,y]});cache.set(key,arc)}const coordinates=cache.get(key);return reversed?[...coordinates].reverse():coordinates
}
function stitchArcs(topology,indexes,cache){const result=[];for(const index of indexes||[]){const arc=decodeArc(topology,index,cache);if(result.length&&arc.length)result.push(...arc.slice(1));else result.push(...arc)}return result}
function transformPoint(topology,coordinates){const transform=topology.transform;if(!transform)return[Number(coordinates[0]),Number(coordinates[1])];return[coordinates[0]*transform.scale[0]+transform.translate[0],coordinates[1]*transform.scale[1]+transform.translate[1]]}
function topologyGeometry(topology,geometry,cache){
  if(!geometry)return null;switch(geometry.type){
    case"Point":return{type:"Point",coordinates:transformPoint(topology,geometry.coordinates)};
    case"MultiPoint":return{type:"MultiPoint",coordinates:(geometry.coordinates||[]).map(item=>transformPoint(topology,item))};
    case"LineString":return{type:"LineString",coordinates:stitchArcs(topology,geometry.arcs,cache)};
    case"MultiLineString":return{type:"MultiLineString",coordinates:(geometry.arcs||[]).map(line=>stitchArcs(topology,line,cache))};
    case"Polygon":return{type:"Polygon",coordinates:(geometry.arcs||[]).map(ring=>stitchArcs(topology,ring,cache))};
    case"MultiPolygon":return{type:"MultiPolygon",coordinates:(geometry.arcs||[]).map(polygon=>polygon.map(ring=>stitchArcs(topology,ring,cache)))};
    case"GeometryCollection":return{type:"GeometryCollection",geometries:(geometry.geometries||[]).map(item=>topologyGeometry(topology,item,cache))};default:return null
  }
}
export function topologyToFeatureCollection(topology,objectName=null){
  if(topology?.type!=="Topology")return topology?.type==="FeatureCollection"?topology:{type:"FeatureCollection",features:[]};const cache=new Map(),objects=objectName&&topology.objects?.[objectName]?[topology.objects[objectName]]:Object.values(topology.objects||{}),geometries=objects.flatMap(object=>object.type==="GeometryCollection"?object.geometries||[]:[object]),features=geometries.map((geometry,index)=>({type:"Feature",id:geometry.id??index,properties:{...(geometry.properties||{})},geometry:topologyGeometry(topology,geometry,cache)}));return{type:"FeatureCollection",features}
}

export function asFeatureCollection(value){
  if(value?.type==="Topology")return topologyToFeatureCollection(value);if(value?.type==="FeatureCollection")return value;if(value?.type==="Feature")return{type:"FeatureCollection",features:[value]};return{type:"FeatureCollection",features:[]}
}
