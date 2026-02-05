/**
 * GOG Scraper Integration Test
 * 
 * This test runs the GOG scraper against the live GOG website to verify:
 * - The scraper doesn't throw exceptions
 * - It returns an array (possibly empty)
 * - If games are found, they have the expected structure
 * 
 * Results are logged for manual review in PRs.
 */

const { fetchGoGGames } = require('../dist/services/gog.js');

async function testGoGScraper() {
  console.log('====================================');
  console.log('GOG Scraper Integration Test');
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
      games = await fetchGoGGames();
      console.log('✓ PASS: Scraper executed without throwing exceptions');
      console.log(`  Execution time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      testsPassed++;
    } catch (error) {
      console.log('✗ FAIL: Scraper threw an exception');
      console.log(`  Error: ${error.message}`);
      testsFailed++;
      throw error; // Re-throw to stop further tests
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

    // Test 3: Log results for manual review
    console.log('');
    console.log('Test 3: Data Quality Check');
    console.log(`  Games found: ${games.length}`);
    
    if (games.length === 0) {
      console.log('  ⚠ WARNING: No games found (this may be expected if GOG has no free games)');
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
      });

      if (allValid) {
        console.log('✓ PASS: All games have required fields');
        testsPassed++;
      } else {
        console.log('✗ FAIL: Some games are missing required fields');
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
        console.log(`   Has Image: ${game.imageUrl ? 'Yes' : 'No'}`);
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
testGoGScraper();
