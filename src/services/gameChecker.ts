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
