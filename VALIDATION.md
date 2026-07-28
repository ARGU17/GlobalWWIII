# Validación técnica — Alpha v1.8.1

## Validaciones ejecutadas

- Sintaxis de todos los archivos JavaScript mediante `node --check`.
- Verificación de referencias CSS, JavaScript e imágenes locales desde `index.html`.
- Validación JSON de los archivos cartográficos.
- Integridad del ZIP mediante lectura completa de sus entradas.
- Prueba del modelo y prueba DOM aislada de los paneles.

## Resultado del modelo

- Versión: `1.8.1-alpha`.
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
- Generación de I+D proporcional a la inversión: 11,6 puntos/mes de base y 18,9 tras aumentar cinco puntos el presupuesto.
- Bonificación científica de territorios absorbidos verificada.
- Nombres reales Texas · Austin, Louisiana · Baton Rouge, Antioquia · Medellín y Tánger-Tetuán-Alhucemas verificados.
- Efectos del presupuesto sobre tecnología, capacidad militar y energía verificados al cierre mensual.
- Amortización de deuda, reducción de ratio, intereses y ahorro futuro verificados.
- Mercado interior automático y eliminación soberana del país anexionado verificados.
- Daño territorial, cola de reconstrucción y recuperación de instalaciones verificados.
- Costes de ampliación industrial expuestos por el motor y por la interfaz.
- Limpieza de tratados tras anexión verificada.

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
- Ventana **Mis participaciones** en Bolsa.
- Impacto presupuestario y gestión de deuda en Economía.
- Industrias desbloqueadas o potenciadas en Tecnología.
- Sala de Guerra con sostenimiento, reservas, marchas, objetivos y daño reconstruible.
- Diplomacia sin Estados anexionados.
- Centro de decisiones accionables en Resumen.

## Prueba funcional en navegador

Se sirvió el proyecto mediante HTTP local y se verificó en el navegador integrado:

- Arranque completo de Alpha v1.8.1 sin errores de consola.
- Inicio, pausa y avance manual operativos tras comenzar la campaña.
- Cambios x1, x2, x4, x16 y x32 aplicados durante la simulación.
- Conservación del progreso parcial del día al cambiar de velocidad.
- Capa Industria con título y estado activo correctos.
- Capa Militar con título y estado activo correctos.
- Economía con I+D prevista y Gestión de deuda.
- Tecnología con generación prevista y desbloqueos industriales.
- Bolsa con Mis participaciones.
- Persistencia de la región seleccionada: Asturias siguió activa al avanzar del 1 al 2 de enero de 2028.

## Comandos ejecutados

```bash
node --check js/alpha-v18.js
node --check js/ui.js
node --check js/map.js
node --check js/app.js
node tests/v18-validation.js
node tests/v181-time-validation.js
node tests/ui-render-validation.js
node tests/model-validation.js
git diff --check
```
