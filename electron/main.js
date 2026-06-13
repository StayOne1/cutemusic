const { app, BrowserWindow, ipcMain, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { createTray } = require('./tray');
const { store } = require('./store');
const { registerShortcuts, unregisterShortcuts } = require('./shortcut');
const { PlayerEngine } = require('./player-engine');
const { MusicScanner } = require('./music-scanner');
const { PlaylistManager } = require('./playlist-manager');

let petWindow = null;
let panelWindow = null;
let audioWindow = null;
let audioReady = false;
let tray = null;
let updateTrayMenu = null;
let player = null;
let scanner = null;
let playlistManager = null;

const isDev = process.argv.includes('--dev');
const petImagesDir = path.join(__dirname, '..', 'data', 'pet-images');

function createAudioWindow() {
  if (audioWindow && !audioWindow.isDestroyed()) return;

  audioReady = false;
  audioWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  audioWindow.loadFile(path.join(__dirname, '..', 'renderer', 'audio', 'index.html'));
  audioWindow.webContents.on('did-finish-load', () => {
    audioReady = true;
  });
  audioWindow.on('closed', () => {
    audioWindow = null;
    audioReady = false;
  });
}

function sendToAudio(channel, data) {
  if (audioWindow && !audioWindow.isDestroyed() && audioReady) {
    audioWindow.webContents.send(channel, data);
  } else {
    createAudioWindow();
    const trySend = () => {
      if (audioReady) {
        audioWindow.webContents.send(channel, data);
      } else {
        setTimeout(trySend, 50);
      }
    };
    setTimeout(trySend, 100);
  }
}

function createPetWindow() {
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const { x: workX, y: workY } = display.workArea;
  const petSize = store.get('petSize', 200);

  let posX, posY;

  if (petWindow && !petWindow.isDestroyed()) {
    const [wx, wy] = petWindow.getPosition();
    posX = wx;
    posY = wy;
    petWindow.destroy();
  } else {
    const savedX = store.get('petX', null);
    const savedY = store.get('petY', null);
    posX = savedX !== null ? savedX : workX + screenWidth - petSize - 50;
    posY = savedY !== null ? savedY : workY + screenHeight - petSize - 50;
  }

  petWindow = new BrowserWindow({
    width: petSize, height: petSize,
    x: posX, y: posY,
    frame: false, transparent: true, alwaysOnTop: true,
    resizable: false, skipTaskbar: true, hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  petWindow.loadFile(path.join(__dirname, '..', 'renderer', 'pet', 'index.html'));
  petWindow.webContents.on('did-finish-load', () => {
    const petImage = store.get('petImage', 'rem.jpg');
    const imgPath = path.join(petImagesDir, petImage).replace(/\\/g, '/');
    petWindow.webContents.send('pet:image-load', `file:///${imgPath}`);
  });
  petWindow.once('ready-to-show', () => petWindow.showInactive());
  if (isDev) petWindow.webContents.openDevTools({ mode: 'detach' });
  petWindow.on('close', () => {
    if (petWindow && !petWindow.isDestroyed()) {
      const [fx, fy] = petWindow.getPosition();
      store.set('petX', fx);
      store.set('petY', fy);
    }
  });
  petWindow.on('closed', () => { petWindow = null; });
}

function createPanelWindow() {
  if (panelWindow && !panelWindow.isDestroyed()) { panelWindow.focus(); return; }
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const { x: workX, y: workY } = display.workArea;
  panelWindow = new BrowserWindow({
    width: 500, height: 600,
    x: workX + Math.floor((screenWidth - 500) / 2),
    y: workY + Math.floor((screenHeight - 600) / 2),
    frame: false, transparent: false, resizable: false, show: false,
    backgroundColor: '#1E1B4B',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
    },
  });
  panelWindow.loadFile(path.join(__dirname, '..', 'renderer', 'panel', 'index.html'));
  panelWindow.once('ready-to-show', () => panelWindow.show());
  panelWindow.on('closed', () => { panelWindow = null; });
  if (isDev) panelWindow.webContents.openDevTools({ mode: 'detach' });
}

function sendToPet(channel, data) {
  if (petWindow && !petWindow.isDestroyed()) petWindow.webContents.send(channel, data);
}
function sendToPanel(channel, data) {
  if (panelWindow && !panelWindow.isDestroyed()) panelWindow.webContents.send(channel, data);
}
function broadcast(channel, data) {
  sendToPet(channel, data);
  sendToPanel(channel, data);
}

function setupIPC() {
  let petPosSaveTimer = null;
  ipcMain.on('pet:drag', (event, { x, y }) => {
    if (petWindow) {
      const petSize = store.get('petSize', 200);
      const [wx, wy] = petWindow.getPosition();
      petWindow.setBounds({
        x: wx + x,
        y: wy + y,
        width: petSize,
        height: petSize,
      });
      if (petPosSaveTimer) clearTimeout(petPosSaveTimer);
      petPosSaveTimer = setTimeout(() => {
        const [fx, fy] = petWindow.getPosition();
        store.set('petX', fx);
        store.set('petY', fy);
      }, 5000);
    }
  });

  ipcMain.on('pet:click', () => {
    if (player && player.currentTrack) {
      sendToPet('track-info', {
        title: player.currentTrack.title || path.basename(player.currentTrack.path),
        artist: player.currentTrack.artist || 'Unknown',
      });
    }
  });

  ipcMain.on('pet:hide', () => {
    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.hide();
      if (updateTrayMenu) updateTrayMenu(true);
    }
  });

  ipcMain.on('pet:quit', () => app.quit());

  ipcMain.on('pet:resize', (event, delta) => {
    let size = store.get('petSize', 200);
    size = Math.max(60, Math.min(600, size + delta));
    store.set('petSize', size);
    if (petWindow && !petWindow.isDestroyed()) {
      const [wx, wy] = petWindow.getPosition();
      petWindow.setBounds({ x: wx, y: wy, width: size, height: size });
    }
    broadcast('pet:size-changed', size);
  });

  ipcMain.on('pet:show-menu', () => {
    const isPlaying = player && player.isPlaying;
    const hasTracks = player && player.tracks && player.tracks.length > 0;
    const contextMenu = Menu.buildFromTemplate([
      { label: '🎵 打开界面', click: () => createPanelWindow() },
      { type: 'separator' },
      {
        label: isPlaying ? '⏸ 暂停' : '▶ 播放',
        enabled: hasTracks,
        click: () => {
          if (player) {
            if (player.isPlaying) {
              player.pause();
              sendToAudio('audio:pause');
            } else {
              if (!player.currentTrack && player.tracks.length > 0) {
                player.currentIndex = 0;
                player.currentTrack = player.tracks[0];
                player.currentTime = 0;
                player.duration = player.currentTrack.duration || 0;
              }
              player.isPlaying = true;
              player.onPlayState(player.getState());
              if (player.currentTrack) sendToAudio('audio:play', player.currentTrack.path);
            }
          }
        },
      },
      {
        label: '⏮ 上一曲',
        enabled: hasTracks,
        click: () => {
          if (player) {
            player.prev();
            if (player.currentTrack) sendToAudio('audio:play', player.currentTrack.path);
          }
        },
      },
      {
        label: '⏭ 下一曲',
        enabled: hasTracks,
        click: () => {
          if (player) {
            player.next();
            if (player.currentTrack) sendToAudio('audio:play', player.currentTrack.path);
          }
        },
      },
      { type: 'separator' },
      {
        label: '👁 隐藏桌宠',
        click: () => {
          if (petWindow && !petWindow.isDestroyed()) {
            petWindow.hide();
            if (updateTrayMenu) updateTrayMenu(true);
          }
        },
      },
      { type: 'separator' },
      { label: '❌ 退出', click: () => app.quit() },
    ]);
    contextMenu.popup();
  });

  ipcMain.on('audio:play', (event, filePath) => {
    sendToAudio('audio:play', filePath);
    if (player) {
      const idx = player.tracks.findIndex(t => t.path === filePath);
      if (idx !== -1) {
        player.currentIndex = idx;
        player.currentTrack = player.tracks[idx];
      } else {
        player.currentTrack = { path: filePath, title: path.basename(filePath), artist: 'Unknown' };
        player.currentIndex = -1;
      }
      player.currentTime = 0;
      player.duration = player.currentTrack.duration || 0;
      player.isPlaying = true;
      broadcast('player:track-changed', player.getTrackInfo());
      broadcast('player:state-changed', player.getState());
    }
  });

  ipcMain.on('audio:pause', () => {
    sendToAudio('audio:pause');
    if (player) player.pause();
  });

  ipcMain.on('audio:resume', () => {
    sendToAudio('audio:resume');
    if (player) {
      player.isPlaying = true;
      broadcast('player:state-changed', player.getState());
    }
  });

  ipcMain.on('audio:set-volume', (event, vol) => {
    sendToAudio('audio:set-volume', vol);
  });

  ipcMain.on('audio:seek', (event, time) => {
    sendToAudio('audio:seek', time);
  });

  let timeUpdateCount = 0;
  ipcMain.on('audio:time-update', (event, data) => {
    if (player) {
      player.currentTime = data.currentTime;
      player.duration = data.duration;
      timeUpdateCount++;
      if (timeUpdateCount % 3 === 0) {
        broadcast('player:state-changed', player.getState());
      }
    }
  });

  ipcMain.on('audio:track-ended', () => {
    if (player) {
      player.next();
      if (player.currentTrack) sendToAudio('audio:play', player.currentTrack.path);
    }
  });

  ipcMain.on('panel:open', () => createPanelWindow());
  ipcMain.on('panel:close', () => { if (panelWindow) panelWindow.close(); });
  ipcMain.on('panel:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });
  ipcMain.on('panel:drag', (event, { x, y }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) { const [wx, wy] = win.getPosition(); win.setPosition(wx + x, wy + y); }
  });
  ipcMain.on('panel:set-pet-size', (event, size) => { store.set('petSize', size); createPetWindow(); });
  ipcMain.on('shortcuts:update', (event, shortcuts) => { store.set('shortcuts', shortcuts); registerShortcuts(player); });

  ipcMain.handle('player:play', (event, trackId) => { if (player) player.play(trackId); });
  ipcMain.handle('player:pause', () => { if (player) player.pause(); });
  ipcMain.handle('player:toggle', () => { if (player) player.toggle(); });
  ipcMain.handle('player:next', () => { if (player) player.next(); });
  ipcMain.handle('player:prev', () => { if (player) player.prev(); });
  ipcMain.handle('player:seek', (event, time) => { if (player) player.seek(time); });
  ipcMain.handle('player:set-volume', (event, volume) => { if (player) player.setVolume(volume); store.set('volume', volume); });
  ipcMain.handle('player:toggle-mute', () => { if (player) player.toggleMute(); });
  ipcMain.handle('player:set-mode', (event, mode) => { if (player) player.setPlayMode(mode); store.set('playMode', mode); });
  ipcMain.handle('player:get-state', () => player ? player.getState() : null);
  ipcMain.handle('player:get-track', () => player ? player.getTrackInfo() : null);

  ipcMain.handle('scan:add-directory', async (event, dirPath) => {
    const dirs = store.get('musicDirs', []);
    if (!dirs.includes(dirPath)) { dirs.push(dirPath); store.set('musicDirs', dirs); }
    if (scanner) {
      const allDirs = store.get('musicDirs', []);
      const tracks = await scanner.scanAll(allDirs);
      player.setTracks(tracks);
      broadcast('library:update', { tracks, dirs: allDirs });
      return tracks;
    }
    return [];
  });
  ipcMain.handle('scan:remove-directory', (event, dirPath) => {
    const dirs = store.get('musicDirs', []).filter(d => d !== dirPath);
    store.set('musicDirs', dirs);
    broadcast('library:update', { dirs });
  });
  ipcMain.handle('scan:get-dirs', () => store.get('musicDirs', []));
  ipcMain.handle('scan:rescan', async () => {
    if (scanner) {
      const dirs = store.get('musicDirs', []);
      const tracks = await scanner.scanAll(dirs);
      player.setTracks(tracks);
      broadcast('library:update', { tracks, dirs });
      return tracks;
    }
    return [];
  });

  ipcMain.handle('playlist:get-all', () => playlistManager ? playlistManager.getAll() : []);
  ipcMain.handle('playlist:get', (event, id) => playlistManager ? playlistManager.get(id) : null);
  ipcMain.handle('playlist:create', (event, name) => playlistManager ? playlistManager.create(name) : null);
  ipcMain.handle('playlist:update', (event, playlist) => { if (playlistManager) playlistManager.update(playlist); });
  ipcMain.handle('playlist:delete', (event, id) => { if (playlistManager) playlistManager.delete(id); });
  ipcMain.handle('playlist:set-tracks', (event, id, tracks) => { if (playlistManager) playlistManager.setTracks(id, tracks); });

  ipcMain.handle('config:get', (event, key) => store.get(key));
  ipcMain.handle('config:set', (event, key, value) => store.set(key, value));

  ipcMain.handle('pet:get-images', () => {
    return fs.readdirSync(petImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  });

  ipcMain.handle('pet:import-image', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const srcPath = result.filePaths[0];
    const fileName = path.basename(srcPath);
    const destPath = path.join(petImagesDir, fileName);
    fs.copyFileSync(srcPath, destPath);
    return fileName;
  });

  ipcMain.handle('pet:set-image', (event, fileName) => {
    store.set('petImage', fileName);
    broadcast('pet:image-changed', fileName);
  });

  ipcMain.handle('dialog:open-directory', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('dialog:open-files', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'wma'] }],
    });
    return result.canceled ? [] : result.filePaths;
  });
}

app.whenReady().then(() => {
  scanner = new MusicScanner();
  playlistManager = new PlaylistManager();
  player = new PlayerEngine({
    onTrackChange: (track) => broadcast('player:track-changed', track),
    onPlayState: (state) => broadcast('player:state-changed', state),
    onVolumeChange: (vol) => broadcast('player:volume-changed', vol),
  });

  const savedVolume = store.get('volume', 10);
  player.setVolume(savedVolume);

  createAudioWindow();
  createPetWindow();
  const trayResult = createTray({ createPanelWindow, player, petWindow: () => petWindow, broadcastFn: broadcast, audioSender: sendToAudio });
  tray = trayResult.tray;
  updateTrayMenu = trayResult.updateTrayMenu;
  registerShortcuts(player);
  setupIPC();

  const dirs = store.get('musicDirs', []);
  if (dirs.length > 0) {
    scanner.scanAll(dirs).then(tracks => {
      player.setTracks(tracks);
      broadcast('library:update', { tracks, dirs });
    });
  }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createPetWindow(); });
app.on('will-quit', () => { unregisterShortcuts(); if (tray) tray.destroy(); });
