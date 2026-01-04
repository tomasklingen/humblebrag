# Humblebrag

Generate beautiful social media graphics from your fitness data.

## What It Does

Upload a FIT file from your cycling workout and get a shareable infographic with your ride stats, power curves, and performance metrics.

## Current Features

- Upload and parse FIT files from cycling activities
- Interactive data visualization (power metrics)
- Summary statistics display
- Export as high-quality image for social media

## Supported Activities

- Cycling (indoor/outdoor)
- Running (coming soon)

## Tech Stack

- React 19 + TypeScript
- Vite (with Rolldown)
- Recharts for visualization
- html-to-image for export
- fit-file-parser for FIT file parsing
- oxlint + oxfmt for fast linting & formatting

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Format code:

```bash
npm run format
```

## Usage

1. Click upload or drag-drop a .FIT file
2. View your workout stats and graphs
3. Click "Export Image" to download for social sharing

## Getting FIT Files

FIT files can be exported from:

- Garmin Connect
- Strava (export original file)
- Wahoo apps
- Zwift
- Most cycling computers and fitness trackers
