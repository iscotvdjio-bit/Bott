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

// Track siapa yang sedang di voice channel dan kapan join
const voiceTracker = new Map(); // userId -> joinedAt (timestamp)

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

// ===== ANTI KAYA =====
function antiRich(points) {
  if (points >= 20000) return 0.3;
  if (points >= 10000) return 0.5;
  if (points >= 5000) return 0.7;
  if (points >= 2000) return 0.85;
  return 1;
}

// ===== ANGKA KECIL =====
const small = n => n.toString().split('').map(x => "⁰¹²³⁴⁵⁶⁷⁸⁹"[x]).join("");

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

// ===== RANDOM ANIMAL =====
function getAnimal() {
  const totalChance = animals.reduce((sum, a) => sum + a.chance, 0);
  const rand = Math.random() * totalChance;

  let cumulative = 0;
  for (const a of animals) {
    cumulative += a.chance;
    if (rand <= cumulative) return a;
  }

  return animals[0];
}

// ===== DELETE COMMAND HELPER =====
// FIX: Dipindah keluar dari event handler agar tidak re-deklarasi setiap pesan
async function deleteCmd(msg) {
  if (!msg.guild) return;
  try {
    if (msg.guild.members.me.permissions.has("ManageMessages")) {
      setTimeout(() => msg.delete().catch(() => {}), 800);
    }
  } catch {}
}

// ===== SCHEDULE REMINDER (FIX: prevent duplicate) =====
function createReminder(userId, type, duration, message) {
  const time = Date.now() + duration;

  db.set(userId, `${type}_remind`, time);

  // Hapus schedule lama untuk user & type yang sama
  for (let i = schedule.length - 1; i >= 0; i--) {
    if (schedule[i].id === userId && schedule[i].type === type) {
      schedule.splice(i, 1);
    }
  }

  schedule.push({ id: userId, time, message, type });
}

