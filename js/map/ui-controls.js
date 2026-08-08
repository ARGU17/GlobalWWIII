"use strict";

import{MAP_CONFIG}from"./map-config.js";

const formatCoordinate=(value,positive,negative)=>`${Math.abs(Number(value)||0).toFixed(3)}° ${Number(value)>=0?positive:negative}`;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));

export class MapUIControls{
  constructor(options={}){
    this.mapState=options.mapState||null;
    this.layerManager=options.layerManager||null;
    this.lodManager=options.lodManager||null;
    this.performanceManager=options.performanceManager||null;
    this.engine=options.engine||globalThis.NEXUS_MAP_ENGINE||null;
    this.actions=options.actions||{};
    this.root=options.root??globalThis.document??null;
    this.config=options.config||MAP_CONFIG;
    this.bound=false;
    this.listeners=[];
    this.subscriptions=[];
    this.fpsTimer=null;
    this.transitionTimer=null;
    this.motionMedia=null;
    this.elements={};
  }

  query(selector){return this.root?.querySelector?.(selector)||null}
  queryAll(selector){return[...(this.root?.querySelectorAll?.(selector)||[])]}

  listen(target,type,handler,options){
    if(!target?.addEventListener)return;
    target.addEventListener(type,handler,options);
    this.listeners.push(()=>target.removeEventListener(type,handler,options));
  }

  invoke(method,...args){
    const candidate=this.engine?.[method];
    return typeof candidate==="function"?candidate.apply(this.engine,args):undefined;
  }

  act(name,...args){
    const action=this.actions?.[name];
    if(typeof action==="function")return action(...args);
    return this.invoke(name,...args);
  }

  initialize(){return this.bind()}

  bind(){
    if(this.bound||!this.root)return this;
    this.bound=true;
    this.elements={
      host:this.query("#strategicMap"),gl:this.query("#strategicMapGL"),fallback:this.query("#strategicMapFallback"),
      blend:this.query("#mapModeBlend"),blendValue:this.query("#mapBlendValue"),quality:this.query("#mapQualitySelect"),fpsToggle:this.query("#mapFpsToggle"),
      fps:this.query("#mapFpsCounter"),scale:this.query("#mapScale"),coordinates:this.query("#mapCoordinates"),
      lod:this.query("#mapLodBadge"),layersToggle:this.query("#mapLayersToggle"),layerPanel:this.query("#mapLayerPanel"),
      layerPanelClose:this.query("#mapLayerPanelClose"),layerContent:this.query("#mapLayerPanelContent"),
      legend:this.query("#mapLegend"),fallbackNotice:this.query("#mapFallbackNotice"),compass:this.query("#mapCompass")
    };
    this.motionMedia=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")||null;
    this.applyReducedMotion(Boolean(this.motionMedia?.matches));
    if(this.motionMedia)this.listen(this.motionMedia,"change",event=>this.applyReducedMotion(Boolean(event.matches)));

    for(const button of this.queryAll("[data-map-mode]"))this.listen(button,"click",()=>this.selectMode(button.dataset.mapMode));
    for(const button of this.queryAll("[data-map-layer]"))this.listen(button,"click",()=>{
      if(typeof this.actions?.setMapLayer==="function")this.actions.setMapLayer(button.dataset.mapLayer);
      else{this.layerManager?.setActiveLayer?.(button.dataset.mapLayer);this.mapState?.setActiveLayer?.(button.dataset.mapLayer);this.invoke("setMapLayer",button.dataset.mapLayer)}
      this.render();
    });
    this.listen(this.elements.blend,"input",event=>{
      const visualBlend=clamp(event.currentTarget.value,0,100);
      if(this.elements.blendValue)this.elements.blendValue.textContent=`${Math.round(visualBlend)}%`;
      this.mapState?.patch?.({visualBlend},{source:"ui-blend"});
      if(typeof this.actions?.setBlend==="function")this.actions.setBlend(visualBlend/100);else this.invoke("setBlend",visualBlend/100);
    });
    this.listen(this.elements.quality,"change",event=>{
      const quality=event.currentTarget.value;
      if(typeof this.actions?.setQuality==="function")this.actions.setQuality(quality);
      else{this.performanceManager?.setQuality?.(quality);this.mapState?.patch?.({quality},{source:"ui-quality"});this.invoke("setQuality",quality)}
      this.render();
    });
    this.listen(this.elements.layersToggle,"click",()=>this.toggleLayerPanel());
    this.listen(this.elements.layerPanelClose,"click",()=>this.toggleLayerPanel(false));
    this.listen(this.elements.fpsToggle,"click",()=>{
      const showFps=!Boolean(this.mapState?.snapshot?.().showFps);
      this.mapState?.patch?.({showFps},{source:"ui-fps"});
      this.render();
    });
    this.listen(this.query("#mapZoomIn"),"click",()=>this.act("zoomIn"));
    this.listen(this.query("#mapZoomOut"),"click",()=>this.act("zoomOut"));
    this.listen(this.query("#mapReset"),"click",()=>this.act("reset"));
    this.listen(this.query("#mapBaseToggle"),"click",()=>this.act("toggleBaseMap"));
    this.listen(this.query("#mapTopDown"),"click",()=>this.setPitch(0));
    this.listen(this.query("#mapTilt"),"click",()=>this.setPitch(Math.max(45,this.mapState?.snapshot?.().pitch||0)));
    this.listen(this.query("#mapRotateLeft"),"click",()=>this.rotate(-15));
    this.listen(this.query("#mapRotateRight"),"click",()=>this.rotate(15));
    this.listen(this.elements.compass,"click",()=>this.resetNorth());
    this.listen(this.elements.host,"pointermove",event=>{
      const point=this.invoke("unproject",[event.offsetX,event.offsetY]);
      if(point)this.updatePointerCoordinates(point.lng??point.longitude,point.lat??point.latitude);
    });
    this.listen(this.elements.host,"pointerleave",()=>this.updatePointerCoordinates(null,null));
    this.listen(this.root,"keydown",event=>{
      if(event.key==="Escape")this.toggleLayerPanel(false);
    });

    this.renderLayerPanel();
    if(this.mapState?.subscribe)this.subscriptions.push(this.mapState.subscribe(()=>this.render()));
    if(this.layerManager?.subscribe)this.subscriptions.push(this.layerManager.subscribe(()=>this.render()));
    this.fpsTimer=globalThis.setInterval?.(()=>this.updateFrameMetrics(),500)||null;
    this.render();
    return this;
  }

