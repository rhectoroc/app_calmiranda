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
        senderJid = data.key?.remoteJid || '';
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
        senderJid = msg.sender?.identifier || '';
        pushName = msg.sender?.name || 'Cliente';
        messageText = msg.text || '';
    }
    // Si no hay datos mínimos, ignorar
    if (!senderJid || !messageText) {
        return;
    }
    // Ignorar mensajes enviados por el propio bot (fromMe = true)
    if (payload.data?.key?.fromMe === true || payload.conversation?.messages?.[0]?.fromMe === true) {
        return;
    }
    // 2. De-duplicación
    if (messageId) {
        if (processedMessageIds.has(messageId)) {
            console.log(`⏭️ Ignorando mensaje duplicado: ${messageId}`);
            return;
        }
        processedMessageIds.add(messageId);
        // Eliminar del caché después de 5 minutos
        setTimeout(() => processedMessageIds.delete(messageId), 300000);
    }
    // Obtener el número limpio
    const cleanNumber = senderJid.split('@')[0];
    // 3. Verificar Handoff (Si el bot está silenciado para este número)
    const botStatus = await getSetting(`bot_status_${cleanNumber}`, 'bot_active');
    if (botStatus === 'agent_active') {
        console.log(`🤫 Bot silenciado para ${cleanNumber} (Handoff activo).`);
        return;
    }
    // 4. Clasificar emisor (Jefe o Cliente)
    const isBoss = BOSS_NUMBERS.includes(senderJid) || BOSS_NUMBERS.includes(cleanNumber);
    console.log(`🤖 Procesando mensaje de ${pushName} (${cleanNumber}) - Rol: ${isBoss ? 'Jefe' : 'Cliente'}`);
    // 5. Cargar historial de chat de la base de datos
    let history = [];
    try {
        if (isBoss) {
            const sql = `SELECT message FROM chat_boss WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10`;
            const rows = await query(sql, [cleanNumber]);
            history = rows.map(r => r.message).reverse();
        }
        else {
            const sql = `SELECT message FROM n8n_chat_histories WHERE session_id = $1 ORDER BY id DESC LIMIT 10`;
            const rows = await query(sql, [cleanNumber]);
            history = rows.map(r => r.message).reverse();
        }
    }
    catch (error) {
        console.error('⚠️ Error cargando historial de chat de Postgres:', error);
    }
    // Guardar mensaje del usuario en la base de datos
    if (isBoss) {
        await saveBossChatMessage(cleanNumber, 'user', messageText);
    }
    else {
        await saveClientChatMessage(cleanNumber, 'user', messageText);
    }
    // 6. Obtener Prompts personalizados (de app_settings o por defecto)
    const defaultBotPrompt = `Eres Diamantín, el asistente virtual oficial de CalMiranda. Tu objetivo es atender consultas de clientes sobre cal en pasta, cal en polvo y pintura ecológica, recopilar volumen requerido y coordinar desvíos a humanos. ¡Vamos positivo!`;
    const defaultBossPrompt = `Eres DIAMANTÍN, el Asistente Ejecutivo del Jefe de Inversiones Miranda. Resuelves requerimientos de forma directa, eficiente y breve usando herramientas. Tu grito es "Vamos positivo".`;
    const customBotPrompt = await getSetting('prompt_bot', defaultBotPrompt);
    const customBossPrompt = await getSetting('prompt_assistant', defaultBossPrompt);
    const systemMessage = isBoss ? customBossPrompt : customBotPrompt;
    // 7. Construir los mensajes para el LLM
    const messages = [
        { role: 'system', content: systemMessage }
    ];
    // Incorporar el historial
    for (const msg of history) {
        messages.push({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        });
    }
    // Mensaje actual
    messages.push({ role: 'user', content: messageText });
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
        botReply = 'Jefe, disculpe, he tenido un problema interno al procesar su solicitud. El equipo técnico ha sido notificado.';
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
