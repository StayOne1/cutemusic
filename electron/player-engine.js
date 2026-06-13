const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

const SUPPORTED_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma'];

class PlayerEngine {
  constructor({ onTrackChange, onPlayState, onVolumeChange }) {
    this.onTrackChange = onTrackChange || (() => {});
    this.onPlayState = onPlayState || (() => {});
    this.onVolumeChange = onVolumeChange || (() => {});

    this.tracks = [];
    this.currentIndex = -1;
    this.currentTrack = null;
    this.isPlaying = false;
    this.volume = 80;
    this.isMuted = false;
    this.playMode = 'loop';
    this.currentTime = 0;
    this.duration = 0;

    this._tickInterval = null;
  }

  get trackCount() {
    return this.tracks.length;
  }

  setTracks(tracks) {
    this.tracks = tracks;
  }

  _startTick() {
    this._stopTick();
    this._tickInterval = setInterval(() => {
      if (this.isPlaying && this.currentTrack) {
        const dur = this.duration || this.currentTrack.duration || 0;
        if (dur > 0 && this.currentTime >= dur && dur > 1) {
          this.next();
        }
      }
    }, 2000);
  }

  _stopTick() {
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
  }

  async play(trackId) {
    if (trackId !== undefined) {
      const idx = this.tracks.findIndex(t => t.id === trackId);
      if (idx !== -1) {
        this.currentIndex = idx;
        this.currentTrack = this.tracks[idx];
        this.currentTime = 0;
      }
    }

    if (!this.currentTrack && this.tracks.length > 0) {
      this.currentIndex = 0;
      this.currentTrack = this.tracks[0];
      this.currentTime = 0;
    }

    if (this.currentTrack) {
      this.duration = this.currentTrack.duration || 0;
      this.isPlaying = true;
      this._startTick();
      this.onTrackChange(this.getTrackInfo());
      this.onPlayState(this.getState());
    }
  }

  pause() {
    this.isPlaying = false;
    this._stopTick();
    this.onPlayState(this.getState());
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  next() {
    if (this.tracks.length === 0) return;

    if (this.playMode === 'random') {
      this.currentIndex = Math.floor(Math.random() * this.tracks.length);
    } else if (this.playMode === 'single') {
      this.currentTime = 0;
      this.isPlaying = true;
      this._startTick();
      this.onPlayState(this.getState());
      return;
    } else if (this.playMode === 'loop') {
      this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
    } else {
      if (this.currentIndex < this.tracks.length - 1) {
        this.currentIndex++;
      } else {
        this.pause();
        return;
      }
    }

    this.currentTrack = this.tracks[this.currentIndex];
    this.currentTime = 0;
    this.duration = this.currentTrack.duration || 0;
    this.isPlaying = true;
    this._startTick();
    this.onTrackChange(this.getTrackInfo());
    this.onPlayState(this.getState());
  }

  prev() {
    if (this.tracks.length === 0) return;

    if (this.currentTime > 3) {
      this.currentTime = 0;
      this.onPlayState(this.getState());
      return;
    }

    if (this.playMode === 'random') {
      this.currentIndex = Math.floor(Math.random() * this.tracks.length);
    } else {
      this.currentIndex = (this.currentIndex - 1 + this.tracks.length) % this.tracks.length;
    }

    this.currentTrack = this.tracks[this.currentIndex];
    this.currentTime = 0;
    this.duration = this.currentTrack.duration || 0;
    this.isPlaying = true;
    this._startTick();
    this.onTrackChange(this.getTrackInfo());
    this.onPlayState(this.getState());
  }

  seek(time) {
    this.currentTime = Math.max(0, Math.min(time, this.duration || 0));
    this.onPlayState(this.getState());
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, volume));
    this.onVolumeChange({ volume: this.volume, isMuted: this.isMuted });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.onVolumeChange({ volume: this.volume, isMuted: this.isMuted });
  }

  setPlayMode(mode) {
    this.playMode = mode;
    this.onPlayState(this.getState());
  }

  getTrackInfo() {
    if (!this.currentTrack) return null;
    return {
      id: this.currentTrack.id,
      title: this.currentTrack.title || path.basename(this.currentTrack.path),
      artist: this.currentTrack.artist || 'Unknown Artist',
      album: this.currentTrack.album || 'Unknown Album',
      duration: this.currentTrack.duration || 0,
      path: this.currentTrack.path,
      cover: this.currentTrack.cover || null,
    };
  }

  getState() {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration || (this.currentTrack ? this.currentTrack.duration : 0),
      volume: this.volume,
      isMuted: this.isMuted,
      playMode: this.playMode,
      currentIndex: this.currentIndex,
      trackCount: this.tracks.length,
    };
  }
}

module.exports = { PlayerEngine, SUPPORTED_EXTENSIONS };
