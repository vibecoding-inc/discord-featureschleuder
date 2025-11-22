import axios from 'axios';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

const EPIC_API_URL = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions';

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

      // Skip if it's not a game (DLC, etc.)
      if (game.offerType !== 'BASE_GAME' && game.offerType !== 'BUNDLE') {
        continue;
      }

      const imageUrl = game.keyImages?.find(
        (img: { type: string; url: string }) => img.type === 'Thumbnail' || img.type === 'OfferImageWide'
      )?.url || '';

      const originalPrice = game.price?.totalPrice?.fmtPrice?.originalPrice || 'Free';

      games.push({
        title: game.title,
        description: game.description || '',
        imageUrl,
        url: `https://store.epicgames.com/en-US/p/${game.catalogNs?.mappings?.[0]?.pageSlug || game.productSlug}`,
        store: 'Epic Games',
        startDate: new Date(promotions[0].startDate),
        endDate: new Date(promotions[0].endDate),
        originalPrice,
      });
    }

    return games;
  } catch (error) {
    logger.error('Error fetching Epic Games:', error);
    return [];
  }
}
