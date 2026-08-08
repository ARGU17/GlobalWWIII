"use strict";

import"./map/canvas-fallback.js";
import{MapEngine}from"./map/map-engine.js";

const engine=new MapEngine();

const api={
  initialize:(state,callbacks)=>engine.initialize(state,callbacks),
  render:force=>engine.render(Boolean(force)),
  setMapMode:(mode,options)=>engine.setMapMode(mode,options),
  setBlend:value=>engine.setBlend(value),
  setMapLayer:layer=>engine.setMapLayer(layer),
  setLayerVisible:(id,visible)=>engine.setLayerVisible(id,visible),
  setGroupVisible:(group,visible)=>engine.setGroupVisible(group,visible),
  setQuality:quality=>engine.setQuality(quality),
  focusCountry:countryId=>engine.focusCountry(countryId),
  focusRegion:(countryId,regionId)=>engine.focusRegion(countryId,regionId),
  selectCountry:countryId=>engine.selectCountry(countryId),
  selectRegion:(countryId,regionId)=>engine.selectRegion(countryId,regionId),
  setSelection:(countryId,regionId)=>engine.setSelection(countryId,regionId),
  showWorld:()=>engine.showWorld(),
  updateMapEntities:state=>engine.updateMapEntities(state),
  refreshPoliticalColors:()=>engine.refreshPoliticalColors(),
  refreshIndustryMarkers:()=>engine.refreshIndustryMarkers(),
  refreshMilitaryMarkers:()=>engine.refreshMilitaryMarkers(),
  refreshTradeRoutes:()=>engine.refreshTradeRoutes(),
  refreshWarFronts:()=>engine.refreshWarFronts(),
  getMapState:()=>engine.mapState?.snapshot?.()||null,
  getDiagnostics:()=>engine.getDiagnostics(),
  unproject:point=>engine.unproject(point),
  destroy:()=>engine.destroy(),
  instance:engine
};

window.NEXUS_MAP_ENGINE=Object.freeze(api);
