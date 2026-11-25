# Registro de Avances - CalMiranda App

Este archivo resume todos los hitos y desarrollos completados el día de hoy, detallando los cambios en base de datos, backend y frontend.

---

## 1. Identificación Inteligente de Clientes Existentes
* **Objetivo**: Reconocer si un cliente es recurrente al recibir un mensaje de WhatsApp.
* **Implementación**:
  * Se diseñó una consulta en la base de datos que normaliza y extrae los últimos dígitos del número de teléfono remitente.
  * Se contrasta con las columnas `telefono_1`, `movil`, `telefono_2` y `telefono_3` de la tabla `clientes`.
  * Si hay coincidencia, el bot Diamantín saluda de manera personalizada con su nombre (ej: *"¡Buenos días, Hector! Qué gusto saludarle nuevamente..."*), brindando un trato preferente.

## 2. Reestructuración del Sistema de Prompts y Reglas Extras
* **Objetivo**: Simplificar la base de datos y evitar la pérdida de directivas por manipulación en la interfaz.
* **Implementación**:
  * Se movieron los prompts base con la personalidad (Diamantín), el catálogo de productos, las instrucciones de recomendación por cantidad/zona, restricciones técnicas absolutas y datos bancarios de manera estática al servidor (`agent.ts`).
  * Se habilitó una sección de "Reglas Extras y Novedades en Tiempo Real" en la base de datos.
  * Al recibir un mensaje, el servidor concatena dinámicamente las directivas fijas con las reglas de negocio agregadas en tiempo real por el administrador.

## 3. Eliminación del Asistente Corporativo IA y Simplificación de Ajustes
* **Objetivo**: Limpiar la aplicación de interfaces obsoletas e innecesarias para el usuario final.
* **Implementación**:
  * Se removió por completo la sección "Asistente IA" (archivo `BusinessAssistantView.tsx` eliminado y ruta desinstalada).
  * Se simplificó `SettingsView.tsx` removiendo los formularios técnicos de conexión de base de datos PostgreSQL de Easypanel y Evolution API.
  * Se conservó un formulario único de actualización para las "Reglas Extras" de atención al cliente.

## 4. Nuevo Módulo de Gestión de Clientes (CRUD y Paginación)
* **Objetivo**: Proveer al equipo de CalMiranda un control completo de su cartera de clientes conectada a la base de datos real.
* **Implementación**:
  * **Frontend (`ClientesView.tsx`)**:
    * Interfaz premium glassmorphic oscura con acentos verde esmeralda.
    * Paginación integrada de 50 en 50 registros para optimización de memoria.
    * Buscador avanzado en tiempo real que filtra por Nombre, RIF, Teléfono Principal, Contacto Principal o Zona Geográfica.
    * Filtro dropdown por estatus (Todos/Activos/Inactivos/Prospectos).
    * Modal multi-pestaña para la visualización, creación y edición de todos los campos de la base de datos (datos de contacto, vendedor, historial de negociación, días de crédito, precio pactado y comentarios).
    * Modal de confirmación de eliminación segura.
  * **Backend (`server.ts`)**:
    * Implementación de endpoints RESTful completos (`GET`, `POST`, `PUT`, `DELETE` en `/api/clientes`) con ordenación e ILIKE en Postgres.

## 5. Integración de Mensajería en Tiempo Real y Polling
* **Objetivo**: Mostrar la actividad real del bot en el panel "Atención Cliente" sin recurrir a datos ficticios (mock).
* **Implementación**:
  * Se eliminaron los chats de relleno del frontend.
  * Se programó un polling periódico en `CustomerServiceHub.tsx` para sincronizar los chats (cada 4 segundos) y los mensajes de la conversación activa (cada 3 segundos).
  * Se implementó el registro de respuestas manuales de asesores en la tabla `chat_messages` con remitente `'agent'` para que las conversaciones humanas no desaparezcan al recargar la página.
  * Se habilitó el flujo completo de "Intervenir Conversación" (handoff a humano) y "Reactivar IA (Bot)" con avisos de sistema automáticos en el chat.

## 6. Inicialización Segura en Producción (Easypanel / VPS)
* **Objetivo**: Asegurar que el aplicativo no falle por tablas faltantes al desplegarse en contenedores Docker de Easypanel.
* **Implementación**:
  * Se creó una función de inicialización `initDb()` en `db.ts` que busca y ejecuta automáticamente `schema.sql` al levantar el servidor.
  * Cuenta con un script PL/pgSQL seguro que migra registros históricos a la nueva tabla `chat_messages` si esta se encuentra vacía.

## 7. Desactivación Global del Bot (Interruptor de Desarrollo)
* **Objetivo**: Detener las respuestas automáticas generadas por IA de forma instantánea durante el desarrollo o actualización de reglas.
* **Implementación**:
  * Se añadió un interruptor de "Estado Bot" en el panel lateral (Layout) de visualización permanente para administradores.
  * Se añadió una tarjeta premium de estado con un switch deslizante en la sección de Configuración.
  * Ambas interfaces se sincronizan en tiempo real mediante eventos personalizados de JavaScript.
  * Si el bot se desactiva, los mensajes de los clientes se guardan silenciosamente en la base de datos y se reflejan en el hub humano en tiempo real, pero el bucle de DeepSeek no se inicia.

## 8. Mejoras y Correcciones del 25 de Mayo de 2026 (Sistema de Etiquetas, Zona Horaria y Robustez de Datos)

* **Separación de Estatus y Etiquetas de Silenciado (Bot):**
  * **Objetivo**: Separar el estatus comercial de clientes (`Activo`, `Inactivo`, `Por captar`, `Prospecto`) de las etiquetas que usa el bot para silenciar conversaciones (`Empleado`, `Transportista`, `Otros`).
  * **Implementación**: Se introdujo la columna `etiqueta` en la tabla `clientes`, se crearon consultas y migraciones seguras y se actualizaron los endpoints del backend (`/api/chats`, `/client-status`, `/rename`) para operar sobre ella, desligándolo del estatus comercial del cliente.
* **Detención e Ignorado Robusto del Bot (Fijado de Regresión de Teléfonos):**
  * **Objetivo**: Garantizar que el bot realmente deje de responder a los contactos con etiquetas restrictivas.
  * **Implementación**: Se actualizaron `/client-status` y `/rename` para buscar clientes usando la normalización por regex de 10 dígitos (consistente con el bot) y se añadió tolerancia a mayúsculas/minúsculas y espacios (`trim()`, `toLowerCase()`) al evaluar la etiqueta en `agent.ts`.
* **Configuración de Zona Horaria de Venezuela:**
  * **Objetivo**: Corregir las marcas de tiempo desfasadas (UTC) en los mensajes y reportes generados desde el VPS de producción.
  * **Implementación**: Configuración global de `process.env.TZ = 'America/Caracas'` al arranque de los módulos principales (`server.ts`, `scheduler.ts` y `agent.ts`).
* **Diseño Premium Glassmorphic para Detalles de Cliente:**
  * **Objetivo**: Aumentar la estética y claridad de los campos RIF, Zona y Estatus en el encabezado del chat.
  * **Implementación**: Rediseño visual en `CustomerServiceHub.tsx` con fondo translúcido (`backdrop-blur-md`), mayor espaciado (`gap-6`), iconos de `User` y `MapPin`, y pastillas de colores específicos e independientes para el estatus comercial con soporte case-insensitive.
* **Resolución de Shadowing y Ordenamiento de Duplicados en SQL:**
  * **Objetivo**: Evitar que registros duplicados vacíos (sin RIF ni zona específica) bloqueen e invisibilicen la ficha comercial real completa de un cliente.
  * **Implementación**: Se inyectaron cláusulas `ORDER BY` en todas las consultas de búsqueda de clientes por teléfono (`server.ts` y `agent.ts`). Las búsquedas priorizan ahora registros con RIF definido, zonas específicas válidas y los IDs más antiguos.
* **Desactivación de initDb() Automático y Seguridad del Esquema en Despliegue:**
  * **Objetivo**: Resguardar la base de datos de producción ante modificaciones destructivas accidentales por scripts en caliente.
  * **Implementación**: Se eliminó la inicialización automática `initDb()` al arrancar en `server.ts` y se excluyó `schema.sql` de la imagen de producción en el `Dockerfile`. Toda modificación estructural se gestionará manualmente en DbGate.
