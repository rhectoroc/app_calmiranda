process.env.TZ = 'America/Caracas';
import cron from 'node-cron';
import axios from 'axios';
import https from 'https';
import { getSheetsClient } from './googleAuth.js';
import { saveSetting, getSetting, query } from './db.js';
import { sendWhatsAppMessage } from './agent.js';
import { OpenAI } from 'openai';

// Configurar OpenAI configurado para DeepSeek
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || 'no-key-provided',
  baseURL: 'https://api.deepseek.com',
});

const GOOGLE_ACCOUNT_EMAIL = 'inversionesmiranda1311@gmail.com';

// Destinatarios de los reportes automatizados (Jefe de CalMiranda y Desarrollador)
const REPORT_RECIPIENTS = [
  process.env.WHATSAPP_REPORT_RECIPIENT || '584143078681@s.whatsapp.net', // Julio Borges (Jefe)
  '584140108030@s.whatsapp.net' // Desarrollador (Verificación)
];

async function sendReportToRecipients(text: string, reportName: string): Promise<void> {
  for (const jid of REPORT_RECIPIENTS) {
    try {
      await sendWhatsAppMessage(jid, text);
      console.log(`📤 [${reportName}] Enviado exitosamente a: ${jid}`);
    } catch (err: any) {
      console.error(`❌ [${reportName}] Error enviando a ${jid}:`, err.message || err);
    }
  }
}

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
    
    // 1. Extraer la tasa del dólar (soporta atributos como class="strong-tb" en el tag strong)
    const regexDolar = /<div id="dolar"[\s\S]*?<strong\b[^>]*>\s*([\d.,]+)\s*<\/strong>/i;
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
      range: '\'CUENTAS CAL MIRANDA\'!A1:Z200'
    });

    const rows = res.data.values || [];
    if (rows.length === 0) {
      throw new Error('La hoja CUENTAS CAL MIRANDA está vacía.');
    }

    // Convertir la matriz de filas a formato tabular delimitado por barras para preservar todas las columnas, montos y fechas
    const rawDataString = rows
      .filter(row => row && row.length > 0 && row.some(cell => cell && cell.toString().trim() !== ''))
      .map(row => row.map(cell => (cell ?? '').toString().trim()).join(' | '))
      .join('\n');

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

    // 3. Enviar mensaje de WhatsApp al Jefe y al Desarrollador
    await sendReportToRecipients(reportText, 'Reporte Financiero');
    
    // Registrar mensaje en base de datos para auditoría
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
    // 1. Obtener la tasa oficial del BCV (desde app_settings, scraping o Google Sheets)
    let bcvRate: any = await getSetting('bcv_rate', null);
    if (!bcvRate || !bcvRate.tasa) {
      try {
        await runTasaScraper();
        bcvRate = await getSetting('bcv_rate', null);
      } catch (e: any) {
        console.warn('⚠️ No se pudo obtener la tasa en caliente del BCV:', e.message || e);
      }
    }

    const sheets = await getSheetsClient(GOOGLE_ACCOUNT_EMAIL);
    if (!bcvRate || !bcvRate.tasa) {
      try {
        const tasaRes = await sheets.spreadsheets.values.get({
          spreadsheetId: '1_O58lqnRD0lk5vNJp3NLFOkv_jwmtbo-aQgGMy3rHkI',
          range: '\'Tasa\'!A1:B100'
        });
        const tasaRows = tasaRes.data.values || [];
        const lastRow = tasaRows[tasaRows.length - 1];
        if (lastRow && lastRow[1]) {
          bcvRate = { fecha: lastRow[0], tasa: parseFloat(String(lastRow[1]).replace(/\./g, '').replace(',', '.')) };
        }
      } catch (err: any) {
        console.warn('⚠️ No se pudo leer tasa de Google Sheets:', err.message || err);
      }
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: '1M7IoLTEhKPW2HUbwqBKptMG7ZaSdZhWoCT-3Ni0tgHE',
      range: '\'ACTUAL\'!A1:Z100'
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

    // Extraer número de tasa de forma segura
    let tasaNum = 0;
    if (bcvRate?.tasa) {
      if (typeof bcvRate.tasa === 'number') {
        tasaNum = bcvRate.tasa;
      } else {
        const cleaned = String(bcvRate.tasa).trim().replace(/\./g, '').replace(',', '.');
        tasaNum = parseFloat(cleaned);
      }
    }
    const tasaStr = tasaNum ? tasaNum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : 'No disponible';
    const tasaFecha = bcvRate?.fecha || 'Vigente';

    const systemPrompt = `Eres DIAMANTIN, Asistente Ejecutivo de Inversiones Miranda.
Tu tarea es leer los datos de la nómina semanal provista en formato CSV y generar un reporte ejecutivo CONCISO, BREVE y DIRECTO para el Jefe (Julio Borges).

TASA OFICIAL BCV DEL DÍA: ${tasaStr} Bs/USD (Fecha: ${tasaFecha}).

REGLAS ESTRICTAS DE FORMATO Y ESTILO:
1. PROHIBIDO USAR TABLAS MARKDOWN (|---|---|). En WhatsApp se leen mal e incómodas. Usa exclusivamente viñetas limpias.
2. Sé sumamente CONCISO y directo al grano. Sin párrafos largos de introducción ni notas explicativas adicionales.
3. Para CADA empleado, presenta en una sola línea su monto en Dólares y su equivalente calculado en Bolívares multiplicando el monto USD por la tasa BCV de ${tasaNum} Bs/USD.
   Ejemplo: • Pedrito: $30,00 (Bs. ${tasaNum ? (30 * tasaNum).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'})
4. Presenta los subtotales de cada sede tanto en USD como en Bs.
5. Presenta el Total General a Pagar en USD y en Bs.

PLANTILLA EXACTA A SEGUIR:

📊 NÓMINA SEMANAL - INVERSIONES MIRANDA
Jefe, buen día. Plan de pago de nómina para hoy:

📍 NÓMINA CARACAS:
• [Empleado 1]: $[Monto USD] (Bs. [Calculado])
• [Empleado 2]: $[Monto USD] (Bs. [Calculado])
Subtotal Caracas: $[Total USD] (Bs. [Total Bs])

📍 NÓMINA GUATIRE:
• [Empleado 1]: $[Monto USD] (Bs. [Calculado])
• [Empleado 2]: $[Monto USD] (Bs. [Calculado])
Subtotal Guatire: $[Total USD] (Bs. [Total Bs])

🎁 BONOS Y OTROS:
• [Empleado/Concepto 1]: $[Monto USD] (Bs. [Calculado])
• [Empleado/Concepto 2]: $[Monto USD] (Bs. [Calculado])
Subtotal Bonos: $[Total USD] (Bs. [Total Bs])

💰 TOTAL GENERAL A PAGAR:
• Total USD: $[Total consolidado USD]
• Total en Bolívares: Bs. [Total consolidado Bs]
• Tasa BCV Oficial: ${tasaStr} Bs/USD (${tasaFecha})

¿Autoriza proceder con los pagos, Jefe? Vamos Positivo.`;

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

    // Enviar por WhatsApp al Jefe y al Desarrollador
    await sendReportToRecipients(reportText, 'Reporte de Nómina');

    // Guardar el reporte en configuración para auditoría si es necesario
    await saveSetting('ultimo_reporte_nomina', { fecha: new Date().toLocaleDateString(), texto: reportText });

  } catch (error: any) {
    console.error('❌ Error en Reporte Semanal de Nómina:', error.message || error);
  }
}

