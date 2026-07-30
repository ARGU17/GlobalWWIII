import{isDue}from"../core/clock.mjs";
export class SimulationScheduler{
  constructor({store,eventBus,rng}){this.store=store;this.eventBus=eventBus;this.rng=rng;this.systems=[]}
  register(system){if(!system?.id||!system?.owner||!system?.frequency||typeof system.run!=="function")throw new Error("Sistema v5.4 incompleto");if(this.systems.some(x=>x.id===system.id))throw new Error(`Sistema duplicado: ${system.id}`);this.systems.push({...system,order:Number(system.order)||100});this.systems.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));return system}
  runDue(state){const executed=[];for(const system of this.systems){if(!isDue(system.frequency,state.dayIndex))continue;this.store.transact(system.owner,system.writes,()=>system.run({state,eventBus:this.eventBus,rng:scope=>this.rng.for(state,`${system.id}:${scope}`)}),{type:`system.${system.id}`});executed.push(system.id)}return executed}
  manifest(){return this.systems.map(({id,owner,frequency,order,writes,reads})=>({id,owner,frequency,order,writes,reads}))}
}
