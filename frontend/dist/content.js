let startTime = Date.now();
let lastUrl = location.href;

// Function to check if the current page is a YouTube Short
const isYtShort = () => location.href.includes('/shorts/');

const reportActivity = () => {
  if (!isYtShort()) return;

  const duration = Math.floor((Date.now() - startTime) / 1000); // seconds
  if (duration < 1) return; // Don't report micro-intervals

  chrome.runtime.sendMessage({
    type: "YOUTUBE_ACTIVITY",
    duration: duration,
    url: location.href
  });
  
  startTime = Date.now(); // Reset interval
};

// Monitor URL changes (YT is a Single Page App)
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    reportActivity();
    lastUrl = location.href;
    startTime = Date.now();
  }
});

observer.observe(document, { subtree: true, childList: true });

// Report activity every 10 seconds while watching
setInterval(reportActivity, 10000);

// Report before the user closes the tab
window.addEventListener('beforeunload', reportActivity);
