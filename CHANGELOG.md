# Changelog

## Strategic Command v5.4.0

- Eliminada la carga encadenada de ocho capas `alpha-vXX.js`; 29 fuentes v5.2 quedan congeladas en un bundle de compatibilidad reproducible.
- Añadidos módulos independientes para núcleo, simulación, mundo, IA, interfaz y Workers.
- Añadido store central con propiedad exclusiva por ruta y registro de auditoría.
- Añadidos eventos tipados, validación de esquema y manifiestos externos JSON.
- Separada la ejecución diaria, semanal, mensual, trimestral y anual en 13 sistemas.
- Añadidos RNG reproducible, guardados con checksum y migraciones explícitas 52 → 53 → 54.
- Añadidos Worker de cálculo, fallback determinista y runner headless sin interfaz.
- Añadido panel visual de Arquitectura con sistemas, frecuencias, propietarios, eventos y auditoría.
- Conservadas las funcionalidades y datos de Strategic Command v5.2.

## Strategic Command v5.2.0

- Guerra basada en capacidad con 11 escalones, 17 propiedades de unidad y resolución terrestre, aérea y naval.
- Logística militar diaria para combustible, munición, alimentos, repuestos, reemplazos y transporte, con degradación gradual.
- Once modelos de posguerra, ocupación costosa, resistencia, reconstrucción e integración condicionada por el tamaño del país.
- Niebla de guerra por dato con estimación, intervalo, confianza, antigüedad, fuente y desinformación; nueve fuentes y once operaciones.
- Tecnología convertida en conocimiento dependiente de diez capacidades, ocho vías de difusión y veinte ramas nuevas.
- Doce variables climáticas conectadas a producción, inflación, protesta, migración, logística, déficit y deuda.
- Eventos emergentes explicados por sus condiciones, con respuestas jugables.
- Tres centros visuales nuevos: Operaciones, Conocimiento y Análisis.
- Histórico de métricas, comparador, Sankey, nueve mapas sistémicos, alertas, riesgos 30/90/365, simulador antes/después, informes y diario.
- Migración automática desde v5.1 y conservación de todos los módulos previos.

## Strategic Command v5.1.0

- Añadidos 21 mercados físicos diferenciados y contabilidad nacional completa.
- Añadidos inflación emergente, expectativas y nueve fases de ciclo/crisis.
- Añadidos moneda, banco central, curva de tipos, bancos, bonos y mercados financieros ampliados.
- Empresas convertidas en agentes con plantas, cadenas de suministro, multinacionales y decisiones corporativas.
- Red logística mundial física con doce puntos estratégicos y recálculo de rutas.
- Red energética física con quince tecnologías y mercado eléctrico.
- Demografía por cohortes y dimensiones, migración, profesiones y educación con plazos.
- Ciudades reales, vivienda, suelo, urbanismo e intervención municipal.
- Instituciones, partidos multidimensionales, Gobierno, opinión segmentada, medios y narrativa.
- Corrupción, crimen, economía sumergida y costes de represión.
- Diplomacia multidimensional, dieciséis tratados, quince organizaciones y once canales de influencia.
- Dos paneles nuevos, acciones jugables y migración compatible desde v5.0.

## Strategic Command v5.0.0

- Sustituida la extensión encadenada por un registro v5 determinista con 23 sistemas, frecuencias explícitas y auditoría de cada tick.
- Añadido esquema de estado 5 con cinco migraciones secuenciales y conservación de guardados v2 y anteriores.
- Añadidos contabilidad nacional, ciclo económico, productividad, nueve mercados de productos, inventarios, escasez y formación endógena de precios.
- Añadidos moneda, reservas, banco central, regla de tipos, banca, crédito, mora, capital, bonos, bolsa y vivienda.
- Convertidas las empresas en agentes con caja, deuda, empleo, inversión, capacidad, exportación, rentabilidad y salud financiera.
- Añadidas redes de energía y carga con capacidad, fiabilidad, reserva, apagones, utilización y cuellos de botella.
- Añadidos cohortes demográficas, migración, mercado laboral, capacidades, educación, ciudades, vivienda, sanidad, epidemias, alimentación, agua y clima.
- Añadidos instituciones, burocracia, justicia, medios, opinión pública, narrativas, corrupción, crimen, economía informal, líderes y sucesión.
- Añadidas relaciones diplomáticas multidimensionales, objetivos, líneas rojas, influencia, poder blando, inteligencia, confianza y niebla de guerra.
- Añadidos difusión tecnológica, dominios de conocimiento, patentes y dependencias.
- Añadida IA estratégica con prioridades nacionales y frecuencia global moderada de conflicto.
- Añadidas logística militar diaria, fases operativas, suministro, moral, bajas, riesgo civil, ocupación, resistencia y alternativas posbélicas.
- Reforzada la anexión para integrar población, PIB, empresas, productos, cohortes y territorios, seguida de una decisión sobre el modelo político.
- Añadido panel visual **Sistemas** con causalidad, agentes, mercados, sociedad, instituciones, riesgos y decisiones.
- Nueva clave de guardado `nexus_strategic_v5_0_0_save` y exportación `nexus-v5.0.0-fecha.json`.

