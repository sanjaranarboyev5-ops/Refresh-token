const http = require('http');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Test muvaffaqiyatsiz: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Checklist testlarini boshlash...\n');

  // Start test server on random port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Test User';
  let accessToken = '';
  let refreshToken = '';

  try {
    // 1. REGISTRATION TEST
    console.log('▶ 1. Registration — Name, Email, Password');
    const regRes = await request('POST', '/api/auth/register', {
      name: testName,
      email: testEmail,
      password: testPassword
    });
    assert(regRes.status === 201, `Status 201 bo'lishi kerak, lekin ${regRes.status} keldi`);
    assert(regRes.body.success === true, 'Registration success true bo\'lishi kerak');
    assert(regRes.body.user.name === testName, 'Foydalanuvchi ismi to\'g\'ri kelmadi');
    assert(regRes.body.user.email === testEmail, 'Email to\'g\'ri kelmadi');
    assert(!regRes.body.user.password, 'Parol javobda qaytmasligi kerak');
    assert(regRes.body.tokens.accessToken, 'Access Token qaytishi kerak');
    assert(regRes.body.tokens.refreshToken, 'Refresh Token qaytishi kerak');
    console.log('   ✅ 1. Registration muvaffaqiyatli o\'tdi!');

    // 2. JWT TOKEN TEKSHIRUVI
    console.log('\n▶ 2. JWT Token — Token tuzilishi va imzolanishi');
    accessToken = regRes.body.tokens.accessToken;
    refreshToken = regRes.body.tokens.refreshToken;

    const decodedAccess = jwt.verify(accessToken, config.jwt.accessSecret);
    const decodedRefresh = jwt.verify(refreshToken, config.jwt.refreshSecret);
    assert(decodedAccess.email === testEmail, 'Access Token ichida email mavjud');
    assert(decodedRefresh.id === regRes.body.user.id, 'Refresh Token ichida user id mavjud');
    console.log('   ✅ 2. JWT Token yaratish va verifikatsiyasi to\'g\'ri!');

    // 5. ACCESS TOKEN MUDDATI (3 daqiqa)
    console.log('\n▶ 5. Access Token — 3 daqiqa (3m) muddati tekshiruvi');
    const accessTtl = decodedAccess.exp - decodedAccess.iat;
    assert(accessTtl === 3 * 60, `Access token 180s (3m) bo'lishi kerak, lekin ${accessTtl}s`);
    console.log(`   ✅ 5. Access Token muddati aniq 3 daqiqa (${accessTtl} sekund)!`);

    // 6. REFRESH TOKEN MUDDATI (1 hafta - 7 kun)
    console.log('\n▶ 6. Refresh Token — 1 hafta (7d) muddati tekshiruvi');
    const refreshTtl = decodedRefresh.exp - decodedRefresh.iat;
    assert(refreshTtl === 7 * 24 * 60 * 60, `Refresh token 604800s (7d) bo'lishi kerak, lekin ${refreshTtl}s`);
    console.log(`   ✅ 6. Refresh Token muddati aniq 7 kun (${refreshTtl} sekund / 1 hafta)!`);

    // 3. LOGIN TEST
    console.log('\n▶ 3. Login — Email va Password orqali kirish');
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword
    });
    assert(loginRes.status === 200, `Login status 200 bo'lishi kerak, lekin ${loginRes.status}`);
    assert(loginRes.body.tokens.accessToken, 'Login javobida yangi accessToken bo\'lishi kerak');
    assert(loginRes.body.tokens.refreshToken, 'Login javobida yangi refreshToken bo\'lishi kerak');
    accessToken = loginRes.body.tokens.accessToken;
    refreshToken = loginRes.body.tokens.refreshToken;

    // Noto'g'ri parol tekshiruvi
    const wrongLoginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'noto\'g\'ri_parol'
    });
    assert(wrongLoginRes.status === 401, 'Noto\'g\'ri parol 401 qaytarishi kerak');
    console.log('   ✅ 3. Login tekshiruvlari muvaffaqiyatli!');

    // ACCESS TOKEN BILAN HIMOYALANGAN ROUTE TESTI
    console.log('\n▶ Himoyalangan endpoint (/profile) tekshiruvi');
    const profileRes = await request('GET', '/api/auth/profile', null, {
      'Authorization': `Bearer ${accessToken}`
    });
    assert(profileRes.status === 200, 'Himoyalangan route 200 qaytarishi kerak');
    assert(profileRes.body.user.email === testEmail, 'Profile ma\'lumoti to\'g\'ri');
    console.log('   ✅ Himoyalangan route Access Token orqali muvaffaqiyatli ochildi!');

    // 7. REFRESH TOKEN ORQALI ACCESS TOKENNI YANGILASH TESTI
    console.log('\n▶ 7. Refresh Token orqali Access Tokenni yangilash');
    const refreshRes = await request('POST', '/api/auth/refresh', {
      refreshToken: refreshToken
    });
    assert(refreshRes.status === 200, `Refresh status 200 bo'lishi kerak, lekin ${refreshRes.status}`);
    assert(refreshRes.body.tokens.accessToken, 'Yangi accessToken qaytishi kerak');
    const newAccessToken = refreshRes.body.tokens.accessToken;

    // Yangi access token bilan himoyalangan routeni tekshirish
    const newProfileRes = await request('GET', '/api/auth/profile', null, {
      'Authorization': `Bearer ${newAccessToken}`
    });
    assert(newProfileRes.status === 200, 'Yangi access token bilan profile ochilishi kerak');
    console.log('   ✅ 7. Refresh Token orqali yangi Access Token muvaffaqiyatli olindi va ishlayapti!');

    // 4. LOGOUT TEST
    console.log('\n▶ 4. Logout — Tizimdan chiqish');
    const activeRefreshToken = refreshRes.body.tokens.refreshToken || refreshToken;
    const logoutRes = await request('POST', '/api/auth/logout', {
      refreshToken: activeRefreshToken
    });
    assert(logoutRes.status === 200, 'Logout 200 qaytarishi kerak');

    // Logout dan so'ng bekor qilingan refresh token bilan qayta yangilashga urinish
    const revokedRefreshRes = await request('POST', '/api/auth/refresh', {
      refreshToken: activeRefreshToken
    });
    assert(revokedRefreshRes.status === 403, 'Bekor qilingan refresh token 403 Forbidden qaytarishi kerak');
    console.log('   ✅ 4. Logout muvaffaqiyatli o\'tdi va Refresh Token bazadan bekor qilindi!');

    console.log('\n========================================================');
    console.log('🎉 BARCHA 7 TA CHECKLIST TALABLARI 100% MUVAFFAQIYATLI!');
    console.log('========================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

