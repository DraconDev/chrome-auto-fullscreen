# SubHub - Subscription Tracker

A Chrome extension for tracking and managing subscriptions, built with modern web technologies.

## Tech Stack

- **Runtime:** Bun
- **Extension Framework:** WXT
- **Frontend:** React
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Data Storage:** chrome.storage.sync

## Development

1. Install dependencies:
```bash
bun install
```

2. Start development server:
```bash
bun dev
```

3. Build for production:
```bash
bun build
```

## Project Structure

- `entrypoints/` - Extension entry points (popup, background, content scripts)
- `components/` - Reusable React components
- `assets/` - Static assets
- `public/` - Public files

## Guidelines

- Use TypeScript for type safety
- Follow React best practices
- Style with Tailwind CSS utility classes only
- Handle errors with try-catch blocks
- Follow accessibility guidelines (WCAG)
- Write unit tests for components and utilities
