let allTracks = [];
let currentPlaylistId = null;
let playlists = [];
let currentTrackIndex = -1;

const btnMinimize = document.getElementById('btn-minimize');
const btnClose = document.getElementById('btn-close');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

const btnPlay = document.getElementById('btn-play');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnMute = document.getElementById('btn-mute');
const btnMode = document.getElementById('btn-mode');
const progressBar = document.getElementById('progress-bar');
const volumeBar = document.getElementById('volume-bar');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const coverArt = document.getElementById('cover-art');

const playlistList = document.getElementById('playlist-list');
const trackList = document.getElementById('track-list');
const searchInput = document.getElementById('search-input');
const btnNewPlaylist = document.getElementById('btn-new-playlist');

const currentPlaylistName = document.getElementById('current-playlist-name');

const musicDirs = document.getElementById('music-dirs');
const btnAddMusicDir = document.getElementById('btn-add-music-dir');
const petSizeSlider = document.getElementById('pet-size');
const petSizeLabel = document.getElementById('pet-size-label');
const titlebar = document.querySelector('.titlebar');

const playModes = ['loop', 'single', 'random', 'sequence'];
const modeLabels = { loop: '↻', single: '↺', random: '🎲', sequence: '→' };
const modeNames = { loop: '列表循环', single: '单曲循环', random: '随机播放', sequence: '顺序播放' };
let currentMode = 'loop';
let currentTrackPath = null;
let isPlaying = false;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

const modalOverlay = document.getElementById('modal-overlay');
const modalInput = document.getElementById('modal-input');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');
const btnSaveShortcuts = document.getElementById('btn-save-shortcuts');

titlebar.addEventListener('mousedown', (e) => {
  if (e.target.closest('.titlebar-btn')) return;
  isDragging = true;
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.screenX - dragStartX;
    const dy = e.screenY - dragStartY;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    window.electronAPI.panel.drag(dx, dy);
  }
});

document.addEventListener('mouseup', () => { isDragging = false; });

btnMinimize.addEventListener('click', () => window.electronAPI.panel.minimize());
btnClose.addEventListener('click', () => window.electronAPI.panel.close());

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

function getCurrentTracks() {
  if (currentPlaylistId) {
    const playlist = playlists.find(p => p.id === currentPlaylistId);
    if (playlist) return playlist.tracks;
  }
  return allTracks;
}

function playTrack(track, index) {
  currentTrackPath = track.path;
  currentTrackIndex = index !== undefined ? index : allTracks.findIndex(t => t.id === track.id);
  window.electronAPI.audio.play(track.path);
  isPlaying = true;
  btnPlay.textContent = '⏸';
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  coverArt.innerHTML = track.cover
    ? `<img src="${track.cover}" alt="封面">`
    : '<div class="cover-placeholder">♪</div>';
  document.querySelectorAll('.track-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === track.id);
  });
}

function playNext() {
  const tracks = getCurrentTracks();
  if (tracks.length === 0) return;
  let nextIndex;
  if (currentMode === 'random') {
    nextIndex = Math.floor(Math.random() * tracks.length);
  } else if (currentMode === 'single') {
    nextIndex = currentTrackIndex;
  } else {
    nextIndex = (currentTrackIndex + 1) % tracks.length;
  }
  if (nextIndex < tracks.length) playTrack(tracks[nextIndex], nextIndex);
}

function playPrev() {
  const tracks = getCurrentTracks();
  if (tracks.length === 0) return;
  let prevIndex;
  if (currentMode === 'random') {
    prevIndex = Math.floor(Math.random() * tracks.length);
  } else {
    prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  }
  playTrack(tracks[prevIndex], prevIndex);
}

btnPlay.addEventListener('click', () => {
  if (currentTrackPath) {
    if (isPlaying) {
      window.electronAPI.audio.pause();
      isPlaying = false;
      btnPlay.textContent = '▶';
    } else {
      window.electronAPI.audio.resume();
      isPlaying = true;
      btnPlay.textContent = '⏸';
    }
  } else {
    const tracks = getCurrentTracks();
    if (tracks.length > 0) playTrack(tracks[0], 0);
  }
});

