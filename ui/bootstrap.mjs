import{PanelRegistry}from"./panels/registry.mjs";
import{renderArchitecturePanel}from"./panels/architecture.mjs";
import{renderMarketStrip}from"./panels/market-strip.mjs";

export async function bootLegacyUi(){
  const panels=new PanelRegistry();
  panels.register("architecture",state=>renderArchitecturePanel(state,window.NEXUS_V54));
  window.NEXUS_V54.ui={panels,renderMarketStrip:country=>renderMarketStrip(country,window.NEXUS_V54.world.marketDefinitions)};
  await import("../js/map.js?v=5.4.1-r1");
  await import("../js/v51/ui.js?v=5.4.1-r1");
  await import("../js/v52/ui.js?v=5.4.1-r1");
  await import("../js/ui.js?v=5.4.1-r1");
  await import("../js/app.js?v=5.4.1-r1");
}
