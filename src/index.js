require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require("discord.js");

const db = require("./database");
const { buildDonateImage, formatRp } = require("./donate");

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

// ===== ANTI KAYA =====
function antiRich(points) {
  if (points >= 20000) return 0.3;
  if (points >= 10000) return 0.5;
  if (points >= 5000)  return 0.7;
  if (points >= 2000)  return 0.85;
  return 1;
}

// ===== ANGKA KECIL =====
const small = n =>
  n.toString().split("").map(x => "⁰¹²³⁴⁵⁶⁷⁸⁹"[x]).join("");

// ===== HEWAN =====
const animals = [
  { name: "🐦‍⬛ Black Bird",  value: 50,  chance: 40, rarity: "BASIC" },
  { name: "🐰 Kelinci",       value: 50,  chance: 40, rarity: "BASIC" },
  { name: "🦇 Kelelawar",     value: 50,  chance: 40, rarity: "BASIC" },
  { name: "🐗 Babi Hutan",    value: 150, chance: 10, rarity: "PURE"  },
  { name: "🦅 Elang",         value: 150, chance: 10, rarity: "PURE"  },
  { name: "🐒 Monyet",        value: 150, chance: 10, rarity: "PURE"  },
  { name: "🐴 Kuda",          value: 200, chance: 7,  rarity: "BRAVO" },
  { name: "🐻 Beruang",       value: 200, chance: 7,  rarity: "BRAVO" },
  { name: "🐺 Serigala",      value: 200, chance: 7,  rarity: "BRAVO" },
  { name: "🐼 Panda",         value: 500, chance: 3,  rarity: "ALPHA" },
  { name: "🦁 Singa",         value: 500, chance: 3,  rarity: "ALPHA" },
  { name: "🐯 Harimau Alpha", value: 500, chance: 3,  rarity: "ALPHA" }
];

// ===== RANDOM ANIMAL =====
function getAnimal() {
  const total = animals.reduce((s, a) => s + a.chance, 0);
  let rand = Math.random() * total;
  for (const a of animals) {
    rand -= a.chance;
    if (rand <= 0) return a;
  }
  return animals[0];
}

// ===== SCHEDULE REMINDER =====
function createReminder(userId, type, duration, message) {
  const time = Date.now() + duration;
  db.set(userId, `${type}_remind`, time);

  for (let i = schedule.length - 1; i >= 0; i--) {
    if (schedule[i].id === userId && schedule[i].type === type) {
      schedule.splice(i, 1);
    }
  }

  schedule.push({ id: userId, time, message, type });
}

// ===== DONATE HELPERS =====

