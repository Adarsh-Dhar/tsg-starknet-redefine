// LOUD log and alert to confirm content script injection
console.log("!!! TSG CONTENT SCRIPT TRIGGERED !!!");
(function () {
  console.log("!!! TSG CONTENT SCRIPT ACTIVE !!!"); // Heartbeat log for YouTube console
  // Prevent duplicate execution across navigations or multiple injections
  if (window.__TSG_CONTENT_RUNNING) return;
  window.__TSG_CONTENT_RUNNING = true;

  // --- Context validity check ---
  const isContextValid = () => {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  };

  // Bail immediately if context is already gone
  if (!isContextValid()) {
    window.__TSG_CONTENT_RUNNING = false;
    return;
  }

  let isAlive = true;
  let startTime = Date.now();
  let timerId = null;

  // Single cleanup function — clears the one timer and resets the guard
  const killScript = () => {
    if (!isAlive) return; // already dead, don't run twice
    isAlive = false;
    window.__TSG_CONTENT_RUNNING = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    window.removeEventListener('error', globalErrorHandler);
    console.warn("TSG: Content script stopped (context invalidated or extension reloaded).");
  };

  // Catch any uncaught "Extension context invalidated" errors bubbling up
  const globalErrorHandler = (event) => {
    if (
      event &&
      event.error &&
      event.error.message &&
      event.error.message.includes('Extension context invalidated')
    ) {
      killScript();
    }
  };
  window.addEventListener('error', globalErrorHandler);

  // --- Port connection for reporting loop ---
  let port = null;
  try {
    port = chrome.runtime.connect({ name: "content-keepalive" });
  } catch (e) {
    killScript();
    return;
  }

  // If the port disconnects (background reload), kill the script immediately
  if (port) {
    port.onDisconnect.addListener(() => {
      killScript();
    });
  }

  const reportActivity = () => {
    if (!isAlive || !isContextValid() || !port) {
      killScript();
      return;
    }

    // Use a cumulative sessionDuration buffer
    if (typeof window.sessionDuration === 'undefined') {
      window.sessionDuration = 0;
    }
    const delta = Math.floor((Date.now() - startTime) / 1000);
    window.sessionDuration += delta;
    // Heartbeat log for every check
    console.log(`TSG: Checking... URL: ${window.location.pathname}, Delta: ${delta}s, Session: ${window.sessionDuration}s`);

    if (window.location.href.includes('/shorts/') && window.sessionDuration >= 5) {
      try {
        port.postMessage({ type: "YOUTUBE_ACTIVITY", duration: window.sessionDuration });
        console.log(`TSG: Reported ${window.sessionDuration}s of Shorts activity`);
        window.sessionDuration = 0; // Reset only after successful report
      } catch (e) {
        killScript();
        return;
      }
    }

    startTime = Date.now();
    if (isAlive) {
      timerId = setTimeout(reportActivity, 5000);
    }
  };

  timerId = setTimeout(reportActivity, 10000);
})();