// ===== MESSAGE =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const id = msg.author.id;
  const now = Date.now();

  db.set(id, "username", msg.author.username);

  // ===== POINT CHAT =====
  if (!msg.content.startsWith(prefix)) {
    const last = db.get(id, "chat_cd") || 0;

    if (now - last > 5000) {
      const p = db.get(id, "points") || 0;
      db.add(id, "points", Math.floor(5 * antiRich(p)));
      db.add(id, "chat", 1);
      db.set(id, "chat_cd", now);
    }
    return; // Bukan command, stop di sini
  }

  // ===== POINT MEDIA (ANTI SPAM) =====
  if (msg.attachments.size > 0) {
    const last = db.get(id, "media_cd") || 0;
    const lastUrl = db.get(id, "last_media");
    const currentUrl = msg.attachments.first().url;

    if (currentUrl !== lastUrl && now - last > 15000) {
      const p = db.get(id, "points") || 0;
      db.add(id, "points", Math.floor(15 * antiRich(p)));
      db.set(id, "media_cd", now);
      db.set(id, "last_media", currentUrl);
    }
  }

  // ===== PARSE COMMAND =====
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
    deleteCmd(msg);
    const last = db.get(id, "daily") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("daily_remind")
        .setLabel("⏰ Ingatkan Saya")
        .setStyle(ButtonStyle.Primary)
    );

    if (now - last < 86400000) {
      const remaining = 86400000 - (now - last);
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      return msg.reply({
        content: `❌ Sudah claim! Cooldown: **${hours}j ${mins}m** lagi`,
        components: [row]
      });
    }

    const reward = Math.floor(Math.random() * 700) + 800;
    db.set(id, "daily", now);
    db.add(id, "points", reward);

    msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#57F287")
          .setDescription(`✅ **Daily Claimed!**\nReward: <:emoji_4:1490319270553325638> **${reward} Point Aktivitas**`)
      ],
      components: [row]
    });
  }

  // ===== WEEKLY =====
  if (cmd === "weekly") {
    deleteCmd(msg);
    const last = db.get(id, "weekly") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("weekly_remind")
        .setLabel("⏰ Ingatkan Minggu Depan")
        .setStyle(ButtonStyle.Success)
    );

    if (now - last < 604800000) {
      const remaining = 604800000 - (now - last);
      const days = Math.floor(remaining / 86400000);
      const hours = Math.floor((remaining % 86400000) / 3600000);
      return msg.reply({
        content: `❌ Sudah claim! Cooldown: **${days}h ${hours}j** lagi`,
        components: [row]
      });
    }

    const reward = Math.floor(Math.random() * 1500) + 1500;
    db.set(id, "weekly", now);
    db.add(id, "points", reward);

    msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#FEE75C")
          .setDescription(`✅ **Weekly Claimed!**\nReward: <:emoji_4:1490319270553325638> **${reward} Point Aktivitas**`)
      ],
      components: [row]
    });
  }

  // ===== HUNT =====
  if (cmd === "hunt") {
    deleteCmd(msg);
    const last = db.get(id, "hunt") || 0;

    if (now - last < 180000) {
      const remaining = Math.ceil((180000 - (now - last)) / 1000);
      return msg.reply(`⏳ Tunggu **${remaining} detik** lagi`);
    }

    // Set cooldown SEBELUM animasi agar tidak di-spam saat loading
    db.set(id, "hunt", now);

    const m = await msg.reply("🏹 Kamu mulai berburu...");

    await new Promise(r => setTimeout(r, 1200));
    await m.edit("🌲 Menjelajah hutan...");

    await new Promise(r => setTimeout(r, 1200));
    await m.edit("👀 Mencari target...");

    await new Promise(r => setTimeout(r, 1200));

    if (Math.random() < 0.3) {
      db.add(id, "points", -30);
      return m.edit("💀 Diserang saat berburu! **-30 Point**");
    }

    const a = getAnimal();
    const p = db.get(id, "points") || 0;
    const reward = Math.floor(a.value * antiRich(p));

    db.add(id, "points", reward);
    db.add(id, `col_${a.name}`, 1);

    await m.edit({
      embeds: [
        new EmbedBuilder()
          .setColor("#57F287")
          .setDescription(`✨ Kamu menemukan **${a.name}**\n🏷️ Rarity: **${a.rarity}**\n💰 +**${reward} Point**`)
      ]
    });
  }

  // ===== BALANCE =====
  if (cmd === "balance") {
    deleteCmd(msg);
    const data = db.all();

    // FIX: buat salinan array untuk sorting, hindari mutasi data asli
    const arr = Object.keys(data)
      .map(u => ({ id: u, p: data[u].points || 0 }))
      .sort((a, b) => b.p - a.p);

    const rank = arr.findIndex(u => u.id === id) + 1;
    const p = db.get(id, "points") || 0;
    const chat = db.get(id, "chat") || 0;
    const voice = db.get(id, "voice") || 0;
    const format = n => n.toLocaleString("id-ID");
    const time = new Date().toLocaleString("id-ID");

    // FIX: Level lebih meaningful (per 500 point)
    const LEVEL_THRESHOLD = 500;
    const level = Math.floor(p / LEVEL_THRESHOLD);
    const current = p % LEVEL_THRESHOLD;
    const percent = Math.floor((current / LEVEL_THRESHOLD) * 100);

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
    deleteCmd(msg);

    const data = db.all();
    const format = n => n.toLocaleString("id-ID");

    const arr = Object.keys(data).map(u => ({
      id: u,
      chat: data[u].chat || 0,
      voice: data[u].voice || 0
    }));

    // FIX: buat salinan array terpisah sebelum sort agar tidak saling mempengaruhi
    const chatSorted = [...arr].sort((a, b) => b.chat - a.chat).slice(0, 5);
    const voiceSorted = [...arr].sort((a, b) => b.voice - a.voice).slice(0, 5);

    const getName = async (userId) => {
      let user = client.users.cache.get(userId);
      if (!user) user = await client.users.fetch(userId).catch(() => null);
      return user ? user.username : "Unknown";
    };

    const chatTop = [];
    for (let i = 0; i < chatSorted.length; i++) {
      const name = await getName(chatSorted[i].id);
      chatTop.push(`**${i + 1}. ${name}** ➜ Chat: ${format(chatSorted[i].chat)}`);
    }

    const voiceTop = [];
    for (let i = 0; i < voiceSorted.length; i++) {
      const name = await getName(voiceSorted[i].id);
      voiceTop.push(`**${i + 1}. ${name}** ➜ Voice: ${format(voiceSorted[i].voice)}`);
    }

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

  // ===== OWNER: ADD =====
  if (cmd === "add") {
    deleteCmd(msg);
    if (msg.author.id !== msg.guild?.ownerId)
      return msg.reply("❌ Owner only");

    const user = msg.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!user || isNaN(amount))
      return msg.reply("Format: `!add @user 100`");

    db.add(user.id, "points", amount);
    msg.reply(`✅ +${amount} point ke **${user.username}**`);
  }

  // ===== OWNER: RESET =====
  if (cmd === "reset") {
    deleteCmd(msg);
    if (msg.author.id !== msg.guild?.ownerId)
      return msg.reply("❌ Owner only");

    const user = msg.mentions.users.first();
    if (!user) return msg.reply("Tag user dulu!");

    db.set(user.id, "points", 0);
    msg.reply(`✅ Reset point **${user.username}** berhasil`);
  }

  // ===== COLLECTION =====
  if (cmd === "collection") {
    deleteCmd(msg);

    let text = "";
    for (const a of animals) {
      const count = db.get(id, `col_${a.name}`) || 0;
      if (count > 0) text += `${a.name}${small(count)}\n`;
    }

    msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2B2D31")
          .setTitle("LIST HEWAN BURUAN")
          .setThumbnail(msg.author.displayAvatarURL())
          .setDescription(`Pemburu: **${msg.author.username}**\n\n${text || "Belum ada koleksi"}`)
      ]
    });
  }
});

