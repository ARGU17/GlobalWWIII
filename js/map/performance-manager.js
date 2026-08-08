"use strict";

import{MAP_CONFIG}from"./map-config.js";

const now=()=>globalThis.performance?.now?.()??Date.now();
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const percentile=(samples,ratio)=>{
  if(!samples.length)return 0;
  const sorted=[...samples].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*ratio))];
};

export class PerformanceManager{
  constructor(options={}){
    this.config=options.config||MAP_CONFIG;
    this.samples=[];
    this.sampleLimit=Math.max(30,Math.min(360,Math.trunc(finite(options.sampleLimit,120))));
    this.frameStart=null;
    this.lastFrameAt=null;
    this.lastPresentedFrameAt=null;
    this.renderCostSamples=[];
    this.renderedFrames=0;
    this.droppedFrames=0;
    this.reducedMotion=Boolean(options.reducedMotion);
    this.requestedQuality="auto";
    this.effectiveQuality="medium";
    this.environment=options.environment||{};
    this.setQuality(options.quality||options.initialQuality||"auto",this.environment);
  }

  get quality(){return this.effectiveQuality}
  get targetFps(){return this.getRenderProfile().targetFps}

  beginFrame(timestamp=now()){
    this.frameStart=finite(timestamp,now());
    return this.frameStart;
  }

  endFrame(timestamp=now()){
    const ended=finite(timestamp,now());
    const start=this.frameStart??this.lastFrameAt??ended;
    const duration=Math.max(0,ended-start);
    this.lastFrameAt=ended;
    this.frameStart=null;
    this.renderedFrames+=1;
    this.samples.push(duration);
    if(this.samples.length>this.sampleLimit)this.samples.shift();
    const budget=1000/this.getRenderProfile().targetFps;
    if(duration>budget*1.5)this.droppedFrames+=Math.max(1,Math.round(duration/budget)-1);
    return this.getMetrics();
  }

  recordPresentedFrame(timestamp=now()){
    const presented=finite(timestamp,now());
    if(this.lastPresentedFrameAt!==null){
      const duration=Math.max(0,presented-this.lastPresentedFrameAt);
      if(duration>0&&duration<1000){this.samples.push(duration);if(this.samples.length>this.sampleLimit)this.samples.shift();const budget=1000/this.getRenderProfile().targetFps;if(duration>budget*1.5)this.droppedFrames+=Math.max(1,Math.round(duration/budget)-1)}
    }
    this.lastPresentedFrameAt=presented;this.renderedFrames+=1;return this.getMetrics();
  }

  recordRenderCost(duration){const value=Math.max(0,finite(duration,0));this.renderCostSamples.push(value);if(this.renderCostSamples.length>this.sampleLimit)this.renderCostSamples.shift();return value}

  detectAutomaticQuality(environment=this.environment){
    const memory=finite(environment.deviceMemory??globalThis.navigator?.deviceMemory,4);
    const cores=finite(environment.hardwareConcurrency??globalThis.navigator?.hardwareConcurrency,4);
    const pixelRatio=finite(environment.devicePixelRatio??globalThis.devicePixelRatio,1);
    const reduced=environment.reducedMotion??globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches??false;
    const compact=environment.compactViewport??((globalThis.innerWidth||1280)<760);
    if(memory<=2||cores<=2)return"low";
    if(memory<4||cores<4||compact||pixelRatio>2.5)return"medium";
    if(memory>=8&&cores>=8&&!reduced)return"ultra";
    return"high";
  }

  setQuality(quality="auto",environment=this.environment){
    const requested=String(quality).toLowerCase();
    if(!Object.hasOwn(this.config.quality,requested))throw new RangeError(`Perfil de calidad desconocido: ${quality}`);
    this.requestedQuality=requested;
    this.environment=environment||{};
    this.effectiveQuality=requested==="auto"?this.detectAutomaticQuality(this.environment):requested;
    return this.getRenderProfile();
  }

  setReducedMotion(reduced=true){this.reducedMotion=Boolean(reduced);return this.reducedMotion}

  getRenderProfile(){
    const profile=this.config.quality[this.effectiveQuality]||this.config.quality.medium;
    return{...profile,animations:this.reducedMotion?false:profile.animations,particles:this.reducedMotion?false:profile.particles,requestedQuality:this.requestedQuality,effectiveQuality:this.effectiveQuality,reducedMotion:this.reducedMotion,transitionMs:this.reducedMotion?0:this.config.transitionMs};
  }

  getProfile(){return{...this.getRenderProfile(),name:this.effectiveQuality}}

  shouldRender(lastRenderAt=0,timestamp=now()){
    const elapsed=finite(timestamp,now())-finite(lastRenderAt,0);
    return elapsed>=1000/this.getRenderProfile().targetFps;
  }

  getMetrics(){
    const averageMs=this.samples.length?this.samples.reduce((sum,value)=>sum+value,0)/this.samples.length:0;
    const fps=averageMs>0?1000/averageMs:0;
    const averageRenderCostMs=this.renderCostSamples.length?this.renderCostSamples.reduce((sum,value)=>sum+value,0)/this.renderCostSamples.length:0;
    return{
      fps:Number(fps.toFixed(1)),
      averageFrameMs:Number(averageMs.toFixed(2)),
      p95FrameMs:Number(percentile(this.samples,.95).toFixed(2)),
      averageRenderCostMs:Number(averageRenderCostMs.toFixed(2)),
      renderedFrames:this.renderedFrames,
      droppedFrames:this.droppedFrames,
      sampleSize:this.samples.length,
      requestedQuality:this.requestedQuality,
      effectiveQuality:this.effectiveQuality,
      targetFps:this.getRenderProfile().targetFps,
      reducedMotion:this.reducedMotion
    };
  }
}

if(typeof globalThis!=="undefined"){
  const namespace=globalThis.NEXUS_MAP_V6 ||= {};
  namespace.PerformanceManager=PerformanceManager;
}
