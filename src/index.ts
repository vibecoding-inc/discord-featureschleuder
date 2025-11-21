import { Client, Collection, GatewayIntentBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { checkAllGuilds } from './utils/gameNotifier';
import { logger } from './utils/logger';

// Extend Client type to include commands
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, any>;
  }
}

// Load environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN is not set in environment variables!');
  logger.error('Please create a .env file with your bot token.');
  process.exit(1);
}

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// Load commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    logger.success(`Loaded command: ${command.data.name}`);
  } else {
    logger.warn(`The command at ${filePath} is missing required "data" or "execute" property.`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  logger.success(`Loaded event: ${event.name}`);
}

// Schedule automatic checks for free games
// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  logger.info('Running scheduled check for free games...');
  try {
    await checkAllGuilds(client);
    logger.success('Scheduled check completed');
  } catch (error) {
    logger.error('Error during scheduled check:', error);
  }
});

// Also run at startup after a short delay
setTimeout(async () => {
  logger.info('Running initial check for free games...');
  try {
    await checkAllGuilds(client);
    logger.success('Initial check completed');
  } catch (error) {
    logger.error('Error during initial check:', error);
  }
}, 10000); // Wait 10 seconds after startup

// Login to Discord
client.login(DISCORD_TOKEN);

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  client.destroy();
  process.exit(0);
});
