process.env.TZ = 'America/Caracas';
import { OpenAI } from 'openai';
import axios from 'axios';
import { saveClientChatMessage, saveBossChatMessage, isMessageAlreadyProcessed, getSetting, saveSetting, query, searchClientes } from './db.js';
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
    '584143078681@s.whatsapp.net', // Julio Borges (Jefe)
    '584145881113@s.whatsapp.net', // Jefa
    '584222476127@s.whatsapp.net', // Adriel's Systems
    '584140108030@s.whatsapp.net', // Héctor (Desarrollador / Admin)
    '584143078681', // Alternativos sin sufijo
    '584145881113',
    '584222476127',
    '584140108030'
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
// Helper para detectar si el cliente solicita atención humana
export function detectHandoffRequest(text) {
    if (!text)
        return false;
    const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const keywords = [
        'asesor',
        'humano',
        'operador',
        'agente',
        'colaborador',
        'hablar con alguien',
        'atencion humana',
        'persona',
        'hablar con una persona',
        'soporte tecnico',
        'contacte directamente'
    ];
    return keywords.some(keyword => normalized.includes(keyword));
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
            description: 'Consulta el stock actual, inicial y movimientos de inventario en la base de datos PostgreSQL de CalMiranda, filtrado opcionalmente por sede (Hoyo de la Puerta o Guatire) o por nombre de producto.',
            parameters: {
                type: 'object',
                properties: {
                    sede: { type: 'string', description: 'Nombre de la sede opcional: "Hoyo de la Puerta" o "Guatire"' },
                    producto: { type: 'string', description: 'Nombre o fragmento del nombre del producto a consultar' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'consultar_productos_catalogo',
            description: 'Consulta el catálogo oficial de productos de CalMiranda directamente desde la base de datos PostgreSQL (incluye nombre, categoría, presentación, peso en kg, precio en USD y sede disponible).',
            parameters: {
                type: 'object',
                properties: {
                    categoria: { type: 'string', description: 'Categoría opcional del producto (ej. "Producto Terminado", "Agregados")' },
                    busqueda: { type: 'string', description: 'Término de búsqueda para filtrar por nombre o presentación' }
                }
            }
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
    },
    {
        type: 'function',
        function: {
            name: 'consultar_nomina',
            description: 'Consulta los detalles de la nómina semanal de CalMiranda desde el documento de Google Sheets (incluye empleados de Caracas, Guatire, bonos y totales generales). Solo disponible para jefes o personal autorizado.',
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
                let sql = `
          SELECT sede, categoria, producto, stock_inicial, produccion, salidas,
                 (stock_inicial + produccion - salidas) as stock_actual,
                 updated_at
          FROM inventario
          WHERE 1=1
        `;
                const params = [];
                if (args.sede) {
                    params.push(`%${args.sede}%`);
                    sql += ` AND sede ILIKE $${params.length}`;
                }
                if (args.producto) {
                    params.push(`%${args.producto}%`);
                    sql += ` AND producto ILIKE $${params.length}`;
                }
                sql += ` ORDER BY sede, categoria, producto;`;
                const rows = await query(sql, params);
                if (rows.length === 0) {
                    return JSON.stringify({ mensaje: 'No se encontraron registros de inventario para el criterio especificado.' });
                }
                return JSON.stringify(rows);
            }
            case 'consultar_productos_catalogo': {
                let sql = `
          SELECT id, nombre, categoria, sku, tipo_medida, peso, presentacion, precio, sede, estado
          FROM productos
          WHERE estado = 'Activo'
        `;
                const params = [];
                if (args.categoria) {
                    params.push(`%${args.categoria}%`);
                    sql += ` AND categoria ILIKE $${params.length}`;
                }
                if (args.busqueda) {
                    params.push(`%${args.busqueda}%`);
                    sql += ` AND (nombre ILIKE $${params.length} OR presentacion ILIKE $${params.length} OR sku ILIKE $${params.length})`;
                }
                sql += ` ORDER BY categoria, nombre;`;
                const rows = await query(sql, params);
                if (rows.length === 0) {
                    return JSON.stringify({ mensaje: 'No se encontraron productos en el catálogo para el criterio solicitado.' });
                }
                return JSON.stringify(rows);
            }
            case 'Cuentas': {
                // ID: 1oXz8Irdev0T6WVRmbL4tRfeQtCCm66DaDzFhk0-vBXM | Hoja: CUENTAS CAL MIRANDA
                const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
                const res = await sheets.spreadsheets.values.get({
                    spreadsheetId: '1oXz8Irdev0T6WVRmbL4tRfeQtCCm66DaDzFhk0-vBXM',
                    range: '\'CUENTAS CAL MIRANDA\'!A1:Z200'
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
                await saveSetting(`bot_status_${sessionId}`, 'waiting_handover');
                // Intentar enviar notificación al grupo de asesores humanos
                try {
                    const groupJid = await getSetting('advisors_group_jid', null);
                    if (groupJid) {
                        // Obtener el nombre del cliente desde la base de datos para dar más contexto
                        let clientName = 'Cliente';
                        try {
                            const cleanPhone = sessionId.replace(/\D/g, '');
                            const phonePattern = cleanPhone.length >= 10 ? `%${cleanPhone.slice(-10)}` : `%${cleanPhone}`;
                            const clientQuery = `
                SELECT nombre FROM clientes 
                WHERE regexp_replace(COALESCE(telefono_1, ''), '\\D', '', 'g') LIKE $1 
                   OR regexp_replace(COALESCE(movil, ''), '\\D', '', 'g') LIKE $1 
                   OR regexp_replace(COALESCE(telefono_2, ''), '\\D', '', 'g') LIKE $1 
                   OR regexp_replace(COALESCE(telefono_3, ''), '\\D', '', 'g') LIKE $1 
                ORDER BY 
                  (CASE WHEN rif IS NOT NULL AND rif <> '' THEN 0 ELSE 1 END) ASC,
                  (CASE WHEN zona IS NOT NULL AND zona <> '' AND zona <> 'General' THEN 0 ELSE 1 END) ASC,
                  (CASE WHEN id_cliente ~ '^[0-9]+$' THEN id_cliente::integer ELSE 999999 END) ASC,
                  id_cliente ASC
                LIMIT 1;
              `;
                            const dbClient = await query(clientQuery, [phonePattern]);
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
            case 'consultar_nomina': {
                const isBoss = BOSS_NUMBERS.includes(sessionId) || BOSS_NUMBERS.some(num => num.split('@')[0] === sessionId);
                if (!isBoss) {
                    return 'No tienes permisos para consultar la nómina de la empresa.';
                }
                try {
                    const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
                    const res = await sheets.spreadsheets.values.get({
                        spreadsheetId: '1M7IoLTEhKPW2HUbwqBKptMG7ZaSdZhWoCT-3Ni0tgHE',
                        range: '\'ACTUAL\'!A1:Z100'
                    });
                    const rows = res.data.values || [];
                    if (rows.length === 0) {
                        return 'La hoja de nómina está vacía.';
                    }
                    const csvData = rows.map(row => row.map(val => {
                        const cellStr = String(val).replace(/"/g, '""');
                        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
                            return `"${cellStr}"`;
                        }
                        return cellStr;
                    }).join(',')).join('\n');
                    return csvData;
                }
                catch (err) {
                    console.error('❌ Error al obtener el CSV de nómina en executeTool:', err.message || err);
                    return `Error al obtener la nómina: ${err.message || err}`;
                }
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
    let messageTimestampRaw = null;
    // Formato estándar de Evolution API
    if (payload.event && payload.event.toLowerCase() === 'messages.upsert' && payload.data) {
        const data = payload.data;
        messageId = data.key?.id || '';
        // Preferir remoteJidAlt (JID de número de teléfono) si remoteJid es un ID interno @lid
        senderJid = data.key?.remoteJidAlt || data.key?.remoteJid || '';
        pushName = payload.pushName || data.pushName || 'Cliente';
        messageTimestampRaw = data.messageTimestamp ?? payload.data?.messageTimestamp ?? payload.messageTimestamp;
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
        messageTimestampRaw = msg.created_at || msg.timestamp;
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
    let isBoss = BOSS_NUMBERS.includes(senderJid) || BOSS_NUMBERS.includes(cleanNumber);
    let chatType = isBoss ? 'boss' : 'client';
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
                    await saveBossChatMessage(cleanNumber, 'agent', messageText, messageId);
                }
                else {
                    await saveClientChatMessage(cleanNumber, 'agent', messageText, pushName, messageId);
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
    // 1.1 FILTRO ANTI-DESTIEMPO: Validar timestamp del mensaje para descartar replays de sync o mensajes rezagados
    if (messageTimestampRaw) {
        let tsSec = null;
        if (typeof messageTimestampRaw === 'number') {
            tsSec = messageTimestampRaw > 1e11 ? Math.floor(messageTimestampRaw / 1000) : messageTimestampRaw;
        }
        else if (typeof messageTimestampRaw === 'string') {
            const parsed = Number(messageTimestampRaw);
            if (!isNaN(parsed) && parsed > 0) {
                tsSec = parsed > 1e11 ? Math.floor(parsed / 1000) : parsed;
            }
            else {
                const dateParsed = Date.parse(messageTimestampRaw);
                if (!isNaN(dateParsed)) {
                    tsSec = Math.floor(dateParsed / 1000);
                }
            }
        }
        else if (typeof messageTimestampRaw === 'object' && typeof messageTimestampRaw.low === 'number') {
            tsSec = messageTimestampRaw.low;
        }
        if (tsSec) {
            const nowSec = Math.floor(Date.now() / 1000);
            const ageSeconds = nowSec - tsSec;
            // Si el mensaje tiene más de 120 segundos (2 minutos) de antigüedad, se ignora completamente.
            // Esto previene que reconexiones de Baileys / Evolution API a las 3:00 AM retransmitan mensajes antiguos y activen al bot.
            if (ageSeconds > 120) {
                console.log(`⏭️ [ANTI-DESTIEMPO] Ignorando mensaje antiguo/sync replay (${ageSeconds}s de antigüedad > 120s límite). ID: ${messageId} | Remitente: ${cleanNumber}`);
                return;
            }
        }
    }
    // 2. De-duplicación robusta (Memoria RAM + Base de datos PostgreSQL)
    if (messageId) {
        if (processedMessageIds.has(messageId)) {
            console.log(`⏭️ [ANTI-DESTIEMPO] Ignorando mensaje duplicado (en memoria): ${messageId}`);
            return;
        }
        // Verificar si ya existe en la base de datos (para sobrevivir reinicios de contenedor a las 3 AM)
        const alreadyInDb = await isMessageAlreadyProcessed(messageId);
        if (alreadyInDb) {
            console.log(`⏭️ [ANTI-DESTIEMPO] Ignorando mensaje ya procesado previamente en base de datos: ${messageId}`);
            processedMessageIds.add(messageId);
            return;
        }
        processedMessageIds.add(messageId);
        // Eliminar del caché en memoria después de 15 minutos (aumentado de 5 a 15 min)
        setTimeout(() => processedMessageIds.delete(messageId), 900000);
    }
    // Buscar si el cliente existe en la base de datos de CalMiranda
    let clientExists = false;
    let clientName = pushName || 'Cliente';
    let clientEstatus = '';
    let clientEtiqueta = '';
    let clientVendedor = '';
    try {
        const phonePattern = cleanNumber.length >= 10 ? `%${cleanNumber.slice(-10)}` : `%${cleanNumber}`;
        const clientQuery = `
      SELECT nombre, estatus, etiqueta, vendedor FROM clientes 
      WHERE regexp_replace(COALESCE(telefono_1, ''), '\\D', '', 'g') LIKE $1 
         OR regexp_replace(COALESCE(movil, ''), '\\D', '', 'g') LIKE $1 
         OR regexp_replace(COALESCE(telefono_2, ''), '\\D', '', 'g') LIKE $1 
         OR regexp_replace(COALESCE(telefono_3, ''), '\\D', '', 'g') LIKE $1 
      ORDER BY 
        (CASE WHEN rif IS NOT NULL AND rif <> '' THEN 0 ELSE 1 END) ASC,
        (CASE WHEN zona IS NOT NULL AND zona <> '' AND zona <> 'General' THEN 0 ELSE 1 END) ASC,
        (CASE WHEN id_cliente ~ '^[0-9]+$' THEN id_cliente::integer ELSE 999999 END) ASC,
        id_cliente ASC
      LIMIT 1;
    `;
        const dbClient = await query(clientQuery, [phonePattern]);
        if (dbClient.length > 0) {
            clientExists = true;
            clientName = dbClient[0].nombre;
            clientEstatus = dbClient[0].estatus || '';
            clientEtiqueta = dbClient[0].etiqueta || '';
            clientVendedor = dbClient[0].vendedor || '';
        }
    }
    catch (err) {
        console.error('⚠️ Error al buscar cliente en base de datos:', err);
    }
    // Clasificación dinámica según etiqueta del contacto
    const cleanStatus = (clientEtiqueta || '').trim().toLowerCase();
    if (cleanStatus === 'admin' || cleanStatus === 'jefe' || cleanStatus === 'administrador') {
        isBoss = true;
        chatType = 'boss';
    }
    else if (cleanStatus === 'empleado' || cleanStatus === 'transportista' || cleanStatus === 'otros') {
        // Si fue re-etiquetado por el administrador como Empleado/Transportista/Otros, se respeta el silencio operativo
        isBoss = false;
    }
    console.log(`🤖 Procesando mensaje de ${clientName} (WhatsApp PushName: ${pushName}) (${cleanNumber}) - Rol: ${isBoss ? 'Jefe/Admin' : 'Cliente'} - Estatus: ${clientEstatus} - Etiqueta: ${clientEtiqueta || 'Sin Etiqueta'}`);
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
    // Guardar mensaje del usuario en la base de datos (con su messageId persistido)
    if (isBoss) {
        await saveBossChatMessage(cleanNumber, 'user', messageText, messageId);
    }
    else {
        await saveClientChatMessage(cleanNumber, 'user', messageText, pushName, messageId);
    }
    // 3. Verificar Handoff (Si el bot está silenciado para este número)
    const botStatus = await getSetting(`bot_status_${cleanNumber}`, 'bot_active');
    if (botStatus === 'agent_active' || botStatus === 'waiting_handover') {
        console.log(`🤫 Bot silenciado para ${cleanNumber} (Handoff activo/espera: ${botStatus}). Mensaje guardado en BD para atención humana.`);
        return;
    }
    // 4. Analizar si el mensaje entrante solicita asesor humano directamente
    if (!isBoss) {
        const hasHandoffRequest = detectHandoffRequest(messageText);
        if (hasHandoffRequest) {
            console.log(`🔍 Palabra clave de handoff detectada en mensaje de WhatsApp de ${cleanNumber}. Activando handoff automático.`);
            const handoffReply = "Con mucho gusto. Le transfiero de inmediato con uno de nuestros asesores humanos para brindarle una atención personalizada. En breve se comunicarán con usted por este medio. ¡Vamos positivo! 🙌";
            await sendWhatsAppMessage(senderJid, handoffReply);
            await saveClientChatMessage(cleanNumber, 'bot', handoffReply);
            await executeTool('activar_handoff', {}, cleanNumber);
            return; // Detener ejecución para que el bot no vuelva a responder automáticamente
        }
    }
    // 5. Clasificación y Comportamiento Inteligente según Etiqueta del Contacto
    // (cleanStatus ya evaluado arriba a partir de clientEtiqueta)
    // Caso A: Empleados, Transportistas u Otros -> Silencio total (guardado en BD para operaciones diarias)
    const ignoreStatuses = ['empleado', 'transportista', 'otros'];
    if (ignoreStatuses.includes(cleanStatus)) {
        console.log(`🔕 Contacto operativo etiquetado como "${clientEtiqueta}" (${clientName} - ${cleanNumber}). Mensaje guardado en BD, pero se omite respuesta del bot.`);
        return;
    }
    // Caso B: Cliente Frecuente -> Atención preferente y derivación directa al vendedor asignado
    if (cleanStatus === 'cliente frecuente' || cleanStatus === 'cliente habitual' || cleanStatus.includes('frecuente')) {
        console.log(`⭐ Contacto VIP etiquetado como "Cliente Frecuente" (${clientName} - ${cleanNumber}). Notificando a vendedor y activando atención humana.`);
        const currentBotStatus = await getSetting(`bot_status_${cleanNumber}`, 'bot_active');
        if (currentBotStatus !== 'agent_active' && currentBotStatus !== 'waiting_handover') {
            const asesorAsignado = (clientVendedor && clientVendedor !== 'Bot/Sistema') ? `su asesor comercial asignado (${clientVendedor})` : 'nuestro equipo de ventas';
            const vipReply = `¡Hola, estimado(a) ${clientName}! Qué gusto saludarle nuevamente. En CalMiranda seguimos a su completa disposición. Le comunico de inmediato con ${asesorAsignado} para atender su requerimiento de forma directa y prioritaria. ¡Vamos positivo! 🙌`;
            await sendWhatsAppMessage(senderJid, vipReply);
            await saveClientChatMessage(cleanNumber, 'bot', vipReply);
            await executeTool('activar_handoff', { motivo: `Cliente Frecuente con vendedor asignado: ${clientVendedor || 'Ventas'}` }, cleanNumber);
        }
        return;
    }
    // Verificar si el bot está deshabilitado globalmente
    const globalBotDisabled = await getSetting('global_bot_disabled', false);
    if (globalBotDisabled === true || String(globalBotDisabled) === 'true') {
        console.log(`📴 El bot está deshabilitado globalmente. Mensaje de ${cleanNumber} guardado en BD, pero se omite la respuesta automática.`);
        return;
    }
    // 6. Obtener Prompts personalizados (de app_settings o por defecto)
    const defaultBotPrompt = `PROMPT DE IDENTIDAD Y PROPÓSITO: SUPER AGENTE DE VENTAS CALMIRANDA

Eres DIAMANTÍN, el Asesor Comercial y Super Agente de Ventas oficial de CalMiranda (INVERSIONES MIRANDA 1311 C.A., RIF: J-41131658-0).

Personalidad: Consultor comercial de alto nivel, humano, empático, profesional, respetuoso, motivador y orientado a la solución.
Lema: Tu grito de guerra es ¡Vamos positivo! Úsalo moderadamente para inspirar confianza y cerrar acuerdos.
Comunicación: Clara, directa, persuasiva y concisa. ESTÁ PROHIBIDO exceder las 4 líneas de texto por mensaje. Usa viñetas cuando presentes opciones.
Idioma (Estricto): 100% en ESPAÑOL. Prohibido responder en inglés.

MISIÓN PRINCIPAL:
Asesorar con maestría sobre nuestros productos de cal, cotizar con rigor matemático basado exclusivamente en la base de datos, validar stock real y guiar a cada cliente hacia una compra exitosa o derivarlo a un asesor comercial humano cuando el caso lo requiera.

REGLAS DE ORO CONTRA ALUCINACIONES (ZERO HALLUCINATION):
1. PRECIOS Y PRODUCTOS EXCLUSIVOS DE LA BASE DE DATOS:
   Tienes TERMINANTEMENTE PROHIBIDO inventar o asumir productos, presentaciones o precios.
   DEBES llamar siempre a la herramienta "consultar_productos_catalogo" para conocer los productos activos, presentaciones y precios unitarios en USD.
2. COTIZACIONES Y CÁLCULO EN BOLÍVARES (TASA OFICIAL BCV):
   Al cotizar o informar montos, consulta obligatoriamente la herramienta "tasa_bcv".
   Presenta SIEMPRE el precio en Dólares (USD) y su conversión exacta a Bolívares Oficiales (Bs. = USD * Tasa BCV), indicando la tasa aplicada.
3. CONSULTA DE EXISTENCIAS EN TIEMPO REAL:
   Antes de confirmar disponibilidad para retiro o despacho en Planta Guatire o Sede Hoyo de la Puerta, consulta SIEMPRE "consultar_inventario". Si no hay stock suficiente, indícalo con cortesía y ofrece coordinar producción o despacho con un asesor humano ("activar_handoff").
4. TRANSFERENCIA INMEDIATA A ASESOR HUMANO ("activar_handoff"):
   DEBES derivar la conversación de inmediato mediante la herramienta "activar_handoff" en los siguientes casos:
   - Pedidos al mayor o grandes volúmenes (>100 sacos, distribuidores, constructoras).
   - Solicitudes de crédito, días de financiamiento o condiciones de pago no contempladas.
   - Solicitud de productos especiales, cal viva a granel, diluciones no listadas o fichas técnicas de laboratorio.
   - Si el cliente solicita explícitamente hablar con un asesor o vendedor humano.
   Respuesta al derivar: "Para brindarle la mejor cotización comercial y coordinar su despacho con exactitud, le transfiero de inmediato con uno de nuestros asesores especializados. En breve se comunicarán con usted por este medio. ¡Vamos positivo! 🙌"
5. PROHIBICIÓN TOTAL DE ACTUAR COMO TALENTO HUMANO / RECEPCIÓN DE CV (CRÍTICO):
   - Tu rol es ÚNICA Y EXCLUSIVAMENTE Comercial y de Ventas de Cal. NO trabajas en Recursos Humanos ni Talento Humano.
   - Tienes TERMINANTEMENTE PROHIBIDO recibir currículums, pedir archivos PDF, indicar vacantes o decir que canalizarás solicitudes de empleo.
   - Los datos bancarios y el correo son de uso EXCLUSIVO para confirmación de pagos de compras. Queda TERMINANTEMENTE PROHIBIDO usarlos para temas de empleo.
   - Si un usuario pregunta por trabajo, vacantes, empleo o enviar síntesis curricular / CV, responde estrictamente:
     "Soy Diamantín, asesor comercial de CalMiranda enfocado en la atención y venta de nuestros productos de cal. Por este canal no gestionamos procesos de contratación ni recepción de currículums. ¡Agradecemos su interés y vamos positivo! 🙌"

CONOCIMIENTO CENTRAL DE CALMIRANDA
- Somos: Fábrica de Cal - Especialistas en producción de cal de máxima pureza, cal en pasta y pintura ecológica.
- Horarios de atención: Lunes a Viernes 8:00 AM - 5:00 PM | Sábados 8:00 AM - 12:00 PM.
- Teléfonos corporativos: 0424-257-4698 // 0412-388-3692.
- Sedes Oficiales Operativas (ÚNICAS DOS SEDES):
  1. Planta Principal (Guatire): Calle Los Ríos, Galpón 2-3, Zona Industrial El Marqués, Guatire, Edo. Miranda.
  2. Sede Hoyo de la Puerta: Av. Principal Edif. Abuela Flora, Piso 1, Sector Hoyo de la Puerta, Caracas.

POLÍTICA DE LOGÍSTICA PARA PEDIDOS AL DETAL (1 a 5 sacos):
- Guatire / Zona Este: Ofrecer retiro en Planta Guatire.
- Caracas Sur / Altos Mirandinos: Ofrecer retiro en Sede Hoyo de la Puerta.
- Otras Zonas Lejanas: Recomendar adquirir en nuestra red de distribuidores aliados autorizados.

DATOS BANCARIOS OFICIALES:
- Pago Móvil: Banesco (0134) | Teléfono: 0414.307.86.81 | C.I.: 16.411.324
- Transferencia Banesco: 01340874238743018365 | Julio César Borges | C.I. 16.411.324
- Transferencia Mercantil: 01050024901024308758 | Julio Cesar Borges Cordova | C.I. 16.411.324
- Correo: juliocesarborgescordova@gmail.com

HERRAMIENTAS DISPONIBLES:
- consultar_productos_catalogo → Catálogo oficial con precios en USD y presentaciones.
- consultar_inventario → Stock disponible por sede (Guatire o Hoyo de la Puerta).
- tasa_bcv → Tasa oficial de cambio del día para cálculo en Bolívares.
- activar_handoff → Transferencia al equipo de asesores comerciales humanos.
- SQL_specialist → Consulta de datos del cliente en base de datos.
- Calendar_Disponibilidad / Calendar_Agendar → Gestión de citas.

FLUJO DE ATENCIÓN DE VENTAS:
1. Saludo personalizado (usar nombre si cliente = true).
2. Identificación: Consultar tipo de cal requerido y cantidad estimada.
3. Consulta inmediata de herramientas (catálogo + inventario + tasa BCV).
4. Cotización bimonetaria exacta (USD y Bs.) y propuesta de retiro/despacho según ubicación.
5. Cierre o transferencia humana según el volumen.`;
    // Definir identidad del emisor si es Boss/Administrador
    let bossIdentity = "del Jefe / Administrador de Inversiones Miranda";
    if (cleanNumber.endsWith('4140108030')) {
        bossIdentity = "de Héctor Ollarves, Líder de Desarrollo de Software y Administrador de la plataforma tecnológica de CalMiranda. Trátalo por su nombre (Héctor) con respeto, profesionalismo y confianza técnica.";
    }
    else if (cleanNumber.endsWith('4143078681')) {
        bossIdentity = "de Julio Borges, Director General y Jefe de Inversiones Miranda 1311. Trátalo como Jefe con máxima eficiencia.";
    }
    else if (cleanNumber.endsWith('4145881113')) {
        bossIdentity = "de la Directora General de CalMiranda. Trátala como Jefa con máxima eficiencia.";
    }
    else if (clientName && clientName !== 'Cliente') {
        bossIdentity = `del Administrador/Jefe de CalMiranda (${clientName}). Trátalo con el máximo respeto ejecutivo y eficiencia.`;
    }
    const defaultBossPrompt = `Eres DIAMANTÍN, el Asistente Ejecutivo ${bossIdentity}
Resuelves requerimientos de forma directa, eficiente y breve usando herramientas (consultar inventario, finanzas/cuentas, nómina, Google Calendar, Gmail, tasa BCV). Reconoces a tu interlocutor por su cargo y nombre. Tu grito de confianza es "Vamos positivo".

REGLAS DE CONVERSIÓN DE MONEDA Y NÓMINA:
- Al responder sobre nómina, pagos o finanzas, consulta la herramienta 'tasa_bcv' para conocer la tasa oficial del día del BCV.
- Si la nómina viene en Dólares (USD), debes calcular y presentar siempre el monto en Dólares (USD) y su conversión exacta a Bolívares (Bs. = USD * Tasa BCV), indicando la tasa utilizada.`;
    const extraRulesBot = await getSetting('extra_rules_bot', '');
    const extraRulesAssistant = await getSetting('extra_rules_assistant', '');
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
