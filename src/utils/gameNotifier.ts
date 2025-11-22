import { Client, TextChannel, NewsChannel } from 'discord.js';
import { checkAllGames, generateGameId } from '../services/gameChecker';
import { createGameEmbed } from './embeds';
import { configManager } from './config';
import { logger } from './logger';

export async function checkAndPostGames(client: Client, guildId: string): Promise<number> {
  const config = configManager.getConfig(guildId);
  
  if (!config.channelId) {
    logger.debug(`No channel set for guild ${guildId}`);
    return 0;
  }

  const channel = await client.channels.fetch(config.channelId);
  
  if (!channel || (!channel.isTextBased() && !(channel instanceof NewsChannel))) {
    logger.warn(`Invalid channel for guild ${guildId}`);
    return 0;
  }

  const results = await checkAllGames(guildId);
  let totalPosted = 0;

  for (const result of results) {
    for (const game of result.games) {
      try {
        const embed = createGameEmbed(game);
        const message = await (channel as TextChannel | NewsChannel).send({
          embeds: [embed],
          content: '🎮 **New Free Game Available!**',
        });

        // Auto-publish if it's an announcement channel
        if (channel instanceof NewsChannel) {
          try {
            await message.crosspost();
            logger.info(`Auto-published message for ${game.title}`);
          } catch (error) {
            logger.error(`Failed to crosspost message for ${game.title}:`, error);
          }
        }

        // Mark game as sent
        const gameId = generateGameId(game);
        configManager.addSentGame(guildId, gameId);
        totalPosted++;

        // Add a small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error posting game ${game.title}:`, error);
      }
    }
  }

  return totalPosted;
}

export async function checkAllGuilds(client: Client): Promise<void> {
  const configs = configManager.getAllConfigs();
  
  for (const guildId in configs) {
    try {
      await checkAndPostGames(client, guildId);
    } catch (error) {
      logger.error(`Error checking games for guild ${guildId}:`, error);
    }
  }
}
