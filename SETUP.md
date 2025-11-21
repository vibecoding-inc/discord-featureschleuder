# 🚀 Setup Guide for Discord Free Games Bot

## Step 1: Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "Free Games Bot")
3. Go to the "Bot" section in the left sidebar
4. Click "Add Bot" and confirm
5. Under "Privileged Gateway Intents", enable:
   - ✅ Server Members Intent (optional)
   - ✅ Message Content Intent (optional)
6. Click "Reset Token" and copy your bot token (keep this secret!)

## Step 2: Get Your Application ID

1. Go to the "General Information" section in the left sidebar
2. Copy your "Application ID" (also called Client ID)

## Step 3: Install the Bot

1. Clone the repository:
```bash
git clone https://github.com/vibecoding-inc/discord-featureschleuder.git
cd discord-featureschleuder
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
```

## Step 4: Build and Deploy

1. Build the TypeScript code:
```bash
npm run build
```

2. Deploy slash commands to Discord:
```bash
npm run deploy-commands
```

## Step 5: Invite the Bot to Your Server

1. Go back to the Discord Developer Portal
2. Navigate to "OAuth2" > "URL Generator"
3. Select the following scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
4. Select the following bot permissions:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Manage Messages
   - ✅ Read Message History
   - ✅ Use Slash Commands
5. Copy the generated URL and open it in your browser
6. Select your server and authorize the bot

## Step 6: Start the Bot

```bash
npm start
```

You should see:
```
✅ Logged in as YourBot#1234!
🎮 Free Games Bot is ready!
📊 Serving X guild(s)
```

## Step 7: Configure the Bot

1. In your Discord server, use the slash commands:

```
/freegames channel #free-games
```

2. Check the configuration:
```
/freegames status
```

3. Manually test:
```
/freegames check
```

## 🎯 Tips for Best Results

### Using Announcement Channels
- Create or use an existing Announcement Channel (formerly News Channel)
- Set it as your notification channel with `/freegames channel`
- The bot will automatically publish messages, making them available to follower servers

### Optimal Service Configuration
- All services are enabled by default
- Epic Games has the most reliable API
- Steam and GoG work but have limited data
- Amazon Prime Gaming has no public API (placeholder for now)

### Scheduled Checks
- The bot checks for new games every 6 hours automatically
- It also runs an initial check 10 seconds after startup
- Use `/freegames check` for manual checks anytime

### Managing Notifications
Enable/disable specific services:
```
/freegames disable service:Steam
/freegames enable service:Epic Games
```

## 🐛 Troubleshooting

### Bot doesn't respond to commands
- Make sure the bot has "Use Application Commands" permission
- Verify you deployed the commands: `npm run deploy-commands`
- Try re-inviting the bot with the correct permissions

### No games are being posted
- Check `/freegames status` to see if a channel is set
- Verify services are enabled
- Check the console logs for API errors
- Try `/freegames check` to manually trigger a check

### Bot crashes or errors
- Ensure you have Node.js 16.x or higher
- Check that your `.env` file is properly configured
- Look at console logs for specific error messages
- Verify all dependencies are installed: `npm install`

## 🔄 Keeping the Bot Running

### Option 1: PM2 (Recommended for Linux/Mac)
```bash
npm install -g pm2
pm2 start npm --name "discord-bot" -- start
pm2 save
pm2 startup
```

### Option 2: Screen/Tmux (Linux)
```bash
screen -S discord-bot
npm start
# Press Ctrl+A then D to detach
```

### Option 3: Docker (Advanced)
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t discord-bot .
docker run -d --env-file .env discord-bot
```

### Option 4: Hosting Services
- [Railway](https://railway.app/)
- [Heroku](https://heroku.com/)
- [DigitalOcean](https://www.digitalocean.com/)
- [AWS EC2](https://aws.amazon.com/ec2/)

## 📊 Monitoring

The bot logs important events to the console:
- ✅ Successfully logged in
- 🔍 Scheduled checks
- 📤 Posted games
- ❌ Errors and failures

Consider setting up log files:
```bash
npm start > bot.log 2>&1
```

## 🔒 Security Best Practices

1. **Never commit your `.env` file**
   - It's in `.gitignore` by default
   
2. **Keep your token secret**
   - Regenerate if exposed
   
3. **Use environment variables**
   - Don't hardcode credentials
   
4. **Update dependencies regularly**
   ```bash
   npm audit
   npm update
   ```

## 🆘 Need Help?

- Check existing GitHub issues
- Create a new issue with:
  - What you were trying to do
  - What actually happened
  - Relevant logs (remove sensitive info)
  - Your Node.js version: `node --version`
