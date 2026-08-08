"use strict";

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const normalizeLongitude=value=>{
  let result=Number(value)||0;
  while(result<-180)result+=360;
  while(result>180)result-=360;
  return result;
};

function coordinatesOf(geometry){
  if(!geometry)return[];
  if(geometry.type==="Point")return[geometry.coordinates];
  if(geometry.type==="Polygon")return geometry.coordinates.flat();
  if(geometry.type==="MultiPolygon")return geometry.coordinates.flat(2);
  return[];
}

export function geometryBounds(geometry){
  const points=coordinatesOf(geometry).filter(point=>Array.isArray(point)&&Number.isFinite(point[0])&&Number.isFinite(point[1]));
  if(!points.length)return null;
  const latitudes=points.map(point=>point[1]);
  const normalized=points.map(point=>((point[0]%360)+360)%360).sort((a,b)=>a-b);
  let largestGap=-1,gapIndex=0;
  for(let index=0;index<normalized.length;index++){
    const next=index===normalized.length-1?normalized[0]+360:normalized[index+1];
    const gap=next-normalized[index];
    if(gap>largestGap){largestGap=gap;gapIndex=index}
  }
  const west=normalized[(gapIndex+1)%normalized.length];
  const east=normalized[gapIndex]+(gapIndex<normalized.length-1?0:360);
  const unwrap=value=>value<west?value+360:value;
  const unwrapped=normalized.map(unwrap);
  const minLng=Math.min(...unwrapped),maxLng=Math.max(...unwrapped);
  return{
    west:normalizeLongitude(minLng),east:normalizeLongitude(maxLng),
    south:Math.min(...latitudes),north:Math.max(...latitudes),
    crossesAntimeridian:maxLng>180||minLng>180,
    spanLongitude:maxLng-minLng
  };
}

export class CameraController{
  constructor(mapState){this.state=mapState;this.map=null;this.synchronizing=false;this.listeners=[]}

  attach(map){
    this.detach();this.map=map;
    const sync=()=>this.capture();
    for(const type of["moveend","zoomend","rotateend","pitchend"]){map.on(type,sync);this.listeners.push([type,sync])}
    this.apply({animate:false});
  }

  detach(){
    if(this.map)for(const[type,listener]of this.listeners)this.map.off(type,listener);
    this.listeners=[];this.map=null;
  }

  capture(){
    if(!this.map||this.synchronizing)return this.state.snapshot?.()||this.state;
    const center=this.map.getCenter();
    this.state.patch({longitude:normalizeLongitude(center.lng),latitude:clamp(center.lat,-85,85),zoom:this.map.getZoom(),pitch:this.map.getPitch(),bearing:this.map.getBearing()});
    this.state.syncToGameState?.();
    return this.state.snapshot?.()||this.state;
  }

  apply({animate=false,duration=0}={}){
    if(!this.map)return;
    const view=this.state.snapshot?.()||this.state;
    const options={center:[view.longitude,view.latitude],zoom:view.zoom,pitch:view.pitch,bearing:view.bearing,duration:animate?duration:0,essential:true};
    this.synchronizing=true;
    try{animate?this.map.easeTo(options):this.map.jumpTo(options)}finally{queueMicrotask(()=>{this.synchronizing=false})}
  }

  setMode(mode,{duration=650}={}){
    const pitch=mode==="terrain"?58:mode==="hybrid"?28:8;
    this.state.patch({mode,pitch});
    this.apply({animate:true,duration});
  }

  focusGeometry(geometry,{padding=72,maxZoom=8,duration=650}={}){
    const bounds=geometryBounds(geometry);if(!bounds||!this.map)return false;
    let west=bounds.west,east=bounds.east;
    if(bounds.crossesAntimeridian&&east<west)east+=360;
    this.map.fitBounds([[west,bounds.south],[east,bounds.north]],{padding,maxZoom,duration,essential:true});
    return true;
  }

  focusPoint(longitude,latitude,{zoom=6,duration=650}={}){
    this.state.patch({longitude:normalizeLongitude(longitude),latitude:clamp(latitude,-85,85),zoom:clamp(zoom,1,18)});
    this.apply({animate:true,duration});
  }

  showWorld({duration=650}={}){
    this.state.patch({longitude:8,latitude:14,zoom:1.55,bearing:0});
    this.apply({animate:true,duration});
  }
}

globalThis.NEXUS_CameraController=CameraController;

