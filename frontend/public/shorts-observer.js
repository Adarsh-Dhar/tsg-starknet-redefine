// YouTube Shorts Observer Content Script
// Inject this into the Shorts player page


(function () {
  // Helper: Get wallet address from extension storage or prompt
  async function getWalletAddress() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['walletAddress'], (result) => {
        if (result.walletAddress) resolve(result.walletAddress);
        else resolve(null);
      });
    });
  }

  // Helper: Get backend URL from chrome.storage or fallback to env
  async function getBackendUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['backendUrl'], (result) => {
        if (result.backendUrl) resolve(result.backendUrl);
        else resolve((typeof BACKEND_URL !== 'undefined' && BACKEND_URL) ? BACKEND_URL : 'http://localhost:3333');
      });
    });
  }

  // Helper: POST with retry
  async function postWithRetry(url, data, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) return await res.json();
      } catch (e) {}
      await new Promise((r) => setTimeout(r, delay));
    }
    throw new Error('Failed to POST after retries');
  }

  // Batched egress buffer
  let eventBuffer = [];
  let bufferFlushTimeout = null;
  const BATCH_SIZE = 5;
  const BATCH_INTERVAL = 3000; // ms

  async function flushBuffer() {
    if (eventBuffer.length === 0) return;
    const backendUrl = await getBackendUrl();
    const batch = eventBuffer.splice(0, BATCH_SIZE);
    try {
      await postWithRetry(`${backendUrl}/api/data/ingest/realtime`, batch, 3, 1000);
    } catch (e) {
      // Optionally notify user of failure
    }
  }

  function scheduleFlush() {
    if (bufferFlushTimeout) clearTimeout(bufferFlushTimeout);
    bufferFlushTimeout = setTimeout(flushBuffer, BATCH_INTERVAL);
  }

  // SPA navigation detection
  let lastUrl = location.href;
  const observeUrlChange = () => {
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(observeShorts, 500); // Re-init observer on URL change
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  // Main observer logic
  let lastVideoId = null;
  let lastEnterTime = null;
  let shortsObserver = null;

  function observeShorts() {
    // Disconnect previous observer if any
    if (shortsObserver) shortsObserver.disconnect();
    const player = document.querySelector('ytd-reel-video-renderer, ytd-reel-player-overlay-renderer');
    if (!player) return;

    shortsObserver = new IntersectionObserver(async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // Video entered viewport
          const videoId = window.location.pathname.split('/').pop();
          lastVideoId = videoId;
          lastEnterTime = Date.now();
        } else if (lastVideoId && lastEnterTime) {
          // Video exited viewport
          const dwell = Math.round((Date.now() - lastEnterTime) / 1000);
          const walletAddress = await getWalletAddress();
          if (walletAddress && lastVideoId && dwell > 0) {
            eventBuffer.push({
              walletAddress,
              videoId: lastVideoId,
              duration: dwell,
              timestamp: Date.now(),
            });
            if (eventBuffer.length >= BATCH_SIZE) {
              flushBuffer();
            } else {
              scheduleFlush();
            }
          }
          lastVideoId = null;
          lastEnterTime = null;
        }
      }
    }, { threshold: 0.5 });

    shortsObserver.observe(player);
  }

  // Wait for DOM and start observer
  document.addEventListener('DOMContentLoaded', () => {
    observeShorts();
    observeUrlChange();
  });
  setTimeout(() => {
    observeShorts();
    observeUrlChange();
  }, 2000); // Fallback in case DOMContentLoaded missed
})();
