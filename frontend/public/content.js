// 1. Immediate check: If the context is already dead on injection, don't start.
if (!chrome.runtime?.id) {
  console.warn("Touch Grass: Script orphaned. Please refresh YouTube to resume tracking.");
} else {
  let isScriptValid = true; // Variable to track if this specific script instance is still connected to the extension
  let startTime = Date.now();

  const report = () => {
    // If extension was reloaded or script marked invalid, stop immediately
    if (!isScriptValid || !chrome.runtime?.id) {
      isScriptValid = false;
      return;
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    // Only report if it's a Short watched for at least 5 seconds
    if (window.location.href.includes('/shorts/') && duration > 5) {
      try {
        // Final guard before calling API
        if (chrome.runtime?.id) {
          chrome.runtime.sendMessage({ 
            type: "YOUTUBE_ACTIVITY", 
            duration 
          }, (response) => {
            // Check for error in callback to detect invalidation
            if (chrome.runtime.lastError) {
              isScriptValid = false;
            }
          });
          console.log(`📊 Reporting Brainrot: ${duration}s`);
        }
      } catch (err) {
        // Immediate invalidation detected
        isScriptValid = false;
      }
    }
    startTime = Date.now();
  };

  // Use a named interval so we don't spam errors
  const activityTracker = setInterval(() => {
    if (isScriptValid) report();
    else clearInterval(activityTracker);
  }, 10000);

  // Stop tracking if tab is hidden
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && isScriptValid) {
      report();
    }
  });

}