const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { register, login, getMe, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['vendor', 'customer']).withMessage('Invalid role'),
], register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], login);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
