export class WorkerClient{
  constructor(url){this.pending=new Map();this.sequence=0;this.worker=url&&typeof Worker!=="undefined"?new Worker(url,{type:"module"}):null;if(this.worker)this.worker.onmessage=({data})=>{const p=this.pending.get(data.id);if(!p)return;this.pending.delete(data.id);data.error?p.reject(new Error(data.error)):p.resolve(data.result)}}
  run(task,payload){if(!this.worker)return Promise.resolve(this.fallback(task,payload));const id=++this.sequence;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.worker.postMessage({id,task,payload})})}
  fallback(task,payload){if(task==="aggregateRisks"){const values=payload.values||[];return{average:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),maximum:Math.max(0,...values)}}if(task==="compactHistory")return(payload||[]).filter((_,i,a)=>i%Math.max(1,Math.ceil(a.length/500))===0);throw new Error(`Tarea Worker desconocida: ${task}`)}
}
