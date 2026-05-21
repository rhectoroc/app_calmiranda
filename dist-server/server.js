import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAuthUrl, saveTokensFromCode } from './googleAuth.js';
import { handleWebhookMessage, sendWhatsAppMessage } from './agent.js';
import { initScheduler, runTasaScraper, runFinancialReport } from './scheduler.js';
import { query, getSetting, saveSetting } from './db.js';
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
    try {
        // Procesar mensaje asíncronamente para responder rápido al webhook
        handleWebhookMessage(req.body).catch(err => {
            console.error('❌ Error procesando webhook message:', err);
        });
        // Responder inmediatamente para confirmar recepción del webhook
        res.status(200).json({ status: 'received' });
    }
    catch (error) {
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
        SELECT DISTINCT ON (session_id) session_id, id, message
        FROM n8n_chat_histories
        ORDER BY session_id, id DESC
      )
      SELECT session_id, message FROM latest_messages ORDER BY id DESC LIMIT 50;
    `;
        const rows = await query(sql);
        const chats = [];
        for (const r of rows) {
            const sessionId = r.session_id;
            const lastMsg = r.message;
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
                lastMessage: lastMsg.text,
                lastMessageTime: lastMsg.timestamp ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hace poco',
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
      SELECT message FROM n8n_chat_histories 
      WHERE session_id = $1 
      ORDER BY id ASC;
    `;
        const rows = await query(sql, [sessionId]);
        const messages = rows.map((r, i) => ({
            id: i.toString(),
            sender: r.message.sender === 'bot' || r.message.sender === 'agent' ? 'agent' : 'user',
            text: r.message.text,
            timestamp: r.message.timestamp ? new Date(r.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
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
    try {
        await saveSetting(`bot_status_${sessionId}`, 'agent_active');
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
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    // Inicializar schedulers (node-cron)
    initScheduler();
});
