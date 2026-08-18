-- ===========================================================================
-- SCHEMA INITIALIZATION FOR CALMIRANDA DATABASE
-- Contiene las tablas existentes e integraciones para el backend de la app.
-- ===========================================================================

-- 1. SECUENCIAS EXISTENTES
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
    estatus VARCHAR DEFAULT ''::character varying,
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

-- 3. TABLA: chat_messages
-- Registro histórico unificado de conversaciones (tanto para clientes como para administradores/jefes).
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL,
    sender VARCHAR NOT NULL, -- 'user', 'bot', 'agent'
    message_text TEXT NOT NULL,
    chat_type VARCHAR NOT NULL DEFAULT 'client', -- 'client' o 'boss'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_type ON chat_messages(chat_type);

-- Migración segura de datos heredados desde las tablas antiguas (Removida por el usuario)


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
    rol VARCHAR NOT NULL CHECK (rol IN ('admin', 'superadmin', 'operador')) DEFAULT 'operador',
    permisos JSONB DEFAULT '["dashboard", "customer-service", "clientes", "inventario", "productos"]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. DATOS SEMILLA (SEED DATA)
-- Registra o actualiza el usuario administrador por defecto
INSERT INTO users (email, password_hash, nombre, rol)
VALUES ('rhectoroc@gmail.com', '$2b$10$8VHYaB7PROf/yJJ3PIfZFeNKayqOCZ5bi1Z/hB92XcUKeSzYBrZYC', 'Hector Ollarves', 'superadmin')
ON CONFLICT (email) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    password_hash = EXCLUDED.password_hash,
    rol = EXCLUDED.rol;

-- Semilla de app_settings para las reglas extras de los bots y estado global
INSERT INTO app_settings (key, value)
VALUES 
  ('extra_rules_bot', '""'::jsonb),
  ('extra_rules_assistant', '""'::jsonb),
  ('global_bot_disabled', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- 9. MIGRACIONES DE ACTUALIZACIÓN
-- Asegurar que la columna push_name existe en chat_messages para guardar el nombre de perfil de WhatsApp
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS push_name VARCHAR;

-- 10. MIGRACIONES DE ROLES DE USUARIOS
-- Cambiar el rol por defecto en la tabla users
ALTER TABLE users ALTER COLUMN rol SET DEFAULT 'operador';

-- Actualizar roles heredados de 'empleado' a 'operador'
UPDATE users SET rol = 'operador' WHERE rol = 'empleado';

-- Reemplazar la restricción check anterior por la nueva que admite superadmin y operador
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_rol_check;
ALTER TABLE users ADD CONSTRAINT users_rol_check CHECK (rol IN ('admin', 'superadmin', 'operador'));

-- 11. MIGRACIÓN DE ESTATUS DE CLIENTES Y NUEVA COLUMNA ETIQUETA
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS etiqueta VARCHAR DEFAULT '';

-- Migrar etiquetas de bot que se hayan guardado en estatus
UPDATE clientes SET etiqueta = 'Otros' WHERE estatus = 'Ignorar Bot';
UPDATE clientes SET etiqueta = estatus WHERE estatus IN ('Empleado', 'Transportista', 'Otros');

-- Restaurar/Mantener estatus comercial de clientes (si quedaron vacíos o tienen etiquetas de bot, ponerles 'Activo')
UPDATE clientes SET estatus = 'Activo' WHERE estatus IS NULL OR estatus = '' OR estatus IN ('Empleado', 'Transportista', 'Otros');



-- ===========================================================================
-- TABLA: inventario_historial
-- Almacena la foto del inventario al momento de ejecutar un "Cierre de Día"
-- ===========================================================================
CREATE TABLE IF NOT EXISTS inventario_historial (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    sede VARCHAR(100) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    producto VARCHAR(255) NOT NULL,
    stock_inicial NUMERIC(10,2) DEFAULT 0,
    produccion NUMERIC(10,2) DEFAULT 0,
    salidas NUMERIC(10,2) DEFAULT 0,
    stock_final NUMERIC(10,2) DEFAULT 0,
    closed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================================
-- TABLA: productos
-- Almacena la lista de productos para el catálogo y el módulo de inventario.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    categoria VARCHAR(100) NOT NULL,
    sku VARCHAR(50),
    tipo_medida VARCHAR(50),
    peso NUMERIC DEFAULT 0,
    presentacion VARCHAR(50),
    precio NUMERIC DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'Activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================================================
-- TABLA: inventario
-- Almacena el stock actual por sede
-- ===========================================================================
CREATE TABLE IF NOT EXISTS inventario (
    id SERIAL PRIMARY KEY,
    sede VARCHAR(100) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    producto VARCHAR(255) NOT NULL,
    stock_inicial NUMERIC(10,2) DEFAULT 0,
    produccion NUMERIC(10,2) DEFAULT 0,
    salidas NUMERIC(10,2) DEFAULT 0,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sede, producto)
);

-- Seed Initial Products (to maintain Inventario history)
INSERT INTO productos (nombre, categoria, sku, peso, presentacion, estado)
VALUES 
  ('Pipotes Cal en Pasta 270kg', 'Producto Terminado', 'PCP-270', 270, 'Pipote', 'Activo'),
  ('Bolsas de Cal en Pasta 7kg', 'Producto Terminado', 'BCP-007', 7, 'Bolsa', 'Activo'),
  ('Bolsas de Cal en Pasta 5kg', 'Producto Terminado', 'BCP-005', 5, 'Bolsa', 'Activo'),
  ('Pinturas Ecológicas', 'Producto Terminado', 'PNT-ECO', 0, 'Galón/Cuñete', 'Activo'),
  ('Gris #1 (6kg)', 'Canto Rodado', 'CR-G1-06', 6, 'Bolsa', 'Activo'),
  ('Gris #1 (20kg)', 'Canto Rodado', 'CR-G1-20', 20, 'Saco', 'Activo'),
  ('Rojo #3', 'Canto Rodado', 'CR-R3', 0, 'Granel/Saco', 'Activo'),
  ('Piedra', 'Canto Rodado', 'CR-PIE', 0, 'Granel', 'Activo'),
  ('Pipotes Vacíos', 'Insumos y Muestrarios', 'INS-PIPV', 0, 'Unidad', 'Activo'),
  ('Pipotes Muestrarios Grandes', 'Insumos y Muestrarios', 'INS-PMG', 0, 'Unidad', 'Activo'),
  ('Pipotes Muestrarios Pequeños', 'Insumos y Muestrarios', 'INS-PMP', 0, 'Unidad', 'Activo'),
  ('Bolsas de 7kg (Vacías)', 'Insumos y Muestrarios', 'INS-B7V', 0, 'Unidad', 'Activo'),
  ('Bolsas Sello Original', 'Insumos y Muestrarios', 'INS-BSO', 0, 'Unidad', 'Activo'),
  ('Bolsas Rotas de 7kg', 'Insumos y Muestrarios', 'INS-BR7', 0, 'Unidad', 'Activo'),
  ('Bolsas Rotas de 5kg', 'Insumos y Muestrarios', 'INS-BR5', 0, 'Unidad', 'Activo')
ON CONFLICT (nombre) DO NOTHING;
