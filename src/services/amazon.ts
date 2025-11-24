import puppeteer, { Browser, Page } from 'puppeteer';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

// Amazon Prime Gaming endpoints
// Based on https://github.com/eikowagenknecht/lootscraper/tree/main/src/services/scraper/implementations/amazon
const AMAZON_OFFERS_URL = 'https://gaming.amazon.com/home';
// Detail pages work on luna.amazon.com, not gaming.amazon.com
const AMAZON_DETAIL_BASE_URL = 'https://luna.amazon.com';

// Maximum number of genres to extract and display
const MAX_GENRES = 3;

// Delay between page navigations to avoid rate limiting (in ms)
const PAGE_NAV_DELAY = 1000;

interface BasicGameData {
  title: string;
  url: string;
}

/**
 * Builds a full Luna URL from a relative path.
 */
function buildLunaUrl(path: string): string {
  return path.startsWith('http') ? path : `${AMAZON_DETAIL_BASE_URL}${path}`;
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
 * 3. Extract basic game data from the main page
 * 4. Visit each game's detail page to extract additional metadata
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

    // Step 1: Extract basic game info from the main listing page
    const basicGames = await scrapeBasicGameData(page);
    logger.debug(`Found ${basicGames.length} games on main page`);
    
    if (basicGames.length === 0) {
      return [];
    }

    // Step 2: Visit each game's detail page to get additional metadata
    const freeGames: FreeGame[] = [];
    
    for (const basicGame of basicGames) {
      const finalUrl = buildLunaUrl(basicGame.url);
      
      try {
        logger.debug(`Fetching details for: ${basicGame.title} from ${finalUrl}`);
        
        // Navigate to detail page
        await page.goto(finalUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
        
        // Wait for content to load (wait for buy-box which contains the main info)
        // Log if selectors don't load but continue - the page may still have usable content
        const selectorLoaded = await page.waitForSelector('[data-a-target="buy-box"], [data-a-target="HeroContainer"]', {
          timeout: 10000,
        }).then(() => true).catch(() => {
          logger.debug(`Detail page selectors timed out for: ${basicGame.title}, continuing with available content`);
          return false;
        });
        
        // Extract detailed metadata from the detail page
        const details = await scrapeDetailPage(page);
        
        // Parse end date from detail page availability text
        let endDate: Date | undefined;
        if (details.endDateText) {
          endDate = parseAmazonAvailability(details.endDateText);
        }
        
        // Build description
        const description = details.description 
          || `Free game available on Amazon Prime Gaming${endDate ? ` until ${endDate.toLocaleDateString()}` : ''}`;
        
        freeGames.push({
          title: basicGame.title,
          description,
          imageUrl: details.imageUrl || '',
          url: finalUrl,
          store: 'Amazon Prime Gaming',
          endDate,
          originalPrice: details.originalPrice || undefined,
          genres: details.genres.length > 0 ? details.genres : undefined,
        });
        
        // Add delay between page navigations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, PAGE_NAV_DELAY));
        
      } catch (e) {
        logger.debug(`Error fetching details for ${basicGame.title}:`, e);
        
        // Still add the game with basic info if detail scraping fails
        freeGames.push({
          title: basicGame.title,
          description: 'Free game available on Amazon Prime Gaming',
          imageUrl: '',
          url: finalUrl,
          store: 'Amazon Prime Gaming',
        });
      }
    }
    
    logger.info(`Found ${freeGames.length} Amazon Prime Gaming games`);
    return freeGames;
    
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
 * Scrapes basic game information from the main Amazon Gaming page.
 * This extracts title and URL from the game cards.
 */
async function scrapeBasicGameData(page: Page): Promise<BasicGameData[]> {
  try {
    const offerListExists = await page.$('[data-a-target="offer-list-FGWP_FULL"]');
    
    if (!offerListExists) {
      logger.debug('Free games offer list not found on page');
      return [];
    }
    
    // Find all game card links
    const gameCards = await page.$$('[data-a-target="offer-list-FGWP_FULL"] .item-card__action > a:first-child');
    
    const games: BasicGameData[] = [];
    
    for (const card of gameCards) {
      try {
        // Extract title
        const titleElem = await card.$('.item-card-details__body__primary h3');
        const title = titleElem ? await page.evaluate(el => el.textContent?.trim(), titleElem) : null;
        
        if (!title) continue;
        
        // Extract URL
        const url = await page.evaluate(el => el.getAttribute('href'), card);
        
        if (!url) continue;
        
        games.push({
          title,
          url,
        });
      } catch (e) {
        logger.debug('Error parsing game card:', e);
      }
    }
    
    return games;
    
  } catch (error) {
    logger.error('Error scraping basic game data:', error);
    return [];
  }
}

/**
 * Data extracted from a game's detail page.
 */
interface DetailPageData {
  description: string | null;
  genres: string[];
  originalPrice: string | null;
  imageUrl: string | null;
  endDateText: string | null;
}

/**
 * Scrapes detailed metadata from a game's detail page.
 * This includes description, genres, image URL, and availability dates.
 */
async function scrapeDetailPage(page: Page): Promise<DetailPageData> {
  const result: DetailPageData = {
    description: null,
    genres: [],
    originalPrice: null,
    imageUrl: null,
    endDateText: null,
  };
  
  try {
    // Extract hero image from the detail page
    const imgElem = await page.$('[data-a-target="HeroContainer"] img, [data-a-target="responsive-media-image"] img');
    if (imgElem) {
      result.imageUrl = await page.evaluate(el => el.getAttribute('src'), imgElem);
    }
    
    // Extract description from buy-box
    const descElem = await page.$('[data-a-target="buy-box_description"]');
    if (descElem) {
      result.description = await page.evaluate(el => el.textContent?.trim(), descElem);
    }
    
    // Extract availability/end date text
    const availElem = await page.$('[data-a-target="buy-box_ac-text"], [data-a-target="buy-box_availability-callout"]');
    if (availElem) {
      result.endDateText = await page.evaluate(el => el.textContent?.trim(), availElem);
    }
    
    // Extract genres - they appear after "Game genres" section
    // We need to get this from page text as there's no specific selector
    // Only extract relevant sections to minimize text processing
    const genreSection = await page.evaluate(`
      (function() {
        const text = document.body.innerText;
        const genreIndex = text.indexOf('Game genres');
        if (genreIndex === -1) return null;
        return text.substring(genreIndex, Math.min(genreIndex + 200, text.length));
      })()
    `);
    
    if (typeof genreSection === 'string') {
      const genreMatch = genreSection.match(/Game genres\n+([^\n]+)/);
      if (genreMatch && genreMatch[1]) {
        const genreList = genreMatch[1].split(',').map((g: string) => g.trim()).filter((g: string) => g.length > 0);
        result.genres = genreList.slice(0, MAX_GENRES);
      }
    }
    
    // If no description from buy-box, try "About the game" section
    if (!result.description) {
      const aboutSection = await page.evaluate(`
        (function() {
          const text = document.body.innerText;
          const aboutIndex = text.indexOf('About the game');
          if (aboutIndex === -1) return null;
          return text.substring(aboutIndex, Math.min(aboutIndex + 500, text.length));
        })()
      `);
      
      if (typeof aboutSection === 'string') {
        const aboutMatch = aboutSection.match(/About the game\n+([^\n]+)/);
        if (aboutMatch && aboutMatch[1]) {
          result.description = aboutMatch[1];
        }
      }
    }
    
    // Try to find price/value information (rarely present on Amazon Prime games)
    const valueSection = await page.evaluate(`
      (function() {
        const text = document.body.innerText;
        const valueIndex = text.toLowerCase().indexOf('value');
        if (valueIndex === -1) return null;
        return text.substring(valueIndex, Math.min(valueIndex + 50, text.length));
      })()
    `);
    
    if (typeof valueSection === 'string') {
      const valueMatch = valueSection.match(/Value:?\s*([\$€£][\d.,]+)/i);
      if (valueMatch) {
        result.originalPrice = valueMatch[1];
      }
    }
    
  } catch (error) {
    logger.debug('Error scraping detail page:', error);
  }
  
  return result;
}

/**
 * Parses Amazon's availability text format
 * Example: "Available through Dec 24, 2025 (in 30 days)"
 */
function parseAmazonAvailability(availText: string): Date | undefined {
  try {
    // Try to extract date from "Available through MMM D, YYYY" format
    const dateMatch = availText.match(/through\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
    if (dateMatch && dateMatch[1]) {
      const date = new Date(dateMatch[1]);
      if (!isNaN(date.getTime())) {
        // Set to end of day
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      }
    }
    
    // Fallback: try to extract "in X days" and calculate date
    const daysMatch = availText.match(/in\s+(\d+)\s+days?/i);
    if (daysMatch && daysMatch[1]) {
      const days = parseInt(daysMatch[1], 10);
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      return new Date(futureDate.getFullYear(), futureDate.getMonth(), futureDate.getDate(), 23, 59, 59);
    }
    
    return undefined;
  } catch (error) {
    logger.debug(`Failed to parse availability text: ${availText}`);
    return undefined;
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

// Helper function to manually add Amazon Prime games if needed
export function createManualAmazonGame(
  title: string,
  description: string,
  imageUrl: string,
  url: string,
  options?: {
    endDate?: Date;
    originalPrice?: string;
    genres?: string[];
  }
): FreeGame {
  return {
    title,
    description,
    imageUrl,
    url,
    store: 'Amazon Prime Gaming',
    endDate: options?.endDate,
    originalPrice: options?.originalPrice,
    genres: options?.genres,
  };
}
