# Subir NEXUS Global Strategic Command v5.4.1 a GitHub Pages

1. Abre la carpeta de Strategic Command v5.4.1.
2. Abre la carpeta descomprimida.
3. Selecciona **todos los archivos y carpetas interiores**.
4. Súbelos a la raíz del repositorio.
5. Comprueba esta estructura:

```text
index.html
404.html
.nojekyll
css/
js/
assets/
ai/
compat/
core/
data/
headless/
simulation/
ui/
workers/
world/
tests/
README.md
```

6. En GitHub abre `Settings → Pages`.
7. Selecciona `Deploy from a branch → main → / (root)`.
8. Espera a que termine el despliegue.
9. Realiza una recarga forzada para descartar la caché anterior.

Los recursos de arranque se solicitan con `?v=5.4.1-r1`. No omitas `compat/legacy-v52.bundle.js`, `data/v54/market-resources.json` ni los módulos `.mjs`. Las cuentas son locales al navegador porque GitHub Pages no ejecuta un servidor de autenticación.
