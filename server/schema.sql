-- ===========================================================================
-- SCHEMA INITIALIZATION FOR CALMIRANDA DATABASE
-- Contiene las tablas existentes e integraciones para el backend de la app.
-- ===========================================================================

-- 1. SECUENCIAS EXISTENTES
CREATE SEQUENCE IF NOT EXISTS chat_boss_id_seq;
CREATE SEQUENCE IF NOT EXISTS n8n_chat_histories_id_seq;
CREATE SEQUENCE IF NOT EXISTS clientes_id_cliente_seq;

-- 2. TABLA: clientes
-- Almacena la información de los clientes, zonas, contactos y estados de negociación.
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente VARCHAR NOT NULL DEFAULT nextval('clientes_id_cliente_seq'::regclass),
    zona VARCHAR NOT NULL,
    nombre VARCHAR NOT NULL,
    rif VARCHAR,
    direccion TEXT,
    ubicacion VARCHAR,
    contacto_1 VARCHAR,
    telefono_1 VARCHAR,
    movil VARCHAR,
    telefono_2 VARCHAR,
    contacto_2 VARCHAR,
    telefono_3 VARCHAR,
    email VARCHAR,
    estatus VARCHAR DEFAULT 'Activo'::character varying,
    vendedor VARCHAR,
    tiempo_promedio_pedido VARCHAR,
    historial_negociacion TEXT,
    comentario TEXT,
    ultimo_precio NUMERIC,
    dias_credito INTEGER DEFAULT 0,
    ultima_llamada TIMESTAMP WITHOUT TIME ZONE,
    proxima_llamada TIMESTAMP WITHOUT TIME ZONE,
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente)
);

-- 3. TABLA: chat_boss
-- Registro histórico de conversaciones del agente con los administradores (Jefes).
CREATE TABLE IF NOT EXISTS chat_boss (
    id INTEGER NOT NULL DEFAULT nextval('chat_boss_id_seq'::regclass),
    session_id VARCHAR NOT NULL,
    message JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chat_boss_pkey PRIMARY KEY (id)
);

-- 4. TABLA: n8n_chat_histories
-- Historial heredado de chats del flujo de n8n para el bot de atención a clientes.
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
    id INTEGER NOT NULL DEFAULT nextval('n8n_chat_histories_id_seq'::regclass),
    session_id VARCHAR NOT NULL,
    message JSONB NOT NULL,
    CONSTRAINT n8n_chat_histories_pkey PRIMARY KEY (id)
);

-- ===========================================================================
-- TABLAS ADICIONALES PARA LA INTEGRACIÓN DE LA APP WEB Y BACKEND
-- ===========================================================================

-- 5. TABLA: google_tokens
-- Guarda las credenciales OAuth refresh_token para conectar Gmail, Calendar y Sheets sin archivos .env locales.
CREATE TABLE IF NOT EXISTS google_tokens (
    email VARCHAR PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    scope TEXT,
    token_type VARCHAR,
    expiry_date BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA: app_settings
-- Almacena parámetros globales de la aplicación configurables desde la interfaz (Tasas, estado del bot, etc.).
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA: users
-- Almacena los usuarios autorizados para ingresar a la aplicación web (Administradores y Empleados).
-- Nota: Esta tabla es independiente de la tabla 'clientes', la cual contiene información comercial valiosa.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    nombre VARCHAR NOT NULL,
    rol VARCHAR NOT NULL CHECK (rol IN ('admin', 'empleado')) DEFAULT 'empleado',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. DATOS SEMILLA (SEED DATA)
-- Registra o actualiza el usuario administrador por defecto
INSERT INTO users (email, password_hash, nombre, rol)
VALUES ('rhectoroc@gmail.com', '$2b$10$vNeEjCUQ0uZC5T.wulHhuuSyWEQCySueqOuTOl9e43lekPYdv57V2', 'Hector Ollarves', 'admin')
ON CONFLICT (email) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    password_hash = EXCLUDED.password_hash,
    rol = EXCLUDED.rol;