  destroy(){
    for(const remove of this.listeners.splice(0))remove();
    for(const unsubscribe of this.subscriptions.splice(0))unsubscribe();
    if(this.fpsTimer!==null)globalThis.clearInterval?.(this.fpsTimer);
    if(this.transitionTimer!==null)globalThis.clearTimeout?.(this.transitionTimer);
    this.fpsTimer=null;this.transitionTimer=null;this.bound=false;
    return this;
  }

  applyReducedMotion(reduced){
    this.performanceManager?.setReducedMotion?.(reduced);
    const documentRef=this.root?.nodeType===9?this.root:this.root?.ownerDocument;
    documentRef?.body?.classList.toggle("reduced-motion",Boolean(reduced));
    return Boolean(reduced);
  }

  selectMode(mode){
    const reduced=this.performanceManager?.reducedMotion??globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches??false;
    if(typeof this.actions?.setMapMode==="function")this.actions.setMapMode(mode,{duration:reduced?0:this.config.modes[mode]?.transitionMs});
    else{this.mapState?.setMode?.(mode,{reducedMotion:reduced});this.layerManager?.setMode?.(mode);this.invoke("setMapMode",mode)}
    const current=this.mapState?.snapshot?.()||{mode};
    const duration=current.transition?.durationMs||0;
    if(this.elements.host){
      this.elements.host.classList.toggle("map-transitioning",duration>0);
      this.elements.host.style.setProperty("--map-transition-ms",`${duration}ms`);
      if(this.transitionTimer!==null)globalThis.clearTimeout?.(this.transitionTimer);
      if(duration>0)this.transitionTimer=globalThis.setTimeout?.(()=>this.elements.host?.classList.remove("map-transitioning"),duration)||null;
    }
    this.render();
    return current;
  }

  setPitch(pitch){
    const value=clamp(pitch,0,70);
    this.mapState?.setCamera?.({pitch:value},{source:"ui-pitch",durationMs:520});
    if(typeof this.actions?.setPitch==="function")this.actions.setPitch(value,{durationMs:520});else this.invoke("setPitch",value,{durationMs:520});
  }

