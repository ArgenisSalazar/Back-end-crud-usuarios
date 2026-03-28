const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// Campos seguros a devolver (sin password)
const SAFE_FIELDS = 'id, nombre, email, rol, created_at, updated_at';

// ─── GET /users ────────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, rol, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (rol) {
      params.push(rol);
      conditions.push(`rol = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(nombre ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit));
    params.push(offset);

    const { rows: users } = await pool.query(
      `SELECT ${SAFE_FIELDS} FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM users ${where}`,
      countParams
    );

    res.json({
      data: users,
      meta: {
        total: parseInt(count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// ─── GET /users/:id ────────────────────────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT ${SAFE_FIELDS} FROM users WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
};

// ─── POST /users ───────────────────────────────────────────────────────────────
const createUser = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'user' } = req.body;

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, rounds);

    const { rows } = await pool.query(
      `INSERT INTO users (nombre, email, password, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SAFE_FIELDS}`,
      [nombre, email.toLowerCase().trim(), hashedPassword, rol]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      data: rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
};

// ─── PUT /users/:id ────────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, rol } = req.body;

    // Verificar que el usuario exista
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );
    if (!existing.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const fields = [];
    const params = [];

    if (nombre !== undefined) {
      params.push(nombre);
      fields.push(`nombre = $${params.length}`);
    }
    if (email !== undefined) {
      params.push(email.toLowerCase().trim());
      fields.push(`email = $${params.length}`);
    }
    if (password !== undefined) {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
      const hashed = await bcrypt.hash(password, rounds);
      params.push(hashed);
      fields.push(`password = $${params.length}`);
    }
    if (rol !== undefined) {
      params.push(rol);
      fields.push(`rol = $${params.length}`);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar' });
    }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')}
       WHERE id = $${params.length}
       RETURNING ${SAFE_FIELDS}`,
      params
    );

    res.json({
      message: 'Usuario actualizado exitosamente',
      data: rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El email ya está en uso' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
};

// ─── DELETE /users/:id ─────────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `DELETE FROM users WHERE id = $1 RETURNING ${SAFE_FIELDS}`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      message: 'Usuario eliminado exitosamente',
      data: rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
