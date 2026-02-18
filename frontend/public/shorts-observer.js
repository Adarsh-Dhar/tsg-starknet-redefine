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

  // Main observer logic
  let lastVideoId = null;
  let lastEnterTime = null;

  function observeShorts() {
    const player = document.querySelector('ytd-reel-video-renderer, ytd-reel-player-overlay-renderer');
    if (!player) return;

    const observer = new IntersectionObserver(async (entries) => {
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
            try {
              await postWithRetry('http://localhost:3333/api/data/ingest/realtime', {
                walletAddress,
                videoId: lastVideoId,
                duration: dwell,
              });
            } catch (e) {
              // Optionally notify user of failure
            }
          }
          lastVideoId = null;
          lastEnterTime = null;
        }
      }
    }, { threshold: 0.5 });

    observer.observe(player);
  }

  // Wait for DOM and start observer
  document.addEventListener('DOMContentLoaded', observeShorts);
  setTimeout(observeShorts, 2000); // Fallback in case DOMContentLoaded missed
})();
