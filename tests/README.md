# Tests

This directory contains integration tests for the Discord free games bot scrapers.

## All Scrapers Test

### Purpose

The all scrapers test (`all-scrapers.test.js`) runs **all game scrapers** (Epic Games, Steam, GOG, Amazon Prime Gaming) against their respective live websites to verify:

1. Each scraper executes without throwing exceptions
2. Each returns an array (which may be empty if no free games are available)
3. Any games found have the required fields (`title`, `url`, `store`)
4. The `store` field matches the expected value for each scraper

### Running Locally

```bash
# Run all scrapers test
npm run test:scrapers

# Run individual GOG scraper test (legacy)
npm run test:gog
```

### Automated Testing

The test automatically runs on pull requests that modify:
- `src/services/*.ts` (any scraper service file)
- `tests/*.test.js` (any test file)
- `.github/workflows/scrapers-test.yml`

Test results are automatically posted as a **collapsible comment** on the PR for manual review.

### Manual Review

⚠️ **Important:** While the tests verify technical functionality, **manual review is required** to confirm that:
- The listed games are actually free on their respective platforms
- The game titles and URLs are correct
- The scrapers are not picking up paid games, demos, or DLC incorrectly
- Temporarily free games are distinguished from permanently free games (especially for GOG)

### Test Output

The test outputs for each scraper:
- Execution status (pass/fail)
- Execution time
- Number of games found
- Sample of up to 3 games with their titles, URLs, and stores
- Overall summary across all scrapers

### Expected Behavior

- ✅ **Pass:** All scrapers run without errors and return valid data
- ⚠️ **Info:** Some scrapers may return 0 games (this is expected when no free games are available)
- ❌ **Fail:** A scraper throws an exception or returns invalid data

### CI/CD Integration

The GitHub Actions workflow (`.github/workflows/scrapers-test.yml`) automatically:
1. Builds the TypeScript project
2. Runs all game scraper tests
3. Posts results as a **collapsible PR comment** (click to expand details)
4. Updates the comment on subsequent runs

This allows reviewers to see the current behavior of all scrapers without manually running tests.

## Individual Scraper Tests

### GOG Scraper Test (Legacy)

The GOG-specific test (`gog-scraper.test.js`) is maintained for backward compatibility and focused testing of the GOG scraper. Use `npm run test:gog` to run it.

See the original GOG scraper test documentation below for details on its specific behavior.

---

## Legacy GOG Test Documentation

### Purpose

The GOG scraper test (`gog-scraper.test.js`) runs the GOG web scraper against the live GOG website to verify:

1. The scraper executes without throwing exceptions
2. It returns an array (which may be empty if no free games are available)
3. Any games found have the required fields (`title`, `url`, `store`, `description`)

### Running Locally

```bash
# Run the test
npm run test:gog
```

### Automated Testing

The test automatically runs on pull requests that modify:
- `src/services/gog.ts`
- `tests/gog-scraper.test.js`
- `.github/workflows/gog-scraper-test.yml`

Test results are automatically posted as a comment on the PR for manual review.

### Manual Review

⚠️ **Important:** While the test verifies technical functionality, **manual review is required** to confirm that:
- The listed games are actually free on GOG
- The game titles and URLs are correct
- The scraper is not picking up paid games, demos, or DLC incorrectly

### Test Output

The test outputs:
- Execution status (pass/fail)
- Execution time
- Number of games found
- Sample of up to 5 games with their titles, URLs, and image status
- Summary of test results

### Expected Behavior

- ✅ **Pass:** Scraper runs without errors and returns valid data
- ⚠️ **Warning:** No games found (may be expected if GOG has no free games at the moment)
- ❌ **Fail:** Scraper throws an exception or returns invalid data

### CI/CD Integration

The GitHub Actions workflow (`.github/workflows/gog-scraper-test.yml`) automatically:
1. Builds the TypeScript project
2. Runs the GOG scraper test
3. Posts results as a PR comment
4. Updates the comment on subsequent runs

This allows reviewers to see the current scraper behavior without manually running tests.
