# Game Re-announcement Feature

## Overview
This feature allows games that were previously free to be announced again if they become free in the future, after a cooldown period.

## How It Works

### 1. Game Tracking
When a game is announced:
- The game ID is stored in `sentGamesMap` with metadata:
  - `lastSeen`: Timestamp when the game was last seen as free
  - `notifiedDate`: Timestamp when the game was first announced
  - `endDate`: Optional end date of the free period (if available)

### 2. Continuous Monitoring
Every time the bot checks for free games (every 6 hours):
- It updates the `lastSeen` timestamp for games that are still free
- This keeps track of which games are currently free vs. no longer free

### 3. Cleanup Process
Before checking for new games, the bot runs a cleanup process:
- Games that haven't been seen as free for more than 24 hours are removed from storage
- This allows those games to be announced again if they become free in the future

### 4. Re-announcement
Once a game is removed from storage after the cooldown period:
- If that game becomes free again later, it will be treated as a "new" game
- The bot will announce it again to the configured channel

## Example Timeline

```
Day 1, 00:00: Game "Example RPG" becomes free
Day 1, 06:00: Bot checks, announces "Example RPG" (lastSeen updated)
Day 1, 12:00: Bot checks, "Example RPG" still free (lastSeen updated)
Day 1, 18:00: Bot checks, "Example RPG" still free (lastSeen updated)
Day 2, 00:00: Bot checks, "Example RPG" still free (lastSeen updated)
Day 2, 06:00: Bot checks, "Example RPG" no longer free (lastSeen NOT updated)
Day 3, 06:00: Bot checks, runs cleanup
              - "Example RPG" last seen 24+ hours ago
              - "Example RPG" removed from storage

Day 10, 00:00: Game "Example RPG" becomes free again
Day 10, 06:00: Bot checks, "Example RPG" not in storage
               - Announces "Example RPG" as a new free game
```

## Configuration

The cooldown period is set to **24 hours** by default. This is defined in:
- `src/services/gameChecker.ts` in the `checkAllGames` function
- `src/utils/state.ts` in the `cleanupOldGames` method

To change the cooldown period, modify the parameter in the `cleanupOldGames` call:
```typescript
// In gameChecker.ts
const removedCount = configManager.cleanupOldGames(guildId, 24); // Change 24 to desired hours
```

## Backward Compatibility

The implementation maintains backward compatibility with existing installations:
- Old `sentGames` arrays are automatically migrated to the new `sentGamesMap` structure
- Migrated games are assigned the current timestamp as their `lastSeen` and `notifiedDate`
- This ensures existing tracked games won't be immediately re-announced

## Technical Details

### Files Modified
1. **src/types/index.ts**: Added `SentGameEntry` interface
2. **src/utils/state.ts**: Enhanced state management with timestamp tracking
3. **src/utils/config.ts**: Exposed cleanup and update methods
4. **src/services/gameChecker.ts**: Integrated cleanup and tracking logic
5. **src/utils/gameNotifier.ts**: Pass endDate when adding games

### Key Methods
- `addSentGame(guildId, gameId, endDate?)`: Adds/updates a game with current timestamp
- `updateGameLastSeen(guildId, gameId, endDate?)`: Updates lastSeen for still-free games
- `cleanupOldGames(guildId, cooldownHours)`: Removes games not seen for X hours
- `hasGameBeenSent(guildId, gameId)`: Checks if game is in storage

### State Structure
```typescript
{
  "guildId": "123456789",
  "lastChecked": { ... },
  "sentGames": [...],  // Legacy, for backward compatibility
  "sentGamesMap": {
    "epic-games-example-rpg": {
      "lastSeen": "2025-11-24T09:00:00.000Z",
      "notifiedDate": "2025-11-23T06:00:00.000Z",
      "endDate": "2025-11-30T23:59:59.000Z"
    }
  }
}
```
