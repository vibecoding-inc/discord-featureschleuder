export interface FreeGame {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  store: 'Epic Games' | 'Steam' | 'GoG' | 'Amazon Prime Gaming';
  startDate?: Date;
  endDate?: Date;
  originalPrice?: string;
  genres?: string[]; // Game genres/tags (e.g., "Action", "Adventure")
  rating?: {
    score: number; // Score out of 100 (e.g., Metacritic score)
    source?: string; // Source of the rating (e.g., "Metacritic")
  };
}

export interface BotConfig {
  guildId: string;
  channelId: string | null;
  enabledServices: {
    epic: boolean;
    steam: boolean;
    gog: boolean;
    amazonPrime: boolean;
  };
  lastChecked: {
    epic: Date | null;
    steam: Date | null;
    gog: Date | null;
    amazonPrime: Date | null;
  };
  sentGames: string[]; // Array of game IDs that have been sent
}

export interface GuildConfigs {
  [guildId: string]: BotConfig;
}