  rotate(delta){
    const current=this.mapState?.snapshot?.()||{};
    const bearing=(Number(current.bearing)||0)+delta;
    this.mapState?.setCamera?.({bearing},{source:"ui-bearing",durationMs:420});
    if(typeof this.actions?.rotateBy==="function")this.actions.rotateBy(delta,{durationMs:420});else this.invoke("rotateBy",delta,{durationMs:420});
  }

  resetNorth(){
    this.mapState?.setCamera?.({bearing:0},{source:"ui-compass",durationMs:480});
    if(typeof this.actions?.resetBearing==="function")this.actions.resetBearing();else this.invoke("resetNorth",{durationMs:480});
  }

  toggleLayerPanel(force){
    const panel=this.elements.layerPanel;if(!panel)return false;
    const open=typeof force==="boolean"?force:panel.hidden;
    panel.hidden=!open;
    this.elements.layersToggle?.setAttribute("aria-expanded",String(open));
    if(open)this.elements.layerPanelClose?.focus?.();
    return open;
  }

  renderLayerPanel(){
    const container=this.elements.layerContent,documentRef=container?.ownerDocument;
    if(!container||!documentRef||!this.layerManager)return;
    const fragment=documentRef.createDocumentFragment();
    for(const group of Object.values(this.config.groups)){
      const section=documentRef.createElement("section");
      section.className="map-layer-category";
      section.dataset.group=group.id;
      const header=documentRef.createElement("header");
      const title=documentRef.createElement("b");title.textContent=group.label;
      const count=documentRef.createElement("span");count.textContent=`${group.range[0].toString().padStart(2,"0")}–${group.range[1].toString().padStart(2,"0")}`;
      const groupToggle=documentRef.createElement("label");groupToggle.className="map-layer-group-toggle";
      const groupInput=documentRef.createElement("input");groupInput.type="checkbox";groupInput.dataset.layerGroup=group.id;
      const groupText=documentRef.createElement("small");groupText.textContent="TODAS";groupToggle.append(groupInput,groupText);
      const groupLayers=this.layerManager.getLayerDefinitions({group:group.id});
      const enabledCount=groupLayers.filter(layer=>this.layerManager.visible[layer.id]!==false).length;
      groupInput.checked=enabledCount===groupLayers.length;groupInput.indeterminate=enabledCount>0&&enabledCount<groupLayers.length;
      this.listen(groupInput,"change",()=>{
        this.layerManager.setGroupVisible(group.id,groupInput.checked);
        const visibleLayers={...(this.mapState?.snapshot?.().visibleLayers||{})};
        for(const layer of groupLayers)visibleLayers[layer.id]=groupInput.checked;
        this.mapState?.patch?.({visibleLayers},{source:"ui-layer-group"});
        if(typeof this.actions?.setGroupVisible==="function")this.actions.setGroupVisible(group.id,groupInput.checked);
        else for(const layer of groupLayers){if(typeof this.actions?.setLayerVisible==="function")this.actions.setLayerVisible(layer.id,groupInput.checked);else this.invoke("setLayerVisibility",layer.id,groupInput.checked)}
        this.render();
      });
      header.append(title,count,groupToggle);section.append(header);
      for(const layer of groupLayers){
        const label=documentRef.createElement("label");label.className="map-layer-option";
        const input=documentRef.createElement("input");input.type="checkbox";input.dataset.layerId=layer.id;input.checked=this.layerManager.visible[layer.id]!==false;
        const code=documentRef.createElement("code");code.textContent=layer.code;
        const text=documentRef.createElement("span");text.textContent=layer.label;
        const renderer=documentRef.createElement("small");renderer.textContent=layer.renderer.toUpperCase();
        label.append(input,code,text,renderer);section.append(label);
        this.listen(input,"change",()=>{
          this.layerManager.setVisible(layer.id,input.checked);
          this.mapState?.setLayerVisibility?.(layer.id,input.checked);
          if(typeof this.actions?.setLayerVisible==="function")this.actions.setLayerVisible(layer.id,input.checked);
          else this.invoke("setLayerVisibility",layer.id,input.checked);
          this.renderLegend();
        });
      }
      fragment.append(section);
    }
    container.replaceChildren(fragment);
  }

