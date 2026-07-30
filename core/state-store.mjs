const clone=value=>globalThis.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));

export class StateStore{
  constructor({owners={},validator=null}={}){this.state=null;this.owners=new Map(Object.entries(owners));this.validator=validator;this.audit=[];this.sequence=0;this.locked=false;this.validateOwners()}
  validateOwners(){const paths=[...this.owners.keys()];if(new Set(paths).size!==paths.length)throw new Error("Hay rutas de estado con más de un propietario");for(const [path,owner] of this.owners)if(!path||!owner)throw new Error("Propietario de estado inválido")}
  ownerOf(path){let best=null;for(const [candidate,owner] of this.owners)if(path===candidate||path.startsWith(`${candidate}.`))if(!best||candidate.length>best.path.length)best={path:candidate,owner};return best?.owner||null}
  replace(state,meta={}){if(!state||typeof state!=="object")throw new Error("Estado inválido");this.validator?.assert(state);this.state=state;this.record("store.replace",meta.owner||"core.state-store",["root"],true);return state}
  get(){if(!this.state)throw new Error("El store todavía no tiene estado");return this.state}
  transact(owner,paths,mutation,meta={}){if(this.locked)throw new Error("Transacción de estado reentrante");for(const path of paths){const declared=this.ownerOf(path);if(declared&&declared!==owner)throw new Error(`${owner} no es propietario de ${path}; pertenece a ${declared}`)}this.locked=true;try{const result=mutation(this.get());this.validator?.assert(this.state);this.record(meta.type||"state.transaction",owner,paths,true);return result}catch(error){this.record(meta.type||"state.transaction",owner,paths,false,error.message);throw error}finally{this.locked=false}}
  snapshot(){return clone(this.get())}
  record(type,owner,paths,ok,error=null){this.audit.push({sequence:++this.sequence,type,owner,paths:[...paths],ok,error,day:this.state?.dayIndex||0,date:this.state?.date||null});if(this.audit.length>2000)this.audit.shift()}
}
