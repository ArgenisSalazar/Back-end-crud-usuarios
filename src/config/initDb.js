const pool = require('./db');

const initDb = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Verificando esquema de base de datos...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        nombre     VARCHAR(100)  NOT NULL,
        email      VARCHAR(255)  NOT NULL UNIQUE,
        password   VARCHAR(255)  NOT NULL,
        rol        VARCHAR(10)   NOT NULL DEFAULT 'user'
                     CHECK (rol IN ('admin', 'user')),
        created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
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

    console.log('✅ Esquema de base de datos listo.');
  } catch (err) {
    console.error('❌ Error al inicializar la BD:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = initDb;
