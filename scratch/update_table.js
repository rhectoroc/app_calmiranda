import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
});

const sql = `
DROP TABLE IF EXISTS inventario;
CREATE TABLE inventario (
    id SERIAL PRIMARY KEY,
    sede VARCHAR(50) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    producto VARCHAR(100) NOT NULL,
    stock_inicial INTEGER DEFAULT 0,
    entradas INTEGER DEFAULT 0,
    salidas INTEGER DEFAULT 0,
    stock_actual INTEGER GENERATED ALWAYS AS (stock_inicial + entradas - salidas) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_sede_producto UNIQUE (sede, producto)
);
`;

pool.query(sql, (err, res) => {
  if (err) {
    console.error('Error creating table', err);
  } else {
    console.log('Table created successfully.');
  }
  pool.end();
});
