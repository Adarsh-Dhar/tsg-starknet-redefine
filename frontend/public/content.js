
(function() {
  // 1. Initial check: If context is already dead, don't even start.
  if (typeof chrome === "undefined") return;
  try {
    if (!chrome.runtime || !chrome.runtime.id) return;
  } catch (e) {
    return;
  }

  let isScriptValid = true;
  let startTime = Date.now();
  let reportTimeout = null;
  let extensionInvalidated = false;

  const invalidateScript = () => {
    if (!extensionInvalidated) {
      console.warn('Extension context invalidated. Script disabled.');
    }
    isScriptValid = false;
    extensionInvalidated = true;
    if (reportTimeout) clearTimeout(reportTimeout);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  const report = () => {
    // 2. Fail-safe: Exit if marked invalid or runtime is gone
    if (!isScriptValid || extensionInvalidated) {
      return;
    }
    if (typeof chrome === "undefined") {
      invalidateScript();
      return;
    }
    try {
      if (!chrome.runtime || !chrome.runtime.id) {
        invalidateScript();
        return;
      }
    } catch (e) {
      invalidateScript();
      return;
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    
    if (window.location.href.includes('/shorts/') && duration > 5) {
      try {
        chrome.runtime.sendMessage({ 
          type: "YOUTUBE_ACTIVITY", 
          duration 
        }, () => {
          // 3. Check for lastError immediately in the callback
          if (chrome.runtime.lastError && chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('Extension context invalidated')) {
            invalidateScript();
            return;
          } else if (chrome.runtime.lastError) {
            // Other errors: log and invalidate
            console.warn('Extension error:', chrome.runtime.lastError);
            invalidateScript();
            return;
          }
        });
        console.log(`📊 Brainrot reported: ${duration}s`);
      } catch (err) {
        // This catches the specific "Extension context invalidated" exception
        if (err && err.message && err.message.includes('Extension context invalidated')) {
          invalidateScript();
          return;
        }
        // Other errors: log and invalidate
        console.warn('Extension error:', err);
        invalidateScript();
        return;
      }
    }

    startTime = Date.now();
    
    // 4. Schedule next check only if still healthy
    if (isScriptValid) {
      reportTimeout = setTimeout(report, 10000);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && isScriptValid) {
      report();
    }
  };

  // Start the loop
  reportTimeout = setTimeout(report, 10000);

  // Use a named function so we can remove it on invalidation
  window.addEventListener('visibilitychange', handleVisibilityChange);
})();