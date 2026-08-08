import{SimulationClock}from"./clock.mjs";
import{TypedEventBus}from"./event-bus.mjs";
import{RngService}from"./rng.mjs";
import{SaveManager}from"./save-manager.mjs";
import{IndexedSaveStore}from"./indexed-save-store.mjs";
import{SchemaValidator}from"./schema-validator.mjs";
import{StateStore}from"./state-store.mjs";
import{WorkerClient}from"./worker-client.mjs";
import{SimulationScheduler}from"../simulation/scheduler.mjs";
import economy from"../simulation/economy/index.mjs";
import population from"../simulation/population/index.mjs";
import firms from"../simulation/firms/index.mjs";
import finance from"../simulation/finance/index.mjs";
import energy from"../simulation/energy/index.mjs";
import logistics from"../simulation/logistics/index.mjs";
import politics from"../simulation/politics/index.mjs";
import diplomacy from"../simulation/diplomacy/index.mjs";
import military from"../simulation/military/index.mjs";
import intelligence from"../simulation/intelligence/index.mjs";
import climate from"../simulation/climate/index.mjs";
import{quarterlySystem,annualSystem}from"../simulation/reporting/index.mjs";
import{StrategicPlanner}from"../ai/planner/index.mjs";
import{proposeDiplomacy}from"../ai/diplomacy-ai/index.mjs";
import{proposeEconomy}from"../ai/economy-ai/index.mjs";
import{proposeMilitary}from"../ai/military-ai/index.mjs";
import{countriesRepository}from"../world/countries/index.mjs";
import{regionsRepository}from"../world/regions/index.mjs";
import{citiesRepository}from"../world/cities/index.mjs";
import{infrastructureRepository}from"../world/infrastructure/index.mjs";
import{resourceCatalog,countryResources}from"../world/resources/index.mjs";

export const VERSION="6.0.0",SCHEMA=60,MAP_DATA_VERSION="natural-earth-v6";
const systems=[economy,population,firms,finance,energy,logistics,politics,diplomacy,military,intelligence,climate,quarterlySystem,annualSystem];

