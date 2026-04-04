require('dotenv').config();
const { 
  Client, GatewayIntentBits, EmbedBuilder, 
  SlashCommandBuilder, REST, Routes, PermissionFlagsBits 
} = require('discord.js');
const { QuickDB } = require('quick.db');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ] 
});

const db = new QuickDB();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const COOLDOWN = 30000;

// 🐾 Hewan
const animals = [
  { name: "Ayam", price: 30, emoji: "🐔" },
  { name: "Kelinci", price: 50, emoji: "🐰" },
  { name: "Rusa", price: 70, emoji: "🦌" },
  { name: "Harimau", price: 90, emoji: "🐯" },
  { name: "Beruang", price: 110, emoji: "🐻" },
  { name: "Elang", price: 130, emoji: "🦅" },
  { name: "Singa", price: 200, emoji: "🦁" },
  { name: "Paus", price: 250, emoji: "🐳" }
];

// 📊 LEVEL
function getNeededExp(level) {
  return level * 100;
}

async function addExp(userId, amount) {
  let exp = await db.get(`exp_${userId}`) || 0;
  let level = await db.get(`level_${userId}`) || 1;

  exp += amount;

  if (exp >= getNeededExp(level)) {
    exp -= getNeededExp(level);
    level++;
    await db.set(`level_${userId}`, level);
  }

  await db.set(`exp_${userId}`, exp);
}

// 📜 COMMANDS
const commands = [
  new SlashCommandBuilder().setName('hunt').setDescription('Berburu hewan'),
  new SlashCommandBuilder().setName('inventory').setDescription('Inventory'),
  new SlashCommandBuilder().setName('jual').setDescription('Jual item'),
  new SlashCommandBuilder().setName('balance').setDescription('Cek uang'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Top player'),
  new SlashCommandBuilder().setName('profile').setDescription('Profile'),

  new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('Admin: tambah uang')
    .addUserOption(o => o.setName('user').setRequired(true))
    .addIntegerOption(o => o.setName('jumlah').setRequired(true)),

  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Admin: reset user')
    .addUserOption(o => o.setName('user').setRequired(true))
].map(c => c.toJSON());

// 🚀 REGISTER
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
})();

// 💬 CHAT REWARD
client.on('messageCreate', async (m) => {
  if (m.author.bot) return;

  const u = m.author.id;
  const now = Date.now();
  const last = await db.get(`chat_${u}`);

  if (last && now - last < 10000) return;

  await db.set(`chat_${u}`, now);

  await db.add(`money_${u}`, Math.floor(Math.random() * 10) + 5);
  await addExp(u, Math.floor(Math.random() * 10) + 5);
});

// 🔊 VOICE REWARD
client.on('voiceStateUpdate', async (o, n) => {
  const u = n.id;

  if (!o.channel && n.channel) await db.set(`voice_${u}`, Date.now());

  if (o.channel && !n.channel) {
    const t = await db.get(`voice_${u}`);
    if (!t) return;

    const min = Math.floor((Date.now() - t) / 60000);

    if (min > 0) {
      await db.add(`money_${u}`, min * 20);
      await addExp(u, min * 10);
    }

    await db.delete(`voice_${u}`);
  }
});

