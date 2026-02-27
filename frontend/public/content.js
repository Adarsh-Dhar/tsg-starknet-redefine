// frontend/public/content.js


(function () {
  const isContextValid = () => {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); }
    catch (e) { return false; }
  };

  // Self-healing: If guard is set but port is missing or context is invalid, reset guard
  if (window.__TSG_CONTENT_RUNNING && (!isContextValid() || !window.__TSG_PORT_ACTIVE)) {
    console.log("TSG: Repairing stale connection...");
    window.__TSG_CONTENT_RUNNING = false;
    window.__TSG_PORT_ACTIVE = false;
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
      window.__TSG_PORT_ACTIVE = true;

      port.onDisconnect.addListener(() => {
        window.__TSG_CONTENT_RUNNING = false;
        window.__TSG_PORT_ACTIVE = false;
        console.warn("TSG: Port disconnected, resetting guard.");
      });
    } catch (e) {
      window.__TSG_CONTENT_RUNNING = false;
      window.__TSG_PORT_ACTIVE = false;
      console.error("TSG: Failed to connect to background.", e);
    }
  };

  const reportActivity = () => {
    const delta = Math.floor((Date.now() - startTime) / 1000);
    const isShorts = window.location.href.includes('/shorts/');

    // Heartbeat log for debugging
    console.log(`TSG Heartbeat: [Shorts: ${isShorts}] [Time: ${delta}s] [Port: ${!!port}]`);

    if (isShorts && delta >= 5 && port) {
      console.log(`%c TSG: Reporting ${delta}s of brainrot... `, "color: #10b981; font-weight: bold;");
      try {
        port.postMessage({ type: "YOUTUBE_ACTIVITY", duration: delta });
      } catch (e) {
        console.error("TSG: Failed to postMessage to background.", e);
        window.__TSG_CONTENT_RUNNING = false;
        window.__TSG_PORT_ACTIVE = false;
        return;
      }
      startTime = Date.now();
    }
    setTimeout(reportActivity, 5000);
  };

  connect();
  setTimeout(reportActivity, 2000);
})();