* **Ajuste de Prompts del Bot (Exclusión de Agotado de Cal de 5Kg):**
  * **Objetivo**: Prevenir que el bot mencione de antemano la falta de disponibilidad de cal de 5 kg cuando el cliente no la ha solicitado.
  * **Implementación**: Ajuste de prompts de sistema en el chatbot web y del bot de WhatsApp para ceñirse a ofrecer únicamente la presentación de 7 kg de forma activa, absteniéndose de mencionar lo que no se tiene.

## Rediseño Operativo y Optimización de App (Sesión Actual)

* **Rediseño Integral del Dashboard (Resumen Operativo):**
  * **Objetivo**: Mejorar la visualización y control gerencial de la aplicación en dispositivos móviles (APK) y escritorio, adaptando la UI a un concepto Premium Glassmorphic y de "Modo Oscuro".
  * **Implementación**: 
    * Se reemplazó el antiguo Dashboard estático por 4 KPIs principales dinámicos (Producción Consolidada, Despachos, Valor de Inventario, Alertas Críticas).
    * Se conectó la vista directamente a la API en vivo (`/api/inventario`) para reflejar los datos reales del sistema en lugar de usar datos estáticos.
    * Se construyó un gráfico de barras responsivo puramente en CSS/SVG para reportar la producción.
    * Se integró un *feed* vertical en tiempo real (Línea de Tiempo) para la actividad operativa e intervenciones de la IA.
* **Ajustes de Interfaz Mobile-First (APK):**
  * **Objetivo**: Garantizar que las tablas de datos encajen en pantallas móviles sin forzar un *scroll* horizontal incómodo.
  * **Implementación**: Se ajustaron las tablas usando flex layouts, fuentes ultra-condensadas (`text-[8px]` a `text-[10px]`) y se ocultaron palabras/columnas accesorias temporalmente en resoluciones pequeñas (`sm`).
* **Fidelización del Proceso Operativo Real:**
  * **Objetivo**: Adaptar el sistema a la realidad operativa local (no se procesa calcinación en hornos).
  * **Implementación**: Se eliminaron las métricas, sensores de temperatura, columnas de tablas y datos sintéticos en `mockData.ts` y del Dashboard asociados a "Hornos".
* **Generación de Iconografía Adaptativa (APK Android):**
# Registro de Avances - CalMiranda App

Este archivo resume todos los hitos y desarrollos completados el día de hoy, detallando los cambios en base de datos, backend y frontend.

---

## 1. Identificación Inteligente de Clientes Existentes
* **Objetivo**: Reconocer si un cliente es recurrente al recibir un mensaje de WhatsApp.
* **Implementación**:
  * Se diseñó una consulta en la base de datos que normaliza y extrae los últimos dígitos del número de teléfono remitente.
  * Se contrasta con las columnas `telefono_1`, `movil`, `telefono_2` y `telefono_3` de la tabla `clientes`.
  * Si hay coincidencia, el bot Diamantín saluda de manera personalizada con su nombre (ej: *"¡Buenos días, Hector! Qué gusto saludarle nuevamente..."*), brindando un trato preferente.

## 2. Reestructuración del Sistema de Prompts y Reglas Extras
* **Objetivo**: Simplificar la base de datos y evitar la pérdida de directivas por manipulación en la interfaz.
* **Implementación**:
  * Se movieron los prompts base con la personalidad (Diamantín), el catálogo de productos, las instrucciones de recomendación por cantidad/zona, restricciones técnicas absolutas y datos bancarios de manera estática al servidor (`agent.ts`).
  * Se habilitó una sección de "Reglas Extras y Novedades en Tiempo Real" en la base de datos.
  * Al recibir un mensaje, el servidor concatena dinámicamente las directivas fijas con las reglas de negocio agregadas en tiempo real por el administrador.

## 3. Eliminación del Asistente Corporativo IA y Simplificación de Ajustes
* **Objetivo**: Limpiar la aplicación de interfaces obsoletas e innecesarias para el usuario final.
* **Implementación**:
  * Se removió por completo la sección "Asistente IA" (archivo `BusinessAssistantView.tsx` eliminado y ruta desinstalada).
  * Se simplificó `SettingsView.tsx` removiendo los formularios técnicos de conexión de base de datos PostgreSQL de Easypanel y Evolution API.
  * Se conservó un formulario único de actualización para las "Reglas Extras" de atención al cliente.

## 4. Nuevo Módulo de Gestión de Clientes (CRUD y Paginación)
* **Objetivo**: Proveer al equipo de CalMiranda un control completo de su cartera de clientes conectada a la base de datos real.
* **Implementación**:
  * **Frontend (`ClientesView.tsx`)**:
    * Interfaz premium glassmorphic oscura con acentos verde esmeralda.
    * Paginación integrada de 50 en 50 registros para optimización de memoria.
    * Buscador avanzado en tiempo real que filtra por Nombre, RIF, Teléfono Principal, Contacto Principal o Zona Geográfica.
    * Filtro dropdown por estatus (Todos/Activos/Inactivos/Prospectos).
    * Modal multi-pestaña para la visualización, creación y edición de todos los campos de la base de datos (datos de contacto, vendedor, historial de negociación, días de crédito, precio pactado y comentarios).
    * Modal de confirmación de eliminación segura.
  * **Backend (`server.ts`)**:
    * Implementación de endpoints RESTful completos (`GET`, `POST`, `PUT`, `DELETE` en `/api/clientes`) con ordenación e ILIKE en Postgres.

## 5. Integración de Mensajería en Tiempo Real y Polling
* **Objetivo**: Mostrar la actividad real del bot en el panel "Atención Cliente" sin recurrir a datos ficticios (mock).
* **Implementación**:
  * Se eliminaron los chats de relleno del frontend.
  * Se programó un polling periódico en `CustomerServiceHub.tsx` para sincronizar los chats (cada 4 segundos) y los mensajes de la conversación activa (cada 3 segundos).
  * Se implementó el registro de respuestas manuales de asesores en la tabla `chat_messages` con remitente `'agent'` para que las conversaciones humanas no desaparezcan al recargar la página.
  * Se habilitó el flujo completo de "Intervenir Conversación" (handoff a humano) y "Reactivar IA (Bot)" con avisos de sistema automáticos en el chat.

## 6. Inicialización Segura en Producción (Easypanel / VPS)
* **Objetivo**: Asegurar que el aplicativo no falle por tablas faltantes al desplegarse en contenedores Docker de Easypanel.
* **Implementación**:
  * Se creó una función de inicialización `initDb()` en `db.ts` que busca y ejecuta automáticamente `schema.sql` al levantar el servidor.
  * Cuenta con un script PL/pgSQL seguro que migra registros históricos a la nueva tabla `chat_messages` si esta se encuentra vacía.

## 7. Desactivación Global del Bot (Interruptor de Desarrollo)
* **Objetivo**: Detener las respuestas automáticas generadas por IA de forma instantánea durante el desarrollo o actualización de reglas.
* **Implementación**:
  * Se añadió un interruptor de "Estado Bot" en el panel lateral (Layout) de visualización permanente para administradores.
  * Se añadió una tarjeta premium de estado con un switch deslizante en la sección de Configuración.
  * Ambas interfaces se sincronizan en tiempo real mediante eventos personalizados de JavaScript.
  * Si el bot se desactiva, los mensajes de los clientes se guardan silenciosamente en la base de datos y se reflejan en el hub humano en tiempo real, pero el bucle de DeepSeek no se inicia.

## 8. Mejoras y Correcciones del 25 de Mayo de 2026 (Sistema de Etiquetas, Zona Horaria y Robustez de Datos)

* **Separación de Estatus y Etiquetas de Silenciado (Bot):**
  * **Objetivo**: Separar el estatus comercial de clientes (`Activo`, `Inactivo`, `Por captar`, `Prospecto`) de las etiquetas que usa el bot para silenciar conversaciones (`Empleado`, `Transportista`, `Otros`).
  * **Implementación**: Se introdujo la columna `etiqueta` en la tabla `clientes`, se crearon consultas y migraciones seguras y se actualizaron los endpoints del backend (`/api/chats`, `/client-status`, `/rename`) para operar sobre ella, desligándolo del estatus comercial del cliente.
