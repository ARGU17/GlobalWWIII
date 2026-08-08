const clone=value=>globalThis.structuredClone?structuredClone(value):JSON.parse(JSON.stringify(value));
const COMPRESSED_PREFIX="nexus-gzip-v1:";

function bytesToBase64(bytes){let binary="";for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));return globalThis.btoa(binary)}
function base64ToBytes(value){const binary=globalThis.atob(value),bytes=new Uint8Array(binary.length);for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);return bytes}
async function compressText(value){if(!globalThis.CompressionStream||!globalThis.btoa)return null;const input=new TextEncoder().encode(value),stream=new Blob([input]).stream().pipeThrough(new CompressionStream("gzip")),bytes=new Uint8Array(await new Response(stream).arrayBuffer());return`${COMPRESSED_PREFIX}${bytesToBase64(bytes)}`}
async function decompressText(value){if(!value.startsWith(COMPRESSED_PREFIX))return value;if(!globalThis.DecompressionStream||!globalThis.atob)throw new Error("La copia está comprimida y este navegador no puede descomprimirla");const bytes=base64ToBytes(value.slice(COMPRESSED_PREFIX.length)),stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));return new Response(stream).text()}

function requestResult(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error("IndexedDB no respondió"))})}
function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onabort=()=>reject(transaction.error||new Error("Transacción IndexedDB cancelada"));transaction.onerror=()=>reject(transaction.error||new Error("Transacción IndexedDB fallida"))})}

