import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { SentGameEntry } from '../types';

// State contains only mutable runtime data
export interface GuildState {
  guildId: string;
  lastChecked: {
    epic: Date | null;
    steam: Date | null;
    gog: Date | null;
    amazonPrime: Date | null;
  };
  sentGames: string[]; // Array of game IDs that have been sent (deprecated, for backward compatibility)
  sentGamesMap?: { [gameId: string]: SentGameEntry }; // Map of game IDs to their metadata
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
          
          // Convert sentGamesMap dates if it exists
          if (state.sentGamesMap) {
            Object.keys(state.sentGamesMap).forEach(gameId => {
              const entry = state.sentGamesMap![gameId];
              entry.lastSeen = new Date(entry.lastSeen);
              entry.notifiedDate = new Date(entry.notifiedDate);
              if (entry.endDate) {
                entry.endDate = new Date(entry.endDate);
              }
            });
          } else {
            // Migrate old sentGames array to sentGamesMap
            state.sentGamesMap = {};
            if (state.sentGames && state.sentGames.length > 0) {
              const now = new Date();
              state.sentGames.forEach(gameId => {
                state.sentGamesMap![gameId] = {
                  lastSeen: now,
                  notifiedDate: now,
                };
              });
            }
          }
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
        sentGamesMap: {},
      };
      this.scheduleSave();
    }
    return this.states[guildId];
  }

  addSentGame(guildId: string, gameId: string, endDate?: Date): void {
    const state = this.getState(guildId);
    
    // Initialize sentGamesMap if it doesn't exist
    if (!state.sentGamesMap) {
      state.sentGamesMap = {};
    }
    
    const now = new Date();
    
    // Add or update the game entry
    if (!state.sentGamesMap[gameId]) {
      state.sentGamesMap[gameId] = {
        lastSeen: now,
        notifiedDate: now,
        endDate,
      };
      
      // Also add to legacy sentGames array for backward compatibility
      if (!state.sentGames.includes(gameId)) {
        state.sentGames.push(gameId);
      }
    } else {
      // Update existing entry
      state.sentGamesMap[gameId].lastSeen = now;
      if (endDate) {
        state.sentGamesMap[gameId].endDate = endDate;
      }
    }
    
    this.scheduleSave();
  }

  hasGameBeenSent(guildId: string, gameId: string): boolean {
    const state = this.getState(guildId);
    
    // Check sentGamesMap first (preferred)
    if (state.sentGamesMap && state.sentGamesMap[gameId]) {
      return true;
    }
    
    // Fallback to legacy sentGames array
    return state.sentGames.includes(gameId);
  }

  updateGameLastSeen(guildId: string, gameId: string, endDate?: Date): void {
    const state = this.getState(guildId);
    
    if (!state.sentGamesMap) {
      state.sentGamesMap = {};
    }
    
    if (state.sentGamesMap[gameId]) {
      state.sentGamesMap[gameId].lastSeen = new Date();
      if (endDate) {
        state.sentGamesMap[gameId].endDate = endDate;
      }
      this.scheduleSave();
    }
  }

  cleanupOldGames(guildId: string, cooldownHours: number = 24): number {
    const state = this.getState(guildId);
    
    if (!state.sentGamesMap) {
      return 0;
    }
    
    const now = new Date();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const gameIdsToRemove: string[] = [];
    
    Object.keys(state.sentGamesMap).forEach(gameId => {
      const entry = state.sentGamesMap![gameId];
      const timeSinceLastSeen = now.getTime() - entry.lastSeen.getTime();
      
      // Remove games that haven't been seen as free for longer than the cooldown period
      if (timeSinceLastSeen > cooldownMs) {
        gameIdsToRemove.push(gameId);
        delete state.sentGamesMap![gameId];
        logger.debug(`Removed game ${gameId} from state (not seen for ${Math.round(timeSinceLastSeen / (60 * 60 * 1000))} hours)`);
      }
    });
    
    // Batch cleanup of legacy array for efficiency
    if (gameIdsToRemove.length > 0) {
      const gameIdsSet = new Set(gameIdsToRemove);
      state.sentGames = state.sentGames.filter(gameId => !gameIdsSet.has(gameId));
      this.scheduleSave();
    }
    
    return gameIdsToRemove.length;
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
