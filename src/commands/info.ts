import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Display bot information and statistics');

export async function execute(interaction: ChatInputCommandInteraction) {
  const client = interaction.client;
  
  // Calculate uptime
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const uptimeString = `${days}d ${hours}h ${minutes}m`;

  // Memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);

  const embed = new EmbedBuilder()
    .setTitle('🎮 Free Games Bot Info')
    .setColor(0x5865f2)
    .addFields(
      { name: '📊 Servers', value: client.guilds.cache.size.toString(), inline: true },
      { name: '👥 Users', value: client.users.cache.size.toString(), inline: true },
      { name: '⏰ Uptime', value: uptimeString, inline: true },
      { name: '💾 Memory', value: `${memUsageMB} MB`, inline: true },
      { name: '🔧 Node.js', value: process.version, inline: true },
      { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true }
    )
    .addFields(
      { 
        name: '🎮 Supported Platforms', 
        value: '• Epic Games Store\n• Steam\n• GoG\n• Amazon Prime Gaming',
        inline: false 
      },
      {
        name: '⚙️ Features',
        value: '• Automatic game checking every 6 hours\n• Customizable per-server settings\n• Auto-publish to announcement channels\n• Rich embeds with game details',
        inline: false
      }
    )
    .setFooter({ text: 'Made with ❤️ for gamers' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
