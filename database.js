const fs = require("fs");

const FILE = "./database.json";

let data = {};

if (fs.existsSync(FILE)) {
  data = JSON.parse(fs.readFileSync(FILE));
}

function save() {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  get(id, key) {
    return data[id]?.[key];
  },

  set(id, key, value) {
    if (!data[id]) data[id] = {};
    data[id][key] = value;
    save();
  },

  add(id, key, value) {
    if (!data[id]) data[id] = {};
    if (!data[id][key]) data[id][key] = 0;
    data[id][key] += value;
    save();
  },

  all() {
    return data;
  }
};
