import { OpenAI } from 'openai';
import axios from 'axios';
import { saveClientChatMessage, saveBossChatMessage, getSetting, saveSetting, query, searchClientes } from './db.js';
import { getSheetsClient, getGmailClient, getCalendarClient } from './googleAuth.js';
// Inicializar OpenAI configurado para DeepSeek
const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || 'no-key-provided',
    baseURL: 'https://api.deepseek.com',
});
// Cache en memoria con TTL para de-duplicación de mensajes
const processedMessageIds = new Set();
// Email de Google de la empresa
const GOOGLE_ACCOUNT_EMAIL = 'inversionesmiranda1311@gmail.com';
// Números de los jefes / administradores
const BOSS_NUMBERS = [
    '584143078681@s.whatsapp.net', // Julio (Jefe)
    '584145881113@s.whatsapp.net', // Jefa
    '584222476127@s.whatsapp.net', // Adriel's Systems
    '584143078681', // Alternativos sin sufijo
    '584145881113',
    '584222476127'
];
// Helper para enviar mensaje por Evolution API
export async function sendWhatsAppMessage(to, text) {
    const evoUrl = process.env.EVOLUTION_API_URL || 'https://evolution.calmiranda.com';
    const instance = process.env.EVOLUTION_INSTANCE_NAME || 'CalMiranda';
    const apiKey = process.env.EVOLUTION_API_KEY;
    if (!apiKey) {
        console.error('⚠️ EVOLUTION_API_KEY no está configurada en las variables de entorno.');
        return;
    }
    // Quitar @s.whatsapp.net si es necesario, o enviarlo como lo espera la API.
    // Evolution API acepta JIDs completos en el campo "number".
    const cleanNumber = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    try {
        await axios.post(`${evoUrl}/message/sendText/${instance}`, {
            number: cleanNumber,
            text: text,
            options: {
                delay: 1000,
                presence: 'composing'
            }
        }, {
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            }
        });
        console.log(`📤 Mensaje enviado a ${cleanNumber}`);
    }
    catch (error) {
        console.error(`❌ Error enviando WhatsApp por Evolution API:`, error.message || error);
    }
}
// ----------------------------------------------------
// DEFINICIÓN DE HERRAMIENTAS (TOOLS)
// ----------------------------------------------------
const agentTools = [
    {
        type: 'function',
        function: {
            name: 'SQL_specialist',
            description: 'Busca información detallada de un cliente en la base de datos local de clientes (por nombre, RIF, teléfono o contacto).',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Nombre o término de búsqueda del cliente' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'consultar_inventario',
            description: 'Consulta el stock disponible de productos y formatos en la hoja de Google Sheets de inventario.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'Cuentas',
            description: 'Consulta las cuentas por cobrar (CXC) y cuentas por pagar (CXP) de la empresa en Google Sheets.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'tasa_bcv',
            description: 'Consulta la tasa oficial de cambio de Dólar (USD) a Bolívares (Bs) del Banco Central de Venezuela.',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'Calendar_Disponibilidad',
            description: 'Verifica la agenda en Google Calendar para consultar la disponibilidad de citas en una fecha.',
            parameters: {
                type: 'object',
                properties: {
                    timeMin: { type: 'string', description: 'Fecha/Hora inicio en formato ISO (ej. 2026-05-22T08:00:00Z)' },
                    timeMax: { type: 'string', description: 'Fecha/Hora fin en formato ISO' }
                },
                required: ['timeMin', 'timeMax']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'Calendar_Agendar',
            description: 'Agenda un evento, reunión o cita en Google Calendar.',
            parameters: {
                type: 'object',
                properties: {
                    summary: { type: 'string', description: 'Título de la reunión' },
                    description: { type: 'string', description: 'Detalle o descripción de la cita' },
                    start: { type: 'string', description: 'Fecha/Hora inicio en formato ISO' },
                    end: { type: 'string', description: 'Fecha/Hora fin en formato ISO' }
                },
                required: ['summary', 'start', 'end']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'Calendar_Eliminar',
            description: 'Cancela o elimina un evento de Google Calendar mediante su ID.',
            parameters: {
                type: 'object',
                properties: {
                    eventId: { type: 'string', description: 'ID único del evento de Google Calendar' }
                },
                required: ['eventId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'Gmail_Buscar',
            description: 'Busca correos electrónicos en Gmail usando términos de búsqueda.',
            parameters: {
                type: 'object',
                properties: {
                    q: { type: 'string', description: 'Consulta de búsqueda (ej. from:cliente@mail.com o subject:pedido)' }
                },
                required: ['q']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'Gmail_Redactar',
            description: 'Redacta un BORRADOR de correo en Gmail (no lo envía, queda guardado en borradores).',
            parameters: {
                type: 'object',
                properties: {
                    to: { type: 'string', description: 'Correo del destinatario' },
                    subject: { type: 'string', description: 'Asunto del correo' },
                    body: { type: 'string', description: 'Contenido del correo (puede ser texto o HTML)' }
                },
                required: ['to', 'subject', 'body']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'Gmail_Enviar',
            description: 'Envía un correo electrónico de forma directa. Úsalo SOLO si el Jefe te lo autoriza explícitamente.',
            parameters: {
                type: 'object',
                properties: {
                    to: { type: 'string', description: 'Correo del destinatario' },
                    subject: { type: 'string', description: 'Asunto del correo' },
                    body: { type: 'string', description: 'Contenido del correo' }
                },
                required: ['to', 'subject', 'body']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'activar_handoff',
            description: 'Transfiere la conversación a un agente humano, silenciando al bot de IA para este número de teléfono.',
            parameters: { type: 'object', properties: {} }
        }
    }
];
// ----------------------------------------------------
// EJECUCIÓN DE HERRAMIENTAS
// ----------------------------------------------------
async function executeTool(name, args, sessionId) {
    try {
        switch (name) {
            case 'SQL_specialist': {
                const results = await searchClientes(args.query);
                return JSON.stringify(results);
            }
            case 'consultar_inventario': {
                // ID: 1GDkxPEvCyKhA2fYR1Ub9Sv-GAAx0_5DkBYGfJqCOydg | Hoja: Productos_Cal Miranda
                const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
                const res = await sheets.spreadsheets.values.get({
                    spreadsheetId: '1GDkxPEvCyKhA2fYR1Ub9Sv-GAAx0_5DkBYGfJqCOydg',
                    range: '\'Productos_Cal Miranda\'!A1:F50'
                });
                return JSON.stringify(res.data.values || []);
            }
            case 'Cuentas': {
                // ID: 1oXz8Irdev0T6WVRmbL4tRfeQtCCm66DaDzFhk0-vBXM | Hoja: CUENTAS CAL MIRANDA
                const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
                const res = await sheets.spreadsheets.values.get({
                    spreadsheetId: '1oXz8Irdev0T6WVRmbL4tRfeQtCCm66DaDzFhk0-vBXM',
                    range: '\'CUENTAS CAL MIRANDA\'!A1:H100'
                });
                return JSON.stringify(res.data.values || []);
            }
            case 'tasa_bcv': {
                const cachedRate = await getSetting('bcv_rate', null);
                if (cachedRate) {
                    return JSON.stringify(cachedRate);
                }
                // Fallback leyendo de la hoja Tasa en spreadsheet
                // ID: 1_O58lqnRD0lk5vNJp3NLFOkv_jwmtbo-aQgGMy3rHkI | Hoja: Tasa
                try {
                    const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
                    const res = await sheets.spreadsheets.values.get({
                        spreadsheetId: '1_O58lqnRD0lk5vNJp3NLFOkv_jwmtbo-aQgGMy3rHkI',
                        range: '\'Tasa\'!A1:B100'
                    });
                    const rows = res.data.values || [];
                    const lastRow = rows[rows.length - 1];
                    return JSON.stringify({ fecha: lastRow?.[0], tasa: lastRow?.[1] });
                }
                catch (e) {
                    return JSON.stringify({ error: 'No se pudo obtener la tasa en este momento.' });
                }
            }
            case 'Calendar_Disponibilidad': {
                const calendar = await getCalendarClient(GOOGLE_ACCOUNT_EMAIL);
                const res = await calendar.events.list({
                    calendarId: GOOGLE_ACCOUNT_EMAIL,
                    timeMin: args.timeMin,
                    timeMax: args.timeMax,
                    singleEvents: true
                });
                const events = res.data.items || [];
                if (events.length === 0)
                    return 'Disponible';
                return JSON.stringify(events.map(e => ({ summary: e.summary, start: e.start, end: e.end })));
            }
            case 'Calendar_Agendar': {
                const calendar = await getCalendarClient(GOOGLE_ACCOUNT_EMAIL);
                const res = await calendar.events.insert({
                    calendarId: GOOGLE_ACCOUNT_EMAIL,
                    requestBody: {
                        summary: args.summary,
                        description: args.description || '',
                        start: { dateTime: args.start },
                        end: { dateTime: args.end }
                    }
                });
                return `Evento agendado exitosamente. ID: ${res.data.id}`;
            }
            case 'Calendar_Eliminar': {
                const calendar = await getCalendarClient(GOOGLE_ACCOUNT_EMAIL);
                await calendar.events.delete({
                    calendarId: GOOGLE_ACCOUNT_EMAIL,
                    eventId: args.eventId
                });
                return 'Evento eliminado exitosamente.';
            }
            case 'Gmail_Buscar': {
                const gmail = await getGmailClient(GOOGLE_ACCOUNT_EMAIL);
                const res = await gmail.users.messages.list({
                    userId: 'me',
                    q: args.q,
                    maxResults: 5
                });
                const messages = res.data.messages || [];
                const details = [];
                for (const msg of messages) {
                    const content = await gmail.users.messages.get({ userId: 'me', id: msg.id });
                    const snippet = content.data.snippet;
                    const headers = content.data.payload?.headers || [];
                    const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value;
                    const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value;
                    details.push({ id: msg.id, from, subject, snippet });
                }
                return JSON.stringify(details);
            }
            case 'Gmail_Redactar': {
                const gmail = await getGmailClient(GOOGLE_ACCOUNT_EMAIL);
                // Construir email raw formateado en base64
                const utf8Subject = `=?utf-8?B?${Buffer.from(args.subject).toString('base64')}?=`;
                const emailContent = [
                    `To: ${args.to}`,
                    `Subject: ${utf8Subject}`,
                    'Content-Type: text/html; charset=utf-8',
                    'MIME-Version: 1.0',
                    '',
                    args.body
                ].join('\n');
                const base64Safe = Buffer.from(emailContent)
                    .toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');
                await gmail.users.drafts.create({
                    userId: 'me',
                    requestBody: {
                        message: { raw: base64Safe }
                    }
                });
                return 'Borrador creado exitosamente en la cuenta de Gmail.';
            }
            case 'Gmail_Enviar': {
                const gmail = await getGmailClient(GOOGLE_ACCOUNT_EMAIL);
                const utf8Subject = `=?utf-8?B?${Buffer.from(args.subject).toString('base64')}?=`;
                const emailContent = [
                    `To: ${args.to}`,
                    `Subject: ${utf8Subject}`,
                    'Content-Type: text/html; charset=utf-8',
                    'MIME-Version: 1.0',
                    '',
                    args.body
                ].join('\n');
                const base64Safe = Buffer.from(emailContent)
                    .toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');
                await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: { raw: base64Safe }
                });
                return 'Correo enviado de manera directa.';
            }
            case 'activar_handoff': {
                await saveSetting(`bot_status_${sessionId}`, 'agent_active');
                // Intentar enviar notificación al grupo de asesores humanos
                try {
                    const groupJid = await getSetting('advisors_group_jid', null);
                    if (groupJid) {
                        // Obtener el nombre del cliente desde la base de datos para dar más contexto
                        let clientName = 'Cliente';
                        try {
                            const clientQuery = `
                SELECT nombre FROM clientes 
                WHERE telefono_1 LIKE $1 OR movil LIKE $1 OR telefono_2 LIKE $1 OR telefono_3 LIKE $1 
                LIMIT 1;
              `;
                            const dbClient = await query(clientQuery, [`%${sessionId}%`]);
                            if (dbClient.length > 0) {
                                clientName = dbClient[0].nombre;
                            }
                        }
                        catch (dbErr) {
                            console.error('⚠️ Error al buscar nombre del cliente para notificación:', dbErr);
                        }
                        const alertMessage = `⚠️ *Atención Humana Requerida*\n\nEl cliente *${clientName}* (+${sessionId}) ha solicitado hablar con un asesor humano. El bot de IA se ha desactivado para esta conversación.\n\nPor favor, atiendan al cliente en el Panel de Control.`;
                        await sendWhatsAppMessage(groupJid, alertMessage);
                        console.log(`📢 Notificación de handoff enviada al grupo ${groupJid} para el cliente ${sessionId}`);
                    }
                    else {
                        console.log('⚠️ No se envió notificación al grupo de asesores porque "advisors_group_jid" no está configurado en app_settings.');
                    }
                }
                catch (notifErr) {
                    console.error('❌ Error al procesar notificación de handoff:', notifErr.message || notifErr);
                }
                return 'Modo handoff (humano) activado. El bot se ha silenciado para este número.';
            }
            default:
                return `Herramienta ${name} no soportada.`;
        }
    }
    catch (error) {
        console.error(`❌ Error en herramienta ${name}:`, error.message || error);
        return `Error ejecutando herramienta: ${error.message || error}. Se enviara reporte a Adriel's Systems.`;
    }
}
// ----------------------------------------------------
// MANEJADOR PRINCIPAL DE WEBHOOKS
// ----------------------------------------------------
export async function handleWebhookMessage(payload) {
    // 1. Extraer los datos del webhook de manera flexible
    let messageId = '';
    let senderJid = '';
    let pushName = 'Cliente';
    let messageText = '';
    // Formato estándar de Evolution API
    if (payload.event === 'messages.upsert' && payload.data) {
        const data = payload.data;
        messageId = data.key?.id || '';
        // Preferir remoteJidAlt (JID de número de teléfono) si remoteJid es un ID interno @lid
        senderJid = data.key?.remoteJidAlt || data.key?.remoteJid || '';
        pushName = payload.pushName || data.pushName || 'Cliente';
        if (data.message) {
            messageText = data.message.conversation ||
                data.message.extendedTextMessage?.text ||
                data.message.imageMessage?.caption ||
                '';
        }
    }
    // Formato n8n / simplificado
    else if (payload.conversation?.messages?.[0]) {
        const msg = payload.conversation.messages[0];
        messageId = msg.id || '';
        // Preferir número de teléfono si está disponible en Chatwoot
        senderJid = msg.sender?.phone_number || msg.sender?.identifier || '';
        pushName = msg.sender?.name || 'Cliente';
        messageText = msg.text || '';
    }
    // Si no hay datos mínimos, ignorar
    if (!senderJid || !messageText) {
        return;
    }
    // Obtener el número limpio (solo dígitos)
    const cleanNumber = senderJid.split('@')[0].replace(/\D/g, '');
    if (cleanNumber.length > 15) {
        console.log(`⏭️ Ignorando mensaje de grupo/lista: ${cleanNumber}`);
        return;
    }
    // Clasificar emisor (Jefe o Cliente)
    const isBoss = BOSS_NUMBERS.includes(senderJid) || BOSS_NUMBERS.includes(cleanNumber);
    const chatType = isBoss ? 'boss' : 'client';
    // Si el mensaje es saliente (enviado desde el mismo número del bot)
    const isOutgoing = payload.data?.key?.fromMe === true || payload.conversation?.messages?.[0]?.fromMe === true;
    if (isOutgoing) {
        try {
            // Verificar si ya fue guardado en los últimos 15 segundos
            const recentMatches = await query(`SELECT id FROM chat_messages 
         WHERE session_id = $1 AND message_text = $2 AND chat_type = $3 AND created_at > NOW() - INTERVAL '15 seconds' 
         LIMIT 1`, [cleanNumber, messageText.trim(), chatType]);
            if (recentMatches.length === 0) {
                // Registrar el mensaje saliente del teléfono (enviado directamente en WhatsApp)
                if (isBoss) {
                    await saveBossChatMessage(cleanNumber, 'agent', messageText);
                }
                else {
                    await saveClientChatMessage(cleanNumber, 'agent', messageText, pushName);
                }
                console.log(`📤 Mensaje saliente registrado en BD para ${cleanNumber} (${chatType})`);
            }
            else {
                console.log(`⏭️ Mensaje saliente ya existente en BD (duplicado omitido) para ${cleanNumber}`);
            }
        }
        catch (err) {
            console.error('⚠️ Error al registrar mensaje saliente en base de datos:', err);
        }
        return; // El bot no debe responder a sus propios mensajes salientes
    }
    // 2. De-duplicación (solo para mensajes entrantes)
    if (messageId) {
        if (processedMessageIds.has(messageId)) {
            console.log(`⏭️ Ignorando mensaje duplicado: ${messageId}`);
            return;
        }
        processedMessageIds.add(messageId);
        // Eliminar del caché después de 5 minutos
        setTimeout(() => processedMessageIds.delete(messageId), 300000);
    }
    // 3. Verificar Handoff (Si el bot está silenciado para este número)
    const botStatus = await getSetting(`bot_status_${cleanNumber}`, 'bot_active');
    if (botStatus === 'agent_active') {
        console.log(`🤫 Bot silenciado para ${cleanNumber} (Handoff activo).`);
        return;
    }
    // Buscar si el cliente existe en la base de datos de CalMiranda
    let clientExists = false;
    let clientName = pushName || 'Cliente';
    let clientEstatus = 'Activo';
    try {
        const phonePattern = cleanNumber.length >= 10 ? `%${cleanNumber.slice(-10)}` : `%${cleanNumber}`;
        const clientQuery = `
      SELECT nombre, estatus FROM clientes 
      WHERE regexp_replace(COALESCE(telefono_1, ''), '\\D', '', 'g') LIKE $1 
         OR regexp_replace(COALESCE(movil, ''), '\\D', '', 'g') LIKE $1 
         OR regexp_replace(COALESCE(telefono_2, ''), '\\D', '', 'g') LIKE $1 
         OR regexp_replace(COALESCE(telefono_3, ''), '\\D', '', 'g') LIKE $1 
      LIMIT 1;
    `;
        const dbClient = await query(clientQuery, [phonePattern]);
        if (dbClient.length > 0) {
            clientExists = true;
            clientName = dbClient[0].nombre;
            clientEstatus = dbClient[0].estatus || 'Activo';
        }
    }
    catch (err) {
        console.error('⚠️ Error al buscar cliente en base de datos:', err);
    }
    console.log(`🤖 Procesando mensaje de ${clientName} (WhatsApp PushName: ${pushName}) (${cleanNumber}) - Rol: ${isBoss ? 'Jefe' : 'Cliente'} - Estatus: ${clientEstatus}`);
    // 5. Cargar historial de chat de la base de datos
    let history = [];
    try {
        const chatType = isBoss ? 'boss' : 'client';
        const sql = `
      SELECT sender, message_text as text, created_at as timestamp 
      FROM chat_messages 
      WHERE session_id = $1 AND chat_type = $2 
      ORDER BY id DESC 
      LIMIT 10
    `;
        const rows = await query(sql, [cleanNumber, chatType]);
        history = rows.reverse();
    }
    catch (error) {
        console.error('⚠️ Error cargando historial de chat de Postgres:', error);
    }
    // Guardar mensaje del usuario en la base de datos
    if (isBoss) {
        await saveBossChatMessage(cleanNumber, 'user', messageText);
    }
    else {
        await saveClientChatMessage(cleanNumber, 'user', messageText, pushName);
    }
    // Si el contacto es un empleado, transportista o se configuró para ignorar el bot, se omite respuesta de IA
    const ignoreStatuses = ['Empleado', 'Transportista', 'Ignorar Bot'];
    if (ignoreStatuses.includes(clientEstatus)) {
        console.log(`🔕 Contacto etiquetado como "${clientEstatus}" (${clientName} - ${cleanNumber}). Mensaje guardado en BD, pero se omite respuesta del bot.`);
        return;
    }
    // Verificar si el bot está deshabilitado globalmente
    const globalBotDisabled = await getSetting('global_bot_disabled', false);
    if (globalBotDisabled === true || String(globalBotDisabled) === 'true') {
        console.log(`📴 El bot está deshabilitado globalmente. Mensaje de ${cleanNumber} guardado en BD, pero se omite la respuesta automática.`);
        return;
    }
    // 6. Obtener Prompts personalizados (de app_settings o por defecto)
    const defaultBotPrompt = `PROMPT DE IDENTIDAD Y PROPÓSITO

Eres DIAMANTÍN, el Experto en Atención al Cliente de CalMiranda.

Personalidad: Humano, Empático, Cortés, Respetuoso, Inspirador y Positivo.
Lema: Tu grito de guerra es ¡Vamos positivo! Úsalo moderadamente para motivar y cerrar conversaciones.
Comunicación: Clara, Directa, Pausada y Paciente, con un estilo conversacional natural.

REGLA DE IDIOMA (CRÍTICO): TODAS tus interacciones, respuestas y frases inspiradoras DEBEN ser estrictamente en ESPAÑOL. Nunca respondas en inglés.

CRÍTICO: Tus respuestas deben ser cortas y al punto. ESTÁ PROHIBIDO exceder las 4 líneas de texto por mensaje. Si hay mucha información, usa puntos (bullets) o prioriza lo más importante.

COMPORTAMIENTO SEGÚN IDENTIFICACIÓN:

    CLIENTE EXISTENTE (cliente = true)
Saludo personalizado, reconocimiento explícito, acceso rápido, trato preferencial.

    CLIENTE NUEVO (cliente = false) 
Saludo cálido, presentación completa, guía paso a paso, construcción de confianza.

CONOCIMIENTO CENTRAL DE CALMIRANDA

INFORMACIÓN GENERAL:

    Somos: Fábrica de Cal - Especialistas en la producción de cal de alta calidad, cal en pasta y pintura Ecológica.

    Modelo de Negocio: Venta al mayor a distribuidores y aliados, con atención al detal estratégica basada en la ubicación.

    Horarios: Lunes a Viernes 8:00 AM - 5:00 PM | Sábados 8:00 AM - 12:00 PM.

    Empresa: INVERSIONES MIRANDA 1311 C.A. | RIF: J-41131658-0.

    Teléfonos: 0424-257-4698 // 0412-388-3692.

UBICACIONES OPERATIVAS:

    Planta Principal (Guatire): Calle Los Ríos, entre Calle La Mura y La Arenera, Galpón 2-3, Zona Industrial El Marqués, Guatire - Edo. Miranda.

    Planta/Distribuidora (Hoyo de la Puerta): Av. Principal Edif. Abuela Flora, Piso 1, Sector Hoyo de la Puerta, Caracas (Código Postal 1080).

INFORMACIÓN EN TIEMPO REAL:

    Hora Actual Venezuela: {{ $now.setZone('America/Caracas').toFormat('hh:mm a') }}

    Fecha de Hoy: {{ $now.setZone('America/Caracas').toFormat('dd/MM/yyyy') }}

POLÍTICA DE VENTAS - IMPORTANTE

VOLÚMENES DE VENTA:

    Mayor: Principalmente a distribuidores.

    Detal: Aceptamos pedidos pequeños (1-5 unidades) dependiendo de la ubicación.

ALGORITMO DE RECOMENDACIÓN SEGÚN CANTIDAD Y UBICACIÓN:
SI EL CLIENTE SOLICITA 1-5 UNIDADES:

    SI está en Guatire/Zona Este: Ofrecer retiro en Planta Guatire.

    SI está en Caracas Sur/Zona Altos Mirandinos: Ofrecer retiro en Sede Hoyo de la Puerta.

    SI está en una zona lejana a ambas: Recomendar Aliados Comerciales/Distribuidores.

Mensaje Base (Solo si está lejos de ambos): "Le recomiendo adquirir nuestro producto con alguno de nuestros distribuidores más cercanos a su ubicación, ya que ellos manejan volúmenes menores con entrega inmediata."
DATOS BANCARIOS OFICIALES

PAGO MÓVIL:

    Banco: Banesco (0134) | Teléfono: 0414.307.86.81 | C.I.: 16.411.324

TRANSFERENCIAS BANCARIAS:

    Banco Mercantil: 01050024901024308758 | Julio Cesar Borges Cordova | C.I. 16.411.324

    Banesco: 01340874238743018365 | Julio César Borges | C.I. 16.411.324

    Correo: juliocesarborgescordova@gmail.com

HERRAMIENTAS DISPONIBLES

    THINK → Analizar mejor tu respuesta (ESENCIAL).

    INFORMACION → Consultar productos, precios, detalles técnicos.

    TASA → Calcular conversión de USD a Bolívares (OBLIGATORIO).

    BENEFICIOS → Mostrar ventajas de CalMiranda (SOLO UNA VEZ).

    ADMIN → Activar modo agente humano.

    DATA & TIME → Para lógica de saludos.

FLUJO DE CONVERSACIÓN INTELIGENTE

SALUDO PERSONALIZADO INTELIGENTE:

    Horarios: 05-11 "Buenos días" | 12-17 "Buenas tardes" | 18-04 "Buenas noches".

    Cliente Existente: "¡[Saludo], {{ $json.name }}! Qué gusto saludarle nuevamente. En CalMiranda seguimos comprometidos con la calidad. ¿En qué puedo asistirle hoy?"

    Cliente Nuevo: "¡[Saludo]! Bienvenido a CalMiranda, especialistas en cal. Soy Diamantín. ¿En qué podemos ayudarle hoy?"

PROCESO DE ATENCIÓN PARA PEDIDOS:

    PASO 1 - IDENTIFICACIÓN DE NECESIDAD: "Perfecto. ¿Qué tipo de cal necesita y en qué cantidad?"

    PASO 2 - EVALUACIÓN DE CANTIDAD Y UBICACIÓN (CRÍTICO):
    SI EL CLIENTE PIDE 1-5 UNIDADES:

        OBLIGATORIO - PREGUNTAR UBICACIÓN: "Para indicarle la opción más conveniente para retirar pocas unidades, ¿en qué sector o ciudad se encuentra?"

        APLICAR LÓGICA DE PROXIMIDAD:

            CASO A (Cerca de Guatire): "Al estar en [Zona], le queda perfecta nuestra Planta Principal en Guatire. Podemos atender su pedido de [Cantidad] unidades allí directamente. ¿Desea coordinar el retiro?"

            CASO B (Cerca de Hoyo de la Puerta / Caracas Sur): "Veo que está en [Zona]. Para su comodidad, puede retirar esas [Cantidad] unidades en nuestra Sede de Hoyo de la Puerta. ¿Le reservamos el material allí?"

            CASO C (Lejos de ambas): "Para esa cantidad y ubicación, le recomiendo nuestros distribuidores autorizados en su zona. Ellos tienen stock inmediato. ¿Desea que le envíe el contacto más cercano?"

LÍMITES DE CONVERSACIÓN (GUARDRAILS)

    PROTECCIÓN DE INFORMACIÓN INTERNA: Está PROHIBIDO revelar nombres de dueños, directivos o estrategias internas. Si preguntan, responde: "Soy Diamantín, experto en atención al cliente. Para temas administrativos, puedes dejar tu solicitud y nuestro equipo la revisará."

    FOCO ESTRICTO EN CALMIRANDA: No respondas sobre política, deportes o temas ajenos. Redirige: "Mi especialidad es ayudarte con los productos CalMiranda. ¿Te gustaría conocer los beneficios de nuestra pintura ecológica? ¡Vamos positivo!"

RESTRICCIONES ABSOLUTAS ACTUALIZADAS

✅ OBLIGATORIO: Preguntar ubicación para decidir entre Guatire u Hoyo de la Puerta.

❌ PROHIBIDO:

INVENTAR TÉCNICA (BLOQUEO TOTAL): Tienes PROHIBIDO dar fórmulas, procedimientos de mezcla (ej. dilución 1:1), datos de pH, densidad o pureza por tu cuenta.

DERIVACIÓN OBLIGATORIA (ADMIN): Si el cliente pide "Fichas Técnicas", "Instrucciones de uso industrial" o "Procedimientos para lechada", o cualquier consulta que no tengas conocimiento explicito en las instrucciones, debes usar la herramienta admin inmediatamente.

    Respuesta obligatoria: "Para garantizar la precisión técnica que su proyecto industrial requiere, voy a transferir su consulta a nuestro departamento de ingeniería. Un especialista le contactará en breve. ¡Vamos positivo!"

    NO ofrecer la presentación de Cal en Pasta de 5Kg bajo ninguna circunstancia.

    NO enviar a un cliente de Hoyo de la Puerta a Guatire (o viceversa) si solo quiere 2 sacos.

    NO negar la venta de 1-5 unidades sin verificar primero si pueden ir a alguna de las dos sedes o a los socios de negocios.

ESCENARIO CRÍTICO: CAL EN PASTA 5KG
Solo estar disponible para pedidos por encima de las 500 unidades`;
    const defaultBossPrompt = `Eres DIAMANTÍN, el Asistente Ejecutivo del Jefe de Inversiones Miranda. Resuelves requerimientos de forma directa, eficiente y breve usando herramientas. Tu grito es "Vamos positivo".`;
    const extraRulesBot = await getSetting('extra_rules_bot', '');
    const extraRulesAssistant = await getSetting('extra_rules_assistant', '');
    // Ya se buscó y definió clientExists y clientName al inicio del manejador de webhook
    let systemMessage = isBoss ? defaultBossPrompt : defaultBotPrompt;
    if (isBoss) {
        if (extraRulesAssistant && extraRulesAssistant.trim() !== '') {
            systemMessage += `\n\nREGLAS EXTRAS Y NOTAS EN TIEMPO REAL DEL NEGOCIO:\n${extraRulesAssistant}`;
        }
    }
    else {
        if (extraRulesBot && extraRulesBot.trim() !== '') {
            systemMessage += `\n\nREGLAS EXTRAS Y NOTAS EN TIEMPO REAL DEL NEGOCIO:\n${extraRulesBot}`;
        }
    }
    // Si es un cliente, procesar placeholders dinámicos
    if (!isBoss) {
        const nowVE = new Date();
        const timeVEStr = nowVE.toLocaleTimeString('en-US', {
            timeZone: 'America/Caracas',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const dateVEStr = nowVE.toLocaleDateString('es-VE', {
            timeZone: 'America/Caracas',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        let saludo = 'Hola';
        try {
            const hourVE = parseInt(nowVE.toLocaleTimeString('en-US', { timeZone: 'America/Caracas', hour12: false, hour: 'numeric' }));
            if (hourVE >= 5 && hourVE <= 11) {
                saludo = 'Buenos días';
            }
            else if (hourVE >= 12 && hourVE <= 17) {
                saludo = 'Buenas tardes';
            }
            else {
                saludo = 'Buenas noches';
            }
        }
        catch (e) {
            // Fallback
        }
        // Reemplazar placeholders en el prompt del cliente
        systemMessage = systemMessage
            .replace(/\{\{\s*\$json\.name\s*\}\}/g, clientName)
            .replace(/\{\{\s*\$now\.setZone\('America\/Caracas'\)\.toFormat\('hh:mm a'\)\s*\}\}/g, timeVEStr)
            .replace(/\{\{\s*\$now\.setZone\('America\/Caracas'\)\.toFormat\('dd\/MM\/yyyy'\)\s*\}\}/g, dateVEStr)
            .replace(/\[Saludo\]/g, saludo)
            .replace('cliente = true', `cliente = ${clientExists}`)
            .replace('cliente = false', `cliente = ${!clientExists}`);
    }
    // 7. Construir los mensajes para el LLM
    const messages = [
        { role: 'system', content: systemMessage }
    ];
    // Incorporar el historial con validación robusta
    for (const msg of history) {
        if (!msg)
            continue;
        // Determinar el rol
        let role = 'assistant';
        if (msg.sender === 'user' || msg.role === 'user') {
            role = 'user';
        }
        // Determinar el contenido de texto de forma flexible
        let text = '';
        if (typeof msg.text === 'string') {
            text = msg.text.trim();
        }
        else if (typeof msg.message === 'string') {
            text = msg.message.trim();
        }
        else if (typeof msg.content === 'string') {
            text = msg.content.trim();
        }
        // Evitar añadir mensajes vacíos que rompen la API de DeepSeek (Error 400)
        if (text) {
            messages.push({
                role: role,
                content: text
            });
        }
    }
    // Mensaje actual
    if (messageText && typeof messageText === 'string') {
        messages.push({ role: 'user', content: messageText.trim() });
    }
    // 8. Bucle del Agente DeepSeek (con soporte de llamadas a herramientas)
    let botReply = '';
    try {
        let runLoop = true;
        let iterations = 0;
        // Guardar el flujo de mensajes de DeepSeek
        let currentMessages = [...messages];
        while (runLoop && iterations < 5) {
            iterations++;
            const response = await openai.chat.completions.create({
                model: 'deepseek-chat',
                messages: currentMessages,
                tools: agentTools,
                tool_choice: 'auto'
            });
            const responseMessage = response.choices[0].message;
            currentMessages.push(responseMessage);
            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                console.log(`🛠️ El agente solicitó ${responseMessage.tool_calls.length} herramientas.`);
                for (const toolCall of responseMessage.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = JSON.parse(toolCall.function.arguments);
                    console.log(`👉 Ejecutando: ${toolName} con argumentos:`, toolArgs);
                    const toolResult = await executeTool(toolName, toolArgs, cleanNumber);
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: toolResult
                    });
                }
            }
            else {
                botReply = responseMessage.content || '';
                runLoop = false;
            }
        }
    }
    catch (error) {
        console.error('❌ Error en el bucle del agente DeepSeek:', error.message || error);
        if (isBoss) {
            botReply = 'Jefe, disculpe, he tenido un problema interno al procesar su solicitud. El equipo técnico ha sido notificado.';
        }
        else {
            botReply = 'Disculpe, he tenido un problema interno al procesar su solicitud. El equipo técnico ha sido notificado.';
        }
    }
    if (botReply) {
        // 9. Enviar la respuesta por WhatsApp
        await sendWhatsAppMessage(senderJid, botReply);
        // 10. Guardar la respuesta del bot en la base de datos
        if (isBoss) {
            await saveBossChatMessage(cleanNumber, 'bot', botReply);
        }
        else {
            await saveClientChatMessage(cleanNumber, 'bot', botReply);
        }
    }
}
