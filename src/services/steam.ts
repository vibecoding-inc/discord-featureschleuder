import axios from 'axios';
import { FreeGame } from '../types';

// Steam's featured games endpoint
const STEAM_API_URL = 'https://store.steampowered.com/api/featured';
const STEAM_FREE_GAMES_URL = 'https://store.steampowered.com/search/results/?query&start=0&count=50&dynamic_data=&sort_by=_ASC&specials=1&maxprice=free&snr=1_7_7_230_7&filter=topsellers&hidef2p=1&ndl=1';

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
        games.push({
          title: game.name,
          description: game.header_image ? '' : 'Limited time free game on Steam',
          imageUrl: game.header_image || game.large_capsule_image || '',
          url: `https://store.steampowered.com/app/${game.id}`,
          store: 'Steam',
          originalPrice: game.original_price ? `$${(game.original_price / 100).toFixed(2)}` : undefined,
        });
      }
    }

    return games;
  } catch (error) {
    console.error('Error fetching Steam games:', error);
    return [];
  }
}
