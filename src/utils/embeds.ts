import { EmbedBuilder } from 'discord.js';
import { FreeGame } from '../types';

export function createGameEmbed(game: FreeGame): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${game.title}`)
    .setDescription(game.description || 'No description available')
    .setColor(getColorForStore(game.store))
    .setURL(game.url)
    .addFields(
      { name: '🏪 Store', value: game.store, inline: true }
    );

  if (game.imageUrl) {
    embed.setThumbnail(game.imageUrl);
  }

  if (game.originalPrice) {
    embed.addFields({ name: '💰 Original Price', value: game.originalPrice, inline: true });
  }

  // Add genres/tags if available
  if (game.genres && game.genres.length > 0) {
    embed.addFields({ 
      name: '🎯 Genres', 
      value: game.genres.join(', '), 
      inline: true 
    });
  }

  // Add rating if available
  if (game.rating) {
    const ratingDisplay = game.rating.source 
      ? `${game.rating.score}/100 (${game.rating.source})`
      : `${game.rating.score}/100`;
    embed.addFields({ 
      name: '⭐ Rating', 
      value: ratingDisplay, 
      inline: true 
    });
  }

  if (game.endDate) {
    // Use Discord timestamp formatting for better user experience (shows in user's local timezone)
    const timestamp = Math.floor(game.endDate.getTime() / 1000);
    const endDateStr = `<t:${timestamp}:F>`;
    embed.addFields({ name: '⏰ Available Until', value: endDateStr, inline: false });
  }

  embed.setFooter({ text: `Free on ${game.store}` });
  embed.setTimestamp();

  return embed;
}

function getColorForStore(store: string): number {
  switch (store) {
    case 'Epic Games':
      return 0x000000; // Black
    case 'Steam':
      return 0x1b2838; // Steam blue
    case 'GoG':
      return 0x86328a; // GoG purple
    case 'Amazon Prime Gaming':
      return 0x00a8e1; // Amazon blue
    default:
      return 0x5865f2; // Discord blurple
  }
}

export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('❌ Error')
    .setDescription(message)
    .setColor(0xff0000)
    .setTimestamp();
}

export function createSuccessEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('✅ Success')
    .setDescription(message)
    .setColor(0x00ff00)
    .setTimestamp();
}
