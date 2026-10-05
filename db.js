
import {Pool} from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:4067@localhost:5432/project_db'
});

async function initDB() {
  const query = `
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      date TIMESTAMPTZ NOT NULL
    );
  `;
  await pool.query(query);

}

export { pool, initDB };