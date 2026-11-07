const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '../../data');
const usersFilePath = path.join(dataDir, 'users.json');

// Ensure data directory and users.json exist
function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify([], null, 2), 'utf-8');
  }
}

function getUsers() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(usersFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveUsers(users) {
  ensureStorage();
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
}

const UserModel = {
  findByEmail(email) {
    const users = getUsers();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },

  findById(id) {
    const users = getUsers();
    return users.find((u) => u.id === id);
  },

  create({ name, email, password }) {
    const users = getUsers();
    const newUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password, // hashed password
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
  }
};

module.exports = UserModel;

