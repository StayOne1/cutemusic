const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;
let petHidden = false;

function createTrayIcon() {
  const size = 32;
  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx = x - size / 2;
      const cy = y - size / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);

      if (dist < size / 2 - 1) {
        buffer[idx] = 0xFF;
        buffer[idx + 1] = 0x9D;
        buffer[idx + 2] = 0xC5;
        buffer[idx + 3] = 0xFF;

        if (dist < 3) {
          buffer[idx] = 0xFF;
          buffer[idx + 1] = 0xFF;
          buffer[idx + 2] = 0xFF;
          buffer[idx + 3] = 0xFF;
        }
      } else if (dist < size / 2) {
        buffer[idx] = 0xFF;
        buffer[idx + 1] = 0xFF;
        buffer[idx + 2] = 0xFF;
        buffer[idx + 3] = 0x80;
      } else {
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

function createTray({ createPanelWindow, player, petWindow, broadcastFn, audioSender }) {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('CuteMusic - 蕾姆');

  function updateContextMenu() {
    const isPlaying = player && player.isPlaying;
    const hasTracks = player && player.tracks && player.tracks.length > 0;
    const template = [
      {
        label: isPlaying ? '⏸ 暂停' : '▶ 播放',
        enabled: hasTracks,
        click: () => {
          if (player) {
            if (player.isPlaying) {
              player.pause();
              if (audioSender) audioSender('audio:pause');
            } else {
              if (!player.currentTrack && player.tracks.length > 0) {
                player.currentIndex = 0;
                player.currentTrack = player.tracks[0];
                player.currentTime = 0;
                player.duration = player.currentTrack.duration || 0;
              }
              player.isPlaying = true;
              player.onPlayState(player.getState());
              if (player.currentTrack && audioSender) audioSender('audio:play', player.currentTrack.path);
            }
          }
        },
      },
      { type: 'separator' },
      {
        label: '⏭ 下一曲',
        enabled: hasTracks,
        click: () => {
          if (player) {
            player.next();
            if (player.currentTrack && audioSender) audioSender('audio:play', player.currentTrack.path);
          }
        },
      },
      {
        label: '⏮ 上一曲',
        enabled: hasTracks,
        click: () => {
          if (player) {
            player.prev();
            if (player.currentTrack && audioSender) audioSender('audio:play', player.currentTrack.path);
          }
        },
      },
      { type: 'separator' },
      {
        label: '🎵 打开面板',
        click: createPanelWindow,
      },
    ];

    if (petHidden) {
      template.push({
        label: '👀 显示蕾姆',
        click: () => {
          const pw = typeof petWindow === 'function' ? petWindow() : petWindow;
          if (pw && !pw.isDestroyed()) {
            pw.show();
            pw.focus();
            petHidden = false;
            updateContextMenu();
          }
        },
      });
    }

    template.push({ type: 'separator' });
    template.push({
      label: '❌ 退出',
      click: () => {
        require('electron').app.quit();
      },
    });

    tray.setContextMenu(Menu.buildFromTemplate(template));
  }

  function setPetHidden(hidden) {
    petHidden = hidden;
    updateContextMenu();
  }

  updateContextMenu();

  tray.on('click', () => {
    createPanelWindow();
  });

  if (player) {
    const originalToggle = player.toggle.bind(player);
    player.toggle = function () {
      originalToggle();
      updateContextMenu();
    };
  }

  return { tray, updateTrayMenu: setPetHidden };
}

module.exports = { createTray };
