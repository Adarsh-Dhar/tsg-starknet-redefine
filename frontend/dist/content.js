// frontend/public/content.js

(function () {
  // 1. Guard against multiple injections
  if (window.__TSG_INITIALIZED) {
    console.log("TSG: Content script already initialized.");
    return;
  }
  
  const isContextValid = () => {
    try { 
      return !!(chrome && chrome.runtime && chrome.runtime.id); 
    }
    catch (e) { 
      return false; 
    }
  };

  window.__TSG_INITIALIZED = true;
  window.__TSG_CONTENT_RUNNING = true;

  let startTime = Date.now();

  // 2. Send activity message via sendMessage (more reliable than ports)
  const reportActivity = () => {
    const delta = Math.floor((Date.now() - startTime) / 1000);
    const isShorts = window.location.href.includes('/shorts/');

    // Only log heartbeat on Shorts pages to reduce noise
    if (isShorts) {
      console.log(`TSG Heartbeat: [Time: ${delta}s] [Context Valid: ${isContextValid()}]`);
    }

    if (isShorts && delta >= 5) {
      // Only attempt if context is valid
      if (!isContextValid()) {
        console.warn("TSG: Extension context invalid. Cannot report activity.");
        // Reschedule and wait
        setTimeout(reportActivity, 5000);
        return;
      }

      console.log(`%c TSG: Reporting ${delta}s of brainrot... `, "color: #10b981; font-weight: bold;");
      
      try {
        // Use sendMessage instead of persistent port
        // This is more reliable for service worker environments
        chrome.runtime.sendMessage(
          { type: "YOUTUBE_ACTIVITY", duration: delta },
          (response) => {
            if (chrome.runtime.lastError) {
              // This is normal if service worker is sleeping
              console.warn("TSG: Message send delayed (service worker may be sleeping):", chrome.runtime.lastError.message);
            } else if (response && response.success) {
              console.log("TSG: Activity reported successfully.");
              startTime = Date.now();
            } else {
              console.warn("TSG: Activity report not acknowledged.");
            }
          }
        );
        
        // Optimistically reset timer (will be confirmed if response succeeds)
        startTime = Date.now();
      } catch (e) {
        console.error("TSG: Failed to send activity message:", e.message);
      }
    }
    
    // Schedule next report
    setTimeout(reportActivity, 5000);
  };

  // 3. Initialize execution
  console.log("✅ TSG: Content script initialized on", window.location.href);
  setTimeout(reportActivity, 2000);
})();