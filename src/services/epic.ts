import axios from 'axios';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

const EPIC_API_URL = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions';

// Map of Epic tag IDs to human-readable genre names (common ones)
const EPIC_TAG_MAP: Record<string, string> = {
  '1216': 'Action',
  '1367': 'Adventure',
  '1370': 'Single Player',
  '1115': 'Shooter',
  '1117': 'RPG',
  '1210': 'Indie',
  '1203': 'Puzzle',
  '1230': 'Strategy',
  '1188': 'Fighting',
  '9547': 'Multiplayer',
  '1263': 'Platformer',
  '1299': 'Survival',
  '1298': 'Horror',
  '1181': 'Competitive',
  '19847': 'Co-op',
};

export async function fetchEpicGames(): Promise<FreeGame[]> {
  try {
    const response = await axios.get(EPIC_API_URL, {
      params: {
        locale: 'en-US',
        country: 'US',
        allowCountries: 'US',
      },
    });

    const games: FreeGame[] = [];
    const elements = response.data?.data?.Catalog?.searchStore?.elements || [];

    for (const game of elements) {
      // Check if game is free
      const promotions = game.promotions?.promotionalOffers?.[0]?.promotionalOffers;
      if (!promotions || promotions.length === 0) {
        continue;
      }

      // Check if the game is actually free (discountPrice = 0)
      const discountPrice = game.price?.totalPrice?.discountPrice;
      if (discountPrice === undefined || discountPrice !== 0) {
        continue;
      }

      // Skip if it's not a game (DLC, etc.)
      if (game.offerType !== 'BASE_GAME' && game.offerType !== 'BUNDLE') {
        continue;
      }

      const imageUrl = game.keyImages?.find(
        (img: { type: string; url: string }) => img.type === 'Thumbnail' || img.type === 'OfferImageWide'
      )?.url || '';

      const originalPrice = game.price?.totalPrice?.fmtPrice?.originalPrice || 'Free';

      // Extract genres from tags and categories
      const genres: string[] = [];
      
      // Map tag IDs to genre names
      if (game.tags) {
        for (const tag of game.tags.slice(0, 5)) { // Limit to first 5 tags
          const genreName = EPIC_TAG_MAP[tag.id];
          if (genreName && !genres.includes(genreName)) {
            genres.push(genreName);
          }
        }
      }
      
      // Also check categories for genre-like information
      if (game.categories && genres.length < 3) {
        for (const category of game.categories) {
          const path = category.path;
          if (path.startsWith('games/') && path !== 'games' && path !== 'games/edition' && path !== 'games/edition/base') {
            const genreName = path.split('/').pop();
            if (genreName && !genres.includes(genreName)) {
              genres.push(genreName.charAt(0).toUpperCase() + genreName.slice(1));
            }
          }
        }
      }

      games.push({
        title: game.title,
        description: game.description || '',
        imageUrl,
        url: `https://store.epicgames.com/en-US/p/${game.catalogNs?.mappings?.[0]?.pageSlug || game.productSlug}`,
        store: 'Epic Games',
        startDate: new Date(promotions[0].startDate),
        endDate: new Date(promotions[0].endDate),
        originalPrice,
        genres: genres.length > 0 ? genres.slice(0, 3) : undefined, // Limit to 3 genres
      });
    }

    return games;
  } catch (error) {
    logger.error('Error fetching Epic Games:', error);
    return [];
  }
}
