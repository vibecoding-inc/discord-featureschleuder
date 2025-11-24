# Discord Free Games Bot - Copilot Instructions

## Project Overview

This is a TypeScript-based Discord bot that automatically announces free games from multiple platforms (Epic Games Store, Steam, GoG, and Amazon Prime Gaming). The bot uses Discord.js v14 for Discord integration and runs scheduled checks every 6 hours to discover and announce new free games.

## Architecture

### Tech Stack
- **Runtime**: Node.js 16+
- **Language**: TypeScript with strict mode enabled
- **Discord Library**: Discord.js v14
- **HTTP Client**: axios for API calls
- **Scheduler**: node-cron for periodic tasks
- **Build**: TypeScript compiler (tsc)

### Directory Structure

```
src/
├── commands/           # Slash command implementations
│   ├── freegames.ts   # Main bot configuration commands (/freegames)
│   ├── help.ts        # Help command (/help)
│   └── info.ts        # Bot statistics (/info)
├── events/            # Discord event handlers
│   ├── ready.ts       # Bot initialization event
│   └── interactionCreate.ts  # Command interaction handler
├── services/          # External API integrations
│   ├── epic.ts        # Epic Games Store API
│   ├── steam.ts       # Steam API
│   ├── gog.ts         # GoG API
│   ├── amazon.ts      # Amazon Prime Gaming (placeholder)
│   └── gameChecker.ts # Unified game checking logic
├── utils/             # Utility modules
│   ├── config.ts      # Configuration management (per-guild)
│   ├── embeds.ts      # Discord embed builders
│   ├── gameNotifier.ts # Game notification handler
│   ├── logger.ts      # Structured logging system
│   └── state.ts       # State persistence (data/config.json)
├── types/             # TypeScript type definitions
│   └── index.ts       # Shared interfaces (FreeGame, BotConfig, etc.)
├── index.ts           # Main bot entry point
└── deploy-commands.ts # Slash command deployment script

data/                  # Runtime data (gitignored)
└── config.json        # Per-guild configurations and state
```

## Core Concepts

### Bot Configuration (Per-Guild)
Each Discord server (guild) has independent configuration stored in `data/config.json`:
- **channelId**: Where to post game notifications
- **enabledServices**: Which platforms to monitor (epic, steam, gog, amazonPrime)
- **lastChecked**: Timestamps of last check per service
- **sentGames**: Array of game IDs to prevent duplicate announcements

### Game Flow
1. Scheduled cron job runs every 6 hours (also at startup after 10s delay)
2. `checkAllGuilds()` iterates through all configured guilds
3. For each guild, `checkAllGames()` fetches from enabled services
4. New games (not in sentGames) are filtered out
5. Rich embeds are created with game details
6. Messages are posted to configured channels
7. Auto-publish if channel is an announcement channel
8. Game IDs are marked as sent to prevent duplicates

### Game Services
- **Epic Games**: Uses official Epic Games Store API (`/freeGamesPromotions`)
- **Steam**: Parses featured games page (limited, no official free games API)
- **GoG**: Uses GoG's AJAX API for product listings
- **Amazon Prime**: Placeholder (no public API, requires web scraping)

## Key Conventions & Patterns

### TypeScript Patterns
- **Strict mode enabled**: All code must pass TypeScript strict checks
- **Type definitions**: Use types from `src/types/index.ts` for consistency
- **Module exports**: Use named exports, not default exports
- **Async/await**: Prefer async/await over promises for readability

### Code Organization
- **Commands**: Each command is a separate file with `data` (SlashCommandBuilder) and `execute` function
- **Events**: Event handlers export `name`, `once` (boolean), and `execute` function
- **Services**: Service fetchers return `Promise<FreeGame[]>`
- **Utils**: Shared utilities are singleton instances (e.g., `configManager`, `logger`)

### Naming Conventions
- **Files**: Use camelCase for TypeScript files (e.g., `freegames.ts`, `gameChecker.ts`)
- **Functions**: Use camelCase (e.g., `fetchEpicGames`, `createGameEmbed`)
- **Types/Interfaces**: Use PascalCase (e.g., `FreeGame`, `BotConfig`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `DISCORD_TOKEN`, `STATE_DIR`)

### Error Handling
- **Services**: Wrap API calls in try-catch, log errors, return empty array on failure
- **Commands**: Use try-catch and reply with error embeds using `createErrorEmbed()`
- **Logger**: Use `logger.error()` for errors, includes stack traces

### Logging
The project uses a structured logging system (`src/utils/logger.ts`):
- `logger.debug()` - Debug information
- `logger.info()` - General information
- `logger.warn()` - Warnings
- `logger.error()` - Errors with stack traces
- `logger.success()` - Success messages (green checkmark)

### Discord Embeds
Use `createGameEmbed()` from `src/utils/embeds.ts` to create rich embeds:
- Color-coded by platform (Epic=purple, Steam=blue, GoG=magenta, Amazon=orange)
- Includes: title, description, thumbnail, URL, price, dates
- Use `createSuccessEmbed()` and `createErrorEmbed()` for status messages

## Build & Development

### Essential Commands
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the bot (requires .env with DISCORD_TOKEN and CLIENT_ID)
npm start

