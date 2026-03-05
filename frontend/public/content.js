// frontend/public/content.js
// IMMEDIATE LOG - This should appear as soon as the script loads
console.warn("🔴 [TSG] Content script file is loading on:", window.location.href);

(function () {
  // IMMEDIATE CHECK
  console.warn("🔴 [TSG] IIFE Starting - checking initialization");
  
  const currentUrl = window.location.href;
  
  // 1. Guard against multiple injections on SAME URL
  if (window.__TSG_INITIALIZED && window.__TSG_LAST_URL === currentUrl) {
    console.log("[TSG] Content script already initialized for this URL, skipping.");
    return;
  }
  
  // Mark as initialized for this URL
  window.__TSG_INITIALIZED = true;
  window.__TSG_LAST_URL = currentUrl;
  console.warn("🔴 [TSG] Marked window.__TSG_INITIALIZED = true for URL:", currentUrl);
  
  const isContextValid = () => {
    try { 
      const valid = !!(chrome && chrome.runtime && chrome.runtime.id);
      return valid;
    }
    catch (e) { 
      console.error("[TSG] Error checking context validity:", e);
      return false; 
    }
  };

  let startTime = Date.now();
  let reportCount = 0;
  let reportTimer = null;

  // 2. Send activity message via sendMessage
  const reportActivity = () => {
    console.warn("🟢 [TSG] reportActivity CALLED!");
    try {
      console.warn("🟢 [TSG] Inside try block");
      const delta = Math.floor((Date.now() - startTime) / 1000);
      console.warn("🟢 [TSG] Delta calculated:", delta);
      const isShorts = window.location.href.includes('/shorts/');
      console.warn("🟢 [TSG] isShorts checked:", isShorts);
      const url = window.location.href;
      console.warn("🟢 [TSG] URL grabbed:", url);
      
      reportCount++;
      console.warn("🟢 [TSG] reportCount incremented to:", reportCount);

      // Log every check with proper template literal
      console.log(`[TSG] Check #${reportCount}: delta=${delta}s, isShorts=${isShorts}, url_contains_shorts=${window.location.href.includes('/shorts/')}`);
      console.warn(`🟡 [TSG] About to check condition: isShorts=${isShorts}, delta=${delta}, threshold=5`);

      if (isShorts && delta >= 5) {
        // Only attempt if context is valid
        if (!isContextValid()) {
          console.error("❌ [TSG] Extension context invalid. Cannot report activity.");
          reportTimer = setTimeout(reportActivity, 5000);
          return;
        }

        console.log(`%c✅ [TSG] SENDING ACTIVITY: ${delta}s to background`, "color: #10b981; font-weight: bold; font-size: 14px;");
        console.warn(`🟣 [TSG] Conditions met - about to call sendMessage. isShorts=${isShorts}, delta=${delta}`);
        
        try {
          // Ensure chrome is available
          if (!chrome || !chrome.runtime) {
            console.error("❌ [TSG] chrome.runtime is not available");
            reportTimer = setTimeout(reportActivity, 5000);
            return;
          }

          console.warn("🟣 [TSG] chrome.runtime is available, calling sendMessage now");

          // Use sendMessage
          chrome.runtime.sendMessage(
            { type: "YOUTUBE_ACTIVITY", duration: delta },
            (response) => {
              console.warn("🟣 [TSG] sendMessage callback executed");
              try {
                console.log("[TSG] sendMessage callback fired");
                console.log("[TSG] callback response:", response);
                console.log("[TSG] chrome.runtime.lastError:", chrome.runtime.lastError);
                
                if (chrome.runtime.lastError) {
                  console.error(`❌ [TSG] sendMessage error: ${chrome.runtime.lastError.message}`);
                } else if (response && response.success) {
                  console.log("%c✅ [TSG] BACKGROUND ACKNOWLEDGED", "color: #10b981; font-weight: bold; font-size: 14px;");
                  startTime = Date.now();
                } else {
                  console.warn(`⚠️ [TSG] Unexpected response:`, response);
                }
              } catch (callbackError) {
                console.error("❌ [TSG] Error in sendMessage callback:", callbackError);
              }
            }
          );
          
          console.warn("🟣 [TSG] sendMessage call completed, resetting startTime");
          startTime = Date.now();
        } catch (sendError) {
          console.error("❌ [TSG] Failed to send activity message:", sendError.message);
          reportTimer = setTimeout(reportActivity, 5000);
          return;
        }
      } else {
        console.warn(`🟡 [TSG] Condition not met: isShorts=${isShorts}, delta=${delta}, needs delta >= 5`);
      }
    } catch (mainError) {
      console.error("❌ [TSG] Critical error in reportActivity:", mainError.message);
    }
    
    // Schedule next report
    console.warn("🟡 [TSG] Scheduling next reportActivity in 5 seconds");
    reportTimer = setTimeout(reportActivity, 5000);
  };

  // Clear any existing timers from previous initializations
  if (window.__TSG_REPORT_TIMER) {
    console.warn("🟠 [TSG] Clearing old report timer");
    clearTimeout(window.__TSG_REPORT_TIMER);
  }

  // 3. Initialize execution
  try {
    console.warn("🔴 [TSG] Initialization starting");
    console.warn("🔴 [TSG] About to log CONTENT SCRIPT INITIALIZED");
    console.log("%c✅ [TSG] CONTENT SCRIPT INITIALIZED", "color: #10b981; font-weight: bold; font-size: 16px;");
    console.warn("🔴 [TSG] After CONTENT SCRIPT INITIALIZED");
    console.log("  URL:", window.location.href);
    console.log("  Is YouTube:", window.location.href.includes('youtube.com'));
    console.log("  Is Shorts:", window.location.href.includes('/shorts/'));
    
    console.warn("🔴 [TSG] About to check context validity");
    const contextValid = isContextValid();
    console.warn("🔴 [TSG] Context validity checked:", contextValid);
    console.log("  Context Valid:", contextValid);
    
    // Start reporting after 2 seconds
    console.warn("🔴 [TSG] About to call setTimeout for reportActivity in 2 seconds");
    window.__TSG_REPORT_TIMER = setTimeout(() => {
      console.warn("🟣 [TSG] Initial 2-second timeout fired, calling reportActivity now");
      reportActivity();
    }, 2000);
    console.log("[TSG] Started activity reporter");
    console.warn("🔴 [TSG] Initialization complete");
  } catch (initError) {
    console.error("❌ [TSG] Failed to initialize:", initError.message, initError);
    console.error("❌ [TSG] Full error:", initError);
  }
})();

console.warn("🔴 [TSG] Content script file finished loading");