# Día del Programador 2026 — Frontend

Aplicación React para el evento de INACAP Sede Arica.

## Desarrollo

Requiere Node.js 18 o superior.

```bash
npm install
cp .env.example .env
npm run dev
```

Configura `VITE_API_URL` con la URL del backend, sin una barra final. Para producción debe ser una URL HTTPS.

## Build

```bash
npm run build
npm run preview
```

## Despliegue en Netlify

Conecta el repositorio, usa `npm run build` como comando y `dist` como directorio de publicación. Agrega `VITE_API_URL` en las variables del sitio. `public/_redirects` permite que las rutas de React Router funcionen al recargar.

## Cámara y QR

Los navegadores solo permiten acceder a la cámara en un contexto seguro: usa HTTPS en producción. Durante el desarrollo, `localhost` se considera un contexto seguro. La cámara se solicita únicamente al pulsar **Activar cámara**; si el permiso se bloquea, puede habilitarse desde la configuración del sitio del navegador o usarse el ingreso manual.
