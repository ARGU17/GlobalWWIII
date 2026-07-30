export const stableHash=value=>{let h=2166136261>>>0;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

export function createRng(seed){let x=(stableHash(seed)||0x9e3779b9)>>>0;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}

export class RngService{
  constructor(seed="nexus-global-v54"){this.seed=seed}
  for(state,scope="global"){return createRng(`${state?.simulationSeed||this.seed}|${state?.dayIndex||0}|${scope}`)}
  integer(state,scope,min,max){return Math.floor(this.for(state,scope)()*(max-min+1))+min}
  pick(state,scope,items){return items[this.integer(state,scope,0,Math.max(0,items.length-1))]}
}
