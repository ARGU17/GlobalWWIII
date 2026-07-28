# NEXUS Global — Alpha v1.8

Simulador geopolítico, económico, político, industrial y militar ejecutable en navegador y preparado para GitHub Pages.

## Cambios principales de Alpha v1.8

- **Anexión consolidada:** el Estado derrotado deja de figurar como soberano en mapa, selectores y Diplomacia. Sus regiones, población, PIB, deuda, Tesoro, empresas, unidades, recursos e instalaciones pasan al vencedor, que obtiene un mercado interior automático al 100% de eficiencia.
- **Reconstrucción de posguerra:** cada territorio absorbido conserva daños de infraestructura, energía e industria. Se puede reconstruir una región por partes, ejecutar un plan integral o responder desde el Centro de decisiones.
- **Regiones con identidad real:** se sustituyen nombres genéricos por divisiones administrativas y ciudades reales, entre ellas Texas · Austin, Louisiana · Baton Rouge, Antioquia · Medellín y Tánger-Tetuán-Alhucemas.
- **I+D proporcional:** la generación mensual depende de la inversión en investigación, educación, tecnología e instalaciones científicas. La población y capacidad de países absorbidos aportan una bonificación adicional.
- **Presupuesto operativo:** sanidad, educación, defensa, infraestructuras, I+D y protección social modifican crecimiento, productividad, estabilidad, tecnología, energía, logística, preparación y capacidad militar.
- **Economía regional dinámica:** subir industrias recalcula empleo, población, PIB y PIB per cápita de la región. El panel territorial muestra esos valores actualizados.
- **Deuda gestionable:** Economía permite amortizar el 1%, 5% o 10% del stock; baja el ratio, el tipo de interés y genera ahorro mensual futuro.
- **IA geopolítica calibrada:** el director usa una base de ocho conflictos interestatales activos y pondera proximidad, relaciones y zonas de riesgo. El techo de seis guerras evita una simulación caótica.
- **Logística visible:** los ataques mantienen tiempo real de marcha y unidades animadas; las rutas comerciales interiores usan camiones. España distribuye el tráfico entre puertos atlánticos, cantábricos, andaluces y mediterráneos según el origen.
- **Capas de mapa especializadas:** Militar muestra unidades y frentes; Industria muestra únicamente instalaciones y niveles.
- **Política más dinámica:** el rendimiento y la ganancia de escaños generan capital político. Las opciones económicas de centro-derecha reciben una ventaja moderada cuando crecimiento e industria funcionan bien.
- **Decisiones con activos físicos:** vivienda, sanidad, educación, energía, logística e industria crean o amplían instalaciones. Se añaden siete decisiones estructurales.
- **Interfaz revisada:** costes de ampliación visibles, cartera propia en Bolsa, industrias desbloqueadas en cada tecnología, Sala de Guerra ampliada y Eventos limitado a asuntos importantes o accionables.

### Calibración de conflictos

El modelo utiliza una referencia de ocho conflictos entre Estados en 2025 y ponderaciones regionales de UCDP/ACLED y fragilidad territorial del Banco Mundial. No intenta reproducir acontecimientos concretos: usa esas magnitudes para evitar tanto un mundo inmóvil como guerras continuas.

Fuentes de calibración:

- Uppsala Conflict Data Program, recuento 2025: <https://www.uu.se/en/press/press-releases/2026/2026-06-09-ucdp-record-number-of-conflicts-between-states>
- ACLED Conflict Index: <https://acleddata.com/report/conflict-index-results-december-2024>
- Banco Mundial, clasificación de situaciones frágiles y afectadas por conflictos: <https://www.worldbank.org/en/topic/fragilityconflictviolence/brief/classification-of-fragile-and-conflict-affected-situations>

## Sistemas de Alpha v1.6 conservados

### Cronología indefinida

- La campaña sigue avanzando después del 30 de abril de 2029 y no tiene fecha final.
- El motor valida la fecha en cada tick y recupera automáticamente una cronología dañada.
- La velocidad base se mantiene en **1 día cada 10 segundos reales**; continúan disponibles x1, x2, x4 y +1 día.
- El bucle usa temporizadores encadenados para impedir ticks simultáneos y bloqueos acumulativos.

