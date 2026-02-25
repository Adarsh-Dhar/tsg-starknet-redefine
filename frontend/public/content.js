

let startTime = Date.now();

const report = () => {
  const duration = Math.floor((Date.now() - startTime) / 1000);
  // Only report if it's a Short AND they've been on this specific view for > 5s
  if (window.location.href.includes('/shorts/') && duration > 5) {
    console.log("🚀 Sending activity to extension:", duration, "s");
    try {
      if (chrome.runtime && typeof chrome.runtime.sendMessage === "function") {
        chrome.runtime.sendMessage({ type: "YOUTUBE_ACTIVITY", duration });
      } else {
        // Optionally suppress or log a warning
        // console.warn("Extension context unavailable.");
      }
    } catch (err) {
      // Suppress uncaught errors and log
      console.error("Extension context invalidated:", err);
      return;
    }
  }
  startTime = Date.now();
};

// Report every 15 seconds automatically while the tab is active
setInterval(report, 15000);

// Report immediately when they leave the page/close tab
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') report();
});
