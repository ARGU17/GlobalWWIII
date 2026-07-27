# Validación técnica — Alpha v1.7

## Validaciones ejecutadas

- Sintaxis de todos los archivos JavaScript mediante `node --check`.
- Verificación de referencias CSS, JavaScript e imágenes locales desde `index.html`.
- Validación JSON de los archivos cartográficos.
- Integridad del ZIP mediante lectura completa de sus entradas.
- Prueba del modelo y prueba DOM aislada de los paneles.

## Resultado del modelo

- Versión: `1.7-alpha`.
- 197 países.
- 176 empresas.
- 42 instalaciones.
- 62 tecnologías.
- 17 comunidades autónomas españolas.
- Construcción industrial y producción militar conservadas al cruzar un cierre mensual.
- Movimiento regional, conquista, ocupación y anexión verificados.
- Cronología probada desde `2029-04-30` hasta `2029-05-03` sin límite final.
- Incrementos presupuestarios de 0,5 puntos verificados.
- Política de beneficios de empresa controlada verificada.
- Decisión nacional verificada.
- Declaración de guerra con identificador de Sala de Guerra verificada.
- Ataque directo entre unidades y registro de operaciones verificados.
- Anexión integral de regiones, población, PIB, Tesoro, ejército, empresas, instalaciones y colas verificada.
- Construcción y ampliación en territorio anexionado verificadas.
- Elecciones con variación de escaños y suma exacta de 350 verificadas.
- Comercio con saldo económico e importaciones de recursos positivos verificado.
- Conflicto iniciado por IA y decisión de respuesta en Resumen verificados.

## Resultado de interfaz DOM

Se renderizaron correctamente los 13 paneles:

- Resumen.
- Economía.
- Regiones.
- Industria.
- Bolsa.
- Política.
- Tecnología.
- Militar.
- Diplomacia.
- Inteligencia.
- Objetivos.
- Eventos.
- Configuración.

También se verificó:

- Sala de Guerra con teatros y operaciones.
- Parlamento semicircular y Mesa de Coalición.
- Directorio diplomático con países desde Afganistán hasta Zimbabue.
- Bolsa con 176 compañías.
- Centro de decisiones accionables en Resumen.

## Prueba visual automatizada

El entorno de empaquetado bloqueó el acceso de Chromium automatizado al servidor local (`ERR_BLOCKED_BY_ADMINISTRATOR`). Por ello no se afirma una captura visual automatizada. La validación sí cubre sintaxis, datos, lógica de simulación, renderizado DOM, rutas e integridad del paquete.
