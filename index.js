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
  { name: "🐱 Kucing", value: 50, rarity: "Common", image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131" },
  { name: "🐶 Anjing", value: 50, rarity: "Common", image: "https://images.unsplash.com/photo-1517849845537-4d257902454a" },
  { name: "🐔 Ayam", value: 40, rarity: "Common", image: "https://images.unsplash.com/photo-1589927986089-35812388d1f4" },
  { name: "🦊 Rubah", value: 150, rarity: "Rare", image: "https://images.unsplash.com/photo-1501706362039-c6e08a6b9b6f" },
  { name: "🐼 Panda", value: 200, rarity: "Rare", image: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7" },
  { name: "🐺 Serigala", value: 180, rarity: "Rare", image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1" },
  { name: "🐲 Naga", value: 500, rarity: "Legendary", image: "https://images.unsplash.com/photo-1611605698335-8b1569810432" },
  { name: "🦄 Unicorn", value: 600, rarity: "Legendary", image: "https://images.unsplash.com/photo-1619995745882-f4128ac82ad6" }
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
  const now = Date.now();

  // ===== REMINDER =====
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

  // ===== CHAT =====
  const lastChat = db.get(id, "lastChat");
  const today = new Date().toDateString();

  if (db.get(id, "chatDate") !== today) {
    db.set(id, "chatDaily", 0);
    db.set(id, "chatDate", today);
  }

  if (now - lastChat > CHAT_CD && db.get(id, "chatDaily") < CHAT_LIMIT) {
    db.set(id, "lastChat", now);
    db.add(id, "points", 5);
    db.add(id, "chat", 1);
    db.add(id, "chatDaily", 1);

    if (msg.attachments.size > 0) db.add(id, "points", 10);
    if (msg.reference) db.add(id, "points", 5);
  }

  if (!msg.content.startsWith(prefix)) return;

  const args = msg.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // ===== DAILY =====
  if (cmd === "daily") {
    const last = db.get(id, "daily") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("daily_btn").setLabel("⏰ Ingatkan Saya").setStyle(ButtonStyle.Primary)
    );

    if (now - last < DAILY_CD) {
      return msg.reply({ embeds: [new EmbedBuilder().setDescription("💠 Sudah diambil")], components: [row] });
    }

    db.set(id, "daily", now);
    db.add(id, "points", 200);

    msg.reply({ embeds: [new EmbedBuilder().setDescription("💠 +200 Point")], components: [row] });
  }

  // ===== WEEKLY =====
  if (cmd === "weekly") {
    const last = db.get(id, "weekly") || 0;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("weekly_btn").setLabel("⏰ Ingatkan Minggu Depan").setStyle(ButtonStyle.Success)
    );

    if (now - last < WEEKLY_CD) {
      return msg.reply({ embeds: [new EmbedBuilder().setDescription("💠 Sudah diambil")], components: [row] });
    }

    db.set(id, "weekly", now);
    db.add(id, "points", 1000);

    msg.reply({ embeds: [new EmbedBuilder().setDescription("💠 +1000 Point")], components: [row] });
  }

  // ===== HUNT =====
  if (cmd === "hunt") {
    const last = db.get(id, "hunt");
    if (now - last < HUNT_CD) return msg.reply("⏳ Tunggu 3 menit");

    db.set(id, "hunt", now);

    const m = await msg.reply("🌲 Masuk hutan...");

    setTimeout(async () => {
      await m.edit("⚔️ Bertarung...");
      setTimeout(async () => {

        if (Math.random() < 0.3) {
          db.add(id, "points", -50);
          return m.edit("💀 Hewan Buruan Lolos (-50)");
        }

        const a = animals[Math.floor(Math.random() * animals.length)];
        let p = db.get(id, "points");

        let mult = p > 10000 ? 0.5 : p > 5000 ? 0.7 : 1;
        const reward = Math.floor(a.value * mult);

        db.add(id, "points", reward);
        db.add(id, `col_${a.name}`, 1);

        m.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle("🏹 Hunt Berhasil!")
              .setDescription(`${a.name}\n💰 +${reward}\n✨ ${a.rarity}`)
              .setImage(a.image)
          ]
        });

      }, 2000);
    }, 2000);
  }

  // ===== BALANCE =====
  if (cmd === "balance") {
    const p = db.get(id, "points");

    msg.reply({
      embeds: [new EmbedBuilder().setColor("Blue").setTitle("💰 Profile").setDescription(`
👤 ${msg.author.username}
🏆 ${rank(p)}

💬 ${db.get(id, "chat")}
🔊 ${db.get(id, "voice")}

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

    msg.reply({ embeds: [new EmbedBuilder().setColor("Blue").setColor("Blue").setTitle("🎒 Collection").setDescription(text)] });
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
      embeds: [new EmbedBuilder().setColor("Blue").setTitle("🏆 Leaderboard").setDescription(text + `\n\n👤 Point Kamu: ${db.get(id, "points")}`)]
    });
  }

  // ===== ADD (OWNER ONLY) =====
  if (cmd === "add") {
    if (msg.author.id !== msg.guild.ownerId)
      return msg.reply("❌ Hanya OWNER server!");

    const user = msg.mentions.users.first();
    const amount = parseInt(args[0]);

    if (!user || isNaN(amount))
      return msg.reply("⚠️ !add @user jumlah");

    db.add(user.id, "points", amount);

    msg.reply({
      embeds: [new EmbedBuilder().setColor("Green").setDescription(`+${amount} ke ${user.username}`)]
    });
  }

  // ===== RESET (OWNER ONLY) =====
  if (cmd === "reset") {
    if (msg.author.id !== msg.guild.ownerId)
      return msg.reply("❌ Hanya OWNER server!");

    const user = msg.mentions.users.first();
    if (!user) return msg.reply("⚠️ !reset @user");

    db.set(user.id, "points", 0);
    db.set(user.id, "chat", 0);
    db.set(user.id, "voice", 0);

    msg.reply({
      embeds: [new EmbedBuilder().setColor("Red").setDescription(`Reset ${user.username}`)]
    });
  }

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
