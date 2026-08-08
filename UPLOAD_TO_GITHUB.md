# Publicar Strategic Command v6.0.0 en GitHub Pages

Repositorio previsto: `ARGU17/GlobalWWIII`

Rama de publicación: `main`

Carpeta de Pages: `/ (root)`

URL esperada: <https://argu17.github.io/GlobalWWIII/>

## Contenido que debe publicarse

La raíz de `main` debe contener directamente:

```text
index.html
404.html
.nojekyll
css/
js/
assets/
data/
core/
simulation/
world/
ai/
ui/
workers/
compat/
tests/
README.md
CHANGELOG.md
VALIDATION.md
THIRD_PARTY_NOTICES.md
ARCHITECTURE_V60.md
MAP_DATA_SOURCES.md
LICENSES_MAP_V6.md
```

No debe existir una carpeta envolvente `GlobalWWIII-v6.0.0/` por encima de `index.html`. No omitas los módulos `.mjs`, `compat/legacy-v52.bundle.js`, `assets/vendor/`, `assets/maps/v6/`, `assets/models/`, `data/map-v1/` ni `data/v60/`.

## Validación previa

Usa Node.js 20 o posterior y ejecuta desde la raíz del repositorio:

```bash
node tools/build-map-assets.mjs --verify-only
node tests/v6-assets-validation.mjs
node tests/v6-map-ui-contract-validation.mjs
node tests/v6-save-migration-validation.mjs
node tests/v6-map-data-adapter-validation.mjs
node tests/v6-static-map-contract-validation.mjs
node tools/build-v6-release.mjs
node tests/v6-release-validation.mjs
git diff --check
```

El constructor genera:

```text
dist/GlobalWWIII-v6.0.0.zip
dist/GlobalWWIII-v6.0.0.zip.sha256
```

La prueba de release exige raíz directa, rutas seguras, ausencia de `.git/` y `dist/`, contenido completo, `unzip -t` satisfactorio y SHA-256 coincidente.

Las pruebas de Node no sustituyen la prueba real de navegador descrita en `VALIDATION.md`. No publiques como validado si quedan errores críticos de consola, selección, cámara o fallback.

## Publicación mediante Git

Revisa antes qué se va a subir:

```bash
git status --short
git diff --stat
git diff --check
```

Sincroniza la referencia remota antes de publicar. No uses `--force` sobre `main`:

```bash
git fetch origin main
git rebase origin/main
```

Si el rebase detecta cambios locales sin confirmar, confírmalos primero en una rama de trabajo o guarda una copia segura. No borres ni sobrescribas cambios ajenos para resolverlo.

Después de validar:

```bash
git add -A
git commit -m "feat: release Strategic Command v6.0.0 map engine"
git push origin main
```

Si el flujo del repositorio usa pull requests, publica una rama y abre la revisión antes de integrar:

```bash
git push -u origin agent/map-engine-v6
gh pr create --base main --head agent/map-engine-v6 --title "Strategic Command v6.0.0" --body-file PR_BODY.md
```

El archivo `PR_BODY.md` es solo un ejemplo de nombre; no forma parte obligatoria del release. La integración en `main` debe respetar las protecciones y comprobaciones configuradas en GitHub.

## Activar GitHub Pages

En <https://github.com/ARGU17/GlobalWWIII/settings/pages>:

1. Abre **Build and deployment**.
2. En **Source**, elige **Deploy from a branch**.
3. Selecciona **main**.
4. Selecciona **/ (root)**.
5. Guarda la configuración.

GitHub Pages publicará la raíz de `main`; no hace falta compilar en el servidor. `.nojekyll` evita que Jekyll descarte recursos con nombres especiales.

## Seguir el despliegue

Acciones del repositorio: <https://github.com/ARGU17/GlobalWWIII/actions>

Historial de Pages: <https://github.com/ARGU17/GlobalWWIII/actions/workflows/pages/pages-build-deployment>

Sitio: <https://argu17.github.io/GlobalWWIII/>

Espera a que la ejecución `pages build and deployment` termine en verde. Después abre el sitio con recarga forzada para evitar que `index.html` antiguo conserve scripts cacheados.

## Verificación posterior al despliegue

Comprueba en la URL pública:

1. La cabecera muestra `v6.0.0`.
2. No hay errores críticos en consola ni recursos 404.
3. Político, Híbrido y Terreno 3D conservan la misma cámara y selección.
4. España muestra sus comunidades y permite seleccionar región.
5. Rusia, Canadá, Alaska y archipiélagos no se deforman al cruzar el antimeridiano.
6. Industrias, unidades, rutas, convoyes, frentes y ocupaciones aparecen en su capa.
7. El avance temporal no devuelve la selección al territorio inicial.
8. El perfil Bajo sigue siendo utilizable y el aviso de fallback no bloquea la partida.
9. Guardar, recargar, exportar e importar funcionan por cuenta.
10. Un guardado anterior se migra al esquema 60 y un guardado futuro se rechaza sin sobrescribirse.
11. Escritorio, tableta y móvil mantienen controles accesibles.
12. La atribución cartográfica permanece visible y los avisos de licencia están publicados.

Registra URL, commit, navegador, viewport, resultado y cualquier limitación en `VALIDATION.md`.

## Instalación mediante ZIP

El ZIP es una entrega portátil, no un archivo que GitHub descomprima automáticamente:

1. Verifica su SHA-256 con el fichero `.sha256`.
2. Descomprime `GlobalWWIII-v6.0.0.zip` localmente.
3. Sube todos los elementos interiores a la raíz del repositorio.
4. Confirma que `index.html` está en la raíz.
5. Activa Pages con `main` y `/ (root)`.

## Alcance del alojamiento

GitHub Pages es estático. No proporciona backend de autenticación ni sincronización de campañas. Las cuentas, sesiones y partidas se almacenan en el navegador por usuario mediante IndexedDB y copia de recuperación local. Exportar JSON es la copia portátil recomendada antes de borrar datos del sitio o cambiar de dispositivo.

## Estado de esta entrega

Este documento describe el procedimiento. La publicación real, el estado de Actions y la comprobación de la URL pública deben completarse y fecharse en `VALIDATION.md`; la existencia de estas instrucciones no se considera prueba de despliegue.
