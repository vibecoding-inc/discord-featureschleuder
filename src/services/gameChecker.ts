import { FreeGame } from '../types';
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

  if (config.enabledServices.epic) {
    try {
      const games = await fetchEpicGames();
      const newGames = games.filter(game => !configManager.hasGameBeenSent(guildId, generateGameId(game)));
      if (newGames.length > 0) {
        results.push({ games: newGames, service: 'epic' });
        configManager.updateLastChecked(guildId, 'epic');
      }
    } catch (error) {
      logger.error('Error checking Epic Games:', error);
    }
  }

  if (config.enabledServices.steam) {
    try {
      const games = await fetchSteamGames();
      const newGames = games.filter(game => !configManager.hasGameBeenSent(guildId, generateGameId(game)));
      if (newGames.length > 0) {
        results.push({ games: newGames, service: 'steam' });
        configManager.updateLastChecked(guildId, 'steam');
      }
    } catch (error) {
      logger.error('Error checking Steam:', error);
    }
  }

  if (config.enabledServices.gog) {
    try {
      const games = await fetchGoGGames();
      const newGames = games.filter(game => !configManager.hasGameBeenSent(guildId, generateGameId(game)));
      if (newGames.length > 0) {
        results.push({ games: newGames, service: 'gog' });
        configManager.updateLastChecked(guildId, 'gog');
      }
    } catch (error) {
      logger.error('Error checking GoG:', error);
    }
  }

  if (config.enabledServices.amazonPrime) {
    try {
      const games = await fetchAmazonPrimeGames();
      const newGames = games.filter(game => !configManager.hasGameBeenSent(guildId, generateGameId(game)));
      if (newGames.length > 0) {
        results.push({ games: newGames, service: 'amazonPrime' });
        configManager.updateLastChecked(guildId, 'amazonPrime');
      }
    } catch (error) {
      logger.error('Error checking Amazon Prime Gaming:', error);
    }
  }

  return results;
}

export function generateGameId(game: FreeGame): string {
  // Create a unique ID for each game based on title and store
  return `${game.store.toLowerCase().replace(/\s+/g, '-')}-${game.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}
