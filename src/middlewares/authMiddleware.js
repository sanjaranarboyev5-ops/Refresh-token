const jwt = require('jsonwebtoken');
const { verifyAccessToken } = require('../utils/tokenUtils');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Support both "Bearer <token>" and raw token
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token taqdim etilmadi. Iltimos, tizimga kiring.'
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: "Access token muddati tugagan (3 daqiqa o'tdi). Refresh token orqali yangilang.",
        expiredAt: error.expiredAt
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Yaroqsiz access token (Invalid token).'
    });
  }
}

module.exports = {
  authenticateToken
};

