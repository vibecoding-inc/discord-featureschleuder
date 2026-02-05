import axios from 'axios';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

// Steam search endpoint that returns JSON with HTML results
const STEAM_SEARCH_URL = 'https://store.steampowered.com/search/results/';
const STEAM_DETAILS_API = 'https://store.steampowered.com/api/appdetails';
const STEAM_REVIEWS_API = 'https://store.steampowered.com/appreviews';

interface ParsedSearchResult {
  appId: number;
  title: string;
  originalPrice: string;
  imageUrl: string;
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

/**
 * Parse the HTML returned by Steam's search endpoint to extract game data.
 * Each result is an <a> tag with data attributes and nested elements.
 */
function parseSearchResults(html: string): ParsedSearchResult[] {
  const results: ParsedSearchResult[] = [];

  // Match each search result row
  const rowRegex = /<a\b[^>]*data-ds-appid="(\d+)"[^>]*>[\s\S]*?<\/a>/g;
  let match: RegExpExecArray | null;

  while ((match = rowRegex.exec(html)) !== null) {
    const appId = parseInt(match[1], 10);
    const rowHtml = match[0];

    // Extract title
    const titleMatch = rowHtml.match(/<span class="title">([^<]+)<\/span>/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) continue;

    // Extract original price
    const priceMatch = rowHtml.match(/<div class="discount_original_price">([^<]+)<\/div>/);
    const originalPrice = priceMatch ? priceMatch[1].trim() : '';

    // Extract capsule image from the search result
    const imgMatch = rowHtml.match(/<img\s+src="([^"]+)"/);
    const capsuleImg = imgMatch ? imgMatch[1] : '';

    // Use the header image (higher quality) based on app ID
    const imageUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

    results.push({ appId, title, originalPrice, imageUrl });
  }

  return results;
}

export async function fetchSteamGames(): Promise<FreeGame[]> {
  try {
    // Use Steam's search API to find games that are currently 100% off.
    // The combination of maxprice=free and specials=1 filters for temporarily
    // free games (not permanently free-to-play titles).
    const response = await axios.get(STEAM_SEARCH_URL, {
      params: {
        query: '',
        start: 0,
        count: 50,
        maxprice: 'free',
        specials: 1,
        cc: 'us',
        l: 'english',
        infinite: 1,
      },
      timeout: 10000,
    });

    const data = response.data;
    if (!data || !data.success) {
      logger.warn('Steam search API returned unsuccessful response');
      return [];
    }

    const html: string = data.results_html || '';
    const totalCount: number = data.total_count || 0;

    logger.debug(`Steam search found ${totalCount} free game(s) on sale`);

    if (totalCount === 0 || !html.trim()) {
      return [];
    }

    const searchResults = parseSearchResults(html);
    const games: FreeGame[] = [];

    for (const result of searchResults) {
      // Fetch detailed information for the game
      const details = await fetchGameDetails(result.appId);

      games.push({
        title: result.title,
        description: details.description || 'Limited time free game on Steam',
        imageUrl: result.imageUrl,
        url: `https://store.steampowered.com/app/${result.appId}`,
        store: 'Steam',
        originalPrice: result.originalPrice || undefined,
        genres: details.genres,
        rating: details.rating,
      });

      // Add small delay to avoid rate limiting when fetching multiple game details
      if (searchResults.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return games;
  } catch (error) {
    logger.error('Error fetching Steam games:', error);
    return [];
  }
}
