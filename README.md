# Auto Fullscreen

A premium Chrome extension that maximizes your screen real estate with a fast, intuitive long-press gesture. Intelligently respects your workflow while giving you total control over your immersion.

## Features

- **Turbo Long Press**: Hold left-click <span className="text-white">**in place**</span> for **0.2s** (default) to toggle fullscreen. Custom timing from 0.1s to 1s.
- **Visual Charge Ring**: A subtle ring charges at your cursor for instant feedback. Customizable colors.
- **Safety Heuristics**: Intelligently ignores text selection. Optional "Block on buttons/links" check for absolute control.
- **Top Edge Exit**: Move cursor to the very top edge to seamlessly exit fullscreen mode.
- **Premium Design**: Modern, glassmorphic UI for effortless configuration.
- **Developer Ready**: Built with WXT, Bun, React, and TypeScript.

## Installation

### From Source

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

3. Build the extension:

```bash
bun run build
```

4. Load the unpacked extension from `.output/chrome-mv3` in Chrome (`chrome://extensions` -> Load Unpacked).

## Development

```bash
# Start dev server
bun run dev

# Build for production
bun run build
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