// Key: donate_YYYY-MM  →  { donors: [ {userId, username, avatarURL, amount, platform} ] }
function getDonateKey() {
  const now = new Date();
  return `donate_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}

function getMonthLabel() {
  return new Date().toLocaleString("id-ID", { month: "long", year: "numeric" });
}

function loadDonors(key) {
  return db.get("donate", key) || [];
}

function saveDonors(key, donors) {
  db.set("donate", key, donors);
}

// ===== AUTO-RESET DONATUR TIAP AWAL BULAN =====
// Dijalankan setiap 1 jam, cek apakah bulan berganti
let lastDonateMonth = new Date().getMonth();
setInterval(() => {
  const currentMonth = new Date().getMonth();
  if (currentMonth !== lastDonateMonth) {
    lastDonateMonth = currentMonth;
    // Data bulan lama otomatis tersimpan dengan key bulan lalu,
    // bulan baru akan mulai dari [] kosong secara natural.
    console.log("🔄 Auto-reset donatur: bulan baru dimulai");
  }
}, 3600000); // cek tiap 1 jam

// ===== POINT CHAT & MEDIA =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const id  = msg.author.id;
  const now = Date.now();

  db.set(id, "username", msg.author.username);

  const last = db.get(id, "chat_cd") || 0;
  if (now - last > 5000) {
    const p = db.get(id, "points") || 0;
    db.add(id, "points", Math.floor(5 * antiRich(p)));
    db.add(id, "chat", 1);
    db.set(id, "chat_cd", now);
  }

  if (msg.attachments.size > 0) {
    const lastMedia = db.get(id, "media_cd") || 0;
    const lastUrl   = db.get(id, "last_media");
    const url       = msg.attachments.first().url;

    if (url !== lastUrl && now - lastMedia > 15000) {
      const p = db.get(id, "points") || 0;
      db.add(id, "points", Math.floor(15 * antiRich(p)));
      db.set(id, "media_cd", now);
      db.set(id, "last_media", url);
    }
  }
});

// ===== SLASH COMMANDS & BUTTONS =====
client.on("interactionCreate", async (interaction) => {

  // ── BUTTON ──────────────────────────────────────────────
  if (interaction.isButton()) {
    const userId = interaction.user.id;

    if (interaction.customId === "daily_remind") {
      createReminder(userId, "daily", 86400000, "🎁 Daily kamu sudah bisa di-claim!");
      return interaction.reply({ content: "⏰ Oke! Kamu akan diingatkan saat daily siap.", ephemeral: true });
    }

    if (interaction.customId === "weekly_remind") {
      createReminder(userId, "weekly", 604800000, "🎉 Weekly kamu sudah bisa di-claim!");
      return interaction.reply({ content: "⏰ Oke! Kamu akan diingatkan saat weekly siap.", ephemeral: true });
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, guild } = interaction;
  const id  = user.id;
  const now = Date.now();

  db.set(id, "username", user.username);

  const cmd_cd = db.get(id, "cmd_cd") || 0;
  if (now - cmd_cd < 1000) {
    return interaction.reply({ content: "⏳ Jangan spam command!", ephemeral: true });
  }
  db.set(id, "cmd_cd", now);

  // ────────────────────────────────────────────────────────
  // /daily
  // ────────────────────────────────────────────────────────
  if (commandName === "daily") {
    const last = db.get(id, "daily") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("daily_remind")
        .setLabel("⏰ Ingatkan Saya")
        .setStyle(ButtonStyle.Primary)
    );

    if (now - last < 86400000) {
      const rem   = 86400000 - (now - last);
      const hours = Math.floor(rem / 3600000);
      const mins  = Math.floor((rem % 3600000) / 60000);
      return interaction.reply({
        content: `❌ Sudah claim! Kembali dalam **${hours}j ${mins}m** lagi.`,
        components: [row],
        ephemeral: true
      });
    }

    const reward = Math.floor(Math.random() * 700) + 800;
    db.set(id, "daily", now);
    db.add(id, "points", reward);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#57F287")
          .setDescription(`✅ **Daily Claimed!**\nReward: <:emoji_4:1490319270553325638> **${reward} Point Aktivitas**`)
      ],
      components: [row]
    });
  }

  // ────────────────────────────────────────────────────────
  // /weekly
  // ────────────────────────────────────────────────────────
  if (commandName === "weekly") {
    const last = db.get(id, "weekly") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("weekly_remind")
        .setLabel("⏰ Ingatkan Minggu Depan")
        .setStyle(ButtonStyle.Success)
    );

    if (now - last < 604800000) {
      const rem   = 604800000 - (now - last);
      const days  = Math.floor(rem / 86400000);
      const hours = Math.floor((rem % 86400000) / 3600000);
      return interaction.reply({
        content: `❌ Sudah claim! Kembali dalam **${days}h ${hours}j** lagi.`,
        components: [row],
        ephemeral: true
      });
    }

    const reward = Math.floor(Math.random() * 1500) + 1500;
    db.set(id, "weekly", now);
    db.add(id, "points", reward);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#FEE75C")
          .setDescription(`✅ **Weekly Claimed!**\nReward: <:emoji_4:1490319270553325638> **${reward} Point Aktivitas**`)
      ],
      components: [row]
    });
  }

  // ────────────────────────────────────────────────────────
  // /hunt
  // ────────────────────────────────────────────────────────
  if (commandName === "hunt") {
    const last = db.get(id, "hunt") || 0;

    if (now - last < 180000) {
      const sisa = Math.ceil((180000 - (now - last)) / 1000);
      return interaction.reply({ content: `⏳ Tunggu **${sisa} detik** lagi sebelum berburu.`, ephemeral: true });
    }

    db.set(id, "hunt", now);
    await interaction.deferReply();

    await new Promise(r => setTimeout(r, 1200));
    await interaction.editReply("🌲 Menjelajah hutan...");

    await new Promise(r => setTimeout(r, 1200));
    await interaction.editReply("👀 Mencari target...");

    await new Promise(r => setTimeout(r, 1200));

    if (Math.random() < 0.3) {
      db.add(id, "points", -30);
      return interaction.editReply("💀 Diserang saat berburu! **-30 Point**");
    }

    const a      = getAnimal();
    const p      = db.get(id, "points") || 0;
    const reward = Math.floor(a.value * antiRich(p));

    db.add(id, "points", reward);
    db.add(id, `col_${a.name}`, 1);

    return interaction.editReply({
      content: "",
      embeds: [
        new EmbedBuilder()
          .setColor("#57F287")
          .setDescription(
            `✨ Kamu menemukan **${a.name}**\n🏷️ Rarity: **${a.rarity}**\n💰 +**${reward} Point**`
          )
      ]
    });
  }

  // ────────────────────────────────────────────────────────
  // /balance
  // ────────────────────────────────────────────────────────
  if (commandName === "balance") {
    const data = db.all();
    const arr  = Object.keys(data)
      .map(u => ({ id: u, p: data[u].points || 0 }))
      .sort((a, b) => b.p - a.p);

    const rank   = arr.findIndex(u => u.id === id) + 1;
    const p      = db.get(id, "points") || 0;
    const chat   = db.get(id, "chat")   || 0;
    const voice  = db.get(id, "voice")  || 0;
    const format = n => n.toLocaleString("id-ID");
    const time   = new Date().toLocaleString("id-ID");

    const THRESHOLD = 500;
    const level   = Math.floor(p / THRESHOLD);
    const current = p % THRESHOLD;
    const percent = Math.floor((current / THRESHOLD) * 100);
    const filled  = Math.floor((percent / 100) * 10);
    const bar     = "█".repeat(filled) + "░".repeat(10 - filled);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2B2D31")
          .setTitle(`** Point ** : ${user.username}`)
          .setThumbnail(user.displayAvatarURL({ dynamic: true }))
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

  // ────────────────────────────────────────────────────────
  // /leaderboard
  // ────────────────────────────────────────────────────────
  if (commandName === "leaderboard") {
    const data   = db.all();
    const format = n => n.toLocaleString("id-ID");

    const arr = Object.keys(data).map(u => ({
      id:    u,
      chat:  data[u].chat  || 0,
      voice: data[u].voice || 0
    }));

    const chatSorted  = [...arr].sort((a, b) => b.chat  - a.chat ).slice(0, 5);
    const voiceSorted = [...arr].sort((a, b) => b.voice - a.voice).slice(0, 5);

    const getName = async (uid) => {
      let u = client.users.cache.get(uid);
      if (!u) u = await client.users.fetch(uid).catch(() => null);
      return u ? u.username : "Unknown";
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

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2B2D31")
          .setTitle("TOP LEADERBOARD")
          .setThumbnail(guild?.iconURL({ dynamic: true }) ?? null)
          .setDescription(`
━━━━━━━━━━━━━━━━━━━━
**💬 Chat**
${chatTop.join("\n") || "Belum ada data"}

━━━━━━━━━━━━━━━━━━━━
**🎙️ Voice**
${voiceTop.join("\n") || "Belum ada data"}
`)
      ]
    });
  }

  // ────────────────────────────────────────────────────────
  // /collection
  // ────────────────────────────────────────────────────────
  if (commandName === "collection") {
    let text = "";
    for (const a of animals) {
      const count = db.get(id, `col_${a.name}`) || 0;
      if (count > 0) text += `${a.name}${small(count)}\n`;
    }

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2B2D31")
          .setTitle("LIST HEWAN BURUAN")
          .setThumbnail(user.displayAvatarURL())
          .setDescription(`Pemburu: **${user.username}**\n\n${text || "Belum ada koleksi"}`)
      ]
    });
  }

  // ────────────────────────────────────────────────────────
  // /add  (owner only)
  // ────────────────────────────────────────────────────────
  if (commandName === "add") {
    if (user.id !== guild?.ownerId) {
      return interaction.reply({ content: "❌ Owner only!", ephemeral: true });
    }

    const target = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("jumlah");

    db.add(target.id, "points", amount);
    return interaction.reply({
      content: `✅ +**${amount}** point ke **${target.username}**`,
      ephemeral: true
    });
  }

  // ────────────────────────────────────────────────────────
  // /reset  (owner only)
  // ────────────────────────────────────────────────────────
  if (commandName === "reset") {
    if (user.id !== guild?.ownerId) {
      return interaction.reply({ content: "❌ Owner only!", ephemeral: true });
    }

    const target = interaction.options.getUser("user");
    db.set(target.id, "points", 0);
    return interaction.reply({
      content: `✅ Point **${target.username}** berhasil di-reset.`,
      ephemeral: true
    });
  }

  // ════════════════════════════════════════════════════════
  // /donate-top  ← COMMAND BARU: tampilkan leaderboard donatur
  // ════════════════════════════════════════════════════════
  if (commandName === "donate-top") {
    await interaction.deferReply();

    const key    = getDonateKey();
    const donors = loadDonors(key);

    if (donors.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ef4444")
            .setDescription("❌ Belum ada data donatur bulan ini.")
        ]
      });
    }

    // Sort descending by amount
    const sorted = [...donors].sort((a, b) => b.amount - a.amount);

    const guildIcon = guild?.iconURL({ extension: "png", size: 128 }) ?? "https://cdn.discordapp.com/embed/avatars/0.png";

    try {
      const imgBuf = await buildDonateImage(sorted, guildIcon, getMonthLabel());
      const attach = new AttachmentBuilder(imgBuf, { name: "top-donatur.png" });

      return interaction.editReply({ files: [attach] });
    } catch (err) {
      console.error("donate-top image error:", err);
      // Fallback ke embed teks jika canvas gagal
      const lines = sorted.slice(0, 10).map((d, i) =>
        `**${i+1}.** ${d.username} — ${formatRp(d.amount)} *(${d.platform})*`
      );
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#67f7da")
            .setTitle(`🏆 Top Donatur — ${getMonthLabel()}`)
            .setThumbnail(guild?.iconURL({ dynamic: true }) ?? null)
            .setDescription(lines.join("\n"))
        ]
      });
    }
  }

  // ════════════════════════════════════════════════════════
  // /add-donate  ← COMMAND BARU: input donasi manual (owner)
  // ════════════════════════════════════════════════════════
  if (commandName === "add-donate") {
    if (user.id !== guild?.ownerId) {
      return interaction.reply({ content: "❌ Owner only!", ephemeral: true });
    }

    const target   = interaction.options.getUser("user");
    const amount   = interaction.options.getInteger("jumlah");
    const platform = interaction.options.getString("platform"); // "saweria" | "sociabuzz"

    const key    = getDonateKey();
    const donors = loadDonors(key);

    // Cari apakah user sudah ada di list bulan ini → tambah nominalnya
    const existing = donors.find(d => d.userId === target.id);

    if (existing) {
      existing.amount += amount;
    } else {
      donors.push({
        userId:     target.id,
        username:   target.username,
        avatarURL:  target.displayAvatarURL({ extension: "png", forceStatic: true }),
        amount,
        platform
      });
    }

    saveDonors(key, donors);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#67f7da")
          .setTitle("✅ Donasi Berhasil Ditambahkan")
          .setDescription(
            `👤 **Donatur** : ${target.username}\n` +
            `💰 **Jumlah**  : ${formatRp(amount)}\n` +
            `🔗 **Platform**: ${platform === "saweria" ? "Saweria" : "Sociabuzz"}\n` +
            `📅 **Bulan**   : ${getMonthLabel()}`
          )
      ],
      ephemeral: true
    });
  }

  // ════════════════════════════════════════════════════════
  // /remove-donate  ← COMMAND BARU: hapus/kurangi donasi (owner)
  // ════════════════════════════════════════════════════════
  if (commandName === "remove-donate") {
    if (user.id !== guild?.ownerId) {
      return interaction.reply({ content: "❌ Owner only!", ephemeral: true });
    }

    const target = interaction.options.getUser("user");
    const key    = getDonateKey();
    const donors = loadDonors(key);

    const idx = donors.findIndex(d => d.userId === target.id);
    if (idx === -1) {
      return interaction.reply({
        content: `❌ **${target.username}** tidak ada di list donatur bulan ini.`,
        ephemeral: true
      });
    }

    donors.splice(idx, 1);
    saveDonors(key, donors);

    return interaction.reply({
      content: `✅ Data donatur **${target.username}** bulan ini dihapus.`,
      ephemeral: true
    });
  }

  // ════════════════════════════════════════════════════════
  // /reset-donate  ← COMMAND BARU: reset semua donatur bulan ini (owner)
  // ════════════════════════════════════════════════════════
  if (commandName === "reset-donate") {
    if (user.id !== guild?.ownerId) {
      return interaction.reply({ content: "❌ Owner only!", ephemeral: true });
    }

    const key = getDonateKey();
    saveDonors(key, []);

    return interaction.reply({
      content: `✅ Data donatur bulan **${getMonthLabel()}** berhasil di-reset.`,
      ephemeral: true
    });
  }
});

// ===== VOICE TRACKING =====
setInterval(() => {
  client.guilds.cache.forEach(guild => {
    guild.channels.cache
      .filter(c => c.isVoiceBased())
      .forEach(channel => {
        const realMembers = channel.members.filter(m => !m.user.bot);
        if (realMembers.size < 2) return;

        realMembers.forEach(member => {
          const p = db.get(member.id, "points") || 0;
          db.add(member.id, "points", Math.floor(10 * antiRich(p)));
          db.add(member.id, "voice", 1);
        });
      });
  });
}, 60000);

// ===== REACTION =====
client.on("messageReactionAdd", (r, u) => {
  if (u.bot) return;
  if (r.message.channel.name !== "announcement") return;

  const p = db.get(u.id, "points") || 0;
  db.add(u.id, "points", Math.floor(5 * antiRich(p)));
});

// ===== SCHEDULER =====
setInterval(() => {
  const now = Date.now();
  let count = 0;

  for (let i = schedule.length - 1; i >= 0; i--) {
    if (count >= 50) break;
    count++;

    if (now >= schedule[i].time) {
      if (dmQueue.length < 1000) dmQueue.push({ id: schedule[i].id, message: schedule[i].message });
      schedule.splice(i, 1);
    }
  }
}, 2000);

// ===== DM QUEUE =====
setInterval(async () => {
  if (dmQueue.length === 0) return;
  const data = dmQueue.shift();

  try {
    let u = client.users.cache.get(data.id);
    if (!u) u = await client.users.fetch(data.id).catch(() => null);
    if (!u) return;
    await u.send(data.message).catch(() => {});
  } catch (e) {
    console.log("DM Queue Error:", e.message);
  }
}, 700);

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  schedule.length = 0;

  const data = db.all();
  const now  = Date.now();

  for (const id in data) {
    if (data[id].daily_remind && data[id].daily_remind > now)
      schedule.push({ id, time: data[id].daily_remind, message: "🎁 Daily kamu sudah bisa di-claim!", type: "daily" });
    if (data[id].weekly_remind && data[id].weekly_remind > now)
      schedule.push({ id, time: data[id].weekly_remind, message: "🎉 Weekly kamu sudah bisa di-claim!", type: "weekly" });
  }

  console.log(`📅 Restored ${schedule.length} reminder(s)`);
});

// ===== ERROR HANDLER =====
process.on("unhandledRejection", console.error);
process.on("uncaughtException",  console.error);

// ===== LOGIN =====
client.login(process.env.TOKEN);
