const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const TokenModel = require('../models/tokenModel');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/tokenUtils');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 kun
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
};

// 1. REGISTRATION
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Validatsiya
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email va password maydonlari to\'ldirilishi shart.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email formati noto\'g\'ri.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak.'
      });
    }

    // Foydalanuvchi mavjudligini tekshirish
    const existingUser = UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email orqali allaqachon ro\'yxatdan o\'tilgan.'
      });
    }

    // Parolni xesh qilish (bcrypt)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Foydalanuvchini saqlash
    const newUser = UserModel.create({
      name,
      email,
      password: hashedPassword
    });

    // 2. JWT TOKENLARNI YARATISH (Access 3m, Refresh 7d)
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Refresh tokenni serverda saqlash
    TokenModel.save(newUser.id, refreshToken);

    // Refresh tokenni HTTP-only cookie-ga yozish
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: 'Foydalanuvchi muvaffaqiyatli ro\'yxatdan o\'tdi.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt
      },
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: '3 minutes (3m)',
        refreshTokenExpiresIn: '7 days (7d)'
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Serverda xatolik yuz berdi.'
    });
  }
}

// 3. LOGIN
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email va password kiritilishi shart.'
      });
    }

    const user = UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email yoki parol noto\'g\'ri.'
      });
    }

    // Parolni solishtirish
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email yoki parol noto\'g\'ri.'
      });
    }

    // Yangi tokenlar yaratish
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh tokenni saqlash
    TokenModel.save(user.id, refreshToken);

    // Refresh tokenni HTTP-only cookie-ga yozish
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Tizimga muvaffaqiyatli kirdingiz.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: '3 minutes (3m)',
        refreshTokenExpiresIn: '7 days (7d)'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Serverda xatolik yuz berdi.'
    });
  }
}

// 7. REFRESH TOKEN ORQALI ACCESS TOKENNI YANGILASH
async function refreshToken(req, res) {
  try {
    // Cookie yoki JSON body orqali qabul qilish
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token topilmadi. Iltimos, tizimga qayta kiring.'
      });
    }

    // Serverdagi bazada bu refresh token mavjudligini tekshirish
    const tokenExists = TokenModel.exists(incomingRefreshToken);
    if (!tokenExists) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token yaroqsiz yoki allaqachon bekor qilingan (revoked).'
      });
    }

    // JWT ni tekshirish
    let decoded;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch (err) {
      // Yaroqsiz yoki muddati o'tgan bo'lsa, bazadan o'chirib tashlaymiz
      TokenModel.remove(incomingRefreshToken);
      res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);

      return res.status(403).json({
        success: false,
        message: 'Refresh token muddati tugagan (7 kun o\'tdi) yoki yaroqsiz.'
      });
    }

    // Foydalanuvchini topish
    const user = UserModel.findById(decoded.id);
    if (!user) {
      TokenModel.remove(incomingRefreshToken);
      res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    // 5. Yangi Access Token (3 daqiqa) yaratish
    const newAccessToken = generateAccessToken(user);

    // Refresh Token Rotation: eski tokenni o'chirib, yangisini berish
    TokenModel.remove(incomingRefreshToken);
    const newRefreshToken = generateRefreshToken(user);
    TokenModel.save(user.id, newRefreshToken);

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Access token muvaffaqiyatli yangilandi (3 daqiqaga uzaytirildi).',
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessTokenExpiresIn: '3 minutes (3m)',
        refreshTokenExpiresIn: '7 days (7d)'
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Serverda xatolik yuz berdi.'
    });
  }
}

// 4. LOGOUT (Tizimdan chiqish)
async function logout(req, res) {
  try {
    const tokenToRevoke =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (tokenToRevoke) {
      // Refresh tokenni bazadan o'chirish (bekor qilish)
      TokenModel.remove(tokenToRevoke);
    }

    // Cookie-ni tozalash
    res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Tizimdan muvaffaqiyatli chiqildi. Refresh token bekor qilindi.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Serverda xatolik yuz berdi.'
    });
  }
}

// HIMOYALANGAN ROUTE: Foydalanuvchi ma'lumotlarini olish (Access Token 3m tekshiruvi)
async function getProfile(req, res) {
  try {
    const user = UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Himoyalangan ma\'lumotlar muvaffaqiyatli olindi.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      tokenDecoded: req.user
    });
  } catch (error) {
    console.error('Profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Serverda xatolik yuz berdi.'
    });
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile
};