export function createArchitecture({engine,config,workerUrl=null}){
  if(!engine)throw new Error("v6.0 requiere un motor de compatibilidad");
  if(!Array.isArray(config.resources)||config.resources.length!==21||new Set(config.resources.map(item=>item.id)).size!==21)throw new Error("El catálogo v6.0 debe declarar exactamente 21 mercados diferenciados");
  const eventBus=new TypedEventBus(config.events),validator=new SchemaValidator(config.schema),store=new StateStore({owners:config.owners,validator}),rng=new RngService("nexus-global-v60"),clock=new SimulationClock(),saveManager=new SaveManager({version:VERSION,schema:SCHEMA,mapDataVersion:MAP_DATA_VERSION}),saveStore=new IndexedSaveStore(),worker=new WorkerClient(workerUrl),scheduler=new SimulationScheduler({store,eventBus,rng}),planner=new StrategicPlanner({eventBus});
  for(const system of systems)scheduler.register(system);
  for(const system of scheduler.manifest()){const external=config.manifest?.find(item=>`simulation.${item.id}`===system.id);if(!external||external.owner!==system.owner||external.frequency!==system.frequency)throw new Error(`Manifiesto v6.0 divergente: ${system.id}`)}
  saveManager.registerMigration(52,53,state=>{state.v54={schema:52,migrations:[],metrics:{},domains:{},audit:[],typedEvents:[],worker:{enabled:Boolean(worker.worker),lastJobDay:null},compatibility:{sourceVersion:state.version||"unknown",frozenBundle:true}}});
  saveManager.registerMigration(53,54,state=>{state.v54.schema=54;state.v54.owners={...config.owners};state.v54.systemManifest=scheduler.manifest();state.v54.architecture={core:true,headless:true,typedEvents:true,workers:true,externalData:true,explicitMigrations:true}});
  saveManager.registerMigration(54,60,state=>{const center=Array.isArray(state.mapCenter)?state.mapCenter:[20,5],mode=["political","hybrid","terrain"].includes(state.mapVisualMode)?state.mapVisualMode:"political",pitch=Number.isFinite(Number(state.mapPitch))?Number(state.mapPitch):mode==="terrain"?55:mode==="hybrid"?28:8,bearing=Number(state.mapBearing)||0;state.saveVersion=60;state.mapDataVersion=MAP_DATA_VERSION;state.mapVisualMode=mode;state.mapPitch=pitch;state.mapBearing=bearing;state.mapVisibleLayers={...(state.mapVisibleLayers||{})};state.v60={schema:60,version:VERSION,mapDataVersion:MAP_DATA_VERSION,audit:[],architecture:{singleGeographicState:true,immutableMapAdapter:true,indexedDbPrimary:true,versionedSaves:true,explicitMigrations:true},map:{mode,layer:String(state.mapLayer||"political"),scaleMode:["world","regions"].includes(state.mapMode)?state.mapMode:"world",camera:{longitude:Number(center[1])||5,latitude:Number(center[0])||20,zoom:Number(state.mapZoom)||1.35,pitch,bearing},selection:{countryId:state.selectedCountryId||null,regionId:state.selectedRegionId||null},quality:String(state.settings?.mapQuality||"auto"),coordinateReferenceSystem:"EPSG:4326",coordinateOrder:"longitude-latitude",entityCoordinatePolicy:"persistent-or-deterministic-v1"},mapCoordinates:{version:1,mapDataVersion:MAP_DATA_VERSION,entities:{}}}});
  const legacy={create:engine.createInitialState,hydrate:engine.hydrateState,tick:engine.tickDay};
  function migrate(state){const from=saveManager.schemaOf(state);saveManager.migrate(state);state.version=VERSION;state.saveVersion=SCHEMA;state.mapDataVersion||=MAP_DATA_VERSION;state.v54.version=VERSION;state.v60.version=VERSION;state.v60.mapDataVersion=state.mapDataVersion;state.v60.migrationLog=state.migrationLog;if(from<SCHEMA)eventBus.emit("state.migrated",{from,to:SCHEMA,day:Number(state.dayIndex)||0});validator.assert(state);return state}
  function attach(state){migrate(state);store.replace(state,{owner:"core.state-store"});return state}
  function createInitialState(){const state=attach(legacy.create());engine.pushEvent?.(state,"system","Strategic Command v6.0 · motor geográfico versionado","La simulación conserva sus 21 mercados y añade estado cartográfico, migración determinista y guardado resistente.");return state}
  function hydrateUnpackedState(state){return attach(legacy.hydrate(state))}
  function hydrateState(state){return hydrateUnpackedState(saveManager.unpack(state))}
  function tickDay(state){if(store.state!==state)attach(state);eventBus.emit("simulation.day.before",{day:Number(state.dayIndex)||0,date:String(state.date)});const summary=store.transact("compat.v52",["legacy"],()=>legacy.tick(state),{type:"compat.tick"});const executed=scheduler.runDue(state);store.transact("core.migration",["version","saveVersion","mapDataVersion","v54.version","v60.version","v60.mapDataVersion"],()=>{state.version=VERSION;state.saveVersion=SCHEMA;state.mapDataVersion=MAP_DATA_VERSION;state.v54.version=VERSION;state.v60.version=VERSION;state.v60.mapDataVersion=MAP_DATA_VERSION},{type:"core.version"});store.transact("core.clock",["v54.lastRun","v60.lastRun"],()=>{const lastRun={day:state.dayIndex,date:state.date,systems:executed};state.v54.lastRun=lastRun;state.v60.lastRun={...lastRun}},{type:"core.clock"});eventBus.emit("simulation.day.completed",{day:Number(state.dayIndex)||0,date:String(state.date),systems:executed});store.transact("core.event-bus",["v54.typedEvents"],()=>{state.v54.typedEvents=eventBus.history.slice(-500)},{type:"core.events.snapshot"});store.transact("core.audit",["v54.audit","v60.audit"],()=>{state.v54.audit=store.audit.slice(-1000);state.v60.audit=store.audit.slice(-1000)},{type:"core.audit.snapshot"});if(state.dayIndex%30===0){const requestedDay=state.dayIndex,values=(state.countries||[]).map(c=>c.v5?.economy?.banking?.stress||0);worker.run("aggregateRisks",{values}).then(result=>{if(store.state!==state)return;store.transact("core.worker",["v54.worker"],()=>{state.v54.worker.lastJobDay=requestedDay;state.v54.worker.lastRiskAggregation=result},{type:"worker.aggregate-risks"})}).catch(error=>{if(store.state!==state)return;store.transact("core.worker",["v54.worker"],()=>{state.v54.worker.lastError=error.message},{type:"worker.aggregate-risks.failed"})})}return{...(summary||{}),v54:{systems:executed,metrics:state.v54.metrics},v60:{systems:executed,mapDataVersion:state.mapDataVersion}}}
  function pack(state,options){const save=saveManager.pack(state,options);eventBus.emit("save.created",{version:VERSION,day:Number(state.dayIndex)||0});return save}
  async function persist(key,state){const snapshot=pack(state);return saveStore.save(key,snapshot,{takeOwnership:true})}
  async function restore(key){const value=await saveStore.load(key,{validate:candidate=>saveManager.unpack(candidate),validatedValue:true});return value?hydrateUnpackedState(value):null}
  async function recover(key){let unpacked=null;const result=await saveStore.recover(key,{validate:candidate=>{unpacked=saveManager.unpack(candidate)}});if(result.ok&&result.value){eventBus.emit("save.recovered",{key:String(key),mode:String(result.mode)});return{...result,state:hydrateUnpackedState(unpacked||saveManager.unpack(result.value))}}return result}
  function runHeadless(state,days=1){const active=state?hydrateState(state):createInitialState();for(let i=0;i<days;i++)tickDay(active);return active}
  function planCountry(state,countryId){const country=state.countries.find(x=>x.id===countryId);if(!country)return null;return{strategy:planner.plan(state,country),diplomacy:proposeDiplomacy(state,country),economy:proposeEconomy(country),military:proposeMilitary(state,country)}}
  const world={countries:countriesRepository,regions:regionsRepository,cities:citiesRepository,infrastructure:infrastructureRepository,resourceCatalog,countryResources,marketDefinitions:config.resources.map(item=>Object.freeze({...item}))};
  return{VERSION,SCHEMA,MAP_DATA_VERSION,eventBus,store,rng,clock,saveManager,saveStore,worker,scheduler,world,ai:{planner,planCountry},legacy,migrate,attach,createInitialState,hydrateState,tickDay,pack,persist,restore,recover,runHeadless};
}

