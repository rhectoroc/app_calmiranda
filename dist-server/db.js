import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Crear pool de conexión a base de datos usando la variable de entorno DATABASE_URL
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
});
// Helper genérico para consultas SQL
export async function query(text, params) {
    const client = await pool.connect();
    try {
        const res = await client.query(text, params);
        return res.rows;
    }
    finally {
        client.release();
    }
}
export async function saveGoogleTokens(token) {
    const sql = `
    INSERT INTO google_tokens (email, access_token, refresh_token, scope, token_type, expiry_date, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (email) DO UPDATE
    SET access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, google_tokens.refresh_token),
        scope = EXCLUDED.scope,
        token_type = EXCLUDED.token_type,
        expiry_date = EXCLUDED.expiry_date,
        updated_at = NOW();
  `;
    await query(sql, [
        token.email,
        token.access_token,
        token.refresh_token,
        token.scope || null,
        token.token_type || null,
        token.expiry_date ? BigInt(token.expiry_date) : null
    ]);
}
export async function getGoogleTokens(email) {
    const sql = `SELECT email, access_token, refresh_token, scope, token_type, expiry_date FROM google_tokens WHERE email = $1`;
    const rows = await query(sql, [email]);
    if (rows.length === 0)
        return null;
    return {
        email: rows[0].email,
        access_token: rows[0].access_token,
        refresh_token: rows[0].refresh_token,
        scope: rows[0].scope,
        token_type: rows[0].token_type,
        expiry_date: rows[0].expiry_date ? Number(rows[0].expiry_date) : undefined
    };
}
// ----------------------------------------------------
// MÉTODOS PARA CONFIGURACIONES (APP SETTINGS)
// ----------------------------------------------------
export async function getSetting(key, defaultValue) {
    const sql = `SELECT value FROM app_settings WHERE key = $1`;
    const rows = await query(sql, [key]);
    if (rows.length === 0)
        return defaultValue;
    let val = rows[0].value;
    if (typeof val === 'string') {
        try {
            val = JSON.parse(val);
            if (typeof val === 'string') {
                val = JSON.parse(val);
            }
        }
        catch (e) { }
    }
    return val;
}
export async function saveSetting(key, value) {
    const sql = `
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = NOW();
  `;
    await query(sql, [key, JSON.stringify(value)]);
}
// ----------------------------------------------------
// MÉTODOS PARA HISTORIAL DE CHATS
// ----------------------------------------------------
let whatsappMessageIdColumnExists = null;
async function checkWhatsappMessageIdColumn() {
    if (whatsappMessageIdColumnExists !== null)
        return whatsappMessageIdColumnExists;
    try {
        // Intentar agregar la columna e índice de forma segura e idempotente si no existe
        await query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR;`);
        await query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_wam_id ON chat_messages(whatsapp_message_id);`);
        whatsappMessageIdColumnExists = true;
    }
    catch (err) {
        try {
            const res = await query(`SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'chat_messages' AND column_name = 'whatsapp_message_id';`);
            whatsappMessageIdColumnExists = res.length > 0;
        }
        catch {
            whatsappMessageIdColumnExists = false;
        }
    }
    return whatsappMessageIdColumnExists;
}
export async function isMessageAlreadyProcessed(whatsappMessageId) {
    if (!whatsappMessageId)
        return false;
    try {
        const hasColumn = await checkWhatsappMessageIdColumn();
        if (!hasColumn)
            return false;
        const res = await query('SELECT id FROM chat_messages WHERE whatsapp_message_id = $1 LIMIT 1', [whatsappMessageId]);
        return res.length > 0;
    }
    catch (err) {
        console.error('⚠️ Error verificando whatsapp_message_id en BD:', err);
        return false;
    }
}
export async function saveClientChatMessage(sessionId, sender, text, pushName, whatsappMessageId) {
    const hasCol = await checkWhatsappMessageIdColumn();
    if (hasCol && whatsappMessageId) {
        const sql = `
      INSERT INTO chat_messages (session_id, sender, message_text, chat_type, created_at, push_name, whatsapp_message_id)
      VALUES ($1, $2, $3, 'client', NOW(), $4, $5);
    `;
        await query(sql, [sessionId, sender, text, pushName || null, whatsappMessageId]);
    }
    else {
        const sql = `
      INSERT INTO chat_messages (session_id, sender, message_text, chat_type, created_at, push_name)
      VALUES ($1, $2, $3, 'client', NOW(), $4);
    `;
        await query(sql, [sessionId, sender, text, pushName || null]);
    }
}
export async function saveBossChatMessage(sessionId, sender, text, whatsappMessageId) {
    const hasCol = await checkWhatsappMessageIdColumn();
    if (hasCol && whatsappMessageId) {
        const sql = `
      INSERT INTO chat_messages (session_id, sender, message_text, chat_type, created_at, whatsapp_message_id)
      VALUES ($1, $2, $3, 'boss', NOW(), $4);
    `;
        await query(sql, [sessionId, sender, text, whatsappMessageId]);
    }
    else {
        const sql = `
      INSERT INTO chat_messages (session_id, sender, message_text, chat_type, created_at)
      VALUES ($1, $2, $3, 'boss', NOW());
    `;
        await query(sql, [sessionId, sender, text]);
    }
}
export async function searchClientes(searchTerm) {
    const sql = `
    SELECT id_cliente, nombre, rif, direccion, ubicacion, telefono_1, estatus, zona
    FROM clientes
    WHERE nombre ILIKE $1 
       OR RIF ILIKE $1 
       OR telefono_1 ILIKE $1
       OR contacto_1 ILIKE $1
    LIMIT 10;
  `;
    return query(sql, [`%${searchTerm}%`]);
}
// Inicializar la base de datos ejecutando schema.sql
export async function initDb() {
    try {
        console.log('🔄 Inicializando base de datos...');
        // Intentar buscar schema.sql en diferentes ubicaciones posibles
        let schemaPath = path.join(process.cwd(), 'server/schema.sql');
        if (!fs.existsSync(schemaPath)) {
            schemaPath = path.join(__dirname, '../server/schema.sql');
        }
        if (!fs.existsSync(schemaPath)) {
            schemaPath = path.join(__dirname, 'schema.sql');
        }
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`No se pudo encontrar schema.sql en ninguna ruta conocida.`);
        }
        console.log(`📖 Leyendo esquema desde: ${schemaPath}`);
        const sql = fs.readFileSync(schemaPath, 'utf8');
        // Ejecutar el script completo
        await query(sql);
        console.log('✅ Base de datos inicializada y migrada exitosamente.');
    }
    catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error.message || error);
        throw error;
    }
}
