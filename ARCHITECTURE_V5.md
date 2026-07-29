# Arquitectura de simulación v5

## Contrato de compatibilidad

La v5 no borra campos heredados. `js/v5/bridge.js` captura una sola vez las funciones de v2, ejecuta el tick histórico con una fuente aleatoria sembrada y después invoca el pipeline modular. Así se conservan mapa, regiones, industria, bolsa, política, investigación, unidades, campañas, cuentas y guardados anteriores mientras se incorpora el nuevo modelo.

El estado expone `v5.schema = 5`. Las migraciones 0→1→2→3→4→5 se ejecutan en orden y quedan registradas en `state.v5.migrations`.

## Pipeline

| Orden | Sistema | Frecuencia | Responsabilidad |
|---:|---|---|---|
| 20 | economy.product-markets | diaria | Oferta, demanda, inventario, escasez y precios |
| 25 | economy.firms-and-credit | semanal | Empresas, empleo, inversión, quiebras y banca |
| 30 | economy.national-accounts | mensual | PIB real/nominal, ciclo, inflación y desempleo |
| 35 | economy.monetary-financial | mensual | Banco central, moneda, bonos, bolsa y vivienda |
| 40 | infrastructure.energy-grid | diaria | Capacidad, demanda, fiabilidad y apagones |
| 42 | infrastructure.freight-network | semanal | Carga, puertos, ferrocarril y cuellos de botella |
| 44 | world.trade-supply-network | semanal | Cadenas globales, corredores y estrechos estratégicos |
| 50 | society.labor-skills | mensual | Empleo, vacantes, salarios y capacidades |
| 55 | society.demography-housing | trimestral | Cohortes, migración, urbanización y vivienda |
| 57 | society.health-food | mensual | Sanidad, epidemias, alimentación y agua |
| 60 | world.climate-environment | trimestral | Emisiones, adaptación y desastres |
| 70 | governance.public-opinion-media | semanal | Temas, aprobación, protesta, medios y narrativas |
| 72 | governance.parties-institutions | mensual | Partidos, capital político, Estado y burocracia |
| 74 | governance.corruption-crime | trimestral | Corrupción, crimen, informalidad e investigaciones |
| 76 | governance.leaders-elites | anual | Líderes, salud, élites y sucesión |
| 80 | diplomacy.multidimensional-relations | semanal | Seguridad, economía, ideología y opinión bilateral |
| 82 | intelligence.fog-and-estimates | semanal | Inteligencia, confianza, engaño y niebla |
| 84 | technology.knowledge-diffusion | mensual | Frontera, dominios, patentes y difusión |
| 86 | world.organizations-treaties | mensual | Organizaciones, agenda, resoluciones y cumplimiento |
| 88 | ai.strategic-director | semanal | Objetivos, estrategia y conflictos moderados |
| 90 | war.operations-logistics | diaria | Suministro, moral, fases, balance y bajas |
| 92 | war.occupation-resistance | semanal | Legitimidad, seguridad, resistencia y colaboración |
| 96 | world.emergent-events | semanal | Crisis cruzadas y decisiones accionables |

## Determinismo y diagnóstico

- La semilla combina campaña, día y ámbito del sistema.
- El motor histórico recibe temporalmente la misma fuente sembrada, evitando divergencia por `Math.random()`.
- Cada ejecución queda en `state.v5.audit`; los errores aislados se conservan en `state.v5.errors` sin detener la cronología.
- `NEXUS_V5.explain()` devuelve los impulsores de crecimiento, inflación, desempleo y aprobación que consume la interfaz.
- `tests/v50-validation.js` compara dos campañas con la misma semilla y comprueba migración, anexión, finitud y conservación de selección.

## Integración de anexiones

El Estado derrotado deja de ser soberano, conserva su identidad histórica y apunta a `annexedBy`. El vencedor absorbe población, PIB operativo, empresas, mercados, inventarios, cohortes y regiones. La capacidad productiva entra parcialmente dañada; se crea una zona de ocupación con legitimidad, seguridad, reconstrucción, resistencia y colaboración. El jugador elige integración plena, autonomía, administración transitoria o Estado asociado.

## Interfaz

El panel **Sistemas** presenta:

- ciclo, PIB mundial, banca, energía, trabajo, vivienda, protesta y clima;
- decisiones pendientes con varias respuestas;
- explicaciones causales;
- mercados de productos;
- empresas agentes;
- demografía, servicios e instituciones;
- estrategia exterior y niebla de guerra;
- riesgos ordenados por severidad.