  render(){
    const state=this.mapState?.snapshot?.()||{};
    const mode=state.mode||"political";
    if(this.elements.host){
      this.elements.host.dataset.mapMode=mode;
      this.elements.host.dataset.mapQuality=state.quality||"auto";
      this.elements.host.dataset.mapLongitude=Number(state.longitude||0).toFixed(6);
      this.elements.host.dataset.mapLatitude=Number(state.latitude||0).toFixed(6);
      this.elements.host.dataset.mapZoom=Number(state.zoom||0).toFixed(3);
      this.elements.host.dataset.mapPitch=Number(state.pitch||0).toFixed(2);
      this.elements.host.dataset.mapBearing=Number(state.bearing||0).toFixed(2);
      this.elements.host.dataset.mapLod=String(state.lod??0);
      this.elements.host.dataset.selectedCountry=state.selectedCountryId||"";
      this.elements.host.dataset.selectedRegion=state.selectedRegionId||"";
      this.elements.host.dataset.selectedEntity=state.selectedEntityId||"";
    }
    for(const button of this.queryAll("[data-map-mode]")){
      const active=button.dataset.mapMode===mode;
      button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
    }
    for(const button of this.queryAll("[data-map-layer]"))button.classList.toggle("active",button.dataset.mapLayer===(state.activeLayer||this.layerManager?.activeLayer));
    if(this.elements.blend)this.elements.blend.value=String(Math.round(state.visualBlend??this.config.modes[mode].blend));
    if(this.elements.blendValue)this.elements.blendValue.textContent=`${Math.round(state.visualBlend??this.config.modes[mode].blend)}%`;
    if(this.elements.quality)this.elements.quality.value=state.quality||"auto";
    for(const input of this.queryAll("[data-layer-id]")){
      const layer=this.layerManager?.resolve?.(input.dataset.layerId);
      if(layer)input.checked=this.layerManager.visible[layer.id]!==false;
    }
    for(const input of this.queryAll("[data-layer-group]")){
      const groupLayers=this.layerManager?.getLayerDefinitions?.({group:input.dataset.layerGroup})||[];
      const enabled=groupLayers.filter(layer=>this.layerManager.visible[layer.id]!==false).length;
      input.checked=Boolean(groupLayers.length)&&enabled===groupLayers.length;input.indeterminate=enabled>0&&enabled<groupLayers.length;
    }
    const showFps=Boolean(state.showFps);
    if(this.elements.fpsToggle){this.elements.fpsToggle.classList.toggle("active",showFps);this.elements.fpsToggle.setAttribute("aria-pressed",String(showFps))}
    if(this.elements.fps)this.elements.fps.hidden=!showFps;
    if(this.elements.compass)this.elements.compass.style.setProperty("--map-bearing",`${-(Number(state.bearing)||0)}deg`);
    this.updateScale(state.latitude,state.zoom);
    this.updateLod(state.zoom);
    this.renderLegend();
    return state;
  }

  renderLegend(){
    const container=this.elements.legend,documentRef=container?.ownerDocument;
    if(!container||!documentRef||!this.layerManager)return;
    const visible=this.layerManager.getLayerDefinitions({visible:true}).filter(layer=>layer.group==="simulation").slice(0,6);
    const fragment=documentRef.createDocumentFragment();
    for(const layer of visible){
      const item=documentRef.createElement("span");item.dataset.layer=layer.slug;
      const swatch=documentRef.createElement("i");
      const label=documentRef.createElement("b");label.textContent=layer.label;
      item.append(swatch,label);fragment.append(item);
    }
    container.replaceChildren(fragment);
    container.hidden=!visible.length;
  }

  updatePointerCoordinates(longitude,latitude){
    const element=this.elements.coordinates;if(!element)return;
    if(!Number.isFinite(Number(longitude))||!Number.isFinite(Number(latitude))){element.textContent="—";return}
    element.textContent=`${formatCoordinate(latitude,"N","S")} · ${formatCoordinate(longitude,"E","O")}`;
  }

  updateScale(latitude=0,zoom=2){
    const element=this.elements.scale;if(!element)return;
    const metresPerPixel=156543.03392*Math.cos((Number(latitude)||0)*Math.PI/180)/2**(Number(zoom)||0);
    const target=Math.max(1,metresPerPixel*100);
    const magnitude=10**Math.floor(Math.log10(target));
    const normalized=target/magnitude;
    const rounded=(normalized>=5?5:normalized>=2?2:1)*magnitude;
    const label=rounded>=1000?`${Math.round(rounded/1000)} km`:`${Math.round(rounded)} m`;
    element.textContent=label;element.style.setProperty("--map-scale-width","100px");
  }

