"use strict";

window.NEXUS_DATA = (() => {
  const countries = [
    {
      id: "ESP", name: "España", flag: "🇪🇸", color: "#ffcc3d", map: { x: 565, y: 255, size: 24 },
      economy: { gdp: 2850, population: 49.8, treasury: 245, debtRatio: 78, growth: 3.2, inflation: 2.2, unemployment: 6.4, taxRate: 37.5, confidence: 82 },
      systems: { industry: 86, technology: 84, logistics: 92, energy: 85, food: 88, military: 79, intelligence: 76, stability: 85, approval: 77, renewables: 79 },
      budgets: { health: 6.9, education: 5.6, defense: 2.7, infrastructure: 4.4, research: 3.4, welfare: 9.1 },
      strengths: ["Automoción y movilidad", "Renovables", "Turismo de alto valor", "Infraestructura ferroviaria", "Astilleros y aeroespacial"],
      risks: ["Deuda todavía elevada", "Dependencia de importaciones energéticas", "Desigualdad territorial"]
    },
    {
      id: "FRA", name: "Francia", flag: "🇫🇷", color: "#4f86ff", map: { x: 585, y: 220, size: 26 },
      economy: { gdp: 3150, population: 68.4, treasury: 160, debtRatio: 109, growth: 1.7, inflation: 2.1, unemployment: 7.2, taxRate: 43, confidence: 68 },
      systems: { industry: 84, technology: 86, logistics: 86, energy: 90, food: 88, military: 86, intelligence: 82, stability: 74, approval: 58, renewables: 38 },
      budgets: { health: 7.2, education: 5.6, defense: 2.3, infrastructure: 3.5, research: 3.2, welfare: 11.2 },
      strengths: ["Aeroespacial", "Nuclear", "Defensa"], risks: ["Deuda", "Tensión social"]
    },
    {
      id: "DEU", name: "Alemania", flag: "🇩🇪", color: "#7fd1ae", map: { x: 615, y: 205, size: 27 },
      economy: { gdp: 4700, population: 84.5, treasury: 210, debtRatio: 63, growth: 1.3, inflation: 2.2, unemployment: 4.9, taxRate: 40, confidence: 73 },
      systems: { industry: 92, technology: 90, logistics: 91, energy: 69, food: 81, military: 74, intelligence: 79, stability: 82, approval: 64, renewables: 55 },
      budgets: { health: 7.4, education: 5.0, defense: 2.1, infrastructure: 3.4, research: 3.5, welfare: 10.4 },
      strengths: ["Industria avanzada", "Maquinaria", "Química"], risks: ["Energía", "Demografía"]
    },
    {
      id: "ITA", name: "Italia", flag: "🇮🇹", color: "#7ecf8f", map: { x: 615, y: 255, size: 23 },
      economy: { gdp: 2400, population: 58.9, treasury: 115, debtRatio: 135, growth: 1.4, inflation: 2.3, unemployment: 7.6, taxRate: 41, confidence: 62 },
      systems: { industry: 80, technology: 76, logistics: 75, energy: 67, food: 87, military: 72, intelligence: 70, stability: 66, approval: 54, renewables: 45 },
      budgets: { health: 6.7, education: 4.6, defense: 1.8, infrastructure: 3.2, research: 2.2, welfare: 10.1 },
      strengths: ["Manufactura", "Diseño", "Agroalimentación"], risks: ["Deuda", "Productividad"]
    },
    {
      id: "PRT", name: "Portugal", flag: "🇵🇹", color: "#58c58d", map: { x: 548, y: 260, size: 17 },
      economy: { gdp: 320, population: 10.5, treasury: 24, debtRatio: 96, growth: 2.3, inflation: 2.2, unemployment: 6.4, taxRate: 35, confidence: 70 },
      systems: { industry: 63, technology: 68, logistics: 76, energy: 75, food: 77, military: 51, intelligence: 55, stability: 78, approval: 65, renewables: 68 },
      budgets: { health: 6.4, education: 5.0, defense: 1.6, infrastructure: 3.7, research: 2.1, welfare: 8.5 },
      strengths: ["Renovables", "Servicios", "Puertos"], risks: ["Escala industrial"]
    },
    {
      id: "GBR", name: "Reino Unido", flag: "🇬🇧", color: "#8aa2ff", map: { x: 555, y: 185, size: 24 },
      economy: { gdp: 3550, population: 69.0, treasury: 145, debtRatio: 101, growth: 1.8, inflation: 2.5, unemployment: 4.5, taxRate: 38, confidence: 71 },
      systems: { industry: 78, technology: 91, logistics: 84, energy: 73, food: 60, military: 88, intelligence: 91, stability: 76, approval: 59, renewables: 51 },
      budgets: { health: 7.5, education: 5.3, defense: 2.5, infrastructure: 3.0, research: 3.4, welfare: 9.7 },
      strengths: ["Finanzas", "Tecnología", "Defensa"], risks: ["Balanza comercial", "Productividad"]
    },
    {
      id: "USA", name: "Estados Unidos", flag: "🇺🇸", color: "#69a7ff", map: { x: 220, y: 210, size: 38 },
      economy: { gdp: 29800, population: 342, treasury: 920, debtRatio: 121, growth: 2.2, inflation: 2.7, unemployment: 4.1, taxRate: 27, confidence: 78 },
      systems: { industry: 94, technology: 99, logistics: 93, energy: 96, food: 98, military: 100, intelligence: 99, stability: 72, approval: 56, renewables: 31 },
      budgets: { health: 8.0, education: 5.1, defense: 3.6, infrastructure: 3.1, research: 4.1, welfare: 8.1 },
      strengths: ["Tecnología", "Defensa", "Capital"], risks: ["Deuda", "Polarización"]
    },
    {
      id: "CHN", name: "China", flag: "🇨🇳", color: "#ff6f6f", map: { x: 865, y: 245, size: 36 },
      economy: { gdp: 19500, population: 1410, treasury: 780, debtRatio: 77, growth: 4.5, inflation: 1.8, unemployment: 5.2, taxRate: 28, confidence: 75 },
      systems: { industry: 100, technology: 92, logistics: 94, energy: 96, food: 82, military: 96, intelligence: 92, stability: 86, approval: 75, renewables: 48 },
      budgets: { health: 5.2, education: 4.7, defense: 2.1, infrastructure: 5.2, research: 4.0, welfare: 6.3 },
      strengths: ["Manufactura", "Escala", "Infraestructura"], risks: ["Demografía", "Sector inmobiliario"]
    },
    {
      id: "JPN", name: "Japón", flag: "🇯🇵", color: "#ff9da4", map: { x: 1010, y: 245, size: 23 },
      economy: { gdp: 4300, population: 123, treasury: 190, debtRatio: 246, growth: 1.2, inflation: 2.0, unemployment: 2.7, taxRate: 34, confidence: 72 },
      systems: { industry: 92, technology: 96, logistics: 95, energy: 62, food: 54, military: 78, intelligence: 79, stability: 91, approval: 61, renewables: 28 },
      budgets: { health: 7.8, education: 4.9, defense: 1.8, infrastructure: 3.6, research: 3.8, welfare: 11.3 },
      strengths: ["Robótica", "Automoción", "Electrónica"], risks: ["Demografía", "Deuda"]
    },
    {
      id: "RUS", name: "Rusia", flag: "🇷🇺", color: "#c789ff", map: { x: 760, y: 135, size: 35 },
      economy: { gdp: 2250, population: 144, treasury: 175, debtRatio: 24, growth: 1.8, inflation: 7.5, unemployment: 4.2, taxRate: 26, confidence: 48 },
      systems: { industry: 76, technology: 75, logistics: 62, energy: 99, food: 89, military: 96, intelligence: 91, stability: 69, approval: 66, renewables: 12 },
      budgets: { health: 4.5, education: 4.0, defense: 5.6, infrastructure: 3.0, research: 2.7, welfare: 7.2 },
      strengths: ["Energía", "Defensa", "Recursos"], risks: ["Sanciones", "Demografía"]
    },
    {
      id: "IND", name: "India", flag: "🇮🇳", color: "#ffaf5e", map: { x: 795, y: 330, size: 31 },
      economy: { gdp: 4250, population: 1450, treasury: 210, debtRatio: 82, growth: 6.1, inflation: 4.6, unemployment: 6.5, taxRate: 22, confidence: 81 },
      systems: { industry: 82, technology: 84, logistics: 71, energy: 76, food: 91, military: 88, intelligence: 76, stability: 70, approval: 67, renewables: 26 },
      budgets: { health: 3.6, education: 4.2, defense: 2.5, infrastructure: 4.7, research: 2.6, welfare: 6.1 },
      strengths: ["Servicios digitales", "Demografía", "Crecimiento"], risks: ["Infraestructura", "Desigualdad"]
    },
    {
      id: "BRA", name: "Brasil", flag: "🇧🇷", color: "#62c98a", map: { x: 355, y: 410, size: 31 },
      economy: { gdp: 2350, population: 218, treasury: 125, debtRatio: 86, growth: 2.6, inflation: 4.1, unemployment: 7.1, taxRate: 33, confidence: 66 },
      systems: { industry: 74, technology: 66, logistics: 61, energy: 89, food: 100, military: 70, intelligence: 62, stability: 64, approval: 55, renewables: 82 },
      budgets: { health: 5.2, education: 5.4, defense: 1.3, infrastructure: 3.1, research: 1.8, welfare: 9.0 },
      strengths: ["Agricultura", "Minería", "Renovables"], risks: ["Logística", "Inflación"]
    },
    {
      id: "TUR", name: "Turquía", flag: "🇹🇷", color: "#e98585", map: { x: 670, y: 275, size: 21 },
      economy: { gdp: 1450, population: 87, treasury: 72, debtRatio: 36, growth: 3.4, inflation: 14.0, unemployment: 9.1, taxRate: 30, confidence: 52 },
      systems: { industry: 78, technology: 69, logistics: 79, energy: 63, food: 86, military: 82, intelligence: 75, stability: 58, approval: 53, renewables: 34 },
      budgets: { health: 4.9, education: 4.7, defense: 2.6, infrastructure: 4.1, research: 2.0, welfare: 7.2 },
      strengths: ["Defensa", "Logística", "Manufactura"], risks: ["Inflación", "Divisa"]
    },
    {
      id: "MAR", name: "Marruecos", flag: "🇲🇦", color: "#d07b62", map: { x: 560, y: 305, size: 18 },
      economy: { gdp: 165, population: 38.4, treasury: 17, debtRatio: 69, growth: 4.0, inflation: 3.1, unemployment: 10.8, taxRate: 28, confidence: 68 },
      systems: { industry: 61, technology: 54, logistics: 70, energy: 64, food: 71, military: 64, intelligence: 61, stability: 72, approval: 62, renewables: 46 },
      budgets: { health: 4.6, education: 5.3, defense: 3.1, infrastructure: 4.6, research: 1.6, welfare: 6.8 },
      strengths: ["Automoción", "Fosfatos", "Logística"], risks: ["Agua", "Desempleo"]
    }
  ];

  const spainRegions = [
    { id: "GAL", name: "Galicia", capital: "Santiago", population: 2.70, gdp: 83, infra: 76, industry: 68, energy: 84, stability: 81, specialization: "Pesca · Naval · Eólica", polygon: "105,135 205,112 252,155 232,220 145,235 92,190" },
    { id: "AST", name: "Asturias", capital: "Oviedo", population: 1.00, gdp: 31, infra: 78, industry: 75, energy: 79, stability: 84, specialization: "Acero · Ingeniería · Energía", polygon: "205,112 315,115 338,177 252,188 252,155" },
    { id: "CNT", name: "Cantabria", capital: "Santander", population: 0.59, gdp: 18, infra: 80, industry: 70, energy: 73, stability: 85, specialization: "Industria · Puerto · Turismo", polygon: "315,115 390,123 405,180 338,177" },
    { id: "PVA", name: "País Vasco", capital: "Vitoria", population: 2.23, gdp: 93, infra: 91, industry: 91, energy: 71, stability: 86, specialization: "Máquina-herramienta · Automoción", polygon: "390,123 470,128 488,185 405,180" },
    { id: "NAV", name: "Navarra", capital: "Pamplona", population: 0.68, gdp: 26, infra: 88, industry: 89, energy: 82, stability: 90, specialization: "Automoción · Eólica · Agro", polygon: "470,128 535,152 525,235 488,185" },
    { id: "RIO", name: "La Rioja", capital: "Logroño", population: 0.32, gdp: 10, infra: 84, industry: 73, energy: 70, stability: 89, specialization: "Agroindustria · Vino", polygon: "405,180 488,185 480,235 400,230" },
    { id: "CYL", name: "Castilla y León", capital: "Valladolid", population: 2.38, gdp: 73, infra: 79, industry: 75, energy: 92, stability: 85, specialization: "Automoción · Agro · Renovables", polygon: "145,235 252,188 405,180 400,230 420,310 230,320 165,275" },
    { id: "ARA", name: "Aragón", capital: "Zaragoza", population: 1.35, gdp: 51, infra: 90, industry: 88, energy: 90, stability: 88, specialization: "Logística · Automoción · Eólica", polygon: "480,235 590,210 630,340 515,355 420,310 400,230" },
    { id: "CAT", name: "Cataluña", capital: "Barcelona", population: 8.00, gdp: 310, infra: 94, industry: 92, energy: 77, stability: 74, specialization: "Industria · Biotech · Digital", polygon: "590,210 720,225 740,330 630,340" },
    { id: "MAD", name: "Comunidad de Madrid", capital: "Madrid", population: 7.00, gdp: 305, infra: 96, industry: 85, energy: 60, stability: 82, specialization: "Finanzas · Servicios · Aeroespacial", polygon: "335,305 405,295 420,355 350,365" },
    { id: "CLM", name: "Castilla-La Mancha", capital: "Toledo", population: 2.10, gdp: 56, infra: 80, industry: 73, energy: 94, stability: 86, specialization: "Renovables · Agro · Logística", polygon: "230,320 335,305 350,365 515,355 515,440 320,455 240,400" },
    { id: "VAL", name: "Comunitat Valenciana", capital: "Valencia", population: 5.40, gdp: 145, infra: 91, industry: 86, energy: 76, stability: 82, specialization: "Automoción · Cerámica · Puerto", polygon: "515,355 630,340 620,450 550,475 515,440" },
    { id: "EXT", name: "Extremadura", capital: "Mérida", population: 1.05, gdp: 26, infra: 69, industry: 55, energy: 96, stability: 84, specialization: "Solar · Agro · Defensa", polygon: "165,275 230,320 240,400 320,455 205,470 145,405" },
    { id: "MUR", name: "Región de Murcia", capital: "Murcia", population: 1.57, gdp: 40, infra: 80, industry: 72, energy: 73, stability: 83, specialization: "Agro · Naval · Química", polygon: "515,440 550,475 540,525 475,515" },
    { id: "AND", name: "Andalucía", capital: "Sevilla", population: 8.65, gdp: 205, infra: 82, industry: 70, energy: 97, stability: 79, specialization: "Aeroespacial · Agro · Solar", polygon: "205,470 320,455 475,515 455,575 205,565 130,505" },
    { id: "BAL", name: "Illes Balears", capital: "Palma", population: 1.24, gdp: 41, infra: 83, industry: 55, energy: 61, stability: 86, specialization: "Turismo · Servicios", polygon: "700,380 760,365 790,405 735,430" },
    { id: "CAN", name: "Canarias", capital: "Las Palmas", population: 2.25, gdp: 52, infra: 77, industry: 52, energy: 69, stability: 82, specialization: "Turismo · Puertos · Espacio", polygon: "75,500 110,485 140,510 112,535 72,530" }
  ];

  const unitCatalog = [
    { id: "infantry", name: "Brigada de infantería", category: "Tierra", icon: "assets/icons/infantry.svg", cost: 1.8, upkeep: 0.012, months: 2, power: 12, manpower: 4200 },
    { id: "mechanized", name: "Brigada mecanizada", category: "Tierra", icon: "assets/icons/mechanized.svg", cost: 4.8, upkeep: 0.025, months: 4, power: 28, manpower: 3100 },
    { id: "armor", name: "Grupo acorazado", category: "Tierra", icon: "assets/icons/tank.svg", cost: 7.2, upkeep: 0.040, months: 5, power: 42, manpower: 2200 },
    { id: "artillery", name: "Regimiento de artillería", category: "Tierra", icon: "assets/icons/artillery.svg", cost: 3.4, upkeep: 0.018, months: 3, power: 22, manpower: 1200 },
    { id: "fighter", name: "Ala multirrol", category: "Aire", icon: "assets/icons/fighter.svg", cost: 9.5, upkeep: 0.055, months: 6, power: 46, manpower: 900 },
    { id: "drone", name: "Escuadrón UAV", category: "Aire", icon: "assets/icons/drone.svg", cost: 3.2, upkeep: 0.014, months: 3, power: 18, manpower: 240 },
    { id: "frigate", name: "Fragata oceánica", category: "Mar", icon: "assets/icons/frigate.svg", cost: 8.8, upkeep: 0.048, months: 8, power: 39, manpower: 220 },
    { id: "submarine", name: "Submarino convencional", category: "Mar", icon: "assets/icons/submarine.svg", cost: 11.5, upkeep: 0.060, months: 10, power: 51, manpower: 95 },
    { id: "satellite", name: "Satélite ISR", category: "Espacio", icon: "assets/icons/satellite.svg", cost: 6.0, upkeep: 0.008, months: 7, power: 20, manpower: 60 }
  ];

  const companies = [
    { id: "indra", name: "Indra Sistemas", countryId: "ESP", sector: "Defensa y tecnología", price: 31, shares: 1000, marketCap: 31, growthBias: 1.15 },
    { id: "iberdrola", name: "Iberdrola", countryId: "ESP", sector: "Energía", price: 15, shares: 5200, marketCap: 78, growthBias: 1.05 },
    { id: "ferrovial", name: "Ferrovial", countryId: "ESP", sector: "Infraestructura", price: 45, shares: 1600, marketCap: 72, growthBias: 1.02 },
    { id: "aena", name: "AENA", countryId: "ESP", sector: "Transporte", price: 22, shares: 2300, marketCap: 51, growthBias: 0.97 },
    { id: "rheinmetall", name: "Rheinmetall", countryId: "DEU", sector: "Defensa", price: 88, shares: 1000, marketCap: 88, growthBias: 1.18 },
    { id: "airbus", name: "Airbus", countryId: "FRA", sector: "Aeroespacial", price: 52, shares: 1800, marketCap: 94, growthBias: 1.08 },
    { id: "stellantis", name: "Stellantis", countryId: "ITA", sector: "Automoción", price: 19, shares: 3100, marketCap: 59, growthBias: 0.96 },
    { id: "tsmc", name: "TSMC Europe", countryId: "DEU", sector: "Semiconductores", price: 74, shares: 2200, marketCap: 163, growthBias: 1.22 }
  ];

  const nationalProjects = [
    { id: "rail", name: "Corredor Atlántico-Mediterráneo", cost: 38, months: 24, effect: { logistics: 9, industry: 3, growth: 0.25 } },
    { id: "chips", name: "Programa Ibérico de Semiconductores", cost: 52, months: 30, effect: { technology: 11, industry: 6, growth: 0.30 } },
    { id: "energy", name: "Red Peninsular 2035", cost: 44, months: 26, effect: { energy: 12, renewables: 7, growth: 0.22 } },
    { id: "defense", name: "Escudo Tecnológico Nacional", cost: 61, months: 36, effect: { military: 10, intelligence: 12, technology: 5 } }
  ];

  return { countries, spainRegions, unitCatalog, companies, nationalProjects };
})();
