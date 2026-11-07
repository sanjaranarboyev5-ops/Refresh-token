const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// 1 & 2. Ro'yxatdan o'tish va Tokenlar yaratish
router.post('/register', authController.register);

// 3. Login - Email va Parol orqali kirish
router.post('/login', authController.login);

// 7. Refresh Token orqali Access Tokenni yangilash
router.post('/refresh', authController.refreshToken);

// 4. Logout - Tizimdan chiqish (Tokenni bekor qilish)
router.post('/logout', authController.logout);

// 5. Access Token (3m) orqali himoyalangan route
router.get('/profile', authenticateToken, authController.getProfile);
router.get('/me', authenticateToken, authController.getProfile);

module.exports = router;

