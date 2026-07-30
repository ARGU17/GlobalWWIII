import{stableHash}from"./rng.mjs";
const clone=value=>globalThis.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));
export class SaveManager{
  constructor({version="5.4.1",schema=54}={}){this.version=version;this.schema=schema;this.migrations=[]}
  registerMigration(from,to,run){if(this.migrations.some(x=>x.from===from))throw new Error(`Migración duplicada desde ${from}`);this.migrations.push({from,to,run});this.migrations.sort((a,b)=>a.from-b.from)}
  migrate(state){state.v54||={schema:52,migrations:[]};let current=Number(state.v54.schema)||52,guard=0;while(current<this.schema&&guard++<20){const step=this.migrations.find(x=>x.from===current);if(!step)throw new Error(`Falta migración explícita v5.4 desde ${current}`);step.run(state);state.v54.migrations.push({from:step.from,to:step.to,date:state.date});current=step.to;state.v54.schema=current}return state}
  pack(state){const snapshot=clone(state),payload=JSON.stringify(snapshot),checksum=stableHash(payload).toString(16);return{format:"nexus-global-save",version:this.version,schema:this.schema,checksum,payload:snapshot}}
  unpack(value){if(value?.format!=="nexus-global-save")return this.migrate(value);const payload=JSON.stringify(value.payload),checksum=stableHash(payload).toString(16);if(checksum!==value.checksum)throw new Error("El guardado no supera la comprobación de integridad");return this.migrate(value.payload)}
}
