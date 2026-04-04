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
    GatewayIntentBits.GuildMessageReactions
  ]
});

const prefix = "!";

// =======================
// ⏱️ COOLDOWN
// =======================
const HUNT_CD = 180000;
const DAILY_CD = 86400000;
const WEEKLY_CD = 604800000;

// =======================
// 🐾 HEWAN
// =======================
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

// =======================
// 🎖️ RANK
// =======================
function rank(p) {
  if (p >= 5000) return "💎 Legend";
  if (p >= 3000) return "🔥 Elite";
  if (p >= 1500) return "⭐ Pro";
  if (p >= 500) return "🌱 Rookie";
  return "🐣 Beginner";
}

// =======================
// 💬 CHAT
// =======================
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  const id = msg.author.id;

  db.add(id, "points", 5);
  db.add(id, "chat", 1);

  if (msg.attachments.size > 0) db.add(id, "points", 10);
  if (msg.reference) db.add(id, "points", 5);
});

// =======================
// 🔊 VOICE
// =======================
client.on("voiceStateUpdate", (o, n) => {
  if (!n.channel) return;

  const members = n.channel.members.filter(m => !m.user.bot);
  if (members.size < 2) return;

  members.forEach(m => {
    db.add(m.id, "points", 2);
    db.add(m.id, "voice", 1);
  });
});

// =======================
// 🎉 REACTION
// =======================
client.on("messageReactionAdd", (r, user) => {
  if (user.bot) return;
  if (r.message.channel.name === "announcement") {
    db.add(user.id, "points", 5);
  }
});

// =======================
// 🎮 COMMAND
// =======================
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith(prefix)) return;

  const args = msg.content.slice(1).split(" ");
  const cmd = args[0].toLowerCase();
  const id = msg.author.id;

  // ================= DAILY =================
  if (cmd === "daily") {
    const last = db.get(id, "daily");

    if (Date.now() - last < DAILY_CD) {
      const embed = new EmbedBuilder()
        .setTitle("⏳ Daily Sudah Diambil");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("daily_remind")
          .setLabel("⏰ Ingatkan Saya")
          .setStyle(ButtonStyle.Primary)
      );

      return msg.reply({ embeds: [embed], components: [row] });
    }

    db.set(id, "daily", Date.now());
    db.add(id, "points", 200);

    msg.reply("🎁 +200 point");
  }

  // ================= WEEKLY =================
  if (cmd === "weekly") {
    const last = db.get(id, "weekly");

    if (Date.now() - last < WEEKLY_CD) {
      const embed = new EmbedBuilder()
        .setTitle("⏳ Weekly Sudah Diambil");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("weekly_remind")
          .setLabel("⏰ Ingatkan Saya")
          .setStyle(ButtonStyle.Success)
      );

      return msg.reply({ embeds: [embed], components: [row] });
    }

    db.set(id, "weekly", Date.now());
    db.add(id, "points", 1000);

    msg.reply("🎉 +1000 point");
  }

  // ================= HUNT =================
  if (cmd === "hunt") {
    const last = db.get(id, "hunt");

    if (Date.now() - last < HUNT_CD) {
      return msg.reply("⏳ Tunggu 3 menit!");
    }

    db.set(id, "hunt", Date.now());

    const m = await msg.reply("🌲 Masuk hutan...");

    setTimeout(async () => {
      await m.edit("👀 Ada sesuatu...");

      setTimeout(async () => {
        await m.edit("⚔️ Bertarung...");

        setTimeout(async () => {

          const fail = Math.random() < 0.3;

          if (fail) {
            db.add(id, "points", -50);
            return m.edit("💀 Gagal (-50)");
          }

          const a = animals[Math.floor(Math.random() * animals.length)];

          db.add(id, "points", a.value);
          db.add(id, `col_${a.name}`, 1);

          const embed = new EmbedBuilder()
            .setTitle("🏹 Berhasil")
            .setDescription(`${a.name}\n+${a.value}`)
            .setImage(a.image);

          m.edit({ content: "", embeds: [embed] });

        }, 2000);
      }, 2000);
    }, 2000);
  }

  // ================= ADD POINT =================
  if (cmd === "add") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return msg.reply("❌ Admin only");

    const user = msg.mentions.users.first();
    const amount = parseInt(args[2]);

    db.add(user.id, "points", amount);

    msg.reply(`✅ Ditambahkan ${amount}`);
  }

  // ================= RESET =================
  if (cmd === "reset") {
    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return msg.reply("❌ Admin only");

    const user = msg.mentions.users.first();

    db.set(user.id, "points", 0);

    msg.reply("♻️ Reset berhasil");
  }
});

// ================= BUTTON =================
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  if (i.customId === "daily_remind") {
    i.reply("⏰ Balik lagi besok ya!");
  }

  if (i.customId === "weekly_remind") {
    i.reply("⏰ Jangan lupa minggu depan!");
  }
});

client.login(process.env.TOKEN);
