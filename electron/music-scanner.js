const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
const { SUPPORTED_EXTENSIONS } = require('./player-engine');

class MusicScanner {
  constructor() {
    this.scanCache = new Map();
  }

  async scanDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return [];

    const tracks = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const subTracks = await this.scanDirectory(fullPath);
        tracks.push(...subTracks);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          try {
            const metadata = await mm.parseFile(fullPath, { duration: true });
            const track = {
              id: this.generateId(fullPath),
              path: fullPath,
              title: metadata.common.title || path.basename(entry.name, ext),
              artist: metadata.common.artist || 'Unknown Artist',
              album: metadata.common.album || 'Unknown Album',
              duration: metadata.format.duration || 0,
              year: metadata.common.year,
              genre: metadata.common.genre ? metadata.common.genre[0] : null,
              cover: metadata.common.picture
                ? this.extractCover(metadata.common.picture[0])
                : null,
              dir: dirPath,
            };
            tracks.push(track);
            this.scanCache.set(fullPath, track);
          } catch (err) {
            const track = {
              id: this.generateId(fullPath),
              path: fullPath,
              title: path.basename(entry.name, ext),
              artist: 'Unknown Artist',
              album: 'Unknown Album',
              duration: 0,
              dir: dirPath,
            };
            tracks.push(track);
          }
        }
      }
    }

    return tracks;
  }

  async scanAll(dirs) {
    const allTracks = [];
    for (const dir of dirs) {
      const tracks = await this.scanDirectory(dir);
      allTracks.push(...tracks);
    }
    return allTracks;
  }

  extractCover(picture) {
    if (!picture) return null;
    const base64 = picture.data.toString('base64');
    const mimeType = picture.format || 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  }

  generateId(filePath) {
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

module.exports = { MusicScanner };
