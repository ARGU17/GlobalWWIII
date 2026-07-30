export class StrategicPlanner{
  constructor({eventBus}){this.eventBus=eventBus}
  plan(state,country){const risks={security:100-(country.systems.stability||0),economy:Math.max(0,-country.economy.growth*10)+(country.economy.unemployment||0),energy:country.v5?.infrastructure?.energy?.blackoutRisk||0,military:(state.wars||[]).some(w=>!w.ended&&(w.attacker===country.id||w.defender===country.id))?90:10};const priority=Object.entries(risks).sort((a,b)=>b[1]-a[1])[0];const plan={countryId:country.id,priority:priority[0],score:priority[1],day:state.dayIndex};this.eventBus.emit("ai.plan.created",{countryId:country.id,priority:plan.priority,day:state.dayIndex});return plan}
}
