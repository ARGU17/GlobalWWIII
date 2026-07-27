"use strict";

window.NEXUS_CATALOG = (() => {
  const buildings = [
    { id:"housing", category:"Urbano", icon:"🏘️", name:"Distrito residencial", cost:6, months:8, jobs:900, effects:{ population:0.035, approval:0.35, stability:0.15 }, description:"Amplía vivienda, servicios urbanos y capacidad demográfica." },
    { id:"hospital", category:"Urbano", icon:"🏥", name:"Hospital regional", cost:9, months:10, jobs:1500, effects:{ health:2.2, approval:0.8, stability:0.3 }, description:"Mejora salud, resiliencia y cohesión social." },
    { id:"university", category:"Urbano", icon:"🎓", name:"Universidad tecnológica", cost:12, months:14, jobs:1200, effects:{ technology:2.6, researchPoints:22, approval:0.35 }, description:"Acelera investigación, talento e innovación." },
    { id:"autoPlant", category:"Industria", icon:"🚗", name:"Planta de automoción", cost:15, months:14, jobs:3600, effects:{ industry:3.2, gdp:4.8, exports:1.7, energyDemand:1.1 }, description:"Fábrica avanzada para vehículos, componentes y exportación." },
    { id:"steelPlant", category:"Industria", icon:"🏗️", name:"Acería eléctrica", cost:14, months:13, jobs:2500, effects:{ industry:2.8, gdp:3.6, energyDemand:1.8, emissions:1.1 }, description:"Producción de acero con hornos eléctricos y reciclaje." },
    { id:"chipFab", category:"Industria", icon:"🧩", name:"Fábrica de semiconductores", cost:24, months:24, jobs:2800, effects:{ industry:3.0, technology:4.0, exports:2.2, researchPoints:34, energyDemand:1.4 }, description:"Capacidad soberana en chips, sensores y electrónica de potencia." },
    { id:"shipyard", category:"Industria", icon:"⚓", name:"Astillero avanzado", cost:18, months:18, jobs:3300, effects:{ industry:3.1, military:1.4, exports:1.6 }, description:"Construcción naval civil, militar y offshore." },
    { id:"aerospace", category:"Industria", icon:"✈️", name:"Polo aeroespacial", cost:21, months:20, jobs:2900, effects:{ industry:2.4, technology:3.2, military:1.8, exports:1.9 }, description:"Aeronáutica, espacio, drones y sistemas de misión." },
    { id:"solar", category:"Energía", icon:"☀️", name:"Parque solar", cost:7, months:7, jobs:420, effects:{ energy:2.5, renewables:2.9, emissions:-0.6, energySupply:2.8 }, description:"Generación fotovoltaica a gran escala." },
    { id:"wind", category:"Energía", icon:"🌬️", name:"Parque eólico", cost:10, months:10, jobs:560, effects:{ energy:3.2, renewables:3.3, emissions:-0.8, energySupply:3.4 }, description:"Generación eólica terrestre y marina." },
    { id:"nuclear", category:"Energía", icon:"☢️", name:"Reactor modular avanzado", cost:34, months:34, jobs:2200, effects:{ energy:7.5, technology:1.2, emissions:-1.6, energySupply:8.0 }, description:"Potencia firme baja en carbono y alta disponibilidad." },
    { id:"grid", category:"Infraestructura", icon:"⚡", name:"Red eléctrica inteligente", cost:12, months:12, jobs:900, effects:{ energy:3.4, logistics:1.0, renewables:1.4 }, description:"Digitaliza red, almacenamiento e interconexiones." },
    { id:"rail", category:"Infraestructura", icon:"🚄", name:"Corredor ferroviario", cost:13, months:15, jobs:1800, effects:{ logistics:3.6, industry:1.2, emissions:-0.3, gdp:1.8 }, description:"Mejora mercancías, pasajeros y cohesión territorial." },
    { id:"port", category:"Infraestructura", icon:"🚢", name:"Puerto logístico", cost:14, months:16, jobs:1900, effects:{ logistics:3.1, exports:2.4, industry:1.0 }, description:"Capacidad portuaria, contenedores y cadenas globales." },
    { id:"airbase", category:"Defensa", icon:"🛫", name:"Base aérea integrada", cost:18, months:16, jobs:1200, effects:{ military:3.2, intelligence:1.0, logistics:0.6 }, description:"Aumenta preparación aérea, alerta y despliegue." },
    { id:"navalBase", category:"Defensa", icon:"⚓", name:"Base naval", cost:21, months:18, jobs:1500, effects:{ military:3.6, logistics:0.8, intelligence:0.6 }, description:"Sostiene flotas, submarinos y proyección marítima." },
    { id:"cyberCenter", category:"Defensa", icon:"🛰️", name:"Centro ciberespacial", cost:16, months:14, jobs:1100, effects:{ intelligence:3.5, technology:2.1, military:1.2, researchPoints:18 }, description:"Ciberdefensa, ISR, guerra electrónica y espacio." }
  ];

  const technologies = [
    {id:"aiGov", icon:"🧠", name:"IA para administración pública", branch:"Digital", cost:120, months:12, requires:[], effects:{technology:2, stability:1, efficiency:4}, description:"Automatización de servicios, fraude y planificación."},
    {id:"smartGrid", icon:"⚡", name:"Red inteligente nacional", branch:"Energía", cost:135, months:14, requires:[], effects:{energy:3, renewables:2, efficiency:3}, description:"Almacenamiento, flexibilidad y control digital."},
    {id:"advancedMaterials", icon:"🧱", name:"Materiales avanzados", branch:"Industria", cost:145, months:15, requires:[], effects:{industry:3, military:1, technology:1}, description:"Compuestos, aleaciones y fabricación aditiva."},
    {id:"semis", icon:"🧩", name:"Semiconductores 7 nm", branch:"Digital", cost:190, months:20, requires:["aiGov"], effects:{technology:5, industry:3, exports:2}, description:"Capacidad europea de chips avanzados."},
    {id:"fusion", icon:"☀️", name:"Fusión demostrativa", branch:"Energía", cost:280, months:34, requires:["smartGrid"], effects:{energy:8, technology:4, emissions:-3}, description:"Programa experimental de energía de fusión."},
    {id:"autonomousDefense", icon:"🤖", name:"Sistemas autónomos de defensa", branch:"Defensa", cost:210, months:22, requires:["advancedMaterials","aiGov"], effects:{military:5, intelligence:3, technology:2}, description:"Drones colaborativos, sensores y mando distribuido."},
    {id:"hypersonics", icon:"🚀", name:"Vectores hipersónicos", branch:"Defensa", cost:260, months:28, requires:["advancedMaterials"], effects:{military:6, intelligence:1}, description:"Propulsión, materiales térmicos y guiado avanzado."},
    {id:"quantum", icon:"⚛️", name:"Comunicaciones cuánticas", branch:"Digital", cost:250, months:28, requires:["semis"], effects:{intelligence:6, technology:4}, description:"Redes seguras y sensores de nueva generación."},
    {id:"greenHydrogen", icon:"💧", name:"Hidrógeno verde competitivo", branch:"Energía", cost:175, months:18, requires:["smartGrid"], effects:{energy:4, industry:2, emissions:-2, exports:1}, description:"Electrólisis, almacenamiento y exportación."},
    {id:"spaceISR", icon:"🛰️", name:"Constelación ISR soberana", branch:"Espacio", cost:230, months:24, requires:["semis"], effects:{intelligence:6, military:3, technology:2}, description:"Observación, comunicaciones y alerta temprana."}
  ];

  const policies = [
    {id:"industrial", icon:"🏭", name:"Política industrial activa", cost:2.5, effects:{industry:1.5, confidence:0.8, growth:0.15, inflation:0.08}, description:"Subvenciones selectivas y compra pública."},
    {id:"housing", icon:"🏘️", name:"Plan nacional de vivienda", cost:2.0, effects:{approval:1.2, stability:0.6, unemployment:-0.15}, description:"Oferta residencial, rehabilitación y alquiler asequible."},
    {id:"defense", icon:"🛡️", name:"Rearme tecnológico", cost:3.2, effects:{military:2.0, technology:0.5, approval:-0.2}, description:"Producción, munición, ciberdefensa y espacio."},
    {id:"fiscal", icon:"📉", name:"Consolidación fiscal", cost:0.5, effects:{debt:-1.2, confidence:0.6, approval:-0.8, growth:-0.08}, description:"Contención del gasto y mejora de ingresos."},
    {id:"green", icon:"🌱", name:"Aceleración verde", cost:2.4, effects:{renewables:1.7, energy:0.7, emissions:-0.8, inflation:0.05}, description:"Red, renovables, almacenamiento e industria limpia."},
    {id:"education", icon:"🎓", name:"Pacto por talento", cost:2.1, effects:{technology:1.0, approval:0.4, unemployment:-0.1}, description:"FP, universidad, idiomas y atracción de talento."}
  ];

  const operations = [
    {id:"intel", icon:"🛰️", name:"Reconocimiento estratégico", cost:1.2, risk:0.15, base:0.78, effects:{intel:12}, description:"Revela capacidades militares y económicas."},
    {id:"cyber", icon:"💻", name:"Intrusión cibernética", cost:2.4, risk:0.34, base:0.58, effects:{targetStability:-1.2, targetTech:-0.5}, description:"Degrada redes y confianza del objetivo."},
    {id:"industrySpy", icon:"🏭", name:"Espionaje industrial", cost:2.8, risk:0.28, base:0.62, effects:{research:28, targetConfidence:-0.8}, description:"Roba procesos, patentes y cadenas de suministro."},
    {id:"influence", icon:"📣", name:"Campaña de influencia", cost:1.8, risk:0.22, base:0.66, effects:{relation:5, targetApproval:-1}, description:"Modifica opinión pública y relaciones."},
    {id:"sabotage", icon:"💥", name:"Sabotaje encubierto", cost:4.2, risk:0.48, base:0.42, effects:{targetIndustry:-2.5, targetLogistics:-1.5}, description:"Ataca una instalación estratégica."}
  ];

  const objectives = [
    {id:"gdpTop", icon:"💶", name:"Potencia económica", description:"Alcanzar el top 5 mundial por PIB.", reward:10},
    {id:"tech90", icon:"🔬", name:"Soberanía tecnológica", description:"Tecnología nacional ≥ 90.", reward:8},
    {id:"energy90", icon:"⚡", name:"Independencia energética", description:"Energía ≥ 90 y renovables ≥ 78.", reward:8},
    {id:"regions", icon:"🗺️", name:"Convergencia territorial", description:"Todas las regiones con infraestructura ≥ 75.", reward:7},
    {id:"companies", icon:"🏦", name:"Campeones globales", description:"Controlar 3 empresas extranjeras.", reward:9},
    {id:"military85", icon:"🛡️", name:"Disuasión creíble", description:"Capacidad militar ≥ 85.", reward:8},
    {id:"debt70", icon:"📉", name:"Sostenibilidad fiscal", description:"Deuda pública < 70% del PIB.", reward:7},
    {id:"alliances", icon:"🤝", name:"Red de alianzas", description:"Cinco relaciones ≥ 80.", reward:8}
  ];

  const extraUnits = [
    { id:"airDefense", name:"Batería de defensa aérea", category:"Tierra", icon:"assets/icons/air-defense.svg", cost:5.6, upkeep:0.026, months:5, power:31, manpower:620, stats:{attack:20, defense:54, range:62, mobility:38} },
    { id:"rocketArtillery", name:"Grupo lanzacohetes", category:"Tierra", icon:"assets/icons/rocket-artillery.svg", cost:6.4, upkeep:0.031, months:5, power:36, manpower:720, stats:{attack:58, defense:24, range:70, mobility:48} },
    { id:"bomber", name:"Ala de ataque profundo", category:"Aire", icon:"assets/icons/bomber.svg", cost:13.5, upkeep:0.072, months:8, power:59, manpower:1100, stats:{attack:76, defense:42, range:86, mobility:80} },
    { id:"transport", name:"Ala de transporte", category:"Aire", icon:"assets/icons/transport.svg", cost:6.8, upkeep:0.036, months:5, power:21, manpower:900, stats:{attack:8, defense:26, range:82, mobility:74} },
    { id:"destroyer", name:"Destructor AAW", category:"Mar", icon:"assets/icons/destroyer.svg", cost:12.8, upkeep:0.068, months:10, power:58, manpower:260, stats:{attack:66, defense:72, range:70, mobility:52} },
    { id:"carrier", name:"Grupo aeronaval", category:"Mar", icon:"assets/icons/carrier.svg", cost:34, upkeep:0.18, months:26, power:110, manpower:4200, stats:{attack:92, defense:78, range:98, mobility:46} },
    { id:"missile", name:"Brigada de misiles", category:"Estratégico", icon:"assets/icons/missile.svg", cost:8.4, upkeep:0.032, months:7, power:48, manpower:420, stats:{attack:88, defense:20, range:96, mobility:48} },
    { id:"cyber", name:"Mando de ciberoperaciones", category:"Estratégico", icon:"assets/icons/cyber.svg", cost:5.2, upkeep:0.016, months:5, power:33, manpower:520, stats:{attack:52, defense:68, range:100, mobility:100} }
  ];

  const extraCompanies = [
    {id:"telefonica",name:"Telefónica Tech",countryId:"ESP",sector:"Telecomunicaciones",price:24,shares:2100,marketCap:50,growthBias:1.05},
    {id:"navantia",name:"Navantia",countryId:"ESP",sector:"Defensa naval",price:28,shares:900,marketCap:25,growthBias:1.12},
    {id:"talgo",name:"Talgo Mobility",countryId:"ESP",sector:"Ferroviario",price:18,shares:800,marketCap:14,growthBias:1.04},
    {id:"sener",name:"SENER Aeroespacial",countryId:"ESP",sector:"Aeroespacial",price:33,shares:700,marketCap:23,growthBias:1.13},
    {id:"siemens",name:"Siemens Energy",countryId:"DEU",sector:"Energía",price:62,shares:1600,marketCap:99,growthBias:1.07},
    {id:"sap",name:"SAP",countryId:"DEU",sector:"Software",price:81,shares:1800,marketCap:146,growthBias:1.13},
    {id:"thales",name:"Thales",countryId:"FRA",sector:"Defensa y sensores",price:76,shares:1300,marketCap:99,growthBias:1.15},
    {id:"edf",name:"EDF",countryId:"FRA",sector:"Energía nuclear",price:42,shares:2600,marketCap:109,growthBias:1.02},
    {id:"bae",name:"BAE Systems",countryId:"GBR",sector:"Defensa",price:91,shares:1900,marketCap:173,growthBias:1.16},
    {id:"asml",name:"ASML",countryId:"DEU",sector:"Semiconductores",price:112,shares:1500,marketCap:168,growthBias:1.22},
    {id:"lockheed",name:"Lockheed Martin",countryId:"USA",sector:"Defensa",price:128,shares:2200,marketCap:282,growthBias:1.17},
    {id:"tesla",name:"Tesla Energy",countryId:"USA",sector:"Automoción y energía",price:98,shares:2600,marketCap:255,growthBias:1.16},
    {id:"byd",name:"BYD",countryId:"CHN",sector:"Automoción y baterías",price:74,shares:2900,marketCap:215,growthBias:1.20},
    {id:"smic",name:"SMIC",countryId:"CHN",sector:"Semiconductores",price:59,shares:3100,marketCap:183,growthBias:1.18}
  ];

  return { buildings, technologies, policies, operations, objectives, extraUnits, extraCompanies };
})();
