/**
 * Steam Scraper Integration Test
 * 
 * This test runs the Steam scraper against the live Steam store to verify:
 * - The scraper doesn't throw exceptions
 * - It returns an array (possibly empty)
 * - If games are found, they have the expected structure
 * 
 * Results are logged for manual review in PRs.
 */

const { fetchSteamGames } = require('../dist/services/steam.js');

async function testSteamScraper() {
  console.log('====================================');
  console.log('Steam Scraper Integration Test');
  console.log('====================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Scraper should not throw exceptions
    console.log('Test 1: Checking if scraper runs without exceptions...');
    const startTime = Date.now();
    let games;
    
    try {
      games = await fetchSteamGames();
      console.log('✓ PASS: Scraper executed without throwing exceptions');
      console.log(`  Execution time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      testsPassed++;
    } catch (error) {
      console.log('✗ FAIL: Scraper threw an exception');
      console.log(`  Error: ${error.message}`);
      testsFailed++;
      throw error;
    }

    // Test 2: Should return an array
    console.log('');
    console.log('Test 2: Checking if result is an array...');
    if (Array.isArray(games)) {
      console.log('✓ PASS: Result is an array');
      testsPassed++;
    } else {
      console.log('✗ FAIL: Result is not an array');
      console.log(`  Type: ${typeof games}`);
      testsFailed++;
    }

    // Test 3: Data quality check
    console.log('');
    console.log('Test 3: Data Quality Check');
    console.log(`  Games found: ${games.length}`);
    
    if (games.length === 0) {
      console.log('  ⚠ WARNING: No free games found (this may be expected if Steam has no active 100% discounts)');
      testsPassed++;
    } else {
      // Validate game structure
      let allValid = true;
      const requiredFields = ['title', 'url', 'store', 'description'];
      
      games.forEach((game, idx) => {
        const missing = requiredFields.filter(field => !game[field]);
        if (missing.length > 0) {
          console.log(`  ✗ Game ${idx + 1} missing fields: ${missing.join(', ')}`);
          allValid = false;
        }
        // Verify store is Steam
        if (game.store !== 'Steam') {
          console.log(`  ✗ Game ${idx + 1} has incorrect store: ${game.store} (expected: Steam)`);
          allValid = false;
        }
        // Verify URL format
        if (!game.url.includes('store.steampowered.com/app/')) {
          console.log(`  ✗ Game ${idx + 1} has unexpected URL format: ${game.url}`);
          allValid = false;
        }
      });

      if (allValid) {
        console.log('✓ PASS: All games have required fields and correct store');
        testsPassed++;
      } else {
        console.log('✗ FAIL: Some games are missing required fields or have incorrect store');
        testsFailed++;
      }

      // Log sample games for manual review
      console.log('');
      console.log('Sample Games (for manual review):');
      console.log('----------------------------------');
      games.slice(0, 5).forEach((game, idx) => {
        console.log(`${idx + 1}. ${game.title}`);
        console.log(`   URL: ${game.url}`);
        console.log(`   Store: ${game.store}`);
        console.log(`   Original Price: ${game.originalPrice || 'N/A'}`);
        console.log(`   Has Image: ${game.imageUrl ? 'Yes' : 'No'}`);
        console.log(`   Has Description: ${game.description ? 'Yes' : 'No'}`);
        console.log(`   Genres: ${game.genres ? game.genres.join(', ') : 'N/A'}`);
        console.log(`   Rating: ${game.rating ? `${game.rating.score} (${game.rating.source})` : 'N/A'}`);
        console.log('');
      });

      if (games.length > 5) {
        console.log(`... and ${games.length - 5} more games`);
        console.log('');
      }
    }

    // Summary
    console.log('====================================');
    console.log('Test Summary');
    console.log('====================================');
    console.log(`Tests Passed: ${testsPassed}`);
    console.log(`Tests Failed: ${testsFailed}`);
    console.log(`Total Games Found: ${games.length}`);
    console.log('');

    if (testsFailed > 0) {
      console.log('Status: FAILED ✗');
      process.exit(1);
    } else {
      console.log('Status: PASSED ✓');
      console.log('');
      console.log('Note: This test verifies technical functionality.');
      console.log('Manual review is required to confirm the games listed are actually free.');
      process.exit(0);
    }

  } catch (error) {
    console.log('');
    console.log('====================================');
    console.log('TEST SUITE FAILED');
    console.log('====================================');
    console.log('Error:', error.message);
    if (error.stack) {
      console.log('');
      console.log('Stack trace:');
      console.log(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testSteamScraper();
