# Subir NEXUS Global Alpha v1.8 a GitHub Pages

1. Descarga y descomprime `NEXUS_Global_Alpha_v1.8_GitHub.zip`.
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
tests/
README.md
```

6. En GitHub abre `Settings → Pages`.
7. Selecciona `Deploy from a branch → main → / (root)`.
8. Espera a que termine el despliegue.
9. Realiza una recarga forzada para descartar la caché anterior.

Los recursos se solicitan con `?v=1.7`. No subas únicamente el ZIP: GitHub Pages no lo descomprime.
