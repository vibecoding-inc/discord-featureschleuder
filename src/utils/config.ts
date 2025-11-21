import fs from 'fs';
import path from 'path';
import { GuildConfigs, BotConfig } from '../types';

const CONFIG_DIR = path.join(__dirname, '../../data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  private configs: GuildConfigs = {};

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
      console.error('Error loading configs:', error);
      this.configs = {};
    }
  }

  private saveConfigs(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.configs, null, 2));
    } catch (error) {
      console.error('Error saving configs:', error);
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
      this.saveConfigs();
    }
    return this.configs[guildId];
  }

  updateConfig(guildId: string, updates: Partial<BotConfig>): void {
    const config = this.getConfig(guildId);
    this.configs[guildId] = { ...config, ...updates };
    this.saveConfigs();
  }

  setChannel(guildId: string, channelId: string): void {
    const config = this.getConfig(guildId);
    config.channelId = channelId;
    this.saveConfigs();
  }

  toggleService(guildId: string, service: keyof BotConfig['enabledServices'], enabled: boolean): void {
    const config = this.getConfig(guildId);
    config.enabledServices[service] = enabled;
    this.saveConfigs();
  }

  addSentGame(guildId: string, gameId: string): void {
    const config = this.getConfig(guildId);
    if (!config.sentGames.includes(gameId)) {
      config.sentGames.push(gameId);
      this.saveConfigs();
    }
  }

  hasGameBeenSent(guildId: string, gameId: string): boolean {
    const config = this.getConfig(guildId);
    return config.sentGames.includes(gameId);
  }

  updateLastChecked(guildId: string, service: keyof BotConfig['lastChecked']): void {
    const config = this.getConfig(guildId);
    config.lastChecked[service] = new Date();
    this.saveConfigs();
  }

  getAllConfigs(): GuildConfigs {
    return this.configs;
  }
}

export const configManager = new ConfigManager();
