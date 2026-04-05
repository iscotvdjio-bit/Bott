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

  if (cmd === "balance") {
  const data = db.all();

  // ===== RANK REAL =====
  let arr = Object.keys(data).map(u => ({
    id: u,
    p: data[u].points || 0
  }));

  arr.sort((a, b) => b.p - a.p);
  const rank = arr.findIndex(u => u.id === id) + 1;

  const p = db.get(id, "points") || 0;
  const chat = db.get(id, "chat") || 0;
  const voice = db.get(id, "voice") || 0;

  // ===== FORMAT =====
  const format = (n) => n.toLocaleString("id-ID");
  const time = new Date().toLocaleString("id-ID");

  // ===== LEVEL SYSTEM =====
  const level = Math.floor(p / 100);
  const current = p % 100;
  const percent = Math.floor((current / 100) * 100);

  const barLength = 10;
  const filled = Math.floor((percent / 100) * barLength);
  const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

  // ===== EMBED =====
  msg.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#2B2D31")
        .setTitle(`** Point ** : ${msg.author.username}`)
        .setThumbnail(msg.author.displayAvatarURL({ dynamic: true }))
        .setDescription(`
** Rank ** : #${rank}

💬 **Chat (Aktivitas)**: ${chat}
🎙️ **Voice (Aktivitas)**: ${voice}

👤 **Activity (Point)**: ${format(p)}

${bar} ${percent}% (Level ${level})

------------------------------------
💸 **Total Point**: <:emoji_4:1490319270553325638> **${format(p)}** vibepoint
------------------------------------
<:emoji_4:1490319270553325638> vibepoint | ${time}
`)
    ]
  });
}

if (cmd === "leaderboard") {
  const data = db.all();
  const format = (n) => n.toLocaleString("id-ID");

  // ===== AMBIL DATA =====
  let arr = Object.keys(data).map(u => ({
    id: u,
    chat: data[u].chat || 0,
    voice: data[u].voice || 0
  }));

  // ===== CHAT =====
  let chatSorted = [...arr].sort((a, b) => b.chat - a.chat);
  let chatTop = chatSorted.slice(0, 5);

  let chatText = await Promise.all(chatTop.map(async (u, i) => {
    let user;
    try {
      user = await client.users.fetch(u.id);
    } catch {
      user = { username: "User" };
    }

    return `**${i + 1}. ${user.username}** ➜ Chat: <:emoji_4:1490319270553325638> ${format(u.chat)}`;
  }));

  const userChatRank = chatSorted.findIndex(u => u.id === id) + 1;
  const userChat = db.get(id, "chat") || 0;

  // ===== VOICE =====
  let voiceSorted = [...arr].sort((a, b) => b.voice - a.voice);
  let voiceTop = voiceSorted.slice(0, 5);

  let voiceText = await Promise.all(voiceTop.map(async (u, i) => {
    let user;
    try {
      user = await client.users.fetch(u.id);
    } catch {
      user = { username: "User" };
    }

    return `**${i + 1}. ${user.username}** ➜ Voice: <:emoji_4:1490319270553325638> ${format(u.voice)}`;
  }));

  const userVoiceRank = voiceSorted.findIndex(u => u.id === id) + 1;
  const userVoice = db.get(id, "voice") || 0;

  // ===== EMBED =====
  msg.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#2B2D31")
        .setTitle("TOP LEADERBOARD")
        .setThumbnail(msg.guild.iconURL({ dynamic: true }))
        .setDescription(`
------------------------------------
**💬 Chat**
${chatText.join("\n")}

Rank kamu : #${userChatRank} ➜ Chat: <:emoji_4:1490319270553325638> ${format(userChat)}
------------------------------------
**🎙️ Voice**
${voiceText.join("\n")}

Rank kamu : #${userVoiceRank} ➜ Voice: <:emoji_4:1490319270553325638> ${format(userVoice)}
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
