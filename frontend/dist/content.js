// frontend/public/content.js

(function () {
  const isContextValid = () => {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); } 
    catch (e) { return false; }
  };

  // If already running but context is invalid, reset the guard to allow re-injection
  if (window.__TSG_CONTENT_RUNNING && !isContextValid()) {
    console.log("TSG: Resetting stale context guard...");
    window.__TSG_CONTENT_RUNNING = false;
  }

  if (window.__TSG_CONTENT_RUNNING) {
    console.warn("TSG: Script already active and healthy.");
    return;
  }
  
  window.__TSG_CONTENT_RUNNING = true;
  let startTime = Date.now();
  let port = null;

  const connect = () => {
    try {
      port = chrome.runtime.connect({ name: "content-keepalive" });
      port.onDisconnect.addListener(() => {
        console.error("TSG: Port disconnected. Cleaning up...");
        window.__TSG_CONTENT_RUNNING = false;
        port = null;
      });
      console.log("TSG: Port established successfully.");
    } catch (e) {
      window.__TSG_CONTENT_RUNNING = false;
    }
  };

  const reportActivity = () => {
    if (!isContextValid()) {
      window.__TSG_CONTENT_RUNNING = false;
      return;
    }

    const delta = Math.floor((Date.now() - startTime) / 1000);
    const isShorts = window.location.href.includes('/shorts/');

    if (isShorts && delta >= 5 && port) {
      console.log(`%c TSG: Reporting ${delta}s of brainrot... `, "color: #10b981; font-weight: bold;");
      port.postMessage({ type: "YOUTUBE_ACTIVITY", duration: delta });
      startTime = Date.now();
    }

    setTimeout(reportActivity, 5000);
  };

  connect();
  setTimeout(reportActivity, 2000);
})();