### Sala de guerra y operaciones

- Al declarar una guerra se abre automáticamente una **Sala de Guerra**.
- Cada conflicto muestra fase, intensidad, duración, war score, control territorial, bajas, logística, superioridad aérea, control naval, teatros y operaciones activas.
- Registro de partes de batalla y composición de fuerzas de ambos bandos.
- Las unidades desplegadas pueden:
  - atacar una unidad enemiga compatible;
  - lanzar una ofensiva general contra un país;
  - invadir una región seleccionada;
  - dividirse y abrir frentes desde diferentes regiones.
- Los enfrentamientos directos tienen desplazamiento, contacto, pérdidas, preparación, resolución y efecto en el war score.
- Se mantienen capitulación, paz negociada, anexión regional y anexión total cuando se cumplen las condiciones.

### Gobierno de empresas controladas

Cuando un Estado posee al menos el 51% de una empresa puede decidir qué hacer con el beneficio atribuible:

- reinversión empresarial;
- dividendo al Tesoro;
- I+D soberana;
- empleo y expansión;
- reserva estratégica.

Las decisiones aparecen en el panel **Política**, junto con la participación, el beneficio y el efecto esperado. El reparto se procesa en el cierre mensual.

### Nuevas decisiones nacionales

El panel político incorpora doce decisiones con coste presupuestario, capital político y periodo de enfriamiento:

- Plan Nacional de Vivienda;
- Pacto Industrial 2035;
- Fondo Soberano Nacional;
- Reforma del Mercado Laboral;
- Pacto Sanitario;
- Programa Educativo y Científico;
- Ley de Preparación Nacional;
- Transición Energética Acelerada;
- Pacto Migratorio y Demográfico;
- Pacto de Cohesión Territorial;
- Estado Digital e IA Pública;
- Ley de Seguridad Alimentaria.

### Diplomacia global

- El directorio diplomático muestra los **197 países** de la simulación, sin el límite visual anterior de 36.
- Se mantienen relaciones, tratados, comercio, ayuda, sanciones, guerra y toma de control.

### Presupuesto nacional

- Cada partida presupuestaria dispone de botones **−0,5** y **+0,5** puntos porcentuales.
- También puede ajustarse mediante el deslizador.
- Rango operativo: 0,5%–20% del PIB para sanidad, educación, defensa, infraestructura, I+D y protección social.

## Sistemas conservados

- Mapa mundial Web Mercator con geometrías locales y capa OSM opcional.
- 197 países y regiones estratégicas.
- 17 comunidades autónomas españolas.
- 42 instalaciones industriales, energéticas, logísticas, sanitarias y residenciales.
- 62 tecnologías.
- 176 empresas simuladas en Bolsa.
- Producción y consumo de recursos.
- Comercio marítimo y terrestre animado.
- Producción militar por lotes x1, x10, x100 y x1000.
- Movimiento, despliegue, invasión y anexión territorial.
- Parlamento semicircular, elecciones y coaliciones.
- Guardado local, importación y exportación JSON.

## Estructura

```text
index.html
404.html
.nojekyll
css/
js/
assets/
tests/
README.md
CHANGELOG.md
VALIDATION.md
UPLOAD_TO_GITHUB.md
```

## Uso local

No abras `index.html` directamente mediante `file://`, porque el navegador puede bloquear la carga del mapa. Ejecuta un servidor local desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Después abre `http://localhost:8000`.

## GitHub Pages

1. Descomprime `NEXUS_Global_Alpha_v1.8_GitHub.zip`.
2. Sube **todos los archivos y carpetas interiores** a la raíz del repositorio.
3. Activa `Settings → Pages → Deploy from a branch → main → / (root)`.
4. Espera al despliegue y realiza una recarga forzada.

El ZIP ya tiene `index.html` en la raíz. GitHub no descomprime ZIP automáticamente.

## Guardados

Alpha v1.8 utiliza la clave `nexus_alpha_v1_8_save` y migra guardados v1.7 y anteriores. Para una prueba completamente limpia, usa **Reiniciar campaña** o borra el almacenamiento local del sitio.

## Nota de simulación

Los precios bursátiles, estados financieros, resultados militares y demás variables son datos de juego. No representan información financiera, militar o política en tiempo real.
