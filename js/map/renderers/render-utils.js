"use strict";

export const asArray=value=>Array.isArray(value)?value:[];
export const longitudeOf=value=>Number(value?.longitude??value?.lng??value?.lon??value?.position?.longitude??value?.position?.lng??value?.position?.lon);
export const latitudeOf=value=>Number(value?.latitude??value?.lat??value?.position?.latitude??value?.position?.lat);
export const validPosition=value=>Number.isFinite(longitudeOf(value))&&Number.isFinite(latitudeOf(value));
export const positionOf=value=>[longitudeOf(value),latitudeOf(value)];
export const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

export function withinBounds(value,bounds,padding=.12){
  if(!bounds||!validPosition(value))return true;
  const west=Number(bounds.west),east=Number(bounds.east),south=Number(bounds.south),north=Number(bounds.north);
  if(![west,east,south,north].every(Number.isFinite))return true;
  const longitude=longitudeOf(value),latitude=latitudeOf(value),latitudePad=Math.max(1,(north-south)*padding),longitudeSpan=east>=west?east-west:360-west+east,longitudePad=Math.max(1,longitudeSpan*padding);
  const insideLatitude=latitude>=Math.max(-90,south-latitudePad)&&latitude<=Math.min(90,north+latitudePad);
  if(!insideLatitude)return false;
  const paddedWest=west-longitudePad,paddedEast=east+longitudePad;
  if(longitudeSpan+longitudePad*2>=360)return true;
  const normalized=((longitude+180)%360+360)%360-180;
  if(paddedEast-paddedWest>=360)return true;
  if(paddedWest>=-180&&paddedEast<=180)return normalized>=paddedWest&&normalized<=paddedEast;
  const wrappedWest=((paddedWest+180)%360+360)%360-180,wrappedEast=((paddedEast+180)%360+360)%360-180;
  return wrappedWest<=wrappedEast?normalized>=wrappedWest&&normalized<=wrappedEast:normalized>=wrappedWest||normalized<=wrappedEast;
}

export function limitEntities(items,limit,{priority=item=>Boolean(item?.selected||item?.active||item?.status==="active")}={}){
  const source=asArray(items),maximum=Math.max(0,Math.trunc(Number(limit)||0));
  if(!maximum||source.length<=maximum)return source;
  const urgent=[],regular=[];for(const item of source)(priority(item)?urgent:regular).push(item);
  if(urgent.length>=maximum)return urgent.slice(0,maximum);
  const remaining=maximum-urgent.length,step=regular.length/remaining,sampled=[];
  for(let index=0;index<remaining;index++)sampled.push(regular[Math.min(regular.length-1,Math.floor(index*step))]);
  return[...urgent,...sampled];
}

export function rgba(color,alpha=255){
  if(Array.isArray(color))return[color[0]||0,color[1]||0,color[2]||0,color.length>3?color[3]:alpha];
  const hex=String(color||"#5ac8e8").replace("#","");
  const full=hex.length===3?hex.split("").map(char=>char+char).join(""):hex.padEnd(6,"0");
  return[parseInt(full.slice(0,2),16)||0,parseInt(full.slice(2,4),16)||0,parseInt(full.slice(4,6),16)||0,alpha];
}

export function routePath(route){
  const direct=asArray(route?.path).map(point=>Array.isArray(point)?point:positionOf(point)).filter(point=>point.every(Number.isFinite));
  if(direct.length>=2)return unwrapPath(direct);
  const from=route?.origin||route?.fromPosition||route?.fromCoordinates||route?.aPosition||(Array.isArray(route?.from)?route.from:null);
  const to=route?.destination||route?.toPosition||route?.toCoordinates||route?.bPosition||(Array.isArray(route?.to)?route.to:null);
  if(Array.isArray(from)&&Array.isArray(to)&&from.length>=2&&to.length>=2)return unwrapPath([from,to]);
  if(validPosition(from)&&validPosition(to))return unwrapPath([positionOf(from),positionOf(to)]);
  if(Array.isArray(route?.coordinates)&&route.coordinates.length>=2)return unwrapPath(route.coordinates);
  return[];
}

export function unwrapPath(path){
  const result=[];let previous=null;
  for(const point of path){let lng=Number(point[0]),lat=Number(point[1]);if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
    if(previous!==null){while(lng-previous>180)lng-=360;while(lng-previous<-180)lng+=360}
    result.push([lng,Math.max(-85,Math.min(85,lat))]);previous=lng;
  }
  return result;
}

export function pointAlongPath(path,progress){
  const points=unwrapPath(path);if(!points.length)return null;if(points.length===1)return points[0];
  const lengths=[];let total=0;
  for(let index=1;index<points.length;index++){const dx=(points[index][0]-points[index-1][0])*Math.cos((points[index][1]+points[index-1][1])*Math.PI/360),dy=points[index][1]-points[index-1][1],length=Math.hypot(dx,dy);lengths.push(length);total+=length}
  let remaining=clamp01(progress)*total;
  for(let index=0;index<lengths.length;index++){
    if(remaining<=lengths[index]||index===lengths.length-1){const t=lengths[index]?remaining/lengths[index]:0,a=points[index],b=points[index+1];let lng=a[0]+(b[0]-a[0])*t;while(lng>180)lng-=360;while(lng<-180)lng+=360;return[lng,a[1]+(b[1]-a[1])*t]}
    remaining-=lengths[index];
  }
  return points.at(-1);
}

export function aggregateByCell(items,zoom,{cellDegrees=Math.max(.25,25/Math.pow(2,Math.max(0,zoom-1))),key="type"}={}){
  const groups=new Map();
  for(const item of asArray(items)){if(!validPosition(item))continue;const lng=longitudeOf(item),lat=latitudeOf(item),cell=`${Math.round(lng/cellDegrees)}:${Math.round(lat/cellDegrees)}:${item[key]||item.type||"item"}`,entry=groups.get(cell);
    if(entry){entry.count++;entry.quantity+=Number(item.quantity||1);entry.longitude+=lng;entry.latitude+=lat;entry.items.push(item)}
    else groups.set(cell,{...item,count:1,quantity:Number(item.quantity||1),longitude:lng,latitude:lat,items:[item],clusterId:cell});
  }
  return[...groups.values()].map(item=>({...item,longitude:item.longitude/item.count,latitude:item.latitude/item.count,entityId:item.count===1?(item.id||item.entityId):`cluster:${item.clusterId}`}));
}
