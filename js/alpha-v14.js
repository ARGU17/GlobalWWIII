"use strict";

/* NEXUS Global Alpha v1.4
   - Cola de construcción transaccional (sin pérdida de dinero ni proyectos)
   - Regiones estratégicas para todos los países
   - Industrias, tecnologías y empresas ampliadas
   - Despliegue, movimiento y conquista regional de unidades
   - Coaliciones políticas con compatibilidad ideológica
   Todos los precios bursátiles y estados financieros son ficticios.
*/
(() => {
  const E = window.NEXUS_ECONOMY;
  const C = window.NEXUS_CATALOG;
  const W = window.NEXUS_WORLD;
  if (!E || !C || !W) throw new Error("alpha-v14.js requiere NEXUS_ECONOMY, NEXUS_CATALOG y NEXUS_WORLD.");

  const oldCreate = E.createInitialState;
  const oldHydrate = E.hydrateState;
  const oldTickDay = E.tickDay;
  const oldUpgradeBuilding = E.upgradeBuilding;
  const oldCalculateResourceBalance = E.calculateResourceBalance;
  const oldRecalculateCountryEconomy = E.recalculateCountryEconomy;
  const oldDeployUnit = E.deployUnit;

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const round = (v,d=2)=>Number((Number(v)||0).toFixed(d));
  const clone = v=>JSON.parse(JSON.stringify(v));
  const uid = ()=>crypto.randomUUID?.() || `nexus-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const LANDLOCKED = new Set(["AFG","AND","ARM","AUT","AZE","BDI","BFA","BTN","BLR","BOL","BWA","CAF","TCD","CZE","ETH","HUN","KAZ","KGZ","LAO","LSO","LIE","LUX","MDA","MLI","MNG","MWI","MKD","NER","NPL","PRY","RWA","SMR","SRB","SVK","SSD","SWZ","CHE","TJK","TKM","UGA","UZB","VAT","XKX","ZMB","ZWE"]);

  const NEW_BUILDINGS = [
    {id:"foodPlant",category:"Industria",icon:"🥫",name:"Complejo alimentario",cost:8.5,months:9,description:"Procesado, conservación, frío industrial y exportación alimentaria.",family:"Industria alimentaria",maxLevel:5,slots:1,jobs:4300,energy:-2.4,output:4.8,capacity:"1,6 Mt de alimentos/año",requires:{infra:46,energy:44},resourceEffects:{food:4.8,machinery:.5}},
    {id:"agriHub",category:"Industria",icon:"🌾",name:"Distrito agroindustrial",cost:7.2,months:8,description:"Riego inteligente, cooperativas, silos y transformación primaria.",family:"Agroindustria",maxLevel:5,slots:1,jobs:5200,energy:-1.5,output:4.1,capacity:"420.000 ha productivas",requires:{infra:40},resourceEffects:{food:6.2}},
    {id:"pharmaPlant",category:"Industria",icon:"💊",name:"Planta farmacéutica",cost:16.5,months:16,description:"Principios activos, genéricos, vacunas y medicamentos hospitalarios.",family:"Industria farmacéutica",maxLevel:5,slots:2,jobs:5100,energy:-3.1,output:8.0,capacity:"2.400 M de dosis/año",requires:{infra:62,energy:58,technology:68},resourceEffects:{medicines:9.2,electronics:.4}},
    {id:"biotechCampus",category:"Industria",icon:"🧬",name:"Campus biotecnológico",cost:22,months:22,description:"Biológicos, terapias avanzadas y diagnóstico de precisión.",family:"Biotecnología y conocimiento",maxLevel:4,slots:2,jobs:4600,energy:-3.6,output:9.8,capacity:"12 líneas clínicas y 4 plantas piloto",requires:{infra:70,energy:65,technology:78},resourceEffects:{medicines:11,electronics:1.2}},
    {id:"refinery",category:"Industria",icon:"🛢️",name:"Refinería integrada",cost:19,months:19,description:"Combustibles, lubricantes y materias primas petroquímicas.",family:"Industria petrolífera",maxLevel:4,slots:3,jobs:3900,energy:-5.8,output:8.2,capacity:"11 Mt de crudo/año",requires:{infra:62,energy:65,coastal:true},resourceEffects:{fuel:10.5}},
    {id:"oilField",category:"Energía",icon:"🛢️",name:"Campo petrolífero",cost:14,months:15,description:"Extracción terrestre o marina con recuperación avanzada.",family:"Extracción energética",maxLevel:5,slots:2,jobs:2300,energy:-1.1,output:7.4,capacity:"155.000 barriles/día",requires:{infra:48,stability:55},resourceEffects:{fuel:12.5}},
    {id:"gasField",category:"Energía",icon:"🔥",name:"Yacimiento de gas",cost:13,months:14,description:"Extracción y tratamiento de gas natural.",family:"Extracción energética",maxLevel:5,slots:2,jobs:1900,energy:1.2,output:6.8,capacity:"8 bcm/año",requires:{infra:46,stability:55},resourceEffects:{fuel:8.5,electricity:1.2}},
    {id:"lngTerminal",category:"Infraestructura",icon:"🚢",name:"Terminal de GNL",cost:12,months:12,description:"Regasificación, almacenamiento y expedición marítima.",family:"Logística energética",maxLevel:5,slots:2,jobs:1400,energy:-1.0,output:5.2,capacity:"9 bcm/año",requires:{infra:54,coastal:true},resourceEffects:{fuel:3.6}},
    {id:"petrochemical",category:"Industria",icon:"⚗️",name:"Complejo petroquímico",cost:18,months:18,description:"Polímeros, fertilizantes y productos químicos base.",family:"Industria química",maxLevel:5,slots:2,jobs:5400,energy:-5.5,output:8.1,capacity:"3,5 Mt/año",requires:{infra:60,energy:66},resourceEffects:{machinery:3.5,fuel:-1.2}},
    {id:"chemicalPlant",category:"Industria",icon:"🧪",name:"Planta química avanzada",cost:14,months:14,description:"Especialidades químicas, materiales y reactivos industriales.",family:"Industria química",maxLevel:5,slots:2,jobs:4100,energy:-4.1,output:6.9,capacity:"1,2 Mt/año",requires:{infra:56,energy:58,technology:58},resourceEffects:{machinery:3.4,medicines:1.2}},
    {id:"fertilizerPlant",category:"Industria",icon:"🌱",name:"Fábrica de fertilizantes",cost:11,months:12,description:"Amoniaco, fertilizantes nitrogenados y bioestimulantes.",family:"Industria química y alimentaria",maxLevel:5,slots:2,jobs:3100,energy:-4.4,output:5.7,capacity:"1,8 Mt/año",requires:{infra:50,energy:56},resourceEffects:{food:3.8,fuel:-.5}},
    {id:"cementPlant",category:"Industria",icon:"🏗️",name:"Cementera de bajas emisiones",cost:10,months:11,description:"Clínker, cemento y materiales de construcción circulares.",family:"Industria pesada",maxLevel:5,slots:2,jobs:2600,energy:-4.6,output:5.2,capacity:"3 Mt/año",requires:{infra:50,energy:55},resourceEffects:{machinery:2.2}},
    {id:"copperMine",category:"Industria",icon:"⛏️",name:"Mina de cobre",cost:15,months:16,description:"Extracción, concentración y refino de cobre.",family:"Minería",maxLevel:5,slots:2,jobs:4800,energy:-4.2,output:7.4,capacity:"320 kt/año",requires:{infra:45,energy:52},resourceEffects:{electronics:2.4,machinery:2.2}},
    {id:"lithiumMine",category:"Industria",icon:"🔋",name:"Mina y refino de litio",cost:18,months:18,description:"Extracción, carbonato de litio y materiales catódicos.",family:"Minería crítica",maxLevel:5,slots:2,jobs:3600,energy:-3.5,output:8.0,capacity:"85 kt LCE/año",requires:{infra:48,energy:54,technology:58},resourceEffects:{electronics:4.5}},
    {id:"batteryGigafactory",category:"Industria",icon:"🔋",name:"Gigafactoría de baterías",cost:23,months:21,description:"Celdas, módulos y sistemas estacionarios.",family:"Alta tecnología e industria",maxLevel:5,slots:2,jobs:6900,energy:-5.8,output:10.2,capacity:"55 GWh/año",requires:{infra:66,energy:68,technology:72},resourceEffects:{electronics:6.5,vehicles:45}},
    {id:"electronicsPlant",category:"Industria",icon:"📱",name:"Planta electrónica",cost:13,months:13,description:"Electrónica de consumo, potencia y sistemas industriales.",family:"Alta tecnología",maxLevel:5,slots:2,jobs:7600,energy:-3.2,output:7.7,capacity:"18 M de equipos/año",requires:{infra:58,energy:54,technology:62},resourceEffects:{electronics:7.8}},
    {id:"machineTools",category:"Industria",icon:"⚙️",name:"Fábrica de bienes de equipo",cost:14,months:14,description:"Máquina-herramienta, robótica y equipos de producción.",family:"Industria de maquinaria",maxLevel:5,slots:2,jobs:5800,energy:-3.8,output:7.6,capacity:"24.000 equipos/año",requires:{infra:58,energy:56,technology:60},resourceEffects:{machinery:8.2}},
    {id:"textileCluster",category:"Industria",icon:"🧵",name:"Clúster textil",cost:7,months:8,description:"Fibras, confección automatizada y textil técnico.",family:"Industria ligera",maxLevel:5,slots:1,jobs:8800,energy:-1.8,output:4.0,capacity:"410 M de prendas/año",requires:{infra:42},resourceEffects:{machinery:.5}},
    {id:"dataCenter",category:"Infraestructura",icon:"🖥️",name:"Centro de datos soberano",cost:17,months:15,description:"Nube, IA, almacenamiento y servicios digitales.",family:"Infraestructura digital",maxLevel:5,slots:2,jobs:1700,energy:-6.2,output:8.4,capacity:"120 MW TI",requires:{infra:66,energy:72,technology:68},resourceEffects:{electronics:3.2}},
    {id:"desalination",category:"Infraestructura",icon:"💧",name:"Desaladora y red hídrica",cost:9,months:10,description:"Agua industrial, urbana y agrícola en regiones secas.",family:"Infraestructura hídrica",maxLevel:5,slots:1,jobs:850,energy:-2.7,output:2.5,capacity:"220 hm³/año",requires:{infra:45,energy:48,coastal:true},resourceEffects:{food:1.5}},
    {id:"hydroPlant",category:"Energía",icon:"🌊",name:"Central hidroeléctrica",cost:15,months:18,description:"Generación gestionable y almacenamiento por bombeo.",family:"Energía",maxLevel:5,slots:2,jobs:1200,energy:6.5,output:3.0,capacity:"1,6 GW",requires:{infra:52},resourceEffects:{electricity:7.2}},
    {id:"geothermal",category:"Energía",icon:"🌋",name:"Central geotérmica",cost:12,months:15,description:"Generación firme y calor industrial de baja emisión.",family:"Energía",maxLevel:5,slots:1,jobs:900,energy:4.4,output:2.2,capacity:"650 MW",requires:{infra:48,technology:56},resourceEffects:{electricity:4.9}},
    {id:"hydrogenPlant",category:"Energía",icon:"H₂",name:"Valle de hidrógeno",cost:19,months:18,description:"Electrólisis, almacenamiento, amoniaco y uso industrial.",family:"Energía e industria",maxLevel:5,slots:2,jobs:2900,energy:-4.2,output:7.1,capacity:"320 kt H₂/año",requires:{infra:60,energy:72,technology:68},resourceEffects:{fuel:5.5,steel:1}},
    {id:"recyclingHub",category:"Industria",icon:"♻️",name:"Complejo de reciclaje",cost:8,months:9,description:"Metales, plásticos, baterías y residuos tecnológicos.",family:"Industria circular",maxLevel:5,slots:1,jobs:3400,energy:-1.8,output:4.5,capacity:"2 Mt/año",requires:{infra:44},resourceEffects:{steel:1.6,electronics:1.1,machinery:1.1}},
    {id:"defensePlant",category:"Defensa",icon:"🛡️",name:"Fábrica de sistemas de defensa",cost:20,months:19,description:"Vehículos, munición, sensores y sistemas de misión.",family:"Industria de defensa",maxLevel:5,slots:2,jobs:6100,energy:-3.6,output:8.5,capacity:"3 líneas de sistemas/año",requires:{infra:64,energy:58,technology:68},resourceEffects:{machinery:4,electronics:3,steel:-.8}}
  ];

  const RESOURCE_PATCH = {
    housing:{food:-.1,electricity:-1.2},hospital:{medicines:-.5,electricity:-.5},university:{electronics:.5},
    autoPlant:{vehicles:250,steel:-.8,electronics:-.5},steelPlant:{steel:2.2,electricity:-1.2},chipFab:{electronics:35,electricity:-1.1},
    shipyard:{machinery:3.5,steel:-.7},aerospace:{machinery:4,electronics:2},solar:{electricity:5.2},wind:{electricity:6.4},
    nuclear:{electricity:11.8},grid:{electricity:1.4},rail:{machinery:1.8},port:{machinery:.8},airbase:{fuel:-.6},navalBase:{fuel:-.8},cyberCenter:{electronics:1.2}
  };

  const NEW_TECHNOLOGIES = [
    {id:"precisionAgriculture",icon:"🌾",name:"Agricultura de precisión",branch:"Agroalimentación",cost:110,months:10,requires:[],effects:{food:3,technology:1,growth:.1},description:"Sensores, riego, semillas avanzadas y gestión predictiva."},
    {id:"foodBiotech",icon:"🧫",name:"Biotecnología alimentaria",branch:"Agroalimentación",cost:165,months:16,requires:["precisionAgriculture"],effects:{food:5,technology:2,exports:1},description:"Proteínas, fermentación y cultivos resilientes."},
    {id:"coldChain",icon:"❄️",name:"Cadena de frío inteligente",branch:"Agroalimentación",cost:125,months:12,requires:["precisionAgriculture"],effects:{food:3,logistics:2,exports:1},description:"Reduce pérdidas y estabiliza el suministro."},
    {id:"mRNA",icon:"💉",name:"Plataformas de ARN mensajero",branch:"Salud",cost:190,months:19,requires:[],effects:{technology:4,health:3,exports:1},description:"Vacunas y terapias programables."},
    {id:"geneTherapy",icon:"🧬",name:"Terapia génica industrial",branch:"Salud",cost:245,months:25,requires:["mRNA"],effects:{technology:6,health:4,exports:2},description:"Vectores, edición genética y manufactura clínica."},
    {id:"digitalHealth",icon:"🩺",name:"Salud digital interoperable",branch:"Salud",cost:145,months:14,requires:["aiGov"],effects:{health:3,efficiency:3,technology:2},description:"Historia clínica, IA diagnóstica y telemedicina."},
    {id:"advancedRefining",icon:"🛢️",name:"Refino de alta conversión",branch:"Energía",cost:155,months:16,requires:[],effects:{energy:3,industry:2,exports:1},description:"Mayor rendimiento y combustibles de bajas emisiones."},
    {id:"syntheticFuels",icon:"🧪",name:"Combustibles sintéticos",branch:"Energía",cost:205,months:21,requires:["greenHydrogen"],effects:{energy:4,industry:2,emissions:-1,exports:1},description:"E-fuels para aviación, transporte y reserva estratégica."},
    {id:"smallModularReactors",icon:"☢️",name:"Reactores modulares en serie",branch:"Energía",cost:235,months:24,requires:["smartGrid"],effects:{energy:6,technology:2,emissions:-2},description:"Fabricación modular, seguridad pasiva y calor industrial."},
    {id:"deepGeothermal",icon:"🌋",name:"Geotermia profunda",branch:"Energía",cost:170,months:18,requires:["advancedMaterials"],effects:{energy:4,technology:2,emissions:-1},description:"Perforación avanzada y reservorios estimulados."},
    {id:"solidStateBatteries",icon:"🔋",name:"Baterías de estado sólido",branch:"Industria",cost:215,months:22,requires:["advancedMaterials","semis"],effects:{industry:5,technology:3,exports:2},description:"Mayor densidad, seguridad y vida útil."},
    {id:"industrialRobotics",icon:"🦾",name:"Robótica industrial cognitiva",branch:"Industria",cost:180,months:18,requires:["aiGov"],effects:{industry:5,productivity:4,technology:2},description:"Células flexibles y mantenimiento predictivo."},
    {id:"greenSteel",icon:"🔩",name:"Acero verde por hidrógeno",branch:"Industria",cost:210,months:22,requires:["greenHydrogen","advancedMaterials"],effects:{industry:4,emissions:-3,exports:1},description:"Reducción directa y hornos eléctricos avanzados."},
    {id:"criticalMinerals",icon:"⛏️",name:"Procesado de minerales críticos",branch:"Industria",cost:175,months:17,requires:["advancedMaterials"],effects:{industry:4,technology:2,exports:2},description:"Refino de litio, cobre, tierras raras y reciclaje."},
    {id:"digitalTwins",icon:"🏭",name:"Gemelos digitales industriales",branch:"Industria",cost:160,months:16,requires:["aiGov"],effects:{industry:3,efficiency:4,technology:2},description:"Optimización de plantas, redes y logística."},
    {id:"photonicChips",icon:"💠",name:"Chips fotónicos",branch:"Digital",cost:260,months:27,requires:["semis","quantum"],effects:{technology:7,industry:3,intelligence:2},description:"Computación y comunicaciones ópticas integradas."},
    {id:"edgeAI",icon:"📡",name:"IA en el borde",branch:"Digital",cost:175,months:17,requires:["aiGov","semis"],effects:{technology:4,industry:2,intelligence:2},description:"Procesamiento autónomo en fábricas, vehículos y sensores."},
    {id:"cyberResilience",icon:"🔐",name:"Ciberresiliencia nacional",branch:"Digital",cost:150,months:15,requires:["aiGov"],effects:{intelligence:4,stability:2,technology:2},description:"Arquitectura zero-trust y respuesta coordinada."},
    {id:"autonomousLogistics",icon:"🚚",name:"Logística autónoma",branch:"Infraestructura",cost:165,months:17,requires:["aiGov"],effects:{logistics:5,industry:2,efficiency:2},description:"Puertos, almacenes y transporte autónomo."},
    {id:"highSpeedFreight",icon:"🚄",name:"Ferrocarril de mercancías 200 km/h",branch:"Infraestructura",cost:185,months:19,requires:[],effects:{logistics:6,industry:2,emissions:-1},description:"Corredores interoperables de alta capacidad."},
    {id:"smartPorts",icon:"⚓",name:"Puertos inteligentes",branch:"Infraestructura",cost:145,months:14,requires:["aiGov"],effects:{logistics:4,exports:2,efficiency:2},description:"Automatización portuaria, trazabilidad y aduanas digitales."},
    {id:"waterSecurity",icon:"💧",name:"Seguridad hídrica",branch:"Infraestructura",cost:150,months:16,requires:["smartGrid"],effects:{food:3,stability:2,energy:1},description:"Reutilización, desalación eficiente y redes sin pérdidas."},
    {id:"droneSwarm",icon:"🛩️",name:"Enjambres colaborativos",branch:"Defensa",cost:225,months:23,requires:["autonomousDefense","edgeAI"],effects:{military:6,intelligence:3},description:"Cooperación autónoma de sensores y plataformas."},
    {id:"integratedAirDefense",icon:"🛡️",name:"Defensa aérea integrada",branch:"Defensa",cost:210,months:21,requires:["spaceISR"],effects:{military:6,intelligence:2,stability:1},description:"Sensores distribuidos, interceptores y mando conjunto."},
    {id:"electronicWarfare",icon:"📶",name:"Guerra electrónica cognitiva",branch:"Defensa",cost:190,months:19,requires:["aiGov","semis"],effects:{military:4,intelligence:5},description:"Detección, perturbación y protección espectral."},
    {id:"underseaNetworks",icon:"🌊",name:"Redes submarinas autónomas",branch:"Defensa",cost:240,months:25,requires:["autonomousDefense"],effects:{military:5,intelligence:4},description:"UUV, sonar distribuido y protección de cables."},
    {id:"reusableLaunch",icon:"🚀",name:"Lanzadores reutilizables",branch:"Espacio",cost:260,months:27,requires:["spaceISR","advancedMaterials"],effects:{technology:5,military:2,exports:2},description:"Acceso frecuente y barato a órbita."},
    {id:"satelliteManufacturing",icon:"🛰️",name:"Fabricación orbital en serie",branch:"Espacio",cost:235,months:24,requires:["spaceISR","semis"],effects:{technology:5,industry:3,intelligence:2},description:"Microsatélites, cargas útiles y constelaciones."},
    {id:"climateEngineering",icon:"🌍",name:"Ingeniería climática adaptativa",branch:"Clima",cost:220,months:23,requires:["aiGov","smartGrid"],effects:{stability:3,food:2,technology:3},description:"Modelos, adaptación urbana y gestión de riesgos extremos."},
    {id:"carbonCapture",icon:"🌫️",name:"Captura industrial de carbono",branch:"Clima",cost:180,months:18,requires:["advancedMaterials"],effects:{industry:2,emissions:-4,energy:-1},description:"Captura, transporte y almacenamiento geológico."},
    {id:"circularEconomy",icon:"♻️",name:"Economía circular avanzada",branch:"Clima",cost:135,months:13,requires:[],effects:{industry:2,efficiency:3,emissions:-2},description:"Reciclaje de materiales críticos y diseño reparable."},
    {id:"quantumSensing",icon:"⚛️",name:"Sensores cuánticos",branch:"Ciencia",cost:245,months:25,requires:["quantum"],effects:{technology:6,intelligence:4,military:2},description:"Navegación, metrología y detección de alta precisión."},
    {id:"advancedComputing",icon:"🧮",name:"Computación exaescala",branch:"Ciencia",cost:220,months:22,requires:["semis"],effects:{technology:6,research:4,efficiency:2},description:"Simulación científica, clima, materiales e IA."}
  ];

  const NEW_COMPANIES = [
    ["caixabank","CaixaBank","ESP","Banca",5.2,33,46000,1.02],["bankinter","Bankinter","ESP","Banca",8.5,7.8,6500,1.04],["sabadell","Banco Sabadell","ESP","Banca",2.1,12,19000,1.03],
    ["redeia","Redeia","ESP","Energía e infraestructura",17,14,2500,1.00],["enagas","Enagás","ESP","Infraestructura energética",14,6,1400,.98],["puig","Puig Brands","ESP","Consumo",25,14,11000,1.07],
    ["fluidra","Fluidra","ESP","Industria",23,4.5,6700,1.05],["viscofan","Viscofan","ESP","Alimentación",62,3,5200,1.02],["ebro-foods","Ebro Foods","ESP","Alimentación",17,2.7,7200,1.01],
    ["pharma-mar","PharmaMar","ESP","Farmacéutica",38,0.8,500,1.13],["faes-farma","Faes Farma","ESP","Farmacéutica",4.1,1.3,1800,1.08],["solaria","Solaria","ESP","Energía",12,1.6,800,1.08],
    ["unitedhealth","UnitedHealth Group","USA","Salud",520,480,440000,1.05],["eli-lilly","Eli Lilly","USA","Farmacéutica",880,835,43000,1.16],["pfizer","Pfizer","USA","Farmacéutica",29,164,88000,.98],
    ["johnson-johnson","Johnson & Johnson","USA","Farmacéutica",158,380,131000,1.02],["broadcom","Broadcom","USA","Semiconductores",182,850,20000,1.14],["oracle","Oracle","USA","Software",145,400,159000,1.08],
    ["salesforce","Salesforce","USA","Software",270,260,76000,1.08],["caterpillar","Caterpillar","USA","Maquinaria",345,165,113000,1.03],["lockheed","Lockheed Martin","USA","Defensa",470,112,122000,1.06],
    ["general-dynamics","General Dynamics","USA","Defensa",295,81,111000,1.05],["northrop","Northrop Grumman","USA","Defensa",490,73,101000,1.07],["micron","Micron Technology","USA","Semiconductores",124,138,48000,1.12],
    ["deutsche-bank","Deutsche Bank","DEU","Banca",16,32,90000,1.01],["infineon","Infineon Technologies","DEU","Semiconductores",36,47,59000,1.10],["continental","Continental","DEU","Automoción",61,12,200000,.99],
    ["bayer","Bayer","DEU","Farmacéutica y química",28,28,99000,1.01],["henkel","Henkel","DEU","Consumo y química",82,33,48000,1.01],["mtu","MTU Aero Engines","DEU","Aeroespacial",290,15,12000,1.09],
    ["sanofi","Sanofi","FRA","Farmacéutica",98,125,86000,1.05],["danone","Danone","FRA","Alimentación",64,43,90000,1.01],["vinci","Vinci","FRA","Infraestructura",112,66,280000,1.02],
    ["thales","Thales","FRA","Defensa y tecnología",170,36,81000,1.08],["dassault","Dassault Aviation","FRA","Aeroespacial",205,17,14000,1.08],["orange","Orange","FRA","Telecomunicaciones",11,29,137000,.99],
    ["novartis","Novartis","CHE","Farmacéutica",104,215,76000,1.05],["abb","ABB","CHE","Industria",49,91,107000,1.07],["ubs","UBS Group","CHE","Banca",31,101,115000,1.02],
    ["glencore","Glencore","CHE","Minería",5.1,61,87000,.99],["zurich-insurance","Zurich Insurance","CHE","Seguros",520,76,60000,1.02],["gsk","GSK","GBR","Farmacéutica",18,74,68000,1.04],
    ["bae-systems","BAE Systems","GBR","Defensa",15,65,107000,1.08],["rolls-royce","Rolls-Royce Holdings","GBR","Aeroespacial",5.6,47,42000,1.10],["bp","BP","GBR","Energía",5.3,92,87000,.99],
    ["tesco","Tesco","GBR","Alimentación y distribución",3.4,30,330000,1.00],["diageo","Diageo","GBR","Alimentación",28,62,30000,1.00],["maersk","A.P. Møller–Mærsk","DNK","Transporte marítimo",1720,31,100000,1.03],
    ["vestas","Vestas Wind Systems","DNK","Energía",24,24,30000,1.08],["orsted","Ørsted","DNK","Energía",55,20,8500,1.07],["volvo","Volvo Group","SWE","Automoción",28,55,104000,1.04],
    ["ericsson","Ericsson","SWE","Telecomunicaciones",7.2,24,100000,1.03],["saab","Saab AB","SWE","Defensa",24,24,23000,1.11],["equinor","Equinor","NOR","Energía",28,78,24000,1.00],
    ["norsk-hydro","Norsk Hydro","NOR","Metales",6.2,13,32000,1.01],["eni","Eni","ITA","Energía",15,48,33000,1.00],["enel","Enel","ITA","Energía",7.1,72,61000,1.00],
    ["leonardo","Leonardo","ITA","Defensa y aeroespacial",25,15,54000,1.10],["ferrari","Ferrari","ITA","Automoción",420,81,5500,1.08],["intesa","Intesa Sanpaolo","ITA","Banca",4.1,77,93000,1.02],
    ["mitsubishi-ufj","Mitsubishi UFJ Financial","JPN","Banca",12,165,140000,1.03],["hitachi","Hitachi","JPN","Industria y tecnología",24,150,270000,1.07],["mitsubishi-heavy","Mitsubishi Heavy Industries","JPN","Industria y defensa",16,110,78000,1.10],
    ["takeda","Takeda Pharmaceutical","JPN","Farmacéutica",28,44,49000,1.03],["honda","Honda Motor","JPN","Automoción",10,53,195000,1.02],["softbank","SoftBank Group","JPN","Tecnología",65,95,65000,1.11],
    ["hyundai","Hyundai Motor","KOR","Automoción",185,44,120000,1.05],["lg-electronics","LG Electronics","KOR","Electrónica",76,13,74000,1.05],["hanwha","Hanwha Aerospace","KOR","Defensa y aeroespacial",180,14,25000,1.12],
    ["posco","POSCO Holdings","KOR","Acero",42,25,35000,1.02],["byd","BYD","CHN","Automoción y baterías",38,115,570000,1.14],["sinopec","Sinopec","CHN","Energía",0.8,115,370000,.99],
    ["petrochina","PetroChina","CHN","Energía",1.2,220,410000,.99],["icbc","ICBC","CHN","Banca",0.75,280,420000,1.01],["baidu","Baidu","CHN","Tecnología",105,37,39000,1.08],
    ["pdd","PDD Holdings","CHN","Comercio digital",145,200,17000,1.12],["infosys","Infosys","IND","Tecnología",22,92,317000,1.08],["hdfc","HDFC Bank","IND","Banca",20,155,210000,1.05],
    ["sun-pharma","Sun Pharmaceutical","IND","Farmacéutica",20,48,41000,1.08],["mahindra","Mahindra & Mahindra","IND","Automoción",34,41,260000,1.06],["adani-ports","Adani Ports","IND","Infraestructura",16,34,11000,1.08],
    ["embraer","Embraer","BRA","Aeroespacial",37,7,19000,1.09],["jbs","JBS","BRA","Alimentación",7.1,15,250000,1.02],["itau","Itaú Unibanco","BRA","Banca",6.4,60,96000,1.03],
    ["mercadolibre","Mercado Libre","ARG","Comercio digital",1950,98,70000,1.12],["ypf","YPF","ARG","Energía",28,11,23000,1.05],["cemex","CEMEX","MEX","Materiales",7.4,11,46000,1.01],
    ["america-movil","América Móvil","MEX","Telecomunicaciones",18,54,179000,1.03],["grupo-bimbo","Grupo Bimbo","MEX","Alimentación",4.2,18,145000,1.02],["shopify","Shopify","CAN","Software y comercio",78,101,8000,1.11],
    ["canadian-natural","Canadian Natural Resources","CAN","Energía",37,78,10000,1.00],["barrick","Barrick Gold","CAN","Minería",19,34,22000,1.01],["commonwealth-bank","Commonwealth Bank","AUS","Banca",134,225,49000,1.03],
    ["csl","CSL Limited","AUS","Biotecnología",305,147,32000,1.07],["woodside","Woodside Energy","AUS","Energía",27,51,4700,1.00],["naspers","Naspers","ZAF","Tecnología",205,42,34000,1.09],
    ["sasol","Sasol","ZAF","Energía y química",7.8,5,28000,.99],["mtn","MTN Group","ZAF","Telecomunicaciones",6.5,12,17000,1.04],["emirates-nbd","Emirates NBD","ARE","Banca",5.4,36,30000,1.04],
    ["adnoc-gas","ADNOC Gas","ARE","Energía",0.9,70,6500,1.02],["qatar-energy-sim","QatarEnergy Markets","QAT","Energía",32,125,12000,1.00],["israel-chemicals","ICL Group","ISR","Química",5.8,7,12000,1.03],
    ["teva","Teva Pharmaceutical","ISR","Farmacéutica",18,20,37000,1.06],["turkish-airlines","Turkish Airlines","TUR","Transporte",10,14,82000,1.05],["aselsan","ASELSAN","TUR","Defensa y tecnología",2.1,19,11000,1.12]
  ].map(([id,name,countryId,sector,price,marketCap,employees,growthBias])=>({id,name,countryId,sector,price,marketCap,employees,growthBias,shares:Math.max(100,Math.round(marketCap*1000/Math.max(price,1))),realName:true}));

  const REGION_NAME_SETS = {
    Europe:["Área capital","Región norte","Región atlántica","Región central","Región oriental","Región meridional"],
    Asia:["Área capital","Región septentrional","Corredor occidental","Cuenca central","Región oriental","Región meridional"],
    Africa:["Área capital","Región norte","Región occidental","Meseta central","Región oriental","Región sur"],
    Americas:["Área capital","Región norte","Región occidental","Región central","Región oriental","Región sur"],
    Oceania:["Área capital","Región norte","Región occidental","Región central","Región oriental","Región sur"]
  };
  const REGION_OFFSETS = [[0,0],[4.2,-3.6],[1.1,-5.0],[0.2,3.8],[-2.7,4.1],[-4.0,-1.7],[3.3,4.2],[-3.2,-4.1]];
  const REGION_RESOURCE_POOL = ["Alimentos","Petróleo","Gas","Carbón","Hierro","Cobre","Litio","Uranio","Madera","Pesca","Hidroelectricidad","Solar","Eólica","Industria","Tecnología","Puertos"];

  function hashNumber(str){let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function seeded(str,min,max,salt=0){const x=Math.sin(hashNumber(str)+salt*99991)*43758.5453;return min+(x-Math.floor(x))*(max-min)}

  function installCatalogExtensions(){
    const buildingIds=new Set(C.buildings.map(x=>x.id));
    for(const def of NEW_BUILDINGS)if(!buildingIds.has(def.id)){C.buildings.push(clone(def));buildingIds.add(def.id)}
    for(const def of C.buildings){def.resourceEffects={...(RESOURCE_PATCH[def.id]||{}),...(def.resourceEffects||{})};def.maxLevel??=5;def.slots??=1;def.jobs??=1000;def.energy??=0;def.output??=1;def.family??=def.category||"Industria";def.requires??={};def.capacity??=def.description||"Capacidad productiva"}
    const techIds=new Set(C.technologies.map(x=>x.id));for(const t of NEW_TECHNOLOGIES)if(!techIds.has(t.id)){C.technologies.push(clone(t));techIds.add(t.id)}
  }
  installCatalogExtensions();

  function makeCompany(def){
    const revenue=Math.max(.2,def.marketCap*(.32+seeded(def.id,.08,.55,1))),margin=clamp(seeded(def.id,5,25,2),2,40);
    return {...clone(def),history:[def.price],dayChange:0,ownership:{state:0,player:0},ownershipByCountry:{},financials:{revenue:round(revenue,1),profit:round(revenue*margin/100,1),margin:round(margin,1),debtRatio:round(seeded(def.id,12,72,3),1),pe:round(seeded(def.id,8,34,4),1),dividend:round(seeded(def.id,0,4.5,5),2),beta:round(seeded(def.id,.65,1.55,6),2)}};
  }
  function ensureCompanies(state){
    state.companies ||= [];const ids=new Set(state.companies.map(c=>c.id));
    for(const def of NEW_COMPANIES)if(!ids.has(def.id)){state.companies.push(makeCompany(def));ids.add(def.id)}
    for(const company of state.companies){company.ownershipByCountry||={};company.history=Array.isArray(company.history)&&company.history.length?company.history:[company.price||10];company.financials||=makeCompany(company).financials;company.employees||=Math.round((company.marketCap||1)*850);company.realName??=true}
  }

  function countryContinent(country){return W.countries?.find(x=>x.id===country.id)?.continent||"Europe"}
  function regionResourceProfile(country,index){
    const primary=REGION_RESOURCE_POOL[(hashNumber(country.id)+index*5)%REGION_RESOURCE_POOL.length];
    const secondary=REGION_RESOURCE_POOL[(hashNumber(country.id)+index*11+7)%REGION_RESOURCE_POOL.length];
    const output={electricity:round(seeded(country.id,1,8,index),1),food:round(seeded(country.id,1,7,index+4),1),fuel:round(seeded(country.id,0,5,index+8),1),steel:round(seeded(country.id,0,3,index+12),1),vehicles:round(seeded(country.id,0,45,index+16),1),electronics:round(seeded(country.id,0,5,index+20),1),machinery:round(seeded(country.id,0,5,index+24),1),medicines:round(seeded(country.id,0,4,index+28),1)};
    if(primary==="Petróleo"||primary==="Gas"||primary==="Carbón")output.fuel+=6;if(primary==="Alimentos"||primary==="Pesca")output.food+=6;if(primary==="Industria")output.machinery+=5;if(primary==="Tecnología")output.electronics+=6;if(primary==="Hidroelectricidad"||primary==="Solar"||primary==="Eólica"||primary==="Uranio")output.electricity+=7;if(primary==="Hierro"||primary==="Cobre")output.steel+=3;
    return{primary,secondary,output};
  }
  function strategicRegionCount(country){const pop=country.economy?.population||1,gdp=country.economy?.gdp||10;return clamp(Math.round(3+Math.log10(Math.max(1,pop))*1.3+Math.log10(Math.max(1,gdp))/2),3,8)}
  function ensureStrategicRegions(state,country){
    if(country.id==="ESP"){
      for(const [i,r] of state.regions.entries()){
        r.countryId="ESP";r.ownerId||="ESP";r.controllerId||="ESP";r.capacitySlots??=Math.max(6,Math.round(4+r.population*1.25+r.infra/22));r.slotExpansionLevel??=0;r.facilities=r.buildings;
        const profile=regionResourceProfile(country,i);r.resourceProfile||=profile;r.resourceOutput||=profile.output;r.lat??=W.regionCapitals?.[r.id]?.[0]??40;r.lng??=W.regionCapitals?.[r.id]?.[1]??-3;
      }
      return;
    }
    const count=strategicRegionCount(country),continent=countryContinent(country),names=REGION_NAME_SETS[continent]||REGION_NAME_SETS.Europe;
    country.strategicRegions=Array.isArray(country.strategicRegions)?country.strategicRegions:[];
    for(let i=0;i<count;i++){
      let r=country.strategicRegions[i];const off=REGION_OFFSETS[i%REGION_OFFSETS.length],profile=regionResourceProfile(country,i);
      if(!r){r={id:`${country.id}-R${i+1}`,countryId:country.id,name:names[i%names.length],capital:i===0?country.name:`${names[i%names.length]} Hub`,lat:clamp((country.map?.lat||0)+off[0]*clamp((country.map?.size||10)/10,.6,1.6),-82,82),lng:normalizeLng((country.map?.lng||0)+off[1]*clamp((country.map?.size||10)/10,.6,1.8)),population:round((country.economy.population||1)*(i===0?.24:(.76/Math.max(1,count-1)))*seeded(country.id,.82,1.18,i),3),gdp:round((country.economy.gdp||10)*(i===0?.30:(.70/Math.max(1,count-1)))*seeded(country.id,.82,1.18,i+8),2),infra:round(clamp((country.systems.logistics||50)+seeded(country.id,-12,10,i),20,98),1),industry:round(clamp((country.systems.industry||50)+seeded(country.id,-14,12,i+20),15,98),1),energy:round(clamp((country.systems.energy||50)+seeded(country.id,-12,12,i+30),15,98),1),stability:round(clamp((country.systems.stability||50)+seeded(country.id,-10,8,i+40),15,98),1),capacitySlots:clamp(Math.round(4+(country.economy.population||1)/count*.55+(country.systems.logistics||50)/22),4,18),slotExpansionLevel:0,ownerId:country.id,controllerId:country.id,resourceProfile:profile,resourceOutput:profile.output};country.strategicRegions.push(r)}
      r.countryId=country.id;r.ownerId||=country.id;r.controllerId||=country.id;r.resourceProfile||=profile;r.resourceOutput||=profile.output;r.capacitySlots??=8;r.slotExpansionLevel??=0;
    }
    country.strategicRegions=country.strategicRegions.slice(0,count);
    for(const f of country.facilities||[]){if(!f.regionId)f.regionId=country.strategicRegions[0]?.id||null;const rr=country.strategicRegions.find(x=>x.id===f.regionId)||country.strategicRegions[0];if(rr){f.lat??=rr.lat+seeded(f.id,-.25,.25,1);f.lng??=rr.lng+seeded(f.id,-.35,.35,2)}}
  }
  function normalizeLng(v){while(v<-180)v+=360;while(v>180)v-=360;return v}
  function getCountryRegions(state,countryId){const c=E.getCountry(state,countryId);return c.id==="ESP"?state.regions:(c.strategicRegions||[])}
  function getRegion(state,countryId,regionId){const direct=getCountryRegions(state,countryId).find(r=>r.id===regionId);if(direct)return direct;for(const c of state.countries){const found=(c.id==="ESP"?state.regions:(c.strategicRegions||[])).find(r=>r.id===regionId);if(found)return found}return null}
  function getControlledRegions(state,countryId){const result=[];for(const owner of state.countries){for(const region of getCountryRegions(state,owner.id))if((region.controllerId||region.ownerId||owner.id)===countryId)result.push(region)}return result}
  function facilitiesInRegion(state,country,regionId){return country.id==="ESP"?(state.regions.find(r=>r.id===regionId)?.buildings||[]):(country.facilities||[]).filter(f=>f.regionId===regionId)}
  function facilityUsedSlots(state,country,regionId){return facilitiesInRegion(state,country,regionId).reduce((s,f)=>s+(C.buildings.find(d=>d.id===f.typeId)?.slots||1),0)}

  function ensureRegions(state){for(const country of state.countries)ensureStrategicRegions(state,country)}

  function ideologyAxis(ideology){
    const x=String(ideology||"").toLowerCase();
    if(/comunis|marxis|extrema izquierda|izquierda radical|socialismo revolucionario/.test(x))return -92;
    if(/izquierda|ecosocial|socialista|laborista/.test(x))return -62;
    if(/socialdemocra|progres|verde|ecolog/.test(x))return -38;
    if(/centroizquierda|liberal social|reformismo progresista/.test(x))return -18;
    if(/centrismo|centro|democracia cristiana|regionalismo/.test(x))return 0;
    if(/liberalismo clásico|liberal-conserv|centroderecha/.test(x))return 22;
    if(/conserv|democrist|derecha/.test(x))return 48;
    if(/nacional-conserv|populismo nacional|soberanismo/.test(x))return 68;
    if(/extrema derecha|ultranacional|fasc|nacionalsocial/.test(x))return 94;
    return 0;
  }
  function ensureCoalitionData(country){
    country.politics||={};country.politics.coalition=Array.isArray(country.politics.coalition)&&country.politics.coalition.length?country.politics.coalition:[country.politics.rulingPartyId];
    for(const p of country.politics.parties||[]){p.axis=Number.isFinite(p.axis)?p.axis:ideologyAxis(p.ideology);p.popularity=round(clamp(p.popularity,0,100),1)}
    country.politics.coalition=country.politics.coalition.filter(id=>country.politics.parties.some(p=>p.id===id));if(!country.politics.coalition.length&&country.politics.rulingPartyId)country.politics.coalition=[country.politics.rulingPartyId];
    updateCoalitionGovernment(country);
  }
  function coalitionSupport(country){return round((country.politics.parties||[]).filter(p=>country.politics.coalition.includes(p.id)).reduce((s,p)=>s+(p.popularity||0),0),1)}
  function coalitionDistance(country,partyId){const party=country.politics.parties.find(p=>p.id===partyId),members=country.politics.parties.filter(p=>country.politics.coalition.includes(p.id));if(!party||!members.length)return 0;return members.reduce((s,p)=>s+Math.abs((p.axis||0)-(party.axis||0)),0)/members.length}
  function coalitionCompatibility(distance){if(distance<=18)return{label:"Muy alta",chance:.96,cost:3};if(distance<=38)return{label:"Alta",chance:.82,cost:7};if(distance<=62)return{label:"Media",chance:.58,cost:13};if(distance<=95)return{label:"Difícil",chance:.30,cost:22};if(distance<=135)return{label:"Muy difícil",chance:.12,cost:34};return{label:"Incompatible",chance:0,cost:0}}
  function updateCoalitionGovernment(country){const support=coalitionSupport(country),members=country.politics.parties.filter(p=>country.politics.coalition.includes(p.id));country.politics.coalitionSupport=support;country.politics.coalitionAxis=members.length?round(members.reduce((s,p)=>s+(p.axis||0)*(p.popularity||0),0)/Math.max(1,members.reduce((s,p)=>s+(p.popularity||0),0)),1):0;country.government.legitimacy=round(clamp((country.government.legitimacy||50)+(support-50)*.025,10,98),1)}
  function negotiateCoalition(state,partyId){
    const country=E.getCountry(state,state.controlledCountryId),p=country.politics,party=p.parties.find(x=>x.id===partyId);if(!party)return{ok:false,message:"Partido no encontrado."};if(p.coalition.includes(partyId))return{ok:false,message:"El partido ya forma parte de la coalición."};
    const distance=coalitionDistance(country,partyId),compat=coalitionCompatibility(distance);if(!compat.chance)return{ok:false,message:"La distancia ideológica hace imposible esta coalición."};if((p.politicalCapital||0)<compat.cost)return{ok:false,message:`Capital político insuficiente: se requieren ${compat.cost} puntos.`};
    p.politicalCapital=round(p.politicalCapital-compat.cost,1);const majorityBonus=coalitionSupport(country)<50&&coalitionSupport(country)+(party.popularity||0)>=50?.12:0;const chance=clamp(compat.chance+majorityBonus+(country.government.legitimacy-55)/400,.05,.98);
    if(Math.random()<=chance){p.coalition.push(partyId);updateCoalitionGovernment(country);E.pushEvent(state,"politics",`Coalición ampliada con ${party.name}`,`Compatibilidad ${compat.label}; apoyo parlamentario ${coalitionSupport(country).toFixed(1)}%.`);return{ok:true,message:`Acuerdo alcanzado con ${party.name}. Coalición: ${coalitionSupport(country).toFixed(1)}%.`}}
    country.government.legitimacy=round(clamp(country.government.legitimacy-.8,5,99),1);return{ok:false,message:`La negociación con ${party.name} fracasa. Compatibilidad ${compat.label}.`}
  }
  function removeCoalitionParty(state,partyId){const country=E.getCountry(state,state.controlledCountryId),p=country.politics;if(partyId===p.rulingPartyId)return{ok:false,message:"El partido principal no puede abandonar su propio gobierno."};if(!p.coalition.includes(partyId))return{ok:false,message:"El partido no forma parte de la coalición."};p.coalition=p.coalition.filter(id=>id!==partyId);p.politicalCapital=round(clamp(p.politicalCapital+2,0,100),1);updateCoalitionGovernment(country);return{ok:true,message:"Partido retirado de la coalición."}}
  function coalitionInfo(state,countryId=state.controlledCountryId){const country=E.getCountry(state,countryId);ensureCoalitionData(country);return{support:coalitionSupport(country),axis:country.politics.coalitionAxis,members:country.politics.parties.filter(p=>country.politics.coalition.includes(p.id))}}

  function ensureUnitRegions(state,country){const regions=getCountryRegions(state,country.id),capital=regions[0];for(const u of country.units||[]){u.countryId=country.id;if(!u.regionId||!regions.some(r=>r.id===u.regionId))u.regionId=capital?.id||null;const r=regions.find(x=>x.id===u.regionId)||capital;if(r&&!u.movement){u.lat=r.lat;u.lng=r.lng}u.movement??=null}}
  function movementDays(unit,from,to){const km=Math.hypot((to.lat-from.lat)*111,normalizeLng(to.lng-from.lng)*85);const mobility={infantry:180,mechanized:420,armor:330,artillery:280,airDefense:260,rocketArtillery:310,fighter:1800,drone:900,bomber:2200,transport:1800,frigate:650,destroyer:700,submarine:500,carrier:600,satellite:10000,missile:10000,cyber:10000}[unit.typeId]||250;return Math.max(1,Math.ceil(km/mobility))}
  function deployUnit(state,unitId,regionId,countryId=state.controlledCountryId){
    const country=E.getCountry(state,state.controlledCountryId),unit=country.units.find(u=>u.id===unitId);if(!unit)return{ok:false,message:"Unidad no encontrada."};const targetCountry=E.getCountry(state,countryId),region=getRegion(state,targetCountry.id,regionId);if(!region)return{ok:false,message:"Región de destino no encontrada."};
    const friendly=region.controllerId===country.id||region.ownerId===country.id;if(!friendly)return{ok:false,message:"No puedes desplegarte en una región no controlada sin ordenar un ataque."};const from=getRegion(state,country.id,unit.regionId)||{id:unit.regionId||"origen",lat:unit.lat||country.map.lat,lng:unit.lng||country.map.lng};const days=movementDays(unit,from,region);
    if(days<=1){unit.regionId=region.id;unit.lat=region.lat;unit.lng=region.lng;unit.status="desplegada";unit.movement=null;return{ok:true,message:`Unidad desplegada en ${region.name}.`}}
    unit.movement={mode:"move",fromCountryId:country.id,fromRegionId:from.id,toCountryId:targetCountry.id,toRegionId:region.id,startLat:unit.lat??from.lat,startLng:unit.lng??from.lng,endLat:region.lat,endLng:region.lng,totalDays:days,daysRemaining:days,progress:0};unit.status=`en tránsito a ${region.name}`;return{ok:true,message:`Movimiento iniciado hacia ${region.name}: ${days} días.`}
  }
  function attackRegion(state,unitId,targetCountryId,targetRegionId){
    const attacker=E.getCountry(state,state.controlledCountryId),target=E.getCountry(state,targetCountryId),unit=attacker.units.find(u=>u.id===unitId);if(!unit||unit.quantity<=0)return{ok:false,message:"Selecciona una unidad operativa."};
    if(["frigate","destroyer","submarine","carrier","satellite","missile","cyber"].includes(unit.typeId))return{ok:false,message:"Esta unidad no puede ocupar territorio terrestre."};
    const region=getRegion(state,target.id,targetRegionId);if(!region)return{ok:false,message:"Región objetivo no encontrada."};if(region.controllerId===attacker.id)return{ok:false,message:"La región ya está bajo tu control."};
    const controller=E.getCountry(state,region.controllerId||region.ownerId||target.id);const war=state.wars.find(w=>!w.ended&&((w.attacker===attacker.id&&w.defender===controller.id)||(w.attacker===controller.id&&w.defender===attacker.id)));if(!war)return{ok:false,message:`Debes estar en guerra con ${controller.name} para atacar la región.`};
    const from=getRegion(state,attacker.id,unit.regionId)||{id:unit.regionId||"origen",lat:unit.lat||attacker.map.lat,lng:unit.lng||attacker.map.lng};const days=movementDays(unit,from,region);
    unit.movement={mode:"attack",fromCountryId:attacker.id,fromRegionId:from.id,toCountryId:target.id,toRegionId:region.id,startLat:unit.lat??from.lat,startLng:unit.lng??from.lng,endLat:region.lat,endLng:region.lng,totalDays:days,daysRemaining:days,progress:0,warId:war.id};unit.status=`avanzando sobre ${region.name}`;
    E.pushEvent(state,"military",`Ofensiva hacia ${region.name}`,`${attacker.name} moviliza ${unit.quantity.toLocaleString("es-ES")} efectivos/material hacia una región de ${target.name}.`);return{ok:true,message:`Ataque regional iniciado. Llegada estimada: ${days} días.`}
  }
  function unitPower(state,unit){const def=state.unitCatalog.find(x=>x.id===unit.typeId);return (def?.power||def?.stats?.attack||20)*Math.sqrt(Math.max(1,unit.quantity))*(unit.readiness||60)/100*(unit.strength||100)/100}
  function processUnitMovements(state){
    for(const country of state.countries)for(const unit of country.units||[]){const m=unit.movement;if(!m)continue;m.daysRemaining=Math.max(0,m.daysRemaining-1);m.progress=clamp(1-m.daysRemaining/Math.max(1,m.totalDays),0,1);unit.lat=m.startLat+(m.endLat-m.startLat)*m.progress;let dl=normalizeLng(m.endLng-m.startLng);unit.lng=normalizeLng(m.startLng+dl*m.progress);if(m.daysRemaining>0)continue;
      const targetRegion=getRegion(state,m.toCountryId,m.toRegionId);if(!targetRegion){unit.movement=null;unit.status="despliegue abortado";continue}
      unit.lat=targetRegion.lat;unit.lng=targetRegion.lng;unit.regionId=targetRegion.id;unit.movement=null;
      if(m.mode==="attack"){unit.status=`combatiendo en ${targetRegion.name}`;createRegionBattle(state,country,unit,m.toCountryId,targetRegion,m.warId)}else unit.status="desplegada";
    }
  }
  function createRegionBattle(state,attacker,unit,targetCountryId,region,warId){
    state.regionBattles||=[];let battle=state.regionBattles.find(b=>!b.ended&&b.attackerId===attacker.id&&b.unitId===unit.id&&b.regionId===region.id);if(battle)return;
    battle={id:uid(),warId,attackerId:attacker.id,defenderId:region.controllerId||region.ownerId||targetCountryId,unitId:unit.id,targetCountryId,regionId:region.id,days:0,controlProgress:0,attackerLosses:0,defenderLosses:0,ended:false,lastResult:"Fuerzas entrando en contacto"};state.regionBattles.push(battle);
  }
  function processRegionBattles(state){
    state.regionBattles||=[];
    for(const b of state.regionBattles.filter(x=>!x.ended)){
      const attacker=E.getCountry(state,b.attackerId),defender=E.getCountry(state,b.defenderId),region=getRegion(state,b.targetCountryId,b.regionId),unit=attacker.units.find(u=>u.id===b.unitId);if(!region||!unit||unit.quantity<=0){b.ended=true;b.result="Ofensiva cancelada";continue}
      b.days++;const defenders=(defender.units||[]).filter(u=>u.regionId===region.id&&u.quantity>0&&!u.movement);const ap=unitPower(state,unit)*(0.72+(attacker.systems.logistics||50)/160);const dp=(defenders.reduce((s,u)=>s+unitPower(state,u),0)||Math.max(18,(region.defense||45)*.65))*(0.85+(defender.systems.logistics||50)/220);
      const balance=(ap-dp)/Math.max(10,ap+dp),aLoss=Math.max(1,Math.round((dp/Math.max(ap,1))*seeded(b.id,2,16,b.days))),dLoss=Math.max(1,Math.round((ap/Math.max(dp,1))*seeded(b.id,2,18,b.days+9)));
      unit.quantity=Math.max(0,unit.quantity-aLoss);b.attackerLosses+=aLoss;let remaining=dLoss;for(const du of defenders){if(remaining<=0)break;const loss=Math.min(du.quantity,Math.max(1,Math.round(remaining/Math.max(1,defenders.length))));du.quantity-=loss;remaining-=loss;b.defenderLosses+=loss}
      b.controlProgress=round(clamp(b.controlProgress+balance*18+(defenders.length?0:7)+seeded(b.id,-1.5,2.5,b.days+21),-35,110),1);b.lastResult=balance>=0?`${attacker.name} gana terreno`:`${defender.name} contiene el avance`;
      state.battleAnimations||=[];state.battleAnimations.push({id:uid(),lat:region.lat,lng:region.lng,title:`Batalla de ${region.name}`,summary:b.lastResult,intensity:clamp((ap+dp)/400,.5,3),expires:Date.now()+12000});state.battleAnimations=state.battleAnimations.slice(-20);
      if(b.days===1||b.days%2===0)E.pushEvent(state,"battle",`Batalla por ${region.name}`,`${b.lastResult}. Control atacante ${b.controlProgress.toFixed(0)}%. Bajas ${aLoss}/${dLoss}. Recursos: ${region.resourceProfile?.primary||"mixtos"}.`);
      if(b.controlProgress>=100){region.controllerId=attacker.id;b.ended=true;b.result=`Región capturada por ${attacker.name}`;unit.status=`ocupación de ${region.name}`;attacker.systems.stability=round(clamp(attacker.systems.stability+.2,0,100),1);defender.systems.stability=round(clamp(defender.systems.stability-1.2,0,100),1);calculateResourceBalance(state,attacker);calculateResourceBalance(state,defender);E.pushEvent(state,"military",`${region.name} cambia de control`,`${attacker.name} ocupa la región y recibe el 55% de su producción regional mientras dure la ocupación.`)}
      else if(unit.quantity<=0||b.controlProgress<=-30||b.days>=45){b.ended=true;b.result=`Ofensiva rechazada por ${defender.name}`;unit.status="unidad derrotada";E.pushEvent(state,"military",`Ofensiva rechazada en ${region.name}`,`${defender.name} mantiene el control territorial.`)}
    }
  }

  function migrateConstructionQueues(state){
    for(const country of state.countries){country.productionQueue||=[];for(const q of country.productionQueue){if(q.kind==="facilityV2"||q.kind==="building"){q.kind="facilityV3";q.targetCountryId=country.id;q.targetRegionId=q.regionId||getCountryRegions(state,country.id)[0]?.id||null;q.buildingId=q.buildingId||q.typeId;q.totalDays=q.totalDays??Math.max(1,(q.totalMonths||q.monthsRemaining||1)*30);q.daysRemaining=q.daysRemaining??Math.max(0,(q.monthsRemaining??q.totalMonths??1)*30);q.chargedCost=q.chargedCost??q.cost??0;q.status="construction";q.migrated=true}}}
  }
  function buildInRegion(state,regionId,buildingId){
    const country=E.getCountry(state,state.controlledCountryId),def=C.buildings.find(b=>b.id===buildingId);if(!def)return{ok:false,message:"Instalación no encontrada."};const regions=getCountryRegions(state,country.id),region=regions.find(r=>r.id===(regionId||state.selectedRegionId))||regions[0];if(!region)return{ok:false,message:"No existe una región válida para alojar el proyecto."};
    const facilities=facilitiesInRegion(state,country,region.id);if(facilities.some(f=>f.typeId===buildingId)||country.productionQueue.some(q=>q.kind==="facilityV3"&&q.buildingId===buildingId&&q.targetRegionId===region.id))return{ok:false,message:"Esta industria ya existe o está en construcción en la región. Amplía su nivel."};
    const used=facilityUsedSlots(state,country,region.id);if(used+(def.slots||1)>(region.capacitySlots||8))return{ok:false,message:`Capacidad regional agotada (${used}/${region.capacitySlots}). Amplía slots por un coste reducido.`};
    const req=def.requires||{};if(req.infra&&(region.infra||country.systems.logistics)<req.infra)return{ok:false,message:`Infraestructura insuficiente: ${(region.infra||0).toFixed(0)}/${req.infra}.`};if(req.energy&&(region.energy||country.systems.energy)<req.energy)return{ok:false,message:`Energía insuficiente: ${(region.energy||0).toFixed(0)}/${req.energy}.`};if(req.technology&&country.systems.technology<req.technology)return{ok:false,message:`Tecnología insuficiente: ${country.systems.technology.toFixed(0)}/${req.technology}.`};if(req.stability&&(region.stability||country.systems.stability)<req.stability)return{ok:false,message:`Estabilidad insuficiente: ${(region.stability||0).toFixed(0)}/${req.stability}.`};if(req.coastal&&LANDLOCKED.has(country.id))return{ok:false,message:"El país no dispone de costa para esta instalación."};
    const parallel=country.productionQueue.filter(q=>q.kind==="facilityV3").length,cost=round(def.cost*(1+parallel*.025),2);if(country.economy.treasury<cost)return{ok:false,message:`Tesorería insuficiente: ${cost.toLocaleString("es-ES")} mil M€.`};const days=Math.max(45,Math.round((def.months||12)*30*clamp(92/Math.max(25,country.systems.industry),.72,1.9)));
    country.economy.treasury=round(country.economy.treasury-cost,2);country.productionQueue.push({id:uid(),kind:"facilityV3",buildingId,targetCountryId:country.id,targetRegionId:region.id,regionId:region.id,name:def.name,totalDays:days,daysRemaining:days,chargedCost:cost,cost,status:"construction",startedDate:state.date,commitAttempts:0});E.pushEvent(state,"industry",`Construcción iniciada: ${def.name}`,`${region.name} · ${days} días · ${cost.toLocaleString("es-ES")} mil M€.`);return{ok:true,message:`${def.name} inicia obras en ${region.name}. El proyecto queda protegido contra pérdida de cola.`}
  }
  function commitFacility(state,country,q){
    const def=C.buildings.find(b=>b.id===q.buildingId);if(!def){country.economy.treasury=round(country.economy.treasury+(q.chargedCost||0),2);E.pushEvent(state,"industry","Proyecto cancelado y reembolsado",`${q.name||q.buildingId}: definición inexistente; se devuelve el coste.`);return{done:true,ok:false}}
    let region=getRegion(state,country.id,q.targetRegionId||q.regionId);if(!region){region=getCountryRegions(state,country.id)[0];q.targetRegionId=region?.id||null;q.regionId=region?.id||null}
    if(!region){q.commitAttempts=(q.commitAttempts||0)+1;if(q.commitAttempts>=2){country.economy.treasury=round(country.economy.treasury+(q.chargedCost||0),2);E.pushEvent(state,"industry","Proyecto reembolsado",`${def.name}: no se encontró territorio válido.`);return{done:true,ok:false}}return{done:false,ok:false}}
    const list=facilitiesInRegion(state,country,region.id);const duplicate=list.find(f=>f.typeId===def.id);if(duplicate){duplicate.level=Math.min(def.maxLevel||5,(duplicate.level||1)+1);duplicate.condition=100;E.pushEvent(state,"industry",`${def.name} ampliada`,`${region.name}: el proyecto duplicado se convierte en una ampliación de nivel.`);E.recalculateCountryEconomy?.(state,country);return{done:true,ok:true}}
    const facility={id:uid(),typeId:def.id,level:1,condition:100,regionId:region.id,countryId:country.id,lat:region.lat+seeded(q.id,-.22,.22,2),lng:normalizeLng(region.lng+seeded(q.id,-.30,.30,3)),commissioned:state.date};if(country.id==="ESP")region.buildings.push(facility);else country.facilities.push(facility);
    region.directJobs=round((region.directJobs||0)+(def.jobs||0),0);region.industry=round(clamp((region.industry||country.systems.industry)+(def.output||1)*.18,0,100),1);E.recalculateCountryEconomy?.(state,country);calculateResourceBalance(state,country);E.pushEvent(state,"industry",`${def.name} entra en servicio`,`${region.name}: ${def.capacity}; ${(def.jobs||0).toLocaleString("es-ES")} empleos directos.`);return{done:true,ok:true}
  }
  function processConstructionQueue(state){
    for(const country of state.countries){const keep=[];for(const q of country.productionQueue||[]){if(q.kind!=="facilityV3"){keep.push(q);continue}q.daysRemaining=Math.max(0,(q.daysRemaining??q.totalDays??1)-1);if(q.daysRemaining>0){keep.push(q);continue}q.status="commissioning";const result=commitFacility(state,country,q);if(!result.done)keep.push(q)}country.productionQueue=keep}
  }
  function expandRegionSlots(state,countryId,regionId){
    const country=E.getCountry(state,countryId||state.controlledCountryId);if(country.id!==state.controlledCountryId)return{ok:false,message:"Solo puedes ampliar regiones del país controlado."};const region=getRegion(state,country.id,regionId);if(!region)return{ok:false,message:"Región no encontrada."};const level=region.slotExpansionLevel||0,cost=round(.45+level*.22+(region.capacitySlots||8)*.025,2);if(country.economy.treasury<cost)return{ok:false,message:`Se necesitan ${cost.toLocaleString("es-ES")} mil M€.`};country.economy.treasury=round(country.economy.treasury-cost,2);region.capacitySlots=(region.capacitySlots||8)+2;region.slotExpansionLevel=level+1;region.infra=round(clamp((region.infra||50)+.6,0,100),1);E.pushEvent(state,"region",`Suelo industrial ampliado en ${region.name}`,`+2 slots por ${cost.toLocaleString("es-ES")} mil M€.`);return{ok:true,message:`${region.name}: capacidad ampliada a ${region.capacitySlots} slots.`}
  }
  function upgradeBuilding(state,regionId,facilityId){const country=E.getCountry(state,state.controlledCountryId),before=country.economicModel?.facilityJobs||0,result=oldUpgradeBuilding(state,regionId,facilityId);if(result?.ok){const region=getCountryRegions(state,country.id).find(r=>facilitiesInRegion(state,country,r.id).some(f=>f.id===facilityId));if(region){const facility=facilitiesInRegion(state,country,region.id).find(f=>f.id===facilityId),def=C.buildings.find(d=>d.id===facility?.typeId);region.directJobs=round((region.directJobs||0)+(def?.jobs||0),0)}E.recalculateCountryEconomy?.(state,country);calculateResourceBalance(state,country);const delta=Math.max(0,(country.economicModel?.facilityJobs||0)-before);result.message+=` Producción y empleo: +${delta.toLocaleString("es-ES")} puestos directos.`}return result}

  function calculateResourceBalance(state,country){
    let result=oldCalculateResourceBalance?oldCalculateResourceBalance(state,country):country.resourceBalance;country.resourceBalance||={};
    const additions={electricity:0,food:0,fuel:0,steel:0,vehicles:0,electronics:0,machinery:0,medicines:0};const all=country.id==="ESP"?state.regions.flatMap(r=>(r.buildings||[]).map(f=>({...f,region:r}))):(country.facilities||[]);
    for(const f of all){const def=C.buildings.find(d=>d.id===f.typeId);if(!def)continue;for(const [key,value] of Object.entries(def.resourceEffects||{}))if(key in additions)additions[key]+=Number(value||0)*(f.level||1)}
    const occupation={electricity:0,food:0,fuel:0,steel:0,vehicles:0,electronics:0,machinery:0,medicines:0};
    for(const owner of state.countries){if(owner.id===country.id)continue;for(const region of getCountryRegions(state,owner.id)){if(region.controllerId!==country.id)continue;for(const [key,value] of Object.entries(region.resourceOutput||{}))if(key in occupation)occupation[key]+=Number(value||0)*.55}}
    for(const [key,value] of Object.entries(additions)){const row=country.resourceBalance[key]||{production:0,consumption:0,balance:0,unit:""};row.production=round((row.production||0)+value+(occupation[key]||0),1);row.balance=round(row.production-(row.consumption||0),1);row.occupationProduction=round(occupation[key]||0,1);country.resourceBalance[key]=row}
    country.regionalResourceProduction={};for(const r of getCountryRegions(state,country.id)){country.regionalResourceProduction[r.id]={...(r.resourceOutput||{})};for(const f of facilitiesInRegion(state,country,r.id)){const def=C.buildings.find(d=>d.id===f.typeId);for(const [k,v] of Object.entries(def?.resourceEffects||{}))country.regionalResourceProduction[r.id][k]=round((country.regionalResourceProduction[r.id][k]||0)+v*(f.level||1),1)}}
    return result||country.resourceBalance;
  }

  function hydrateV14(state){
    state=oldHydrate(state);state.version="1.4-alpha";state.regionBattles||=[];ensureCompanies(state);ensureRegions(state);migrateConstructionQueues(state);
    for(const country of state.countries){ensureCoalitionData(country);ensureUnitRegions(state,country);calculateResourceBalance(state,country)}
    state.selectedCountryId||=state.controlledCountryId||"ESP";const selectedRegions=getCountryRegions(state,state.selectedCountryId);if(!selectedRegions.some(r=>r.id===state.selectedRegionId))state.selectedRegionId=selectedRegions[0]?.id||null;
    return state;
  }
  function createInitialState(){const state=hydrateV14(oldCreate());E.pushEvent(state,"system","NEXUS Global Alpha v1.4","Construcción protegida, regiones mundiales, conquista territorial, coaliciones y catálogo industrial ampliado.");return state}
  function tickDay(state){const summary=oldTickDay(state);processConstructionQueue(state);processUnitMovements(state);processRegionBattles(state);for(const country of state.countries){ensureCoalitionData(country);if(state.dayIndex%30===0)calculateResourceBalance(state,country)}return summary}

  function regionResources(state,countryId,regionId){const country=E.getCountry(state,countryId),region=getRegion(state,country.id,regionId);if(!region)return[];const output={...(region.resourceOutput||{})};for(const f of facilitiesInRegion(state,country,region.id)){const def=C.buildings.find(d=>d.id===f.typeId);for(const [k,v] of Object.entries(def?.resourceEffects||{}))output[k]=round((output[k]||0)+v*(f.level||1),1)}return Object.entries(output).map(([id,value])=>({id,value,name:state.resourceDefinitions?.find(d=>d.id===id)?.name||id,icon:state.resourceDefinitions?.find(d=>d.id===id)?.icon||"📦",unit:state.resourceDefinitions?.find(d=>d.id===id)?.unit||""})).sort((a,b)=>b.value-a.value)}

  Object.assign(E,{
    createInitialState,hydrateState:hydrateV14,tickDay,buildInRegion,upgradeBuilding,expandRegionSlots,
    getCountryRegions,getControlledRegions,getRegion,facilitiesInRegion,regionResources,calculateResourceBalance,
    deployUnit,moveUnit:deployUnit,attackRegion,processUnitMovements,processRegionBattles,
    negotiateCoalition,removeCoalitionParty,coalitionInfo,coalitionSupport,coalitionCompatibility,ideologyAxis,
    version14:true
  });
})();
