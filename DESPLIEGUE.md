Configuración central en config.cjs. Copiar nombres de .env.example a las variables del hosting; la aplicación lee el entorno del proceso. No carga automáticamente archivos .env.

Railway: crear servicio Node para esta carpeta app, instalar con pnpm (lockfile existente), iniciar con npm start. Conectar DATABASE_URL a PostgreSQL del mismo proyecto mediante variable de referencia. Railway define PORT. PUBLIC_ORIGIN es el dominio HTTPS exacto sin barra final. El proveedor debe admitir conexiones SSE persistentes.

PASSWORD_ENCRYPTION_KEY debe ser la clave existente de LOCALAPPDATA/MacarenaPostgresTest/app-data/password-key convertida a base64 y transferida directamente como secreto. No publicarla ni generar otra: se perdería acceso a las claves cifradas. En local continúa el archivo existente. Sesiones, logo, firmas y configuración se guardan en PostgreSQL; el modo producción no depende de archivos persistentes para credenciales.

DB_SSL_MODE=disable únicamente para red privada según la configuración del proveedor; verify-full para TLS con certificado verificado. DB_SSL_CA admite el certificado CA del proveedor. No se desactiva la validación de certificados.

Usar un solo proceso y una sola réplica: la aplicación conserva estado en memoria y protege la instancia mediante advisory lock. Los despliegues con solapamiento deben detener la instancia antigua antes de iniciar la nueva; no se promete despliegue sin interrupción. /health verifica acceso PostgreSQL, sin publicar datos privados. No crear esquema ni importar datos en cada arranque.

Para traslado inicial: respaldo pg_dump de macarena, restauración en base vacía y concesión de permisos al rol de la app. Preparar y verificar esto antes de iniciar el servicio. Pruebas en otra base/servicio, sin usar DATABASE_URL de la versión principal.

Otro hosting: mismas variables, Node>=24, PostgreSQL compatible, comando npm start, HTTPS y proxy que mantenga SSE y no almacene /api. Los scripts PowerShell de inicio/respaldo son exclusivos del equipo local.

No se ha publicado ni contratado ningún servicio. La carpeta contiene configuración de despliegue; todavía requiere seleccionar hosting/dominio, trasladar la base y configurar respaldos del proveedor.
