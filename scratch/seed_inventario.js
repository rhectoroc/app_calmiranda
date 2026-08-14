import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
});

const data = [
  { sede: 'Hoyo de la Puerta', categoria: 'Producto Terminado', producto: 'Pipotes Cal en Pasta 270kg', stock_inicial: 36 },
  { sede: 'Hoyo de la Puerta', categoria: 'Producto Terminado', producto: 'Bolsas de Cal en Pasta 7kg', stock_inicial: 376 },
  { sede: 'Hoyo de la Puerta', categoria: 'Producto Terminado', producto: 'Bolsas de Cal en Pasta 5kg', stock_inicial: 82 },
  { sede: 'Hoyo de la Puerta', categoria: 'Producto Terminado', producto: 'Pinturas Ecológicas', stock_inicial: 31 },
  
  { sede: 'Hoyo de la Puerta', categoria: 'Canto Rodado', producto: 'Gris #1 (6kg)', stock_inicial: 0 },
  { sede: 'Hoyo de la Puerta', categoria: 'Canto Rodado', producto: 'Gris #1 (20kg)', stock_inicial: 0 },
  { sede: 'Hoyo de la Puerta', categoria: 'Canto Rodado', producto: 'Rojo #3', stock_inicial: 0 },
  { sede: 'Hoyo de la Puerta', categoria: 'Canto Rodado', producto: 'Piedra', stock_inicial: 0 },
  
  { sede: 'Hoyo de la Puerta', categoria: 'Insumos y Muestrarios', producto: 'Pipotes Vacíos', stock_inicial: 84 },
  { sede: 'Hoyo de la Puerta', categoria: 'Insumos y Muestrarios', producto: 'Pipotes Muestrarios Grandes', stock_inicial: 0 },
  { sede: 'Hoyo de la Puerta', categoria: 'Insumos y Muestrarios', producto: 'Pipotes Muestrarios Pequeños', stock_inicial: 1 },
  { sede: 'Hoyo de la Puerta', categoria: 'Insumos y Muestrarios', producto: 'Bolsas de 7kg (Vacías)', stock_inicial: 0 },
  { sede: 'Hoyo de la Puerta', categoria: 'Insumos y Muestrarios', producto: 'Bolsas Sello Original', stock_inicial: 0 },
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
    console.log('✅ Base de datos poblada con éxito con los datos del CSV.');
  } catch (err) {
    console.error('❌ Error poblado db:', err);
  } finally {
    pool.end();
  }
}

seed();
