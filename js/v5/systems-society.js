"use strict";

(() => {
  const V=window.NEXUS_V5,{clamp,round}=V;
  const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
  const addFactor=(c,key,label,impact,detail)=>{c.v5.factors[key]||=[];c.v5.factors[key].push({label,impact:round(impact,3),detail});if(c.v5.factors[key].length>12)c.v5.factors[key].shift()};

  V.registerSystem({id:"infrastructure.energy-grid",order:40,frequency:"daily",run:({state,rng})=>{
    let energySum=0,n=0;
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const grid=c.v5.infrastructure?.energy;if(!grid)continue;const rand=rng(`energy:${c.id}`),weather=(rand()-.5)*.025,warDamage=(c.v5.military?.fronts?.length||0)*.003;
      const effective=grid.capacity*(grid.gridReliability/100)*(1-warDamage+weather),gap=(grid.demand-effective)/Math.max(1,grid.demand);grid.reserveMargin=round((effective/grid.demand-1)*100);grid.blackoutRisk=round(clamp(gap*130+(100-grid.gridReliability)*.25,0,100));
      c.systems.energy=round(clamp(c.systems.energy-grid.blackoutRisk*.004+(grid.reserveMargin>15?.004:0),10,100));
      const product=c.v5.economy.products.electricity||c.v5.economy.products.energy;if(product){product.supply=round(product.supply*(1-grid.blackoutRisk/25000),3);product.production=product.supply;product.shortage=round(clamp(product.shortage+grid.blackoutRisk/500,0,100))}
      addFactor(c,"growth","Seguridad energética",-grid.blackoutRisk*.008,`Riesgo de apagón ${grid.blackoutRisk}%`);energySum+=product?.price||100;n++;
    }
    state.worldIndex.energyIndex=round(energySum/Math.max(1,n));
  }});

  V.registerSystem({id:"infrastructure.freight-network",order:42,frequency:"weekly",run:({state})=>{
    let globalUtil=0,n=0;
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const l=c.v5.infrastructure?.logistics;if(!l)continue;const trade=Math.abs(c.economy.tradeBalance||0)+Object.values(c.v5.economy.products).reduce((a,p)=>a+p.imports+p.exports,0),militaryLoad=(c.v5.military?.operations?.length||0)*l.freightCapacity*.08;
      l.utilization=round(clamp((trade+militaryLoad)/Math.max(1,l.freightCapacity)*100,10,160));l.bottlenecks=l.utilization>105?[{type:"capacity",severity:round(l.utilization-100),effect:"Retrasos, precios y suministro militar"}]:[];
      c.systems.logistics=round(clamp(c.systems.logistics-(l.utilization>100?(l.utilization-100)*.003:-.01),15,100));addFactor(c,"inflation","Coste logístico",Math.max(0,l.utilization-85)*.015,`Utilización ${l.utilization}%`);globalUtil+=l.utilization;n++;
    }
    state.worldIndex.freightIndex=round(70+globalUtil/Math.max(1,n)*.35);
  }});

  V.registerSystem({id:"society.labor-skills",order:50,frequency:"monthly",run:({state})=>{
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const s=c.v5.society,l=s?.labor;if(!l)continue;const firms=c.v5.economy.firms,desired=firms.reduce((a,f)=>a+f.employment,0)/1e6,educationSpend=c.budgets.education||4,research=c.budgets.research||2;
      l.vacancies=round(clamp((desired-l.employment)/Math.max(.1,l.laborForce)*100,0,20));l.participation=round(clamp(l.participation+(educationSpend-4)*.012-(s.cohorts.seniors/c.economy.population)*.01,40,85));l.wageIndex=round(l.wageIndex*(1+(c.economy.inflation*.65+l.vacancies*.3)/1200),2);
      l.skills.advanced=round(clamp(l.skills.advanced+(educationSpend+research-5)*.008-(s.education.brainDrain)*.003,5,55));l.skills.technical=round(clamp(l.skills.technical+(educationSpend-3.5)*.006,10,70));l.skills.basic=round(clamp(100-l.skills.advanced-l.skills.technical,15,80));
      const mismatch=Math.max(0,(c.systems.technology||50)/2-l.skills.advanced);s.education.brainDrain=round(clamp(s.education.brainDrain+(c.economy.unemployment-6)*.015-(c.economy.growth-2)*.02,0,30));addFactor(c,"unemployment","Desajuste de capacidades",mismatch*.025,`${round(mismatch,1)} puntos`);
    }
  }});

  V.registerSystem({id:"society.demography-housing",order:55,frequency:"quarterly",run:({state})=>{
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const s=c.v5.society;if(!s)continue;const p=c.economy.population,births=p*s.fertility/80/4/100,deaths=p/(s.lifeExpectancy*4),migration=p*s.migrationRate/4000,delta=births-deaths+migration;
      c.economy.population=round(Math.max(.02,p+delta),4);s.cohorts.children=round(Math.max(.001,s.cohorts.children+births-deaths*.05),4);s.cohorts.working=round(Math.max(.001,s.cohorts.working+births*.03-deaths*.55+migration*.75),4);s.cohorts.seniors=round(Math.max(.001,c.economy.population-s.cohorts.children-s.cohorts.working),4);
      const urbanGrowth=Math.max(0,delta*s.urbanization/100),newHomes=(c.budgets.infrastructure||3)*p*.00005;s.housing.stock=round(Math.max(.01,s.housing.stock+newHomes));s.housing.vacancy=round(clamp((s.housing.stock-c.economy.population*.43)/Math.max(.01,s.housing.stock)*100,1,20));s.housing.priceIndex=round(clamp(s.housing.priceIndex*(1+(urbanGrowth-newHomes)/Math.max(.1,s.housing.stock)*.2+(c.v5.economy.markets.policyRate||0)*-.0001),25,600));s.housing.rentBurden=round(clamp(22+(s.housing.priceIndex-100)/20-s.housing.vacancy*.25,10,65));
      addFactor(c,"growth","Demografía",delta/Math.max(.1,p)*100,`Población ${round(c.economy.population,2)} M`);addFactor(c,"approval","Vivienda",-(s.housing.rentBurden-25)*.04,`Esfuerzo ${s.housing.rentBurden}%`);
    }
  }});

  V.registerSystem({id:"society.health-food",order:57,frequency:"monthly",run:({state,rng})=>{
    let food=0,n=0;
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const s=c.v5.society;if(!s)continue;const rand=rng(`health:${c.id}`),foodMarket=c.v5.economy.products.grains||c.v5.economy.products.food,shortage=foodMarket.shortage;
      s.food.reservesDays=round(clamp(s.food.reservesDays+(foodMarket.supply-foodMarket.demand)/Math.max(.1,foodMarket.demand)*12,0,240));s.food.calorieSecurity=round(clamp(100-shortage-s.food.waterStress*.12,0,100));s.food.malnutrition=round(clamp(s.food.malnutrition+shortage*.02-(c.budgets.health||4)*.008,0,45));
      const outbreakChance=(100-s.health.coverage+s.health.diseaseBurden)/2200;if(rand()<outbreakChance){const outbreak={id:V.uuid(state,"outbreak"),countryId:c.id,name:"Brote epidemiológico",severity:round(10+rand()*45),day:state.dayIndex,status:"active"};state.v5Networks.health.outbreaks.push(outbreak);s.health.pandemicRisk=round(clamp(s.health.pandemicRisk+outbreak.severity*.3,0,100));state.actionInbox.push({id:V.uuid(state,"health-decision"),type:"health",title:`Brote sanitario en ${c.name}`,text:"Decide entre vigilancia, vacunación y restricciones focalizadas.",countryId:c.id,options:["Vigilancia reforzada","Campaña sanitaria","Restricciones focalizadas"],status:"pending"})}
      s.health.capacity=round(clamp(s.health.capacity+(c.budgets.health-4)*.025-s.health.pandemicRisk*.003,10,100));s.lifeExpectancy=round(clamp(s.lifeExpectancy+(s.health.capacity-55)*.0008-s.food.malnutrition*.001,45,90),2);food+=foodMarket.price;n++;
    }
    state.worldIndex.foodIndex=round(food/Math.max(1,n));
  }});

  V.registerSystem({id:"world.climate-environment",order:60,frequency:"quarterly",run:({state,rng})=>{
    const countries=state.countries.filter(x=>x.sovereign!==false),emissions=countries.reduce((a,c)=>a+(c.v5.infrastructure?.climate?.emissions||0),0);state.v5Networks.climate.emissions=round(emissions);state.v5Networks.climate.globalTemperature=round(state.v5Networks.climate.globalTemperature+emissions/1e8,4);
    for(const c of countries){const cl=c.v5.infrastructure.climate,rand=rng(`climate:${c.id}`);cl.heatRisk=round(clamp(cl.heatRisk+state.v5Networks.climate.globalTemperature*.08-cl.adaptation*.01,0,100));cl.waterRisk=round(clamp(cl.waterRisk+cl.heatRisk*.012-cl.adaptation*.006,0,100));if(rand()<(cl.heatRisk+cl.waterRisk)/(14000)){const damage=round(c.economy.gdp*(.001+rand()*.008));cl.disasterDamage=round(cl.disasterDamage+damage);state.v5Networks.climate.disasters.push({id:V.uuid(state,"disaster"),countryId:c.id,day:state.dayIndex,damage,type:cl.waterRisk>cl.heatRisk?"inundación/sequía":"ola de calor"});state.actionInbox.push({id:V.uuid(state,"climate-decision"),type:"climate",countryId:c.id,title:`Desastre climático en ${c.name}`,text:`Daños estimados: ${damage} mil M.`,options:["Emergencia nacional","Reconstrucción resiliente","Ayuda focalizada"],status:"pending"})}}
    state.worldIndex.climateRisk=round(avg(countries.map(c=>(c.v5.infrastructure.climate.heatRisk+c.v5.infrastructure.climate.waterRisk)/2)));
  }});
})();
