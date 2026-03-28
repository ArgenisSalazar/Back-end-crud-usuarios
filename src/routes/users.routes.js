const { Router } = require('express');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/users.controller');
const {
  createUserRules,
  updateUserRules,
  idParamRule,
} = require('../middleware/validate');

const router = Router();

/**
 * @route   GET /api/users
 * @desc    Listar usuarios (con paginación y filtros)
 * @query   page, limit, rol, search
 */
router.get('/', getUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Obtener un usuario por ID
 */
router.get('/:id', idParamRule, getUserById);

/**
 * @route   POST /api/users
 * @desc    Crear un nuevo usuario
 * @body    { nombre, email, password, rol? }
 */
router.post('/', createUserRules, createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Actualizar un usuario (campos opcionales)
 * @body    { nombre?, email?, password?, rol? }
 */
router.put('/:id', updateUserRules, updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Eliminar un usuario
 */
router.delete('/:id', idParamRule, deleteUser);

module.exports = router;
