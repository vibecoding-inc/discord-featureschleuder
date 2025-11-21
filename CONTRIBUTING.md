# Contributing to Discord Free Games Bot

Thank you for considering contributing to this project! 🎮

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (OS, Node.js version)
- Relevant logs (remove sensitive information)

### Suggesting Features

We welcome feature suggestions! Please:
- Check if the feature has already been requested
- Clearly describe the feature and its benefits
- Provide examples of how it would work

### Adding New Game Platforms

To add support for a new game platform:

1. Create a new fetcher in `src/services/`:
```typescript
// src/services/newplatform.ts
import axios from 'axios';
import { FreeGame } from '../types';

export async function fetchNewPlatformGames(): Promise<FreeGame[]> {
  // Implement fetching logic
  return [];
}
```

2. Update the types in `src/types/index.ts`:
```typescript
export interface BotConfig {
  enabledServices: {
    // ... existing services
    newPlatform: boolean;
  };
  lastChecked: {
    // ... existing services
    newPlatform: Date | null;
  };
}
```

3. Add to the game checker in `src/services/gameChecker.ts`

4. Update the slash commands in `src/commands/freegames.ts`

5. Add a color for the platform in `src/utils/embeds.ts`

### Pull Request Process

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Coding Standards

- Use TypeScript for all new code
- Follow existing code style
- Add comments for complex logic
- Update documentation as needed
- Test your changes

### Testing

Before submitting:
```bash
# Build the project
npm run build

# Test commands locally
npm run dev
```

## Code of Conduct

Be respectful and constructive in all interactions.

## Questions?

Feel free to open an issue for questions about contributing!
