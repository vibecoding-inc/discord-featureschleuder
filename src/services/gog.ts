import axios from 'axios';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

const GOG_API_URL = 'https://www.gog.com/games/ajax/filtered';

export async function fetchGoGGames(): Promise<FreeGame[]> {
  try {
    const response = await axios.get(GOG_API_URL, {
      params: {
        mediaType: 'game',
        price: 'free',
        sort: 'popularity',
        page: 1,
      },
    });

    const games: FreeGame[] = [];
    const products = response.data?.products || [];

    for (const game of products.slice(0, 10)) {
      // Only include games that are actually free (not demos or DLC)
      if (game.price?.amount === '0' || game.price?.isFree) {
        // Extract genres from genre string (e.g., "Action, Adventure")
        const genres = game.genre ? game.genre.split(',').map((g: string) => g.trim()).slice(0, 3) : undefined;
        
        // GoG uses a 0-5 star rating system, convert to 0-100 scale for consistency
        const rating = game.rating && game.rating > 0 ? {
          score: Math.round(game.rating * 20), // Convert 0-5 to 0-100
          source: 'GoG',
        } : undefined;
        
        games.push({
          title: game.title,
          description: game.genre || 'Free game on GoG',
          imageUrl: game.image ? `https:${game.image}.jpg` : '',
          url: `https://www.gog.com${game.url}`,
          store: 'GoG',
          originalPrice: game.price?.baseAmount ? `$${game.price.baseAmount}` : undefined,
          genres,
          rating,
        });
      }
    }

    return games;
  } catch (error) {
    logger.error('Error fetching GoG games:', error);
    return [];
  }
}
