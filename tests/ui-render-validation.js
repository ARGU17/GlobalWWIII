"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.resolve(__dirname,"..");
global.window=global;
if(!global.performance)global.performance={now:()=>Date.now()};

class FakeClassList{add(){} remove(){} toggle(){} contains(){return false}}
class FakeElement{
  constructor(id=""){this.id=id;this.innerHTML="";this.textContent="";this.value="";this.checked=false;this.hidden=false;this.dataset={};this.style={};this.classList=new FakeClassList();this.parentElement=this;this.tagName="DIV";}
  addEventListener(){} removeEventListener(){} querySelector(){return new FakeElement()} querySelectorAll(){return[]} closest(){return null} setAttribute(){} removeAttribute(){} appendChild(){} remove(){}
}
const elements=new Map();
const get=id=>{if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id)};
global.document={
  body:new FakeElement("body"),
  getElementById:get,
  querySelectorAll:()=>[],
  addEventListener:()=>{},
  createElement:()=>new FakeElement(),
};
global.setInterval=()=>1;global.clearInterval=()=>{};global.confirm=()=>true;
global.NEXUS_MAP_ENGINE={render(){}};

for(const file of ["world-data.js","data.js","catalog.js","politics.js","economy.js","simulation-plus.js","deep-systems.js","alpha-v13.js","alpha-v14.js","alpha-v15.js","alpha-v16.js","alpha-v17.js","alpha-v18.js","ui.js"]){
  vm.runInThisContext(fs.readFileSync(path.join(root,"js",file),"utf8"),{filename:file});
}
const state=NEXUS_ECONOMY.createInitialState();
NEXUS_ECONOMY.enqueueDecision(state,{title:"Decisión de validación",text:"Selecciona una respuesta.",category:"cabinet",options:[{id:"infrastructure",label:"Infraestructura",description:"Prueba"},{id:"social",label:"Servicios",description:"Prueba"}]});
const actions={setPanel:p=>state.activePanel=p};
NEXUS_UI.initialize(state,actions);
const panels=["overview","economy","regions","industry","stock","politics","technology","military","diplomacy","intelligence","objectives","events","settings"];
const rendered={};
for(const panel of panels){state.activePanel=panel;NEXUS_UI.renderAll();const html=get("mainPanel").innerHTML;if(!html||html.length<40)throw new Error(`Panel ${panel} vacío`);rendered[panel]=html.length;}
if(!get("mainPanel").innerHTML.includes("Configuración"))throw new Error("El último panel no se renderizó");
state.activePanel="overview";NEXUS_UI.renderAll();if(!get("mainPanel").innerHTML.includes("Centro de decisiones")||!get("mainPanel").innerHTML.includes("Decisión de validación"))throw new Error("El Resumen no muestra decisiones accionables");
state.activePanel="politics";NEXUS_UI.renderAll();const politics=get("mainPanel").innerHTML;
if(!politics.includes("PODER DE LA COALICIÓN")||!politics.includes("50% · MAYORÍA")||!politics.includes("Mesa de coalición"))throw new Error("Gráfico o mesa de coalición ausente");
state.activePanel="stock";NEXUS_UI.renderAll();if(!get("mainPanel").innerHTML.includes("176")||!get("mainPanel").innerHTML.includes("Mis participaciones"))throw new Error("Bolsa ampliada o cartera propia no visible");

state.activePanel="economy";NEXUS_UI.renderAll();if(!get("mainPanel").innerHTML.includes("Gestión de deuda")||!get("mainPanel").innerHTML.includes("I+D prevista"))throw new Error("Economía v1.8 incompleta");
state.activePanel="settings";NEXUS_UI.renderAll();if(!get("mainPanel").innerHTML.includes("x16")||!get("mainPanel").innerHTML.includes("x32"))throw new Error("Velocidades rápidas ausentes");
state.activePanel="technology";NEXUS_UI.renderAll();if(!get("mainPanel").innerHTML.includes("Desbloquea / potencia"))throw new Error("La tecnología no explica qué industria habilita");

state.activePanel="diplomacy";NEXUS_UI.renderAll();const diplomacy=get("mainPanel").innerHTML;if(!diplomacy.includes("Afganistán")||!diplomacy.includes("Zimbabue"))throw new Error("El directorio diplomático no contiene todos los países");
const esp=NEXUS_ECONOMY.getCountry(state,"ESP"),and=NEXUS_ECONOMY.getCountry(state,"AND");esp.relations.AND=0;and.relations.ESP=0;const declaration=NEXUS_ECONOMY.warAction(state,"AND","declare");if(!declaration.ok||!declaration.warId)throw new Error("No se generó guerra para validar la ventana");
NEXUS_UI.openWarModal(declaration.warId);if(!get("modalContent").innerHTML.includes("Teatros de operaciones")||!get("modalContent").innerHTML.includes("Operaciones activas"))throw new Error("Sala de guerra incompleta");
console.log(JSON.stringify({ok:true,version:state.version,panels:rendered,politicsChart:true,stockCompanies:state.companies.length,warRoom:true,diplomacyAllCountries:true},null,2));
