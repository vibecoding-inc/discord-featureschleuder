import puppeteer from 'puppeteer';
import { FreeGame } from '../types';
import { logger } from '../utils/logger';

const GOG_GIVEAWAY_URL = 'https://www.gog.com/en/giveaway';

export async function fetchGoGGames(): Promise<FreeGame[]> {
  let browser;
  try {
    logger.debug('Launching Puppeteer to scrape GOG giveaways...');
    
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
    
    logger.debug(`Navigating to ${GOG_GIVEAWAY_URL}...`);
    
    // Navigate to the giveaway page
    await page.goto(GOG_GIVEAWAY_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Check if there's an active giveaway
    interface ScrapedGame {
      title: string;
      description: string;
      imageUrl: string;
      url: string;
      isActive: boolean;
    }

    const games = await page.evaluate((): ScrapedGame[] => {
      const results: ScrapedGame[] = [];
      
      // Look for giveaway banner or card
      // @ts-expect-error - Browser context
      const giveawayElements = Array.from(document.querySelectorAll('[class*="giveaway"], [class*="banner"], [class*="promo"]'));
      
      for (const element of giveawayElements) {
        try {
          // Check if giveaway is active (not expired)
          // @ts-expect-error - Browser context
          const text = element.textContent?.toLowerCase() || '';
          if (text.includes('expired') || text.includes('ended') || text.includes('no active')) {
            continue;
          }
          
          // Look for game link within the element
          // @ts-expect-error - Browser context
          const linkElement = element.querySelector('a[href*="/game/"]');
          if (!linkElement) continue;
          
          const url = linkElement.href;
          if (!url.includes('/game/')) continue;
          
          // Extract title
          let title = '';
          // @ts-expect-error - Browser context
          const titleElement = element.querySelector('h1, h2, h3, h4, [class*="title"], [class*="Title"]');
          if (titleElement) {
            title = titleElement.textContent?.trim() || '';
          }
          
          // Try link text if no title found
          if (!title && linkElement.textContent) {
            title = linkElement.textContent.trim();
          }
          
          // Try to extract from URL as last resort
          if (!title) {
            const urlParts = url.split('/');
            const gameSlug = urlParts[urlParts.length - 1] || '';
            title = gameSlug.replace(/_/g, ' ').replace(/-/g, ' ');
          }
          
          // Clean up title
          title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          title = title.replace(/\s*-?\s*(cover art image|banner image|image)$/i, '').trim();
          
          if (!title) continue;
          
          // Extract image
          let imageUrl = '';
          // @ts-expect-error - Browser context
          const imgElement = element.querySelector('img, picture img');
          if (imgElement) {
            imageUrl = imgElement.src || 
                      imgElement.currentSrc ||
                      imgElement.dataset?.src || 
                      imgElement.getAttribute('data-src') || 
                      '';
            
            if (imageUrl.startsWith('data:image')) {
              imageUrl = imgElement.dataset?.src || 
                        imgElement.getAttribute('data-src') || 
                        '';
            }
            
            if (imageUrl && !imageUrl.startsWith('http')) {
              if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
              } else if (imageUrl.startsWith('/')) {
                imageUrl = 'https://www.gog.com' + imageUrl;
              }
            }
          }
          
          results.push({
            title,
            description: 'Limited-time free giveaway on GoG',
            imageUrl,
            url,
            isActive: true,
          });
          
        } catch (error) {
          console.error('Error parsing giveaway element:', error);
        }
      }
      
      // If no giveaway elements found, check for direct game links on the page
      if (results.length === 0) {
        // @ts-expect-error - Browser context
        const pageText = document.body.textContent?.toLowerCase() || '';
        
        // Only proceed if there's indication of an active giveaway
        if (pageText.includes('claim') || pageText.includes('free') || pageText.includes('giveaway')) {
          // Look for prominent game links (usually h1/h2 with game link)
          // @ts-expect-error - Browser context
          const gameLinks = Array.from(document.querySelectorAll('a[href*="/game/"]'));
          
          for (const link of gameLinks.slice(0, 3)) { // Check first 3 links
            // @ts-expect-error - Browser context
            const url = link.href;
            if (!url.includes('/game/')) continue;
            
            // Get title from link or nearby heading
            // @ts-expect-error - Browser context
            let title = link.textContent?.trim() || '';
            
            if (!title || title.length < 3) {
              // Try to find nearby heading
              // @ts-expect-error - Browser context
              const parent = link.closest('[class*="card"], [class*="banner"], [class*="promo"]');
              if (parent) {
                const heading = parent.querySelector('h1, h2, h3, h4');
                if (heading) {
                  title = heading.textContent?.trim() || '';
                }
              }
            }
            
            if (!title) {
              const urlParts = url.split('/');
              const gameSlug = urlParts[urlParts.length - 1] || '';
              title = gameSlug.replace(/_/g, ' ').replace(/-/g, ' ');
            }
            
            title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            title = title.replace(/\s*-?\s*(cover art image|banner image|image)$/i, '').trim();
            
            if (title.length < 3) continue;
            
            // Get image from link
            let imageUrl = '';
            // @ts-expect-error - Browser context
            const img = link.querySelector('img');
            if (img) {
              imageUrl = img.src || img.dataset?.src || img.getAttribute('data-src') || '';
              if (imageUrl && !imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('//')) {
                  imageUrl = 'https:' + imageUrl;
                } else if (imageUrl.startsWith('/')) {
                  imageUrl = 'https://www.gog.com' + imageUrl;
                }
              }
            }
            
            results.push({
              title,
              description: 'Limited-time free giveaway on GoG',
              imageUrl,
              url,
              isActive: true,
            });
          }
        }
      }

      return results;
    });

    logger.debug(`Found ${games.length} active giveaway(s) on GOG`);

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
