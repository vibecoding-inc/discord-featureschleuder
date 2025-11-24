import { FreeGame, BotConfig } from '../types';
import { fetchEpicGames } from './epic';
import { fetchSteamGames } from './steam';
import { fetchGoGGames } from './gog';
import { fetchAmazonPrimeGames } from './amazon';
import { configManager } from '../utils/config';
import { logger } from '../utils/logger';

export interface GameFetchResult {
  games: FreeGame[];
  service: string;
}

export async function checkAllGames(guildId: string): Promise<GameFetchResult[]> {
  const config = configManager.getConfig(guildId);
  const results: GameFetchResult[] = [];

  // Clean up games that haven't been free for more than 24 hours
  const removedCount = configManager.cleanupOldGames(guildId, 24);
  if (removedCount > 0) {
    logger.info(`Cleaned up ${removedCount} old game(s) for guild ${guildId}`);
  }

  // Map service names to their fetcher functions
  const serviceFetchers: Record<keyof BotConfig['enabledServices'], () => Promise<FreeGame[]>> = {
    epic: fetchEpicGames,
    steam: fetchSteamGames,
    gog: fetchGoGGames,
    amazonPrime: fetchAmazonPrimeGames,
  };

  // Track all currently free games to update their lastSeen timestamps
  const currentlyFreeGames: Map<string, Date | undefined> = new Map();

  // Iterate over all services with type-safe iteration
  for (const key of Object.keys(serviceFetchers) as Array<keyof BotConfig['enabledServices']>) {
    if (config.enabledServices[key]) {
      try {
        const fetcher = serviceFetchers[key];
        const games = await fetcher();
        
        // Track currently free games
        games.forEach(game => {
          const gameId = generateGameId(game);
          currentlyFreeGames.set(gameId, game.endDate);
        });
        
        const newGames = games.filter(game => !configManager.hasGameBeenSent(guildId, generateGameId(game)));
        
        if (newGames.length > 0) {
          results.push({ games: newGames, service: key });
          configManager.updateLastChecked(guildId, key);
        }
      } catch (error) {
        logger.error(`Error checking ${key}:`, error);
      }
    }
  }

  // Update lastSeen for games that are still free
  currentlyFreeGames.forEach((endDate, gameId) => {
    if (configManager.hasGameBeenSent(guildId, gameId)) {
      configManager.updateGameLastSeen(guildId, gameId, endDate);
    }
  });

  return results;
}

export async function getAllCurrentGames(guildId: string): Promise<GameFetchResult[]> {
  const config = configManager.getConfig(guildId);
  const results: GameFetchResult[] = [];

  // Map service names to their fetcher functions
  const serviceFetchers: Record<keyof BotConfig['enabledServices'], () => Promise<FreeGame[]>> = {
    epic: fetchEpicGames,
    steam: fetchSteamGames,
    gog: fetchGoGGames,
    amazonPrime: fetchAmazonPrimeGames,
  };

  // Iterate over all services with type-safe iteration
  for (const key of Object.keys(serviceFetchers) as Array<keyof BotConfig['enabledServices']>) {
    if (config.enabledServices[key]) {
      try {
        const fetcher = serviceFetchers[key];
        const games = await fetcher();
        
        if (games.length > 0) {
          results.push({ games, service: key });
        }
      } catch (error) {
        logger.error(`Error checking ${key}:`, error);
      }
    }
  }

  return results;
}

export function generateGameId(game: FreeGame): string {
  // Create a unique ID for each game based on title and store
  return `${game.store.toLowerCase().replace(/\s+/g, '-')}-${game.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}
