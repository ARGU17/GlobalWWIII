"use strict";

(() => {
  const V=window.NEXUS_V5,{clamp,round}=V;
  const factor=(c,key,label,impact,detail)=>{c.v5.factors[key]||=[];c.v5.factors[key].push({label,impact:round(impact,3),detail});if(c.v5.factors[key].length>12)c.v5.factors[key].shift()};
  const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;

  V.registerSystem({id:"economy.product-markets",order:20,frequency:"daily",run:({state,rng})=>{
    let globalFood=0,globalEnergy=0,n=0;
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const m=c.v5.economy,rand=rng(`products:${c.id}`);if(!m)continue;
      for(const [id,p] of Object.entries(m.products)){
        const capacity=id==="food"?c.systems.food:id==="energy"?c.systems.energy:(c.systems.industry+c.systems.logistics)/2;
        const disruption=(c.v5.infrastructure?.logistics?.utilization||60)>90?.012:0,war=state.wars?.some(w=>!w.ended&&(w.attackerId===c.id||w.defenderId===c.id))?.018:0;
        const supplyGrowth=(capacity-55)/240000-disruption-war+(rand()-.5)*.0005,demandGrowth=(c.economy.growth||0)/36500+(rand()-.5)*.00035;
        p.supply=round(Math.max(.01,p.supply*(1+supplyGrowth)),3);p.demand=round(Math.max(.01,p.demand*(1+demandGrowth)),3);
        const available=p.supply+p.inventory+Math.max(0,p.imports-p.exports),gap=(p.demand-available)/Math.max(.01,p.demand);
        p.shortage=round(clamp(gap*100,0,100));p.trend=round(clamp(gap*.9+(rand()-.5)*.004,-.04,.08),4);p.price=round(clamp(p.price*(1+p.trend/30),35,450),3);
        p.inventory=round(clamp(p.inventory+(p.supply-p.demand)*.03,0,p.demand*.8),3);
        if(id==="food")globalFood+=p.price;if(id==="energy")globalEnergy+=p.price;
      }
      const prices=Object.values(m.products).map(p=>p.price),pricePressure=(avg(prices)-100)/12;
      m.accounts.gdpDeflator=round(m.accounts.gdpDeflator*(1+clamp(pricePressure,-3,15)/36500),3);
      factor(c,"inflation","Precios de productos",pricePressure,`Índice medio ${round(avg(prices),1)}`);n++;
    }
    state.worldIndex.foodIndex=round(globalFood/Math.max(1,n));state.worldIndex.energyIndex=round(globalEnergy/Math.max(1,n));
  }});

  V.registerSystem({id:"economy.firms-and-credit",order:25,frequency:"weekly",run:({state,rng})=>{
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const e=c.v5.economy;if(!e)continue;const rand=rng(`firms:${c.id}`),creditCost=e.centralBank.policyRate+e.markets.riskPremium;
      let jobs=0,investment=0,failures=0,profits=0;
      for(const f of e.firms){
        const demand=avg(Object.values(e.products).map(p=>100-p.shortage*.2)),margin=.025+(f.productivity-45)/1000-creditCost/850;
        f.revenue=round(Math.max(.05,f.revenue*(1+(demand-98)/2500+(rand()-.48)*.006)));
        f.profit=round(f.revenue*clamp(margin,-.12,.28));f.cash=round(Math.max(0,f.cash+f.profit/52-f.investment/52));f.debt=round(Math.max(0,f.debt*(1+creditCost/5200)-Math.max(0,f.profit)*.04/52));
        f.health=round(clamp(80+f.profit/Math.max(.1,f.revenue)*120-f.debt/Math.max(.1,f.revenue)*18,0,100));
        if(f.health<12){failures++;f.employment=round(f.employment*.94)}else{f.employment=round(Math.max(0,f.employment*(1+clamp(f.profit/f.revenue,-.1,.2)/80)))}
        f.capacity=round(clamp(f.capacity+f.investment/Math.max(.1,f.revenue)*.08,10,100));jobs+=f.employment;investment+=f.investment;profits+=f.profit;
      }
      const bank=e.banking;bank.loans=round(Math.max(0,bank.loans*(1+clamp(e.creditGrowth,-10,15)/5200)-failures*.0005));bank.npl=round(clamp(bank.npl+failures*.08-(e.cycle.phase==="expansion"?.03:0),.5,35));bank.capitalRatio=round(clamp(bank.capitalRatio+(profits>=0?.01:-.04)-bank.npl*.001,3,25));bank.stress=round(clamp(bank.npl*2+Math.max(0,9-bank.capitalRatio)*5,0,100));
      e.accounts.investment=round(e.accounts.investment*.85+investment*.15);c.v5.society.labor.employment=round(jobs/1e6,3);
      factor(c,"growth","Inversión empresarial",investment/Math.max(1,c.economy.gdp)*.8,`${round(investment,1)} mil M`);factor(c,"unemployment","Salud empresarial",-failures*.04,`${failures} empresas en tensión`);
    }
  }});

  V.registerSystem({id:"economy.national-accounts",order:30,frequency:"monthly",run:({state,rng})=>{
    let worldGDP=0,worldPop=0,weightedInflation=0;
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const m=c.v5.economy,e=c.economy,s=c.systems,rand=rng(`accounts:${c.id}`);if(!m)continue;c.v5.factors.growth=[];c.v5.factors.inflation=[];c.v5.factors.unemployment=[];
      const productShortage=avg(Object.values(m.products).map(p=>p.shortage)),energyGap=Math.max(0,(c.v5.infrastructure.energy.demand-c.v5.infrastructure.energy.capacity)/Math.max(1,c.v5.infrastructure.energy.demand));
      const productivity=(m.accounts.productivity-55)/45,credit=clamp(m.banking.creditGrowth/100,-.1,.15),confidence=(e.confidence-55)/100,war=state.wars?.some(w=>!w.ended&&(w.attackerId===c.id||w.defenderId===c.id))?-.018:0;
      const potential=clamp(.008+productivity*.028+credit*.2+confidence*.025-war-productShortage/900-energyGap*.04,-.08,.1),monthly=potential/12+(rand()-.5)*.0015;
      m.accounts.realGDP=round(Math.max(.1,m.accounts.realGDP*(1+monthly)),3);m.accounts.nominalGDP=round(m.accounts.realGDP*m.accounts.gdpDeflator/100,3);m.accounts.potentialGDP=round(m.accounts.potentialGDP*(1+clamp(.012+productivity*.02,-.01,.06)/12),3);m.accounts.outputGap=round((m.accounts.realGDP/m.accounts.potentialGDP-1)*100,2);
      const netExports=Object.values(m.products).reduce((a,p)=>a+p.exports-p.imports,0);m.accounts.exports=round(Math.max(0,m.accounts.exports*.9+Math.max(0,netExports)*.1));m.accounts.imports=round(Math.max(0,m.accounts.imports*.9+Math.max(0,-netExports)*.1));
      e.gdp=round(m.accounts.nominalGDP,2);e.growth=round(clamp(monthly*1200,-12,15),2);e.tradeBalance=round(m.accounts.exports-m.accounts.imports,2);
      const priceInflation=(m.accounts.gdpDeflator/100-1)*100,momentum=avg(Object.values(m.products).map(p=>p.trend))*1200;e.inflation=round(clamp(e.inflation*.72+priceInflation*.18+momentum*.1,-3,35),2);
      const okun=(e.growth-1.8)*-.09,firmJobs=c.v5.society.labor.employment,employmentGap=(c.v5.society.labor.laborForce-firmJobs)/Math.max(.1,c.v5.society.labor.laborForce)*100;e.unemployment=round(clamp(e.unemployment*.82+employmentGap*.1+e.unemployment*.08+okun,1,45),2);
      m.cycle.momentum=round(e.growth);m.cycle.phase=e.growth<-.5?"recession":m.accounts.outputGap<-1?"recovery":m.accounts.outputGap>2?"overheating":e.growth>2.5?"expansion":"mature";m.cycle.stress=round(clamp(e.inflation+e.unemployment/2+m.banking.stress/10,0,60));
      factor(c,"growth","Productividad",productivity*2.8,`Índice ${round(m.accounts.productivity,1)}`);factor(c,"growth","Crédito",credit*20,`${round(m.banking.creditGrowth,1)}%`);factor(c,"growth","Escasez",-productShortage/9,`${round(productShortage,1)}%`);factor(c,"growth","Confianza",confidence*2.5,`${round(e.confidence,1)}`);
      worldGDP+=e.gdp;worldPop+=e.population;weightedInflation+=e.inflation*e.gdp;
    }
    state.worldIndex.globalGDP=round(worldGDP);state.worldIndex.globalPopulation=round(worldPop);state.worldIndex.globalInflation=round(weightedInflation/Math.max(1,worldGDP));
  }});

  V.registerSystem({id:"economy.monetary-financial",order:35,frequency:"monthly",run:({state,rng})=>{
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const m=c.v5.economy,e=c.economy,rand=rng(`finance:${c.id}`);if(!m)continue;
      const cb=m.centralBank,neutral=2,rule=neutral+1.25*(e.inflation-cb.inflationTarget)+.35*m.accounts.outputGap;cb.policyRate=round(clamp(cb.policyRate+(rule-cb.policyRate)*(.12+cb.independence/1000),0,35));cb.stance=cb.policyRate>neutral+2?"restrictive":cb.policyRate<neutral-.5?"expansive":"neutral";
      e.interestRate=cb.policyRate;m.markets.riskPremium=round(clamp((100-e.confidence)/22+Math.max(0,e.debtRatio-70)/55+m.banking.stress/35,0,20));m.markets.bondYield=round(clamp(cb.policyRate+m.markets.riskPremium,0,45));
      m.markets.equityIndex=round(clamp(m.markets.equityIndex*(1+(e.growth-cb.policyRate)/1200+(rand()-.5)*.025),15,600));m.markets.housingIndex=round(clamp(m.markets.housingIndex*(1+(e.growth-cb.policyRate*.7)/1800),30,500));
      const external=e.tradeBalance/Math.max(1,e.gdp),credibility=(m.currency.credibility-50)/100;m.currency.rate=round(clamp(m.currency.rate*(1+external*.015+credibility*.002-(e.inflation-state.worldIndex.globalInflation)*.0004),.05,20),4);m.currency.reserves=round(Math.max(0,m.currency.reserves+e.tradeBalance/12));
      m.banking.creditGrowth=round(clamp(e.growth-cb.policyRate*.35-m.banking.stress*.04,-20,25));factor(c,"inflation","Tipo de política",-(cb.policyRate-neutral)*.18,`${cb.policyRate}% · ${cb.stance}`);
    }
  }});
})();
