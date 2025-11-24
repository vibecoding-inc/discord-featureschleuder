import axios from 'axios';
import * as cheerio from 'cheerio';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

// Amazon Prime Gaming endpoints
// Based on https://github.com/eikowagenknecht/lootscraper/tree/main/src/services/scraper/implementations/amazon
const AMAZON_GAMING_URL = 'https://gaming.amazon.com/home';
const AMAZON_OFFERS_URL = 'https://luna.amazon.com/claims/home';

/**
 * Fetches free games from Amazon Prime Gaming.
 * 
 * Implementation based on lootscraper approach:
 * https://github.com/eikowagenknecht/lootscraper
 * 
 * NOTE: Amazon Prime Gaming does not provide a public unauthenticated API.
 * The page is a React SPA that requires JavaScript execution to display offers.
 * 
 * This implementation attempts to:
 * 1. Scrape embedded JSON data from the page (if available via SSR)
 * 2. Parse any structured data that might be present in meta tags
 * 
 * Limitations:
 * - Without authentication and JavaScript execution (Playwright/Puppeteer), 
 *   we cannot access the full offer list
 * - Amazon's GraphQL API requires authentication
 * - The page uses selectors like [data-a-target="offer-list-FGWP_FULL"] but
 *   these are only populated after JavaScript execution
 * 
 * For production use, consider:
 * - Using Playwright/Puppeteer with proper browser automation
 * - Implementing authentication flow
 * - Using a third-party service that provides this data
 */
export async function fetchAmazonPrimeGames(): Promise<FreeGame[]> {
  try {
    logger.debug('Fetching Amazon Prime Gaming games');
    
    // Attempt to scrape with embedded data extraction
    const games = await scrapeAmazonOffers();
    
    if (games.length > 0) {
      logger.info(`Found ${games.length} Amazon Prime Gaming games`);
      return games;
    }

    logger.debug('No Amazon Prime Gaming games found. This may be normal if:');
    logger.debug('- No games are currently offered');
    logger.debug('- Authentication is required');
    logger.debug('- The page structure has changed');
    return [];
    
  } catch (error) {
    logger.error('Error fetching Amazon Prime Gaming games:', error);
    return [];
  }
}

/**
 * Scrapes Amazon Prime Gaming offers from the page.
 * Attempts to extract data from embedded JSON or structured data.
 */
async function scrapeAmazonOffers(): Promise<FreeGame[]> {
  try {
    // Try both URLs - the main gaming page and the offers page
    const urls = [AMAZON_GAMING_URL, AMAZON_OFFERS_URL];
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://gaming.amazon.com/',
          },
        });

        const $ = cheerio.load(response.data);
        const games: FreeGame[] = [];

        // Strategy 1: Look for embedded JSON data in script tags
        $('script').each((_, elem) => {
          const scriptContent = $(elem).html();
          if (!scriptContent) return;

          // Look for JSON structures that might contain offer data
          // Amazon sometimes embeds initial state in the HTML
          try {
            // Check for window.__INITIAL_STATE__ or similar patterns
            const initialStateMatch = scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
            if (initialStateMatch) {
              const state = JSON.parse(initialStateMatch[1]);
              const extracted = extractGamesFromState(state);
              games.push(...extracted);
            }

            // Check for other common patterns
            const dataMatch = scriptContent.match(/"offers":\s*(\[.+?\])/);
            if (dataMatch) {
              const offers = JSON.parse(dataMatch[1]);
              const extracted = extractGamesFromOffers(offers);
              games.push(...extracted);
            }
          } catch (e) {
            // Continue searching other scripts
          }
        });

        // Strategy 2: Look for JSON-LD structured data
        $('script[type="application/ld+json"]').each((_, elem) => {
          try {
            const jsonData = $(elem).html();
            if (jsonData) {
              const data = JSON.parse(jsonData);
              if (data['@type'] === 'ItemList' && data.itemListElement) {
                const extracted = extractGamesFromStructuredData(data);
                games.push(...extracted);
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
        });

        if (games.length > 0) {
          return games;
        }
      } catch (error) {
        logger.debug(`Error scraping ${url}:`, error);
        // Continue to next URL
      }
    }

    // No games found from scraping
    logger.debug('Amazon Gaming page is a SPA - no static game data found');
    logger.debug('Consider using Playwright/Puppeteer for full JavaScript execution');
    return [];
    
  } catch (error) {
    logger.error('Error in scrapeAmazonOffers:', error);
    return [];
  }
}

/**
 * Extracts games from initial state object
 */
function extractGamesFromState(state: any): FreeGame[] {
  const games: FreeGame[] = [];
  
  try {
    // Navigate the state object to find offers
    if (state.offers && Array.isArray(state.offers)) {
      for (const offer of state.offers) {
        const game = parseAmazonOffer(offer);
        if (game) games.push(game);
      }
    }
  } catch (error) {
    logger.debug('Error extracting from state:', error);
  }
  
  return games;
}

/**
 * Extracts games from offers array
 */
function extractGamesFromOffers(offers: any[]): FreeGame[] {
  const games: FreeGame[] = [];
  
  try {
    for (const offer of offers) {
      const game = parseAmazonOffer(offer);
      if (game) games.push(game);
    }
  } catch (error) {
    logger.debug('Error extracting from offers:', error);
  }
  
  return games;
}

/**
 * Extracts games from structured data
 */
function extractGamesFromStructuredData(data: any): FreeGame[] {
  const games: FreeGame[] = [];
  
  try {
    if (data.itemListElement && Array.isArray(data.itemListElement)) {
      for (const item of data.itemListElement) {
        if (item.item) {
          const game = parseAmazonOffer(item.item);
          if (game) games.push(game);
        }
      }
    }
  } catch (error) {
    logger.debug('Error extracting from structured data:', error);
  }
  
  return games;
}

/**
 * Parses an Amazon offer object into our FreeGame format
 */
function parseAmazonOffer(offer: any): FreeGame | null {
  try {
    const title = offer.title || offer.name;
    if (!title) return null;

    const imageUrl = offer.image || offer.imgUrl || offer.imageUrl || '';
    const url = offer.url || offer.detailUrl || 'https://gaming.amazon.com/home';
    const description = offer.description || 'Free game available on Amazon Prime Gaming';
    
    // Parse end date if available
    let endDate: Date | undefined;
    if (offer.endDate || offer.validTo || offer.endTime) {
      try {
        endDate = new Date(offer.endDate || offer.validTo || offer.endTime);
      } catch (e) {
        // Invalid date format
      }
    }

    return {
      title,
      description,
      imageUrl,
      url: url.startsWith('http') ? url : `https://gaming.amazon.com${url}`,
      store: 'Amazon Prime Gaming',
      endDate,
    };
  } catch (error) {
    logger.debug('Error parsing offer:', error);
    return null;
  }
}

// Helper function to manually add Amazon Prime games if needed
export function createManualAmazonGame(
  title: string,
  description: string,
  imageUrl: string,
  url: string
): FreeGame {
  return {
    title,
    description,
    imageUrl,
    url,
    store: 'Amazon Prime Gaming',
  };
}
