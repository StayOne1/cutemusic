const fs = require('fs');
const path = require('path');

const PLAYLISTS_DIR = path.join(__dirname, '..', 'data', 'playlists');

class PlaylistManager {
  constructor() {
    if (!fs.existsSync(PLAYLISTS_DIR)) {
      fs.mkdirSync(PLAYLISTS_DIR, { recursive: true });
    }
  }

  getAll() {
    const files = fs.readdirSync(PLAYLISTS_DIR).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const content = fs.readFileSync(path.join(PLAYLISTS_DIR, f), 'utf-8');
      return JSON.parse(content);
    });
  }

  get(id) {
    const filePath = path.join(PLAYLISTS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  }

  create(name) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const playlist = {
      id,
      name,
      tracks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.save(playlist);
    return playlist;
  }

  update(playlist) {
    playlist.updatedAt = Date.now();
    this.save(playlist);
  }

  setTracks(id, tracks) {
    const playlist = this.get(id);
    if (playlist) {
      playlist.tracks = tracks;
      playlist.updatedAt = Date.now();
      this.save(playlist);
    }
  }

  delete(id) {
    const filePath = path.join(PLAYLISTS_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  save(playlist) {
    const filePath = path.join(PLAYLISTS_DIR, `${playlist.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(playlist, null, 2), 'utf-8');
  }
}

module.exports = { PlaylistManager };
