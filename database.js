const fs = require('fs');

const DB_FILE = './database.json';

// LOAD
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({}));
    }

    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.error("❌ Error loadDB:", err);
    return {};
  }
}

// SAVE
function saveDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Error saveDB:", err);
  }
}

// GET USER
function getUser(id) {
  const db = loadDB();

  if (!db[id]) {
    db[id] = {
      gold: 100,
      exp: 0,
      level: 1,
      hewan: [],
      lastDaily: 0
    };
    saveDB(db);
  }

  return db[id];
}

// UPDATE USER
function updateUser(id, newData) {
  const db = loadDB();
  db[id] = newData;
  saveDB(db);
}

module.exports = {
  loadDB,
  saveDB,
  getUser,
  updateUser
};