btnPrev.addEventListener('click', () => playPrev());
btnNext.addEventListener('click', () => playNext());

btnMute.addEventListener('click', () => {
  if (volumeBar.value > 0) {
    volumeBar.dataset.prevVol = volumeBar.value;
    volumeBar.value = 0;
    window.electronAPI.audio.setVolume(0);
    btnMute.textContent = '🔇';
  } else {
    volumeBar.value = volumeBar.dataset.prevVol || 80;
    window.electronAPI.audio.setVolume(parseInt(volumeBar.value));
    btnMute.textContent = '🔊';
  }
});

btnMode.addEventListener('click', () => {
  const idx = playModes.indexOf(currentMode);
  currentMode = playModes[(idx + 1) % playModes.length];
  btnMode.textContent = modeLabels[currentMode];
  btnMode.title = modeNames[currentMode];
  window.electronAPI.player.setMode(currentMode);
});

progressBar.addEventListener('mousedown', () => { progressBar.dataset.dragging = 'true'; });
progressBar.addEventListener('input', (e) => { timeCurrent.textContent = formatTime(parseFloat(e.target.value)); });
progressBar.addEventListener('change', (e) => {
  const time = parseFloat(e.target.value);
  window.electronAPI.audio.seek(time);
  progressBar.dataset.dragging = '';
});

volumeBar.addEventListener('input', (e) => {
  const vol = parseInt(e.target.value);
  window.electronAPI.audio.setVolume(vol);
  btnMute.textContent = vol === 0 ? '🔇' : '🔊';
});

function showModal(title, placeholder, callback) {
  const modalTitle = modalOverlay.querySelector('.modal-title');
  modalTitle.textContent = title;
  modalInput.placeholder = placeholder;
  modalInput.value = '';
  modalOverlay.classList.remove('hidden');
  modalInput.focus();
  modalConfirm.onclick = async () => {
    const val = modalInput.value.trim();
    if (val) { await callback(val); hideModal(); }
  };
}

function hideModal() { modalOverlay.classList.add('hidden'); }

modalCancel.addEventListener('click', hideModal);
modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideModal();
  if (e.key === 'Enter' && modalConfirm.onclick) modalConfirm.onclick();
});

btnNewPlaylist.addEventListener('click', () => {
  showModal('新建歌单', '请输入歌单名称', async (name) => {
    await window.electronAPI.playlist.create(name);
    await loadPlaylists();
  });
});

btnSaveShortcuts.addEventListener('click', async () => {
  const shortcuts = {
    playPause: document.getElementById('shortcut-play').value,
    next: document.getElementById('shortcut-next').value,
    prev: document.getElementById('shortcut-prev').value,
    volumeUp: document.getElementById('shortcut-volup').value,
    volumeDown: document.getElementById('shortcut-voldown').value,
    mute: document.getElementById('shortcut-mute').value,
  };
  await window.electronAPI.panel.updateShortcuts(shortcuts);
  alert('快捷键已保存并生效！');
});

btnAddMusicDir.addEventListener('click', async () => {
  const dir = await window.electronAPI.dialog.openDirectory();
  if (dir) {
    await window.electronAPI.scan.addDirectory(dir);
    const tracks = await window.electronAPI.scan.rescan();
    allTracks = tracks;
    renderTrackList();
    loadMusicDirs();
  }
});

searchInput.addEventListener('input', () => renderTrackList());

petSizeSlider.addEventListener('input', (e) => {
  const size = parseInt(e.target.value);
  petSizeLabel.textContent = `${size}px`;
  window.electronAPI.config.set('petSize', size);
  window.electronAPI.panel.setPetSize(size);
});

const petImageSelect = document.getElementById('pet-image-select');
const btnImportImage = document.getElementById('btn-import-image');
const petImagePreview = document.getElementById('pet-image-preview');

