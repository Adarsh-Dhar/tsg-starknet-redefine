
console.log("%c !!! TSG CONTENT SCRIPT TRIGGERED !!! ", "background: #10b981; color: white;");


(function () {
  // If already running, clean up previous instance before re-injecting
  if (window.__TSG_CONTENT_RUNNING) {
    if (window.__TSG_CONTENT_CLEANUP) {
      try { window.__TSG_CONTENT_CLEANUP(); } catch (e) {}
    }
  }
  window.__TSG_CONTENT_RUNNING = true;

  const isContextValid = () => {
    try {
      return (
        typeof chrome !== 'undefined' &&
        chrome.runtime &&
        typeof chrome.runtime.id === 'string' &&
        !!chrome.runtime.id
      );
    } catch (e) {
      return false;
    }
  };

  if (!isContextValid()) {
    console.error("TSG: Initial context invalid. Is the extension enabled?");
    window.__TSG_CONTENT_RUNNING = false;
    return;
  }

  let isAlive = true;
  let startTime = Date.now();
  let timerId = null;
  let port = null;
  let reconnectTimeoutId = null;
  let wasContextInvalid = false;

  const killScript = (reason) => {
    if (!isAlive) return;
    isAlive = false;
    window.__TSG_CONTENT_RUNNING = false;
    if (timerId) clearTimeout(timerId);
    if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
    if (port && port.disconnect) {
      try { port.disconnect(); } catch (e) {}
    }
    if (reason && reason !== 'Reinjection cleanup') {
      console.error(`%c TSG STOPPED: ${reason} `, "background: #ef4444; color: white;");
    }
  };

  // Expose cleanup for future reinjections
  window.__TSG_CONTENT_CLEANUP = () => killScript('Reinjection cleanup');

  // --- Port Connection Logic with Auto-Reconnect ---
  function connectToBackground(retryCount = 0) {
    if (!isAlive) return;
    if (!isContextValid()) {
      // Wait and retry if context is not valid
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = setTimeout(() => connectToBackground(retryCount + 1), 3000);
      return;
    }
    try {
      console.log("TSG: Attempting to connect to Background Service Worker...");
      port = chrome.runtime.connect({ name: "content-keepalive" });


      let disconnectWarned = false;
      port.onDisconnect.addListener(() => {
        const err = chrome.runtime.lastError;
        if (!disconnectWarned) {
          console.warn("TSG: Port disconnected. Reason:", err ? err.message : "Extension reloaded/Background slept.");
          disconnectWarned = true;
        }
        port = null;
        if (!isAlive) return;
        // Only attempt to reconnect if context is still valid
        if (isContextValid()) {
          if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
          // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
          const delay = Math.min(1000 * Math.pow(2, Math.min(retryCount, 3)), 10000);
          reconnectTimeoutId = setTimeout(() => connectToBackground(retryCount + 1), delay);
          // If too many retries, show a user-friendly message
          if (retryCount > 6) {
            console.error("TSG: Unable to reconnect to background after multiple attempts. Please check if the extension is enabled.");
          }
        } else {
          // If context is invalid, let reportActivity handle reconnection
          if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
        }
      });

      console.log("TSG: Port connected successfully. ID:", chrome.runtime.id);
      // Reset disconnect warning on successful connection
      disconnectWarned = false;
    } catch (e) {
      if (!isAlive) return;
      // Try to reconnect after a short delay
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = setTimeout(() => connectToBackground(retryCount + 1), 2000);
    }
  }

  connectToBackground();



  const reportActivity = () => {
    if (!isAlive) return;

    if (!isContextValid()) {
      if (!wasContextInvalid) {
        console.warn("TSG: Context invalid. Will retry in 5s.");
        wasContextInvalid = true;
      }
      // Try to reconnect if not already attempting
      connectToBackground();
      timerId = setTimeout(reportActivity, 5000);
      return;
    } else if (wasContextInvalid) {
      // Context has become valid again, reconnect to background
      console.log("TSG: Context restored. Attempting to reconnect to background.");
      connectToBackground();
      wasContextInvalid = false;
    }

    const now = Date.now();
    const delta = Math.floor((now - startTime) / 1000);

    // --- 2. Log URL and Detection Logic ---
    const isShorts = window.location.href.includes('/shorts/');
    console.log(`TSG Check: [Shorts: ${isShorts}] [Time on Video: ${delta}s] [URL: ${window.location.pathname}]`);

    if (isShorts) {
      if (delta >= 5) {
        if (port) {
          try {
            console.log(`%c TSG: Sending message to background... Duration: ${delta}s `, "color: #10b981; font-weight: bold;");
            port.postMessage({ type: "YOUTUBE_ACTIVITY", duration: delta });
            startTime = Date.now(); // Reset only on success
          } catch (e) {
            console.warn("TSG: Message posting failed. Will retry on next interval.");
          }
        } else {
          // Port is temporarily unavailable, likely due to background sleep. Just wait for reconnect.
          // Only log once per disconnect event
          if (!wasContextInvalid) {
            console.warn("TSG: No port to background. Will retry on next interval.");
          }
        }
      }
    } else {
      // If user navigated away from shorts, reset the timer so we don't 
      // report 60s of "Home Page" time when they finally click a short.
      startTime = Date.now();
    }

    if (isAlive) {
      timerId = setTimeout(reportActivity, 5000);
    }
  };

  // Start the loop
  timerId = setTimeout(reportActivity, 2000);
})();