const fs = require("fs");
const FILE = "./database.json";

function load() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, "{}");
  return JSON.parse(fs.readFileSync(FILE));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function get(user, key) {
  const data = load();
  return data[user]?.[key] || 0;
}

function set(user, key, value) {
  const data = load();
  if (!data[user]) data[user] = {};
  data[user][key] = value;
  save(data);
}

function add(user, key, value) {
  const data = load();
  if (!data[user]) data[user] = {};
  if (!data[user][key]) data[user][key] = 0;
  data[user][key] += value;
  save(data);
}

function all() {
  return load();
}

module.exports = { get, set, add, all };
