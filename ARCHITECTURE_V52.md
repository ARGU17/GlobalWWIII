# Arquitectura de Strategic Command v5.2

## Compatibilidad

v5.2 es una extensión migrable sobre v5.1. `js/v52/bridge.js` captura los métodos anteriores, hidrata los campos nuevos sin borrar datos y mantiene todas las acciones previas. El guardado usa `nexus_strategic_v5_2_0_save` y puede reclamar el guardado v5.1.

## Módulos

- `schema.js`: catálogos exactos, migración y semillas deterministas.
- `systems.js`: ocho sistemas diarios, semanales o mensuales registrados en el pipeline v5.
- `bridge.js`: acciones jugables y adaptadores de creación, carga, tick y anexión.
- `ui.js`: centros de Operaciones, Conocimiento y Análisis.

## Guerra y logística

Cada formación pertenece a uno de once escalones y expone diecisiete propiedades. Su potencia deriva de personal, equipo, preparación, moral, cohesión, entrenamiento, mando, inteligencia y suministro. Cada día consume combustible, munición, alimentos, repuestos, reemplazos y transporte. Un déficit reduce progresivamente movilidad, cadencia, mantenimiento, moral y cohesión.

Los conflictos crean un parte diario con terreno, visibilidad, clima, hora, urbanización, ríos, minas, fortificaciones y apoyos; comparan capacidad terrestre, aérea y naval; actualizan el resultado y conservan un diario operacional.

## Ocupación e inteligencia

La anexión abre un expediente que exige elegir entre once regímenes. Dificultad e insurgencia dependen del tamaño relativo, capacidad estatal, identidad, daño civil, represión, colaboración, reconstrucción y retorno de refugiados.

Los datos extranjeros contienen valor real para el motor y estimación para el jugador. El intervalo, confianza, antigüedad, fuente y riesgo de desinformación evolucionan con nueve redes y once operaciones encubiertas.

## Conocimiento, clima y eventos

Cada tecnología depende de diez capacidades y puede inventarse, patentarse, licenciarse, copiarse, robarse, exportarse, embargarse o difundirse. Veinte ramas amplían el árbol existente. Doce variables climáticas producen impactos sobre agricultura, precios, protesta, migración, logística, déficit y deuda.

Los eventos no se sortean desde una lista: se disparan al superar condiciones causales de energía, desempleo/corrupción/inflación alimentaria, vivienda/tipos/banca o legitimidad/moral militar.

## Análisis y explicabilidad

El motor conserva hasta 730 observaciones por métrica, genera riesgos a 30, 90 y 365 días, informes semanales, mensuales, anuales y de gabinete, y un diario de campaña. La interfaz ofrece comparación con niebla de guerra, Sankey, nueve mapas, alertas configurables, árboles de causas, escenarios antes/después y descomposición de inflación.
