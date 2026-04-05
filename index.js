require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const db = require("./database");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ]
});

const prefix = "!";
const LINE = "━━━━━━━━━━━━━━";

// ===== ANTI KAYA =====
function antiRich(points) {
  if (points >= 20000) return 0.3;
  if (points >= 10000) return 0.5;
  if (points >= 5000) return 0.7;
  if (points >= 2000) return 0.85;
  return 1;
}

// ===== HEWAN =====
const animals = [
  { name: "🐱 Kucing", value: 50 },
  { name: "🐶 Anjing", value: 50 },
  { name: "🦊 Rubah", value: 150 },
  { name: "🐼 Panda", value: 200 },
  { name: "🐲 Naga", value: 500 }
];

// ===== MESSAGE =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const id = msg.author.id;
  const now = Date.now();

  // ===== CHAT SYSTEM =====
  const lastChat = db.get(id, "lastChat") || 0;

  if (now - lastChat > 8000) {
    db.set(id, "lastChat", now);

    let p = db.get(id, "points");
    let mult = antiRich(p);

    db.add(id, "points", Math.floor(5 * mult));
    db.add(id, "chat", 1);

    if (msg.attachments.size > 0)
      db.add(id, "points", Math.floor(15 * mult));

    if (msg.reference)
      db.add(id, "points", Math.floor(10 * mult));
  }

  if (!msg.content.startsWith(prefix)) return;

  const args = msg.content.slice(1).split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ===== DAILY =====
  if (cmd === "daily") {
    const last = db.get(id, "daily");

    if (now - last < 86400000)
      return msg.reply("💠 Sudah claim");

    db.set(id, "daily", now);
    db.add(id, "points", 1000);

    msg.reply("💠 +1000 Vibe");
  }

  // ===== WEEKLY =====
  if (cmd === "weekly") {
    const last = db.get(id, "weekly");

    if (now - last < 604800000)
      return msg.reply("💠 Sudah claim");

    db.set(id, "weekly", now);
    db.add(id, "points", 3000);

    msg.reply("💠 +3000 Vibe");
  }

  // ===== HUNT =====
  if (cmd === "hunt") {
    const last = db.get(id, "hunt");

    if (now - last < 180000)
      return msg.reply("⏳ Tunggu 3 menit");

    db.set(id, "hunt", now);

    if (Math.random() < 0.3) {
      db.add(id, "points", -20);
      return msg.reply("💀 Diserang 🐍 Ular (-30)");
    }

    const a = animals[Math.floor(Math.random() * animals.length)];

    let p = db.get(id, "points");
    let mult = antiRich(p);

    const reward = Math.floor(a.value * mult);

    db.add(id, "points", reward);
    db.add(id, `col_${a.name}`, 1);

    msg.reply(`🏹 ${a.name} +${reward}`);
  }

  // ===== BALANCE =====
  if (cmd === "balance") {
    const data = db.all();

    let arr = Object.keys(data).map(u => ({
      id: u,
      p: data[u].points || 0
    }));

    arr.sort((a, b) => b.p - a.p);

    const rank = arr.findIndex(u => u.id === id) + 1;

    const p = db.get(id, "points");

    msg.reply({
      embeds: [
        new EmbedBuilder().setColor("#2B2D31").setDescription(`
Rank : #${rank}

💬 Chat: ${db.get(id, "chat")}
🎤 Voice: ${db.get(id, "voice")}

${LINE}
💠 ${p} Vibe
${LINE}
`)
      ]
    });
  }

  // ===== LEADERBOARD =====
  if (cmd === "leaderboard") {
    const data = db.all();

    let arr = Object.keys(data).map(u => ({
      id: u,
      p: data[u].points || 0
    }));

    arr.sort((a, b) => b.p - a.p);

    let top = arr.slice(0, 5).map((u, i) =>
      `${i + 1}. <@${u.id}> - ${u.p}`
    ).join("\n");

    msg.reply({
      embeds: [
        new EmbedBuilder().setDescription(`
${LINE}
${top}

${LINE}
Kamu: ${db.get(id, "points")}
`)
      ]
    });
  }

  // ===== OWNER =====
  if (cmd === "add") {
    if (msg.author.id !== msg.guild.ownerId)
      return msg.reply("❌ Owner only");

    const user = msg.mentions.users.first();
    const amount = parseInt(args[0]);

    db.add(user.id, "points", amount);

    msg.reply(`+${amount}`);
  }

  if (cmd === "reset") {
    if (msg.author.id !== msg.guild.ownerId)
      return msg.reply("❌ Owner only");

    const user = msg.mentions.users.first();

    db.set(user.id, "points", 0);

    msg.reply("Reset");
  }
});

// ===== VOICE =====
client.on("voiceStateUpdate", (o, n) => {
  if (!n.channel) return;

  const members = n.channel.members.filter(m => !m.user.bot);
  if (members.size < 2) return;

  members.forEach(m => {
    let p = db.get(m.id, "points");
    let mult = antiRich(p);

    db.add(m.id, "points", Math.floor(10 * mult));
    db.add(m.id, "voice", 1);
  });
});

// ===== REACTION =====
client.on("messageReactionAdd", (r, u) => {
  if (u.bot) return;
  if (r.message.channel.name !== "announcement") return;

  let p = db.get(u.id, "points");
  let mult = antiRich(p);

  db.add(u.id, "points", Math.floor(5 * mult));
});

client.login(process.env.TOKEN);
