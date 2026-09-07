# Habilidad de Infraestructura y Configuración: CalMiranda App

Este documento establece de forma persistente los detalles de infraestructura, credenciales de APIs, configuración de base de datos y flujos a replicar en la aplicación de gestión de procesos de CalMiranda.

---

## 1. Entorno de Desarrollo y Despliegue
* **Dominio Oficial**: `https://app.calmiranda.com`
* **URL de Redirección de Google OAuth**: `https://app.calmiranda.com/api/auth/google/callback`
* **Repositorio de Git**: `https://github.com/rhectoroc/app_calmiranda.git`
* **Gestor de Paquetes**: Exclusivamente `pnpm`.
* **Manejo de Secretos**: Ninguna credencial o secreto debe guardarse en archivos `.env` locales en el repositorio de Git. Todo se lee directamente de las **variables de entorno en Easypanel** o de la tabla de configuraciones en PostgreSQL.

---

## 2. Base de Datos (PostgreSQL)
* **Entorno de Producción (VPS / Easypanel)**:
  * **Cadena de Conexión**: `postgres://postgres:<PASSWORD_DATABASE>@cal-miranda_postgres:5432/cal-miranda?sslmode=disable`
  * **Contenedor en Easypanel**: `cal-miranda_postgres` (resoluble bajo la red interna de Docker en el VPS).
* **Entorno Local de Pruebas (Docker)**:
  * **Archivo Compose**: `docker-compose.yml` en la raíz del proyecto.
  * **Contenedor Local**: `calmiranda_db` (imagen `postgres:15-alpine`).
  * **Puerto Mapeado**: `5433:5432` (para no colisionar con instalaciones locales por defecto en `5432`).
  * **Base de Datos / Usuario**: `cal-miranda` / `postgres`.
  * **Propósito**: Simular localmente todo el esquema y comportamiento de producción de forma aislada y segura.
* **ADVERTENCIA DE SEGURIDAD**: La tabla `clientes` ya contiene información valiosa y activa en producción.
  * **Prohibido**: Ejecutar `DROP TABLE`, `TRUNCATE` o cualquier cambio destructivo sobre la tabla `clientes`.
  * **Autenticación**: Para el inicio de sesión y gestión de accesos (Administradores y Empleados), se debe utilizar una tabla dedicada llamada `users`, la cual es completamente independiente de la tabla comercial `clientes`.
  * **Creación de Tablas**: Se debe usar siempre `CREATE TABLE IF NOT EXISTS` en los scripts de migración o código de inicio del backend para garantizar la preservación de datos.

---

## 3. Credenciales y Cuentas de API

### A. Google Cloud / Workspace (Gmail, Sheets, Calendar)
* **Cuenta de Gmail Principal**: `inversionesmiranda1311@gmail.com`
* **Contraseña del Correo**: `<PASSWORD_GMAIL>`
* **Google OAuth Credentials**:
  * **ID del Cliente (Principal)**: `<GOOGLE_CLIENT_ID_PRINCIPAL>`
  * **Secreto del Cliente (Principal)**: `<GOOGLE_CLIENT_SECRET_PRINCIPAL>`
  * **ID del Cliente (Secundario/Alternativo)**: `<GOOGLE_CLIENT_ID_SECUNDARIO>`
  * **Secreto del Cliente (Secundario/Alternativo)**: `<GOOGLE_CLIENT_SECRET_SECUNDARIO>`
* **Hojas de Cálculo Relacionadas**:
  1. **Productos Cal Miranda**: `https://docs.google.com/spreadsheets/d/1GDkxPEvCyKhA2fYR1Ub9Sv-GAAx0_5DkBYGfJqCOydg/edit?gid=0#gid=0` (ID: `1GDkxPEvCyKhA2fYR1Ub9Sv-GAAx0_5DkBYGfJqCOydg`, hoja `Productos_Cal Miranda`).
  2. **Tasa de Cambio**: Hoja `Tasa` en el Spreadsheet con ID `1_O58lqnRD0lk5vNJp3NLFOkv_jwmtbo-aQgGMy3rHkI`.
  3. **Cuentas Cal Miranda**: Hoja `CUENTAS CAL MIRANDA` en el Spreadsheet con ID `1oXz8Irdev0T6WVRmbL4tRfeQtCCm66DaDzFhk0-vBXM`.

### B. Evolution API (WhatsApp Gateway)
* **Instancia**: `CalMiranda`
* **API Key / Token**: `<EVOLUTION_API_KEY>`
* **Teléfono Emisor (WhatsApp Bot)**: `584242574698@s.whatsapp.net`
* **Teléfono Destinatario del Reporte Diario (Julio)**: `584143078681@s.whatsapp.net`

### C. Inteligencia Artificial (LLM - DeepSeek)
* **Proveedor Exclusivo**: DeepSeek (API de compatibilidad con OpenAI).
* **Base URL**: `https://api.deepseek.com`
* **Modelo Utilizado**: `deepseek-chat`

---

## 4. Workflows a Replicar en el Servidor Backend

Los archivos JSON con la lógica de n8n se ubican en el directorio `/workflows` en la raíz del proyecto. El backend debe replicar exactamente la lógica de los tres flujos:

1. **BuscaTasa_Diamantin (`BuscaTasa_Diamantin.json`)**:
   * **Programación**: Tarea programada diaria a las 9:00 AM.
   * **Lógica**: Realiza un raspado (scraping) de `bcv.org.ve`, extrae la tasa de cambio vigente y la fecha ISO, y la registra en la hoja `Tasa` del Google Sheet.
2. **Reporte Financiero Diario (`Diamantin - Reporte Financiero Diario.json`)**:
   * **Programación**: Lunes y Miércoles a las 10:00 AM.
   * **Lógica**: Lee la hoja `CUENTAS CAL MIRANDA`, procesa los saldos, utiliza un LLM para formatear un balance financiero ordenado y redactado profesionalmente, y lo envía por WhatsApp a Julio.
3. **Agente Diamantín Mejorado (`Diamantin Mejorado.json`)**:
   * **Lógica**: Recibe webhooks de Evolution API/Chatwoot en el endpoint `/webhooks/whatsapp`.
   * **De-duplicación**: Implementa un caché de mensajes en memoria por TTL para ignorar llamadas repetidas del webhook.
   * **Control de Handoff**: Si el contacto posee la etiqueta `bot: Desactivado`, el bot no responde (permite atención humana).
   * **Roles**: Identifica el rol del emisor (Jefe, Jefa o Cliente) y ejecuta un sistema de prompts adaptado.
   * **Acciones/Herramientas del Agente**:
     * Consultar la tabla `clientes` en PostgreSQL.
     * Consultar y escribir en Google Sheets (Productos, Tasas, Cuentas).
     * Buscar correos, redactar borradores y enviar correos mediante la API de Gmail.
     * Consultar disponibilidad, agendar o eliminar eventos de Google Calendar.
