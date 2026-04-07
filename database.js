const fs = require("fs");

let db = {};

if (fs.existsSync("./database.json")) {
  db = JSON.parse(fs.readFileSync("./database.json"));
}

// ===== AUTO SAVE TIAP 5 DETIK =====
setInterval(() => {
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));
}, 5000);

module.exports = {
  get(id, key) {
    if (!db[id]) db[id] = {};
    return db[id][key] || 0;
  },

  set(id, key, value) {
    if (!db[id]) db[id] = {};
    db[id][key] = value;
  },

  add(id, key, value) {
    if (!db[id]) db[id] = {};
    db[id][key] = (db[id][key] || 0) + value;
  },

  all() {
    return db;
  }
};
