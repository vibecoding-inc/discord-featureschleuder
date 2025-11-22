import fs from 'fs';
import path from 'path';
import { GuildConfigs, BotConfig } from '../types';
import { logger } from './logger';

const CONFIG_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SAVE_DEBOUNCE_MS = 5000; // Save after 5 seconds of inactivity

export class ConfigManager {
  private configs: GuildConfigs = {};
  private saveTimer: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  constructor() {
    this.loadConfigs();
  }

  private loadConfigs(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.configs = JSON.parse(data);
      }
    } catch (error) {
      logger.error('Error loading configs:', error);
      this.configs = {};
    }
  }

  private saveConfigs(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.configs, null, 2));
      this.isDirty = false;
      logger.debug('Configs saved to disk');
    } catch (error) {
      logger.error('Error saving configs:', error);
    }
  }

  private scheduleSave(): void {
    this.isDirty = true;
    
    // Clear existing timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // Schedule new save
    this.saveTimer = setTimeout(() => {
      if (this.isDirty) {
        this.saveConfigs();
      }
    }, SAVE_DEBOUNCE_MS);
  }

  // Force immediate save (called during graceful shutdown)
  public forceSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.isDirty) {
      this.saveConfigs();
    }
  }

  getConfig(guildId: string): BotConfig {
    if (!this.configs[guildId]) {
      this.configs[guildId] = {
        guildId,
        channelId: null,
        enabledServices: {
          epic: true,
          steam: true,
          gog: true,
          amazonPrime: true,
        },
        lastChecked: {
          epic: null,
          steam: null,
          gog: null,
          amazonPrime: null,
        },
        sentGames: [],
      };
      this.scheduleSave();
    }
    return this.configs[guildId];
  }

  updateConfig(guildId: string, updates: Partial<BotConfig>): void {
    const config = this.getConfig(guildId);
    this.configs[guildId] = { ...config, ...updates };
    this.scheduleSave();
  }

  setChannel(guildId: string, channelId: string): void {
    const config = this.getConfig(guildId);
    config.channelId = channelId;
    this.scheduleSave();
  }

  toggleService(guildId: string, service: keyof BotConfig['enabledServices'], enabled: boolean): void {
    const config = this.getConfig(guildId);
    config.enabledServices[service] = enabled;
    this.scheduleSave();
  }

  addSentGame(guildId: string, gameId: string): void {
    const config = this.getConfig(guildId);
    if (!config.sentGames.includes(gameId)) {
      config.sentGames.push(gameId);
      this.scheduleSave();
    }
  }

  hasGameBeenSent(guildId: string, gameId: string): boolean {
    const config = this.getConfig(guildId);
    return config.sentGames.includes(gameId);
  }

  updateLastChecked(guildId: string, service: keyof BotConfig['lastChecked']): void {
    const config = this.getConfig(guildId);
    config.lastChecked[service] = new Date();
    this.scheduleSave();
  }

  getAllConfigs(): GuildConfigs {
    return this.configs;
  }
}

export const configManager = new ConfigManager();
