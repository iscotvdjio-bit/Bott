require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Bot login sebagai ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // !ping
  if (message.content === '!ping') {
    return message.reply('🏓 Pong!');
  }

  // !profile
  if (message.content === '!profile') {
    const embed = new EmbedBuilder()
      .setTitle('📌 Profile User')
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Username', value: message.author.tag, inline: true },
        { name: 'User ID', value: message.author.id, inline: true }
      )
      .setColor(0x3498db)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
  
