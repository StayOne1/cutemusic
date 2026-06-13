const Store = require('electron-store').default;
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(path.join(dataDir, 'playlists'))) {
  fs.mkdirSync(path.join(dataDir, 'playlists'), { recursive: true });
}

const store = new Store({
  cwd: dataDir,
  defaults: {
    musicDirs: [],
    volume: 10,
    isMuted: false,
    playMode: 'loop',
    shortcuts: {
      playPause: 'CommandOrControl+Alt+Space',
      next: 'CommandOrControl+Alt+Right',
      prev: 'CommandOrControl+Alt+Left',
      volumeUp: 'CommandOrControl+Alt+Up',
      volumeDown: 'CommandOrControl+Alt+Down',
      mute: 'CommandOrControl+Alt+M',
    },
    autoStart: false,
    petSize: 200,
    petImage: 'rem.jpg',
    themeHue: 250,
    lastPlaylist: null,
  },
});

module.exports = { store };
