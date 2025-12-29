# Twitter Follower Count Extension

A Chrome extension built with Vite and React that displays follower counts next to usernames on Twitter/X without needing to hover.

## Features

- Intercepts Twitter GraphQL API requests to extract follower count data
- Displays follower counts next to usernames in a formatted way (e.g., "51.6K")
- Logs follower counts to the console with usernames
- Works dynamically as you scroll through your Twitter timeline

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

This will create a `dist` folder with the compiled extension.

### Development Mode

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## Installation

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist` folder

## How It Works

1. **Background Service Worker**: Intercepts network requests to Twitter's GraphQL API endpoint (`HomeLatestTimeline`)
2. **Content Script**: 
   - Intercepts `fetch` calls to extract follower data from API responses
   - Uses MutationObserver to detect new content as you scroll
   - Displays follower counts next to usernames on the page
   - Logs follower counts to the console

## Project Structure

```
src/
  ├── background/
  │   └── index.ts          # Service worker for intercepting requests
  ├── content/
  │   └── index.ts          # Content script for displaying follower counts
  ├── types/
  │   └── twitter-api.ts   # TypeScript types for Twitter API
  ├── manifest.json         # Chrome extension manifest
  └── popup.html            # Extension popup
```

## Notes

- The extension intercepts the `HomeLatestTimeline` GraphQL endpoint
- Follower counts are extracted from the `legacy.followers_count` field in the API response
- The extension uses both background service worker and content script fetch interception for maximum compatibility

