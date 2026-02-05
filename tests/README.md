# Tests

This directory contains integration tests for the Discord free games bot.

## GOG Scraper Test

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
