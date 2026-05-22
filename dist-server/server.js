import express from 'express';
import cors from 'cors';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { getAuthUrl, saveTokensFromCode } from './googleAuth.js';
import { handleWebhookMessage, sendWhatsAppMessage } from './agent.js';
import { initScheduler, runTasaScraper, runFinancialReport } from './scheduler.js';
import { query, getSetting, saveSetting, saveClientChatMessage } from './db.js';
// Resolver __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
// Configurar CORS
app.use(cors());
// Middleware para parsear JSON
app.use(express.json());
// ----------------------------------------------------
// ENDPOINTS DE AUTENTICACIÓN GOOGLE OAUTH
// ----------------------------------------------------
// Redirigir al usuario al login de Google
app.get('/api/auth/google', (req, res) => {
    try {
        const url = getAuthUrl();
        res.redirect(url);
    }
    catch (error) {
        res.status(500).send(`Error generando URL de Google Auth: ${error.message}`);
    }
});
// Callback de redirección de Google
app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('Falta el parámetro de autorización "code".');
    }
    try {
        const email = await saveTokensFromCode(code);
        res.send(`
      <html>
        <head>
          <title>Google Autenticación Exitosa</title>
          <style>
            body { font-family: sans-serif; background: #1a1a1a; color: #fff; text-align: center; padding-top: 100px; }
            .card { background: #2c3539; padding: 40px; border-radius: 20px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            h1 { color: #0ABF04; }
            a { color: #8B7355; text-decoration: none; font-weight: bold; border: 1px solid #8B7355; padding: 10px 20px; border-radius: 8px; margin-top: 20px; display: inline-block; }
            a:hover { background: #8B7355; color: #fff; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>¡Google OAuth Conectado!</h1>
            <p>Se han guardado de manera segura los tokens de acceso para la cuenta: <strong>${email}</strong>.</p>
            <p>Ya puedes cerrar esta ventana y regresar al Panel de Control.</p>
            <a href="/settings">Regresar a Configuración</a>
          </div>
        </body>
      </html>
    `);
    }
    catch (error) {
        res.status(500).send(`Error guardando tokens: ${error.message}`);
    }
});
// ----------------------------------------------------
// ENDPOINT DE WEBHOOK PARA EVOLUTION API / WHATSAPP
// ----------------------------------------------------
app.post('/webhooks/whatsapp', async (req, res) => {
    console.log(`📥 Webhook recibido en /webhooks/whatsapp: Evento = ${req.body?.event || 'desconocido'}`);
    if (req.body?.event === 'messages.upsert') {
        const data = req.body?.data;
        const sender = data?.key?.remoteJidAlt || data?.key?.remoteJid || 'desconocido';
        const text = data?.message?.conversation || data?.message?.extendedTextMessage?.text || '';
        console.log(`💬 Mensaje de WhatsApp recibido de: ${sender} | Texto: "${text}"`);
    }
    else {
        console.log('📦 Payload completo del webhook recibido:', JSON.stringify(req.body));
    }
    try {
        // Procesar mensaje asíncronamente para responder rápido al webhook
        handleWebhookMessage(req.body).catch(err => {
            console.error('❌ Error procesando webhook message:', err);
        });
        // Responder inmediatamente para confirmar recepción del webhook
        res.status(200).json({ status: 'received' });
    }
    catch (error) {
        console.error('❌ Error en endpoint de webhook:', error.message || error);
        res.status(500).json({ error: error.message });
    }
});
// ----------------------------------------------------
// ENDPOINTS DE CONFIGURACIONES (APP SETTINGS)
// ----------------------------------------------------
// Obtener todas las configuraciones configuradas
app.get('/api/settings', async (req, res) => {
    try {
        const promptBot = await getSetting('prompt_bot', 'Eres Diamantín, el asistente virtual oficial de CalMiranda...');
        const promptAssistant = await getSetting('prompt_assistant', 'Eres DIAMANTÍN, el Asistente Ejecutivo del Jefe...');
        const bcvRate = await getSetting('bcv_rate', null);
        res.json({
            prompts: {
                bot: promptBot,
                assistant: promptAssistant
            },
            bcvRate
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Guardar configuraciones
app.post('/api/settings', async (req, res) => {
    const { prompts } = req.body;
    try {
        if (prompts?.bot) {
            await saveSetting('prompt_bot', prompts.bot);
        }
        if (prompts?.assistant) {
            await saveSetting('prompt_assistant', prompts.assistant);
        }
        res.json({ status: 'ok', message: 'Configuraciones actualizadas en la base de datos.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ----------------------------------------------------
// ENDPOINTS PARA CHATS EN TIEMPO REAL (INTEGRACIÓN FRONTEND)
// ----------------------------------------------------
// Listar chats activos de clientes
app.get('/api/chats', async (req, res) => {
    try {
        const sql = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (session_id) session_id, id, sender, message_text, created_at
        FROM chat_messages
        WHERE chat_type = 'client'
        ORDER BY session_id, id DESC
      )
      SELECT session_id, sender, message_text, created_at 
      FROM latest_messages 
      ORDER BY id DESC 
      LIMIT 50;
    `;
        const rows = await query(sql);
        const chats = [];
        for (const r of rows) {
            const sessionId = r.session_id;
            const cleanPhone = sessionId.replace(/\D/g, '');
            // Buscar si el cliente existe en la tabla comercial clientes
            const clientQuery = `
        SELECT nombre FROM clientes 
        WHERE telefono_1 LIKE $1 
           OR movil LIKE $1 
           OR telefono_2 LIKE $1 
           OR telefono_3 LIKE $1 
        LIMIT 1;
      `;
            const dbClient = await query(clientQuery, [`%${cleanPhone}%`]);
            const customerName = dbClient.length > 0 ? dbClient[0].nombre : `Cliente (+${cleanPhone})`;
            const botStatus = await getSetting(`bot_status_${sessionId}`, 'bot_active');
            chats.push({
                id: sessionId,
                customerName,
                phoneNumber: cleanPhone,
                lastMessage: r.message_text,
                lastMessageTime: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hace poco',
                channel: 'WhatsApp',
                status: botStatus // 'bot_active' | 'agent_active' | 'waiting_handover'
            });
        }
        // Si no hay ningún chat en la base de datos, retornar lista vacía
        res.json(chats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Obtener mensajes de una conversación
app.get('/api/chats/:sessionId/messages', async (req, res) => {
    const { sessionId } = req.params;
    try {
        const sql = `
      SELECT id, sender, message_text, created_at 
      FROM chat_messages 
      WHERE session_id = $1 AND chat_type = 'client'
      ORDER BY id ASC;
    `;
        const rows = await query(sql, [sessionId]);
        const messages = rows.map((r) => ({
            id: r.id.toString(),
            sender: r.sender,
            text: r.message_text,
            timestamp: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        }));
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Toma de control humana (Handoff)
app.post('/api/chats/:sessionId/takeover', async (req, res) => {
    const { sessionId } = req.params;
    const { agentName } = req.body;
    try {
        await saveSetting(`bot_status_${sessionId}`, 'agent_active');
        // Registrar mensaje de sistema en el historial de chat
        const name = agentName || 'un agente';
        await saveClientChatMessage(sessionId, 'agent', `⚠️ [Sistema] El agente ${name} ha tomado control de la conversación.`);
        res.json({ status: 'ok', message: 'Handoff activado. Bot de IA pausado para este cliente.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Devolver el control a la IA
app.post('/api/chats/:sessionId/release', async (req, res) => {
    const { sessionId } = req.params;
    try {
        await saveSetting(`bot_status_${sessionId}`, 'bot_active');
        // Registrar mensaje de sistema en el historial de chat
        await saveClientChatMessage(sessionId, 'agent', `⚠️ [Sistema] El bot Diamantín ha retomado el control de la conversación.`);
        res.json({ status: 'ok', message: 'Handoff desactivado. Bot de IA reactivado.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Enviar un mensaje de forma manual desde el Panel de Control a un cliente vía Evolution API
app.post('/api/chats/:sessionId/send', async (req, res) => {
    const { sessionId } = req.params;
    const { text } = req.body;
    try {
        if (!text) {
            return res.status(400).json({ error: 'El texto del mensaje es requerido.' });
        }
        // Enviar WhatsApp usando la Evolution API
        await sendWhatsAppMessage(sessionId, text);
        // Registrar mensaje en la base de datos
        await saveClientChatMessage(sessionId, 'agent', text);
        res.json({ status: 'ok', message: 'Mensaje enviado y registrado.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ----------------------------------------------------
// ENDPOINTS TEMPORALES DE PRUEBA (SOLO DESARROLLO/EJECUCIÓN MANUAL)
// ----------------------------------------------------
app.post('/api/test/scrape-tasa', async (req, res) => {
    try {
        await runTasaScraper();
        res.json({ status: 'ok', message: 'Scraping manual de tasa completado exitosamente.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/test/reporte', async (req, res) => {
    try {
        await runFinancialReport();
        res.json({ status: 'ok', message: 'Reporte financiero manual generado y enviado.' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/setup-webhook', async (req, res) => {
    const evoUrl = process.env.EVOLUTION_API_URL || 'https://evolution.calmiranda.com';
    const instance = process.env.EVOLUTION_INSTANCE_NAME || 'CalMiranda';
    const apiKey = process.env.EVOLUTION_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'EVOLUTION_API_KEY no está configurada en las variables de entorno.' });
    }
    // Detectar la URL pública de este servidor
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const myPublicUrl = `${protocol}://${host}/webhooks/whatsapp`;
    console.log(`🔧 Configurando webhook de Evolution API. URL destino: ${myPublicUrl}`);
    try {
        const response = await axios.post(`${evoUrl}/webhook/set/${instance}`, {
            enabled: true,
            url: myPublicUrl,
            webhookByEvents: false,
            events: [
                "MESSAGES_UPSERT"
            ]
        }, {
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json'
            }
        });
        res.json({
            status: 'ok',
            message: 'Webhook registrado exitosamente en la instancia de Evolution API.',
            registeredUrl: myPublicUrl,
            evolutionResponse: response.data
        });
    }
    catch (error) {
        console.error('❌ Error registrando webhook en Evolution API:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Error registrando el webhook en Evolution API',
            details: error.response?.data || error.message
        });
    }
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor de CalMiranda en funcionamiento e integrado.' });
});
// Servir la aplicación estática del Frontend (React) en producción
const clientBuildPath = path.join(__dirname, '../dist');
app.use(express.static(clientBuildPath));
// Cualquier otra ruta no capturada por la API es redirigida al index.html de React (SPA Routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});
// Iniciar el servidor y schedulers
app.listen(PORT, async () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    // Inicializar schedulers (node-cron)
    initScheduler();
    // Verificar si el grupo de asesores humanos está configurado
    try {
        const groupJid = await getSetting('advisors_group_jid', null);
        if (groupJid) {
            console.log(`📢 Grupo de asesores de WhatsApp configurado: "${groupJid}"`);
        }
        else {
            console.log('⚠️ Advertencia: "advisors_group_jid" no está configurado en app_settings. Las alertas de atención humana no se enviarán a WhatsApp.');
        }
    }
    catch (err) {
        console.error('⚠️ Error al verificar "advisors_group_jid" en la base de datos:', err.message || err);
    }
});
