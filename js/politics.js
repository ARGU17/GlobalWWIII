"use strict";

window.NEXUS_POLITICS = (() => {
  const regimes = [
    {id:"parliamentary_democracy",name:"Democracia parlamentaria",pluralism:92,economicFreedom:72,stateControl:42,stability:4,approval:2,description:"Gobierno responsable ante el parlamento, elecciones competitivas y separación de poderes."},
    {id:"constitutional_monarchy",name:"Monarquía constitucional parlamentaria",pluralism:90,economicFreedom:73,stateControl:43,stability:6,approval:2,description:"Jefatura del Estado monárquica y poder ejecutivo sometido al parlamento."},
    {id:"presidential_democracy",name:"República presidencialista",pluralism:85,economicFreedom:75,stateControl:38,stability:2,approval:1,description:"Presidente elegido directamente con amplias competencias ejecutivas."},
    {id:"semi_presidential",name:"República semipresidencialista",pluralism:82,economicFreedom:70,stateControl:45,stability:3,approval:1,description:"Poder compartido entre presidencia y gobierno parlamentario."},
    {id:"federal_democracy",name:"Democracia federal",pluralism:91,economicFreedom:76,stateControl:34,stability:5,approval:2,description:"Soberanía distribuida entre el Estado federal y sus territorios."},
    {id:"social_democracy",name:"Democracia social avanzada",pluralism:88,economicFreedom:62,stateControl:56,stability:6,approval:4,description:"Mercado regulado, alta protección social y negociación colectiva."},
    {id:"liberal_republic",name:"República liberal de mercado",pluralism:82,economicFreedom:90,stateControl:22,stability:1,approval:0,description:"Instituciones representativas con baja intervención económica."},
    {id:"technocracy",name:"Tecnocracia meritocrática",pluralism:45,economicFreedom:70,stateControl:58,stability:7,approval:-2,description:"Decisiones concentradas en órganos técnicos y agencias especializadas."},
    {id:"capitalist_authoritarian",name:"Autoritarismo capitalista liberal",pluralism:20,economicFreedom:86,stateControl:44,stability:8,approval:-5,description:"Mercados abiertos bajo un poder político centralizado y oposición limitada."},
    {id:"developmental_state",name:"Estado desarrollista",pluralism:40,economicFreedom:64,stateControl:72,stability:7,approval:1,description:"Planificación industrial, crédito dirigido y estrategia exportadora."},
    {id:"one_party_socialist",name:"Estado socialista de partido único",pluralism:8,economicFreedom:28,stateControl:92,stability:8,approval:-4,description:"Partido hegemónico, planificación económica y control institucional amplio."},
    {id:"military_junta",name:"Junta militar",pluralism:5,economicFreedom:48,stateControl:78,stability:-2,approval:-10,description:"Las Fuerzas Armadas controlan directamente el gobierno y la seguridad."},
    {id:"personalist_dictatorship",name:"Dictadura personalista",pluralism:2,economicFreedom:40,stateControl:86,stability:-4,approval:-12,description:"El poder político depende de un líder, su círculo y aparatos coercitivos."},
    {id:"absolute_monarchy",name:"Monarquía absoluta",pluralism:4,economicFreedom:58,stateControl:84,stability:7,approval:-3,description:"La Corona concentra la autoridad ejecutiva, legislativa y estratégica."},
    {id:"theocracy",name:"República teocrática",pluralism:12,economicFreedom:42,stateControl:82,stability:3,approval:-7,description:"La legitimidad política y el orden jurídico se subordinan a instituciones religiosas."},
    {id:"confederation",name:"Confederación soberana",pluralism:86,economicFreedom:74,stateControl:28,stability:1,approval:2,description:"Unión flexible de territorios con amplia autonomía y gobierno central limitado."},
    {id:"emergency_government",name:"Gobierno de emergencia nacional",pluralism:28,economicFreedom:52,stateControl:76,stability:4,approval:-6,description:"Poderes extraordinarios temporales para afrontar guerra, crisis o colapso institucional."}
  ];

  const P = (id,name,ideology,color,popularity) => ({id,name,ideology,color,popularity});

  // Base de partidos reales para países con mayor peso estratégico. En los demás casos
  // se genera una estructura política nacional coherente para que el sistema siempre funcione.
  const realParties = {
    ESP:[P("psoe","PSOE","Socialdemocracia","#e43b3b",31),P("pp","Partido Popular","Conservadurismo liberal","#3d7fd9",34),P("vox","Vox","Nacional-conservadurismo","#62a83b",15),P("sumar","Sumar","Izquierda progresista","#dc58b2",9),P("erc","ERC","Republicanismo catalán","#e6c447",4),P("junts","Junts per Catalunya","Nacionalismo catalán","#48a6a6",3),P("pnv","EAJ-PNV","Nacionalismo vasco democristiano","#4c9b58",2),P("bildu","EH Bildu","Izquierda soberanista vasca","#9cc63b",2)],
    FRA:[P("ren","Renaissance","Liberalismo centrista","#f0b92d",20),P("rn","Rassemblement National","Nacionalismo","#294b8f",31),P("lfi","La France Insoumise","Izquierda populista","#d64d3b",19),P("lr","Les Républicains","Conservadurismo","#3978c5",10),P("ps","Parti Socialiste","Socialdemocracia","#e45b73",10),P("verts","Les Écologistes","Ecologismo","#49a866",6)],
    DEU:[P("cdu","CDU/CSU","Democracia cristiana","#252525",29),P("spd","SPD","Socialdemocracia","#d63a3a",20),P("afd","AfD","Nacional-conservadurismo","#4d8cc9",19),P("gruene","Bündnis 90/Die Grünen","Ecologismo","#4b9e45",13),P("fdp","FDP","Liberalismo","#e5cf37",5),P("linke","Die Linke","Socialismo democrático","#b84a9c",7),P("bsw","BSW","Izquierda soberanista","#7b3a63",7)],
    ITA:[P("fdi","Fratelli d’Italia","Conservadurismo nacional","#213f72",28),P("pd","Partito Democratico","Socialdemocracia","#d94a4a",23),P("m5s","Movimento 5 Stelle","Populismo","#e4cf33",17),P("lega","Lega","Federalismo nacional-conservador","#4f9c55",9),P("fi","Forza Italia","Liberal-conservadurismo","#4d86d1",8)],
    PRT:[P("ps","Partido Socialista","Socialdemocracia","#d94a4a",28),P("ad","Aliança Democrática","Centro-derecha","#4384d1",31),P("chega","Chega","Nacional-conservadurismo","#26304e",18),P("il","Iniciativa Liberal","Liberalismo","#4ca5c6",8),P("be","Bloco de Esquerda","Izquierda","#c94b65",5),P("livre","Livre","Ecologismo progresista","#64a85b",5)],
    GBR:[P("lab","Labour Party","Socialdemocracia","#d94a4a",39),P("con","Conservative Party","Conservadurismo","#3e7fd1",24),P("reform","Reform UK","Derecha populista","#42a5a4",18),P("libdem","Liberal Democrats","Liberalismo social","#e3bf35",12),P("green","Green Party","Ecologismo","#4a9d58",7)],
    USA:[P("dem","Democratic Party","Liberalismo social","#3e7fd1",48),P("gop","Republican Party","Conservadurismo","#d94a4a",48),P("lib","Libertarian Party","Libertarismo","#d8b83d",2),P("green","Green Party","Ecologismo","#4a9d58",1)],
    CAN:[P("lib","Liberal Party","Liberalismo","#d94a4a",31),P("con","Conservative Party","Conservadurismo","#3e7fd1",38),P("ndp","New Democratic Party","Socialdemocracia","#e08b34",18),P("bloc","Bloc Québécois","Nacionalismo quebequés","#57a7c6",8),P("green","Green Party","Ecologismo","#4a9d58",4)],
    MEX:[P("morena","Morena","Izquierda nacional-popular","#8b3f48",45),P("pan","PAN","Democracia cristiana","#3e7fd1",24),P("pri","PRI","Centrismo institucional","#d94a4a",13),P("mc","Movimiento Ciudadano","Socialdemocracia liberal","#e18438",14)],
    BRA:[P("pt","Partido dos Trabalhadores","Izquierda","#d94a4a",31),P("pl","Partido Liberal","Derecha conservadora","#3e7fd1",29),P("mdb","MDB","Centrismo","#4a9d58",12),P("psd","PSD","Centro-derecha","#5f83b4",12),P("psol","PSOL","Izquierda socialista","#b84a9c",5)],
    ARG:[P("lla","La Libertad Avanza","Liberalismo libertario","#8b5bc1",36),P("pj","Partido Justicialista","Peronismo","#4e8bc9",32),P("pro","PRO","Liberal-conservadurismo","#e2c341",14),P("ucr","UCR","Social-liberalismo","#d94a4a",11)],
    CHL:[P("fa","Frente Amplio","Izquierda progresista","#7b4db6",25),P("udi","UDI","Conservadurismo","#3e7fd1",19),P("rn","Renovación Nacional","Liberal-conservadurismo","#4d8fd8",18),P("ps","Partido Socialista","Socialismo democrático","#d94a4a",14),P("pdg","Partido de la Gente","Populismo","#5c708f",9)],
    COL:[P("ph","Pacto Histórico","Izquierda progresista","#8b4db6",29),P("cd","Centro Democrático","Conservadurismo","#3e7fd1",22),P("lib","Partido Liberal","Liberalismo","#d94a4a",14),P("cons","Partido Conservador","Conservadurismo","#315f99",12),P("verde","Alianza Verde","Ecologismo","#4a9d58",11)],
    VEN:[P("psuv","PSUV","Socialismo bolivariano","#d94a4a",38),P("pu","Plataforma Unitaria","Coalición democrática","#3e7fd1",45),P("avp","Alianza del Lápiz","Centro reformista","#e0b63d",5)],
    RUS:[P("ur","Rusia Unida","Conservadurismo estatal","#3e7fd1",52),P("kprf","Partido Comunista de la Federación Rusa","Comunismo","#d94a4a",15),P("ldpr","LDPR","Nacionalismo","#4d8fd8",10),P("np","Gente Nueva","Liberalismo moderado","#55b0a0",8)],
    UKR:[P("sn","Servidor del Pueblo","Centrismo","#6baa51",33),P("es","Solidaridad Europea","Liberal-conservadurismo","#3e7fd1",18),P("bat","Batkivshchyna","Nacional-democracia","#d94a4a",11),P("holos","Holos","Liberalismo","#e3bf35",8)],
    POL:[P("ko","Coalición Cívica","Liberalismo conservador","#3e7fd1",32),P("pis","Ley y Justicia","Conservadurismo nacional","#285c9b",31),P("td","Tercera Vía","Centrismo","#d5b73f",13),P("lewica","La Izquierda","Socialdemocracia","#d94a4a",10),P("konf","Confederación","Derecha libertaria","#47385f",11)],
    NLD:[P("pvv","PVV","Nacionalismo","#253e77",24),P("glpvda","GroenLinks-PvdA","Socialdemocracia verde","#4a9d58",22),P("vvd","VVD","Liberal-conservadurismo","#3e7fd1",18),P("nsc","NSC","Democracia cristiana","#436e8c",12),P("d66","D66","Liberalismo social","#69a55a",9)],
    BEL:[P("nva","N-VA","Nacionalismo flamenco","#e0c33f",22),P("vb","Vlaams Belang","Nacionalismo flamenco radical","#2e2e2e",18),P("ps","Parti Socialiste","Socialdemocracia","#d94a4a",14),P("mr","Mouvement Réformateur","Liberalismo","#3e7fd1",14),P("vooruit","Vooruit","Socialdemocracia","#d45f65",11)],
    SWE:[P("sap","Socialdemokraterna","Socialdemocracia","#d94a4a",34),P("sd","Sverigedemokraterna","Nacional-conservadurismo","#e2c341",21),P("m","Moderaterna","Liberal-conservadurismo","#3e7fd1",20),P("v","Vänsterpartiet","Socialismo democrático","#b83d55",8),P("c","Centerpartiet","Liberalismo agrario","#4a9d58",6)],
    NOR:[P("ap","Arbeiderpartiet","Socialdemocracia","#d94a4a",28),P("h","Høyre","Conservadurismo liberal","#3e7fd1",25),P("frp","Fremskrittspartiet","Liberalismo conservador","#244b8d",17),P("sp","Senterpartiet","Agrarismo","#4a9d58",9),P("sv","Sosialistisk Venstreparti","Socialismo democrático","#b84a63",8)],
    FIN:[P("kok","Partido de Coalición Nacional","Liberal-conservadurismo","#3e7fd1",22),P("ps","Partido de los Finlandeses","Nacional-conservadurismo","#e2c341",20),P("sdp","Partido Socialdemócrata","Socialdemocracia","#d94a4a",19),P("kesk","Partido del Centro","Agrarismo","#4a9d58",11),P("vihr","Liga Verde","Ecologismo","#58a65c",9)],
    DNK:[P("s","Socialdemokratiet","Socialdemocracia","#d94a4a",27),P("v","Venstre","Liberalismo agrario","#3e7fd1",14),P("sf","Socialistisk Folkeparti","Socialismo verde","#b84a63",13),P("la","Liberal Alliance","Liberalismo clásico","#5fa7c6",10),P("dd","Danmarksdemokraterne","Conservadurismo nacional","#365b7c",9)],
    CHE:[P("svp","SVP/UDC","Conservadurismo nacional","#4a9d58",29),P("sp","SP/PS","Socialdemocracia","#d94a4a",18),P("fdp","FDP/PLR","Liberalismo","#3e7fd1",15),P("center","El Centro","Democracia cristiana","#e4a53d",14),P("greens","Los Verdes","Ecologismo","#58a65c",10)],
    AUT:[P("ovp","ÖVP","Democracia cristiana","#3c7d82",25),P("fpo","FPÖ","Nacional-conservadurismo","#3e7fd1",29),P("spo","SPÖ","Socialdemocracia","#d94a4a",22),P("grune","Los Verdes","Ecologismo","#4a9d58",10),P("neos","NEOS","Liberalismo","#d85b9f",9)],
    GRC:[P("nd","Nueva Democracia","Liberal-conservadurismo","#3e7fd1",35),P("syriza","SYRIZA","Izquierda progresista","#b84a9c",13),P("pasok","PASOK-KINAL","Socialdemocracia","#4a9d58",17),P("kke","KKE","Comunismo","#d94a4a",8)],
    TUR:[P("akp","AK Parti","Conservadurismo nacional","#e0a33b",34),P("chp","CHP","Socialdemocracia kemalista","#d94a4a",31),P("mhp","MHP","Nacionalismo turco","#8b3f48",10),P("dem","DEM Parti","Izquierda prokurda","#7a5db6",9),P("iyi","İYİ Parti","Nacionalismo secular","#4d8fd8",6)],
    ISR:[P("likud","Likud","Conservadurismo nacional","#3e7fd1",25),P("yesh","Yesh Atid","Liberalismo centrista","#58a6c7",18),P("unity","Unidad Nacional","Centrismo","#405f89",16),P("shas","Shas","Conservadurismo religioso","#303040",9),P("labor","Los Demócratas","Socialdemocracia","#d94a4a",9),P("raam","Ra'am","Islamismo democrático","#4a9d58",5)],
    IRN:[P("principlists","Frente Principalista","Conservadurismo teocrático","#315f4b",45),P("reformists","Frente Reformista","Reformismo islámico","#4a9d58",33),P("moderates","Moderados","Centrismo religioso","#5f8bb4",15)],
    SAU:[P("royal","Casa de Saúd","Monarquía absoluta","#4a9d58",72),P("technocrats","Consejo de Desarrollo","Tecnocracia estatal","#4d8fd8",20)],
    EGY:[P("mostaqbal","Mostaqbal Watan","Nacionalismo estatal","#3e7fd1",56),P("rpp","Partido Popular Republicano","Centro-derecha","#d6a43c",16),P("wafd","Nuevo Wafd","Liberalismo nacional","#4a9d58",10)],
    MAR:[P("rni","RNI","Liberalismo monárquico","#4d8fd8",30),P("pam","PAM","Modernismo","#5473a6",25),P("istiqlal","Istiqlal","Nacionalismo conservador","#d94a4a",21),P("pjd","PJD","Democracia islámica","#4a9d58",12)],
    DZA:[P("fln","FLN","Nacionalismo estatal","#4a9d58",32),P("rnd","RND","Centrismo nacional","#3e7fd1",21),P("msp","Movimiento de la Sociedad por la Paz","Democracia islámica","#6b8e4d",15),P("ffs","Frente de Fuerzas Socialistas","Socialdemocracia","#d94a4a",10)],
    ZAF:[P("anc","African National Congress","Nacionalismo socialdemócrata","#4a9d58",38),P("da","Democratic Alliance","Liberalismo","#3e7fd1",22),P("mk","uMkhonto weSizwe","Populismo nacional","#2c4f39",15),P("eff","Economic Freedom Fighters","Socialismo panafricano","#d94a4a",10)],
    NGA:[P("apc","All Progressives Congress","Centro-derecha","#4a9d58",40),P("pdp","People's Democratic Party","Centrismo","#d94a4a",30),P("lp","Labour Party","Socialdemocracia","#c25e7a",22)],
    KEN:[P("uda","United Democratic Alliance","Conservadurismo","#e1b63b",38),P("odm","Orange Democratic Movement","Socialdemocracia","#e17d36",31),P("wiper","Wiper Democratic Movement","Liberalismo","#3e7fd1",12)],
    ETH:[P("pp","Prosperity Party","Federalismo desarrollista","#4a9d58",58),P("ezema","Ethiopian Citizens for Social Justice","Democracia social","#3e7fd1",17)],
    CHN:[P("ccp","Partido Comunista de China","Socialismo con características chinas","#d94a4a",84),P("rcck","Comité Revolucionario del Kuomintang","Frente unido","#e2b341",5),P("cdl","Liga Democrática de China","Frente unido","#4d8fd8",4)],
    JPN:[P("ldp","Partido Liberal Democrático","Conservadurismo","#3e7fd1",33),P("cdp","Partido Democrático Constitucional","Liberalismo social","#4d8fd8",21),P("ishin","Nippon Ishin no Kai","Reformismo liberal","#58a6c7",14),P("komeito","Komeito","Humanismo budista","#e3c240",9),P("dpp","Partido Democrático para el Pueblo","Centrismo","#d8a33f",8)],
    KOR:[P("dp","Partido Democrático de Corea","Liberalismo social","#3e7fd1",45),P("ppp","People Power Party","Conservadurismo","#d94a4a",36),P("reform","Reform Party","Reformismo liberal","#e0a53d",8)],
    IND:[P("bjp","Bharatiya Janata Party","Nacional-conservadurismo","#e18a36",40),P("inc","Indian National Congress","Liberalismo social","#4d8fd8",27),P("aap","Aam Aadmi Party","Populismo anticorrupción","#58a6c7",7),P("tmc","All India Trinamool Congress","Regionalismo socialdemócrata","#4a9d58",7)],
    PAK:[P("pmln","Pakistan Muslim League (N)","Conservadurismo","#4a9d58",27),P("pti","Pakistan Tehreek-e-Insaf","Populismo nacional","#d94a4a",35),P("ppp","Pakistan Peoples Party","Socialdemocracia","#3e7fd1",22)],
    BGD:[P("al","Awami League","Nacionalismo secular","#4a9d58",39),P("bnp","Bangladesh Nationalist Party","Nacional-conservadurismo","#3e7fd1",38),P("jp","Jatiya Party","Centrismo","#d8a33f",12)],
    IDN:[P("pdip","PDI-P","Nacionalismo social","#d94a4a",18),P("gerindra","Gerindra","Nacionalismo","#8b3f48",20),P("golkar","Golkar","Centrismo desarrollista","#e2b341",16),P("pkb","PKB","Democracia islámica","#4a9d58",11),P("nasdem","NasDem","Nacionalismo liberal","#3e7fd1",10)],
    AUS:[P("alp","Australian Labor Party","Socialdemocracia","#d94a4a",34),P("lnp","Liberal-National Coalition","Liberal-conservadurismo","#3e7fd1",35),P("greens","Australian Greens","Ecologismo","#4a9d58",13),P("one","One Nation","Nacional-conservadurismo","#e0a33b",7)],
    NZL:[P("national","New Zealand National Party","Liberal-conservadurismo","#3e7fd1",37),P("labour","New Zealand Labour Party","Socialdemocracia","#d94a4a",27),P("green","Green Party","Ecologismo","#4a9d58",12),P("act","ACT New Zealand","Liberalismo clásico","#e0b63b",9),P("nzf","New Zealand First","Populismo nacional","#20252e",7)]
  };

  function deterministicParties(country) {
    const base = country.name.replace(/^(República|Reino|Estado|Federación)\s+(de|del|la)?\s*/i, "");
    return [
      P(`${country.id}-gov`,`Partido de Gobierno de ${base}`,"Centrismo nacional",country.color||"#4d8fd8",42),
      P(`${country.id}-opp`,`Alianza Democrática de ${base}`,"Democracia liberal","#d94a4a",31),
      P(`${country.id}-soc`,`Movimiento Social de ${base}`,"Socialdemocracia","#4a9d58",17),
      P(`${country.id}-ref`,`Plataforma Reformista de ${base}`,"Reformismo","#d8a33f",10)
    ];
  }

  function defaultRegime(countryId) {
    const absolute = new Set(["SAU","OMN","QAT","ARE","BRN","SWZ"]);
    const oneParty = new Set(["CHN","PRK","CUB","VNM","LAO"]);
    const theocratic = new Set(["IRN","VAT"]);
    const authoritarian = new Set(["RUS","BLR","TKM","ERI","SYR"]);
    const monarchies = new Set(["ESP","GBR","NLD","BEL","DNK","NOR","SWE","JPN","THA","KHM","JOR","MAR","MYS","LUX","LIE","MCO"]);
    const presidential = new Set(["USA","BRA","ARG","MEX","COL","CHL","PER","VEN","TUR","IDN","PHL","KOR","NGA","KEN","ZAF"]);
    if(absolute.has(countryId)) return "absolute_monarchy";
    if(oneParty.has(countryId)) return "one_party_socialist";
    if(theocratic.has(countryId)) return "theocracy";
    if(authoritarian.has(countryId)) return "capitalist_authoritarian";
    if(monarchies.has(countryId)) return "constitutional_monarchy";
    if(presidential.has(countryId)) return "presidential_democracy";
    return "parliamentary_democracy";
  }

  function buildPolitics(country) {
    const parties = (realParties[country.id] || deterministicParties(country)).map(p=>({...p}));
    const ruling = [...parties].sort((a,b)=>b.popularity-a.popularity)[0];
    const regimeId = defaultRegime(country.id);
    return {
      regimeId,
      parties,
      rulingPartyId:ruling.id,
      coalition:[ruling.id],
      politicalCapital:65,
      electionCycleDays:regimeId.includes("democracy")||regimeId.includes("parliamentary")||regimeId.includes("presidential")||regimeId.includes("monarchy")?1460:9999,
      daysToElection:regimeId.includes("democracy")||regimeId.includes("parliamentary")||regimeId.includes("presidential")||regimeId.includes("monarchy")?720:9999,
      oppositionFreedom:regimes.find(r=>r.id===regimeId)?.pluralism||40,
      lastTransition:null,
      realPartyData:Boolean(realParties[country.id])
    };
  }

  function getRegime(id){return regimes.find(r=>r.id===id)||regimes[0]}
  function getParties(countryId,country){return (realParties[countryId]||deterministicParties(country)).map(p=>({...p}))}

  return {regimes,realParties,buildPolitics,getRegime,getParties};
})();
