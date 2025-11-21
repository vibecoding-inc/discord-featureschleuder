# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-11-21

### Added
- Initial release of Discord Free Games Bot
- Multi-platform support for:
  - Epic Games Store (full API integration)
  - Steam (limited support)
  - GoG (full API integration)
  - Amazon Prime Gaming (placeholder)
- Slash command interface:
  - `/freegames channel` - Set notification channel
  - `/freegames enable` - Enable service notifications
  - `/freegames disable` - Disable service notifications
  - `/freegames status` - View configuration
  - `/freegames check` - Manual game check
  - `/help` - Help information
  - `/info` - Bot statistics
- Rich embed messages with:
  - Game title and description
  - Thumbnail images
  - Direct links to claim games
  - Original pricing information
  - Availability dates
  - Color coding by platform
- Auto-publish functionality for announcement channels
- Automated scheduled checks every 6 hours
- Smart duplicate detection to avoid reposting
- Per-server configuration system
- JSON-based persistent storage
- Comprehensive error handling and logging
- TypeScript for type safety
- Docker support for easy deployment
- Extensive documentation:
  - README with feature overview
  - SETUP guide for installation
  - CONTRIBUTING guide for developers
  - Docker deployment options

### Technical Details
- Built with Discord.js v14
- TypeScript for type-safe development
- Node-cron for scheduled tasks
- Axios for HTTP requests
- Modular architecture for easy maintenance

### Known Limitations
- Amazon Prime Gaming has no public API (placeholder implementation)
- Steam free games detection is limited due to API constraints
- Requires manual bot token setup