* **Detención e Ignorado Robusto del Bot (Fijado de Regresión de Teléfonos):**
  * **Objetivo**: Garantizar que el bot realmente deje de responder a los contactos con etiquetas restrictivas.
  * **Implementación**: Se actualizaron `/client-status` y `/rename` para buscar clientes usando la normalización por regex de 10 dígitos (consistente con el bot) y se añadió tolerancia a mayúsculas/minúsculas y espacios (`trim()`, `toLowerCase()`) al evaluar la etiqueta en `agent.ts`.
* **Configuración de Zona Horaria de Venezuela:**
  * **Objetivo**: Corregir las marcas de tiempo desfasadas (UTC) en los mensajes y reportes generados desde el VPS de producción.
  * **Implementación**: Configuración global de `process.env.TZ = 'America/Caracas'` al arranque de los módulos principales (`server.ts`, `scheduler.ts` y `agent.ts`).
* **Diseño Premium Glassmorphic para Detalles de Cliente:**
  * **Objetivo**: Aumentar la estética y claridad de los campos RIF, Zona y Estatus en el encabezado del chat.
  * **Implementación**: Rediseño visual en `CustomerServiceHub.tsx` con fondo translúcido (`backdrop-blur-md`), mayor espaciado (`gap-6`), iconos de `User` y `MapPin`, y pastillas de colores específicos e independientes para el estatus comercial con soporte case-insensitive.
* **Resolución de Shadowing y Ordenamiento de Duplicados en SQL:**
  * **Objetivo**: Evitar que registros duplicados vacíos (sin RIF ni zona específica) bloqueen e invisibilicen la ficha comercial real completa de un cliente.
  * **Implementación**: Se inyectaron cláusulas `ORDER BY` en todas las consultas de búsqueda de clientes por teléfono (`server.ts` y `agent.ts`). Las búsquedas priorizan ahora registros con RIF definido, zonas específicas válidas y los IDs más antiguos.
* **Desactivación de initDb() Automático y Seguridad del Esquema en Despliegue:**
  * **Objetivo**: Resguardar la base de datos de producción ante modificaciones destructivas accidentales por scripts en caliente.
  * **Implementación**: Se eliminó la inicialización automática `initDb()` al arrancar en `server.ts` y se excluyó `schema.sql` de la imagen de producción en el `Dockerfile`. Toda modificación estructural se gestionará manualmente en DbGate.
* **Ajuste de Prompts del Bot (Exclusión de Agotado de Cal de 5Kg):**
  * **Objetivo**: Prevenir que el bot mencione de antemano la falta de disponibilidad de cal de 5 kg cuando el cliente no la ha solicitado.
  * **Implementación**: Ajuste de prompts de sistema en el chatbot web y del bot de WhatsApp para ceñirse a ofrecer únicamente la presentación de 7 kg de forma activa, absteniéndose de mencionar lo que no se tiene.

## Rediseño Operativo y Optimización de App (Sesión Actual)

* **Rediseño Integral del Dashboard (Resumen Operativo):**
  * **Objetivo**: Mejorar la visualización y control gerencial de la aplicación en dispositivos móviles (APK) y escritorio, adaptando la UI a un concepto Premium Glassmorphic y de "Modo Oscuro".
  * **Implementación**: 
    * Se reemplazó el antiguo Dashboard estático por 4 KPIs principales dinámicos (Producción Consolidada, Despachos, Valor de Inventario, Alertas Críticas).
    * Se conectó la vista directamente a la API en vivo (`/api/inventario`) para reflejar los datos reales del sistema en lugar de usar datos estáticos.
    * Se construyó un gráfico de barras responsivo puramente en CSS/SVG para reportar la producción.
    * Se integró un *feed* vertical en tiempo real (Línea de Tiempo) para la actividad operativa e intervenciones de la IA.
* **Ajustes de Interfaz Mobile-First (APK):**
  * **Objetivo**: Garantizar que las tablas de datos encajen en pantallas móviles sin forzar un *scroll* horizontal incómodo.
  * **Implementación**: Se ajustaron las tablas usando flex layouts, fuentes ultra-condensadas (`text-[8px]` a `text-[10px]`) y se ocultaron palabras/columnas accesorias temporalmente en resoluciones pequeñas (`sm`).
* **Fidelización del Proceso Operativo Real:**
  * **Objetivo**: Adaptar el sistema a la realidad operativa local (no se procesa calcinación en hornos).
  * **Implementación**: Se eliminaron las métricas, sensores de temperatura, columnas de tablas y datos sintéticos en `mockData.ts` y del Dashboard asociados a "Hornos".
* **Generación de Iconografía Adaptativa (APK Android):**
  * **Objetivo**: Eliminar las barras laterales/negras de encuadre en el ícono de la aplicación Android al compilar en Capacitor.
  * **Implementación**: Se reescribió la lógica del script de procesamiento de Sharp (`convert_logo.js`) para usar interpolación `cover` inteligente sobre el nuevo logotipo metálico de "M". Se generaron 87 variaciones del ícono y Splash Screens de manera perfecta.
* **Estabilización del Build para Producción (Easypanel):**
  * **Objetivo**: Solucionar errores de validación y fallos de despliegue de TypeScript (`exit code 2`).
  * **Implementación**: Limpieza de todas las variables huérfanas o no leídas tras el refactoring masivo del Dashboard (`user`, `plants`, `initialPlants`). Verificación exitosa del Pipeline (`pnpm run build`).

## Mejoras de Seguridad, Rendimiento y UI Móvil (Sesión Actual)

* **Implementación de Seguridad Estricta (JWT & Anti-DDoS):**
  * **Objetivo**: Asegurar todos los endpoints de la API contra accesos no autorizados y ataques de fuerza bruta.
  * **Implementación**: 
    * Se configuró autenticación basada en JWT (`jsonwebtoken`) validando firmas criptográficas en todas las peticiones a la base de datos.
    * Se instaló y configuró `express-rate-limit` bloqueando ráfagas de peticiones sospechosas y `helmet` para blindar las cabeceras HTTP (XSS, Clickjacking, MIME sniffing).
* **Gestión Segura y Eficiente de Sesiones (Inactividad):**
  * **Objetivo**: Cerrar sesiones automáticamente por inactividad sin sacrificar el rendimiento de los dispositivos móviles (WebView/APK).
  * **Implementación**: 
    * Se programó un temporizador de 3 horas de inactividad máxima en `AuthContext`.
    * Se corrigió un severo problema de rendimiento ("pantalla negra" por saturación de CPU) al cambiar la lógica de destrucción/creación de `setTimeout` basada en eventos por un `setInterval` pasivo que valida timestamps (`lastActivityTime`).
    * Se creó un interceptor global de `fetch` en `main.tsx` que captura respuestas `401/403` e invalida la sesión local forzando un reingreso.
* **Branding Institucional y PWA (Manifest):**
  * **Objetivo**: Estandarizar la imagen gráfica y garantizar que la App se instale con aspecto nativo.
  * **Implementación**: 
    * Se reemplazaron textos genéricos por el logotipo oficial de CalMiranda (`logo.webp`) en Login y Menús.
    * Se generaron variaciones adaptativas cuadradas (1:1) del logotipo y se configuró un `manifest.json` y meta-etiquetas `theme-color` (`#121212`) para que al instalarse vía Google Chrome (PWA) el ícono y el marco del sistema se vean perfectos y sin bordes blancos.
* **Optimización Extrema de UI para Dispositivos Móviles (APK/PWA):**
  * **Objetivo**: Lograr que las complejas tablas de datos (Inventario, Productos, Clientes) se aprecien por completo en celulares sin necesidad de realizar scroll horizontal.
  * **Implementación**: 
    * Refactorización de layout eliminando anchos mínimos (`min-w-[800px]`), reduciendo `padding` a nivel de píxel e incorporando fuentes extra pequeñas (`text-[8px]`, `text-[10px]`).
    * Reestructuración flex (`flex-col`) para que etiquetas como "Unidad" o "Saco" pasen a la segunda línea evitando romper el nombre principal del producto.
    * Implementación de límites de caja con `line-clamp-2` y `break-words` para garantizar que los nombres de categorías extensas no se desborden de su diseño glassmorphic.

## Correcciones del Chatbot Web y Reglas del Agente (Sesión Actual)

* **Blindaje del Prompt y Handoff Automático (WhatsApp/Web):**
  * **Objetivo**: Evitar que el bot invente recomendaciones técnicas complejas y proteger información confidencial de la empresa.
  * **Implementación**: Se añadieron directivas estrictas en `agent.ts` para detectar la solicitud de "Asesoría". El bot tiene expresamente prohibido mostrar inventarios o cuentas por cobrar/pagar durante estas interacciones y debe ejecutar `activar_handoff` inmediatamente para ceder el control a un humano.
