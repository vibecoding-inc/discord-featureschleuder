# 🎮 Discord Free Games Bot

A Discord bot that automatically announces free games from multiple platforms including Epic Games Store, Steam, GoG, and Amazon Prime Gaming.

## ✨ Features

- **Multi-Platform Support**: Fetches free games from:
  - 🎮 Epic Games Store
  - 🎮 Steam
  - 🎮 GoG (Good Old Games)
  - 🎮 Amazon Prime Gaming
  
- **Configurable Services**: Enable or disable notifications for each platform individually

- **Beautiful Embeds**: Games are displayed in rich embeds with:
  - Game title and description
  - Thumbnail image
  - Direct link to claim the game
  - Original price (when available)
  - Availability period
  - Color-coded by platform

- **Auto-Publishing**: Automatically publishes messages to announcement channels for cross-server distribution

- **Scheduled Checks**: Automatically checks for new free games every 6 hours

- **Slash Commands**: Easy-to-use Discord slash commands for configuration

- **Smart Tracking**: Remembers which games have been announced to avoid duplicates

## 📋 Prerequisites

- Node.js 16.x or higher
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))
- Discord Application ID

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/vibecoding-inc/discord-featureschleuder.git
cd discord-featureschleuder
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Edit the `.env` file and add your Discord credentials:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
```

5. Build the TypeScript code:
```bash
npm run build
```

6. Deploy the slash commands:
```bash
npm run deploy-commands
```

7. Start the bot:
```bash
npm start
```

## 🎯 Usage

### Setting Up the Bot

1. **Invite the bot to your server** with the following permissions:
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Manage Messages (for auto-publishing)

2. **Set the notification channel**:
```
/freegames channel #your-channel
```

3. **Configure which services to monitor** (optional, all enabled by default):
```
/freegames enable service:Epic Games
/freegames disable service:Steam
```

### Available Commands

- `/freegames channel` - Set the channel where free game notifications will be posted
- `/freegames enable` - Enable notifications for a specific service
- `/freegames disable` - Disable notifications for a specific service
- `/freegames status` - View current bot configuration and enabled services
- `/freegames check` - Manually trigger a check for new free games

### Auto-Publishing

If you set an **Announcement Channel** as the notification channel, the bot will automatically publish (crosspost) messages to follower servers. This allows other servers to receive the free game notifications automatically.

## 🛠️ Configuration

The bot stores configuration per server in `data/config.json`. Each server can have its own:
- Notification channel
- Enabled/disabled services
- Tracked games (to avoid duplicates)

## 📝 API Limitations

- **Epic Games**: Uses the official Epic Games Store API
- **Steam**: Limited due to lack of official free games API
- **GoG**: Uses GoG's AJAX API
- **Amazon Prime Gaming**: No public API available (currently returns empty, would need web scraping or third-party service)

## 🔧 Development

### Project Structure
```
src/
├── commands/           # Slash command definitions
│   └── freegames.ts   # Main command file
├── events/            # Discord event handlers
│   ├── ready.ts
│   └── interactionCreate.ts
├── services/          # Game fetching services
│   ├── epic.ts
│   ├── steam.ts
│   ├── gog.ts
│   ├── amazon.ts
│   └── gameChecker.ts
├── utils/             # Utility functions
│   ├── config.ts
│   ├── embeds.ts
│   └── gameNotifier.ts
├── types/             # TypeScript type definitions
│   └── index.ts
├── index.ts           # Main bot entry point
└── deploy-commands.ts # Command deployment script
```

### Build Commands
```bash
npm run build          # Compile TypeScript
npm run dev            # Build and run
npm start              # Run compiled code
npm run deploy-commands # Deploy slash commands
```

## 🐳 Docker Deployment

### Using Docker Compose

The easiest way to run the bot with Docker:

```bash
# Copy and edit environment variables
cp .env.example .env
# Edit .env with your Discord credentials

# Start the bot
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the bot
docker-compose down
```

**Note:** The bot automatically deploys slash commands to Discord on startup. The first time you run the bot, you'll see a message in the logs confirming that commands were successfully deployed.

### Using Docker directly

```bash
# Build the image
docker build -t discord-freegames-bot .

# Run the container
docker run -d \
  --name discord-bot \
  -e DISCORD_TOKEN=your_token \
  -e CLIENT_ID=your_client_id \
  -v $(pwd)/data:/app/data \
  discord-freegames-bot
```

**Note:** Slash commands are automatically deployed when the container starts. Check the logs with `docker logs discord-bot` to verify successful deployment.

## ☸️ Kubernetes Deployment

For production deployments on Kubernetes, see the [k8s/README.md](k8s/README.md) for detailed instructions.

Quick start:
```bash
cd k8s
# Edit secret.yaml with your credentials
kubectl apply -k .
```

The bot can be deployed using the provided Kubernetes manifests with Kustomize. Docker images are automatically published to GitHub Container Registry (ghcr.io) when a new release is created.

**Note:** Slash commands are automatically deployed to Discord when the bot starts - no manual deployment step needed!

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Add support for more game platforms

## 📄 License

ISC License

## 🙏 Acknowledgments

- Built with [Discord.js](https://discord.js.org/)
- Game data from Epic Games Store, Steam, GoG, and Amazon Prime Gaming

## 🆘 Support

If you encounter any issues or have questions:
1. Check existing GitHub issues
2. Create a new issue with details about your problem
3. Include relevant logs and configuration

## 🔮 Future Enhancements

Potential features to add:
- ✅ Web dashboard for configuration
- ✅ Custom notification messages
- ✅ Role mentions for game announcements
- ✅ Filter games by genre or price threshold
- ✅ Integration with more platforms (PlayStation Plus, Xbox Game Pass)
- ✅ Multi-language support
- ✅ Game ratings and reviews integration