import cron from 'node-cron';
import axios from 'axios';
import https from 'https';
import { getSheetsClient } from './googleAuth.js';
import { saveSetting, getSetting } from './db.js';
import { sendWhatsAppMessage } from './agent.js';
import { OpenAI } from 'openai';

// Configurar OpenAI configurado para DeepSeek
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || 'no-key-provided',
  baseURL: 'https://api.deepseek.com',
});

const GOOGLE_ACCOUNT_EMAIL = 'inversionesmiranda1311@gmail.com';
const JULIO_WHATSAPP_JID = '584143078681@s.whatsapp.net';

// ----------------------------------------------------
// CRON 1: BuscaTasa_Diamantin (Daily at 9:00 AM)
// ----------------------------------------------------
export async function runTasaScraper(): Promise<void> {
  console.log('⏳ Iniciando scraping de tasa de cambio de bcv.org.ve...');
  try {
    const response = await axios.get('https://www.bcv.org.ve', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 15000
    });
    
    const html = response.data;
    
    // 1. Extraer la tasa del dólar
    const regexDolar = /<div id="dolar"[\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i;
    const matchTasa = html.match(regexDolar);
    if (!matchTasa || !matchTasa[1]) {
      throw new Error('No se pudo encontrar la tasa del dólar en el HTML del BCV.');
    }
    const tasaString = matchTasa[1].replace(/\./g, '').replace(',', '.');
    const tasaNumerica = parseFloat(tasaString);

    // 2. Extraer la fecha de vigencia (formato ISO completo)
    const regexFecha = /<div id="dolar"[\s\S]*?Fecha Valor:[\s\S]*?content="([^"]+)"/i;
    const matchFecha = html.match(regexFecha);
    if (!matchFecha || !matchFecha[1]) {
      throw new Error('No se pudo encontrar la fecha de vigencia en el HTML del BCV.');
    }
    const fechaVigenciaISO = matchFecha[1]; // ej: 2026-05-21T12:00:00

    // 3. Formatear la fecha a DD/MM/YYYY
    const soloFecha = fechaVigenciaISO.split('T')[0];
    const partesFecha = soloFecha.split('-');
    let fechaFormateada = soloFecha;
    if (partesFecha.length === 3) {
      fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
    }

    console.log(`✅ Tasa obtenida: ${tasaNumerica} Bs. (Vigencia: ${fechaFormateada})`);

    // Guardar en app_settings
    await saveSetting('bcv_rate', { tasa: tasaNumerica, fecha: fechaFormateada });

    // Escribir en Google Sheets
    // Spreadsheet ID: 1_O58lqnRD0lk5vNJp3NLFOkv_jwmtbo-aQgGMy3rHkI | Hoja: Tasa
    const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
    await sheets.spreadsheets.values.append({
      spreadsheetId: '1_O58lqnRD0lk5vNJp3NLFOkv_jwmtbo-aQgGMy3rHkI',
      range: '\'Tasa\'!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[fechaFormateada, tasaNumerica.toString()]]
      }
    });
    console.log('📊 Tasa registrada exitosamente en Google Sheets.');
  } catch (error: any) {
    console.error('❌ Error en BuscaTasa_Diamantin:', error.message || error);
  }
}

