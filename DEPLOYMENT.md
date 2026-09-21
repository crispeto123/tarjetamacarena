# Uso móvil y servidor público

El despliegue está pendiente por decisión del usuario. Se utilizará su propio servidor con IP pública.

## Requisitos del despliegue

- Node.js 24 o contenedor del Dockerfile.
- Un único proceso de la aplicación (el almacenamiento JSON no admite múltiples réplicas).
- Disco persistente para DATA_DIR, respaldado. No guardar datos dentro de una capa efímera del contenedor.
- HTTPS con certificado válido y un origen estable. Una IP pública por HTTP no permite instalar el modo sin conexión. Puede utilizarse un dominio apuntando a la IP o un certificado válido para esa IP.
- Proxy inverso que envíe tráfico a 8769 y mantenga `/api/events` sin buffering, con tiempo de espera superior a 60 segundos. No publicar directamente el puerto HTTP de Node.
- Configurar `PUBLIC_ORIGIN=https://direccion-definitiva`, `HOST=0.0.0.0`, `PORT=8769` y `DATA_DIR=/ruta/persistente`. PUBLIC_ORIGIN debe coincidir exactamente con la dirección que abre el usuario. Activa también la cookie Secure.
- Migrar la base actual con el servidor detenido y cambiar las claves de prueba antes del torneo.

## Funcionamiento sin cobertura

Antes de salir al campo, cada anotador debe ingresar con señal en la dirección definitiva y esperar el aviso «Todo sincronizado / Aplicación preparada para abrirse sin señal». Se puede añadir la aplicación a la pantalla de inicio. La primera carga y el primer ingreso requieren conexión.

Los golpes y las dos firmas se escriben primero en IndexedDB, separados por usuario. El indicador confirma cuándo están guardados localmente. Se conservan al cerrar y abrir la app en el mismo navegador/origen. No borrar los datos del sitio ni utilizar navegación privada durante la ronda. Se solicita almacenamiento persistente, sujeto a la decisión del navegador.

La sincronización se intenta al recuperar señal, al abrir/volver a la aplicación, por notificaciones del servidor y como respaldo cada 15 segundos. No se promete ejecución con la aplicación cerrada: los sistemas móviles pueden suspenderla. Los resultados de otros grupos son la última copia recibida cuando no hay señal.

Cada operación tiene un identificador durable; repetir una solicitud cuya respuesta se perdió no duplica la anotación. Se comprueba versión por hoyo, generación de tarjeta, permisos y firmas sobre los mismos golpes. Los conflictos o cambios de permiso retienen el borrador local con un aviso y no sobrescriben al servidor. El usuario puede exportar su respaldo JSON antes de decidir descartar pendientes. El respaldo es para recuperación manual; no se importa automáticamente.

La finalización queda «Firmada · Pendiente de enviar» hasta que el servidor la acepte. PDF confirmado requiere sincronización. Maestros, habilitación de edición, reapertura y renovación de sesión requieren conexión. El administrador puede bloquear edición mientras alguien está desconectado; ese dispositivo no puede conocer el cambio hasta reconectar, y el servidor rechazará el envío conservando los datos locales.

Sesiones de siete días persistentes entre reinicios del servidor. Al vencer la sesión se pide ingresar con la misma cédula sin borrar la cola pendiente. El permiso local se limita a siete días desde la última conexión y siempre se revalida al enviar.

## Pruebas

`node tests.cjs`, `node offline-tests.cjs`, `node integration.cjs`, `node sync-http-tests.cjs`.
Las pruebas no alteran los datos reales. Pendiente validación en celulares físicos Android/iPhone con la dirección HTTPS definitiva y modo avión; no se ha realizado aún esa prueba de campo.
