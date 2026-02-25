// Unified External Listener
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log("📥 External Message:", request.type);

  if (request.type === "WALLET_SYNC" || request.type === "WALLET_CONNECTED") {
    const dataToSave = {
      starknet_address: request.address,
      starknet_pubkey: request.pubKey,
      is_connected: true,
      last_sync: Date.now()
    };
    chrome.storage.local.set(dataToSave, () => {
      chrome.runtime.sendMessage({ type: "UI_REFRESH" });
      sendResponse({ success: true });
    });
    return true;
  }

  // Handle transaction signing...
  if (request.type === "SIGN_TX") {
    chrome.storage.local.set({
      tx_request: request.tx,
      tx_status: "pending"
    }, async () => {
      let txStatus = "pending";
      try {
        chrome.tabs.query({ url: "http://localhost:5173/*" }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: "EXECUTE_TX",
              tx: request.tx
            }, (response) => {
              txStatus = response && response.success ? "success" : "fail";
              chrome.storage.local.set({ tx_status: txStatus });
              sendResponse({ success: txStatus === "success" });
            });
          } else {
            txStatus = "fail";
            chrome.storage.local.set({ tx_status: txStatus });
            sendResponse({ success: false });
          }
        });
      } catch (e) {
        txStatus = "fail";
        chrome.storage.local.set({ tx_status: txStatus });
        sendResponse({ success: false });
      }
    });
    return true;
  }
});

// Listen for messages from the web DApp (localhost:5173)
// This allows the side panel to open when the user clicks the extension icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// --- YOUTUBE SHORTS ACTIVITY RELAY ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "YOUTUBE_ACTIVITY") {
    chrome.storage.local.get(['starknet_address'], async (res) => {
      if (!res.starknet_address) return;
      try {
        const response = await fetch('http://localhost:3001/api/data/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            durationSeconds: message.duration,
            address: res.starknet_address
          })
        });
        const data = await response.json();
        // Save the new real-time values to storage
        chrome.storage.local.set({
          realtime_stats: data.stats
        }, () => {
          // Tell Sidebar to update its view
          chrome.runtime.sendMessage({ type: "UI_REFRESH" });
        });
      } catch (err) {
        console.error("Failed to sync activity to server:", err);
      }
    });
  }
});

// ...existing code...
// Background Service Worker for Touch Some Grass Extension


const STORAGE_KEYS = {
  DAILY_GOAL: 'dailyGoal',
  SCREEN_TIME: 'screenTime',
  BREAK_INTERVAL: 'breakInterval',
  TODAY_DATE: 'todayDate',
  DAILY_LOG: 'dailyLog',
  LAST_BREAK_TIME: 'lastBreakTime',
};

// Initialize storage with defaults
async function initializeStorage() {
  const data = await chrome.storage.local.get(null);
  const today = new Date().toDateString();

  if (!data[STORAGE_KEYS.DAILY_GOAL]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.DAILY_GOAL]: 180 }); // 3 hours default
  }

  if (!data[STORAGE_KEYS.BREAK_INTERVAL]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.BREAK_INTERVAL]: 30 }); // 30 minutes default
  }

  if (data[STORAGE_KEYS.TODAY_DATE] !== today) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SCREEN_TIME]: 0,
      [STORAGE_KEYS.TODAY_DATE]: today,
      [STORAGE_KEYS.DAILY_LOG]: [],
    });
  }
}

// Track active tab for screen time
let lastActiveTime = Date.now();
let isTracking = true;

chrome.tabs.onActivated.addListener(async () => {
  isTracking = true;
  lastActiveTime = Date.now();
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    isTracking = false;
  } else {
    isTracking = true;
    lastActiveTime = Date.now();
  }
});

// Update screen time every minute
setInterval(async () => {
  if (!isTracking) return;

  const data = await chrome.storage.local.get([
    STORAGE_KEYS.SCREEN_TIME,
    STORAGE_KEYS.DAILY_GOAL,
    STORAGE_KEYS.LAST_BREAK_TIME,
    STORAGE_KEYS.BREAK_INTERVAL,
  ]);

  const currentTime = data[STORAGE_KEYS.SCREEN_TIME] || 0;
  const dailyGoal = data[STORAGE_KEYS.DAILY_GOAL] || 180;
  const lastBreakTime = data[STORAGE_KEYS.LAST_BREAK_TIME] || 0;
  const breakInterval = data[STORAGE_KEYS.BREAK_INTERVAL] || 30;

  // Add 1 minute to screen time
  const newScreenTime = currentTime + 1;

  // Check if break notification is needed
  if (newScreenTime - lastBreakTime >= breakInterval * 60 && newScreenTime > 0) {
    notifyBreakTime(newScreenTime, dailyGoal);
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_BREAK_TIME]: newScreenTime * 60,
    });
  }

  // Check if goal exceeded
  if (newScreenTime >= dailyGoal && currentTime < dailyGoal) {
    notifyGoalExceeded(dailyGoal);
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.SCREEN_TIME]: newScreenTime,
  });

  // Update badge
  updateBadge(newScreenTime, dailyGoal);
}, 60000);

// Update badge on extension icon
async function updateBadge(screenTime, dailyGoal) {
  const percentage = Math.min(Math.round((screenTime / dailyGoal) * 100), 100);
  const displayText =
    percentage > 100 ? '100+' : percentage === 0 ? '0' : Math.round(percentage / 10) * 10 + '';

  await chrome.action.setBadgeText({ text: displayText });

  let badgeColor = '#10b981'; // Emerald green for good
  if (percentage >= 80) badgeColor = '#ef4444'; // Red for exceeded
  else if (percentage >= 60) badgeColor = '#f59e0b'; // Amber for warning

  await chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

// Send break time notification
function notifyBreakTime(screenTime, dailyGoal) {
  const hours = Math.floor(screenTime / 60);
  const minutes = screenTime % 60;

  chrome.notifications.create('break-notification', {
    type: 'basic',
    iconUrl: '/icons/icon-128.png',
    title: 'Time for a Break!',
    message: `You've been using your device for ${hours}h ${minutes}m. Take a moment to touch some grass! 🌿`,
    priority: 1,
  });
}

// Send goal exceeded notification
function notifyGoalExceeded(dailyGoal) {
  const hours = Math.floor(dailyGoal / 60);
  const minutes = dailyGoal % 60;

  chrome.notifications.create('goal-exceeded-notification', {
    type: 'basic',
    iconUrl: '/icons/icon-128.png',
    title: 'Daily Goal Exceeded',
    message: `You've exceeded your daily goal of ${hours}h ${minutes}m. Time to go outside! 🌱`,
    priority: 2,
  });
}

// Listen for extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  await initializeStorage();
  console.log('Touch Some Grass extension installed!');
});

// Initialize on startup
initializeStorage();
