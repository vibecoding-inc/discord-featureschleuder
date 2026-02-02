import puppeteer from 'puppeteer';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

const GOG_FREE_GAMES_URL = 'https://www.gog.com/en/games?priceRange=0,0&page=1';

export async function fetchGoGGames(): Promise<FreeGame[]> {
  let browser;
  try {
    logger.debug('Launching Puppeteer to scrape GOG free games...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    logger.debug(`Navigating to ${GOG_FREE_GAMES_URL}...`);
    
    // Navigate to the page and wait for network to be idle
    await page.goto(GOG_FREE_GAMES_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for the product grid to load
    await page.waitForSelector('a[href*="/game/"], a[href*="/en/game/"]', { timeout: 10000 }).catch(() => {
      logger.warn('Product grid selector not found, continuing anyway...');
    });

    // Extract game data from the page
    interface ScrapedGame {
      title: string;
      description: string;
      imageUrl: string;
      url: string;
    }

    const games = await page.evaluate((): ScrapedGame[] => {
      // @ts-expect-error - We're in a browser context, DOM types are available at runtime
      const gameElements = Array.from(document.querySelectorAll('a[href*="/game/"], a[href*="/en/game/"]'));
      const seenTitles = new Set<string>();
      const results: ScrapedGame[] = [];

      for (const element of gameElements) {
        try {
          // @ts-expect-error - Browser context
          const url = element.href;
          
          // Skip non-game links (e.g., DLC, demos)
          if (!url.includes('/game/') && !url.includes('/en/game/')) continue;
          
          // Extract title - try multiple methods
          let title = '';
          
          // Method 1: Check for title in various class names
          // @ts-expect-error - Browser context
          const titleElement = element.querySelector('h3, [class*="product-title"], [class*="ProductTitle"], [data-selenium="title"]');
          if (titleElement?.textContent) {
            title = titleElement.textContent.trim();
          }
          
          // Method 2: Try getting title from image alt text if not found
          if (!title) {
            // @ts-expect-error - Browser context
            const imgElement = element.querySelector('img');
            if (imgElement?.alt) {
              title = imgElement.alt.trim();
            }
          }
          
          // Method 3: Try to extract from URL as last resort
          if (!title && url) {
            const urlParts = url.split('/');
            const gameSlug = urlParts[urlParts.length - 1] || '';
            title = gameSlug.replace(/_/g, ' ').replace(/-/g, ' ');
          }
          
          // Clean up the title
          title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Remove common suffixes and prefixes
          title = title.replace(/^(MOD|DLC|DEMO)\s+/i, '').trim();
          title = title.replace(/\s*-?\s*(cover art image|banner image|image)$/i, '').trim();
          
          // Skip if no title found or if we've already seen this title
          if (!title || seenTitles.has(title.toLowerCase())) continue;
          
          // Skip demos, DLC, and bonus content based on title
          const lowerTitle = title.toLowerCase();
          if ((lowerTitle.includes('demo') && !lowerTitle.includes('demo version')) || 
              lowerTitle.includes('dlc') || 
              lowerTitle.includes('bonus content') ||
              lowerTitle.includes('artbook') ||
              lowerTitle.includes('soundtrack')) {
            continue;
          }
          
          seenTitles.add(title.toLowerCase());
          
          // Extract image URL with better handling
          let imageUrl = '';
          // @ts-expect-error - Browser context
          const imgElement = element.querySelector('img, picture img');
          if (imgElement) {
            // Try multiple sources for the image
            imageUrl = imgElement.src || 
                      imgElement.currentSrc ||
                      imgElement.dataset?.src || 
                      imgElement.dataset?.lazySrc ||
                      imgElement.getAttribute('data-src') || 
                      '';
            
            // Handle lazy-loaded images (data: protocol)
            if (imageUrl.startsWith('data:image')) {
              imageUrl = imgElement.dataset?.src || 
                        imgElement.dataset?.lazySrc ||
                        imgElement.getAttribute('data-src') || 
                        '';
            }
            
            // Make sure we have a full URL
            if (imageUrl && !imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
              } else if (imageUrl.startsWith('/')) {
                imageUrl = 'https://www.gog.com' + imageUrl;
              }
            }
          }
          
          // Extract description/genre if available
          // @ts-expect-error - Browser context
          const descElement = element.querySelector('[class*="genre"], [class*="Genre"], [class*="description"], [class*="Description"]');
          const description = descElement?.textContent?.trim() || 'Free game on GoG';
          
          results.push({
            title,
            description,
            imageUrl,
            url,
          });
          
          // Limit to 10 games
          if (results.length >= 10) break;
        } catch (error) {
          console.error('Error parsing game element:', error);
        }
      }

      return results;
    });

    logger.debug(`Scraped ${games.length} games from GOG`);

    // Transform scraped data to FreeGame format
    const freeGames: FreeGame[] = games.map(game => ({
      title: game.title,
      description: game.description,
      imageUrl: game.imageUrl,
      url: game.url,
      store: 'GoG',
    }));

    return freeGames;
  } catch (error) {
    logger.error('Error fetching GoG games:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close().catch(err => logger.error('Error closing browser:', err));
    }
  }
}
