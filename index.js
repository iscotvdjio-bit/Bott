                          require('dotenv').config();
const fs = require('fs');
const { 
  Client, GatewayIntentBits, EmbedBuilder 
} = require('discord.js');

const { getUser, updateUser } = require('./database');

// ================= ANTI ERROR DATABASE =================
if (!fs.existsSync('./database.json')) {
  fs.writeFileSync('./database.json', '{}');
}

// ================= BOT SETUP =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= HEWAN =================
const animals = [
  { name: "🐇 Kelinci", chance: 80, price: 50 },
  { name: "🐔 Ayam", chance: 70, price: 70 },
  { name: "🦊 Rubah", chance: 50, price: 120 },
  { name: "🐺 Serigala", chance: 30, price: 200 },
  { name: "🐉 Naga", chance: 10, price: 500 }
];

// ================= READY =================
client.on('ready', () => {
  console.log(`✅ Bot login sebagai ${client.user.tag}`);
});

// ================= COMMAND =================
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const args = msg.content.split(" ");
  const cmd = args[0].toLowerCase();

  const user = getUser(msg.author.id);

  // ===== PROFILE =====
  if (cmd === "!profile") {
    const embed = new EmbedBuilder()
      .setTitle("👤 Profile RPG")
      .setDescription(`
💰 Gold: ${user.gold}
⭐ Exp: ${user.exp}
📊 Level: ${user.level}
🐾 Hewan: ${user.hewan.length}
      `);

    return msg.reply({ embeds: [embed] });
  }

  // ===== HUNT =====
  if (cmd === "!hunt") {
    let success = Math.random() < 0.7;

    if (!success) {
      return msg.reply("❌ Kamu gagal berburu!");
    }

    const animal = animals[Math.floor(Math.random() * animals.length)];

    user.hewan.push(animal);
    user.exp += 10;

    // LEVEL UP
    if (user.exp >= user.level * 50) {
      user.level++;
      user.exp = 0;
      msg.reply(`🎉 Level up! Sekarang level ${user.level}`);
    }

    updateUser(msg.author.id, user);

    return msg.reply(`🎯 Kamu mendapatkan ${animal.name}!`);
  }

  // ===== INVENTORY =====
  if (cmd === "!inv") {
    if (user.hewan.length === 0) {
      return msg.reply("📦 Inventory kosong!");
    }

    let list = user.hewan.map((h, i) => `${i+1}. ${h.name}`).join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📦 Inventory")
      .setDescription(list);

    return msg.reply({ embeds: [embed] });
  }

  // ===== JUAL =====
  if (cmd === "!jual") {
    if (user.hewan.length === 0) {
      return msg.reply("❌ Tidak ada hewan!");
    }

    let total = 0;
    user.hewan.forEach(h => total += h.price);

    user.gold += total;
    user.hewan = [];

    updateUser(msg.author.id, user);

    return msg.reply(`💰 Semua hewan terjual! Dapat ${total} gold`);
  }

  // ===== DAILY =====
  if (cmd === "!daily") {
    const now = Date.now();

    if (!user.lastDaily) user.lastDaily = 0;

    if (now - user.lastDaily < 86400000) {
      return msg.reply("⏳ Daily sudah diambil!");
    }

    user.gold += 200;
    user.lastDaily = now;

    updateUser(msg.author.id, user);

    return msg.reply("🎁 Kamu dapat 200 gold!");
  }
});

client.login(process.env.TOKEN);