async function loadConfig(base){const read=async name=>{const response=await fetch(new URL(`data/v60/${name}`,base));if(!response.ok)throw new Error(`No se pudo cargar ${name}`);return response.json()};const[owners,events,schema,manifest,resources]=await Promise.all([read("ownership.json"),read("event-types.json"),read("state.schema.json"),read("systems.json"),read("market-resources.json")]);return{owners,events,schema,manifest,resources}}

if(typeof window!=="undefined"&&typeof document!=="undefined"){
  try{
    const base=new URL("../",import.meta.url),config=await loadConfig(base),architecture=createArchitecture({engine:window.NEXUS_ECONOMY,config,workerUrl:new URL("workers/simulation-worker.mjs",base)});
    Object.assign(window.NEXUS_ECONOMY,{createInitialState:architecture.createInitialState,hydrateState:architecture.hydrateState,tickDay:architecture.tickDay,version54:true,version60:true});
    window.NEXUS_V54=architecture;window.NEXUS_V60=architecture;
    const{bootLegacyUi}=await import("../ui/bootstrap.mjs?v=6.0.0-r4");await bootLegacyUi();
  }catch(error){
    console.error("NEXUS v6.0 boot error",error);document.getElementById("bootLoader")?.remove();document.getElementById("startOverlay")?.setAttribute("hidden","");const panel=document.getElementById("bootError"),text=document.getElementById("bootErrorText");if(panel)panel.hidden=false;if(text)text.textContent=error?.stack||error?.message||String(error);
  }
}
