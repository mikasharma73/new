# cmdc

Interactive terminal interface built with **React**, **Ink**, and **Commander.js**.

## Features

- ⚡ **Commander CLI Engine**: Supports subcommands (`run`, `setup`, `config`), options (`-d, --daemon`, `-s, --setup`, `-v, --version`), and custom arguments.
- 🎨 **Rich Ink React Terminal UI**: Full ANSI color styling, custom ASCII banners, animated loaders/spinners, and status headers.
- ⌨️ **Interactive Chat & Navigation**:
  - Slash command dropdown (`/model`, `/keys`, `/config`, `/help`, `/clear`, `/quit`)
  - Command history navigation (`↑` / `↓`)
  - Tab autocomplete & suggestions
- 🔐 **Credentials & Provider Overlays**: Model picker and API key management modal overlays directly in the terminal.
- 🚀 **Decoupled Runner Architecture**: Executes shell commands and agent tasks with streamed terminal feedback without requiring external Python/browser dependencies.

## Installation & Setup

```bash
# Install dependencies
bun install
# or
npm install
```

## Usage

```bash
# Start interactive daemon/chat mode
bun run start
# or
bun src/cli.tsx

# Run a single task / command in one-shot mode
bun src/cli.tsx "echo 'Hello World'"
bun src/cli.tsx run "Analyze project structure"

# Display config
bun src/cli.tsx config

# Launch provider setup & API key onboarding
bun src/cli.tsx setup

# CLI help
bun src/cli.tsx --help
```
