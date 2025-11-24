import axios from 'axios';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

// Steam's featured games endpoint
const STEAM_API_URL = 'https://store.steampowered.com/api/featured';
const STEAM_DETAILS_API = 'https://store.steampowered.com/api/appdetails';
const STEAM_REVIEWS_API = 'https://store.steampowered.com/appreviews';

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
    
    // Prefer Metacritic score if available, otherwise use Steam user reviews
    let rating: { score: number; source: string } | undefined;
    
    if (gameData.metacritic) {
      rating = {
        score: gameData.metacritic.score,
        source: 'Metacritic',
      };
    } else {
      // Try to fetch Steam user reviews
      try {
        const reviewsResponse = await axios.get(`${STEAM_REVIEWS_API}/${appId}`, {
          params: { json: 1, filter: 'all', language: 'english' },
          timeout: 5000,
        });
        
        const reviewData = reviewsResponse.data?.query_summary;
        if (reviewData && reviewData.total_reviews > 0) {
          // Calculate percentage of positive reviews and convert to 0-100 scale
          const percentage = Math.round((reviewData.total_positive / reviewData.total_reviews) * 100);
          rating = {
            score: percentage,
            source: 'Steam',
          };
        }
      } catch (reviewError) {
        logger.debug(`Failed to fetch reviews for Steam app ${appId}:`, reviewError);
      }
    }

    return { genres, rating };
  } catch (error) {
    logger.debug(`Failed to fetch details for Steam app ${appId}:`, error);
    return {};
  }
}

export async function fetchSteamGames(): Promise<FreeGame[]> {
  try {
    // Steam doesn't have a reliable free games API
    // We'll check for games that recently went free
    const response = await axios.get(STEAM_API_URL);
    const games: FreeGame[] = [];

    // Check featured games that are free
    const featuredGames = response.data?.featured_win || [];
    
    for (const game of featuredGames) {
      // Check if game is currently free (discount of 100%)
      if (game.discount_percent === 100 || game.final_price === 0) {
        // Fetch detailed information for the game
        const details = await fetchGameDetails(game.id);
        
        games.push({
          title: game.name,
          description: game.header_image ? '' : 'Limited time free game on Steam',
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

    return games;
  } catch (error) {
    logger.error('Error fetching Steam games:', error);
    return [];
  }
}
