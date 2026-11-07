# Authentication System — Access & Refresh Token

Ushbu loyiha Node.js va Express asosida yaratilgan to'liq va xavfsiz autentifikatsiya tizimi bo'lib, taqdim etilgan **7 ta checklist talabini 100% to'liq qamrab oladi**:

---

## 📋 Checklist Bajarilishi

| # | Talab | Amalga oshirilgan usul | Endpoint |
|---|-------|------------------------|----------|
| **1** | **Registration** — Name, Email, Password | Parol `bcryptjs` (saltRounds=10) orqali xeshlanadi, email va ma'lumotlar tekshiriladi | `POST /api/auth/register` |
| **2** | **JWT Token** — Token yaratish | `jsonwebtoken` kutubxonasi yordamida HMAC-SHA256 imzosi bilan generatsiya qilinadi | Server Utilities (`tokenUtils.js`) |
| **3** | **Login** — Email va Password orqali kirish | `bcrypt.compare` orqali tekshirilib, yangi Access va Refresh tokenlar beriladi | `POST /api/auth/login` |
| **4** | **Logout** — Tizimdan chiqish | Refresh Token bazadan o'chiriladi (revocation) va HTTP-only Cookie tozalanadi | `POST /api/auth/logout` |
| **5** | **Access Token** — 3 daqiqa (3m) | `expiresIn: '3m'` muddati bilan yaratiladi va `authenticateToken` orqali himoyalanadi | Himoyalangan endpointlar (`/api/auth/profile`) |
| **6** | **Refresh Token** — 1 hafta (7d) | `expiresIn: '7d'` (604800s) muddati bilan yaratiladi va xavfsiz saqlanadi | Cookie va JSON orqali |
| **7** | **Tokenni Yangilash** — Refresh orqali | Refresh token tekshirilib, yangi 3 daqiqalik Access Token chiqarib beriladi | `POST /api/auth/refresh` |

---

## 📁 Loyiha Tuzilishi

```text
Refresh token/
├── .env                  # Maxfiy kalitlar va sozlamalar
├── .env.example          # Namuna sozlamalar
├── package.json          # Loyiha qaramliklari va skriptlar
├── public/               # Zamonaviy Sinov Veb-Interfeysi (Web UI)
│   ├── index.html        # HTML sahifa
│   ├── style.css         # Zamonaviy Dark-mode dizayn
│   └── app.js            # Real-time taymerlar (3m va 7d) va API chaqiruvlari
├── src/
│   ├── config/
│   │   └── index.js      # Konfiguratsiya va JWT sozlamalari
│   ├── controllers/
│   │   └── authController.js # Register, Login, Refresh, Logout mantiqi
│   ├── middlewares/
│   │   └── authMiddleware.js # Access token tekshiruvchi middleware (3m)
│   ├── models/
│   │   ├── userModel.js  # Foydalanuvchilar ma'lumotlar ombori
│   │   └── tokenModel.js # Faol Refresh tokenlar ombori (Revocation uchun)
│   ├── routes/
│   │   └── authRoutes.js # API marshrutlari
│   ├── utils/
│   │   └── tokenUtils.js # JWT yaratish va tekshirish yordamchilari
│   ├── app.js            # Express ilovasi sozlamalari
│   └── server.js         # Serverni ishga tushiruvchi fayl
└── tests/
    └── auth.test.js      # Barcha 7 ta talabni tekshiruvchi avtomatlashgan test
```

---

## 🚀 Ishga Tushirish

### 1. Qaramliklarni o'rnatish
```bash
npm install
```

### 2. Serverni ishga tushirish
```bash
npm start
```
*yoki o'zgarishlarni avtomatik kuzatish bilan (development):*
```bash
npm run dev
```

