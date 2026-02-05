/**
 * All Scrapers Integration Test
 * 
 * This test runs all game scrapers (Epic, Steam, GOG, Amazon Prime) against their
 * respective live websites to verify:
 * - Each scraper doesn't throw exceptions
 * - Each returns an array (possibly empty)
 * - If games are found, they have the expected structure
 * 
 * Results are logged for manual review in PRs.
 */

const { fetchEpicGames } = require('../dist/services/epic.js');
const { fetchSteamGames } = require('../dist/services/steam.js');
const { fetchGoGGames } = require('../dist/services/gog.js');
const { fetchAmazonPrimeGames } = require('../dist/services/amazon.js');

const scrapers = [
  { name: 'Epic Games', fetchFunction: fetchEpicGames, store: 'Epic Games' },
  { name: 'Steam', fetchFunction: fetchSteamGames, store: 'Steam' },
  { name: 'GOG', fetchFunction: fetchGoGGames, store: 'GoG' },
  { name: 'Amazon Prime Gaming', fetchFunction: fetchAmazonPrimeGames, store: 'Amazon Prime Gaming' },
];

async function testScraper(scraper) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${scraper.name} Scraper Test`);
  console.log('='.repeat(60));
  
  let testsPassed = 0;
  let testsFailed = 0;
  let games = [];

  try {
    // Test 1: Scraper should not throw exceptions
    console.log('Test 1: Checking if scraper runs without exceptions...');
    const startTime = Date.now();
    
    try {
      games = await scraper.fetchFunction();
      console.log('✓ PASS: Scraper executed without throwing exceptions');
      console.log(`  Execution time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
      testsPassed++;
    } catch (error) {
      console.log('✗ FAIL: Scraper threw an exception');
      console.log(`  Error: ${error.message}`);
      testsFailed++;
      return { scraper: scraper.name, passed: testsPassed, failed: testsFailed, games: 0, error: error.message };
    }

    // Test 2: Should return an array
    console.log('\nTest 2: Checking if result is an array...');
    if (Array.isArray(games)) {
      console.log('✓ PASS: Result is an array');
      testsPassed++;
    } else {
      console.log('✗ FAIL: Result is not an array');
      console.log(`  Type: ${typeof games}`);
      testsFailed++;
    }

    // Test 3: Data quality check
    console.log('\nTest 3: Data Quality Check');
    console.log(`  Games found: ${games.length}`);
    
    if (games.length === 0) {
      console.log('  ⚠ INFO: No games found (this may be expected)');
      testsPassed++;
    } else {
      // Validate game structure
      let allValid = true;
      const requiredFields = ['title', 'url', 'store'];
      
      games.forEach((game, idx) => {
        const missing = requiredFields.filter(field => !game[field]);
        if (missing.length > 0) {
          console.log(`  ✗ Game ${idx + 1} missing fields: ${missing.join(', ')}`);
          allValid = false;
        }
        // Verify store matches
        if (game.store !== scraper.store) {
          console.log(`  ✗ Game ${idx + 1} has incorrect store: ${game.store} (expected: ${scraper.store})`);
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

      // Log sample games
      console.log('\nSample Games (up to 3):');
      games.slice(0, 3).forEach((game, idx) => {
        console.log(`  ${idx + 1}. ${game.title}`);
        console.log(`     URL: ${game.url}`);
        console.log(`     Store: ${game.store}`);
        console.log(`     Has Image: ${game.imageUrl ? 'Yes' : 'No'}`);
      });
      
      if (games.length > 3) {
        console.log(`  ... and ${games.length - 3} more game(s)`);
      }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Summary: ${testsPassed} passed, ${testsFailed} failed`);
    
    return { 
      scraper: scraper.name, 
      passed: testsPassed, 
      failed: testsFailed, 
      games: games.length,
      sampleGames: games.slice(0, 3).map(g => ({ title: g.title, url: g.url }))
    };

  } catch (error) {
    console.log(`\n✗ Unexpected error during testing: ${error.message}`);
    return { scraper: scraper.name, passed: testsPassed, failed: testsFailed + 1, games: 0, error: error.message };
  }
}

async function runAllTests() {
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║  ALL GAME SCRAPERS INTEGRATION TEST                      ║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  const results = [];
  
  for (const scraper of scrapers) {
    const result = await testScraper(scraper);
    results.push(result);
  }

  // Overall summary
  console.log('\n' + '='.repeat(60));
  console.log('OVERALL SUMMARY');
  console.log('='.repeat(60));
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalGames = 0;
  
  results.forEach(result => {
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalGames += result.games;
    
    const status = result.failed === 0 ? '✓' : '✗';
    console.log(`${status} ${result.scraper}: ${result.passed} passed, ${result.failed} failed, ${result.games} games found`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  console.log('');
  console.log(`Total: ${totalPassed} tests passed, ${totalFailed} tests failed`);
  console.log(`Total games found across all scrapers: ${totalGames}`);
  console.log('');
  
  if (totalFailed > 0) {
    console.log('Status: FAILED ✗');
    console.log('\nNote: Some scrapers failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('Status: PASSED ✓');
    console.log('\nNote: All scrapers executed successfully.');
    console.log('Manual review is recommended to confirm the games are actually free.');
    process.exit(0);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('\n' + '='.repeat(60));
  console.error('FATAL ERROR');
  console.error('='.repeat(60));
  console.error('Error:', error.message);
  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  process.exit(1);
});
