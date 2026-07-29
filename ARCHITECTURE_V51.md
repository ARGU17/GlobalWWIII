# Strategic Command v5.1

v5.1 amplía v5.0 sin sustituir el motor histórico. `js/v51/bridge.js` migra cualquier estado v5.0, conserva países, regiones, guerras, bolsa, política y cuentas locales, y ejecuta nueve sistemas nuevos dentro del núcleo determinista.

## Contrato funcional

- 21 mercados exactos con producción, inventarios, tres clases de consumo, comercio, precios nacional/internacional y balance.
- Contabilidad nacional por gasto y sectores, RNB, renta disponible, ahorro, capital, PTF, economía formal/informal y las tres cuentas exteriores.
- Ocho inflaciones causales y nueve fases de ciclo/crisis con expectativas de hogares, empresas y banca.
- Moneda, banco central, curva 1/2/5/10/30 años, QE, divisas, controles, devaluación, dolarización, corralito e impago.
- Bancos con balance y riesgos; trece mercados financieros; quiebras, capital, nacionalización y privatización.
- Empresas-agente con plantas, empleo, proveedores, clientes, propiedad, patentes, riesgos, multinacionalidad y decisiones corporativas.
- Red logística de nodos y rutas físicas, con capacidad, tránsito, coste, congestión, seguro, piratería, guerra, clima, peajes, aduanas, sanciones y fiabilidad. Doce puntos estratégicos recalculan rutas.
- Red eléctrica física y quince tecnologías con CAPEX, OPEX, plazo, vida, factor, emisiones, combustible, flexibilidad y riesgo.
- Demografía multidimensional, ocho cohortes, migración, doce profesiones, siete niveles educativos y requisitos reales para semiconductores.
- Ciudades reales, vivienda, suelo y cinco políticas urbanas operables.
- Dieciocho instituciones, partidos en diez ejes, Gobierno ministerial, opinión pública segmentada, diez medios y quince economías criminales.
- Relaciones bilaterales en doce dimensiones, dieciséis tratados, quince organizaciones y once canales de influencia.

## Archivos

- `js/v51/schema.js`: catálogos, migración y estado inicial.
- `js/v51/systems.js`: nueve sistemas causales con frecuencia diaria, semanal, mensual o trimestral.
- `js/v51/bridge.js`: compatibilidad, anexión y acciones del jugador.
- `js/v51/ui.js`: paneles Mercados v5.1 y Sociedad v5.1.
- `tests/v51-validation.js`: contrato exhaustivo, acciones, 92 días, migración y determinismo.

La simulación no usa azar sin semilla. El estado v5.1 se crea una vez y después se actualiza incrementalmente para mantener fluidez a x16 y x32.
