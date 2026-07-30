# Arquitectura técnica — Strategic Command v5.4.0

## Resultado

La aplicación deja de cargar en cascada `alpha-vXX.js`. Las 29 fuentes que forman la versión 5.2 quedan congeladas en `compat/legacy-v52.bundle.js`; no son el lugar de desarrollo. El arranque carga ese contrato de compatibilidad, crea el núcleo v5.4 y, por último, conecta la interfaz mediante un adaptador.

```text
index.html
  ├─ compat/legacy-v52.bundle.js
  └─ core/entry.mjs
       ├─ core/          reloj, bus, store, RNG, guardados, schema y Worker
       ├─ simulation/    11 dominios + informes trimestrales y anuales
       ├─ world/         repositorios de países, regiones, ciudades, infraestructura y recursos
       ├─ ai/            planificador y propuestas diplomáticas, económicas y militares
       └─ ui/            registros de paneles, mapas, gráficos y notificaciones
```

## Contratos

- `data/v54/ownership.json` asigna cada ruta nueva a un solo propietario. `StateStore.transact` impide escrituras declaradas desde otro sistema y conserva su resultado en la auditoría.
- `data/v54/event-types.json` declara los payloads aceptados. Un evento ausente o con tipos incorrectos se rechaza antes de llegar a suscriptores.
- `data/v54/systems.json` es el manifiesto externo de los 13 sistemas. El scheduler separa ejecución diaria, semanal, mensual, trimestral y anual.
- `data/v54/state.schema.json` valida el estado al cargarlo y después de cada transacción.
- `RngService` deriva secuencias por semilla, día, país y sistema, por lo que dos campañas equivalentes producen la misma salida.
- `SaveManager` envuelve el estado con versión, schema y checksum. Las migraciones `52 → 53 → 54` son explícitas y se registran en el propio guardado.
- `workers/simulation-worker.mjs` ejecuta agregaciones pesadas fuera del hilo principal. El modo headless usa el mismo algoritmo como fallback determinista.

## Frecuencias

| Fase | Sistemas |
|---|---|
| Diaria | economía, finanzas, energía, logística y militar |
| Semanal | política, diplomacia e inteligencia |
| Mensual | población, empresas y clima |
| Trimestral | informe trimestral |
| Anual | informe anual |

Los módulos declaran `reads`, `writes`, `owner`, `frequency` y `order`. El scheduler es el único que decide cuándo se ejecutan.

## Simulación sin interfaz

Desde un runtime compatible con Node:

```bash
node headless/runner.mjs 365
```

El comando carga exactamente el mismo mundo y motor, avanza los días indicados y devuelve un resumen JSON sin crear `NEXUS_UI` ni acceder al DOM.

## Compilación de compatibilidad

Si se corrige una regresión en una fuente heredada, reconstruir el bundle con:

```bash
node tools/build-v54-compat.mjs
```

Las funciones nuevas deben implementarse en la arquitectura modular, nunca creando otra capa `alpha-vXX.js`.

## Validación

```bash
node tests/v54-architecture-validation.mjs
```

La prueba comprueba arranque consolidado, 197 países, 13 sistemas, propietarios, eventos tipados, las cinco fases temporales, migración, checksum, Worker/fallback, modo headless, selección estable y determinismo.
