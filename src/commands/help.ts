import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction,
  EmbedBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show help information and command usage');

export async function execute(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle('🎮 Free Games Bot - Help')
    .setColor(0x5865f2)
    .setDescription('This bot automatically announces free games from multiple platforms!')
    .addFields(
      {
        name: '📝 Configuration Commands',
        value: 
          '`/freegames channel` - Set the notification channel\n' +
          '`/freegames enable` - Enable notifications for a service\n' +
          '`/freegames disable` - Disable notifications for a service\n' +
          '`/freegames status` - View current configuration',
        inline: false
      },
      {
        name: '🔍 Action Commands',
        value: 
          '`/freegames check` - Manually check for new free games\n' +
          '`/info` - Display bot statistics and information\n' +
          '`/help` - Show this help message',
        inline: false
      },
      {
        name: '🎮 Supported Platforms',
        value: '• Epic Games Store\n• Steam\n• GoG (Good Old Games)\n• Amazon Prime Gaming',
        inline: false
      },
      {
        name: '⚙️ Features',
        value: 
          '• **Automatic Checks**: Bot checks every 6 hours\n' +
          '• **Rich Embeds**: Beautiful game cards with images\n' +
          '• **Smart Tracking**: Won\'t post the same game twice\n' +
          '• **Auto-Publish**: Automatically publishes to announcement channels\n' +
          '• **Per-Server Config**: Each server has its own settings',
        inline: false
      },
      {
        name: '🚀 Quick Start',
        value: 
          '1. Use `/freegames channel #your-channel` to set where games are posted\n' +
          '2. Optionally configure which services to monitor\n' +
          '3. Wait for automatic checks or use `/freegames check` to test',
        inline: false
      },
      {
        name: '💡 Tips',
        value: 
          '• Use an **Announcement Channel** for auto-publishing\n' +
          '• All services are enabled by default\n' +
          '• Only users with "Manage Server" permission can configure the bot',
        inline: false
      }
    )
    .setFooter({ text: 'Need more help? Check the GitHub repository' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
