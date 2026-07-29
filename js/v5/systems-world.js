"use strict";

(() => {
  const V=window.NEXUS_V5,{clamp,round}=V;
  const countries=state=>state.countries.filter(c=>c.sovereign!==false);
  const relation=(a,b)=>Number(a.relations?.[b.id]??50);

  function ensureOrganizations(state){if(state.organizations?.length)return;const ids=state.countries.map(c=>c.id),members=filter=>state.countries.filter(filter).map(c=>c.id);state.organizations=[
    {id:"UN",name:"Naciones Unidas",type:"security",members:ids,authority:65,budget:58,agenda:[],resolutions:[]},
    {id:"WTO",name:"Organización Mundial del Comercio",type:"trade",members:ids.filter(id=>!['PRK'].includes(id)),authority:52,budget:42,agenda:[],resolutions:[]},
    {id:"WHO",name:"Organización Mundial de la Salud",type:"health",members:ids,authority:55,budget:48,agenda:[],resolutions:[]},
    {id:"IMF",name:"Fondo Monetario Internacional",type:"finance",members:ids.filter(id=>id!=="PRK"),authority:61,budget:72,agenda:[],resolutions:[]},
    {id:"EU",name:"Unión Europea",type:"integration",members:["AUT","BEL","BGR","HRV","CYP","CZE","DNK","EST","FIN","FRA","DEU","GRC","HUN","IRL","ITA","LVA","LTU","LUX","MLT","NLD","POL","PRT","ROU","SVK","SVN","ESP","SWE"].filter(id=>ids.includes(id)),authority:82,budget:76,agenda:[],resolutions:[]},
    {id:"NATO",name:"OTAN",type:"defense",members:["ALB","BEL","BGR","CAN","HRV","CZE","DNK","EST","FIN","FRA","DEU","GRC","HUN","ISL","ITA","LVA","LTU","LUX","MNE","NLD","MKD","NOR","POL","PRT","ROU","SVK","SVN","ESP","SWE","TUR","GBR","USA"].filter(id=>ids.includes(id)),authority:78,budget:88,agenda:[],resolutions:[]},
    {id:"AU",name:"Unión Africana",type:"regional",members:members(c=>c.continent==="Africa"||c.region==="Africa"),authority:48,budget:35,agenda:[],resolutions:[]},
    {id:"ASEAN",name:"ASEAN",type:"regional",members:["BRN","KHM","IDN","LAO","MYS","MMR","PHL","SGP","THA","VNM"].filter(id=>ids.includes(id)),authority:46,budget:40,agenda:[],resolutions:[]},
    {id:"G20",name:"G20",type:"coordination",members:["ARG","AUS","BRA","CAN","CHN","FRA","DEU","IND","IDN","ITA","JPN","MEX","RUS","SAU","ZAF","KOR","TUR","GBR","USA"].filter(id=>ids.includes(id)),authority:44,budget:50,agenda:[],resolutions:[]}
  ]}

  V.registerSystem({id:"world.trade-supply-network",order:44,frequency:"weekly",run:({state})=>{
    const cs=countries(state),edges=[];
    for(const a of cs){const partners=cs.filter(b=>b.id!==a.id&&relation(a,b)>38).map(b=>{let complement=0;for(const id of Object.keys(a.v5.economy.products)){const x=a.v5.economy.products[id],y=b.v5.economy.products[id];complement+=Math.max(0,x.demand-x.supply)*Math.max(0,y.supply-y.demand)}return{b,score:relation(a,b)+Math.log10(1+complement)*8+b.v5.infrastructure.logistics.portCapacity/Math.max(1,b.economy.gdp)*50}}).sort((x,y)=>y.score-x.score).slice(0,5);
      for(const {b,score} of partners){const volume=round(Math.min(a.economy.gdp,b.economy.gdp)*clamp(score,20,120)/900),mode=(a.map?.coastal!==false&&b.map?.coastal!==false)?"maritime":"road-rail",risk=round(clamp((100-relation(a,b))*.25+(a.v5.infrastructure.logistics.utilization+b.v5.infrastructure.logistics.utilization-140)*.12,0,100));edges.push({id:`${a.id}-${b.id}`,from:a.id,to:b.id,volume,mode,risk,status:risk>70?"disrupted":"active"})}
    }
    state.v5Networks.trade.edges=edges;state.v5Networks.trade.chokepoints=[{id:"SUEZ",name:"Canal de Suez",flow:12,risk:state.worldIndex.warRisk*.55},{id:"MALACCA",name:"Estrecho de Malaca",flow:24,risk:state.worldIndex.warRisk*.42},{id:"HORMUZ",name:"Estrecho de Ormuz",flow:19,risk:state.worldIndex.warRisk*.7},{id:"BAB",name:"Bab el-Mandeb",flow:10,risk:state.worldIndex.warRisk*.65},{id:"PANAMA",name:"Canal de Panamá",flow:6,risk:state.worldIndex.climateRisk*.45}];
    state.v5Networks.trade.disruptions=edges.filter(e=>e.status==="disrupted").slice(0,30);state.worldIndex.freightIndex=round(100+edges.reduce((a,e)=>a+e.risk*e.volume,0)/Math.max(1,edges.reduce((a,e)=>a+e.volume,0))*.35);
  }});

  V.registerSystem({id:"world.organizations-treaties",order:86,frequency:"monthly",run:({state,rng})=>{
    ensureOrganizations(state);const rand=rng("organizations"),wars=(state.wars||[]).filter(w=>!w.ended),outbreaks=(state.v5Networks.health.outbreaks||[]).filter(x=>x.status==="active");
    for(const org of state.organizations){org.agenda=[];if(org.type==="security"&&wars.length)org.agenda.push({issue:"Conflictos activos",severity:clamp(wars.length*8,0,100)});if(org.type==="health"&&outbreaks.length)org.agenda.push({issue:"Brotes transfronterizos",severity:clamp(outbreaks.length*10,0,100)});if(org.type==="trade"&&state.v5Networks.trade.disruptions.length)org.agenda.push({issue:"Cadenas de suministro",severity:clamp(state.v5Networks.trade.disruptions.length*4,0,100)});if(org.type==="finance"&&state.worldIndex.globalInflation>6)org.agenda.push({issue:"Inflación y deuda",severity:clamp(state.worldIndex.globalInflation*8,0,100)});
      const urgent=org.agenda.sort((a,b)=>b.severity-a.severity)[0];if(urgent&&rand()<urgent.severity/180){org.resolutions.push({id:V.uuid(state,"resolution"),day:state.dayIndex,issue:urgent.issue,support:round(35+rand()*55),binding:org.authority>70,status:"adopted"});if(org.resolutions.length>30)org.resolutions.shift()}}
    state.treatyRegistry=(state.treatyRegistry||[]).filter(t=>t.status!=="expired");for(const c of countries(state))c.v5.foreign.treatyCompliance=round(clamp(c.v5.foreign.treatyCompliance+(c.v5.governance.institutions.ruleOfLaw-50)*.008-(c.v5.governance.corruption.perception)*.004,10,100));
  }});

  V.registerSystem({id:"world.emergent-events",order:96,frequency:"weekly",run:({state,rng})=>{
    const rand=rng("emergent-events"),existing=(type,countryId)=>(state.emergentEvents||[]).some(e=>e.type===type&&e.countryId===countryId&&state.dayIndex-e.day<90);
    for(const c of countries(state)){
      const candidates=[
        {type:"financial",score:c.v5.economy.banking.stress,title:`Tensión bancaria en ${c.name}`,text:"La mora, el coste de financiación y la liquidez amenazan el crédito.",options:["Garantía de depósitos","Recapitalización condicionada","Resolución bancaria"]},
        {type:"food",score:c.v5.economy.products.food.shortage,title:`Escasez alimentaria en ${c.name}`,text:"Inventarios y oferta no cubren la demanda doméstica.",options:["Importación de emergencia","Liberar reservas","Subsidio focalizado"]},
        {type:"social",score:c.v5.society.opinion.protestPotential,title:`Movilización social en ${c.name}`,text:"Vivienda, precios y empleo convergen en una protesta nacional.",options:["Diálogo social","Paquete económico","Orden público proporcionado"]},
        {type:"energy",score:c.v5.infrastructure.energy.blackoutRisk,title:`Alerta de red eléctrica en ${c.name}`,text:"La reserva disponible no garantiza la continuidad del sistema.",options:["Respuesta de demanda","Importar electricidad","Activar reserva térmica"]}
      ];
      const trigger=candidates.sort((a,b)=>b.score-a.score)[0];if(trigger.score>62&&!existing(trigger.type,c.id)&&rand()<trigger.score/180){const event={id:V.uuid(state,"emergent"),day:state.dayIndex,date:state.date,countryId:c.id,...trigger,status:"active"};state.emergentEvents.push(event);state.actionInbox.push({id:V.uuid(state,"emergent-decision"),type:trigger.type,countryId:c.id,title:trigger.title,text:trigger.text,options:trigger.options,status:"pending"})}
    }
    if(state.emergentEvents.length>200)state.emergentEvents.splice(0,state.emergentEvents.length-200);
  }});

  window.NEXUS_V5_ORGANIZATIONS={ensureOrganizations};
})();
