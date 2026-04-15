require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim reward harian kamu"),

  new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("Claim reward mingguan kamu"),

  new SlashCommandBuilder()
    .setName("hunt")
    .setDescription("Berburu hewan untuk mendapatkan point"),

  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Lihat total point aktivitas kamu"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Lihat top leaderboard chat dan voice"),

  new SlashCommandBuilder()
    .setName("collection")
    .setDescription("Lihat koleksi hewan buruan kamu"),

  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Tambahkan point ke user (Owner only)")
    .addUserOption(opt =>
      opt.setName("user").setDescription("Target user").setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("jumlah").setDescription("Jumlah point").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reset point user (Owner only)")
    .addUserOption(opt =>
      opt.setName("user").setDescription("Target user").setRequired(true)
    ),

  // ─── DONATE COMMANDS ───────────────────────────────────

  new SlashCommandBuilder()
    .setName("donate-top")
    .setDescription("Lihat top 10 donatur server"),

  new SlashCommandBuilder()
    .setName("donate-add")
    .setDescription("Tambahkan data donasi (Owner only)")
    .addStringOption(opt =>
      opt.setName("nama").setDescription("Nama donatur").setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("jumlah").setDescription("Jumlah donasi (Rp)").setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("sumber")
        .setDescription("Sumber donasi")
        .setRequired(false)
        .addChoices(
          { name: "Saweria", value: "saweria" },
          { name: "Sociabuzz", value: "sociabuzz" },
          { name: "Manual", value: "manual" }
        )
    ),

  new SlashCommandBuilder()
    .setName("donate-set")
    .setDescription("Set total donasi seseorang (Owner only, override)")
    .addStringOption(opt =>
      opt.setName("nama").setDescription("Nama donatur").setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("jumlah").setDescription("Total donasi (Rp)").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("donate-remove")
    .setDescription("Hapus donatur dari list (Owner only)")
    .addStringOption(opt =>
      opt.setName("nama").setDescription("Nama donatur").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("donate-reset")
    .setDescription("Reset semua data donasi (Owner only)"),

  new SlashCommandBuilder()
    .setName("donate-bulan")
    .setDescription("Set nama bulan donasi (Owner only)")
    .addStringOption(opt =>
      opt.setName("bulan").setDescription("Contoh: Mei 2026").setRequired(true)
    )

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Mendaftarkan slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash commands berhasil didaftarkan!");
  } catch (err) {
    console.error("❌ Gagal mendaftarkan commands:", err);
  }
})();
