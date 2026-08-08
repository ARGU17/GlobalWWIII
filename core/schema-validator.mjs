const actual=v=>Array.isArray(v)?"array":v===null?"null":typeof v;
export class SchemaValidator{
  constructor(schema){this.schema=schema}
  validate(value,schema=this.schema,path="state",errors=[]){if(schema.type&&actual(value)!==schema.type){errors.push(`${path}: ${actual(value)} != ${schema.type}`);return errors}for(const key of schema.required||[])if(value?.[key]===undefined)errors.push(`${path}: falta ${key}`);for(const [key,child] of Object.entries(schema.properties||{}))if(value?.[key]!==undefined)this.validate(value[key],child,`${path}.${key}`,errors);if(schema.minItems&&Array.isArray(value)&&value.length<schema.minItems)errors.push(`${path}: mínimo ${schema.minItems}`);return errors}
  assert(value){const errors=this.validate(value);if(errors.length)throw new Error(`Esquema de estado inválido: ${errors.slice(0,5).join("; ")}`);return value}
}