// ----------------------------------------------------
// CRON 4: Cierre Diario Automático de Inventario (Daily at 6:00 PM / 18:00)
// ----------------------------------------------------
export async function runDailyInventoryClosing(): Promise<{ success: boolean; sedesProcessed: string[] }> {
  console.log('📦 [Auto-Cierre] Ejecutando cierre automático de inventario diario (6:00 PM Venezuela)...');
  const sedes = ['Hoyo de la Puerta', 'Guatire'];
  const processed: string[] = [];

  for (const sede of sedes) {
    try {
      // 1. Guardar la foto del día en inventario_historial (si ya existe un registro para hoy y esa sede, se actualiza)
      // Primero eliminamos snapshot previo de hoy para esta sede si existiera para evitar duplicados
      await query(`
        DELETE FROM inventario_historial 
        WHERE fecha = CURRENT_DATE AND sede = $1;
      `, [sede]);

      // Insertamos el snapshot actual
      await query(`
        INSERT INTO inventario_historial (fecha, sede, categoria, producto, stock_inicial, produccion, salidas, stock_final, closed_by)
        SELECT CURRENT_DATE, sede, categoria, producto, stock_inicial, produccion, salidas, (stock_inicial + produccion - salidas), 'Sistema (Auto-Cierre 6:00 PM)'
        FROM inventario
        WHERE sede = $1;
      `, [sede]);

      // 2. Trasladar stock actual a inicial y reiniciar movimientos a 0 para el siguiente día
      await query(`
        UPDATE inventario 
        SET stock_inicial = stock_inicial + produccion - salidas,
            produccion = 0,
            salidas = 0,
            updated_by = 'Sistema (Auto-Cierre 6:00 PM)',
            updated_at = NOW()
        WHERE sede = $1;
      `, [sede]);

      processed.push(sede);
      console.log(`✅ [Auto-Cierre] Cierre de inventario completado con éxito para: ${sede}`);
    } catch (err: any) {
      console.error(`❌ [Auto-Cierre] Error al cerrar inventario para ${sede}:`, err.message || err);
    }
  }

  return { success: true, sedesProcessed: processed };
}

// ----------------------------------------------------
// INICIALIZACIÓN DE PLANIFICADORES
// ----------------------------------------------------
export function initScheduler(): void {
  console.log('⏰ Inicializando cron scheduler del backend...');

  // BuscaTasa_Diamantin: Todos los días a las 9:00 AM (Hora de Caracas)
  cron.schedule('0 9 * * *', async () => {
    await runTasaScraper();
  }, {
    timezone: 'America/Caracas'
  });

  // Reporte Financiero: Lunes y Miércoles a las 10:00 AM (Hora de Caracas)
  cron.schedule('0 10 * * 1,3', async () => {
    await runFinancialReport();
  }, {
    timezone: 'America/Caracas'
  });

  // Reporte de Nómina: Viernes a las 9:00 AM (Hora de Caracas)
  cron.schedule('0 9 * * 5', async () => {
    await runNominaReport();
  }, {
    timezone: 'America/Caracas'
  });

  // Cierre Diario de Inventario: Todos los días a las 6:00 PM (18:00) (Hora de Caracas)
  cron.schedule('0 18 * * *', async () => {
    await runDailyInventoryClosing();
  }, {
    timezone: 'America/Caracas'
  });

  console.log('🚀 Schedulers registrados: BuscaTasa (9:00 AM diario), Reporte Financiero (Lunes/Miércoles 10:00 AM), Reporte de Nómina (Viernes 9:00 AM) y Cierre de Inventario (6:00 PM diario).');
}