async function loadPetImages() {
  const images = await window.electronAPI.petImage.getImages();
  const currentImage = await window.electronAPI.config.get('petImage');
  petImageSelect.innerHTML = '';
  images.forEach(img => {
    const opt = document.createElement('option');
    opt.value = img;
    opt.textContent = img;
    if (img === currentImage) opt.selected = true;
    petImageSelect.appendChild(opt);
  });
  updatePetImagePreview(currentImage);
}

function updatePetImagePreview(fileName) {
  petImagePreview.innerHTML = `<img src="../../data/pet-images/${fileName}" alt="桌宠预览">`;
}

petImageSelect.addEventListener('change', async () => {
  const fileName = petImageSelect.value;
  await window.electronAPI.petImage.setImage(fileName);
  updatePetImagePreview(fileName);
});

btnImportImage.addEventListener('click', async () => {
  const fileName = await window.electronAPI.petImage.importImage();
  if (fileName) {
    await loadPetImages();
    petImageSelect.value = fileName;
    await window.electronAPI.petImage.setImage(fileName);
    updatePetImagePreview(fileName);
  }
});

async function loadPlaylists() {
  playlists = await window.electronAPI.playlist.getAll();
  renderPlaylists();
}

function renderPlaylists() {
  playlistList.innerHTML = '';
  const allItem = document.createElement('div');
  allItem.className = `playlist-item ${!currentPlaylistId ? 'active' : ''}`;
  allItem.textContent = '所有歌曲';
  allItem.addEventListener('click', () => {
    currentPlaylistId = null;
    currentPlaylistName.textContent = '所有歌曲';
    renderPlaylists();
    renderTrackList();
  });
  playlistList.appendChild(allItem);

  playlists.forEach(pl => {
    const item = document.createElement('div');
    item.className = `playlist-item ${currentPlaylistId === pl.id ? 'active' : ''}`;
    item.innerHTML = `<span>${escapeHtml(pl.name)}</span><span class="playlist-count">${pl.tracks.length}</span>`;
    item.addEventListener('click', () => {
      currentPlaylistId = pl.id;
      currentPlaylistName.textContent = pl.name;
      renderPlaylists();
      renderTrackList();
    });
    playlistList.appendChild(item);
  });
}

async function renderTrackList() {
  const searchTerm = searchInput.value.toLowerCase();
  let tracks = getCurrentTracks();
  if (searchTerm) {
    tracks = tracks.filter(t =>
      t.title.toLowerCase().includes(searchTerm) ||
      t.artist.toLowerCase().includes(searchTerm)
    );
  }

  trackList.innerHTML = '';
  if (tracks.length === 0) {
    trackList.innerHTML = '<div style="text-align:center;padding:40px;color:#C4B5FD;">暂无歌曲</div>';
    return;
  }

  tracks.forEach((track, i) => {
    const item = document.createElement('div');
    item.className = 'track-item';
    item.dataset.id = track.id;
    item.dataset.path = track.path;
    item.innerHTML = `
      <div class="track-num">${i + 1}</div>
      <div class="track-details">
        <div class="track-name">${escapeHtml(track.title)}</div>
        <div class="track-sub">${escapeHtml(track.artist)}</div>
      </div>
      <div class="track-ops">
        <button class="track-add-btn" title="添加到歌单">+</button>
      </div>
      <div class="track-dur">${formatTime(track.duration)}</div>
    `;
    item.querySelector('.track-details').addEventListener('click', () => playTrack(track, i));
    item.querySelector('.track-add-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showAddToPlaylistMenu(track, e.target);
    });
    trackList.appendChild(item);
  });
}

