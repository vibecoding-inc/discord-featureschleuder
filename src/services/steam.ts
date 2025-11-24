import axios from 'axios';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

// Steam's featured games endpoint
const STEAM_API_URL = 'https://store.steampowered.com/api/featuredcategories';
const STEAM_DETAILS_API = 'https://store.steampowered.com/api/appdetails';

async function fetchGameDetails(appId: number): Promise<{ genres?: string[]; rating?: { score: number; source: string } }> {
  try {
    const response = await axios.get(STEAM_DETAILS_API, {
      params: { appids: appId },
      timeout: 5000,
    });
    
    const gameData = response.data?.[appId]?.data;
    if (!gameData) {
      return {};
    }

    const genres = gameData.genres?.map((g: { description: string }) => g.description).slice(0, 3) || [];
    const rating = gameData.metacritic ? {
      score: gameData.metacritic.score,
      source: 'Metacritic',
    } : undefined;

    return { genres, rating };
  } catch (error) {
    logger.debug(`Failed to fetch details for Steam app ${appId}:`, error);
    return {};
  }
}

export async function fetchSteamGames(): Promise<FreeGame[]> {
  try {
    // Check Steam's featured categories for free games
    const response = await axios.get(STEAM_API_URL);
    const games: FreeGame[] = [];
    const seenGameIds = new Set<number>();

    // Categories to check for free games
    const categoriesToCheck = [
      'specials',      // Games on special offer (may include 100% discounts)
      'new_releases',  // New releases (includes free-to-play games)
      'top_sellers',   // Top sellers (may include free games)
    ];

    for (const category of categoriesToCheck) {
      const categoryGames = response.data?.[category]?.items || [];
      
      for (const game of categoryGames) {
        // Skip if we've already seen this game
        if (seenGameIds.has(game.id)) {
          continue;
        }

        // Check if game is currently free (discount of 100% or final price is 0)
        // Only include games with 100% discount (temporary free) or games that are permanently free but newly released
        if (game.discount_percent === 100 || (game.final_price === 0 && category === 'new_releases')) {
          seenGameIds.add(game.id);
          
          // Fetch detailed information for the game
          const details = await fetchGameDetails(game.id);
          
          games.push({
            title: game.name,
            description: game.discount_percent === 100 
              ? 'Limited time free game on Steam' 
              : 'Free-to-play game on Steam',
            imageUrl: game.header_image || game.large_capsule_image || '',
            url: `https://store.steampowered.com/app/${game.id}`,
            store: 'Steam',
            originalPrice: game.original_price ? `$${(game.original_price / 100).toFixed(2)}` : undefined,
            genres: details.genres,
            rating: details.rating,
          });
          
          // Add small delay to avoid rate limiting when fetching multiple game details
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    return games;
  } catch (error) {
    logger.error('Error fetching Steam games:', error);
    return [];
  }
}
