import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS inventario (
    id SERIAL PRIMARY KEY,
    sede VARCHAR(50) NOT NULL,
    producto VARCHAR(100) NOT NULL,
    realizadas INTEGER DEFAULT 0,
    vacias INTEGER DEFAULT 0,
    total INTEGER GENERATED ALWAYS AS (realizadas + vacias) STORED,
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