# Build and start in one step
npm run dev

# Deploy slash commands to Discord
npm run deploy-commands
```

### Environment Variables
Required in `.env` file:
- `DISCORD_TOKEN` - Discord bot token (required)
- `CLIENT_ID` - Discord application ID (required)
- `GUILD_ID` - Guild ID for guild-specific command deployment (optional)

### TypeScript Configuration
- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled
- **Output**: `dist/` directory
- **Source**: `src/` directory

### Docker Support
The project includes Docker support:
```bash
# Using Docker Compose (recommended)
docker-compose up -d

# Using Docker directly
docker build -t discord-freegames-bot .
docker run -e DISCORD_TOKEN=xxx -e CLIENT_ID=xxx discord-freegames-bot
```

Note: Slash commands are automatically deployed on container startup via `entrypoint.sh`.

## Slash Commands

### /freegames
Main command with subcommands (requires Manage Server permission):
- `channel <channel>` - Set notification channel
- `enable <service>` - Enable a game service (epic, steam, gog, amazonPrime)
- `disable <service>` - Disable a game service
- `status` - View current configuration
- `check` - Manually trigger game check

### /help
Display help information (no permissions required)

### /info
Show bot statistics (no permissions required)

## CI/CD Pipeline

### GitHub Actions Workflows
- **build.yml**: Build and test on push/PR (Node 16.x, 18.x, 20.x)
  - Install dependencies
  - Build TypeScript
  - Verify TypeScript compilation
  - Build Docker image
  - Push to ghcr.io (on main branch)
  
- **release.yml**: Create releases and publish Docker images

### Security
- CodeQL security scanning enabled (currently 0 alerts)
- npm audit (currently 0 vulnerabilities)
- No hardcoded secrets in code
- GitHub Actions permissions are restricted

## Important Implementation Details

### State Management
- Configuration is auto-saved with debouncing (5-second delay)
- Force-save on process termination (SIGINT, SIGTERM)
- State file: `data/config.json`
- ConfigManager is a singleton: `configManager`

### Game ID Generation
Games are uniquely identified by: `${game.store}-${game.title}`
This prevents duplicate announcements of the same game.

### Auto-Publishing
If the configured channel is an announcement/news channel, messages are automatically published (crossposted) to follower servers using `message.crosspost()`.

### Scheduled Tasks
- Cron: `'0 */6 * * *'` (every 6 hours)
- Initial check: 10 seconds after bot startup
- Both call `checkAllGuilds(client)`

### Discord.js Extensions
The Client type is extended to include a `commands` Collection:
```typescript
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, any>;
  }
}
```

## Common Development Tasks

### Adding a New Game Platform
1. Create service fetcher in `src/services/newplatform.ts`
2. Add to `BotConfig['enabledServices']` in `src/types/index.ts`
3. Add to `serviceFetchers` map in `src/services/gameChecker.ts`
4. Add choice to `/freegames enable` command in `src/commands/freegames.ts`
5. Add color mapping in `src/utils/embeds.ts`

### Adding a New Command
1. Create file in `src/commands/newcommand.ts`
2. Export `data` (SlashCommandBuilder) and `execute` function
3. Build and run `npm run deploy-commands`
4. Commands are auto-loaded from `src/commands/` directory

### Debugging
- Set `LOG_LEVEL=DEBUG` environment variable for debug logs
- Check `data/config.json` for current state
- Use `logger.debug()` for detailed logging
- Test commands manually in Discord

## Testing Notes

The project currently does not have automated tests. When testing:
- Always test in a Discord server with the bot
- Test all slash commands with various inputs
- Verify game notifications appear correctly
- Check auto-publishing on announcement channels
- Test with multiple guilds to verify isolation

## Dependencies

### Production
- `axios` (^1.13.2) - HTTP client for API calls
- `discord.js` (^14.25.0) - Discord bot framework
- `node-cron` (^4.2.1) - Scheduled tasks

### Development
- `@types/node` (^24.10.1) - Node.js type definitions
- `@types/node-cron` (^3.0.11) - node-cron type definitions
- `typescript` (^5.9.3) - TypeScript compiler

## License & Contribution

- **License**: ISC
- **Contributing**: See CONTRIBUTING.md for guidelines
- Always follow existing code style and conventions
- Use TypeScript strict mode
- Add inline comments only for complex logic
- Update documentation when adding features

## Gotchas & Known Issues

1. **Amazon Prime Gaming**: No public API available - currently returns empty array
2. **Steam Free Games**: Limited detection due to lack of official API
3. **State Persistence**: Config changes are debounced, may not save immediately
4. **Multiple Servers**: Each guild is independent - changes don't affect others
5. **Command Deployment**: Must redeploy commands after adding/modifying them
6. **Docker Auto-Deploy**: Commands are deployed automatically in Docker, no manual step needed

## Future Enhancements (from docs)

Potential features mentioned in documentation:
- Web dashboard for configuration
- Custom notification messages
- Role mentions for game announcements
- Filter games by genre or price threshold
- PlayStation Plus integration
- Xbox Game Pass integration
- Multi-language support
- Game ratings and reviews integration
