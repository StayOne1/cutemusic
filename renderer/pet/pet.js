const petContainer = document.getElementById('pet-container');
const petBody = document.getElementById('pet-body');
const petCharacter = document.getElementById('pet-character');
const trackTooltip = document.getElementById('track-tooltip');
const tooltipText = document.getElementById('tooltip-text');

let isDragging = false;
let hasDragged = false;
let dragStartX = 0;
let dragStartY = 0;
let tooltipTimeout = null;

petBody.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDragging = true;
    hasDragged = false;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    petCharacter.style.animationPlayState = 'paused';
    e.preventDefault();
  }
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.screenX - dragStartX;
    const dy = e.screenY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged = true;
    }
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    window.electronAPI.pet.drag(dx, dy);
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    isDragging = false;
    petCharacter.style.animationPlayState = 'running';
  }
});

petBody.addEventListener('click', (e) => {
  if (e.button === 0 && !hasDragged) {
    window.electronAPI.pet.click();
  }
});

petBody.addEventListener('dblclick', (e) => {
  if (e.button === 0 && !hasDragged) {
    window.electronAPI.player.toggle();
  }
});

petBody.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  window.electronAPI.pet.showMenu();
});

petBody.addEventListener('wheel', (e) => {
  e.preventDefault();
  window.electronAPI.pet.resize(e.deltaY > 0 ? -10 : 10);
}, { passive: false });

window.electronAPI.trackInfo((info) => {
  if (info) {
    showTooltip(`${info.title} - ${info.artist}`);
  }
});

window.electronAPI.player.onTrackChanged((track) => {
  if (track) {
    showTooltip(`${track.title} - ${track.artist}`);
  }
});

window.electronAPI.player.onStateChanged((state) => {
  petCharacter.className = 'pet-character';
  if (state.isPlaying) {
    petCharacter.classList.add('rem-playing');
  } else {
    petCharacter.classList.add('rem-idle');
  }
});

window.electronAPI.petState((state) => {
  petCharacter.className = 'pet-character';
  if (state === 'sleep') {
    petCharacter.classList.add('rem-sleeping');
  } else if (state === 'playing') {
    petCharacter.classList.add('rem-playing');
  } else {
    petCharacter.classList.add('rem-idle');
  }
});

function showTooltip(text) {
  tooltipText.textContent = text;
  trackTooltip.classList.remove('hidden');
  trackTooltip.classList.add('visible');

  if (tooltipTimeout) clearTimeout(tooltipTimeout);
  tooltipTimeout = setTimeout(() => {
    trackTooltip.classList.remove('visible');
    trackTooltip.classList.add('hidden');
  }, 3000);
}

async function init() {
  const state = await window.electronAPI.player.getState();
  if (state) {
    if (state.isPlaying) {
      petCharacter.className = 'pet-character rem-playing';
    }
    if (state.currentIndex >= 0 && state.trackCount > 0) {
      showTooltip(`第 ${state.currentIndex + 1} 首 / 共 ${state.trackCount} 首`);
    }
  }
}

init();