  updateLod(zoom=2){
    const element=this.elements.lod;if(!element||!this.lodManager)return;
    const profile=this.lodManager.profile(zoom,this.performanceManager?.requestedQuality||"auto");
    element.textContent=`LOD ${profile.level} · ${profile.label}`;
    element.dataset.lod=String(profile.level);
    this.layerManager?.setLod?.(profile.level);
  }

  updateFrameMetrics(){
    const metrics=this.performanceManager?.getMetrics?.();
    if(!metrics||!this.elements.fps)return metrics;
    this.elements.fps.textContent=`${metrics.fps.toFixed(0)} FPS · ${metrics.averageFrameMs.toFixed(1)} ms · ${metrics.effectiveQuality.toUpperCase()}`;
    this.elements.fps.dataset.status=metrics.fps>=metrics.targetFps*.9?"good":metrics.fps>=metrics.targetFps*.65?"warn":"critical";
    return metrics;
  }

  update(diagnostics={}){
    if(diagnostics?.fallback!==undefined&&this.elements.host)this.setFallback(Boolean(diagnostics.fallback),diagnostics.fallbackReason||"Modo de compatibilidad Canvas 2D activo");
    if(diagnostics?.camera){
      this.updateScale(diagnostics.camera.latitude,diagnostics.camera.zoom);
      if(this.elements.compass)this.elements.compass.style.setProperty("--map-bearing",`${-(Number(diagnostics.camera.bearing)||0)}deg`);
    }
    if(Number.isFinite(Number(diagnostics?.lod)))this.setLOD(Number(diagnostics.lod));
    this.updateFrameMetrics();
    return this.render();
  }

  setMode(mode){
    this.layerManager?.setMode?.(mode);
    if(this.elements.host)this.elements.host.dataset.mapMode=mode;
    return this.render();
  }

  setActiveLayer(layer){
    this.layerManager?.setActiveLayer?.(layer);
    return this.render();
  }

  setBlend(value){
    const numeric=Number(value)||0,visualBlend=clamp(Math.abs(numeric)<=1?numeric*100:numeric,0,100);
    this.mapState?.patch?.({visualBlend},{source:"engine-blend"});
    if(this.elements.blend)this.elements.blend.value=String(Math.round(visualBlend));
    if(this.elements.blendValue)this.elements.blendValue.textContent=`${Math.round(visualBlend)}%`;
    return visualBlend;
  }

  setQuality(quality){
    this.mapState?.patch?.({quality},{source:"engine-quality"});
    if(this.elements.quality)this.elements.quality.value=quality;
    return this.render();
  }

  setLOD(level){
    const lod=clamp(level,0,3);
    this.layerManager?.setLod?.(lod);
    if(this.elements.lod){
      const definition=this.config.lod[lod];
      this.elements.lod.textContent=`LOD ${lod} · ${definition?.label||lod}`;
      this.elements.lod.dataset.lod=String(lod);
    }
    return lod;
  }

  reportAssetFailure(detail={}){
    const id=detail?.id||detail?.assetId||"recurso cartográfico";
    const message=detail?.error?.message||detail?.message||"no se pudo cargar";
    const notice=this.elements.fallbackNotice;
    if(notice){notice.hidden=false;notice.textContent=`Recurso ${id}: ${message}`;notice.dataset.kind="asset-warning"}
    return{id,message};
  }

  showEntity(type,data={}){
    const tooltip=this.query("#mapTooltip");if(!tooltip)return null;
    const title=data.name||data.displayName||data.id||"Elemento estratégico";
    tooltip.textContent=`${title} · ${String(type||"entidad")}`;
    tooltip.dataset.entityType=String(type||"entity");
    return{type,title};
  }

  setFallback(active=true,message="Modo de compatibilidad Canvas 2D activo"){
    const enabled=Boolean(active),host=this.elements.host,notice=this.elements.fallbackNotice;
    host?.classList.toggle("canvas-fallback",enabled);host?.classList.toggle("webgl-ready",!enabled);
    this.elements.gl?.setAttribute("aria-hidden",String(enabled));
    this.elements.fallback?.setAttribute("aria-hidden",String(!enabled));
    if(notice){notice.hidden=!enabled;notice.textContent=message}
    return enabled;
  }
}

if(typeof globalThis!=="undefined"){
  const namespace=globalThis.NEXUS_MAP_V6 ||= {};
  namespace.MapUIControls=MapUIControls;
}
