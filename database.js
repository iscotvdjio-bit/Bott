const fs   = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "db.json");

function load() {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

const db = {
  get(userId, key) {
    const data = load();
    return data[userId]?.[key] ?? null;
  },

  set(userId, key, value) {
    const data = load();
    if (!data[userId]) data[userId] = {};
    data[userId][key] = value;
    save(data);
  },

  add(userId, key, amount) {
    const data = load();
    if (!data[userId]) data[userId] = {};
    data[userId][key] = (data[userId][key] || 0) + amount;
    save(data);
  },

  all() {
    return load();
  }
};

module.exports = db;
