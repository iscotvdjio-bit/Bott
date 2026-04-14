require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim hadiah harian kamu"),

  new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("Claim hadiah mingguan kamu"),

  new SlashCommandBuilder()
    .setName("hunt")
    .setDescription("Berburu hewan untuk mendapatkan point"),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Lihat point dan rank kamu"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Lihat top 5 leaderboard chat & voice"),

  new SlashCommandBuilder()
    .setName("collection")
    .setDescription("Lihat koleksi hewan hasil buruan kamu"),

  new SlashCommandBuilder()
    .setName("add")
    .setDescription("(Owner) Tambah point ke user")
    .addUserOption(opt =>
      opt.setName("user").setDescription("Target user").setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("jumlah").setDescription("Jumlah point").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("(Owner) Reset point user")
    .addUserOption(opt =>
      opt.setName("user").setDescription("Target user").setRequired(true)
    ),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("⏳ Mendaftarkan slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("✅ Slash commands berhasil didaftarkan!");
  } catch (err) {
    console.error("❌ Gagal mendaftarkan commands:", err);
  }
})();
