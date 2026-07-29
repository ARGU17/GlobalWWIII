"use strict";

/* NEXUS Global Alpha v1.9.0
   Tablero estratégico fluido, campañas multidominio, estrategia electoral
   elegible y denominaciones militares reconocibles por país.
*/
(() => {
  const E=window.NEXUS_ECONOMY;
  if(!E)throw new Error("alpha-v19.js requiere el motor económico de NEXUS.");

  const oldCreate=E.createInitialState;
  const oldHydrate=E.hydrateState;
  const oldTick=E.tickDay;
  const oldRunElection=E.runElection;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const round=(v,d=1)=>Number((Number(v)||0).toFixed(d));
  const uid=()=>crypto.randomUUID?.()||`nexus19-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const UNIT_ICONS={
    infantry:"assets/icons/infantry.svg",mechanized:"assets/icons/mechanized.svg",armor:"assets/icons/armor.svg",
    artillery:"assets/icons/artillery.svg",airDefense:"assets/icons/air-defense.svg",rocketArtillery:"assets/icons/rocket-artillery.svg",
    fighter:"assets/icons/fighter.svg",drone:"assets/icons/drone.svg",bomber:"assets/icons/bomber.svg",transport:"assets/icons/transport.svg",
    frigate:"assets/icons/frigate.svg",destroyer:"assets/icons/destroyer.svg",submarine:"assets/icons/submarine.svg",carrier:"assets/icons/carrier.svg",
    satellite:"assets/icons/satellite.svg",missile:"assets/icons/missile.svg",cyber:"assets/icons/cyber.svg"
  };
  const UNIT_GLYPHS={infantry:"◆",mechanized:"▣",armor:"▰",artillery:"✦",airDefense:"⌁",rocketArtillery:"✹",fighter:"▲",drone:"◇",bomber:"▼",transport:"✈",frigate:"≈",destroyer:"≋",submarine:"◒",carrier:"▱",satellite:"✧",missile:"↟",cyber:"⌘"};
  const GENERIC_NAMES={
    infantry:"Brigada de infantería",mechanized:"Brigada mecanizada",armor:"Grupo acorazado",artillery:"Regimiento de artillería",
    airDefense:"Grupo de defensa aérea",rocketArtillery:"Grupo lanzacohetes",fighter:"Ala de combate multirrol",drone:"Grupo ISR no tripulado",
    bomber:"Ala de ataque profundo",transport:"Ala de transporte táctico",frigate:"Fragata oceánica",destroyer:"Destructor de defensa aérea",
    submarine:"Escuadrilla submarina",carrier:"Grupo de combate aeronaval",satellite:"Constelación ISR",missile:"Brigada de misiles",cyber:"Mando de ciberoperaciones"
  };
  const NATIONAL_SYSTEMS={
    ESP:{infantry:"Brigada «Rey Alfonso XIII» II de La Legión",mechanized:"Brigada «Guzmán el Bueno» X · Pizarro",armor:"Regimiento «Alcázar de Toledo» 61 · Leopard 2E",artillery:"RACA 11 · SIAC 155/52",airDefense:"RAAA 71 · NASAMS",rocketArtillery:"Grupo de Artillería Lanzacohetes SILAM",fighter:"Ala 14 · Eurofighter Typhoon",drone:"Grupo 47 · MQ-9 Predator B",bomber:"Ala 12 · EF-18M",transport:"Ala 31 · A400M Atlas",frigate:"31ª Escuadrilla · F-100 Álvaro de Bazán",destroyer:"F-110 clase Bonifaz",submarine:"Flotilla S-80 Plus",carrier:"Grupo Aeronaval Juan Carlos I",satellite:"Constelación PAZ/Spainsat NG",missile:"Regimiento de Artillería de Costa · NSM",cyber:"Mando Conjunto del Ciberespacio"},
    USA:{infantry:"1st Infantry Division",mechanized:"1st Cavalry Division · M2A4 Bradley",armor:"1st Armored Division · M1A2 SEPv3 Abrams",artillery:"1st Field Artillery Brigade · M109A7",airDefense:"11th Air Defense Artillery Brigade · Patriot",rocketArtillery:"17th Field Artillery Brigade · HIMARS",fighter:"1st Fighter Wing · F-35A Lightning II",drone:"432nd Wing · MQ-9A Reaper",bomber:"2nd Bomb Wing · B-52H",transport:"60th Air Mobility Wing · C-17A",frigate:"Constellation-class Frigate Squadron",destroyer:"Destroyer Squadron · Arleigh Burke Flight III",submarine:"Virginia-class Submarine Squadron",carrier:"Carrier Strike Group · Gerald R. Ford",satellite:"Space Delta · NRO ISR",missile:"1st Multi-Domain Task Force · PrSM",cyber:"US Cyber Command Mission Force"},
    FRA:{infantry:"1re Brigade mécanisée",mechanized:"2e Brigade blindée · VBCI",armor:"5e Régiment de dragons · Leclerc XLR",artillery:"40e Régiment d’artillerie · CAESAR",airDefense:"54e Régiment d’artillerie · SAMP/T",rocketArtillery:"1er Régiment d’artillerie · LRU",fighter:"Escadron 1/4 Gascogne · Rafale",drone:"Escadron 1/33 Belfort · MQ-9 Reaper",bomber:"Forces aériennes stratégiques · Rafale B",transport:"Escadron 1/61 Touraine · A400M",frigate:"Frégate FREMM Aquitaine",destroyer:"Frégate de défense aérienne Horizon",submarine:"SNA classe Suffren",carrier:"Groupe aéronaval Charles de Gaulle",satellite:"Constellation CSO/CERES",missile:"Force de frappe SCALP/MdCN",cyber:"Commandement de la cyberdéfense"},
    DEU:{mechanized:"Panzergrenadierbrigade 37 · Puma",armor:"Panzerbrigade 12 · Leopard 2A7V",artillery:"Artilleriebataillon 131 · PzH 2000",airDefense:"Flugabwehrraketengruppe 21 · Patriot",fighter:"Taktisches Luftwaffengeschwader 74 · Eurofighter",transport:"Lufttransportgeschwader 62 · A400M",frigate:"Fregatte Klasse F125",submarine:"Ubootgeschwader · Klasse 212A",cyber:"Kommando Cyber- und Informationsraum"},
    GBR:{mechanized:"20th Armoured Brigade Combat Team · Ajax",armor:"Royal Tank Regiment · Challenger 3",artillery:"Royal Artillery · Archer",airDefense:"16 Regiment RA · Sky Sabre",fighter:"No. 617 Squadron · F-35B Lightning",transport:"No. 70 Squadron · A400M Atlas",destroyer:"Type 45 Daring-class Destroyer",frigate:"Type 26 City-class Frigate",submarine:"Astute-class Submarine Squadron",carrier:"UK Carrier Strike Group · HMS Queen Elizabeth",cyber:"National Cyber Force"},
    CHN:{mechanized:"Grupo de Ejército del EPL · ZBD-04A",armor:"Brigada acorazada del EPL · Type 99A",artillery:"Brigada PCL-181 de 155 mm",airDefense:"Brigada HQ-9B",rocketArtillery:"Brigada PHL-16",fighter:"Brigada aérea J-20 Mighty Dragon",drone:"Unidad UAV WZ-7 Soaring Dragon",bomber:"Regimiento H-6K",transport:"Regimiento Y-20 Kunpeng",destroyer:"Flotilla Type 055 Renhai",frigate:"Flotilla Type 054A Jiangkai II",submarine:"Flotilla Type 093 Shang",carrier:"Grupo de portaaviones Fujian",satellite:"Constelación Yaogan",missile:"Brigada de la Fuerza de Cohetes DF-26",cyber:"Fuerza de Apoyo a la Información"},
    RUS:{mechanized:"Brigada motorizada · BMP-3",armor:"División de tanques · T-90M Proryv",artillery:"Brigada de artillería · 2S19 Msta-S",airDefense:"Regimiento S-400 Triumf",rocketArtillery:"Brigada Tornado-S",fighter:"Regimiento de aviación · Su-35S",drone:"Regimiento UAV Orion",bomber:"Regimiento Tu-160M",transport:"Regimiento Il-76MD-90A",frigate:"Fragata clase Admiral Gorshkov",destroyer:"Crucero clase Slava",submarine:"Submarino clase Yasen-M",carrier:"Grupo aeronaval Admiral Kuznetsov",satellite:"Constelación Liana",missile:"Brigada Iskander-M",cyber:"Mando de Operaciones de Información"},
    IND:{mechanized:"Brigada mecanizada · BMP-2 Sarath",armor:"Brigada acorazada · T-90S Bhishma",artillery:"Regimiento K9 Vajra-T",airDefense:"Regimiento Akash",rocketArtillery:"Regimiento Pinaka",fighter:"No. 17 Squadron · Rafale EH",transport:"No. 81 Squadron · C-17 Globemaster III",destroyer:"Visakhapatnam-class Destroyer",frigate:"Nilgiri-class Frigate",submarine:"Kalvari-class Submarine",carrier:"Carrier Battle Group INS Vikrant",missile:"Regimiento BrahMos",cyber:"Defence Cyber Agency"}
  };

  const CAMPAIGNS=[
    {id:"airSuperiority",icon:"✈️",name:"Superioridad aérea",domain:"Aire",days:6,cost:2.2,capital:4,fuel:5,munitions:5,requires:["fighter"],description:"Cazas, alerta temprana y guerra electrónica para abrir el espacio aéreo.",effect:"Mejora el dominio aéreo y reduce la preparación enemiga."},
    {id:"precisionStrike",icon:"🎯",name:"Ataque de precisión",domain:"Aire / estratégico",days:4,cost:2.8,capital:5,fuel:3,munitions:8,requires:["fighter","missile"],description:"Golpea radares, aeródromos, nudos logísticos e infraestructura militar.",effect:"Daña logística, energía e instalaciones de la región objetivo."},
    {id:"navalBlockade",icon:"⚓",name:"Bloqueo naval",domain:"Mar",days:10,cost:3.4,capital:6,fuel:8,munitions:3,requires:["frigate","destroyer","submarine","carrier"],description:"Interdicción marítima, patrulla antisubmarina y control de estrechos.",effect:"Reduce suministro, comercio y control naval del defensor."},
    {id:"amphibiousAssault",icon:"🌊",name:"Asalto anfibio",domain:"Mar / tierra",days:12,cost:5.8,capital:9,fuel:10,munitions:10,requires:["frigate","destroyer","carrier"],description:"Preparación naval, desembarco y cabeza de playa sobre una región costera.",effect:"Puede establecer control territorial si existe superioridad marítima."},
    {id:"landInvasion",icon:"🪖",name:"Invasión terrestre",domain:"Tierra",days:9,cost:4.5,capital:7,fuel:8,munitions:9,requires:["infantry","mechanized","armor"],description:"Ruptura, penetración, cerco y ocupación con apoyo logístico sostenido.",effect:"Avanza el frente y puede ocupar la región elegida."},
    {id:"cyberOffensive",icon:"⌨️",name:"Ofensiva cibernética",domain:"Ciberespacio",days:5,cost:1.8,capital:4,fuel:0,munitions:0,requires:["cyber"],description:"Interrumpe mando, comunicaciones, red eléctrica y movilización enemiga.",effect:"Reduce inteligencia, estabilidad y eficacia logística."},
    {id:"totalWar",icon:"☢️",name:"Guerra total convencional",domain:"Multidominio",days:16,cost:12,capital:18,fuel:18,munitions:22,requires:["infantry","fighter"],description:"Movilización nacional y ofensiva simultánea por tierra, aire, mar y ciberespacio.",effect:"Máxima presión militar con graves costes humanos, económicos y diplomáticos."}
  ];
  const DOCTRINES=[
    {id:"maneuver",name:"Maniobra conjunta",icon:"↗",attack:1.12,losses:1.0,logistics:1.05,description:"Velocidad, sorpresa y coordinación multidominio."},
    {id:"attrition",name:"Desgaste industrial",icon:"⚙",attack:1.08,losses:1.12,logistics:.96,description:"Fuego sostenido y consumo intensivo de reservas."},
    {id:"precision",name:"Dominio de precisión",icon:"◎",attack:1.06,losses:.82,logistics:1.12,description:"Sensores, munición guiada y objetivos de alto valor."},
    {id:"defense",name:"Defensa en profundidad",icon:"⬡",attack:.9,losses:.72,logistics:1.08,description:"Preserva fuerzas y convierte territorio en tiempo."}
  ];

  function country(state,id=state.controlledCountryId){return state.countries.find(c=>c.id===id)}
  function party(state,partyId){return country(state)?.politics?.parties?.find(p=>p.id===partyId)}
  function unitCapability(c,types){return (c.units||[]).some(u=>types.includes(u.typeId)&&(u.quantity||0)>0&&(u.readiness??100)>20)}
  function activeWar(state,id){return (state.wars||[]).find(w=>w.id===id&&!w.ended)}
  function sideFor(w,cId){return w.attacker===cId?"attacker":w.defender===cId?"defender":null}
  function enemyFor(w,cId){return country(window.NEXUS_STATE||{},w.attacker===cId?w.defender:w.attacker)}

  function ensureUnits(state){
    for(const def of state.unitCatalog||[]){
      def.icon=UNIT_ICONS[def.id]||def.icon;
      def.mapGlyph=UNIT_GLYPHS[def.id]||def.mapGlyph||"◆";
      def.name=GENERIC_NAMES[def.id]||def.name;
    }
    for(const c of state.countries||[]){
      const national=NATIONAL_SYSTEMS[c.id]||{};
      const counters={};
      for(const u of c.units||[]){
        counters[u.typeId]=(counters[u.typeId]||0)+1;
        const base=national[u.typeId]||GENERIC_NAMES[u.typeId]||u.name||u.typeId;
        u.displayName ||= counters[u.typeId]>1?`${base} · Grupo ${counters[u.typeId]}`:base;
        if(!u.name||/^(Brigada|Grupo|Regimiento|Ala|Escuadrón|Fragata|Submarino|Satélite)/.test(u.name))u.name=u.displayName;
      }
    }
  }

  function ensurePolitics(state){
    for(const c of state.countries||[]){
      if(!c.politics)continue;
      c.politics.electoralStrategy||={endorsedPartyId:null,momentum:0,campaigns:0,lastCampaignDate:null,history:[]};
    }
  }

  function ensureWars(state){
    for(const w of state.wars||[]){
      w.campaigns||=[];w.doctrines||={attacker:"maneuver",defender:"defense"};
      w.operationalTempo??=35;w.civilianRisk??=12;
    }
  }

  function ensureV19(state){
    state.version="1.9.0-alpha";
    state.mapBase="vector";
    state.settings||={};state.settings.mapAnimations??=true;state.settings.mapGrid??=true;state.settings.showStrategicLabels??=true;
    ensureUnits(state);ensurePolitics(state);ensureWars(state);
    return state;
  }

  function endorseParty(state,partyId){
    const c=country(state),p=party(state,partyId);if(!c||!p)return{ok:false,message:"Partido no disponible."};
    const s=c.politics.electoralStrategy;
    s.endorsedPartyId=partyId;s.momentum=round(clamp((s.momentum||0)+1.5,-20,25),1);
    s.history.unshift({date:state.date,type:"endorsement",partyId});s.history=s.history.slice(0,20);
    return{ok:true,message:`Has elegido a ${p.name} como partido prioritario para las próximas elecciones.`};
  }

  function campaignForParty(state,partyId,intensity="national"){
    const c=country(state),p=party(state,partyId);if(!c||!p)return{ok:false,message:"Partido no disponible."};
    const costs=intensity==="major"?{capital:12,treasury:4.5,gain:3.4}:intensity==="local"?{capital:4,treasury:1.2,gain:1.1}:{capital:7,treasury:2.4,gain:2.1};
    if((c.politics.politicalCapital||0)<costs.capital)return{ok:false,message:`Se necesitan ${costs.capital} puntos de capital político.`};
    if((c.economy.treasury||0)<costs.treasury)return{ok:false,message:`Se necesitan ${costs.treasury} mil M€ de tesorería.`};
    c.politics.politicalCapital=round(c.politics.politicalCapital-costs.capital,1);c.economy.treasury=round(c.economy.treasury-costs.treasury,2);
    const performance=clamp(((c.systems.approval||50)+(c.economy.confidence||50)+(100-(c.economy.unemployment||8)*3))/3,20,90);
    const gain=round(costs.gain*(.72+performance/140),1),others=(c.politics.parties||[]).filter(x=>x.id!==p.id),taken=gain/Math.max(1,others.length);
    p.popularity=round(clamp((p.popularity||0)+gain,.1,80),2);for(const other of others)other.popularity=round(Math.max(.1,(other.popularity||0)-taken),2);
    const total=c.politics.parties.reduce((sum,x)=>sum+(x.popularity||0),0)||100;for(const x of c.politics.parties)x.popularity=round(x.popularity/total*100,2);
    const s=c.politics.electoralStrategy;s.endorsedPartyId=p.id;s.momentum=round(clamp((s.momentum||0)+gain,-20,25),1);s.campaigns=(s.campaigns||0)+1;s.lastCampaignDate=state.date;
    s.history.unshift({date:state.date,type:`campaign:${intensity}`,partyId:p.id,gain});s.history=s.history.slice(0,20);
    E.pushEvent?.(state,"politics",`Campaña electoral de ${p.name}`,`La estrategia ${intensity} aumenta su intención de voto en ${gain} puntos dentro del escenario simulado.`);
    return{ok:true,message:`Campaña completada: ${p.name} gana ${gain} puntos de impulso estimado.`};
  }

  function electionForecast(state,c=country(state)){
    const parties=[...(c?.politics?.parties||[])],strategy=c?.politics?.electoralStrategy||{},performance=clamp(((c.systems.approval||50)+(c.economy.confidence||50)+(100-(c.economy.unemployment||8)*3))/3,0,100);
    const projected=parties.map(p=>{const incumbent=p.id===c.politics.rulingPartyId?(performance-50)*.18:0,backing=p.id===strategy.endorsedPartyId?(strategy.momentum||0)*.55:0;return{...p,projectedVote:Math.max(.1,(p.popularity||0)+incumbent+backing)}});
    const total=projected.reduce((s,p)=>s+p.projectedVote,0)||1;for(const p of projected){p.projectedVote=round(p.projectedVote/total*100,1);p.projectedSeats=Math.max(0,Math.round(p.projectedVote*3.5))}
    return projected.sort((a,b)=>b.projectedSeats-a.projectedSeats);
  }

  function runElection(state,c,automatic=false){
    const strategy=c?.politics?.electoralStrategy,backed=strategy?.endorsedPartyId&&c.politics.parties.find(p=>p.id===strategy.endorsedPartyId);
    if(backed&&strategy.momentum>0){const bonus=Math.min(4,strategy.momentum*.22);backed.popularity=round(backed.popularity+bonus,2)}
    const result=oldRunElection(state,c,automatic);
    if(strategy){strategy.momentum=round((strategy.momentum||0)*.3,1);strategy.lastElectionResult=result?.winnerId||null}
    return result;
  }

  function setWarDoctrine(state,warId,doctrineId){
    const w=activeWar(state,warId),c=country(state),side=w&&sideFor(w,c.id),def=DOCTRINES.find(x=>x.id===doctrineId);
    if(!w||!side||!def)return{ok:false,message:"Doctrina o guerra no disponible."};
    w.doctrines||={};w.doctrines[side]=def.id;w.operations||=[];w.operations.unshift({id:uid(),date:state.date,type:"doctrine",text:`${c.name} adopta la doctrina ${def.name}.`});
    return{ok:true,message:`Doctrina de campaña: ${def.name}.`};
  }

  function launchWarCampaign(state,warId,typeId,targetRegionId=null){
    const w=activeWar(state,warId),c=country(state),side=w&&sideFor(w,c.id),def=CAMPAIGNS.find(x=>x.id===typeId);if(!w||!side||!def)return{ok:false,message:"Operación no disponible para esta guerra."};
    if(w.campaigns?.some(x=>x.side===side&&x.typeId===typeId&&x.status==="active"))return{ok:false,message:"Ya hay una campaña de este tipo en curso."};
    if(!unitCapability(c,def.requires))return{ok:false,message:`Falta una capacidad militar válida: ${def.requires.map(x=>GENERIC_NAMES[x]||x).join(" / ")}.`};
    c.strategicStockpile||={fuel:100,munitions:100};
    if((c.economy.treasury||0)<def.cost)return{ok:false,message:`Tesorería insuficiente: requiere ${def.cost} mil M€.`};
    if((c.politics?.politicalCapital||0)<def.capital)return{ok:false,message:`Capital político insuficiente: requiere ${def.capital}.`};
    if((c.strategicStockpile.fuel||0)<def.fuel||(c.strategicStockpile.munitions||0)<def.munitions)return{ok:false,message:"Reservas de combustible o munición insuficientes."};
    const enemy=country(state,w.attacker===c.id?w.defender:w.attacker),regions=E.getCountryRegions?.(state,enemy.id)||[],target=regions.find(r=>r.id===targetRegionId)||regions[0]||null;
    c.economy.treasury=round(c.economy.treasury-def.cost,2);c.politics.politicalCapital=round(c.politics.politicalCapital-def.capital,1);c.strategicStockpile.fuel=round(c.strategicStockpile.fuel-def.fuel,1);c.strategicStockpile.munitions=round(c.strategicStockpile.munitions-def.munitions,1);
    const campaign={id:uid(),warId:w.id,typeId:def.id,name:def.name,icon:def.icon,domain:def.domain,side,status:"active",startDate:state.date,days:0,totalDays:def.days,progress:0,targetCountryId:enemy.id,targetRegionId:target?.id||null,targetName:target?.name||enemy.name,from:[c.map?.lat||0,c.map?.lng||0],to:[target?.lat??enemy.map?.lat??0,target?.lng??enemy.map?.lng??0],impact:0};
    w.campaigns||=[];w.campaigns.unshift(campaign);w.operationalTempo=clamp((w.operationalTempo||35)+7,0,100);w.phase=`${def.domain}: ${def.name}`;w.operations||=[];w.operations.unshift({id:uid(),date:state.date,type:def.id,text:`${c.name} inicia ${def.name.toLowerCase()} sobre ${campaign.targetName}.`});
    E.pushEvent?.(state,"military",`${def.icon} ${def.name}`,`${c.name} abre una operación ${def.domain.toLowerCase()} contra ${campaign.targetName}. Duración prevista: ${def.days} días.`);
    return{ok:true,message:`${def.name} iniciada sobre ${campaign.targetName}.`,campaignId:campaign.id};
  }

  function applyCampaignResult(state,w,op){
    const actor=country(state,op.side==="attacker"?w.attacker:w.defender),enemy=country(state,op.targetCountryId),def=CAMPAIGNS.find(x=>x.id===op.typeId),doctrine=DOCTRINES.find(x=>x.id===(w.doctrines?.[op.side]||"maneuver"))||DOCTRINES[0],region=E.getRegion?.(state,enemy.id,op.targetRegionId);
    if(!actor||!enemy||!def)return;
    const actorPower=E.countryCombatPower?.(state,actor)?.total||actor.systems.military||50,enemyPower=E.countryCombatPower?.(state,enemy)?.total||enemy.systems.military||50;
    const readiness=(actor.militaryReadiness||60)/100,logistics=(actor.systems.logistics||60)/100,ratio=clamp(actorPower/Math.max(1,enemyPower),.35,2.4);
    const impact=round(clamp((18+ratio*15)*readiness*logistics*doctrine.attack,8,62),1),direction=op.side==="attacker"?1:-1;op.impact=impact;op.completedDate=state.date;op.status="completed";op.progress=100;
    if(op.typeId==="airSuperiority"){w.airSuperiority||={attacker:50,defender:50};w.airSuperiority[op.side]=clamp((w.airSuperiority[op.side]||50)+impact*.42,0,100);enemy.militaryReadiness=clamp((enemy.militaryReadiness||60)-impact*.08,0,100)}
    if(op.typeId==="precisionStrike"){enemy.systems.logistics=clamp(enemy.systems.logistics-impact*.07,0,100);enemy.systems.energy=clamp(enemy.systems.energy-impact*.045,0,100);if(region){region.infra=clamp((region.infra||50)-impact*.08,0,100);region.energy=clamp((region.energy||50)-impact*.06,0,100)}}
    if(op.typeId==="navalBlockade"){w.navalControl||={attacker:50,defender:50};w.navalControl[op.side]=clamp((w.navalControl[op.side]||50)+impact*.45,0,100);enemy.economy.tradeBalance=round((enemy.economy.tradeBalance||0)-impact*.03,2)}
    if(op.typeId==="cyberOffensive"){enemy.systems.intelligence=clamp(enemy.systems.intelligence-impact*.08,0,100);enemy.systems.stability=clamp(enemy.systems.stability-impact*.045,0,100);enemy.systems.logistics=clamp(enemy.systems.logistics-impact*.04,0,100)}
    if(["landInvasion","amphibiousAssault"].includes(op.typeId)&&region&&impact>22){region.controllerId=actor.id;w.occupiedRegions||=[];if(!w.occupiedRegions.includes(region.id))w.occupiedRegions.push(region.id);w.territoryControl=clamp((w.territoryControl||0)+direction*impact*.28,-100,100)}
    if(op.typeId==="totalWar"){enemy.militaryReadiness=clamp((enemy.militaryReadiness||60)-impact*.2,0,100);enemy.systems.logistics=clamp(enemy.systems.logistics-impact*.12,0,100);actor.economy.growth=clamp(actor.economy.growth-.35,-12,15);w.civilianLosses=(w.civilianLosses||0)+Math.round(impact*180);w.civilianRisk=clamp((w.civilianRisk||12)+28,0,100)}
    w.warScore=clamp((w.warScore||0)+direction*impact*(op.typeId==="totalWar"?.42:.23),-100,100);w.intensity=clamp((w.intensity||35)+impact*.15,0,100);
    w.operations.unshift({id:uid(),date:state.date,type:`${op.typeId}:complete`,text:`${def.name} finaliza sobre ${op.targetName}: impacto operacional ${impact}/100.`});
    E.pushEvent?.(state,"battle",`${def.icon} ${def.name} completada`,`${actor.name} obtiene un impacto operacional de ${impact}/100 sobre ${op.targetName}.`);
  }

  function processCampaigns(state){
    for(const w of state.wars||[]){if(w.ended)continue;ensureWars({wars:[w]});for(const op of w.campaigns||[]){if(op.status!=="active")continue;op.days=(op.days||0)+1;op.progress=round(clamp(op.days/Math.max(1,op.totalDays)*100,0,100),1);if(op.days>=op.totalDays)applyCampaignResult(state,w,op)}}
  }

  function mobilizeReserves(state,warId){
    const w=activeWar(state,warId),c=country(state),side=w&&sideFor(w,c.id);if(!w||!side)return{ok:false,message:"No participas en esa guerra."};
    if((c.economy.treasury||0)<4||(c.politics.politicalCapital||0)<6)return{ok:false,message:"La movilización requiere 4 mil M€ y 6 puntos políticos."};
    c.economy.treasury=round(c.economy.treasury-4,2);c.politics.politicalCapital=round(c.politics.politicalCapital-6,1);c.militaryReadiness=clamp((c.militaryReadiness||60)+9,0,100);c.economy.unemployment=clamp((c.economy.unemployment||7)-.1,1,50);c.economy.growth=clamp((c.economy.growth||2)-.08,-12,15);
    w.operations.unshift({id:uid(),date:state.date,type:"mobilization",text:`${c.name} moviliza reservas y eleva la preparación de sus fuerzas.`});return{ok:true,message:"Reservas movilizadas: +9 de preparación militar."};
  }

  function tickDay(state){const summary=oldTick(state);ensureV19(state);processCampaigns(state);return summary}
  function createInitialState(){const state=ensureV19(oldCreate());E.pushEvent?.(state,"system","NEXUS Global Alpha v1.9.0","Tablero estratégico fluido, campañas multidominio, estrategia electoral elegible e identificación militar nacional activados.");return state}
  function hydrateV19(state){return ensureV19(oldHydrate(state))}

  Object.assign(E,{createInitialState,hydrateState:hydrateV19,tickDay,runElection,endorseParty,campaignForParty,electionForecast,launchWarCampaign,setWarDoctrine,mobilizeReserves,processCampaigns,campaignDefinitions:CAMPAIGNS,warDoctrineDefinitions:DOCTRINES,unitIconPaths:UNIT_ICONS,version19:true});
})();