export class IndexedSaveStore{
  constructor({indexedDB=globalThis.indexedDB,fallbackStorage=globalThis.localStorage,dbName="nexus-global-v6",storeName="campaign-saves",namespace="nexus:v6:recovery:"}={}){
    this.indexedDB=indexedDB;this.fallbackStorage=fallbackStorage;this.dbName=dbName;this.storeName=storeName;this.namespace=namespace;this.database=null;this.opening=null;this.memory=new Map();this.status={mode:indexedDB?"indexeddb":"fallback",healthy:Boolean(indexedDB),lastError:null,recovered:false}
  }
  fallbackKey(key){return`${this.namespace}${key}`}
  async open(){
    if(this.database)return this.database;if(this.opening)return this.opening;if(!this.indexedDB)throw new Error("IndexedDB no está disponible");
    this.opening=new Promise((resolve,reject)=>{let request;try{request=this.indexedDB.open(this.dbName,1)}catch(error){reject(error);return}request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(this.storeName))db.createObjectStore(this.storeName,{keyPath:"key"})};request.onsuccess=()=>{this.database=request.result;this.database.onversionchange=()=>{this.database?.close();this.database=null};resolve(this.database)};request.onerror=()=>reject(request.error||new Error("No se pudo abrir IndexedDB"));request.onblocked=()=>reject(new Error("IndexedDB está bloqueado por otra pestaña"))}).finally(()=>{this.opening=null});
    return this.opening
  }
  async writeFallback(key,value){
    const serialized=JSON.stringify(value);this.memory.set(key,serialized);
    try{const persistent=serialized.length>131072?(await compressText(serialized)||serialized):serialized;this.fallbackStorage?.setItem(this.fallbackKey(key),persistent);return true}catch(error){this.status.lastError=error?.message||String(error);return false}
  }
  async readFallback(key){
    let serialized=null;try{serialized=this.fallbackStorage?.getItem(this.fallbackKey(key))||null}catch(error){this.status.lastError=error?.message||String(error)}
    serialized||=this.memory.get(key)||null;if(!serialized)return null;try{return JSON.parse(await decompressText(serialized))}catch(error){this.status.lastError=`Copia de recuperación dañada: ${error.message}`;return null}
  }
  removeFallback(key){this.memory.delete(key);try{this.fallbackStorage?.removeItem(this.fallbackKey(key))}catch(error){this.status.lastError=error?.message||String(error)}}
  async writeIndexed(record){const db=await this.open(),transaction=db.transaction(this.storeName,"readwrite"),done=transactionDone(transaction);transaction.objectStore(this.storeName).put(record);await done}
  async readIndexed(key){const db=await this.open(),transaction=db.transaction(this.storeName,"readonly"),done=transactionDone(transaction),record=await requestResult(transaction.objectStore(this.storeName).get(key));await done;return record||null}
  async save(key,value,{recoveryCopy=true,takeOwnership=false}={}){
    if(!key)throw new Error("La clave del guardado es obligatoria");const record={key,value:takeOwnership?value:clone(value),savedAt:new Date().toISOString()};if(recoveryCopy)await this.writeFallback(key,record);
    try{await this.writeIndexed(record);this.status={mode:"indexeddb",healthy:true,lastError:null,recovered:false};return{ok:true,mode:"indexeddb",key,savedAt:record.savedAt}}catch(error){this.status={mode:"fallback",healthy:false,lastError:error?.message||String(error),recovered:false};if(!recoveryCopy)await this.writeFallback(key,record);return{ok:true,mode:"fallback",key,savedAt:record.savedAt,warning:this.status.lastError}}
  }
  validateRecord(record,validate){if(!record)return null;if(typeof validate!=="function")return{derived:false,value:record.value};const value=validate(record.value);return{derived:value!==undefined,value:value===undefined?record.value:value}}
  valid(record,validate){return Boolean(this.validateRecord(record,validate))}
  async load(key,{validate=null,validatedValue=false}={}){
    if(!key)throw new Error("La clave del guardado es obligatoria");
    try{const record=await this.readIndexed(key),checked=this.validateRecord(record,validate);if(checked){this.status={mode:"indexeddb",healthy:true,lastError:null,recovered:false};return validatedValue&&checked.derived?checked.value:clone(record.value)}}catch(error){this.status={mode:"fallback",healthy:false,lastError:error?.message||String(error),recovered:false}}
    const recovery=await this.readFallback(key);if(!recovery)return null;let checked;try{checked=this.validateRecord(recovery,validate);if(!checked)return null}catch(error){this.status={mode:"fallback",healthy:false,lastError:`Copia de recuperación inválida: ${error?.message||String(error)}`,recovered:false};return null}this.status.mode="fallback";return validatedValue&&checked.derived?checked.value:clone(recovery.value)
  }
  async recover(key,{validate=null}={}){
    const recovery=await this.readFallback(key);if(!recovery)return{ok:false,reason:"missing-recovery-copy"};
    try{if(!this.valid(recovery,validate))return{ok:false,reason:"invalid-recovery-copy"}}catch(error){this.status.lastError=error?.message||String(error);return{ok:false,reason:"invalid-recovery-copy",error:this.status.lastError}}
    try{await this.writeIndexed(recovery);this.status={mode:"indexeddb",healthy:true,lastError:null,recovered:true};return{ok:true,mode:"indexeddb",value:clone(recovery.value)}}catch(error){this.status={mode:"fallback",healthy:false,lastError:error?.message||String(error),recovered:false};return{ok:true,mode:"fallback",value:clone(recovery.value),warning:this.status.lastError}}
  }
  async remove(key){let indexed=true;try{const db=await this.open(),transaction=db.transaction(this.storeName,"readwrite"),done=transactionDone(transaction);transaction.objectStore(this.storeName).delete(key);await done}catch(error){indexed=false;this.status.lastError=error?.message||String(error)}this.removeFallback(key);return{ok:true,indexed}}
  async list(){
    try{const db=await this.open(),transaction=db.transaction(this.storeName,"readonly"),done=transactionDone(transaction),records=await requestResult(transaction.objectStore(this.storeName).getAll());await done;return records.map(({key,savedAt})=>({key,savedAt,mode:"indexeddb"}))}catch(error){this.status.lastError=error?.message||String(error);const keys=new Set(this.memory.keys());try{for(let index=0;index<(this.fallbackStorage?.length||0);index++){const item=this.fallbackStorage.key(index);if(item?.startsWith(this.namespace))keys.add(item.slice(this.namespace.length))}}catch(_){}const rows=[];for(const key of keys){const row=await this.readFallback(key);rows.push({key,savedAt:row?.savedAt||null,mode:"fallback"})}return rows}
  }
  close(){this.database?.close();this.database=null}
}
