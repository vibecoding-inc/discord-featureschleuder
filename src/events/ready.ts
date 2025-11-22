import { Events, Client } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client) {
  console.log(`✅ Logged in as ${client.user?.tag}!`);
  console.log(`🎮 Free Games Bot is ready!`);
  console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);
}
