# Discord Go Bot

A Discord bot for playing Go/Baduk with team support and KataGo AI integration. Features include:
- Multiple board sizes (9x9, 13x13, 19x19)
- Multiple rulesets (Chinese, Japanese, AGA)
- Team play support
- Move editing
- KataGo AI integration for move suggestions and AI opponents
- Score estimation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in a `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_client_id
KATAGO_ANALYSIS_ENDPOINT=your_katago_analysis_endpoint
```

3. Deploy slash commands:
```bash
node src/deploy-commands.js
```

4. Start the bot:
```bash
npm start
```

## Commands

- `/game [size] [ruleset]` - Start a new game
  - `size`: 19x19, 13x13, or 9x9
  - `ruleset`: Chinese, Japanese, or AGA

- `/join [team]` - Join a team
  - `team`: black or white

- `/play [x] [y]` - Make a move
  - `x`: X coordinate (0-18)
  - `y`: Y coordinate (0-18)

- `/pass` - Pass your turn
  - Game ends after two consecutive passes

- `/edit [x] [y]` - Edit your last move
  - Only works if you made the last move
  - `x`: New X coordinate
  - `y`: New Y coordinate

- `/score` - Calculate current score
  - Shows territory, stones, and captures based on ruleset

- `/ai` - AI commands
  - `/ai suggest` - Get move suggestion from KataGo
  - `/ai play [strength]` - Let AI make a move
    - `strength`: beginner, intermediate, or advanced
  - `/ai estimate` - Get score estimate from KataGo

## KataGo Integration

The bot uses KataGo's analysis engine for AI features. You'll need to:
1. Set up a KataGo analysis engine server
2. Set the `KATAGO_ANALYSIS_ENDPOINT` environment variable to point to your KataGo server
3. Ensure the server is accessible from where the bot is running

## Team Play

Multiple players can join each team (black/white). Any player on a team can make moves when it's their team's turn. This enables:
- Teaching games with multiple students
- Consultation games
- Social play with team discussion

## Move Editing

Players can edit their last move using the `/edit` command, but only if:
- They were the one who made the move
- The new position is a valid move
This allows for fixing misclicks or reconsidering moves without disrupting the game.

## Scoring

The bot supports three rulesets with different scoring methods:
- Chinese: Area scoring (territory + stones)
- Japanese: Territory scoring with 6.5 komi
- AGA: Area scoring with 7.5 komi and captures counted

## Development

The bot is built using:
- discord.js for Discord integration
- @napi-rs/canvas-android for Skia-based board rendering
- node-fetch for KataGo API communication

To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

ISC License
