require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET || 'default_access_secret_key_3m',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'default_refresh_secret_key_7d',
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '3m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
  }
};

