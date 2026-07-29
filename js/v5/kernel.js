"use strict";

/* NEXUS Global v5 · Núcleo determinista y registro modular.
   Los módulos no se encadenan entre sí: declaran dependencias, frecuencia y
   orden. El adaptador legacy ejecuta este pipeline una sola vez por día. */
window.NEXUS_V5 = (() => {
  const VERSION="5.0.0-alpha",SCHEMA=5,systems=[],migrations=[];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const round=(v,d=2)=>Number((Number(v)||0).toFixed(d));
  const copy=v=>JSON.parse(JSON.stringify(v));
  const stableHash=value=>{
    let h=2166136261>>>0;
    for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
    return h>>>0;
  };
  const randomFrom=seed=>{
    let x=(stableHash(seed)||0x9e3779b9)>>>0;
    return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  };
  const random=(state,scope="global")=>randomFrom(`${state.simulationSeed||"nexus-v5"}|${state.dayIndex||0}|${scope}`);
  const uuid=(state,scope="id")=>{
    const r=random(state,`${scope}|${state.v5?.sequence||0}`);state.v5.sequence=(state.v5.sequence||0)+1;
    return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const n=Math.floor(r()*16);return(c==="x"?n:(n&3|8)).toString(16)});
  };
  function registerSystem(def){
    if(!def?.id||typeof def.run!=="function")throw new Error("Sistema v5 inválido");
    if(systems.some(x=>x.id===def.id))throw new Error(`Sistema v5 duplicado: ${def.id}`);
    systems.push({...def,order:Number(def.order)||100,frequency:def.frequency||"daily"});systems.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  }
  function registerMigration(from,to,run){migrations.push({from,to,run});migrations.sort((a,b)=>a.from-b.from)}
  function migrate(state){
    state.v5||={schema:0,sequence:0,migrations:[],audit:[],errors:[]};
    let current=Number(state.v5.schema)||0,guard=0;
    while(current<SCHEMA&&guard++<20){
      const step=migrations.find(m=>m.from===current);if(!step)throw new Error(`Falta migración v5 desde esquema ${current}`);
      step.run(state);current=step.to;state.v5.schema=current;state.v5.migrations.push({from:step.from,to:step.to,date:state.date||"unknown"});
    }
    state.version=VERSION;return state;
  }
  const due=(system,state)=>system.frequency==="daily"||(system.frequency==="weekly"&&(state.dayIndex||0)%7===0)||(system.frequency==="monthly"&&(state.dayIndex||0)%30===0)||(system.frequency==="quarterly"&&(state.dayIndex||0)%90===0)||(system.frequency==="yearly"&&(state.dayIndex||0)%365===0);
  function runDay(state){
    const context={state,day:state.dayIndex||0,date:state.date,rng:scope=>random(state,scope),clamp,round,copy,uuid,metrics:{},events:[]};
    for(const system of systems){
      if(!due(system,state))continue;
      try{system.run(context);state.v5.audit.push({day:context.day,system:system.id,ok:true})}
      catch(error){state.v5.errors.push({day:context.day,system:system.id,message:error.message});state.v5.audit.push({day:context.day,system:system.id,ok:false})}
    }
    if(state.v5.audit.length>500)state.v5.audit.splice(0,state.v5.audit.length-500);
    if(state.v5.errors.length>100)state.v5.errors.splice(0,state.v5.errors.length-100);
    state.v5.lastMetrics=context.metrics;state.v5.lastRun={day:context.day,date:context.date,systems:systems.filter(s=>due(s,state)).map(s=>s.id)};
    return context;
  }
  function explain(state,countryId,metric){
    const c=state.countries.find(x=>x.id===countryId)||state.countries[0],f=c?.v5?.factors?.[metric]||[];
    return[...f].sort((a,b)=>Math.abs(b.impact)-Math.abs(a.impact)).slice(0,8);
  }
  return{VERSION,SCHEMA,systems,migrations,clamp,round,copy,stableHash,random,randomFrom,uuid,registerSystem,registerMigration,migrate,runDay,explain};
})();
