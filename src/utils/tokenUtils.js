const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Access Token yaratish (3 daqiqa)
 * @param {Object} user 
 * @returns {string} JWT Access Token
 */
function generateAccessToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn // '3m'
  });
}

/**
 * Refresh Token yaratish (1 hafta - 7 kun)
 * @param {Object} user 
 * @returns {string} JWT Refresh Token
 */
function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    email: user.email
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn // '7d'
  });
}

/**
 * Access Tokenni tekshirish
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Refresh Tokenni tekshirish
 * @param {string} token 
 * @returns {Object} Decoded payload
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};