## Strategic Command v2.0.0

- Corregido el fallo que dejaba la cámara en España al seleccionar otro país.
- Añadido botón `MUNDO`, zoom adaptativo y repetición de geometría suficiente para monitores ultrapanorámicos.
- Ocultado el listado territorial español en la vista mundial.
- Rediseñada la interfaz completa con un sistema visual profesional grafito y un mapa mayor.
- Integradas catorce fotografías militares locales con atribución documentada.
- Sustituidos los marcadores militares por miniaturas fotográficas con cantidad y ficha contextual.
- Añadidos catálogos nacionales de plataformas reales para España, Estados Unidos, Francia, Reino Unido, Alemania, China, Rusia, India, Japón e Israel.
- Los contratos y unidades conservan modelo, fabricante, generación, función, fotografía y formación al completar la producción.
- Ampliado el sistema a trece campañas multidominio con ISR, SEAD, guerra antisubmarina, ataque naval, asalto aerotransportado e incursiones especiales.
- Añadidos prerrequisitos operacionales de aire, mar, suministro, inteligencia y movilización.
- Añadidos tempo, reglas de enfrentamiento, prioridad de objetivos y apoyo asignado.
- Añadidos tablero de postura conjunta y Sala de Situación Global.
- Nueva clave de guardado con migración automática desde Alpha v1.9.0 y anteriores.

## Alpha v1.9.0

- Eliminado el redibujado completo del mapa a 60 FPS: caché de geometrías, índice de países y límite visual de 12 FPS.
- Desacoplado el tick diario de la reconstrucción DOM, con actualización agrupada en x4, x16 y x32.
- Mapa vectorial local predeterminado, tablero ampliado y nueva cuadrícula estratégica.
- Añadidas siete campañas militares multidominio con objetivos regionales, costes, reservas, duración, progreso e impacto.
- Añadidas cuatro doctrinas de campaña y movilización de reservas desde la Sala de Guerra.
- Visualización cartográfica de campañas aéreas, navales, terrestres, cibernéticas y de guerra total.
- Añadida selección libre del partido a apoyar, campañas electorales y previsión dinámica de voto y escaños.
- Reparada la sobrescritura de rutas SVG militares; los glifos de mapa usan ahora un campo independiente.
- Añadidas denominaciones reconocibles de formaciones y sistemas militares para España, Estados Unidos, Francia, Alemania, Reino Unido, China, Rusia e India, con nomenclatura genérica coherente para el resto.
- Nueva clave de guardado con migración automática desde Alpha v1.8.2 y versiones anteriores.

## Alpha v1.8.2

- Añadidos registro, inicio de sesión por usuario o correo y sesión persistente opcional.
- Contraseñas derivadas localmente mediante PBKDF2-SHA-256, 150.000 iteraciones y sal aleatoria individual.
- Guardados independientes por cuenta, con migración de campañas anteriores.
- Añadidos perfil de comandante, cambio de contraseña y cierre de sesión.
- Añadido acceso como invitado con espacio de guardado separado.
- Interfaz de acceso adaptable y aviso explícito sobre el alcance local de las cuentas en GitHub Pages.

## Alpha v1.8.1

- Corregidos los controles de iniciar, pausar, velocidad y avance manual después de comenzar o cargar una campaña.
- Delegación estable de los botones temporales para que sigan operativos aunque la interfaz se vuelva a enlazar.
- Conservación de la fracción del día al cambiar de velocidad.
- Reprogramación del temporizador usando el tiempo real restante del día simulado.
- Añadidas velocidades x16 y x32.
- Nueva clave de guardado con migración automática desde v1.8 y anteriores.

## Alpha v1.8

