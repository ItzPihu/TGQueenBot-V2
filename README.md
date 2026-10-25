

# TGQueenBot-V2

**Powerful, ultra-fast, and flexible multipurpose Telegram Bot powered by the latest [grammY](https://grammy.dev/) Bot API, written in TypeScript, and optimized for the [Bun.js](https://bun.sh/) runtime.**

| Metadata | Details |
| :--- | :--- |
| **Project Name** | TGQueenBot-V2 |
| **Author** | [Priyanshi Kaur](https://github.com/ItzPihu) |
| **Source Repository** | [github.com/ItzPihu/TGQueenBot-V2](https://github.com/ItzPihu/TGQueenBot-V2) |
| **Core Framework** | Latest grammY Bot API |
| **Runtime & Language** | Bun.js / Node.js • TypeScript |
| **Handler Architecture** | Messenger Bot Inspired (GoatBot V2 Style) |
| **Status** | Actively Maintained |
| **License** | MIT License |

## Overview

**TGQueenBot-V2** is a next-generation Telegram bot engineered for speed, modularity, and ease of customization. Taking direct inspiration from Messenger bot architectures (**GoatBot V2**), it brings a structured lifecycle handler system (`onStart`, `onChat`, `onReply`, and `onReaction`) to Telegram using the modern **grammY** framework and **Bun.js** runtime.

All bot settings, role hierarchies, database connections, and feature toggles live inside a single centralized `config.js` file rather than scattered `.env` files, making deployment on cloud platforms (such as Render, Railway, Docker, or Linux VPS) effortless.

## Key Features

- **GoatBot V2 Modular Handler System**: Every command script uses rich metadata (`name`, `aliases`, `version`, `author`, `countDown`, `role`, `category`, `guide`) and lifecycle hooks (`onStart`, `onChat`, `onReply`, `onReaction`).
- **Native Bun.js & TypeScript Execution**: Runs TypeScript files directly at native speed with Bun.js while maintaining full backward compatibility with Node.js (`tsx`).
- **Centralized `config.js` Control**: Manage bot tokens, owner/admin UIDs, MongoDB URI, feature flags, keep-alive servers, and auto-updater endpoints in one place.
- **Hot-Reloading Command Manager (`/cmd`)**: Load, unload, reload all, or install new `.ts`/`.js` command scripts on the fly from GitHub, Pastebin, or raw code blocks with reaction-based overwrite confirmation—zero restarts required.
- **Built-In Auto-Updater (`/update`)**: Periodically checks the official repository's `update.json` manifest, notifies administrators of new releases with changelogs, and applies updates via `/update apply`.
- **Reaction-Based Message Unsend (`/unsend`)**: Delete bot responses by replying with `/unsend` or simply reacting with a thumbs-up (`👍`) emoji to any bot message (with per-group on/off toggles).
- **Container-Accurate Cyberpunk Telemetry (`/uptime2`)**: Generates a high-resolution Skia/Canvas telemetry dashboard reading isolated Linux cgroup memory and CPU quotas (accurately profiling 512 MB Render containers and process CPU load).
- **Inline YouTube Audio & Video Player (`/play`)**: Searches YouTube, transcodes M4A audio into genuine 192kbps stereo MP3 (`ID3` container via FFmpeg) for native playback inside Telegram's built-in music player, and streams MP4 video up to 1080p.
- **Hybrid Database Engine (`db.ts`)**: Connects to MongoDB Atlas for production persistence and automatically falls back to a local JSON database (`local_database.json`) if no MongoDB URI is provided.
- **Conversational AI with Memory (`/ai`)**: Multi-turn Google Gemini AI assistant supporting slash commands, passive trigger words (`queen`, `ai`), and continuous reply-chain conversations.

## Project Structure

```text
TGQueenBot-V2/
├── assets/                  # Static fonts, fallback avatars, and branding images
├── commands/                # Modular GoatBot V2 style TypeScript command scripts
│   ├── 8ball.ts             # Magic 8-Ball fortune teller
│   ├── admin.ts             # Owner & administrator management (/admin)
│   ├── ai.ts                # Conversational Gemini AI with memory & onReply
│   ├── balance.ts           # User wallet balance checker
│   ├── cmd.ts               # Dynamic runtime command loader & installer
│   ├── confess.ts           # Compatibility ship & confession card generator
│   ├── couple.ts            # Group couple matchmaker & anime hug GIFs
│   ├── crypto.ts            # Live CoinGecko cryptocurrency market tracker
│   ├── daily.ts             # 24-hour daily coin reward system
│   ├── duck.ts              # Keyless DuckDuckGo organic web search
│   ├── gamble.ts            # Multiplier coin wagering game
│   ├── getid.ts             # Telegram User, Chat, and Message ID inspector
│   ├── help.ts              # Categorized command directory & usage inspector
│   ├── kick.ts              # Group moderation member kick
│   ├── mute.ts              # Duration-based group member restriction
│   ├── play.ts              # YouTube audio (MP3 converter) & video streamer
│   ├── rank.ts              # Leveling system & Canvafy rank card generator
│   ├── restart.ts           # Process reboot controller
│   ├── rich.ts              # Group & global wealth leaderboard
│   ├── rob.ts               # Risk-reward coin heist system
│   ├── start.ts             # Interactive welcome dashboard
│   ├── transfer.ts          # Peer-to-peer coin transfers
│   ├── translate.ts         # Multi-language text translator
│   ├── unsend.ts            # Command & thumbs-up (👍) reaction message deleter
│   ├── update.ts            # In-bot remote version checker & auto-updater
│   ├── uptime.ts            # Text-based system & runtime status report
│   ├── uptime2.ts           # Cyberpunk canvas container telemetry dashboard
│   ├── warn.ts              # 3-strike group warning & auto-kick system
│   ├── weather.ts           # Live meteorological forecast command
│   ├── wiki.ts              # Official Wikipedia REST summary & article search
│   └── work.ts              # Profession-based coin earning command
├── events/                  # Group lifecycle event handlers
│   ├── welcome.ts           # New member greeting card generator (Canvafy)
│   └── goodbye.ts           # Member departure card generator (Canvafy)
├── temp/                    # Ephemeral media transcoding directory
├── bot.ts                   # Core grammY engine & GoatBot V2 handler dispatcher
├── config.js                # Centralized bot settings, roles, and feature toggles
├── db.ts                    # MongoDB & local JSON fallback database layer
├── updater.ts               # Remote update.json checker & git pull executor
├── update.json              # Version manifest & release changelog
├── package.json             # Dependencies & Bun/Node execution scripts
└── tsconfig.json            # TypeScript compiler configuration
```

## Prerequisites

- **[Bun.js](https://bun.sh/)** `v1.0.0+` (Recommended for fastest TypeScript execution) or **[Node.js](https://nodejs.org/)** `v18.0.0+`
- **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)
- **MongoDB URI** (Optional — automatically uses local JSON storage if omitted)
- **FFmpeg** (Optional — `play.ts` automatically falls back to `ffmpeg-static` if system FFmpeg is absent)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ItzPihu/TGQueenBot-V2.git
cd TGQueenBot-V2
```

### 2. Install Dependencies

Using **Bun** (Recommended):

```bash
bun install
```

Using **npm**:

```bash
npm install
```

### 3. Configure `config.js`

Open `config.js` and update your bot token, owner Telegram ID, and database settings:

```javascript
export const config = {
  bot: {
    name: "TGQueenBot-V2",
    author: "Priyanshi Kaur",
    version: "2.0.0",
    prefix: "/",
    token: "YOUR_TELEGRAM_BOT_TOKEN"
  },
  roles: {
    owners: [8789877223],
    admins: [8789877223]
  },
  database: {
    type: "mongodb",
    uri: "YOUR_MONGODB_URI_OR_LEAVE_EMPTY_FOR_LOCAL_JSON",
    dbName: "Queen"
  },
  server: {
    port: 3000,
    keepAlive: true,
    pingInterval: 840000,
    externalUrl: ""
  },
  updater: {
    enabled: true,
    updateUrl: "https://raw.githubusercontent.com/ItzPihu/TGQueenBot-V2/main/update.json",
    checkInterval: 3600000,
    autoNotifyAdmins: true
  },
  features: {
    rankUpNotification: true,
    welcomeMessage: true,
    goodbyeMessage: true,
    weeklyReport: {
      enabled: true,
      cronSchedule: "0 0 * * 0"
    },
    cooldowns: true,
    whitelist: {
      enabled: false,
      allowedUsers: []
    }
  }
};

export default config;
```

### 4. Start the Bot

Run with **Bun.js**:

```bash
bun start
```

Run with **Node.js**:

```bash
npm run start:node
```

## Role Permission Hierarchy

TGQueenBot-V2 enforces a 3-tier role permission system modeled after GoatBot V2:

| Role Level | Access Tier | Description |
| :--- | :--- | :--- |
| **`0`** | **Public / All Users** | Standard commands accessible to every member in private and group chats. |
| **`1`** | **Group Administrators** | Moderation commands (`/kick`, `/mute`, `/warn`) restricted to group admins/creators and bot admins. |
| **`2`** | **Bot Owners & Admins** | System-level commands (`/cmd`, `/admin`, `/update`, `/restart`) restricted to UIDs listed in `config.roles`. |

## Command Script Architecture (GoatBot V2 Standard)

Every command inside `commands/` follows a clean, self-contained TypeScript structure with standardized metadata:

```typescript
export const config_data = {
  name: "example",
  aliases: ["ex", "demo"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 0,
  shortDescription: {
    en: "Short summary of what the command does"
  },
  longDescription: {
    en: "Detailed explanation of the command functionality"
  },
  category: "Utility",
  guide: {
    en: "/example <arguments>"
  }
};

export async function onStart({ bot, ctx, args, db, message }: any): Promise<void> {
  await ctx.reply("Hello from TGQueenBot-V2!");
}

export async function onChat({ bot, ctx, db, message }: any): Promise<void> {
}

export async function onReply({ bot, ctx, Reply, args, db }: any): Promise<void> {
}

export async function onReaction({ bot, ctx, db }: any): Promise<void> {
}

export default {
  config: config_data,
  onStart,
  onChat,
  onReply,
  onReaction
};
```

## Built-In System Managers

### Dynamic Module Manager (`/cmd`)
Manage commands in real time without restarting the bot:
- `/cmd load <filename>` — Hot-loads or reloads a single command script.
- `/cmd loadall` — Reloads all command scripts in the `commands/` folder.
- `/cmd unload <command_name>` — Unloads an active command from memory.
- `/cmd install <url> <filename.ts>` — Fetches raw code from GitHub or Pastebin, prompts for reaction confirmation (`👍`) if overwriting an existing file, and hot-loads it immediately.
- `/cmd install <filename.ts> <code>` — Installs a command directly from a pasted code snippet.

### Automated Repository Updater (`/update`)
Keep your deployment synchronized with the upstream repository:
- `/update check` — Compares local version against the remote `update.json` manifest and displays the `whatsNew` changelog.
- `/update apply` — Automatically runs `git pull`, installs any new dependencies via `bun install` / `npm install`, and restarts the bot process.

### Reaction Delete (`/unsend`)
Clean up bot messages effortlessly:
- Reply to any message sent by the bot with `/unsend` or `/del`.
- React with `👍` (thumbs-up) to any bot message to delete it automatically.
- Toggle reaction deletion per chat using `/unsend react on`, `/unsend react off`, or `/unsend react status`.

## Deployment on Render

1. Fork or push this repository to your GitHub account.
2. Create a new **Web Service** on [Render](https://render.com/) and connect your repository.
3. Set the **Build Command** to `bun install` (or `npm install`).
4. Set the **Start Command** to `bun run bot.ts` (or `npm start`).
5. Populate your `config.js` settings (the built-in HTTP server on `config.server.port` automatically keeps the web service alive and responds to health checks).

## Credits & Acknowledgements

- **Author & Lead Developer**: [Priyanshi Kaur](https://github.com/ItzPihu)
- **Framework**: [grammY Telegram Bot Framework](https://grammy.dev/)
- **Architectural Inspiration**: GoatBot V2 by NTKhang

## License

Released under the **MIT License**. See the `LICENSE` file for full details.
