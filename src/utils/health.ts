import { Client } from 'discord.js';

export class BotHealth {
  private client: Client;
  private startTime: Date;
  private lastCheckTime: Date | null = null;
  private errorCount: number = 0;
  private successfulChecks: number = 0;

  constructor(client: Client) {
    this.client = client;
    this.startTime = new Date();
  }

  recordCheck(success: boolean): void {
    this.lastCheckTime = new Date();
    if (success) {
      this.successfulChecks++;
    } else {
      this.errorCount++;
    }
  }

  getStatus(): {
    isReady: boolean;
    uptime: number;
    guildCount: number;
    lastCheck: Date | null;
    errorCount: number;
    successfulChecks: number;
    startTime: Date;
  } {
    return {
      isReady: this.client.isReady(),
      uptime: Date.now() - this.startTime.getTime(),
      guildCount: this.client.guilds.cache.size,
      lastCheck: this.lastCheckTime,
      errorCount: this.errorCount,
      successfulChecks: this.successfulChecks,
      startTime: this.startTime,
    };
  }

  getUptimeString(): string {
    const uptime = Date.now() - this.startTime.getTime();
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}
