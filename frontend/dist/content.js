
let startTime = Date.now();
let lastUrl = location.href;

const isYtShort = () => location.href.includes('/shorts/');

const reportActivity = () => {
  const duration = Math.floor((Date.now() - startTime) / 1000);
  if (isYtShort() && duration > 5) {
    console.log("Reporting Short activity:", duration, "s");
    chrome.runtime.sendMessage({ type: "YOUTUBE_ACTIVITY", duration });
  }
  startTime = Date.now(); // Reset
};

// Listen for YouTube SPA navigation events
window.addEventListener('yt-navigate-finish', () => {
  if (location.href !== lastUrl) {
    reportActivity();
    lastUrl = location.href;
  }
});

// Fallback: MutationObserver for URL changes (in case yt-navigate-finish is not fired)
const observeUrlChange = () => {
  const body = document.querySelector('body');
  if (!body) return;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      reportActivity();
      lastUrl = location.href;
    }
  });
  observer.observe(body, { childList: true, subtree: true });
};
observeUrlChange();

// Periodic heartbeat for long-watch sessions
setInterval(reportActivity, 10000);
window.addEventListener('beforeunload', reportActivity);