function showAddToPlaylistMenu(track, btn) {
  const existing = document.querySelector('.add-to-playlist-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'add-to-playlist-menu';
  menu.style.cssText = `
    position: fixed; left: ${btn.getBoundingClientRect().left}px;
    top: ${btn.getBoundingClientRect().bottom + 4}px;
    background: #312E81; border: 1px solid #4C1D95; border-radius: 8px;
    padding: 4px; z-index: 999; max-height: 200px; overflow-y: auto;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  `;

  playlists.forEach(pl => {
    const opt = document.createElement('div');
    opt.style.cssText = 'padding: 8px 12px; cursor: pointer; border-radius: 4px; font-size: 12px; color: #F5F3FF; white-space: nowrap;';
    opt.textContent = pl.name;
    opt.addEventListener('mouseenter', () => { opt.style.background = 'rgba(124,58,237,0.3)'; });
    opt.addEventListener('mouseleave', () => { opt.style.background = 'none'; });
    opt.addEventListener('click', async () => {
      const playlist = await window.electronAPI.playlist.get(pl.id);
      if (playlist) {
        if (!playlist.tracks.some(t => t.path === track.path)) {
          playlist.tracks.push(track);
          await window.electronAPI.playlist.update(playlist);
          await loadPlaylists();
        }
      }
      menu.remove();
    });
    menu.appendChild(opt);
  });

  if (playlists.length === 0) {
    const opt = document.createElement('div');
    opt.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #C4B5FD;';
    opt.textContent = '请先创建歌单';
    menu.appendChild(opt);
  }

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
    });
  }, 0);
}

async function loadMusicDirs() {
  const dirs = await window.electronAPI.scan.getDirs();
  musicDirs.innerHTML = '';
  if (dirs.length === 0) {
    musicDirs.innerHTML = '<div style="text-align:center;padding:20px;color:#C4B5FD;font-size:12px;">未添加音乐目录</div>';
    return;
  }
  dirs.forEach(dir => {
    const item = document.createElement('div');
    item.className = 'music-dir-item';
    item.innerHTML = `
      <span title="${escapeHtml(dir)}">${escapeHtml(dir)}</span>
      <button>移除</button>
    `;
    item.querySelector('button').addEventListener('click', async () => {
      await window.electronAPI.scan.removeDirectory(dir);
      const tracks = await window.electronAPI.scan.rescan();
      allTracks = tracks;
      const validPaths = new Set(tracks.map(t => t.path));
      for (const pl of playlists) {
        const playlist = await window.electronAPI.playlist.get(pl.id);
        if (playlist) {
          const filtered = playlist.tracks.filter(t => validPaths.has(t.path));
          if (filtered.length !== playlist.tracks.length) {
            playlist.tracks = filtered;
            await window.electronAPI.playlist.update(playlist);
          }
        }
      }
      await loadPlaylists();
      renderTrackList();
      loadMusicDirs();
    });
    musicDirs.appendChild(item);
  });
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let activeShortcutInput = null;

function setupShortcutInputs() {
  const shortcutIds = ['shortcut-play', 'shortcut-next', 'shortcut-prev', 'shortcut-volup', 'shortcut-voldown', 'shortcut-mute'];

  document.addEventListener('keydown', (e) => {
    if (!activeShortcutInput) return;
    e.preventDefault();
    e.stopPropagation();
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      activeShortcutInput.value = parts.join('+');
      activeShortcutInput.style.borderColor = '';
      activeShortcutInput.blur();
      activeShortcutInput = null;
    }
  }, true);

  shortcutIds.forEach(id => {
    const input = document.getElementById(id);
    input.readOnly = true;
    input.style.cursor = 'pointer';
    input.addEventListener('focus', () => {
      activeShortcutInput = input;
      input.value = '请按下快捷键...';
      input.style.borderColor = '#8B5CF6';
    });
    input.addEventListener('blur', () => {
      activeShortcutInput = null;
      input.style.borderColor = '';
    });
    input.addEventListener('click', () => {
      input.focus();
      input.select();
    });
  });
}

window.electronAPI.player.onTrackChanged((track) => {
  if (track) {
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    coverArt.innerHTML = track.cover
      ? `<img src="${track.cover}" alt="封面">`
      : '<div class="cover-placeholder">♪</div>';
    document.querySelectorAll('.track-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === track.id);
    });
    currentTrackPath = track.path;
    progressBar.value = 0;
    timeCurrent.textContent = '0:00';
    timeTotal.textContent = formatTime(track.duration);
  }
});