Server ishga tushgach:
- 🌐 **Veb-Interfeys**: [http://localhost:3000](http://localhost:3000)
- 📄 **API Asosi**: `http://localhost:3000/api/auth`

---

## 🖥️ Vizual Sinov Veb-Interfeysi (Dashboard)

Brauzeringizda [http://localhost:3000](http://localhost:3000) manzilini oching. Unda:
1. **Ro'yxatdan o'tish (Register)** va **Kirish (Login)** formalari mavjud.
2. Tizimga kirganingizda:
   - **Access Token uchun 3 daqiqalik jonli gerontologik teskari taymer (03:00 -> 00:00)** va progress-bar ishlaydi.
   - **Refresh Token uchun 7 kunlik taymer** ko'rsatiladi.
   - **"🛡️ Himoyalangan API (/profile)"** tugmasi orqali tokenning 3 daqiqa davomida ishlashi, 3 daqiqadan so'ng esa `TOKEN_EXPIRED` (401) holatiga o'tishi ko'rinadi.
   - **"🔄 Tokenni yangilash (/refresh)"** tugmasini bosish orqali yangi Access Token olinib, taymer qaytadan `03:00` ga o'rnatiladi.
   - **"🚪 Chiqish (Logout)"** tugmasi Refresh tokenni bekor qiladi va tizimdan chiqaradi.
   - O'ng tomonda barcha so'rov va javoblar (Request & Response) real vaqtda chiroyli JSON ko'rinishida jurnallanadi.

---

## 🧪 Avtomatlashgan Testlarni Ishga Tushirish

Loyihaning barcha 7 ta talabi bo'yicha to'liq testni ishga tushirish uchun:

```bash
npm test
```

Test barcha talablarni ketma-ket avtomatik tekshirib, quyidagi hisobotni beradi:
```text
🧪 Checklist testlarini boshlash...

▶ 1. Registration — Name, Email, Password
   ✅ 1. Registration muvaffaqiyatli o'tdi!

▶ 2. JWT Token — Token tuzilishi va imzolanishi
   ✅ 2. JWT Token yaratish va verifikatsiyasi to'g'ri!

▶ 5. Access Token — 3 daqiqa (3m) muddati tekshiruvi
   ✅ 5. Access Token muddati aniq 3 daqiqa (180 sekund)!

▶ 6. Refresh Token — 1 hafta (7d) muddati tekshiruvi
   ✅ 6. Refresh Token muddati aniq 7 kun (604800 sekund / 1 hafta)!

▶ 3. Login — Email va Password orqali kirish
   ✅ 3. Login tekshiruvlari muvaffaqiyatli!

▶ Himoyalangan endpoint (/profile) tekshiruvi
   ✅ Himoyalangan route Access Token orqali muvaffaqiyatli ochildi!

▶ 7. Refresh Token orqali Access Tokenni yangilash
   ✅ 7. Refresh Token orqali yangi Access Token muvaffaqiyatli olindi va ishlayapti!

▶ 4. Logout — Tizimdan chiqish
   ✅ 4. Logout muvaffaqiyatli o'tdi va Refresh Token bazadan bekor qilindi!

========================================================
🎉 BARCHA 7 TA CHECKLIST TALABLARI 100% MUVAFFAQIYATLI!
========================================================
```

---

## 📡 API Hujjatlari & cURL Misollari

### 1. Ro'yxatdan o'tish (Registration)
- **URL**: `POST /api/auth/register`
- **Body**:
```json
{
  "name": "Ali Valiyev",
  "email": "ali@example.com",
  "password": "Password123"
}
```
- **cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Ali Valiyev\",\"email\":\"ali@example.com\",\"password\":\"Password123\"}"
```

### 2. Tizimga kirish (Login)
- **URL**: `POST /api/auth/login`
- **Body**:
```json
{
  "email": "ali@example.com",
  "password": "Password123"
}
```
- **cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ali@example.com\",\"password\":\"Password123\"}"
```

### 3. Himoyalangan Ma'lumotlarni Olish (Access Token 3m)
- **URL**: `GET /api/auth/profile`
- **Headers**: `Authorization: Bearer <ACCESS_TOKEN>`
- **cURL**:
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer <SIZNING_ACCESS_TOKENINGIZ>"
```

### 4. Access Tokenni Yangilash (Refresh Token 7d orqali)
- **URL**: `POST /api/auth/refresh`
- **Body**:
```json
{
  "refreshToken": "<SIZNING_REFRESH_TOKENINGIZ>"
}
```
*(yoki HTTP-Only Cookie orqali avtomatik jo'natiladi)*
- **cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"<SIZNING_REFRESH_TOKENINGIZ>\"}"
```

### 5. Tizimdan chiqish (Logout)
- **URL**: `POST /api/auth/logout`
- **Body**:
```json
{
  "refreshToken": "<SIZNING_REFRESH_TOKENINGIZ>"
}
```
- **cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"<SIZNING_REFRESH_TOKENINGIZ>\"}"
```

