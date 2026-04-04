require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
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

// ===== CONFIG =====
const HUNT_CD = 180000;
const DAILY_CD = 86400000;
const WEEKLY_CD = 604800000;
const CHAT_CD = 10000;
const CHAT_LIMIT = 100;
const REACT_CD = 5000;
const VOICE_CD = 60000;

// ===== HEWAN =====
const animals = [
  { name: "🐱 Kucing", value: 50, rarity: "Common", image: "https://i.imgur.com/1XKQ9Zp.png" },
  { name: "🐶 Anjing", value: 50, rarity: "Common", image: "https://i.imgur.com/Z8pQZ6F.png" },
  { name: "🐔 Ayam", value: 40, rarity: "Common", image: "https://i.imgur.com/9Xn4XyZ.png" },
  { name: "🦊 Rubah", value: 150, rarity: "Rare", image: "https://i.imgur.com/kR7JmGk.png" },
  { name: "🐼 Panda", value: 200, rarity: "Rare", image: "https://i.imgur.com/T7yP8WB.png" },
  { name: "🐺 Serigala", value: 180, rarity: "Rare", image: "https://i.imgur.com/3k9QZpH.png" },
  { name: "🐲 Naga", value: 500, rarity: "Legendary", image: "https://i.imgur.com/Wl8Qp9G.png" },
  { name: "🦄 Unicorn", value: 600, rarity: "Legendary", image: "https://i.imgur.com/6XwQZ9M.png" }
];

// ===== RANK =====
function rank(p) {
  if (p >= 10000) return "👑 Sultan";
  if (p >= 5000) return "💎 Legend";
  if (p >= 3000) return "🔥 Elite";
  if (p >= 1500) return "⭐ Pro";
  if (p >= 500) return "🌱 Rookie";
  return "🐣 Beginner";
}

