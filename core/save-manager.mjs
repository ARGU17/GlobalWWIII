import{stableHash}from"./rng.mjs";

const clone=value=>globalThis.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));
const FORMAT="nexus-global-save";

function numeric(value,fallback=null){const parsed=Number(value);return Number.isInteger(parsed)&&parsed>=0?parsed:fallback}
function migrationKey(entry){return`${entry.from}:${entry.to}`}
function appendMigration(list,entry){if(!Array.isArray(list))return;if(!list.some(item=>migrationKey(item)===migrationKey(entry)))list.push(entry)}

export class FutureSaveVersionError extends Error{
  constructor(found,supported){super(`El guardado usa el esquema ${found}, posterior al ${supported} compatible con esta versión`);this.name="FutureSaveVersionError";this.found=found;this.supported=supported}
}

export class SaveManager{
  constructor({version="6.0.0",schema=60,mapDataVersion="natural-earth-v6"}={}){this.version=version;this.schema=schema;this.mapDataVersion=mapDataVersion;this.migrations=[]}
  registerMigration(from,to,run){
    from=numeric(from);to=numeric(to);
    if(from==null||to==null||to<=from||typeof run!=="function")throw new Error("Migración inválida");
    if(this.migrations.some(step=>step.from===from))throw new Error(`Migración duplicada desde ${from}`);
    this.migrations.push({from,to,run});this.migrations.sort((a,b)=>a.from-b.from);return this
  }
  schemaOf(value){
    const state=value?.format===FORMAT?value.payload:value;
    const candidates=[value?.saveVersion,value?.schema,state?.saveVersion,state?.v60?.schema,state?.v54?.schema].map(item=>numeric(item)).filter(item=>item!=null);return candidates.length?Math.max(...candidates):52
  }
  assertSupported(value){const found=this.schemaOf(value);if(found>this.schema)throw new FutureSaveVersionError(found,this.schema);return found}
  migrate(state){
    if(!state||typeof state!=="object")throw new Error("El guardado no contiene un estado válido");
    let current=this.assertSupported(state),guard=0;
    state.migrationLog=Array.isArray(state.migrationLog)?state.migrationLog:[];
    while(current<this.schema&&guard++<32){
      const step=this.migrations.find(item=>item.from===current);
      if(!step)throw new Error(`Falta migración explícita desde el esquema ${current}`);
      step.run(state);
      const entry={from:step.from,to:step.to,date:String(state.date||""),day:Number(state.dayIndex)||0};
      appendMigration(state.migrationLog,entry);
      if(step.to<=54){state.v54||={schema:step.from,migrations:[],metrics:{},domains:{},audit:[]};appendMigration(state.v54.migrations,entry);state.v54.schema=step.to}
      if(step.to>=60&&state.v60)state.v60.schema=step.to;
      current=step.to
    }
    if(guard>=32||current!==this.schema)throw new Error(`No se pudo completar la migración al esquema ${this.schema}`);
    return state
  }
  checksum(payload){return stableHash(JSON.stringify(payload)).toString(16)}
  pack(state,{clone:copy=true}={}){
    const snapshot=this.migrate(copy?clone(state):state);
    snapshot.saveVersion=this.schema;snapshot.mapDataVersion||=this.mapDataVersion;
    return{format:FORMAT,version:this.version,schema:this.schema,saveVersion:this.schema,mapDataVersion:snapshot.mapDataVersion,checksum:this.checksum(snapshot),payload:snapshot}
  }
  unpack(value){
    if(!value||typeof value!=="object")throw new Error("El guardado está vacío o no es válido");
    this.assertSupported(value);
    if(value.format!==FORMAT)return this.migrate(clone(value));
    if(!value.payload||typeof value.payload!=="object")throw new Error("El contenedor de guardado no incluye datos");
    if(this.checksum(value.payload)!==value.checksum)throw new Error("El guardado no supera la comprobación de integridad");
    return this.migrate(clone(value.payload))
  }
}