* **Filtro Estricto de Empleo (RRHH):**
  * **Objetivo**: Mantener el canal de WhatsApp exclusivamente para soporte técnico y comercial, filtrando solicitudes de empleo.
  * **Implementación**: Se instruyó a la IA para rechazar envíos de currículums o preguntas sobre vacantes de empleo, derivando cordialmente al aspirante al correo oficial de la empresa.
* **Reparación del Widget de Chat Web (Error de Conexión):**
  * **Objetivo**: Solucionar el mensaje "Parece que hay un problema de conexión" que se mostraba en el widget de la página web al intentar hablar con el bot.
  * **Implementación**: 
    * Se amplió la lista de orígenes permitidos en la configuración CORS de `server.ts` para admitir despliegues de red local (`192.168.x.x`) y variaciones de puertos Vite (`5174`, `5175`).
    * Se identificó que el *polling* de mensajes estaba siendo bloqueado por el middleware de seguridad (JWT Auth). Se habilitó el patrón de ruta pública para `GET /api/chats/web_*/messages` permitiendo la lectura de chat de visitantes no autenticados en la web.

## Gestión de Precios y Almacenes / Sedes (Sesión Actual)

* **Visualización de Precios en Catálogo de Productos:**
  * **Objetivo**: Permitir visualizar y controlar directamente el precio de venta referencial (USD) de cada producto en la tabla principal.
  * **Implementación**: 
    * Se añadió la columna **Precio (Ref)** con formato de moneda en [ProductosView.tsx](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_app/src/features/productos/ProductosView.tsx) (`$XX.XX` / `Ref. 0.00`).
    * Se conservó y vinculó el campo numérico con decimales en el modal de creación y edición.

* **Soporte Multisede / Almacenes (Hoyo de la Puerta y Guatire):**
  * **Objetivo**: Permitir segmentar qué productos se fabrican o almacenan exclusivamente en una sede en particular (o en ambas).
  * **Implementación**:
    * **Base de Datos**: Se actualizó el esquema en [schema.sql](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_app/server/schema.sql) con la columna `sede VARCHAR(50) DEFAULT 'Ambas'`, asegurando migración no destructiva con `ALTER TABLE productos ADD COLUMN IF NOT EXISTS sede VARCHAR(50) DEFAULT 'Ambas'`.
    * **Backend**: En [server.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_app/server/server.ts), se actualizaron los endpoints `GET`, `POST` y `PUT` de `/api/productos` para persistir y retornar el campo `sede`.
    * **Frontend (Productos)**: Se incorporó la columna y badges de Sede con diferenciación de colores (*Guatire* en ámbar, *Hoyo de la Puerta* en azul, *Ambas* en morado), un dropdown de filtro general en el encabezado (*Todas las Sedes*, *Hoyo de la Puerta*, *Guatire*, *Ambas*), y el selector correspondiente en el modal de CRUD.
    * **Integración con Inventario**: En [InventarioView.tsx](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_app/src/features/inventario/InventarioView.tsx), se adaptó el agrupamiento para que al consultar el Kardex de una sede (por ejemplo Guatire), solo figuren los productos configurados para esa sede o para ambas, aislando los productos que pertenecen exclusivamente a otra sede.

## Migración de la Base de Conocimiento del Bot (Sesión Actual)

* **Desacople de Google Sheets hacia PostgreSQL para Productos e Inventario:**
  * **Objetivo**: Que el agente virtual Diamantín (tanto en WhatsApp como en Web) consulte la base de datos real del sistema en lugar de depender de hojas de cálculo de Google Sheets para catálogo e inventario.
  * **Implementación**:
    * **WhatsApp ([agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts))**:
      * Se reescribió la herramienta `consultar_inventario` para realizar consultas SQL a la tabla `inventario` con cálculo de stock actual en tiempo real (`stock_inicial + produccion - salidas`), filtrable por producto y por sede (*Hoyo de la Puerta* o *Guatire*).
      * Se añadió la nueva herramienta `consultar_productos_catalogo` que consulta directamente la tabla `productos` (filtrando por categoría, término de búsqueda, devolviendo precio en USD, presentación, peso y sede).
      * Se actualizaron las instrucciones de `agentTools` y del prompt para que Diamantín conozca estas herramientas y las use activamente.
    * **Web Chatbot ([server.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/server.ts))**:
      * En `/api/web-chatbot`, se inyecta dinámicamente el catálogo de productos activo directamente desde la tabla `productos` con sus especificaciones, precios y sedes antes de formular la respuesta con DeepSeek.

## Automatización de Cierre Diario e Historial Unificado de Inventario (Sesión Actual)

* **Cierre Automático Diario de Inventario (Cron a las 6:00 PM Venezuela - `America/Caracas`):**
  * **Objetivo**: Asegurar que cada día quede registrado de forma confiable en el historial con el stock inicial, la producción, las salidas y el saldo final de ambas sedes (*Hoyo de la Puerta* y *Guatire*), sin depender de que un usuario recuerde presionar un botón.
  * **Implementación**:
    * **Backend ([scheduler.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/scheduler.ts))**:
      * Se implementó la función `runDailyInventoryClosing()` y se programó la tarea cron `0 18 * * *` (18:00 hrs) configurada explícitamente en la zona horaria `America/Caracas`.
      * Para cada una de las dos sedes, guarda la instantánea en `inventario_historial`, traslada el saldo final al saldo inicial y reinicia a cero la producción y las salidas del día operativo.
      * Registra la autoría como `'Sistema (Auto-Cierre 6:00 PM)'`.
    * **Endpoint de Cierre y Fechas ([server.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/server.ts))**:
      * Se actualizó `POST /api/inventario/cerrar-dia` para admitir el cierre simultáneo de `'Todas'` / `'Todas las Sedes'` con deduplicación por fecha.
      * Se añadió el endpoint `GET /api/inventario/fechas-disponibles` para que el frontend conozca exactamente qué días tienen registros históricos guardados.

* **Vista Unificada / Comparativa de Ambas Sedes en la Misma Tabla:**
  * **Objetivo**: Visualizar en una única tabla simultánea los movimientos y saldos de *Hoyo de la Puerta* y de *Guatire* lado a lado sin tener que alternar de sede.
  * **Implementación en [InventarioView.tsx](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/src/features/inventario/InventarioView.tsx)**:
    * Se añadió la opción por defecto **"Ambas Sedes (Comparativo)"** en el selector de sede.
    * En el modo comparativo, la tabla organiza cada producto con columnas dobles agrupadas:
      * **📍 Hoyo de la Puerta**: *Inicial*, *Prod*, *Sale*, *Total Hoyo*.
      * **📍 Guatire**: *Inicial*, *Prod*, *Sale*, *Total Guatire*.
    * Se conservó la opción de visualizar cada sede por separado cuando se requiera el modo enfocado.
    * **Refinamiento Visual y Coherencia de Diseño**:
      * Reestructuración del encabezado en una barra de control unificada, alineada horizontalmente y con altura consistente (`h-10`) para todos los elementos interactivos (Fecha, Selector de Sede, Botón Cerrar Día y Botón Guardar).
      * Integración de las etiquetas informativas (*Auto-cierre 6:00 PM VET* y *2 Sedes activas*) como badges sutiles y armónicos integrados en el subtítulo del encabezado, evitando bloques flotantes desconectados.
      * Pulido del lenguaje visual bajo la paleta institucional CalMiranda (Verde Esmeralda `#0ABF04`, bordes en `gray-700/60`, acentos esmeralda y fondos en cristal oscuro `bg-gray-900/90`).

## Blindaje y Auditoría de Seguridad (Sesión Actual)

* **Protección Estricta de Endpoints de Mantenimiento / Test**:
  * **Objetivo**: Asegurar que ninguna ruta administrativa de diagnóstico pueda ser invocada de forma pública en producción.
  * **Implementación**:
    * Se eliminaron las excepciones públicas para `/api/test/*` (disparos manuales de scraping o reportes financieros) y `/api/setup-webhook` (configuración remota de Evolution API).
    * Ahora todos estos endpoints exigen de forma obligatoria un token JWT válido (`Authorization: Bearer <token>`), respondiendo `401 Unauthorized` ante cualquier intento no autenticado.
    * Se mantiene la protección contra ataques de fuerza bruta en login (`loginLimiter`), límites de tasa de petición por IP (`apiLimiter`) y cabeceras de seguridad mediante `helmet`.