// 🎮 COMMAND HANDLER
client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;

  const u = i.user.id;

  // 🏹 HUNT
  if (i.commandName === 'hunt') {
    const last = await db.get(`cd_${u}`);
    const now = Date.now();

    if (last && now - last < COOLDOWN) {
      const s = Math.ceil((COOLDOWN - (now - last)) / 1000);
      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⏳ Cooldown")
            .setDescription(`Tunggu ${s} detik lagi`)
            .setColor("Orange")
        ]
      });
    }

    await db.set(`cd_${u}`, now);

    if (Math.random() < 0.4) {
      await addExp(u, 5);
      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Hunt Gagal")
            .setColor("Red")
        ]
      });
    }

    const a = animals[Math.floor(Math.random() * animals.length)];
    await db.add(`inv_${u}_${a.name}`, 1);
    await addExp(u, 20);

    i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏹 Hunt Berhasil")
          .setDescription(`${a.emoji} ${a.name}`)
          .setColor("Green")
      ]
    });
  }

  // 🎒 INVENTORY
  if (i.commandName === 'inventory') {
    let txt = "";

    for (let a of animals) {
      let j = await db.get(`inv_${u}_${a.name}`) || 0;
      if (j > 0) txt += `${a.emoji} ${a.name}: ${j}\n`;
    }

    if (!txt) txt = "Kosong";

    i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🎒 Inventory")
          .setDescription(txt)
          .setColor("Blue")
      ]
    });
  }

  // 💰 JUAL
  if (i.commandName === 'jual') {
    let total = 0;

    for (let a of animals) {
      let j = await db.get(`inv_${u}_${a.name}`) || 0;

      if (j > 0) {
        total += j * a.price;
        await db.set(`inv_${u}_${a.name}`, 0);
      }
    }

    if (total === 0) {
      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Gagal")
            .setDescription("Tidak ada item")
            .setColor("Red")
        ]
      });
    }

    await db.add(`money_${u}`, total);

    i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("💰 Berhasil Jual")
          .setDescription(`${total} coins`)
          .setColor("Green")
      ]
    });
  }

  // 🪙 BALANCE
  if (i.commandName === 'balance') {
    let m = await db.get(`money_${u}`) || 0;

    i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🪙 Balance")
          .setDescription(`${m} coins`)
          .setColor("Gold")
      ]
    });
  }

  // 🏆 LEADERBOARD
  if (i.commandName === 'leaderboard') {
    const all = await db.all();

    const users = all
      .filter(d => d.id.startsWith('money_'))
      .map(d => ({
        id: d.id.split('_')[1],
        money: d.value
      }))
      .sort((a, b) => b.money - a.money)
      .slice(0, 10);

    let txt = "";

    for (let x = 0; x < users.length; x++) {
      const us = await client.users.fetch(users[x].id).catch(() => null);
      txt += `#${x + 1} ${us?.username || "Unknown"} — ${users[x].money}\n`;
    }

    i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 Leaderboard")
          .setDescription(txt)
          .setColor("Gold")
      ]
    });
  }

  // 👤 PROFILE (EMBED)
  if (i.commandName === 'profile') {
    const user = i.user;

    const money = await db.get(`money_${user.id}`) || 0;
    const level = await db.get(`level_${user.id}`) || 1;
    const exp = await db.get(`exp_${user.id}`) || 0;
    const need = getNeededExp(level);

    let total = 0;
    for (let a of animals) {
      total += await db.get(`inv_${user.id}_${a.name}`) || 0;
    }

    i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("👤 Profile")
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: "🪙 Coins", value: `${money}`, inline: true },
            { name: "⭐ Level", value: `${level}`, inline: true },
            { name: "📊 EXP", value: `${exp}/${need}`, inline: true },
            { name: "🎒 Item", value: `${total}`, inline: true }
          )
          .setColor("Blue")
      ]
    });
  }

  // 👑 ADD MONEY
  if (i.commandName === 'addmoney') {
    if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return i.reply("❌ Admin only");
    }

    const t = i.options.getUser('user');
    const j = i.options.getInteger('jumlah');

    await db.add(`money_${t.id}`, j);

    i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Admin")
          .setDescription(`Tambah ${j} coins ke ${t.username}`)
          .setColor("Green")
      ]
    });
  }

  // 🔄 RESET
  if (i.commandName === 'reset') {
    if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return i.reply("❌ Admin only");
    }

    const t = i.options.getUser('user');

    await db.set(`money_${t.id}`, 0);
    await db.set(`exp_${t.id}`, 0);
    await db.set(`level_${t.id}`, 1);

    for (let a of animals) {
      await db.set(`inv_${t.id}_${a.name}`, 0);
    }

    i.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔄 Reset")
          .setDescription(`Data ${t.username} direset`)
          .setColor("Orange")
      ]
    });
  }
});

client.once('ready', () => {
  console.log("🤖 Bot ready");
});

client.login(TOKEN);
