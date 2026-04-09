const fs = require("fs");
const path = "./database.json";

let data = {};

// load awal
if (fs.existsSync(path)) {
  data = JSON.parse(fs.readFileSync(path));
}

// save function
function save() {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

module.exports = {
  get(id, key) {
    if (!data[id]) return null;
    return data[id][key] || 0;
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