## Inclusión de Destinatario Técnico para Monitoreo de Reportes (Sesión Actual)

* **Multi-Destinatario en Reportes Automatizados (Nómina y Finanzas)**:
  * **Objetivo**: Asegurar que tanto la directiva de CalMiranda como el desarrollador reciban copias de los informes para monitoreo y verificación de entrega.
  * **Implementación**:
    * En [scheduler.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/scheduler.ts), se definió la lista `REPORT_RECIPIENTS` con:
      1. Julio Borges (Jefe): `process.env.WHATSAPP_REPORT_RECIPIENT || 584143078681@s.whatsapp.net`
      2. Desarrollador (Héctor): `584140108030@s.whatsapp.net`
    * Se creó la función `sendReportToRecipients()` para despachar concurrentemente los reportes financieros y de nómina a ambos números.
    * En [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts), se incorporó `584140108030` a la lista `BOSS_NUMBERS` (números con privilegios de administración).

## Fixes y Mejoras de Integración WhatsApp y Agente IA (Sesión Actual)

* **Resolución de Error 401 `invalid_client` en Google OAuth:**
  * **Causa**: Discrepancia entre las credenciales de Google Cloud Console y las variables del entorno, junto con la imposibilidad de alternar de cuenta de Google desde la URL de autorización.
  * **Solución**: Se actualizaron `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en el archivo `.env`. En [server.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/server.ts), se configuró `prompt: 'select_account'` y `access_type: 'offline'` en el flujo de Google OAuth para forzar el selector de cuentas. Se conectó exitosamente la cuenta corporativa `inversionesmiranda1311@gmail.com` y los tokens quedaron guardados de forma segura en PostgreSQL.

* **Configuración de Proxy Inverso en Express (`trust proxy`):**
  * **Causa**: Al estar detrás del proxy inverso de producción (Traefik / Coolify / Easypanel), el middleware `express-rate-limit` arrojaba advertencias de validación (`ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false`).
  * **Solución**: Se configuró `app.set('trust proxy', 1)` en [server.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/server.ts) para permitir la lectura confiable y segura de IPs reales detrás de proxies.

* **Corrección de Webhook de Evolution API (`ECONNREFUSED`):**
  * **Causa**: La instancia de Evolution API estaba intentando enviar los webhooks hacia `http://127.0.0.1:3000/webhooks/whatsapp`, fallando por aislamiento de red de contenedores.
  * **Solución**: Se reconfiguró la URL del webhook de la instancia `CalMiranda` en Evolution API hacia el dominio público HTTPS: `https://app.calmiranda.com/webhooks/whatsapp`, habilitando la entrega inmediata de todos los eventos `messages.upsert`.

* **Fijado de Clasificación de Mensajes (`chat_type: 'boss'` vs `'client'`):**
  * **Causa**: Al agregarse un número a `BOSS_NUMBERS`, sus mensajes se almacenaban como `chat_type = 'boss'`. Como el panel de "Atención al Cliente" consulta estrictamente `WHERE chat_type = 'client'`, los mensajes de los administradores no se mostraban en la interfaz de soporte al cliente.
  * **Solución**: Se aclaró y delimitó el flujo: las interacciones de `boss` son para gestión ejecutiva interna por WhatsApp (consultas de nómina, finanzas, tareas administrativas), mientras que las de `client` alimentan el Hub de Atención.

* **Revisión de Silenciado por Etiquetas Comerciales:**
  * **Causa**: El contacto existía en la base de datos de clientes con la etiqueta `'Otros'`, lo que activaba el silenciador automático del bot (`ignoreStatuses: ['empleado', 'transportista', 'otros']`).
  * **Solución**: Se removió el registro de prueba de la tabla `clientes`, permitiendo el tratamiento limpio como administrador directivo.

* **Directivas Estrictas de Anti-Alucinación y Derivación Profesional (Diamantín):**
  * **Objetivo**: Evitar que el bot invente disponibilidad de inventario, sucursales no existentes, procesos de contratación o datos técnicos desconocidos.
  * **Solución en [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts)**:
    * **Prohibición Total de Inventar**: Si una consulta técnica o comercial no se encuentra en las herramientas oficiales (`consultar_productos_catalogo`, `consultar_inventario`), Diamantín no adivina ni asume.
    * **Respuesta Cortés y Derivación con Tacto**: Responde educadamente transfiriendo la conversación a un asesor humano y dispara la herramienta `activar_handoff`.
    * **Canalización Formal de Empleo**: Regla estricta para solicitudes laborales, remitiendo a los interesados exclusivamente al correo oficial `inversionesmiranda1311@gmail.com`.
    * **Fidelidad Territorial de Sedes**: Se blindó la información para que Diamantín solo hable de las dos sedes operativas oficiales: *Planta Principal Guatire* y *Sede Hoyo de la Puerta (Caracas)*.
    * **Notificación Previa de Handoff**: Cuando un usuario solicita atención humana, el bot le confirma cordialmente la transferencia antes de silenciarse.

* **Reconocimiento de Identidad para Administradores (Rol Boss):**
  * **Objetivo**: Garantizar que cuando un directivo o líder técnico le escriba al bot o le pregunte "¿Quién soy?", Diamantín lo identifique de inmediato por su nombre y cargo.
  * **Solución en [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts)**:
    * Reconocimiento específico para **Héctor Ollarves** (`584140108030`): Líder de Desarrollo de Software y Administrador Tecnológico.
    * Reconocimiento para **Julio Borges** (`584143078681`): Director General y Jefe de Inversiones Miranda.
    * Reconocimiento para la **Directora General** (`584145881113`).

* **Corrección de Reporte Financiero Diario Vacío (Cuentas en Tránsito):**
  * **Causa**: Al leer la hoja `CUENTAS CAL MIRANDA` en Google Sheets, `scheduler.ts` intentaba mapear las filas como clave-valor asumiendo que la fila 0 era la cabecera (`headers = rows[0]`). Al contener la fila 0 un título en la celda A1, `headers` quedaba con 1 solo elemento, descartando todas las columnas subsiguientes (montos en USD, fechas de vencimiento, tipos CXC/CXP) y enviando a DeepSeek únicamente los nombres de los clientes.
  * **Solución en [scheduler.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/scheduler.ts) y [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts)**:
    * Se amplió el rango de lectura a `'CUENTAS CAL MIRANDA'!A1:Z200` para capturar cualquier columna y fila adicional.
    * Se reemplazó el parseo frágil de cabeceras por una transformación tabular limpia delimitada por barras (`row.join(' | ')`) idéntica a la del reporte de nómina.
    * Ahora DeepSeek recibe la matriz íntegra con todas las columnas de nombres, montos y fechas sin riesgo de pérdida de datos.
    * **Verificación Exitosa en Producción**: Desplegado en Easypanel y verificado con entrega real a WhatsApp de balance financiero completo (CXC, CXP, Arena/Pego, prioridades de cobro con fechas exactas y pagos pendientes vencidos).
## Estabilización de Reportes Financieros, Nómina y Scraping BCV (Sesión de Hoy - 14 de Noviembre)

