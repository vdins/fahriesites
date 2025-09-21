(function () {
  // Configuration
  const AUDIO_SRC = 'Toronto 2014.mp3';
  const INITIAL_OFFSET_SECONDS = 186; // 3:06
  const STORAGE_KEY_TIME = 'toronto2014_time';
  const STORAGE_KEY_NOTIFIED = 'toronto2014_notified';

  // Create and attach the hidden audio element
  const audio = new Audio();
  audio.src = AUDIO_SRC;
  audio.preload = 'auto';
  audio.autoplay = true; // we'll still call play() in code for better reliability
  audio.style.display = 'none';

  // Attach the audio to the DOM ASAP so the browser starts preloading
  if (document.body) {
    document.body.appendChild(audio);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(audio);
    });
  }

  // Utility to create a simple toast/notification
  function showToast(message, opts = {}) {
    const { duration = 4000 } = opts;
    const id = 'toronto2014_toast';
    if (document.getElementById(id)) return; // only show once per page

    const toast = document.createElement('div');
    toast.id = id;
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20,20,20,0.95)',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: '8px',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif',
      fontSize: '14px',
      zIndex: 2147483647,
      boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
      maxWidth: '90%',
      textAlign: 'center',
    });

    document.body.appendChild(toast);

    // Auto-hide
    setTimeout(() => {
      toast.style.transition = 'opacity 300ms ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  // Overlay prompting user to allow audio if autoplay with sound is blocked
  function showClickToPlayOverlay() {
    const id = 'toronto2014_click_to_play';
    if (document.getElementById(id)) return;

    const wrap = document.createElement('div');
    wrap.id = id;
    Object.assign(wrap.style, {
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 2147483647,
      background: 'rgba(20,20,20,0.96)',
      color: '#fff',
      padding: '12px 14px',
      borderRadius: '10px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
      maxWidth: '320px',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif',
    });

    const msg = document.createElement('div');
    msg.textContent = 'Website sedang memutar lagu "Toronto 2014.mp3". Klik Mulai untuk mengaktifkan audio.';
    msg.style.fontSize = '14px';
    msg.style.marginBottom = '10px';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Mulai';
    Object.assign(btn.style, {
      background: '#4f46e5',
      color: '#fff',
      border: 'none',
      padding: '8px 12px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
    });

    btn.addEventListener('click', () => {
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          // On success, remove overlay
          wrap.remove();
        }).catch(() => {
          // If still blocked, do nothing
        });
      } else {
        // Older browsers
        wrap.remove();
      }
    });

    wrap.appendChild(msg);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  function startPlayback() {
    // Determine start time: use session time if available, otherwise 3:06
    let saved = parseFloat(sessionStorage.getItem(STORAGE_KEY_TIME));
    if (!isFinite(saved) || saved < 0) saved = INITIAL_OFFSET_SECONDS;

    const seekAndPlay = () => {
      try {
        // Clamp to duration if needed
        if (isFinite(audio.duration) && saved > audio.duration) {
          saved = Math.max(0, audio.duration - 1);
        }
        audio.currentTime = saved;
      } catch (_) {
        // ignore, will still attempt play
      }
      const playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.then === 'function') {
        playAttempt.catch(() => {
          // Autoplay blocked, show overlay
          showClickToPlayOverlay();
        });
      }
    };

    // Wait until metadata is loaded before seeking
    if (audio.readyState >= 1 /* HAVE_METADATA */) {
      seekAndPlay();
    } else {
      audio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
    }
  }

  // Persist current time to sessionStorage to keep position across pages (same tab)
  function setupTimePersistence() {
    const save = () => {
      if (!isNaN(audio.currentTime)) {
        sessionStorage.setItem(STORAGE_KEY_TIME, String(audio.currentTime));
      }
    };
    const interval = setInterval(save, 1000);
    window.addEventListener('beforeunload', save);
    // In case page visibility changes quickly
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save();
    });
    // Clean up interval on page hide (optional)
    window.addEventListener('pagehide', () => clearInterval(interval));
  }

  // Show a one-time toast per session when the site is first opened
  function maybeShowStartToast() {
    if (!sessionStorage.getItem(STORAGE_KEY_NOTIFIED)) {
      showToast('Website sedang memutar lagu "Toronto 2014.mp3".', { duration: 4500 });
      sessionStorage.setItem(STORAGE_KEY_NOTIFIED, '1');
    }
  }

  // Kick everything off
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    maybeShowStartToast();
    setupTimePersistence();
    startPlayback();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      maybeShowStartToast();
      setupTimePersistence();
      startPlayback();
    });
  }
})();
