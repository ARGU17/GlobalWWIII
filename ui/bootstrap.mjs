import{PanelRegistry}from"./panels/registry.mjs";
import{renderArchitecturePanel}from"./panels/architecture.mjs";

export async function bootLegacyUi(){
  const panels=new PanelRegistry();
  panels.register("architecture",state=>renderArchitecturePanel(state,window.NEXUS_V54));
  window.NEXUS_V54.ui={panels};
  await import("../js/map.js");
  await import("../js/v51/ui.js");
  await import("../js/v52/ui.js");
  await import("../js/ui.js");
  await import("../js/app.js");
}
