const { globalShortcut } = require('electron');
const { store } = require('./store');

let registeredShortcuts = [];

function registerShortcuts(player) {
  unregisterShortcuts();

  const shortcuts = store.get('shortcuts', {});

  const actions = {
    playPause: () => player && player.toggle(),
    next: () => player && player.next(),
    prev: () => player && player.prev(),
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