window.electronAPI.player.onStateChanged((state) => {
  if (state) {
    isPlaying = state.isPlaying;
    btnPlay.textContent = isPlaying ? '⏸' : '▶';
    if (!progressBar.dataset.dragging) {
      progressBar.max = state.duration || 0;
      progressBar.value = state.currentTime || 0;
      timeTotal.textContent = formatTime(state.duration);
      timeCurrent.textContent = formatTime(state.currentTime);
    }
    currentMode = state.playMode || 'loop';
    btnMode.textContent = modeLabels[currentMode];
    btnMode.title = modeNames[currentMode];
  }
});

window.electronAPI.player.onVolumeChanged((vol) => {
  volumeBar.value = vol.isMuted ? 0 : vol.volume;
  btnMute.textContent = vol.isMuted ? '🔇' : '🔊';
});

window.electronAPI.scan.onLibraryUpdate((data) => {
  if (data.tracks) {
    allTracks = data.tracks;
    renderTrackList();
  }
});

window.electronAPI.onPetSizeChanged((size) => {
  petSizeSlider.value = size;
  petSizeLabel.textContent = `${size}px`;
});

async function init() {
  setupShortcutInputs();

  const mode = await window.electronAPI.config.get('playMode');
  if (mode) {
    currentMode = mode;
    btnMode.textContent = modeLabels[currentMode];
    btnMode.title = modeNames[currentMode];
  }

  const vol = await window.electronAPI.config.get('volume');
  if (vol !== undefined) volumeBar.value = vol;

  const size = await window.electronAPI.config.get('petSize');
  if (size) {
    petSizeSlider.value = size;
    petSizeLabel.textContent = `${size}px`;
  }

  await loadPetImages();

  const shortcuts = await window.electronAPI.config.get('shortcuts');
  if (shortcuts) {
    document.getElementById('shortcut-play').value = shortcuts.playPause || '';
    document.getElementById('shortcut-next').value = shortcuts.next || '';
    document.getElementById('shortcut-prev').value = shortcuts.prev || '';
    document.getElementById('shortcut-volup').value = shortcuts.volumeUp || '';
    document.getElementById('shortcut-voldown').value = shortcuts.volumeDown || '';
    document.getElementById('shortcut-mute').value = shortcuts.mute || '';
  }

  const dirs = await window.electronAPI.scan.getDirs();
  if (dirs.length > 0) {
    allTracks = await window.electronAPI.scan.rescan();
  }

  await loadPlaylists();
  await loadMusicDirs();
  renderTrackList();

  const state = await window.electronAPI.player.getState();
  if (state) {
    isPlaying = state.isPlaying;
    btnPlay.textContent = isPlaying ? '⏸' : '▶';
    progressBar.max = state.duration || 0;
    timeTotal.textContent = formatTime(state.duration);
    timeCurrent.textContent = formatTime(state.currentTime);
  }

  const track = await window.electronAPI.player.getTrack();
  if (track) {
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist;
    coverArt.innerHTML = track.cover
      ? `<img src="${track.cover}" alt="封面">`
      : '<div class="cover-placeholder">♪</div>';
    currentTrackPath = track.path;
    document.querySelectorAll('.track-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === track.id);
    });
  }

  async function syncPlayerState() {
    const track = await window.electronAPI.player.getTrack();
    const state = await window.electronAPI.player.getState();
    if (track && track.path !== currentTrackPath) {
      trackTitle.textContent = track.title;
      trackArtist.textContent = track.artist;
      coverArt.innerHTML = track.cover
        ? `<img src="${track.cover}" alt="封面">`
        : '<div class="cover-placeholder">♪</div>';
      currentTrackPath = track.path;
      progressBar.value = 0;
      timeCurrent.textContent = '0:00';
      document.querySelectorAll('.track-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === track.id);
      });
    }
    if (state) {
      isPlaying = state.isPlaying;
      btnPlay.textContent = isPlaying ? '⏸' : '▶';
      if (!progressBar.dataset.dragging) {
        progressBar.max = state.duration || 0;
        timeTotal.textContent = formatTime(state.duration);
        timeCurrent.textContent = formatTime(state.currentTime);
      }
    }
  }
  setTimeout(syncPlayerState, 500);
  setInterval(syncPlayerState, 1000);
}

init();
