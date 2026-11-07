// Global State
let authState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  accessExp: null,
  refreshExp: null
};

let accessTimerInterval = null;
let refreshTimerInterval = null;

const STORAGE_KEY = 'auth_session_v2';

// Helper: JWT ni parse qilish
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Tokenni qisqartirib ko'rsatish
function truncateToken(token) {
  if (!token || token.length < 32) return token || '';
  return token.substring(0, 16) + '...' + token.substring(token.length - 12);
}

// Tab almashtirish (Register / Login)
function switchTab(tab) {
  const regBtn = document.getElementById('tabRegisterBtn');
  const loginBtn = document.getElementById('tabLoginBtn');
  const regForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');

  if (!regBtn || !loginBtn || !regForm || !loginForm) return;

  if (tab === 'register') {
    regBtn.classList.add('active');
    loginBtn.classList.remove('active');
    regForm.classList.add('active');
    loginForm.classList.remove('active');
  } else {
    loginBtn.classList.add('active');
    regBtn.classList.remove('active');
    loginForm.classList.add('active');
    regForm.classList.remove('active');
  }
}

// Konsolga log yozish (chiroyli, qisqartirilgan)
function addLog(type, title, payload) {
  const container = document.getElementById('consoleLogs');
  if (!container) return;

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-item ${type}`;

  let statusHtml = '';
  if (payload && payload.status) {
    statusHtml = `<span class="log-status status-${payload.status}">HTTP ${payload.status}</span>`;
  }

  // Log ichidagi uzun tokenlarni qisqartiramiz (ko'rinish chiroyli bo'lishi uchun)
  let cleanedPayload = payload;
  try {
    const str = JSON.stringify(payload);
    const obj = JSON.parse(str);
    if (obj?.response?.tokens?.accessToken) {
      obj.response.tokens.accessToken = truncateToken(obj.response.tokens.accessToken);
    }
    if (obj?.response?.tokens?.refreshToken) {
      obj.response.tokens.refreshToken = truncateToken(obj.response.tokens.refreshToken);
    }
    if (obj?.tokens?.accessToken) {
      obj.tokens.accessToken = truncateToken(obj.tokens.accessToken);
    }
    if (obj?.tokens?.refreshToken) {
      obj.tokens.refreshToken = truncateToken(obj.tokens.refreshToken);
    }
    cleanedPayload = obj;
  } catch (e) {}

  let jsonHtml = '';
  if (cleanedPayload) {
    jsonHtml = `<div class="log-json">${JSON.stringify(cleanedPayload, null, 2)}</div>`;
  }

  entry.innerHTML = `
    <div class="log-meta">
      <strong>${title}</strong>
      <span>${statusHtml} [${time}]</span>
    </div>
    ${jsonHtml}
  `;

  container.prepend(entry);
}

function clearLogs() {
  const container = document.getElementById('consoleLogs');
  if (container) {
    container.innerHTML = `
      <div class="log-item info">
        <div class="log-meta">
          <span>[Tozalandi]</span>
          <span>${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="log-text">Jurnal tozalandi.</div>
      </div>
    `;
  }
}

// Sessiyani o'rnatish
function setSession(user, tokens, saveToStorage = true) {
  authState.user = user;
  authState.accessToken = tokens.accessToken;
  authState.refreshToken = tokens.refreshToken;

  const accessPayload = parseJwt(tokens.accessToken);
  const refreshPayload = parseJwt(tokens.refreshToken);

  authState.accessExp = accessPayload ? accessPayload.exp * 1000 : Date.now() + 3 * 60 * 1000;
  authState.refreshExp = refreshPayload ? refreshPayload.exp * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;

  if (saveToStorage) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user,
      tokens
    }));
  }

  // DOM ko'rinishini almashtirish: Auth forms YASHIRILADI, Dashboard KO'RSATILADI
  const authSection = document.getElementById('authSection') || document.getElementById('authForms');
  const dashSection = document.getElementById('dashboardSection') || document.getElementById('userDashboard');

  if (authSection) {
    authSection.style.display = 'none';
    authSection.classList.add('hidden');
  }
  if (dashSection) {
    dashSection.style.display = 'flex';
    dashSection.classList.remove('hidden');
  }

  // Profil ma'lumotlarini to'ldirish
  const nameEl = document.getElementById('profileName');
  const emailEl = document.getElementById('profileEmail');
  const idEl = document.getElementById('profileId');
  const avatarEl = document.getElementById('userAvatar');

  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
  if (idEl) idEl.textContent = `ID: ${user.id}`;
  if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();

  // Token snippetlarni to'ldirish (qisqartirilgan)
  const accessPreview = document.getElementById('accessTokenPreview');
  const refreshPreview = document.getElementById('refreshTokenPreview');

  if (accessPreview) accessPreview.textContent = truncateToken(tokens.accessToken);
  if (refreshPreview) refreshPreview.textContent = truncateToken(tokens.refreshToken);

  startTimers();
}

// Sessiyani tozalash (Logout)
function clearSession() {
  authState = {
    user: null,
    accessToken: null,
    refreshToken: null,
    accessExp: null,
    refreshExp: null
  };

  clearInterval(accessTimerInterval);
  clearInterval(refreshTimerInterval);

  localStorage.removeItem(STORAGE_KEY);

  const authSection = document.getElementById('authSection') || document.getElementById('authForms');
  const dashSection = document.getElementById('dashboardSection') || document.getElementById('userDashboard');

  if (authSection) {
    authSection.style.display = 'block';
    authSection.classList.remove('hidden');
  }
  if (dashSection) {
    dashSection.style.display = 'none';
    dashSection.classList.add('hidden');
  }
}

// Jonli Taymerlar
function startTimers() {
  clearInterval(accessTimerInterval);
  clearInterval(refreshTimerInterval);

  const totalAccessDuration = 3 * 60 * 1000; // 3 daqiqa (180s)

  function updateAccessTimer() {
    const now = Date.now();
    const remaining = Math.max(0, authState.accessExp - now);
    const badge = document.getElementById('accessCountdown');
    const dot = document.getElementById('accessDot');
    const progress = document.getElementById('accessProgress');

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const percent = Math.min(100, Math.max(0, (remaining / totalAccessDuration) * 100));
    if (progress) progress.style.width = `${percent}%`;

    if (!badge || !dot) return;

    if (remaining <= 0) {
      badge.textContent = 'Muddati tugadi';
      badge.className = 'timer-badge expired';
      dot.className = 'status-dot red';
      if (progress) progress.style.backgroundColor = 'var(--danger)';
    } else if (remaining < 30000) { // < 30 soniya
      badge.textContent = formatted;
      badge.className = 'timer-badge';
      badge.style.color = 'var(--warning)';
      badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      dot.className = 'status-dot yellow';
      if (progress) progress.style.backgroundColor = 'var(--warning)';
    } else {
      badge.textContent = formatted;
      badge.className = 'timer-badge';
      badge.style.color = '#34d399';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      dot.className = 'status-dot green';
      if (progress) progress.style.backgroundColor = 'var(--success)';
    }
  }

  function updateRefreshTimer() {
    const now = Date.now();
    const remaining = Math.max(0, authState.refreshExp - now);
    const badge = document.getElementById('refreshCountdown');
    if (!badge) return;

    const days = Math.floor(remaining / (24 * 3600 * 1000));
    const hours = Math.floor((remaining % (24 * 3600 * 1000)) / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);

    if (remaining <= 0) {
      badge.textContent = 'Muddati tugadi';
      badge.className = 'timer-badge expired';
    } else {
      badge.textContent = `${days} kun ${hours}s ${mins}m`;
    }
  }

  updateAccessTimer();
  updateRefreshTimer();

  accessTimerInterval = setInterval(updateAccessTimer, 1000);
  refreshTimerInterval = setInterval(updateRefreshTimer, 10000);
}

// 1. REGISTRATION HANDLER
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    addLog(res.ok ? 'success' : 'error', 'POST /api/auth/register (Ro\'yxatdan o\'tish)', {
      status: res.status,
      response: data
    });

    if (res.ok) {
      setSession(data.user, data.tokens);
    } else {
      alert(data.message || 'Ro\'yxatdan o\'tishda xatolik!');
    }
  } catch (error) {
    addLog('error', 'POST /api/auth/register (Tarmoq xatosi)', { error: error.message });
  }
}

// 3. LOGIN HANDLER
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    addLog(res.ok ? 'success' : 'error', 'POST /api/auth/login (Kirish)', {
      status: res.status,
      response: data
    });

    if (res.ok) {
      setSession(data.user, data.tokens);
    } else {
      alert(data.message || 'Kirishda xatolik!');
    }
  } catch (error) {
    addLog('error', 'POST /api/auth/login (Tarmoq xatosi)', { error: error.message });
  }
}

// 7. REFRESH TOKEN HANDLER
async function handleRefreshToken() {
  if (!authState.refreshToken) {
    alert('Refresh token mavjud emas!');
    return;
  }

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: authState.refreshToken })
    });

    const data = await res.json();
    addLog(res.ok ? 'success' : 'warn', 'POST /api/auth/refresh (Tokenni yangilash)', {
      status: res.status,
      response: data
    });

    if (res.ok) {
      authState.accessToken = data.tokens.accessToken;
      if (data.tokens.refreshToken) {
        authState.refreshToken = data.tokens.refreshToken;
      }
      const accessPayload = parseJwt(authState.accessToken);
      authState.accessExp = accessPayload ? accessPayload.exp * 1000 : Date.now() + 3 * 60 * 1000;

      // LocalStorage-ni yangilash
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: authState.user,
        tokens: {
          accessToken: authState.accessToken,
          refreshToken: authState.refreshToken
        }
      }));

      const accessPreview = document.getElementById('accessTokenPreview');
      const refreshPreview = document.getElementById('refreshTokenPreview');
      if (accessPreview) accessPreview.textContent = truncateToken(authState.accessToken);
      if (refreshPreview) refreshPreview.textContent = truncateToken(authState.refreshToken);

      startTimers();
    } else {
      alert(data.message || 'Tokenni yangilab bo\'lmadi!');
    }
  } catch (error) {
    addLog('error', 'POST /api/auth/refresh (Tarmoq xatosi)', { error: error.message });
  }
}

// 4. LOGOUT HANDLER
async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: authState.refreshToken })
    });

    const data = await res.json();
    addLog('info', 'POST /api/auth/logout (Tizimdan chiqish)', {
      status: res.status,
      response: data
    });

    clearSession();
  } catch (error) {
    addLog('error', 'POST /api/auth/logout (Tarmoq xatosi)', { error: error.message });
    clearSession();
  }
}

// HIMOYALANGAN ROUTE TEKSHIRUVI (/profile)
async function fetchProfile() {
  if (!authState.accessToken) {
    alert('Access token mavjud emas!');
    return;
  }

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`
      }
    });

    const data = await res.json();
    const type = res.ok ? 'success' : (res.status === 401 ? 'warn' : 'error');
    addLog(type, 'GET /api/auth/profile (Himoyalangan API)', {
      status: res.status,
      response: data
    });

    if (res.status === 401 && data.code === 'TOKEN_EXPIRED') {
      alert('⚠️ Access Token muddati (3 daqiqa) tugagan!\n"Tokenni yangilash (/refresh)" tugmasini bosib yangilang.');
    }
  } catch (error) {
    addLog('error', 'GET /api/auth/profile (Tarmoq xatosi)', { error: error.message });
  }
}

// Tokenni nusxalash
function copyToken(type) {
  const token = type === 'accessToken' ? authState.accessToken : authState.refreshToken;
  if (!token) return;

  navigator.clipboard.writeText(token).then(() => {
    alert(`${type === 'accessToken' ? 'Access Token' : 'Refresh Token'} to'liq nusxalandi!`);
  }).catch(() => {
    prompt('Token:', token);
  });
}

// Sahifa yuklanganda saqlangan sessiyani tiklash
window.addEventListener('DOMContentLoaded', () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.user && parsed?.tokens) {
        setSession(parsed.user, parsed.tokens, false);
      }
    }
  } catch (e) {}
});
