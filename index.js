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

const dmQueue = [];
const schedule = [];

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
const LINE = "━━━━━━━━━━━━━━━━━━━━";

// ===== ANTI KAYA =====
function antiRich(points) {
  if (points >= 20000) return 0.3;
  if (points >= 10000) return 0.5;
  if (points >= 5000) return 0.7;
  if (points >= 2000) return 0.85;
  return 1;
}

// ===== ANGKA KECIL =====
const small = n => n.toString().split('').map(x=>"⁰¹²³⁴⁵⁶⁷⁸⁹"[x]).join("");

// ===== HEWAN =====
const animals = [
  { name: "🐦‍⬛ Black Bird", value: 50, chance: 40, rarity: "BASIC" },
  { name: "🐰 Kelinci", value: 50, chance: 40, rarity: "BASIC" },
  { name: "🦇 Kelelawar", value: 50, chance: 40, rarity: "BASIC" },
  { name: "🐗 Babi Hutan", value: 150, chance: 10, rarity: "PURE" },
  { name: "🦅 Elang", value: 150, chance: 10, rarity: "PURE" },
  { name: "🐒 Monyet", value: 150, chance: 10, rarity: "PURE" },
  { name: "🐴 Kuda", value: 200, chance: 7, rarity: "BRAVO" },
  { name: "🐻 Beruang", value: 200, chance: 7, rarity: "BRAVO" },
  { name: "🐺 Serigala", value: 200, chance: 7, rarity: "BRAVO" },
  { name: "🐼 Panda", value: 500, chance: 3, rarity: "ALPHA" }, 
  { name: "🦁 Singa", value: 500, chance: 3, rarity: "ALPHA" }, 
  { name: "🐯 Harimau Alpha", value: 500, chance: 3, rarity: "ALPHA" }
];

// ===== RANDOM =====
function getAnimal() {
  const totalChance = animals.reduce((sum, a) => sum + a.chance, 0);
  const rand = Math.random() * totalChance;

  let cumulative = 0;
  for (let a of animals) {
    cumulative += a.chance;
    if (rand <= cumulative) return a;
  }

  return animals[0];
   }

// ===== MESSAGE =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const deleteCmd = async () => {
  if (!msg.guild) return; 

  try {
    if (msg.guild.members.me.permissions.has("ManageMessages")) {
      setTimeout(() => msg.delete().catch(() => {}), 800);
    }
  } catch {}
};

  const id = msg.author.id;
  const now = Date.now();

   // ===== POINT CHAT =====
  if (!msg.content.startsWith(prefix)) {
    let last = db.get(id, "chat_cd") || 0;

    if (now - last > 5000) {
      let p = db.get(id, "points") || 0;
      db.add(id, "points", Math.floor(5 * antiRich(p)));
      db.add(id, "chat", 1);
      db.set(id, "chat_cd", now);
    }
  }

// ===== POINT MEDIA (ANTI SPAM) =====
  if (msg.attachments.size > 0) {
    let last = db.get(id, "media_cd") || 0;
    let lastUrl = db.get(id, "last_media");
    const currentUrl = msg.attachments.first().url;

    if (currentUrl === lastUrl) return;

    if (now - last > 15000) {
      let p = db.get(id, "points") || 0;
      db.add(id, "points", Math.floor(15 * antiRich(p)));
      db.set(id, "media_cd", now);
      db.set(id, "last_media", currentUrl);
    }
  }

// ===== COMMAND =====
if (!msg.content.startsWith(prefix)) return;

const args = msg.content.slice(prefix.length).trim().split(/ +/);
const cmd = args.shift().toLowerCase();

// ===== COOLDOWN COMMAND =====
const cmd_cd = db.get(id, "cmd_cd") || 0;

if (Date.now() - cmd_cd < 1000) {
  return msg.reply("⏳ Jangan spam command");
}

