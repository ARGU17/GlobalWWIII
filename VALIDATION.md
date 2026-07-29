# Validación técnica — Strategic Command v5.1.0

## Validación v5.1

Ejecutar `node tests/v51-validation.js`. La prueba comprueba el catálogo exacto de 21 mercados y todos sus saldos; cuentas nacionales; inflación y ciclo; moneda, banca y mercados; empresas y plantas; logística y 12 puntos estratégicos; 15 tecnologías energéticas; demografía, migración, empleo y educación; ciudades; instituciones, partidos, Gobierno, opinión, medios y crimen; diplomacia, 16 tratados, 15 organizaciones y 11 canales de influencia. También ejecuta las decisiones del jugador, renderiza ambos paneles, simula 92 días, descarta valores no finitos, compara dos partidas deterministas y migra una partida v5.0.

## Validación v5.0 ejecutada

- Sintaxis validada para todos los módulos `js/v5/*.js`, `ui.js` y `app.js`.
- Batería histórica completa ejecutada sin regresiones.
- Prueba `tests/v50-validation.js`: 23 sistemas, 197 países, 95 días, migración y determinismo validados.
- Mercados de nueve productos, empresas agentes, cohortes, instituciones, redes energéticas y logística militar presentes desde el estado inicial.
- Anexión verificada con transferencia de población, PIB, empresas, productos, cohortes y soberanía; ocupación y decisión política generadas.
- Dos campañas con la misma semilla producen la misma firma de PIB, inflación, productos, índices mundiales y sistemas ejecutados.
- Todos los valores numéricos permanecen finitos y los balances físicos no se vuelven negativos.
- Interfaz local: arranque sin panel de error, mapa disponible y panel **Sistemas** renderizado con productos, empresas, causalidad y riesgos.
- Fluidez de navegador: 13 días a x32 en 4,3 segundos, con pausa inmediata e interfaz sensible.
- El país y la región seleccionados permanecieron estables durante 95 días de avance.

## Validaciones ejecutadas

- Sintaxis de todos los archivos JavaScript mediante `node --check`.
- Verificación de referencias CSS, JavaScript e imágenes locales desde `index.html`.
- Validación JSON de los archivos cartográficos.
- Integridad del ZIP mediante lectura completa de sus entradas.
- Prueba del modelo y prueba DOM aislada de los paneles.

## Resultado del modelo

- Versión: `2.0.0-alpha`.
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
- Trece campañas multidominio verificadas: superioridad aérea, ataque de precisión, bloqueo naval, asalto anfibio, invasión terrestre, ofensiva cibernética, guerra total, ISR, SEAD, guerra antisubmarina, ataque naval, asalto aerotransportado e incursiones especiales.
- Cuatro doctrinas operativas, movilización de reservas, requisitos de fuerza, costes y efectos territoriales verificados.
- Selección libre del partido apoyado, tres intensidades de campaña electoral y previsión dinámica de votos/escaños verificadas.
- Catorce fotografías militares locales, diecisiete familias de unidad y nombres de plataformas reales verificados.
- Contratos militares con modelo, fabricante, generación y función conservados al terminar la producción.
- Plan operacional con tempo, reglas de enfrentamiento, prioridad, apoyo y prerrequisitos verificado.
- Postura conjunta y Sala de Situación Global verificadas con valores finitos y focos de riesgo.
- Rendimiento del motor sobre 197 Estados: entre 16 y 27 ms por día simulado en la medición local, frente a aproximadamente 1,1 s antes de eliminar la normalización cuadrática.

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

- Registro e inicio de sesión por usuario o correo.
- Derivación PBKDF2-SHA-256 con sal aleatoria y ausencia de contraseña en texto plano.
- Sesión persistente o temporal, modo invitado y guardados separados por cuenta.
- Perfil, cambio de contraseña y cierre de sesión.

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
- Tablero mundial fijo ampliado, geometría cartográfica cacheada, rejilla estratégica y campañas militares animadas.
- Sala de Guerra multidominio con selector de región objetivo, doctrina, reservas y cronología de campañas.
- Estrategia electoral con partido elegible, impulso, proyección y acciones de campaña.

## Prueba funcional en navegador

Se sirvió el proyecto mediante HTTP local y se verificó en el navegador integrado:

- Arranque completo de Strategic Command v2.0.0 sin errores de consola.
- Cambio de mapa desde España a Estados Unidos verificado: país, cámara y panel de inspección se actualizaron conjuntamente.
- Botón `MUNDO` verificado: mapa global completo y panel territorial oculto.
- Inicio, pausa y avance manual operativos tras comenzar la campaña.
- Cambios x1, x2, x4, x16 y x32 aplicados durante la simulación.
- Conservación del progreso parcial del día al cambiar de velocidad.
- Capa Industria con título y estado activo correctos.
- Capa Militar con título y estado activo correctos.
- Economía con I+D prevista y Gestión de deuda.
- Tecnología con generación prevista y desbloqueos industriales.
- Bolsa con Mis participaciones.
- Persistencia de la región seleccionada: Asturias siguió activa al avanzar del 1 al 2 de enero de 2028.
- Prueba sostenida a x32: seis días simulados en 2,7 segundos incluyendo la interacción de pausa, con interfaz sensible y pausa inmediata.
- Mapa vectorial visible a `736 × 600 px` en la ventana de prueba adaptativa y zoom mundial funcional.
- Capa Militar con miniaturas separadas por rejilla, sin superposición de países vecinos al acercarse.
- Cuarenta y siete usos fotográficos renderizados, catorce archivos únicos cargados, cero imágenes rotas y cero errores de consola.
- Inventario visible con Leopard 2E, Eurofighter Typhoon Tranche 4 y S-80 Plus clase Isaac Peral.

## Comandos ejecutados

```bash
node --check js/alpha-v20.js
node --check js/alpha-v19.js
node --check js/auth.js
node --check js/ui.js
node --check js/map.js
node --check js/app.js
node tests/v18-validation.js
node tests/v181-time-validation.js
node tests/v182-auth-validation.js
node tests/v19-validation.js
node tests/v20-validation.js
node tests/ui-render-validation.js
node tests/model-validation.js
git diff --check
```