// ----------------------------------------------------
// CRON 2: Reporte Financiero Diario (Mon/Wed at 10:00 AM)
// ----------------------------------------------------
export async function runFinancialReport(): Promise<void> {
  console.log('⏳ Iniciando compilación de Reporte Financiero Diario...');
  try {
    // 1. Leer Google Sheets
    // Spreadsheet ID: 1oXz8Irdev0T6WVRmbL4tRfeQtCCm66DaDzFhk0-vBXM | Hoja: CUENTAS CAL MIRANDA
    const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1oXz8Irdev0T6WVRmbL4tRfeQtCCm66DaDzFhk0-vBXM',
      range: '\'CUENTAS CAL MIRANDA\'!A1:H100'
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      throw new Error('La hoja CUENTAS CAL MIRANDA está vacía.');
    }

    // Convertir filas a formato clave-valor para facilitar análisis
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    const rawDataString = JSON.stringify(data);

    // 2. Generar el reporte usando DeepSeek
    const systemPrompt = `Eres DIAMANTIN, Asistente Ejecutivo de Inversiones Miranda.
Tu tarea es leer los datos de "CUENTAS EN TRÁNSITO" a primera hora de la mañana y darle al Jefe un reporte de acción rápida.
El objetivo principal es mostrarle qué se debe cobrar y pagar HOY para que él pueda delegarlo inmediatamente al personal administrativo.

REGLAS ESTRICTAS:
1. Extrae los totales exactos en USD.
2. Identifica las prioridades: busca las cuentas que estén por vencer hoy, mañana, o que ya estén vencidas.
3. Sé extremadamente breve. Usa EXACTAMENTE la plantilla de abajo.

PLANTILLA EXACTA OBLIGATORIA:

☀️ INFORMATIVO: Jefe, buen día. Plan de acción de Cuentas en Tránsito para delegar hoy.

🎯 PRIORIDAD DE COBRO: 
• [Nombre del cliente 1] - [Monto USD] (Vence: [Fecha o "Vencido"])
• [Nombre del cliente 2] - [Monto USD] (Vence: [Fecha o "Vencido"])
*(Si no hay urgencias, escribe: "Sin cobros críticos para hoy")*

💸 PAGOS PENDIENTES:
• [Nombre del proveedor 1] - [Monto USD] (Vence: [Fecha o "Vencido"])
*(Si no hay urgencias, escribe: "Sin pagos críticos para hoy")*

📊 BALANCE GLOBAL:
• Por Cobrar (CXC): [Total USD]
• Por Pagar (CXP): [Total USD]
• Arena/Pego (Cobrar): [Total USD]

¿Desea que pase estas directrices al equipo administrativo? Vamos Positivo.`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Por favor, analiza estos datos crudos del sistema contable y genera el informe:\n\n${rawDataString}` }
      ],
      temperature: 0.3
    });

    const reportText = response.choices[0].message.content || '';

    if (!reportText) {
      throw new Error('DeepSeek no devolvió contenido para el informe.');
    }

    console.log('📈 Reporte financiero generado exitosamente.');

    // 3. Enviar mensaje de WhatsApp al Jefe (Julio)
    await sendWhatsAppMessage(JULIO_WHATSAPP_JID, reportText);
    
    // Registrar mensaje en base de datos como conversación con el jefe
    const cleanNumber = JULIO_WHATSAPP_JID.split('@')[0];
    await saveSetting('ultimo_reporte_financiero', { fecha: new Date().toLocaleDateString(), texto: reportText });

  } catch (error: any) {
    console.error('❌ Error en Reporte Financiero Diario:', error.message || error);
  }
}

// ----------------------------------------------------
// CRON 3: Reporte Semanal de Nómina (Friday at 9:00 AM)
// ----------------------------------------------------
export async function runNominaReport(): Promise<void> {
  console.log('⏳ Iniciando compilación de Reporte Semanal de Nómina...');
  try {
    const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1M7IoLTEhKPW2HUbwqBKptMG7ZaSdZhWoCT-3Ni0tgHE',
      range: 'A1:H100'
    });
    const rows = res.data.values || [];
    if (rows.length === 0) {
      throw new Error('La hoja de nómina está vacía.');
    }

    const csvData = rows.map(row => 
      row.map(val => {
        const cellStr = String(val).replace(/"/g, '""');
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    const systemPrompt = `Eres DIAMANTIN, Asistente Ejecutivo de Inversiones Miranda.
Tu tarea es leer los datos de la hoja de nómina semanal provista en formato CSV y generar un reporte ejecutivo estructurado para el Jefe (Julio Borges).

El reporte debe incluir la siguiente información de forma clara y profesional:
1. Resumen de Nómina Caracas (listar empleados y montos correspondientes en USD y Bs).
2. Resumen de Nómina Guatire (listar empleados y montos correspondientes en USD y Bs).
3. Resumen de Bonos y Otros (listar conceptos/empleados y montos correspondientes en USD y Bs).
4. Totales generales a pagar resumidos en Dólares (USD) y en Bolívares (Bs.S) utilizando la tasa oficial de cambio indicada en la misma hoja.

REGLAS DE FORMATO:
- Sé sumamente profesional, claro y ordenado.
- Utiliza emojis apropiados para estructurar y dar formato amigable en WhatsApp.
- Empieza con un saludo al Jefe (Julio Borges).
- Finaliza el reporte con el grito de guerra del bot: "¡Vamos positivo!".`;

    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Por favor, analiza estos datos en formato CSV de la nómina y genera el informe:\n\n${csvData}` }
      ],
      temperature: 0.3
    });

    const reportText = response.choices[0].message.content || '';

    if (!reportText) {
      throw new Error('DeepSeek no devolvió contenido para el reporte de nómina.');
    }

    console.log('📊 Reporte de nómina generado exitosamente.');

    // Enviar por WhatsApp a Julio Borges
    await sendWhatsAppMessage(JULIO_WHATSAPP_JID, reportText);

    // Guardar el reporte en configuración para auditoría si es necesario
    await saveSetting('ultimo_reporte_nomina', { fecha: new Date().toLocaleDateString(), texto: reportText });

  } catch (error: any) {
    console.error('❌ Error en Reporte Semanal de Nómina:', error.message || error);
  }
}

// ----------------------------------------------------
// INICIALIZACIÓN DE PLANIFICADORES
// ----------------------------------------------------
export function initScheduler(): void {
  console.log('⏰ Inicializando cron scheduler del backend...');

  // BuscaTasa_Diamantin: Todos los días a las 9:00 AM (Hora de Caracas)
  // Nota: Las zonas horarias de Easypanel/VPS suelen estar en UTC. Ajustamos a UTC si es necesario, 
  // pero node-cron corre en la hora del sistema por defecto.
  // 9:00 AM en Venezuela (UTC-4) equivale a 1:00 PM UTC.
  // Si configuramos para Venezuela:
  cron.schedule('0 9 * * *', async () => {
    await runTasaScraper();
  }, {
    timezone: 'America/Caracas'
  });

  // Reporte Financiero: Lunes y Miércoles a las 10:00 AM (Hora de Caracas)
  // 10:00 AM en Venezuela equivale a 2:00 PM UTC.
  cron.schedule('0 10 * * 1,3', async () => {
    await runFinancialReport();
  }, {
    timezone: 'America/Caracas'
  });

  // Reporte de Nómina: Viernes a las 9:00 AM (Hora de Caracas)
  // 9:00 AM en Venezuela equivale a 1:00 PM UTC.
  cron.schedule('0 9 * * 5', async () => {
    await runNominaReport();
  }, {
    timezone: 'America/Caracas'
  });

  console.log('🚀 Schedulers registrados: BuscaTasa (9:00 AM diario), Reporte Financiero (Lunes/Miércoles 10:00 AM) y Reporte de Nómina (Viernes 9:00 AM).');
}
