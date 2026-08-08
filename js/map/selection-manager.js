"use strict";

const escapeHTML=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);

export class SelectionManager{
  constructor({mapState,callbacks={},tooltip=null}={}){
    this.state=mapState;this.callbacks=callbacks;this.tooltip=tooltip;this.map=null;this.bound=[];this.lastFeature=null;
    this.layerPriority=["57-path-preview","56-alerts","55-targets","54-range","53-orders","40-battles","39-war-fronts","37-naval-units","36-air-units","35-land-units","33-infrastructure-ports","33-infrastructure-airports","33-infrastructure","32-power-plants","31-industries","21-regions-fill","20-countries-fill"];
  }

  attach(map){
    this.detach();this.map=map;
    const move=event=>this.handlePointerMove(event);
    const leave=()=>this.clearHover();
    const click=event=>this.handleClick(event);
    map.on("mousemove",move);map.on("mouseleave",leave);map.on("click",click);
    this.bound=[["mousemove",move],["mouseleave",leave],["click",click]];
  }

  detach(){if(this.map)for(const[type,handler]of this.bound)this.map.off(type,handler);this.bound=[];this.map=null;this.hideTooltip()}

  setCallbacks(callbacks){this.callbacks=callbacks||{}}

  pick(point){
    if(!this.map)return null;
    const present=this.layerPriority.filter(id=>this.map.getLayer(id));
    const features=this.map.queryRenderedFeatures(point,present.length?{layers:present}:undefined);
    return features[0]||null;
  }

  handlePointerMove(event){
    const feature=this.pick(event.point);
    const id=feature?.properties?.entityId||feature?.properties?.regionId||feature?.properties?.countryId||feature?.id||null;
    if(id!==this.state.hoveredFeatureId)this.state.patch({hoveredFeatureId:id});
    if(this.map?.getCanvas())this.map.getCanvas().style.cursor=feature?"pointer":"grab";
    this.setHoverFeature(feature);if(feature)this.showFeatureTooltip(feature,event.originalEvent);else this.hideTooltip();
  }

  setHoverFeature(feature){
    const next=feature&&feature.source&&feature.id!=null?{source:feature.source,id:feature.id}:null;
    if(this.lastFeature&&(!next||this.lastFeature.source!==next.source||this.lastFeature.id!==next.id))try{this.map?.setFeatureState?.(this.lastFeature,{hover:false})}catch(_){}
    if(next&&(!this.lastFeature||this.lastFeature.source!==next.source||this.lastFeature.id!==next.id))try{this.map?.setFeatureState?.(next,{hover:true})}catch(_){}
    this.lastFeature=next;
  }

  handleClick(event){const feature=this.pick(event.point);if(feature)this.selectFeature(feature)}

  selectFeature(feature){
    const properties=feature?.properties||{};
    if(properties.entityType&&properties.entityId){this.callbacks.selectEntity?.(properties.entityType,properties.entityId,properties);return properties.entityId}
    if(properties.regionId){this.selectRegion(properties.countryId||properties.ownerId,properties.regionId);return properties.regionId}
    if(properties.countryId){this.selectCountry(properties.countryId);return properties.countryId}
    return null;
  }

  selectCountry(countryId){
    if(!countryId)return false;
    this.state.patch({selectedCountryId:countryId,selectedRegionId:null});
    this.state.syncToGameState?.();this.callbacks.selectCountry?.(countryId);return true;
  }

  selectRegion(countryId,regionId){
    if(!regionId)return false;
    this.state.patch({selectedCountryId:countryId||this.state.selectedCountryId,selectedRegionId:regionId});
    this.state.syncToGameState?.();this.callbacks.selectRegion?.(countryId||this.state.selectedCountryId,regionId);return true;
  }

  clearHover(){this.setHoverFeature(null);this.state.patch({hoveredFeatureId:null});if(this.map?.getCanvas())this.map.getCanvas().style.cursor="grab";this.hideTooltip()}

  showFeatureTooltip(feature,event){
    if(!this.tooltip)return;
    const p=feature.properties||{},title=p.name||p.displayName||p.countryName||p.regionName||"Elemento estratégico";
    const lines=[];
    if(p.ownerName)lines.push(`Propietario: ${p.ownerName}`);
    if(p.controllerName&&p.controllerName!==p.ownerName)lines.push(`Control: ${p.controllerName}`);
    if(p.level)lines.push(`Nivel ${p.level}`);
    if(Number.isFinite(Number(p.quantity)))lines.push(`Cantidad: ${Number(p.quantity).toLocaleString("es-ES")}`);
    if(p.status)lines.push(String(p.status));
    this.tooltip.innerHTML=`<strong>${escapeHTML(title)}</strong>${lines.map(line=>`<span>${escapeHTML(line)}</span>`).join("")}`;
    const rect=this.tooltip.parentElement?.getBoundingClientRect();
    const x=(event?.clientX??0)-(rect?.left??0)+14,y=(event?.clientY??0)-(rect?.top??0)+14;
    this.tooltip.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;this.tooltip.classList.add("visible");
  }

  hideTooltip(){this.tooltip?.classList.remove("visible")}
}

globalThis.NEXUS_SelectionManager=SelectionManager;
