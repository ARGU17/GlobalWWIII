"use strict";

export class FallbackRenderer{
  constructor({host,canvas,notice}={}){this.host=host;this.canvas=canvas;this.notice=notice;this.engine=null;this.state=null;this.callbacks={};this.active=false}

  initialize(state,callbacks={},reason="Modo vectorial local activado"){
    this.state=state;this.callbacks=callbacks;this.engine=globalThis.NEXUS_CANVAS_MAP_ENGINE;
    if(!this.engine)throw new Error("El renderer Canvas de recuperación no está disponible");
    this.host?.classList.add("map-fallback-active","canvas-fallback");this.host?.classList.remove("webgl-ready");if(this.canvas){this.canvas.hidden=false;this.canvas.setAttribute("aria-hidden","false")}
    if(this.notice){this.notice.hidden=false;this.notice.textContent=reason}
    this.engine.initialize(state,callbacks);this.active=true;return this;
  }

  deactivate(){this.active=false;this.host?.classList.remove("map-fallback-active","canvas-fallback");if(this.canvas){this.canvas.hidden=true;this.canvas.setAttribute("aria-hidden","true")}if(this.notice)this.notice.hidden=true}
  render(){this.engine?.render?.()}
  setMapMode(mode){if(this.host)this.host.dataset.mapMode=mode;this.render()}
  setMapLayer(layer){if(this.state)this.state.mapLayer=layer;this.render()}
  focusCountry(countryId){return this.engine?.focusCountry?.(countryId)}
  focusRegion(countryId,regionId){return this.engine?.focusRegion?.(countryId,regionId)}
  showWorld(){return this.engine?.showWorld?.()}
  updateMapEntities(state){this.state=state;this.render()}
}

globalThis.NEXUS_FallbackRenderer=FallbackRenderer;