* **Auditoría y Optimización del Reporte Semanal de Nómina:**
  * **Diagnóstico**: La hoja de cálculo de nómina (`1M7IoLTEhKPW2HUbwqBKptMG7ZaSdZhWoCT-3Ni0tgHE`) organiza la información con la pestaña activa `'ACTUAL'`, donde la nómina de Caracas ocupa las columnas C, D y E, pero la nómina de Guatire tiene los nombres en la columna H (índice 7) y los montos en USD en la columna I (índice 8).
  * **Problema Encontrado**: El rango anterior estaba acotado a `A1:H100`, lo cual cortaba la columna I (dejando a los empleados de Guatire sin sus montos en dólares en el prompt de la IA). Adicionalmente, la hoja de cálculo traía las celdas de Bolívares vacías ("Bs.S -"), por lo que la IA no calculaba la moneda local.
  * **Solución**:
    * Se amplió el rango de consulta a `'ACTUAL'!A1:Z100` en [scheduler.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/scheduler.ts) y [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts).
    * Se integró la consulta activa de la tasa oficial del BCV (desde `app_settings` / scraping automático o Google Sheets) inyectándola con fecha valor en el prompt de nómina.
    * Se instruyó de forma obligatoria a DeepSeek para calcular el monto exacto en Bolívares (Bs. = USD * Tasa BCV) para cada empleado y en los totales generales.
    * **Corrección del Scraper BCV y Formato Conciso**:
      * El portal `bcv.org.ve` actualizó su marcado agregando la clase `class="strong-tb"` al tag `<strong>` (`<strong class="strong-tb">914,02180000</strong>`), lo que invalidaba el regex estricto anterior (`<strong>`). Se actualizó el regex a `/<div id="dolar"[\s\S]*?<strong\b[^>]*>\s*([\d.,]+)\s*<\/strong>/i` capturando con éxito la tasa de 914,02 Bs/USD.
      * Se blindó `getSetting()` en [db.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/db.ts) para parsear objetos stringificados sin perder propiedades.
      * Se eliminaron las tablas Markdown (`|---|---|`) que se desconfiguraban en WhatsApp móvil, adoptando una plantilla ultra-concisa de viñetas ejecutivas con subtotales y total general calculados con exactitud en USD y Bs.
      * **Verificación Exitosa en Producción**: Reporte de nómina entregado por WhatsApp con total precisión matemática (\$345,00 USD = Bs. 315.337,52 calculados con la tasa BCV oficial de 914,0218 Bs/USD) y formato optimizado para lectura ejecutiva.
* **1. Solución Integral al Reporte Financiero Diario Vacío (Cuentas en Tránsito):**
  * **Problema Original**: Diamantín enviaba al WhatsApp de directivos el mensaje: *"⚠️ Nota: Los datos recibidos solo contienen nombres de cuentas (sin montos ni fechas de vencimiento), por lo que no es posible extraer totales ni determinar urgencias reales"*.
  * **Causa Raíz Identificada**:
    * En [scheduler.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/scheduler.ts), la lectura de la hoja `CUENTAS CAL MIRANDA` (`1oXz8Irdev0T6WVRmbL4tRfeQtCCm66DaDzFhk0-vBXM`) asumía que la primera fila era la cabecera (`headers = rows[0]`).
    * Al contener la fila 1 títulos de sección combinados y celdas vacías al final, la API de Google Sheets omitía las celdas en blanco, dejando `headers` con longitud 1 (`headers.length === 1`).
    * El bucle `headers.forEach` iteraba únicamente sobre el índice 0, tomando el nombre de la cuenta y descartando por completo las columnas subsiguientes (montos en USD, fechas de vencimiento, tipo CXC/CXP).
    * Además, el rango estaba limitado arbitrariamente a `A1:H100`, omitiendo las columnas I, J, K, L y M donde se encuentran las cuentas de *Arena, Pego y Canto Rodado*.
  * **Solución Implementada**:
    * Se amplió el rango de consulta a `'CUENTAS CAL MIRANDA'!A1:Z200` en [scheduler.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/scheduler.ts) y en la herramienta interactiva `Cuentas` de [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts).
    * Se descartó el mapeo por cabeceras y se adoptó una matriz tabular limpia delimitada por barras (`row.join(' | ')`), garantizando que todas las columnas de nombres, montos y vencimientos lleguen íntegras a DeepSeek.
  * **Verificación en Producción**: Despacho verificado por WhatsApp entregando balance real (\$4.785,00 en CXC, \$2.431,61 en CXP y \$275,45 en Arena/Pego con prioridades de cobro detalladas por cliente y fecha).

