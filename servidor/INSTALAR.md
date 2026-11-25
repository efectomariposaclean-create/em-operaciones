# Efecto Mariposa · Operaciones v2 — Puesta en marcha

Son dos partes:
- **El servidor**, en Google Apps Script. Guarda los datos y las fotos en tu Drive.
- **La app**, en GitHub Pages. Es lo que se instala en el móvil.

## 1. Servidor en Google (unos 5 minutos, una sola vez)

1. Entra en https://script.google.com con la cuenta efectomariposaclean@gmail.com y pulsa **Nuevo proyecto**.
2. Arriba a la izquierda, cambia el nombre a `EM Operaciones · Servidor`.
3. Borra todo lo que hay en `Código.gs` y pega el contenido del archivo **Codigo.gs**.
4. Activa el archivo de configuración: ve a ⚙️ **Configuración del proyecto** y marca **«Mostrar el archivo de manifiesto appsscript.json en el editor»**.
5. Vuelve al editor, abre `appsscript.json`, borra lo que tenga y pega el contenido del archivo **appsscript.json**.
6. Guarda con el disquete. En la barra de arriba, elige la función **instalar** y pulsa **Ejecutar**.
   - Google te pedirá permisos para usar Drive y Hojas de cálculo. Acepta.
   - Si aparece «Google no ha verificado esta aplicación», pulsa **Configuración avanzada** y luego **Ir a EM Operaciones (no seguro)**. Es normal, porque la app es tuya.
7. Abajo, en el **Registro de ejecución**, aparecerá **tu PIN de dirección**. Apúntalo.
8. Pulsa **Implementar → Nueva implementación**. En el engranaje, elige **Aplicación web** y rellena así:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario** (sin iniciar sesión; el acceso lo protege el PIN)
9. Pulsa **Implementar** y copia la **URL de la aplicación web** (acaba en `/exec`). Pásamela por el chat.

## 2. App en GitHub

Cuando tenga la URL, la pongo en `config.js` y publico la app. Tu enlace quedará así:
`https://efectomariposaclean-create.github.io/em-operaciones/`

## 3. Instalarla en el móvil

- **Android (Chrome):** abre el enlace y pulsa **Instalar** en el aviso, o en el menú ⋮ elige **Instalar aplicación**.
- **iPhone (Safari):** abre el enlace, pulsa **Compartir** y elige **Añadir a pantalla de inicio**.

## Qué se crea en tu Drive

Una carpeta llamada **Efecto Mariposa · Operaciones (PRIVADO)** con:
- **EM Operaciones · Base:** la hoja con todos los datos. No la edites a mano.
- **Clientes:** una carpeta por cliente, con sus fotos (separadas por mes y por vehículo) y sus albaranes en PDF.
- **Copias de seguridad:** una copia cada noche a las 3:00. Se guardan las últimas 30.
- **Histórico:** una hoja por año. Cada día 1 de mes, los servicios entregados hace más de 60 días pasan aquí, para que la app siga igual de rápida.

## Si pierdes tu PIN

En el editor de Apps Script, ejecuta la función `restablecerPinDireccion`. El PIN nuevo sale en el registro.

## Actualizaciones

- **Si cambia la app:** la publico yo en GitHub y los móviles se actualizan solos.
- **Si cambia el servidor:** pegas el código nuevo y vas a **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión**. La URL no cambia.

## Actualizar a la versión 2.1 (portal del cliente)

1. En Apps Script, abre `Código.gs`, borra todo y pega el nuevo `servidor/Codigo.gs` de GitHub. Guarda.
2. En el desplegable de funciones elige **autorizarCorreo** y pulsa **Ejecutar**. Acepta el permiso nuevo para enviar correos. Te llegará un correo de prueba con el aspecto de los avisos.
3. Ve a **Implementar → Gestionar implementaciones**, pulsa el lápiz ✏️, cambia **Versión** a **Nueva versión** y pulsa **Implementar**. La dirección `/exec` no cambia.

Las columnas nuevas se añaden solas a tu hoja la primera vez que alguien entra. No se borra nada.

## Actualizar a la versión 2.2 (almacén y gastos)

1. En Apps Script, borra `Código.gs`, pega el nuevo `servidor/Codigo.gs` y guarda.
2. Crea un archivo nuevo (botón **+** › **Secuencia de comandos**), llámalo `Inventario` y pega dentro el archivo privado `Inventario.gs` que te pasa Claude por el chat. Ese archivo no está en GitHub porque contiene tus datos.
3. Ve a **Implementar → Gestionar implementaciones**, pulsa el lápiz ✏️, elige **Nueva versión** y pulsa **Implementar**.

La primera vez que alguien entre se crean solas las hojas del almacén con tu inventario cargado. Si el almacén aparece vacío, ejecuta la función `cargarInventarioInicial`.

## Actualizar a la versión 3.0 (CRM, facturas, contabilidad y agenda) · actualización completa

Incluye también el almacén de la 2.2, así que si no la instalaste, esta lo hace todo de una vez.

1. En Apps Script, abre `Código.gs`, borra todo y pega el nuevo `servidor/Codigo.gs`. Guarda.
2. Crea un archivo nuevo (**+** › **Secuencia de comandos**) llamado `Crm` y pega `servidor/Crm.gs`.
3. Crea otro llamado `Inventario` y pega el archivo privado `Inventario.gs` que te pasa Claude por el chat (si ya lo tienes, déjalo).
4. Crea otro llamado `DatosCrm` y pega el archivo privado `DatosCrm.gs` que te pasa Claude por el chat. Contiene tus clientes, facturas y contabilidad: no está en GitHub.
5. En el desplegable de funciones elige **activarCrm** y pulsa **Ejecutar**. Acepta los permisos nuevos (Google Calendar y la hoja de solicitudes de la web). En el registro verás cuántos prospectos, facturas y movimientos se han cargado.
6. **Implementar → Gestionar implementaciones** › lápiz ✏️ › **Nueva versión** › **Implementar**. La dirección `/exec` no cambia.

Qué hace `activarCrm`:
- Crea las hojas nuevas (Contactos, Facturas, Presupuestos, Contabilidad) sin tocar lo que ya existe.
- Carga los datos del CRM anterior y casa los clientes con los que ya tenías (por nombre o NIF).
- Conecta tu Google Calendar: los seguimientos con fecha aparecen solos en tu calendario.
- Programa cada hora la entrada de las solicitudes de presupuesto de la web como prospectos nuevos.

Si lo ejecutas dos veces no duplica nada.
