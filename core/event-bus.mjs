const typeOf=value=>Array.isArray(value)?"array":value===null?"null":typeof value;

export class TypedEventBus{
  constructor(definitions={}){this.definitions=new Map(Object.entries(definitions));this.listeners=new Map();this.history=[]}
  define(type,schema={}){if(this.definitions.has(type))throw new Error(`Evento duplicado: ${type}`);this.definitions.set(type,schema)}
  on(type,listener){if(!this.definitions.has(type))throw new Error(`Evento no declarado: ${type}`);const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);return()=>this.listeners.set(type,list.filter(x=>x!==listener))}
  validate(type,payload){const schema=this.definitions.get(type);if(!schema)throw new Error(`Evento no tipado: ${type}`);for(const [key,expected] of Object.entries(schema.required||{})){if(!(key in payload))throw new Error(`${type}: falta ${key}`);if(expected!=="any"&&typeOf(payload[key])!==expected)throw new Error(`${type}.${key}: se esperaba ${expected}`)}return true}
  emit(type,payload={}){this.validate(type,payload);const event=Object.freeze({type,payload:Object.freeze({...payload}),sequence:this.history.length+1});this.history.push(event);if(this.history.length>1000)this.history.shift();for(const listener of this.listeners.get(type)||[])listener(event);for(const listener of this.listeners.get("*")||[])listener(event);return event}
}