db.set(id, "cmd_cd", Date.now());

  // ===== DAILY =====
  if (cmd === "daily") {
    deleteCmd();
    const last = db.get(id, "daily") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("daily_remind")
        .setLabel("⏰ Ingatkan Saya")
        .setStyle(ButtonStyle.Primary)
    );

    if (now - last < 86400000)
      return msg.reply({ content: "❌ Sudah claim", components: [row] });

    const reward = Math.floor(Math.random() * 700) + 800;

    db.set(id, "daily", now);
    db.add(id, "points", reward);

    msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#57F287")
          .setDescription(`✅ **Daily Claimed!**
Reward: <:emoji_4:1490319270553325638> **${reward} Point Aktivitas**`)
      ],
      components: [row]
    });
}

  // ===== WEEKLY =====
  if (cmd === "weekly") {
    deleteCmd();
    const last = db.get(id, "weekly") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("weekly_remind")
        .setLabel("⏰ Ingatkan Minggu Depan")
        .setStyle(ButtonStyle.Success)
    );

    if (now - last < 604800000)
      return msg.reply({ content: "❌ Sudah claim", components: [row] });

    const reward = Math.floor(Math.random() * 1500) + 1500;

    db.set(id, "weekly", now);
    db.add(id, "points", reward);

    msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#FEE75C")
          .setDescription(`✅ **Weekly Claimed!**
Reward: <:emoji_4:1490319270553325638> **${reward} Point Aktivitas**`)
      ],
      components: [row]
    });
  }

  // ===== HUNT (ANIMASI) =====
  if (cmd === "hunt") {
    deleteCmd();
    const last = db.get(id, "hunt") || 0;

    if (now - last < 180000)
      return msg.reply("⏳ Tunggu 3 menit");

    db.set(id, "hunt", now);

    const m = await msg.reply("🏹 Kamu mulai berburu...");

    await new Promise(r => setTimeout(r, 1200));
    await m.edit("🌲 Menjelajah hutan...");

    await new Promise(r => setTimeout(r, 1200));
    await m.edit("👀 Mencari target...");

    await new Promise(r => setTimeout(r, 1200));

    if (Math.random() < 0.3) {
      db.add(id, "points", -30);
      return m.edit("💀 Diserang saat berburu (-30)");
    }

    const a = getAnimal();

    let p = db.get(id, "points") || 0;
    let reward = Math.floor(a.value * antiRich(p));

    db.add(id, "points", reward);
    db.add(id, `col_${a.name}`, 1);

    await m.edit(`✨ Kamu menemukan ${a.name}
🏷️ Rarity: **${a.rarity}**
💰 +${reward} Point`);
  }

  if (cmd === "balance") {
    deleteCmd();
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

━━━━━━━━━━━━━━━━━━━━
💸 **Total Point**: <:emoji_4:1490319270553325638> **${format(p)}**
━━━━━━━━━━━━━━━━━━━━
<:emoji_4:1490319270553325638> vibepoint | ${time}
`)
      ]
    });
  }

  // ===== LEADERBOARD =====
  if (cmd === "leaderboard") {
    deleteCmd();
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
━━━━━━━━━━━━━━━━━━━━
**💬 Chat**
${chatTop.join("\n")}

━━━━━━━━━━━━━━━━━━━━
**🎙️ Voice**
${voiceTop.join("\n")}
`)
      ]
    });
    }

  // ===== OWNER =====
  if (cmd === "add") {
    deleteCmd();
    if (msg.author.id !== msg.guild.ownerId)
      return msg.reply("❌ Owner only");

    const user = msg.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!user || isNaN(amount))
      return msg.reply("Format: !add @user 100");

    db.add(user.id, "points", amount);
    msg.reply(`✅ +${amount} point ke ${user.username}`);
  }

  if (cmd === "reset") {
    deleteCmd();
    if (msg.author.id !== msg.guild.ownerId)
      return msg.reply("❌ Owner only");

    const user = msg.mentions.users.first();
    if (!user) return msg.reply("Tag user");

    db.set(user.id, "points", 0);
    msg.reply("✅ Reset berhasil");
  }

 // ===== COLLECTION =====
  if (cmd === "collection") {
    deleteCmd();
    let text = "";

    for (let a of animals) {
      let count = db.get(id, `col_${a.name}`) || 0;
      if (count > 0) text += `${a.name}${small(count)}\n`;
    }

    msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2B2D31")
          .setTitle("LIST HEWAN BURUAN")
          .setThumbnail(msg.author.displayAvatarURL())
          .setDescription(`Pemburu: **${msg.author.username}**

${text || "Belum ada koleksi"}`)
      ]
    });
  }
});

// ===== BUTTON =====
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  const id = i.user.id;

  if (i.customId === "daily_remind") {
  const time = Date.now() + 86400000;

  db.set(id, "daily_remind", time);

  schedule.push({
    id: id,
    time: time,
    message: "🎁 Daily ready!"
  });

  return i.reply({ content: "⏰ Daily diingatkan!", ephemeral: true });
}

if (i.customId === "weekly_remind") {
  const time = Date.now() + 604800000;

  db.set(id, "weekly_remind", time);

  schedule.push({
    id: id,
    time: time,
    message: "🎉 Weekly ready!"
  });

  return i.reply({ content: "⏰ Weekly diingatkan!", ephemeral: true });
    }

// ===== VOICE =====
client.on("voiceStateUpdate", (o, n) => {
  if (!n.channel) return;

  const members = n.channel.members.filter(m => !m.user.bot);
  if (members.size < 2) return;

  members.forEach(m => {
    const last = db.get(m.id, "voice_cd") || 0;

    // cooldown 1 menit
    if (Date.now() - last < 60000) return;

    let p = db.get(m.id, "points") || 0;

    db.add(m.id, "points", Math.floor(10 * antiRich(p)));
    db.add(m.id, "voice", 1);
    db.set(m.id, "voice_cd", Date.now());
  });
});

// ===== REACTION =====
client.on("messageReactionAdd", (r, u) => {
  if (u.bot) return;
  if (r.message.channel.name !== "announcement") return;

  let p = db.get(u.id, "points") || 0;
  db.add(u.id, "points", Math.floor(5 * antiRich(p)));
});

// ===== SCHEDULER PROCESS =====
setInterval(() => {
  const now = Date.now();

  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];

    if (now >= item.time) {
      if (dmQueue.length < 1000) {
        dmQueue.push({
          id: item.id,
          message: item.message
        });
      }

      schedule.splice(i, 1);
      i--;
    }
  }
}, 5000);

// ===== PROCESS DM QUEUE =====
setInterval(async () => {
  if (dmQueue.length === 0) return;

  const data = dmQueue.shift();

  try {
    let user = client.users.cache.get(data.id);

    if (!user) {
      user = await client.users.fetch(data.id).catch(() => null);
    }

    if (!user) return;

    await user.send(data.message).catch(() => {});
  } catch (e) {
    console.log("Queue DM Error:", e.message);
  }

}, 700);

// ===== READY (RESTORE SCHEDULE) =====
client.once("ready", () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  const data = db.all();
  const now = Date.now();

  for (let id in data) {
    if (data[id].daily_remind && data[id].daily_remind > now) {
      schedule.push({
        id: id,
        time: data[id].daily_remind,
        message: "🎁 Daily ready!"
      });
    }

    if (data[id].weekly_remind && data[id].weekly_remind > now) {
      schedule.push({
        id: id,
        time: data[id].weekly_remind,
        message: "🎉 Weekly ready!"
      });
    }
  }
});

// ===== ERROR HANDLER =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
  
// ===== LOGIN =====
client.login(process.env.TOKEN);
