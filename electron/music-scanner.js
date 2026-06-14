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
            const coverPath = this.findCoverPath(fullPath, metadata);
            const track = {
              id: this.generateId(fullPath),
              path: fullPath,
              title: metadata.common.title || path.basename(entry.name, ext),
              artist: metadata.common.artist || 'Unknown Artist',
              album: metadata.common.album || 'Unknown Album',
              duration: metadata.format.duration || 0,
              year: metadata.common.year,
              genre: metadata.common.genre ? metadata.common.genre[0] : null,
              coverPath: coverPath,
              dir: dirPath,
            };
            tracks.push(track);
            this.scanCache.set(fullPath, track);
          } catch (err) {
            const coverPath = this.findCoverPath(fullPath, null);
            const track = {
              id: this.generateId(fullPath),
              path: fullPath,
              title: path.basename(entry.name, ext),
              artist: 'Unknown Artist',
              album: 'Unknown Album',
              duration: 0,
              dir: dirPath,
              coverPath: coverPath,
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

  findCoverPath(audioPath, metadata) {
    if (metadata && metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      if (picture && picture.data) {
        try {
          const buf = Buffer.from(picture.data);
          if (buf.length > 0) {
            const coverDir = path.join(path.dirname(audioPath), '.cutemusic-covers');
            if (!fs.existsSync(coverDir)) {
              fs.mkdirSync(coverDir, { recursive: true });
            }
            const ext = (picture.format || 'image/jpeg').includes('png') ? '.png' : '.jpg';
            const coverFile = path.join(coverDir, this.generateId(audioPath) + ext);
            fs.writeFileSync(coverFile, buf);
            return coverFile;
          }
        } catch (err) {
          // fall through to external file search
        }
      }
    }

    const parsed = path.parse(audioPath);
    const exts = ['.jpg', '.jpeg', '.png'];
    for (const ext of exts) {
      const coverPath = path.join(parsed.dir, parsed.name + ext);
      try {
        if (fs.existsSync(coverPath)) {
          return coverPath;
        }
      } catch (err) {
        // ignore
      }
    }
    return null;
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
