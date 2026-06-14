const { globalShortcut } = require('electron');
const { store } = require('./store');

let registeredShortcuts = [];

function registerShortcuts(player, audioSender) {
  unregisterShortcuts();

  const shortcuts = store.get('shortcuts', {});

  const actions = {
    playPause: () => {
      if (!player) return;
      if (player.isPlaying) {
        if (audioSender) audioSender('audio:pause');
        player.pause();
      } else {
        player.play();
        if (player.currentTrack && audioSender) {
          audioSender('audio:play', player.currentTrack.path);
        }
      }
    },
    next: () => {
      if (!player) return;
      player.next();
      if (player.currentTrack && audioSender) audioSender('audio:play', player.currentTrack.path);
    },
    prev: () => {
      if (!player) return;
      player.prev();
      if (player.currentTrack && audioSender) audioSender('audio:play', player.currentTrack.path);
    },
    volumeUp: () => {
      if (player) {
        const vol = Math.min(100, player.volume + 5);
        player.setVolume(vol);
        store.set('volume', vol);
      }
    },
    volumeDown: () => {
      if (player) {
        const vol = Math.max(0, player.volume - 5);
        player.setVolume(vol);
        store.set('volume', vol);
      }
    },
    mute: () => player && player.toggleMute(),
  };

  for (const [key, accelerator] of Object.entries(shortcuts)) {
    if (accelerator && actions[key]) {
      try {
        const ret = globalShortcut.register(accelerator, actions[key]);
        if (ret) {
          registeredShortcuts.push(accelerator);
        }
      } catch (err) {
        console.error(`Failed to register shortcut ${accelerator}:`, err);
      }
    }
  }
}

function unregisterShortcuts() {
  for (const accel of registeredShortcuts) {
    try {
      globalShortcut.unregister(accel);
    } catch {}
  }
  registeredShortcuts = [];
}

module.exports = { registerShortcuts, unregisterShortcuts };
