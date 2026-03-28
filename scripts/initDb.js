require('dotenv').config();
const pool = require('../src/config/db');

const createSchema = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Inicializando base de datos...');

    await client.query(`
      CREATE TYPE IF NOT EXISTS user_role AS ENUM ('admin', 'user');
    `).catch(() => {
      // El tipo ya existe, ignorar error
    });

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        nombre     VARCHAR(100)        NOT NULL,
        email      VARCHAR(255)        NOT NULL UNIQUE,
        password   VARCHAR(255)        NOT NULL,
        rol        VARCHAR(10)         NOT NULL DEFAULT 'user'
                     CHECK (rol IN ('admin', 'user')),
        created_at TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ         NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS set_updated_at ON users;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);

    console.log('✅ Tabla "users" creada correctamente.');
    console.log('✅ Trigger updated_at configurado.');
  } catch (err) {
    console.error('❌ Error al inicializar la BD:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

createSchema();