// ===== MESSAGE =====
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const id = msg.author.id;

  // ===== REMINDER CHECK =====
  const now = Date.now();

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

  // ===== CHAT ANTI SPAM =====
  const lastChat = db.get(id, "lastChat");
  const today = new Date().toDateString();

  if (db.get(id, "chatDate") !== today) {
    db.set(id, "chatDaily", 0);
    db.set(id, "chatDate", today);
  }

  if (Date.now() - lastChat > CHAT_CD && db.get(id, "chatDaily") < CHAT_LIMIT) {
    db.set(id, "lastChat", Date.now());
    db.add(id, "points", 5);
    db.add(id, "chat", 1);
    db.add(id, "chatDaily", 1);

    if (msg.attachments.size > 0) db.add(id, "points", 10);
    if (msg.reference) db.add(id, "points", 5);
  }

  if (!msg.content.startsWith(prefix)) return;

  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const guildIcon = msg.guild?.iconURL({ dynamic: true }) || null;

  // ===== DAILY =====
  if (cmd === "daily") {
    const last = db.get(id, "daily") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("daily_btn").setLabel("⏰ Ingatkan Saya").setStyle(ButtonStyle.Primary)
    );

    if (now - last < DAILY_CD) {
      return msg.reply({
        embeds: [new EmbedBuilder().setColor("#57F287").setAuthor({ name: "Daily Claimed!", iconURL: guildIcon }).setDescription("Reward: 💠 Sudah diambil")],
        components: [row]
      });
    }

    db.set(id, "daily", now);
    db.add(id, "points", 200);

    msg.reply({
      embeds: [new EmbedBuilder().setColor("#57F287").setAuthor({ name: "Daily Claimed!", iconURL: guildIcon }).setDescription("Reward: 💠 200 Poin Aktivitas")],
      components: [row]
    });
  }

  // ===== WEEKLY =====
  if (cmd === "weekly") {
    const last = db.get(id, "weekly") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("weekly_btn").setLabel("⏰ Ingatkan Minggu Depan").setStyle(ButtonStyle.Success)
    );

    if (now - last < WEEKLY_CD) {
      return msg.reply({
        embeds: [new EmbedBuilder().setColor("#FEE75C").setAuthor({ name: "Weekly Claimed!", iconURL: guildIcon }).setDescription("Reward: 💠 Sudah diambil")],
        components: [row]
      });
    }

    db.set(id, "weekly", now);
    db.add(id, "points", 1000);

    msg.reply({
      embeds: [new EmbedBuilder().setColor("#FEE75C").setAuthor({ name: "Weekly Claimed!", iconURL: guildIcon }).setDescription("Reward: 💠 1000 Poin Aktivitas")],
      components: [row]
    });
  }

  // ===== HUNT =====
  if (cmd === "hunt") {
    const last = db.get(id, "hunt");

    if (Date.now() - last < HUNT_CD)
      return msg.reply("⏳ Tunggu 3 menit");

    db.set(id, "hunt", Date.now());

    const m = await msg.reply("🌲 Masuk hutan...");

    setTimeout(async () => {
      await m.edit("👀 Ada sesuatu...");
      setTimeout(async () => {
        await m.edit("⚔️ Bertarung...");
        setTimeout(async () => {

          if (Math.random() < 0.3) {
            db.add(id, "points", -50);
            return m.edit("💀 Gagal (-50)");
          }

          const a = animals[Math.floor(Math.random() * animals.length)];
          let p = db.get(id, "points");

          let mult = 1;
          if (p > 10000) mult = 0.5;
          else if (p > 5000) mult = 0.7;

          const reward = Math.floor(a.value * mult);

          db.add(id, "points", reward);
          db.add(id, `col_${a.name}`, 1);

          m.edit({
            embeds: [new EmbedBuilder().setTitle("🏹 Hunt Berhasil!").setDescription(`${a.name}\n+${reward}`).setImage(a.image)]
          });

        }, 2000);
      }, 2000);
    }, 2000);
  }

  // ===== BALANCE =====
  if (cmd === "balance") {
    const p = db.get(id, "points");

    msg.reply({
      embeds: [new EmbedBuilder().setTitle("💰 Profile").setDescription(`
👤 ${msg.author.username}
🏆 ${rank(p)}

💬 ${db.get(id, "chat")} 🟢
🔊 ${db.get(id, "voice")} 🔵

✨ ${p} point
`)]
    });
  }

  // ===== COLLECTION =====
  if (cmd === "collection") {
    let text = "";
    for (let a of animals) {
      const c = db.get(id, `col_${a.name}`);
      if (c > 0) text += `${a.name} x${c}\n`;
    }
    if (!text) text = "Belum ada koleksi";

    msg.reply({ embeds: [new EmbedBuilder().setTitle("🎒 Collection").setDescription(text)] });
  }

  // ===== LEADERBOARD =====
  if (cmd === "leaderboard") {
    const data = db.all();

    let arr = Object.keys(data).map(u => ({
      id: u,
      p: data[u].points || 0
    }));

    arr.sort((a, b) => b.p - a.p);

    let text = arr.slice(0, 5).map((u, i) =>
      `#${i + 1} <@${u.id}> - ${u.p}`
    ).join("\n");

    msg.reply({
      embeds: [new EmbedBuilder().setTitle("🏆 Leaderboard").setDescription(text + `\n\n👤 Kamu: ${db.get(id, "points")}`)]
    });
  }

  // ===== ADD & RESET =====
  if (cmd === "add") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return msg.reply("❌ Admin only");

    const user = msg.mentions.users.first();
    const amount = parseInt(args[0]);

    db.add(user.id, "points", amount);
    msg.reply(`✅ +${amount}`);
  }

  if (cmd === "reset") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return msg.reply("❌ Admin only");

    const user = msg.mentions.users.first();
    db.set(user.id, "points", 0);

    msg.reply("♻️ Reset");
  }
});

// ===== REACTION ANTI SPAM =====
client.on("messageReactionAdd", (r, user) => {
  if (user.bot) return;
  if (r.message.channel.name !== "announcement") return;

  const last = db.get(user.id, "lastReact") || 0;

  if (Date.now() - last > REACT_CD) {
    db.set(user.id, "lastReact", Date.now());
    db.add(user.id, "points", 5);
  }
});

// ===== VOICE ANTI SPAM =====
client.on("voiceStateUpdate", (o, n) => {
  if (!n.channel) return;

  const members = n.channel.members.filter(m => !m.user.bot);
  if (members.size < 2) return;

  members.forEach(m => {
    const last = db.get(m.id, "lastVoice") || 0;

    if (Date.now() - last > VOICE_CD) {
      db.set(m.id, "lastVoice", Date.now());
      db.add(m.id, "points", 2);
      db.add(m.id, "voice", 1);
    }
  });
});

// ===== BUTTON =====
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  const id = i.user.id;

  if (i.customId === "daily_btn") {
    db.set(id, "daily_remind", Date.now() + 86400000);
    i.reply({ content: "⏰ Reminder daily aktif!", ephemeral: true });
  }

  if (i.customId === "weekly_btn") {
    db.set(id, "weekly_remind", Date.now() + 604800000);
    i.reply({ content: "⏰ Reminder weekly aktif!", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