- I+D mensual proporcional al presupuesto, educación, tecnología, universidades e instalaciones científicas.
- Bonificación científica por población y capacidad absorbida tras anexiones.
- Países anexionados consolidados bajo el vencedor y eliminados del directorio soberano.
- Mercado interior automático al 100% para antiguos territorios conquistados.
- Nombres administrativos reales para regiones estratégicas prioritarias.
- Daños y reconstrucción regional integral, industrial, energética o de infraestructura.
- Economía territorial dinámica al crear o ampliar empleo industrial.
- Efectos mensuales reales de las asignaciones del presupuesto nacional.
- Costes de mejora industrial visibles antes de confirmar.
- Cartera de participaciones propias en Bolsa.
- Amortización voluntaria de deuda y ahorro futuro de intereses.
- IA de conflictos ponderada por riesgo, proximidad y relaciones con un límite realista de guerras.
- Movimiento y tiempo de llegada visibles en ataques.
- Capa Militar exclusiva y nueva capa Industria.
- Rutas españolas repartidas por fachadas marítimas y transporte terrestre animado con camiones.
- Tecnologías con industrias desbloqueadas o potenciadas.
- Más decisiones nacionales con creación automática de activos.
- Bonificación de capital político por resultados electorales y ajuste moderado de partidos de derechas.
- Limpieza automática de tratados resueltos.
- Sala de Guerra ampliada con sostenimiento, reservas, objetivos, daño y tiempos de marcha.
- Eventos comerciales rutinarios ocultos; permanecen acontecimientos importantes y decisiones.

## Alpha v1.7

- La anexión total absorbe de verdad todo el Estado derrotado y habilita la gestión de sus territorios.
- Las elecciones responden al rendimiento del gobierno y conservan el nuevo reparto parlamentario.
- Los acuerdos comerciales producen ingresos y cubren déficits de recursos con importaciones positivas.
- La IA ejecuta comercio, sanciones y conflictos autónomos.
- Resumen incorpora un centro de decisiones con varias respuestas.

## Alpha v1.6

- Eliminado cualquier límite temporal de campaña.
- Añadida recuperación automática de fechas inválidas o ticks bloqueados.
- Sustituido el intervalo fijo por temporizadores encadenados para evitar solapamientos.
- Añadida Sala de Guerra automática al declarar una guerra o iniciar una ofensiva.
- Añadidos teatros, fase, intensidad, logística, superioridad aérea, control naval y operaciones.
- Añadidos ataques directos entre unidades desplegadas.
- Añadidas ofensivas generales contra países desde unidades seleccionadas.
- Añadido gobierno corporativo para empresas controladas al 51% o más.
- Añadidas cinco políticas de reparto de beneficios empresariales.
- Añadidas doce decisiones nacionales en el panel político.
- Eliminado el límite de 36 países en el directorio diplomático.
- Añadidos controles −0,5/+0,5 a las partidas del presupuesto nacional.
- Elevado el rango presupuestario operativo hasta el 20% del PIB.
- Guardado actualizado a v1.6 con migración desde versiones anteriores.
- Recursos versionados con `?v=1.6` para evitar caché obsoleta en GitHub Pages.

## Alpha v1.5

- Corregida la eliminación de colas `facilityV3` y `unitV2` durante el cierre económico mensual.
- El procesador mensual solo actúa sobre proyectos heredados basados en meses.
- Añadido libro de integridad de construcción para detectar y recuperar proyectos huérfanos.
- Añadidas pruebas específicas de construcción y producción militar cruzando el cambio de mes.
- Corregido el incremento de cantidades militares al completar una orden.
- Añadido inventario militar agregado por sistema, grupos, regiones y movimiento.
- Añadida división de unidades en destacamentos para operar desde varios flancos.
- Mejorada la selección de la región de destino de la producción militar.
- Corregidos los marcadores de batallas regionales del mapa.
- Añadido centro de tratados, capitulación, anexión parcial y anexión total.
- Añadidos balances de guerra, historial de conflictos y decisiones de posguerra.
- Las regiones anexionadas cambian de propietario y controlador.
- Añadida Mesa de Coalición con 350 escaños, socios potenciales y mayoría de 176.
- Reforzado el gráfico semicircular de poder político y sus controles de negociación.
- Guardado actualizado a v1.5 con migración desde v1.4 y anteriores.
- Añadido versionado de caché `?v=1.5` en CSS y JavaScript.

## Alpha v1.4

- Catálogo ampliado a 42 instalaciones y 62 tecnologías.
- Bolsa ampliada a 176 empresas.
- Regiones estratégicas para 197 países.
- Movimiento, combate y conquista regional.
- Coaliciones multipartidistas y gráfico parlamentario.
- Corrección del antimeridiano para Rusia y otros países extensos.

## Alpha v1.3

- Bolsa global, recursos superiores, reloj horario y comercio marítimo visual.
- Comunidades autónomas españolas y evolución de empleo, población y modelo productivo.

## Alpha v1.2

- Simulación diaria, mapa Web Mercator, 197 países, guerra diaria y producción militar por lotes.

## Alpha v1.1

- Arquitectura modular inicial y gestión regional de España.