* **2. Reparación del Scraper Oficial del Banco Central de Venezuela (`bcv.org.ve`):**
  * **Problema Original**: Los reportes y consultas calculaban `Bs. 0,00` con la advertencia: *"La tasa oficial BCV del día no se encuentra disponible (0 Bs/USD)"*.
  * **Causa Raíz Identificada**:
    * El portal del BCV actualizó su código fuente agregando una clase CSS al elemento HTML de la tasa del dólar: `<strong class="strong-tb">914,02180000</strong>`.
    * La expresión regular anterior (`<strong>\s*([\d.,]+)\s*<\/strong>`) exigía la etiqueta `<strong>` sin atributos, fallando la coincidencia (`null`) y arrojando excepción silenciosa en `runTasaScraper()`.
  * **Solución Implementada**:
    * Se actualizó la expresión regular en [scheduler.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/scheduler.ts#L52) a:  
      `/<div id="dolar"[\s\S]*?<strong\b[^>]*>\s*([\d.,]+)\s*<\/strong>/i`
    * Captura de forma dinámica cualquier variación de atributos en el tag, extrayendo con total exactitud la tasa oficial (ej. **914,0218 Bs/USD** con fecha valor correspondiente).

* **3. Auditoría de Datos y Ampliación de Rango en Nómina Semanal:**
  * **Problema Original**: La nómina de la sede Guatire no mostraba sus montos en dólares dentro del reporte.
  * **Causa Raíz Identificada**:
    * Al auditar la estructura de la hoja de cálculo (`1M7IoLTEhKPW2HUbwqBKptMG7ZaSdZhWoCT-3Ni0tgHE`, pestaña `ACTUAL`), se constató que la nómina de Caracas ocupa las columnas C y D, mientras que la nómina de Guatire tiene los nombres en la columna H (índice 7) y los montos en USD en la **columna I** (índice 8).
    * El código leía únicamente con el rango `A1:H100`, truncando en la columna H y dejando por fuera todos los montos de Guatire.
  * **Solución Implementada**:
    * Se amplió el rango de lectura a `'ACTUAL'!A1:Z100` tanto en el scheduler (`runNominaReport`) como en el agente (`consultar_nomina`), capturando en su totalidad Caracas (\$200,00), Guatire (\$120,00), Bonos (\$25,00) y Totales (\$345,00).

* **4. Cálculo Matemático Obligatorio en Bolívares (Bs.):**
  * **Problema Original**: En la hoja de Google Sheets, las celdas de Bolívares se encontraban vacías o con guiones (`"Bs.S -"`), por lo que la IA omitía o colocaba en cero los montos en moneda nacional.
  * **Solución Implementada**:
    * En [scheduler.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/scheduler.ts), se programó la obtención previa de la tasa oficial del BCV (consultando la base de datos, ejecutando el scraper en caliente o recurriendo a la hoja de tasas como respaldo).
    * Se inyecta la tasa oficial del día directamente en el prompt del sistema y se le instruye a DeepSeek de manera estricta y matemática a calcular el equivalente en Bolívares para cada empleado y en los totales generales:  
      $$\text{Monto en Bs.} = \text{Monto en USD} \times \text{Tasa BCV}$$
    * En [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts), se configuró el prompt del rol Boss para que al consultar nómina o finanzas por WhatsApp, use automáticamente la herramienta `tasa_bcv` y presente el desglose bimonetario.

* **5. Rediseño Mobile-First para WhatsApp (Plantillas Ejecutivas Concisas):**
  * **Problema Original**: La IA generaba tablas Markdown con múltiples columnas (`|---|---|---|`), cabeceras complejas y párrafos explicativos extensos que en pantallas de teléfonos inteligentes se leían desbordados e incómodos.
  * **Solución Implementada**:
    * Se prohibieron expresamente las tablas Markdown para WhatsApp.
    * Se implementó una plantilla de viñetas estructuradas, limpia, ultra-concisa y directa al grano:
      * Nómina por sede con montos en USD y cálculo exacto en Bs.
      * Subtotales por sede (Caracas, Guatire y Bonos) en ambas monedas.
      * Total General a Pagar consolidado en USD y Bs. indicando la tasa BCV aplicada y su fecha valor.

* **6. Robustecimiento de Configuración en Base de Datos (`db.ts`):**
  * Se adaptó `getSetting()` en [db.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/db.ts) para parsear transparentemente objetos JSON aun si provienen serializados como cadenas de texto desde PostgreSQL, evitando que valores numéricos como `bcvRate.tasa` se evalúen como `undefined`.

* **7. Endpoints de Diagnóstico y Disparo Manual (Seguridad JWT):**
  * Se implementaron en [server.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/server.ts) los siguientes endpoints protegidos con token Bearer JWT:
    * `POST /api/test/reporte`: Dispara la generación y envío inmediato del reporte financiero por WhatsApp.
    * `POST /api/test/nomina`: Dispara la generación y envío inmediato del reporte de nómina por WhatsApp.
    * `POST /api/test/scrape-tasa`: Ejecuta el scraper del BCV y actualiza la tasa en base de datos y Google Sheets.
    * `GET /api/test/debug-cuentas`: Inspecciona las pestañas y filas del documento de cuentas en tránsito.
    * `GET /api/test/debug-nomina`: Inspecciona las pestañas y filas del documento de nómina.

* **8. Verificación Final en Producción (Easypanel & WhatsApp):**
  * Todo el código compilado con `pnpm run build:server` con **0 errores de TypeScript**.
  * Desplegado exitosamente en Easypanel tras push al repositorio `origin main`.
  * Verificación en vivo: Recepción exitosa en el WhatsApp del Administrador (**04140108030**) tanto del reporte financiero real como del reporte de nómina semanal conciso (\$345,00 USD = Bs. 315.337,52 calculados con la tasa BCV oficial de 914,0218 Bs/USD).

* **9. Solución al Envío de Mensajes a Destiempo / Madrugada (3:00 AM) por Sincronización:**
  * **Problema Reportado**: Clientes aseguraban haber recibido mensajes de Diamantín a las 3:00 AM de la madrugada sin haberle escrito previamente.
  * **Diagnóstico y Causas Raíz Identificadas**:
    1. **Replay de Mensajes Antiguos por Reconexión / Sincronización de Baileys / Evolution API**:
       Evolution API utiliza la librería `Baileys` para gestionar la conexión con WhatsApp Web. Durante mantenimientos nocturnos, reinicios automáticos de contenedores en VPS (comúnmente programados entre las 00:00 y las 04:00) o reconexiones de socket de red, WhatsApp Web emite eventos `messages.upsert` que retransmiten paquetes de sincronización de mensajes históricos o pendientes.
    2. **Falta de Validación de Antigüedad (`messageTimestamp`)**:
       En [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts), la función `handleWebhookMessage` extraía el remitente y el texto pero **no verificaba la marca de tiempo original (`messageTimestamp`)**. Al recibirse el evento de sincronización a las 3:00 AM, el bot asumía que cualquier mensaje viejo recibido en el webhook acababa de ser enviado en ese mismo instante.
    3. **De-duplicación Volátil en Memoria RAM (5 minutos TTL)**:
       El sistema utilizaba un `Set` en memoria RAM (`processedMessageIds`) con expiración de 5 minutos. Al reiniciarse el contenedor o transcurrir más de 5 minutos, la memoria se vaciaba. Cualquier mensaje antiguo retransmitido superaba la comprobación, detonaba el bucle de DeepSeek y enviaba una respuesta por WhatsApp al cliente a altas horas de la noche.
    4. **Falta de Persistencia de Identificadores Únicos en PostgreSQL**:
       La tabla `chat_messages` no almacenaba el identificador único del mensaje de WhatsApp (`whatsapp_message_id`), impidiendo verificar si el mensaje ya había sido registrado y respondido en el pasado.
  * **Solución Integral Implementada**:
    * **Filtro Anti-Destiempo por Timestamp**: En [agent.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/agent.ts), se implementó la extracción y normalización rigurosa de `messageTimestamp`. Se calcula la antigüedad del mensaje contra el reloj del servidor (`now - timestamp`). Si un mensaje supera los **120 segundos (2 minutos)** de antigüedad, se descarta de forma inmediata (`⏭️ [ANTI-DESTIEMPO] Ignorando mensaje antiguo/sync replay`), impidiendo cualquier respuesta a mensajes retransmitidos por sincronización.
    * **Persistencia de `whatsapp_message_id` en Base de Datos**:
      * En [schema.sql](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/schema.sql) y [db.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/db.ts), se agregó soporte para la columna `whatsapp_message_id` con su respectivo índice en `chat_messages`.
      * Se implementó una verificación automática e idempotente en [db.ts](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/server/db.ts) (`isMessageAlreadyProcessed(messageId)`) que consulta la base de datos antes de procesar cualquier mensaje entrante, sobreviviendo con éxito a cualquier reinicio de contenedor o borrado de memoria RAM.
    * **Ampliación de TTL en Memoria**: Se aumentó el tiempo de retención del caché de de-duplicación a 15 minutos (900.000 ms).
  * **Verificación de Compilación**: Proyecto compilado con éxito (`pnpm run build:server` con 0 errores de TypeScript).

* **10. Transformación de Diamantín a Super Agente de Ventas y Sistema de Etiquetas:**
  * **Objetivo**: Convertir a Diamantín en un asesor comercial de alta conversión para CalMiranda, garantizando cero alucinaciones de precios y productos, consulta estricta a la base de datos PostgreSQL, reconocimiento inteligente de clientes frecuentes con vendedor asignado, y silencio operativo para empleados y transportistas.
  * **Implementación en Frontend (`CustomerServiceHub.tsx`)**:
    * Se integró la nueva etiqueta **`Cliente Frecuente`** en el selector desplegable de estatus del chat.
    * Estilizado distintivo en color ámbar/dorado (`text-amber-400 bg-amber-500/10 border-amber-500/20`) visible tanto en el selector superior como en las tarjetas de la lista de chats en tiempo real.
  * **Implementación en Backend (`agent.ts`)**:
    * **Clasificación por Etiqueta**:
      * `Empleado` / `Transportista` / `Otros`: Silencio absoluto. Registra el mensaje en `chat_messages` para auditoría y control de operaciones diarias sin disparar respuestas automáticas de IA.
      * `Cliente Frecuente`: Identificación VIP instantánea. Diamantín saluda cordialmente por su nombre al cliente recurrente, le informa que su asesor comercial asignado (extraído de `clientes.vendedor`) le atenderá directamente y activa el handoff humano (`bot_status = agent_active`), apartándose para que el vendedor gestione la venta personalizada.
      * `Sin Etiqueta` (Clientes Nuevos y Prospectos): Activa el flujo completo de **Super Agente de Ventas**.
    * **Directivas de Super Agente de Ventas ("Zero Hallucination")**:
      * Prohibición absoluta de inventar productos o precios: llamada obligatoria a `consultar_productos_catalogo`.
      * Cotización bimonetaria obligatoria: consulta en caliente a `tasa_bcv` y cálculo exacto en USD y Bolívares oficiales.
      * Validación de existencias con `consultar_inventario` antes de comprometer retiros o despachos en Guatire o Hoyo de la Puerta.
      * Transferencia inmediata (`activar_handoff`) en pedidos al mayor (>100 sacos), distribuidores, solicitudes de crédito o dudas químicas avanzadas.
  * **Verificación de Compilación**: Tanto el frontend (`pnpm run build:client` con Vite) como el backend (`pnpm run build:server` con TypeScript) compilaron con éxito total (0 errores).

* **11. Bloqueo de Talento Humano / CVs y Visualización de Chats de Jefes en la App:**
  * **Objetivo**: Evitar que Diamantín actúe como Recursos Humanos o solicite CVs, preservando al 100% los datos bancarios y de Pago Móvil, y permitir que las conversaciones de los administradores/jefes aparezcan en la App para poder asignarles etiquetas operativas directamente.
  * **Blindaje contra funciones de Talento Humano (`agent.ts`)**:
    * Se preservaron íntegros los datos bancarios oficiales (Pago Móvil Banesco, transferencias Banesco y Mercantil, y correo para pagos de compras).
    * Se estableció una regla estricta contra alucinaciones laborales: Diamantín tiene prohibido solicitar currículums, pedir archivos PDF, indicar vacantes o decir que canalizará solicitudes de empleo.
    * Si un usuario escribe preguntando por empleo o enviando su síntesis curricular, Diamantín responde con cortesía aclarando su rol estrictamente comercial y de ventas de cal, sin desviar a correos personales.
  * **Visualización y Etiquetado de Chats de Jefes en la App (`server.ts`)**:
    * En `GET /api/chats`, se actualizó la consulta para incluir sesiones tanto de clientes como de jefes (`WHERE chat_type IN ('client', 'boss')`), permitiendo que los chats de Héctor Ollarves, Julio Borges y la Dirección aparezcan en la bandeja de entrada.
    * En `GET /api/chats/:sessionId/messages`, se eliminó la restricción por tipo de chat para cargar el historial completo de mensajes.
    * Se agregaron resoluciones automáticas de nombres (`Héctor Ollarves (+584140108030)`, `Julio Borges (+584143078681)`).
    * Los administradores ahora pueden abrir estos chats en la interfaz web de Atención al Cliente y asignarles cualquiera de las etiquetas disponibles (`Empleado`, `Cliente Frecuente`, `Transportista`, `Otros` o `Sin Etiqueta`).
  * **Verificación de Compilación**: Servidor y cliente compilados con 0 errores de TypeScript y Vite.

* **12. Etiqueta `Admin` con Control de Acceso RBAC y Asistente Ejecutivo para Jefes:**
  * **Objetivo**: Incorporar la etiqueta oficial `Admin` para clasificar a los directivos y jefes en la plataforma, asegurando que solo usuarios con rol de administrador (`superadmin` o `admin`) puedan asignarla o modificarla, y configurando a Diamantín para que actúe de inmediato como asistente ejecutivo cuando un contacto tenga dicha etiqueta.
  * **Control de Acceso en Frontend (`CustomerServiceHub.tsx`)**:
    * Se agregó la opción `Admin` en el selector de etiquetas con estilizado de alta jerarquía en color rosa/magenta (`border-rose-500/40 text-rose-400 bg-rose-500/10 font-black`).
    * **Restricción RBAC de visualización y edición**:
      * La opción `Admin` solo se renderiza en el `<select>` si el usuario autenticado posee rol `superadmin` o `admin`.
      * Si un contacto ya posee la etiqueta `Admin`, el selector queda deshabilitado (`disabled`) para cualquier usuario sin rol de administrador, impidiendo alteraciones no autorizadas.
    * Se integró el envío seguro de cabeceras de autorización (`getAuthHeaders()`) al actualizar la etiqueta vía `/api/chats/:sessionId/client-status`.
  * **Validación de Seguridad Estricta en Backend (`server.ts`)**:
    * En el endpoint `POST /api/chats/:sessionId/client-status`:
      * Se extrae y valida el rol del usuario autenticado (`req.user.rol` o `req.user.role`).
      * Si un usuario sin rol `superadmin` ni `admin` intenta asignar la etiqueta `Admin`, la solicitud es rechazada inmediatamente con código `403 Forbidden` (`Permiso denegado: solo los usuarios administradores pueden asignar la etiqueta Admin.`).
      * Si un contacto ya tiene asignada la etiqueta `Admin` en base de datos y un usuario no administrador intenta modificarla, también se bloquea con `403 Forbidden`.
  * **Comportamiento Inteligente de Diamantín (`agent.ts`)**:
    * Cuando un mensaje proviene de un contacto cuya etiqueta es `Admin`, `Jefe` o `Administrador`, el sistema lo clasifica dinámicamente como `isBoss = true` y `chatType = 'boss'`.
    * Diamantín activa de inmediato su rol de **Asistente Ejecutivo**, atendiendo consultas financieras, reportes, tasa BCV y operaciones con máxima eficiencia y respeto hacia los directivos.
  * **Verificación de Compilación**:
    * Servidor compilado con éxito mediante `pnpm run build:server` (TypeScript 0 errores).
    * Frontend compilado con éxito mediante `pnpm run build:client` (Vite 0 errores).

* **13. Centro de Control y Monitorización IA (Submenú Agente estilo Practiiko):**
  * **Objetivo**: Recrear en CalMiranda el panel de supervisión y control del Agente IA implementado en Practiiko, adaptándolo con precisión a la identidad corporativa de CalMiranda y a las 3 secciones seleccionadas expresamente por la Dirección:
    1. `🧪 Simulador de Pruebas` (Interactive Chat Simulator)
    2. `📦 Inventario Leído (BD)` (Dynamic Database Catalog & BCV sync)
    3. `💬 Instrucciones Maestras` (Master Prompt, Rules & Guardrails)
  * **Estructura y Navegación (`Layout.tsx`, `App.tsx` y `SettingsView.tsx`)**:
    * **Submenú en la barra lateral**: En el Sidebar, bajo la sección de **Configuración**, se implementó un submenú dedicado con acceso directo a `⚡ Agente IA` (`/settings/agente`) y `General` (`/settings?tab=general`).
    * **Selector de pestañas superior en Configuración**: En [SettingsView.tsx](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/src/features/settings/SettingsView.tsx), se diseñó un encabezado tipo pestaña (`Agente (Centro de Control IA)` vs `General / Sistema`) con navegación fluida y persistencia de URL.
    * **Ruta dedicada**: En [App.tsx](file:///c:/Users/rhect/Documents/Proyectos/CalMiranda/CalMiranda_App/src/App.tsx), se habilitó la ruta protegida `/settings/agente` accesible para administradores.
  * **Componente Centro de Control (`AgentControlView.tsx`)**:
    * **Encabezado y Control Maestro**:
      * Badge superior: `⚡ CENTRO DE CONTROL Y MONITORIZACIÓN IA`.
      * Título `Agente` con botón switch interactivo: `SUPER AGENTE (ACTIVO)` / `SUPER AGENTE (OFF)` con sincronización reactiva inmediata contra `global_bot_disabled`.
      * Narrativa dinámica del estado del bot en tiempo real.
      * Barra de sincronización con marca de tiempo y botón `🔄 Refrescar Monitor`.
    * **4 Tarjetas de Métricas en Grid Responsivo**:
      1. **Actividad Mensual (24H)**: Muestra el total de mensajes procesados por la IA contra la cuota mensual, con barra de progreso bicolora y métrica de mensajes de las últimas 24 horas.
      2. **Base de Datos Sincronizada**: Total de productos activos en PostgreSQL, desglose de categorías y badge `🛡️ Escudo Anti-Alucinación Activo`.
      3. **Intenciones de Compra**: Contador de chats con handoff activo listos para cierre por asesores humanos, con enlace directo hacia el Hub de Atención al Cliente (`/customer-service`).
      4. **Actividad Super Agente**: Respuestas automáticas emitidas por Diamantín, clientes únicos atendidos y verificación de cero alucinaciones bloqueadas.
    * **Sub-Pestañas Operativas**:
      * **`🧪 Simulador de Pruebas`**:
        * Entorno de chat interactivo que se comunica directamente con el pipeline de Diamantín vía `/api/web-chatbot` en una sesión aislada (`simulador_admin`).
        * Burbujas conversacionales con avatares, timestamps y badges técnicos de latencia (`ms`), `🛡️ Escudo Verificado` y estado de handoff.
        * Botonera de escenarios rápidos de prueba:
          - 💰 Cotización y Horario
          - 🚫 Bloqueo de Talento Humano / CV
          - 📦 Pedido Mayorista (&gt;100 sacos con derivación)
          - 📍 Validación de Sede Guatire / Retiro
          - 💳 Datos Bancarios Oficiales y Pago Móvil
        * Botón de `Reiniciar Simulación` conectado al nuevo endpoint `/api/agent/simulator/clear`.
      * **`📦 Inventario Leído (BD)`**:
        * Encabezado con la **Tasa Oficial BCV** del día (Bs/USD).
        * Buscador reactivo y selector de categorías (Todas, Cal en Polvo, Cal en Pasta, Pinturas, Agregados).
        * Tarjetas de producto que muestran nombre, presentación, peso en kg, precio base en USD y **conversión matemática exacta en Bolívares oficiales** según la tasa del BCV.
        * Sede de retiro/despacho y badge `✅ En Catálogo IA`.
      * **`💬 Instrucciones Maestras`**:
        * Resumen visual de directivas inviolables: Zero-Hallucination, Bloqueo de Talento Humano / CVs, Derivación de Clientes Frecuentes y Silencio Operativo.
        * Editor de texto para **Instrucciones Extras y Novedades del Negocio** con botón de guardado y confirmación en tiempo real.
  * **Endpoints en Servidor (`server.ts`)**:
    * `GET /api/agent/stats`: Agrega métricas consolidadas de mensajes, productos, categorías, handoffs y clientes.
    * `POST /api/agent/simulator/clear`: Limpia de forma segura el historial de la sesión de simulación de pruebas sin alterar los datos reales de clientes.
  * **Verificación de Compilación**:
    * TypeScript Server: Compilación exitosa (`pnpm run build:server` con 0 errores).
    * Vite Frontend: Compilación exitosa (`pnpm run build:client` con 0 errores, 1760 módulos transformados).

---
*¡Vamos positivo! Todos los cambios están compilados, verificados y listos para producción.*




