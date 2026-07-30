export const FREQUENCIES=Object.freeze({daily:1,weekly:7,monthly:30,quarterly:90,annual:365});
export const isDue=(frequency,day)=>frequency==="daily"||(Number(day)||0)%FREQUENCIES[frequency]===0;
export const duePhases=day=>Object.keys(FREQUENCIES).filter(f=>isDue(f,day));

export class SimulationClock{
  constructor(){this.lastDay=-1}
  phases(state){const day=Number(state.dayIndex)||0;if(day===this.lastDay)return[];this.lastDay=day;return duePhases(day)}
  reset(){this.lastDay=-1}
}
