const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "donations.json");

function load() {
if (!fs.existsSync(FILE)) return { donors: [], lastReset: null, month: getCurrentMonth() };
try {
return JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
return { donors: [], lastReset: null, month: getCurrentMonth() };
}
}

function save(data) {
const dir = path.dirname(FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(data, null, 2), "utf8");
}

function getCurrentMonth() {
return new Date().toLocaleString("id-ID", { month: "long", year: "numeric" });
}

const donate = {
getTop(limit = 10) {
const data = load();
return [...data.donors].sort((a, b) => b.total - a.total).slice(0, limit);
},
add(name, amount, source = "manual") {
const data = load();
const existing = data.donors.find(d => d.name.toLowerCase() === name.toLowerCase());
if (existing) {
existing.total += amount;
existing.source = source;
} else {
data.donors.push({ name, total: amount, source });
}
save(data);
},
set(name, amount, source = "manual") {
const data = load();
const existing = data.donors.find(d => d.name.toLowerCase() === name.toLowerCase());
if (existing) {
existing.total = amount;
existing.source = source;
} else {
data.donors.push({ name, total: amount, source });
}
save(data);
},
remove(name) {
const data = load();
const before = data.donors.length;
data.donors = data.donors.filter(d => d.name.toLowerCase() !== name.toLowerCase());
save(data);
return data.donors.length < before;
},
reset() {
save({ donors: [], lastReset: Date.now(), month: getCurrentMonth() });
},
getMonth() {
return load().month || getCurrentMonth();
},
setMonth(month) {
const data = load();
data.month = month;
save(data);
}
};

module.exports = donate;
