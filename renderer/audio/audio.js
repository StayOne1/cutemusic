let audioElement = null;
let currentPath = null;

function initAudio() {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.addEventListener('timeupdate', () => {
      if (audioElement) {
        window.electronAPI.audio.timeUpdate({
          currentTime: audioElement.currentTime,
          duration: audioElement.duration || 0,
        });
      }
    });
    audioElement.addEventListener('ended', () => {
      window.electronAPI.audio.trackEnded();
    });
    audioElement.addEventListener('error', (e) => {
      console.error('Audio error:', e);
    });
  }
}

window.electronAPI.audio.onPlay((filePath) => {
  initAudio();
  if (currentPath === filePath) {
    if (audioElement.paused) {
      audioElement.play().catch(err => console.error('Resume error:', err));
    } else {
      audioElement.pause();
    }
    return;
  }
  currentPath = filePath;
  audioElement.src = `file:///${filePath.replace(/\\/g, '/')}`;
  audioElement.volume = 0.1;
  audioElement.play().catch(err => console.error('Play error:', err));
});

window.electronAPI.audio.onPause(() => {
  if (audioElement) audioElement.pause();
});

window.electronAPI.audio.onResume(() => {
  if (audioElement) audioElement.play().catch(err => console.error('Resume error:', err));
});

window.electronAPI.audio.onSetVolume((vol) => {
  if (audioElement) audioElement.volume = vol / 100;
});

window.electronAPI.audio.onSeek((time) => {
  if (audioElement) audioElement.currentTime = time;
});
