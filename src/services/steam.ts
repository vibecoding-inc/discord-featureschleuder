import axios from 'axios';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

// Steam's featured games endpoint
const STEAM_API_URL = 'https://store.steampowered.com/api/featuredcategories';
const STEAM_DETAILS_API = 'https://store.steampowered.com/api/appdetails';
const STEAM_REVIEWS_API = 'https://store.steampowered.com/appreviews';

// Category constants
const CATEGORY_SPECIALS = 'specials';
const CATEGORY_NEW_RELEASES = 'new_releases';
const CATEGORY_TOP_SELLERS = 'top_sellers';

interface SteamGame {
  id: number;
  name: string;
  discount_percent: number;
  original_price: number | null;
  final_price: number;
  header_image?: string;
  large_capsule_image?: string;
}

async function fetchGameDetails(appId: number): Promise<{ genres?: string[]; rating?: { score: number; source: string }; description?: string }> {
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
    const description = gameData.short_description || undefined;
    
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
        if (reviewData && 
            reviewData.total_reviews > 0 && 
            typeof reviewData.review_score === 'number') {
          // Use Steam's review_score (0-10 scale) and convert to 0-100 scale
          rating = {
            score: reviewData.review_score * 10,
            source: 'Steam',
          };
        }
      } catch (reviewError) {
        logger.debug(`Failed to fetch reviews for Steam app ${appId}:`, reviewError);
      }
    }

    return { genres, rating, description };
  } catch (error) {
    logger.debug(`Failed to fetch details for Steam app ${appId}:`, error);
    return {};
  }
}

// Helper function to determine if a game should be included
function isEligibleFreeGame(game: SteamGame, category: string): boolean {
  // Only include games with 100% discount (temporary free promotions)
  // Exclude free-to-play games (final_price === 0 but discount_percent !== 100)
  if (game.discount_percent === 100) {
    return true;
  }
  
  return false;
}

// Helper function to get appropriate description for the game
function getGameDescription(game: SteamGame, shortDescription?: string): string {
  // Use the game's short description if available, otherwise fall back to generic text
  return shortDescription || 'Limited time free game on Steam';
}

export async function fetchSteamGames(): Promise<FreeGame[]> {
  try {
    // Check Steam's featured categories for free games
    const response = await axios.get(STEAM_API_URL);
    const games: FreeGame[] = [];
    const seenGameIds = new Set<number>();

    // Categories to check for free games
    const categoriesToCheck = [
      CATEGORY_SPECIALS,      // Games on special offer (may include 100% discounts)
      CATEGORY_NEW_RELEASES,  // New releases (includes free-to-play games)
      CATEGORY_TOP_SELLERS,   // Top sellers (may include free games)
    ];

    for (const category of categoriesToCheck) {
      const categoryGames = response.data?.[category]?.items || [];
      
      for (const game of categoryGames) {
        // Skip if we've already seen this game
        if (seenGameIds.has(game.id)) {
          continue;
        }

        // Check if game is eligible based on pricing and category
        if (isEligibleFreeGame(game, category)) {
          seenGameIds.add(game.id);
          
          // Fetch detailed information for the game
          const details = await fetchGameDetails(game.id);
          
          games.push({
            title: game.name,
            description: getGameDescription(game, details.description),
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
