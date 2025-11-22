import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// State contains only mutable runtime data
export interface GuildState {
  guildId: string;
  lastChecked: {
    epic: Date | null;
    steam: Date | null;
    gog: Date | null;
    amazonPrime: Date | null;
  };
  sentGames: string[]; // Array of game IDs that have been sent
}

export interface GuildStates {
  [guildId: string]: GuildState;
}

const STATE_DIR = path.join(__dirname, '../../data');
const STATE_FILE = path.join(STATE_DIR, 'state.json');
const SAVE_DEBOUNCE_MS = 5000; // Save after 5 seconds of inactivity

export class StateManager {
  private states: GuildStates = {};
  private saveTimer: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  constructor() {
    this.loadStates();
  }

  private loadStates(): void {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }

      if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, 'utf-8');
        this.states = JSON.parse(data);
        // Convert date strings back to Date objects
        Object.values(this.states).forEach(state => {
          Object.keys(state.lastChecked).forEach(key => {
            const service = key as keyof GuildState['lastChecked'];
            if (state.lastChecked[service]) {
              state.lastChecked[service] = new Date(state.lastChecked[service] as any);
            }
          });
        });
      }
    } catch (error) {
      logger.error('Error loading state:', error);
      this.states = {};
    }
  }

  private saveStates(): void {
    try {
      if (!fs.existsSync(STATE_DIR)) {
        fs.mkdirSync(STATE_DIR, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.states, null, 2));
      this.isDirty = false;
      logger.debug('State saved to disk');
    } catch (error) {
      logger.error('Error saving state:', error);
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
      this.isDirty = false;
      this.saveStates();
    }, SAVE_DEBOUNCE_MS);
  }

  // Force immediate save (called during graceful shutdown)
  public forceSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.isDirty) {
      this.saveStates();
    }
  }

  getState(guildId: string): GuildState {
    if (!this.states[guildId]) {
      this.states[guildId] = {
        guildId,
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
    return this.states[guildId];
  }

  addSentGame(guildId: string, gameId: string): void {
    const state = this.getState(guildId);
    if (!state.sentGames.includes(gameId)) {
      state.sentGames.push(gameId);
      this.scheduleSave();
    }
  }

  hasGameBeenSent(guildId: string, gameId: string): boolean {
    const state = this.getState(guildId);
    return state.sentGames.includes(gameId);
  }

  updateLastChecked(guildId: string, service: keyof GuildState['lastChecked']): void {
    const state = this.getState(guildId);
    state.lastChecked[service] = new Date();
    this.scheduleSave();
  }

  getAllStates(): GuildStates {
    return this.states;
  }
}

export const stateManager = new StateManager();
