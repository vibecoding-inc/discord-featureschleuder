import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  PermissionFlagsBits,
  ChannelType 
} from 'discord.js';
import { configManager } from '../utils/config';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embeds';
import { BotConfig } from '../types';

export const data = new SlashCommandBuilder()
  .setName('freegames')
  .setDescription('Manage free games notifications')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(subcommand =>
    subcommand
      .setName('channel')
      .setDescription('Set the channel for free game notifications')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel to send notifications to')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('enable')
      .setDescription('Enable notifications for a service')
      .addStringOption(option =>
        option
          .setName('service')
          .setDescription('The service to enable')
          .setRequired(true)
          .addChoices(
            { name: 'Epic Games', value: 'epic' },
            { name: 'Steam', value: 'steam' },
            { name: 'GoG', value: 'gog' },
            { name: 'Amazon Prime Gaming', value: 'amazonPrime' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('disable')
      .setDescription('Disable notifications for a service')
      .addStringOption(option =>
        option
          .setName('service')
          .setDescription('The service to disable')
          .setRequired(true)
          .addChoices(
            { name: 'Epic Games', value: 'epic' },
            { name: 'Steam', value: 'steam' },
            { name: 'GoG', value: 'gog' },
            { name: 'Amazon Prime Gaming', value: 'amazonPrime' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('View current configuration')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('check')
      .setDescription('Manually check for free games now')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all current free games without posting them')
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      embeds: [createErrorEmbed('This command can only be used in a server.')],
      ephemeral: true,
    });
    return;
  }

  switch (subcommand) {
    case 'channel':
      await handleChannelSubcommand(interaction, guildId);
      break;
    case 'enable':
      await handleEnableSubcommand(interaction, guildId);
      break;
    case 'disable':
      await handleDisableSubcommand(interaction, guildId);
      break;
    case 'status':
      await handleStatusSubcommand(interaction, guildId);
      break;
    case 'check':
      await handleCheckSubcommand(interaction, guildId);
      break;
    case 'list':
      await handleListSubcommand(interaction, guildId);
      break;
  }
}

async function handleChannelSubcommand(interaction: ChatInputCommandInteraction, guildId: string) {
  await interaction.reply({
    embeds: [createErrorEmbed('Channel configuration is now managed via the CHANNEL_ID environment variable. Please update your deployment configuration.')],
    ephemeral: true,
  });
}

async function handleEnableSubcommand(interaction: ChatInputCommandInteraction, guildId: string) {
  const service = interaction.options.getString('service', true) as keyof BotConfig['enabledServices'];
  const serviceName = getServiceName(service);
  
  await interaction.reply({
    embeds: [createErrorEmbed(`Service configuration is now managed via environment variables (ENABLE_EPIC, ENABLE_STEAM, ENABLE_GOG, ENABLE_AMAZON_PRIME). Please update your deployment configuration to enable ${serviceName}.`)],
    ephemeral: true,
  });
}

async function handleDisableSubcommand(interaction: ChatInputCommandInteraction, guildId: string) {
  const service = interaction.options.getString('service', true) as keyof BotConfig['enabledServices'];
  const serviceName = getServiceName(service);
  
  await interaction.reply({
    embeds: [createErrorEmbed(`Service configuration is now managed via environment variables (ENABLE_EPIC, ENABLE_STEAM, ENABLE_GOG, ENABLE_AMAZON_PRIME). Please update your deployment configuration to disable ${serviceName}.`)],
    ephemeral: true,
  });
}

async function handleStatusSubcommand(interaction: ChatInputCommandInteraction, guildId: string) {
  const config = configManager.getConfig(guildId);
  
  const statusText = `
**Channel:** ${config.channelId ? `<#${config.channelId}>` : 'Not set (configure via CHANNEL_ID env var)'}

**Enabled Services:** *(configured via environment variables)*
${config.enabledServices.epic ? '✅' : '❌'} Epic Games (ENABLE_EPIC)
${config.enabledServices.steam ? '✅' : '❌'} Steam (ENABLE_STEAM)
${config.enabledServices.gog ? '✅' : '❌'} GoG (ENABLE_GOG)
${config.enabledServices.amazonPrime ? '✅' : '❌'} Amazon Prime Gaming (ENABLE_AMAZON_PRIME)

**Last Checked:**
Epic: ${config.lastChecked.epic ? new Date(config.lastChecked.epic).toLocaleString() : 'Never'}
Steam: ${config.lastChecked.steam ? new Date(config.lastChecked.steam).toLocaleString() : 'Never'}
GoG: ${config.lastChecked.gog ? new Date(config.lastChecked.gog).toLocaleString() : 'Never'}
Amazon Prime: ${config.lastChecked.amazonPrime ? new Date(config.lastChecked.amazonPrime).toLocaleString() : 'Never'}
  `.trim();
  
  const embed = createSuccessEmbed(statusText)
    .setTitle('🎮 Free Games Bot Configuration');
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

async function handleCheckSubcommand(interaction: ChatInputCommandInteraction, guildId: string) {
  await interaction.deferReply({ ephemeral: true });
  
  const config = configManager.getConfig(guildId);
  
  if (!config.channelId) {
    await interaction.editReply({
      embeds: [createErrorEmbed('Please set a notification channel first using `/freegames channel`')],
    });
    return;
  }
  
  // Import dynamically to avoid circular dependencies
  const { checkAndPostGames } = await import('../utils/gameNotifier');
  
  try {
    const count = await checkAndPostGames(interaction.client, guildId);
    
    if (count > 0) {
      await interaction.editReply({
        embeds: [createSuccessEmbed(`Found and posted ${count} new free game(s)!`)],
      });
    } else {
      await interaction.editReply({
        embeds: [createSuccessEmbed('No new free games found at this time.')],
      });
    }
  } catch (error) {
    console.error('Error checking for games:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while checking for games.')],
    });
  }
}

async function handleListSubcommand(interaction: ChatInputCommandInteraction, guildId: string) {
  await interaction.deferReply({ ephemeral: true });
  
  // Import dynamically to avoid circular dependencies
  const { getAllCurrentGames } = await import('../services/gameChecker');
  const { createGameEmbed } = await import('../utils/embeds');
  
  try {
    const results = await getAllCurrentGames(guildId);
    
    if (results.length === 0) {
      await interaction.editReply({
        embeds: [createSuccessEmbed('No free games found at this time.')],
      });
      return;
    }
    
    let totalGames = 0;
    const embeds = [];
    
    for (const result of results) {
      for (const game of result.games) {
        embeds.push(createGameEmbed(game));
        totalGames++;
      }
    }
    
    // Discord has a limit of 10 embeds per message, so we need to send multiple messages if needed
    const maxEmbedsPerMessage = 10;
    let messageCount = 0;
    
    for (let i = 0; i < embeds.length; i += maxEmbedsPerMessage) {
      const batch = embeds.slice(i, i + maxEmbedsPerMessage);
      
      if (messageCount === 0) {
        // First message - edit the deferred reply
        await interaction.editReply({
          content: `🎮 **Found ${totalGames} free game(s):**`,
          embeds: batch,
        });
      } else {
        // Subsequent messages - send as follow-ups
        await interaction.followUp({
          embeds: batch,
          ephemeral: true,
        });
      }
      
      messageCount++;
      
      // Add a small delay between messages to avoid rate limiting
      if (i + maxEmbedsPerMessage < embeds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error('Error listing games:', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An error occurred while listing games.')],
    });
  }
}

function getServiceName(service: string): string {
  const names: Record<string, string> = {
    epic: 'Epic Games',
    steam: 'Steam',
    gog: 'GoG',
    amazonPrime: 'Amazon Prime Gaming',
  };
  return names[service] || service;
}
