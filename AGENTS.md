# AGENTS.md

CuteMusic - Desktop Music Pet (Electron)

## Stack

- Electron + Node.js (CommonJS)
- electron-store for config persistence
- music-metadata for audio metadata
- electron-builder for Windows packaging

## Commands

- `npm start` - Run dev mode
- `npm run build` - Build Windows NSIS installer
- `npm run build:portable` - Build portable exe

## Project Structure

```
electron/          Main process (Node.js)
  main.js          Entry point, window management, IPC
  preload.js       Context bridge for renderer
  store.js         Config storage (electron-store, data/config.json)
  tray.js          System tray
  shortcut.js      Global hotkeys
  player-engine.js Audio playback engine (Web Audio API)
  music-scanner.js Directory scanner
  playlist-manager.js Playlist CRUD

renderer/          Browser windows
  pet/             Desktop pet (transparent, always-on-top, 200x200)
  panel/           Full-featured panel (500x600, play/playlist/settings)
```

## Architecture

- Two BrowserWindows: pet (transparent frameless) + panel (on demand)
- IPC via preload.js contextBridge - no nodeIntegration
- Config stored at `data/config.json` relative to app dir
- Playlists stored at `data/playlists/*.json`
- Supported audio: MP3, WAV, FLAC, OGG, AAC, M4A, WMA

## Defaults

- Volume: 80, Play mode: loop
- Global shortcuts: Ctrl+Alt+Space (play/pause), Ctrl+Alt+Left/Right (prev/next)
- Pet window: 200px, always on top, skip taskbar
