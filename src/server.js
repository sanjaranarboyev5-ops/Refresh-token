const app = require('./app');
const config = require('./config');

let currentPort = Number(config.port) || 5000;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log('====================================================');
    console.log(`🚀 Authentication Server muvaffaqiyatli ishga tushdi!`);
    console.log(`🌐 URL (Web UI): http://localhost:${port}`);
    console.log(`📄 API Endpoint: http://localhost:${port}/api/auth`);
    console.log('----------------------------------------------------');
    console.log('📋 Checklist status:');
    console.log(' 1. [x] Registration: Name, Email, Password');
    console.log(' 2. [x] JWT Token yaratish (HMAC-SHA256)');
    console.log(' 3. [x] Login: Email va Password orqali');
    console.log(' 4. [x] Logout: Tizimdan chiqish & Revocation');
    console.log(` 5. [x] Access Token muddati: ${config.jwt.accessExpiresIn} (3 daqiqa)`);
    console.log(` 6. [x] Refresh Token muddati: ${config.jwt.refreshExpiresIn} (1 hafta)`);
    console.log(' 7. [x] Refresh Token orqali Access Tokenni yangilash');
    console.log('====================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} band. Keyingi port ${port + 1} sinab ko'rilmoqda...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(currentPort);


