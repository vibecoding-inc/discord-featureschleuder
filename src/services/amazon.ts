import puppeteer, { Browser, Page } from 'puppeteer';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

// Amazon Prime Gaming endpoints
// Based on https://github.com/eikowagenknecht/lootscraper/tree/main/src/services/scraper/implementations/amazon
const AMAZON_OFFERS_URL = 'https://gaming.amazon.com/home';

interface ScrapedGameData {
  title: string;
  imageUrl: string;
  url: string;
  endDateText: string | null;
  subtitle: string | null; // Secondary text/description from the card
  publisher: string | null; // Publisher name if available
}

/**
 * Fetches free games from Amazon Prime Gaming using Puppeteer.
 * 
 * Implementation based on lootscraper approach:
 * https://github.com/eikowagenknecht/lootscraper
 * 
 * Uses Puppeteer to:
 * 1. Load the Amazon Gaming page with JavaScript execution
 * 2. Wait for the offers to load
 * 3. Extract game data from the rendered DOM
 * 
 * The page uses selector: [data-a-target="offer-list-FGWP_FULL"]
 * for free game offers.
 */
export async function fetchAmazonPrimeGames(): Promise<FreeGame[]> {
  let browser: Browser | undefined;
  try {
    logger.debug('Fetching Amazon Prime Gaming games with Puppeteer');
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    logger.debug(`Navigating to ${AMAZON_OFFERS_URL}`);
    await page.goto(AMAZON_OFFERS_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for the offers to load
    try {
      await page.waitForSelector('[data-a-target="offer-list-FGWP_FULL"], .offer-list__content', {
        timeout: 10000,
      });
    } catch (e) {
      logger.debug('Offer list not found, page may require authentication');
      return [];
    }

    // Extract games from the page
    const games = await scrapeGamesFromPage(page);
    
    logger.info(`Found ${games.length} Amazon Prime Gaming games`);
    return games;
    
  } catch (error) {
    logger.error('Error fetching Amazon Prime Gaming games:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrapes games from the Amazon Gaming page using Puppeteer.
 * Follows the lootscraper approach for extracting offer data.
 */
async function scrapeGamesFromPage(page: Page): Promise<FreeGame[]> {
  try {
    // Extract game offers from the page
    // Use page.$$ to query the DOM from Node.js side
    const offerListExists = await page.$('[data-a-target="offer-list-FGWP_FULL"]');
    
    if (!offerListExists) {
      logger.debug('Free games offer list not found on page');
      return [];
    }
    
    // Find all game card links
    const gameCards = await page.$$('[data-a-target="offer-list-FGWP_FULL"] .item-card__action > a:first-child');
    
    const games: ScrapedGameData[] = [];
    
    for (const card of gameCards) {
      try {
        // Extract title
        const titleElem = await card.$('.item-card-details__body__primary h3');
        const title = titleElem ? await page.evaluate((el) => el.textContent?.trim(), titleElem) : null;
        
        if (!title) continue;
        
        // Extract image
        const imgElem = await card.$('[data-a-target="card-image"] img');
        const imageUrl = imgElem ? await page.evaluate((el) => el.getAttribute('src'), imgElem) : '';
        
        // Extract URL
        const url = await page.evaluate((el) => el.getAttribute('href'), card);
        
        // Extract end date if available
        const dateElem = await card.$('.availability-date span:nth-child(2)');
        const endDateText = dateElem ? await page.evaluate((el) => el.textContent?.trim(), dateElem) : null;
        
        // Extract subtitle/secondary text (often contains game type or short description)
        const subtitleElem = await card.$('.item-card-details__body__secondary p');
        const subtitle = subtitleElem ? await page.evaluate((el) => el.textContent?.trim(), subtitleElem) : null;
        
        // Extract publisher if available (from tertiary text)
        const publisherElem = await card.$('.item-card-details__body__tertiary p');
        const publisher = publisherElem ? await page.evaluate((el) => el.textContent?.trim(), publisherElem) : null;
        
        games.push({
          title,
          imageUrl: imageUrl || '',
          url: url || '',
          endDateText: endDateText || null,
          subtitle: subtitle || null,
          publisher: publisher || null,
        });
      } catch (e) {
        // Skip this card if parsing fails
        logger.debug('Error parsing game card:', e);
      }
    }

    // Convert to FreeGame format
    const freeGames: FreeGame[] = [];
    
    for (const game of games) {
      // URLs from Amazon Gaming are relative paths starting with /claims/
      // Use luna.amazon.com as the base domain - this is the working URL format
      const url = game.url.startsWith('http') 
        ? game.url 
        : `https://luna.amazon.com${game.url}`;
      
      // Parse end date if available
      let endDate: Date | undefined;
      if (game.endDateText) {
        endDate = parseAmazonDate(game.endDateText);
      }
      
      // Build a richer description using available metadata
      const description = buildGameDescription(game, endDate);
      
      freeGames.push({
        title: game.title,
        description,
        imageUrl: game.imageUrl,
        url,
        store: 'Amazon Prime Gaming',
        endDate,
      });
    }
    
    return freeGames;
    
  } catch (error) {
    logger.error('Error scraping games from page:', error);
    return [];
  }
}

/**
 * Parses Amazon's date format ("Ends in X days", "Ends today", "Ends tomorrow", "MMM D, YYYY")
 * Based on lootscraper's parsing logic
 */
function parseAmazonDate(dateStr: string): Date | undefined {
  try {
    const cleaned = dateStr.replace(/^Ends\s+/i, '').trim();
    const now = new Date();
    
    if (cleaned.toLowerCase() === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }
    
    if (cleaned.toLowerCase() === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);
    }
    
    // Try parsing "X days" format
    const daysMatch = cleaned.match(/^(\d+)\s+days?$/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      return new Date(futureDate.getFullYear(), futureDate.getMonth(), futureDate.getDate(), 23, 59, 59);
    }
    
    // Try parsing "MMM D, YYYY" format
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return undefined;
  } catch (error) {
    logger.debug(`Failed to parse date: ${dateStr}`);
    return undefined;
  }
}

/**
 * Builds a rich description for an Amazon Prime game using available metadata.
 * Prioritizes subtitle content if available, then adds publisher info.
 */
function buildGameDescription(game: ScrapedGameData, endDate?: Date): string {
  const parts: string[] = [];
  
  // Use subtitle as primary description if available (often contains game genre/type)
  if (game.subtitle) {
    parts.push(game.subtitle);
  }
  
  // Add publisher info if available
  if (game.publisher) {
    parts.push(`By ${game.publisher}`);
  }
  
  // If we have content from the page, use it
  if (parts.length > 0) {
    return parts.join(' • ');
  }
  
  // Fallback to generic description with end date
  if (endDate) {
    return `Free game available on Amazon Prime Gaming until ${endDate.toLocaleDateString()}`;
  }
  
  return 'Free game available on Amazon Prime Gaming';
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
