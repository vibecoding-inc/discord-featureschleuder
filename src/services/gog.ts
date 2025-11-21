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
        games.push({
          title: game.title,
          description: game.genre || 'Free game on GoG',
          imageUrl: game.image ? `https:${game.image}.jpg` : '',
          url: `https://www.gog.com${game.url}`,
          store: 'GoG',
          originalPrice: game.price?.baseAmount ? `$${game.price.baseAmount}` : undefined,
        });
      }
    }

    return games;
  } catch (error) {
    logger.error('Error fetching GoG games:', error);
    return [];
  }
}
