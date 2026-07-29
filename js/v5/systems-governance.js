"use strict";

(() => {
  const V=window.NEXUS_V5,{clamp,round}=V;
  const issueLabels={inflation:"coste de vida",unemployment:"empleo",housing:"vivienda",security:"seguridad",health:"sanidad",war:"guerra",corruption:"corrupción",climate:"clima"};

  V.registerSystem({id:"governance.public-opinion-media",order:70,frequency:"weekly",run:({state,rng})=>{
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const s=c.v5.society,g=c.v5.governance;if(!s||!g)continue;const rand=rng(`opinion:${c.id}`),war=state.wars?.some(w=>!w.ended&&(w.attackerId===c.id||w.defenderId===c.id));
      const pressures={inflation:c.economy.inflation*1.5,unemployment:c.economy.unemployment*1.2,housing:s.housing.rentBurden/3,security:g.crime.organized/2,health:100-s.health.capacity,war:war?35:0,corruption:g.corruption.perception,climate:(c.v5.infrastructure.climate.heatRisk+c.v5.infrastructure.climate.waterRisk)/3};
      s.opinion.issues=Object.entries(pressures).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([id,salience])=>({id,label:issueLabels[id],salience:round(salience),direction:id==="war"||id==="inflation"?-1:0}));
      const economy=(c.economy.growth-2)*.35-(c.economy.inflation-2)*.3-(c.economy.unemployment-5)*.22,housing=(25-s.housing.rentBurden)*.08,integrity=(25-g.corruption.perception)*.06,warEffect=war?-1.2:0;
      s.opinion.government=round(clamp(s.opinion.government+(economy+housing+integrity+warEffect)/7+(rand()-.5)*.35,5,95));c.systems.approval=round(c.systems.approval*.72+s.opinion.government*.28);
      s.opinion.protestPotential=round(clamp((100-s.opinion.government)*.32+s.opinion.polarization*.45+c.economy.unemployment*.8,0,100));g.media.trust=round(clamp(g.media.trust+(g.media.freedom-55)*.01-g.media.polarization*.018+(rand()-.5)*.2,5,95));g.media.polarization=round(clamp(g.media.polarization+(s.opinion.polarization-g.media.polarization)*.025,2,95));
      g.media.narratives=s.opinion.issues.slice(0,3).map((x,i)=>({id:x.id,title:`Debate sobre ${x.label}`,reach:round(g.media.reach*(1-i*.2)),tone:x.direction<0?"critical":"mixed"}));
      c.v5.factors.approval=[{label:"Economía cotidiana",impact:round(economy),detail:`PIB ${c.economy.growth}% · IPC ${c.economy.inflation}%`},{label:"Vivienda",impact:round(housing),detail:`Esfuerzo ${s.housing.rentBurden}%`},{label:"Integridad pública",impact:round(integrity),detail:`Percepción ${g.corruption.perception}`},{label:"Contexto bélico",impact:warEffect,detail:war?"País en guerra":"Sin guerra directa"}];
    }
  }});

  V.registerSystem({id:"governance.parties-institutions",order:72,frequency:"monthly",run:({state,rng})=>{
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const politics=c.politics,g=c.v5.governance,s=c.v5.society;if(!politics?.parties?.length)continue;const rand=rng(`parties:${c.id}`),ruling=politics.parties.find(p=>p.id===politics.rulingPartyId),approval=s.opinion.government;
      for(const party of politics.parties){
        party.momentum??=0;party.organisation??=round(35+rand()*45);party.funding??=round(25+rand()*55);party.mediaReach??=round(25+rand()*60);party.promises??=[];
        const governing=party.id===ruling?.id,performance=governing?(approval-50)/18:-(approval-50)/Math.max(28,politics.parties.length*8),campaign=(party.endorsed||state.v5?.endorsedPartyId===party.id)?1.4:0,capacity=(party.organisation+party.funding+party.mediaReach-150)/280;
        party.momentum=round(clamp(party.momentum*.72+performance+campaign+capacity+(rand()-.5)*.7,-15,15));party.support=round(clamp((party.support||party.voteShare||10)+party.momentum*.08,1,75));party.politicalCapital=round(clamp((party.politicalCapital||20)+(governing&&approval>55?1.2:governing&&approval<40?-.8:.15)+party.momentum*.04,0,100));
      }
      const total=politics.parties.reduce((a,p)=>a+(p.support||1),0);for(const party of politics.parties)party.polling=round((party.support||1)/total*100);
      const adminSpend=(c.budgets.education+c.budgets.infrastructure)/2;g.institutions.stateCapacity=round(clamp(g.institutions.stateCapacity+(adminSpend-4)*.025-g.corruption.procurementLeakage*.01,10,100));g.institutions.bureaucracy=round(clamp(g.institutions.bureaucracy+(adminSpend-4)*.018,10,100));
      c.systems.stability=round(clamp(c.systems.stability+(g.institutions.ruleOfLaw-50)*.003-s.opinion.protestPotential*.006,10,100));politics.politicalCapital=round(clamp((politics.politicalCapital||0)+(approval-50)*.025+g.institutions.stateCapacity*.008,0,150));
    }
  }});

  V.registerSystem({id:"governance.corruption-crime",order:74,frequency:"quarterly",run:({state,rng})=>{
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const g=c.v5.governance,rand=rng(`integrity:${c.id}`),oversight=(g.institutions.ruleOfLaw+g.media.freedom+g.institutions.judicialIndependence)/3,stress=c.economy.unemployment+c.v5.economy.informalShare/2;
      g.corruption.procurementLeakage=round(clamp(g.corruption.procurementLeakage+(50-oversight)*.015+(rand()-.5)*.8,0,35));g.corruption.eliteCapture=round(clamp(g.corruption.eliteCapture+(55-oversight)*.012+(rand()-.5)*.6,0,80));g.corruption.perception=round(clamp(g.corruption.procurementLeakage*1.1+g.corruption.eliteCapture*.55+(100-oversight)*.2,0,100));
      g.crime.organized=round(clamp(g.crime.organized+(stress-25)*.02-g.institutions.stateCapacity*.008+(rand()-.5)*.6,0,80));g.crime.violent=round(clamp(g.crime.violent+(c.economy.unemployment-6)*.035-g.institutions.ruleOfLaw*.006+(rand()-.5)*.5,0,70));
      c.v5.economy.informalShare=round(clamp(c.v5.economy.informalShare+(g.crime.organized-25)*.015-g.institutions.stateCapacity*.01,2,60));c.v5.economy.taxCompliance=round(clamp(100-c.v5.economy.informalShare*.6-g.corruption.perception*.25,35,99));
      if(rand()<g.corruption.perception/1500){const investigation={id:V.uuid(state,"investigation"),day:state.dayIndex,severity:round(20+rand()*60),status:"open"};g.corruption.investigations.push(investigation);state.actionInbox.push({id:V.uuid(state,"integrity-decision"),type:"governance",countryId:c.id,title:`Investigación de corrupción en ${c.name}`,text:"La fiscalía solicita autonomía, acceso a contratos y protección de testigos.",options:["Investigación independiente","Comisión parlamentaria","Contener políticamente"],status:"pending"})}
    }
  }});

  V.registerSystem({id:"governance.leaders-elites",order:76,frequency:"yearly",run:({state,rng})=>{
    for(const c of state.countries.filter(x=>x.sovereign!==false)){
      const l=c.v5.governance.leaders,rand=rng(`leader:${c.id}`);l.head.age+=1;l.head.health=round(clamp(l.head.health-(l.head.age>70?3:1)+rand()*1.2,0,100));l.eliteCohesion=round(clamp(l.eliteCohesion+(c.systems.stability-60)*.03-(100-c.systems.approval)*.018+(rand()-.5)*3,5,100));
      if(l.head.health<15||rand()<.008){const prior=l.head.name;l.head={name:`Nueva dirección de ${c.name}`,age:round(42+rand()*24),competence:round(40+rand()*50),charisma:round(35+rand()*60),health:round(65+rand()*30),traits:[rand()>.5?"pragmático":"ideológico"]};l.successions.push({day:state.dayIndex,from:prior,to:l.head.name});state.actionInbox.push({id:V.uuid(state,"succession"),type:"politics",countryId:c.id,title:`Sucesión política en ${c.name}`,text:`${prior} deja el poder. La nueva dirección altera coaliciones y prioridades.`,options:["Asegurar continuidad","Giro reformista","Elecciones anticipadas"],status:"pending"})}
    }
  }});
})();
