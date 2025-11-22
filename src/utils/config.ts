import { BotConfig } from '../types';
import { logger } from './logger';
import { stateManager } from './state';

// Configuration from environment variables - immutable
interface EnvConfig {
  channelId: string | null;
  enabledServices: {
    epic: boolean;
    steam: boolean;
    gog: boolean;
    amazonPrime: boolean;
  };
}

export class ConfigManager {
  private envConfig: EnvConfig;

  constructor() {
    this.envConfig = this.loadEnvConfig();
  }

  private loadEnvConfig(): EnvConfig {
    // Load channel ID from environment
    const channelId = process.env.CHANNEL_ID || null;
    if (channelId) {
      logger.info(`Channel ID loaded from environment: ${channelId}`);
    }

    // Load enabled services from environment variables
    const enabledServices = {
      epic: this.parseBoolean(process.env.ENABLE_EPIC, true),
      steam: this.parseBoolean(process.env.ENABLE_STEAM, true),
      gog: this.parseBoolean(process.env.ENABLE_GOG, true),
      amazonPrime: this.parseBoolean(process.env.ENABLE_AMAZON_PRIME, false),
    };

    logger.info('Enabled services:', enabledServices);

    return {
      channelId,
      enabledServices,
    };
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  // Force immediate save (called during graceful shutdown)
  public forceSave(): void {
    stateManager.forceSave();
  }

  getConfig(guildId: string): BotConfig {
    const state = stateManager.getState(guildId);
    
    return {
      guildId,
      channelId: this.envConfig.channelId,
      enabledServices: this.envConfig.enabledServices,
      lastChecked: state.lastChecked,
      sentGames: state.sentGames,
    };
  }

  updateConfig(guildId: string, updates: Partial<BotConfig>): void {
    // Config updates are no longer supported - configuration comes from environment
    logger.warn('updateConfig called but configuration is now environment-based and immutable');
  }

  setChannel(guildId: string, channelId: string): void {
    // Channel is now set via environment variable
    logger.warn('setChannel called but channel is now set via CHANNEL_ID environment variable');
  }

  toggleService(guildId: string, service: keyof BotConfig['enabledServices'], enabled: boolean): void {
    // Services are now configured via environment variables
    logger.warn(`toggleService called but services are now configured via ENABLE_* environment variables`);
  }

  addSentGame(guildId: string, gameId: string): void {
    stateManager.addSentGame(guildId, gameId);
  }

  hasGameBeenSent(guildId: string, gameId: string): boolean {
    return stateManager.hasGameBeenSent(guildId, gameId);
  }

  updateLastChecked(guildId: string, service: keyof BotConfig['lastChecked']): void {
    stateManager.updateLastChecked(guildId, service);
  }

  getAllConfigs(): { [guildId: string]: BotConfig } {
    const states = stateManager.getAllStates();
    const configs: { [guildId: string]: BotConfig } = {};
    
    Object.keys(states).forEach(guildId => {
      configs[guildId] = this.getConfig(guildId);
    });
    
    return configs;
  }
}

export const configManager = new ConfigManager();