// ===== BUTTON =====
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  const userId = i.user.id;

  if (i.customId === "daily_remind") {
    createReminder(userId, "daily", 86400000, "🎁 Daily ready!");
    return i.reply({ content: "⏰ Kamu akan diingatkan saat daily bisa di-claim!", ephemeral: true });
  }

  if (i.customId === "weekly_remind") {
    createReminder(userId, "weekly", 604800000, "🎉 Weekly ready!");
    return i.reply({ content: "⏰ Kamu akan diingatkan saat weekly bisa di-claim!", ephemeral: true });
  }
});

// ===== VOICE TRACKING (FIX: pakai setInterval, bukan voiceStateUpdate saja) =====
client.on("voiceStateUpdate", (oldState, newState) => {
  const userId = newState.member?.id || oldState.member?.id;
  if (!userId) return;

  const isBot = newState.member?.user.bot || oldState.member?.user.bot;
  if (isBot) return;

  const joinedChannel = newState.channel;
  const leftChannel = !newState.channelId && oldState.channelId;

  // User join voice
  if (joinedChannel) {
    const membersInChannel = joinedChannel.members.filter(m => !m.user.bot).size;
    if (membersInChannel >= 2) {
      voiceTracker.set(userId, Date.now());
    }
  }

  // User leave voice — hapus dari tracker
  if (leftChannel) {
    voiceTracker.delete(userId);
  }
});

// Setiap 1 menit, berikan point ke semua yang ada di voice dengan 2+ orang
setInterval(() => {
  client.guilds.cache.forEach(guild => {
    guild.channels.cache
      .filter(c => c.isVoiceBased())
      .forEach(channel => {
        const realMembers = channel.members.filter(m => !m.user.bot);
        if (realMembers.size < 2) return;

        realMembers.forEach(member => {
          const userId = member.id;
          const p = db.get(userId, "points") || 0;

          db.add(userId, "points", Math.floor(10 * antiRich(p)));
          db.add(userId, "voice", 1);
        });
      });
  });
}, 60000); // setiap 1 menit

// ===== REACTION =====
client.on("messageReactionAdd", (r, u) => {
  if (u.bot) return;
  if (r.message.channel.name !== "announcement") return;

  const p = db.get(u.id, "points") || 0;
  db.add(u.id, "points", Math.floor(5 * antiRich(p)));
});

// ===== SCHEDULER PROCESS =====
setInterval(() => {
  const now = Date.now();
  let count = 0;

  for (let i = schedule.length - 1; i >= 0; i--) {
    if (count >= 50) break;
    count++;

    const item = schedule[i];
    if (now >= item.time) {
      if (dmQueue.length < 1000) {
        dmQueue.push({ id: item.id, message: item.message });
      }
      schedule.splice(i, 1);
    }
  }
}, 2000);

// ===== PROCESS DM QUEUE =====
setInterval(async () => {
  if (dmQueue.length === 0) return;

  const data = dmQueue.shift();

  try {
    let user = client.users.cache.get(data.id);
    if (!user) user = await client.users.fetch(data.id).catch(() => null);
    if (!user) return;

    await user.send(data.message).catch(() => {});
  } catch (e) {
    console.log("Queue DM Error:", e.message);
  }
}, 700);

// ===== READY (RESTORE SCHEDULE) =====
client.once("ready", () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  schedule.length = 0; // Bersihkan schedule lama

  const data = db.all();
  const now = Date.now();

  for (const id in data) {
    if (data[id].daily_remind && data[id].daily_remind > now) {
      schedule.push({ id, time: data[id].daily_remind, message: "🎁 Daily ready!", type: "daily" });
    }
    if (data[id].weekly_remind && data[id].weekly_remind > now) {
      schedule.push({ id, time: data[id].weekly_remind, message: "🎉 Weekly ready!", type: "weekly" });
    }
  }

  console.log(`📅 Restored ${schedule.length} reminder(s)`);
});

// ===== ERROR HANDLER =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ===== LOGIN =====
client.login(process.env.TOKEN);
