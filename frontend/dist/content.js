// frontend/public/content.js

(function () {
  // 1. Guard against multiple injections
  if (window.__TSG_INITIALIZED) {
    console.log("TSG: Content script already initialized.");
    return;
  }
  
  const isContextValid = () => {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); }
    catch (e) { return false; }
  };

  window.__TSG_INITIALIZED = true;
  window.__TSG_CONTENT_RUNNING = true;

  let port = null;
  let startTime = Date.now();

  // 2. Define the connect function BEFORE calling it
  const connect = () => {
    if (!isContextValid()) return;
    
    try {
      port = chrome.runtime.connect({ name: "content-keepalive" });
      window.__TSG_PORT_ACTIVE = true;

      port.onDisconnect.addListener(() => {
        window.__TSG_CONTENT_RUNNING = false;
        window.__TSG_PORT_ACTIVE = false;
        window.__TSG_INITIALIZED = false; // Allow re-initialization on next load
        console.warn("TSG: Port disconnected, resetting guard.");
      });
    } catch (e) {
      window.__TSG_CONTENT_RUNNING = false;
      window.__TSG_PORT_ACTIVE = false;
      console.error("TSG: Failed to connect to background.", e);
    }
  };

  // 3. Define the reportActivity logic
  const reportActivity = () => {
    const delta = Math.floor((Date.now() - startTime) / 1000);
    const isShorts = window.location.href.includes('/shorts/');

    // Heartbeat log for debugging
    console.log(`TSG Heartbeat: [Shorts: ${isShorts}] [Time: ${delta}s] [Port Active: ${!!port}]`);

    if (isShorts && delta >= 5 && port) {
      console.log(`%c TSG: Reporting ${delta}s of brainrot... `, "color: #10b981; font-weight: bold;");
      try {
        port.postMessage({ type: "YOUTUBE_ACTIVITY", duration: delta });
      } catch (e) {
        console.error("TSG: Failed to postMessage. Attempting to reconnect...");
        connect(); // Try to recover connection
      }
      startTime = Date.now();
    }
    
    // Schedule next report
    setTimeout(reportActivity, 5000);
  };

  // 4. Initialize execution
  connect();
  setTimeout(reportActivity, 2000);
})();