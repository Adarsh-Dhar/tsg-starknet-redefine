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

  let port = null;
  let startTime = Date.now();
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  let lastReconnectTime = 0;
  let pendingMessage = null;

  // 2. Define the connect function BEFORE calling it
  const connect = (retryCount = 0) => {
    // Check if context is still valid before attempting connection
    if (!isContextValid()) {
      console.warn("TSG: Extension context is invalid. Cannot connect.");
      window.__TSG_CONTENT_RUNNING = false;
      return;
    }
    
    try {
      port = chrome.runtime.connect({ name: "content-keepalive" });
      window.__TSG_PORT_ACTIVE = true;
      reconnectAttempts = 0; // Reset on successful connection
      console.log("✅ TSG: Connected to background script.");

      port.onDisconnect.addListener(() => {
        window.__TSG_CONTENT_RUNNING = false;
        window.__TSG_PORT_ACTIVE = false;
        console.warn("⚠️ TSG: Port disconnected. Will attempt to reconnect on next activity.");
        port = null; // Clear the port reference
        
        // If we have a pending message, save it for retry
        // Don't retry immediately - wait for next reportActivity cycle
      });

      port.onMessage.addListener((msg) => {
        if (msg.type === "EXTENSION_RELOADED") {
          console.warn("TSG: Extension reloaded. Reconnecting...");
          window.__TSG_INITIALIZED = false;
          connect();
        } else if (msg.type === "PONG") {
          console.log("TSG: Received pong from background.");
        }
      });
      
      // Send initial ping to confirm connection
      try {
        port.postMessage({ type: "PING" });
      } catch (e) {
        console.error("TSG: Failed to send initial ping:", e.message);
      }
    } catch (e) {
      window.__TSG_CONTENT_RUNNING = false;
      window.__TSG_PORT_ACTIVE = false;
      port = null;
      console.error("TSG: Failed to connect to background:", e.message);
    }
  };

  // 3. Define the reportActivity logic with better error handling
  const reportActivity = () => {
    const delta = Math.floor((Date.now() - startTime) / 1000);
    const isShorts = window.location.href.includes('/shorts/');

    // Only log heartbeat on Shorts pages to reduce noise
    if (isShorts) {
      console.log(`TSG Heartbeat: [Time: ${delta}s] [Port: ${!!port}] [Reconnects: ${reconnectAttempts}]`);
    }

    if (isShorts && delta >= 5) {
      // If port is not active, attempt to reconnect
      if (!port || !window.__TSG_PORT_ACTIVE) {
        const now = Date.now();
        // Rate limit reconnection attempts to once per 2 seconds
        if (now - lastReconnectTime > 2000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          console.log("TSG: Port inactive. Attempting to reconnect...");
          lastReconnectTime = now;
          reconnectAttempts++;
          connect();
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.warn("TSG: Max reconnection attempts reached. Will retry in next cycle.");
          // Don't give up forever - reset counter after a long time
          if (now - lastReconnectTime > 30000) {
            reconnectAttempts = 0;
            lastReconnectTime = now;
          }
        }
        // Schedule next report and exit early
        setTimeout(reportActivity, 5000);
        return;
      }

      console.log(`%c TSG: Reporting ${delta}s of brainrot... `, "color: #10b981; font-weight: bold;");
      try {
        // Double-check context validity before sending
        if (!isContextValid()) {
          throw new Error("Extension context invalidated");
        }
        
        port.postMessage({ type: "YOUTUBE_ACTIVITY", duration: delta });
        startTime = Date.now();
        reconnectAttempts = 0; // Reset on successful send
        pendingMessage = null; // Clear pending message
      } catch (e) {
        console.error("TSG: Failed to postMessage:", e.message);
        
        // Save the message for retry
        pendingMessage = { type: "YOUTUBE_ACTIVITY", duration: delta };
        
        // Invalidate port and reset for reconnection
        port = null;
        window.__TSG_PORT_ACTIVE = false;
        
        // Check if we should attempt reconnection
        if (isContextValid() && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const now = Date.now();
          if (now - lastReconnectTime > 2000) {
            console.log("TSG: Attempting to reconnect after postMessage failure...");
            lastReconnectTime = now;
            reconnectAttempts++;
            connect();
            
            // Try to resend pending message after reconnect
            setTimeout(() => {
              if (port && window.__TSG_PORT_ACTIVE && pendingMessage) {
                try {
                  port.postMessage(pendingMessage);
                  pendingMessage = null;
                  console.log("TSG: Successfully sent pending message after reconnect.");
                } catch (err) {
                  console.error("TSG: Failed to resend pending message:", err.message);
                }
              }
            }, 500);
          }
        } else if (!isContextValid()) {
          console.warn("TSG: Extension context is no longer valid. Stopping activity tracking.");
          window.__TSG_CONTENT_RUNNING = false;
        }
      }
    }
    
    // Schedule next report
    setTimeout(reportActivity, 5000);
  };

  // 4. Initialize execution
  connect();
  setTimeout(reportActivity, 2000);
})();