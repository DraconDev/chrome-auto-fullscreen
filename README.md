# Chrome Extension with WXT, Bun, React, TypeScript & Tailwind CSS

A modern Chrome extension template built with:

- **Bun** - Fast JavaScript runtime and package manager
- **WXT** - WebExtension Toolkit for building browser extensions
- **React** - Component-based UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework

## Features

- Modern development stack
- Type-safe codebase
- Utility-first styling
- Chrome storage integration
- Popup UI with React components
- Background and content scripts

## Installation

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

3. Start development server:

```bash
bun run dev
```

## Development Setup

1. Install Tailwind CSS:

```bash
bun add -D tailwindcss postcss autoprefixer
```

2. Initialize Tailwind:

```bash
bunx tailwindcss init -p
```

3. Configure Tailwind in `tailwind.config.js`:

```js
content: [
  "./entrypoints/**/*.{js,ts,jsx,tsx}",
  "./components/**/*.{js,ts,jsx,tsx}",
],
```

## Usage

- **Popup UI**: Located in `entrypoints/popup/`
- **Background Script**: `entrypoints/background.ts`
- **Content Script**: `entrypoints/content.ts`
- **Storage**: Uses `chrome.storage.sync` for persistent data

## Development Best Practices

- Use TypeScript types for all variables and functions
- Follow Tailwind CSS utility-first approach
- Implement proper error handling with `try...catch`
- Use appropriate logging levels:
  - `console.log()` for info
  - `console.warn()` for warnings
  - `console.error()` for errors
- Optimize background script performance
- Follow accessibility guidelines (WCAG)

## Contributing

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

MIT License
