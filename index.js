require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
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

  // ===== AUTO REMINDER (CHAT TRIGGER) =====
  const sendReminder = async (text) => {
    try {
      await msg.author.send(text);
    } catch {
      msg.reply(text);
    }
  };

  if (db.get(id, "daily_remind") && now >= db.get(id, "daily_remind")) {
    await sendReminder("🎁 Daily kamu sudah bisa di claim!");
    db.set(id, "daily_remind", 0);
  }

  if (db.get(id, "weekly_remind") && now >= db.get(id, "weekly_remind")) {
    await sendReminder("🎉 Weekly kamu sudah bisa di claim!");
    db.set(id, "weekly_remind", 0);
  }

  // ===== COMMAND PARSER =====
  if (!msg.content.startsWith(prefix)) return;

  const args = msg.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ===== DAILY =====
  if (cmd === "daily") {
    const last = db.get(id, "daily") || 0;

    if (now - last < 86400000)
      return msg.reply("💠 Sudah claim");

    const reward = Math.floor(Math.random() * 700) + 800;

    db.set(id, "daily", now);
    db.add(id, "points", reward);

    msg.reply(`💠 +${reward} Vibe`);
  }

  // ===== WEEKLY =====
  if (cmd === "weekly") {
    const last = db.get(id, "weekly") || 0;

    if (now - last < 604800000)
      return msg.reply("💠 Sudah claim");

    const reward = Math.floor(Math.random() * 1500) + 1500;

    db.set(id, "weekly", now);
    db.add(id, "points", reward);

    msg.reply(`💠 +${reward} Vibe`);
  }

  // ===== HUNT =====
  if (cmd === "hunt") {
    const last = db.get(id, "hunt") || 0;

    if (now - last < 180000)
      return msg.reply("⏳ Tunggu 3 menit");

    db.set(id, "hunt", now);

    if (Math.random() < 0.3) {
      db.add(id, "points", -30);
      return msg.reply("💀 Gagal hunt (-30)");
    }

    const a = animals[Math.floor(Math.random() * animals.length)];

    let p = db.get(id, "points") || 0;
    let reward = Math.floor(a.value * antiRich(p));

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

    const p = db.get(id, "points") || 0;
    const chat = db.get(id, "chat") || 0;
    const voice = db.get(id, "voice") || 0;

    const format = (n) => n.toLocaleString("id-ID");
    const time = new Date().toLocaleString("id-ID");

    const level = Math.floor(p / 100);
    const current = p % 100;
    const percent = Math.floor((current / 100) * 100);

    const barLength = 10;
    const filled = Math.floor((percent / 100) * barLength);
    const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

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
💸 **Total Point**: <:emoji_4:1490319270553325638> **${format(p)}**
------------------------------------
<:emoji_4:1490319270553325638> vibepoint | ${time}
`)
      ]
    });
  }

  // ===== LEADERBOARD =====
  if (cmd === "leaderboard") {
    const data = db.all();
    const format = (n) => n.toLocaleString("id-ID");

    let arr = Object.keys(data).map(u => ({
      id: u,
      chat: data[u].chat || 0,
      voice: data[u].voice || 0
    }));

    let chatSorted = [...arr].sort((a, b) => b.chat - a.chat);
    let voiceSorted = [...arr].sort((a, b) => b.voice - a.voice);

    let chatTop = await Promise.all(chatSorted.slice(0, 5).map(async (u, i) => {
      let user = await client.users.fetch(u.id).catch(() => null);
      return `**${i + 1}. ${user?.username || "User"}** ➜ Chat: ${format(u.chat)}`;
    }));

    let voiceTop = await Promise.all(voiceSorted.slice(0, 5).map(async (u, i) => {
      let user = await client.users.fetch(u.id).catch(() => null);
      return `**${i + 1}. ${user?.username || "User"}** ➜ Voice: ${format(u.voice)}`;
    }));

    msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2B2D31")
          .setTitle("TOP LEADERBOARD")
          .setThumbnail(msg.guild.iconURL({ dynamic: true }))
          .setDescription(`
------------------------------------
**💬 Chat**
${chatTop.join("\n")}

------------------------------------
**🎙️ Voice**
${voiceTop.join("\n")}
`)
      ]
    });
  }

  // ===== OWNER =====
  if (cmd === "add") {
    if (msg.author.id !== msg.guild.ownerId)
      return msg.reply("❌ Owner only");

    const user = msg.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!user || isNaN(amount)) return msg.reply("Format salah");

    db.add(user.id, "points", amount);
    msg.reply(`+${amount}`);
  }

  if (cmd === "reset") {
    if (msg.author.id !== msg.guild.ownerId)
      return msg.reply("❌ Owner only");

    const user = msg.mentions.users.first();
    if (!user) return msg.reply("Tag user");

    db.set(user.id, "points", 0);
    msg.reply("Reset berhasil");
  }
});

// ===== VOICE =====
client.on("voiceStateUpdate", (o, n) => {
  if (!n.channel) return;

  const members = n.channel.members.filter(m => !m.user.bot);
  if (members.size < 2) return;

  members.forEach(m => {
    let p = db.get(m.id, "points") || 0;
    db.add(m.id, "points", Math.floor(10 * antiRich(p)));
    db.add(m.id, "voice", 1);
  });
});

// ===== REACTION =====
client.on("messageReactionAdd", (r, u) => {
  if (u.bot) return;
  if (r.message.channel.name !== "announcement") return;

  let p = db.get(u.id, "points") || 0;
  db.add(u.id, "points", Math.floor(5 * antiRich(p)));
});

client.login(process.env.TOKEN);

// ===== AUTO REMINDER PRO =====
setInterval(async () => {
  if (!client.user) return;

  const data = db.all();
  const now = Date.now();

  for (let userId in data) {
    const userData = data[userId];

    try {
      const user = await client.users.fetch(userId);

      if (userData.daily_remind && now >= userData.daily_remind) {
        await user.send("🎁 Daily kamu sudah bisa di claim!");
        db.set(userId, "daily_remind", 0);
      }

      if (userData.weekly_remind && now >= userData.weekly_remind) {
        await user.send("🎉 Weekly kamu sudah bisa di claim!");
        db.set(userId, "weekly_remind", 0);
      }

    } catch {}
  }
}, 60000);
