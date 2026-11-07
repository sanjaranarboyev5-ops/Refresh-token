const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const tokensFilePath = path.join(dataDir, 'refreshTokens.json');

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(tokensFilePath)) {
    fs.writeFileSync(tokensFilePath, JSON.stringify([], null, 2), 'utf-8');
  }
}

function getTokens() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(tokensFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveTokens(tokens) {
  ensureStorage();
  fs.writeFileSync(tokensFilePath, JSON.stringify(tokens, null, 2), 'utf-8');
}

const TokenModel = {
  save(userId, token) {
    const tokens = getTokens();
    const tokenRecord = {
      userId,
      token,
      createdAt: new Date().toISOString()
    };
    tokens.push(tokenRecord);
    saveTokens(tokens);
    return tokenRecord;
  },

  exists(token) {
    const tokens = getTokens();
    return tokens.some((t) => t.token === token);
  },

  remove(token) {
    const tokens = getTokens();
    const filtered = tokens.filter((t) => t.token !== token);
    saveTokens(filtered);
    return filtered.length < tokens.length;
  },

  removeAllForUser(userId) {
    const tokens = getTokens();
    const filtered = tokens.filter((t) => t.userId !== userId);
    saveTokens(filtered);
  }
};

module.exports = TokenModel;

