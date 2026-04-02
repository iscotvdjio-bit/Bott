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

  // (SEMUA COMMAND TETAP SAMA — tidak diubah)
});

client.once('ready', () => {
  console.log("🤖 Bot ready");
});

client.login(TOKEN);
