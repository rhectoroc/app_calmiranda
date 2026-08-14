import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
});

const data = [
  // Actualización al cierre de la semana 14/08/2026
  { sede: 'Hoyo de la Puerta', categoria: 'Producto Terminado', producto: 'Pipotes Cal en Pasta 270kg', stock_inicial: 121 },
  { sede: 'Hoyo de la Puerta', categoria: 'Producto Terminado', producto: 'Bolsas de Cal en Pasta 7kg', stock_inicial: 299 },
  { sede: 'Hoyo de la Puerta', categoria: 'Producto Terminado', producto: 'Bolsas de Cal en Pasta 5kg', stock_inicial: 541 },
  
  // Agregamos los nuevos productos con stock 0 inicial
  { sede: 'Hoyo de la Puerta', categoria: 'Insumos y Muestrarios', producto: 'Bolsas Rotas de 7kg', stock_inicial: 0 },
  { sede: 'Hoyo de la Puerta', categoria: 'Insumos y Muestrarios', producto: 'Bolsas Rotas de 5kg', stock_inicial: 0 }
];

async function seed() {
  try {
    for (const item of data) {
      await pool.query(`
        INSERT INTO inventario (sede, categoria, producto, stock_inicial, entradas, salidas, updated_at)
        VALUES ($1, $2, $3, $4, 0, 0, NOW())
        ON CONFLICT (sede, producto) DO UPDATE
        SET stock_inicial = EXCLUDED.stock_inicial,
            updated_at = NOW();
      `, [item.sede, item.categoria, item.producto, item.stock_inicial]);
    }
    console.log('✅ Base de datos actualizada con los saldos del CSV más reciente.');
  } catch (err) {
    console.error('❌ Error poblado db:', err);
  } finally {
    pool.end();
  }
}

seed();
