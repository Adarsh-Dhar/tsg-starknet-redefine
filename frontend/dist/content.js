

(function() {
  // Check if we are already in a dead context before starting
  if (typeof chrome === "undefined" || !chrome.runtime?.id) return;

  let isScriptValid = true;
  let startTime = Date.now();

  const report = () => {
    // Fail-safe: If the script is marked invalid, do nothing
    if (!isScriptValid) return;

    // Check if the runtime is still valid
    if (typeof chrome === "undefined" || !chrome.runtime?.id) {
      isScriptValid = false;
      return;
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    if (window.location.href.includes('/shorts/') && duration > 5) {
      try {
        chrome.runtime.sendMessage({ 
          type: "YOUTUBE_ACTIVITY", 
          duration 
        }, () => {
          // Detect invalidation via the response callback
          if (chrome.runtime.lastError) {
            isScriptValid = false;
          }
        });
        console.log(`📊 Brainrot reported: ${duration}s`);
      } catch (err) {
        // Catch the "Extension context invalidated" error
        isScriptValid = false;
      }
    }

    startTime = Date.now();
    
    // Only schedule the next check if the script is still valid
    if (isScriptValid) {
      setTimeout(report, 10000);
    }
  };

  // Start the loop
  setTimeout(report, 10000);

  // Safety for tab closing
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && isScriptValid) {
      report();
    }
  });
})();
