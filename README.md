# Tarjeta Macarena

Aplicación local independiente, sin dependencias externas. Node.js 24 o superior.

Ejecutar `node server.cjs` y abrir http://127.0.0.1:8769.
Pruebas: `node tests.cjs`.

Administrador inicial: cédula 1036926786, clave 1130. Los otros 15 jugadores son ficticios, con clave inicial Golf2026!. Solo se cargan al crear una base nueva.

Datos persistentes en data/macarena.json. Claves protegidas con scrypt, sesiones HttpOnly persistentes de siete días. Las claves no se devuelven al navegador. El servidor aplica permisos, cierre y control de edición. Auditoría de cambios y control de revisiones evitan sobrescribir un score desactualizado.

G1 y G2 salen por el hoyo 1; G3 y G4 por el 10. Los capitanes de la misma salida llevan las tarjetas cruzadas. Julian es administrador y puede editar cualquier tarjeta abierta. Edición general deshabilitada inicialmente.

Los maestros incluyen cancha, jugadores, grupos, integrantes/salida y asignación de tarjetas. Las relaciones con golpes registrados no pueden alterarse; se preserva la coherencia de los resultados. Cada grupo admite un solo capitán activo de categoría 1ra.

La aplicación no está publicada ni tiene vínculos con la publicación o datos de Ryder. Para publicar se deberá configurar un servicio propio con HTTPS y almacenamiento persistente.

