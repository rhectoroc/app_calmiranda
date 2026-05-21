import { google } from 'googleapis';
import { getGoogleTokens, saveGoogleTokens } from './db.js';

// Inicializar variables de entorno para Google OAuth
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://app.calmiranda.com/api/auth/google/callback';

export function createOAuth2Client() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Las variables GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no están configuradas.');
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// Scopes necesarios para acceder a Sheets, Gmail y Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email'
];

// Generar URL de autorización de Google
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Imprescindible para obtener el refresh_token
    prompt: 'consent',      // Forza la ventana de consentimiento para garantizar recibir el refresh_token
    scope: SCOPES
  });
}

// Intercambiar el código por tokens y guardar en base de datos
export async function saveTokensFromCode(code: string): Promise<string> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Obtener el correo electrónico del usuario logueado
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email;

  if (!email) {
    throw new Error('No se pudo obtener el correo de la cuenta de Google.');
  }

  // Guardar tokens en base de datos
  await saveGoogleTokens({
    email,
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    scope: tokens.scope || undefined,
    token_type: tokens.token_type || undefined,
    expiry_date: tokens.expiry_date || undefined
  });

  return email;
}

// Obtener un cliente OAuth2 completamente autenticado y auto-refrescante
export async function getAuthenticatedClient(email: string) {
  const tokens = await getGoogleTokens(email);
  if (!tokens) {
    throw new Error(`No se encontraron tokens de Google registrados para el correo: ${email}`);
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date
  });

  // Escuchar cuando el token se refresque automáticamente
  oauth2Client.on('tokens', async (newTokens) => {
    console.log(`🔄 Tokens de Google refrescados para ${email}`);
    await saveGoogleTokens({
      email,
      access_token: newTokens.access_token!,
      refresh_token: newTokens.refresh_token || tokens.refresh_token, // n8n o google a veces no mandan refresh_token de nuevo
      scope: newTokens.scope || tokens.scope || undefined,
      token_type: newTokens.token_type || tokens.token_type || undefined,
      expiry_date: newTokens.expiry_date || undefined
    });
  });

  return oauth2Client;
}

// ----------------------------------------------------
// HELPERS PARA ACCEDER A LOS SERVICIOS DE GOOGLE
// ----------------------------------------------------

// Obtener cliente de Google Sheets
export async function getSheetsClient(email: string) {
  const auth = await getAuthenticatedClient(email);
  return google.sheets({ version: 'v4', auth });
}

// Obtener cliente de Gmail
export async function getGmailClient(email: string) {
  const auth = await getAuthenticatedClient(email);
  return google.gmail({ version: 'v1', auth });
}

// Obtener cliente de Google Calendar
export async function getCalendarClient(email: string) {
  const auth = await getAuthenticatedClient(email);
  return google.calendar({ version: 'v3', auth });
}
