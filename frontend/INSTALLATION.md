# Touch Some Grass - Browser Extension Installation Guide

## Overview
Touch Some Grass is a lightweight screen time monitor browser extension that encourages healthy digital habits by tracking device usage and suggesting outdoor breaks.

## Features
- Real-time screen time tracking
- Customizable daily goals (1-6 hours)
- Break reminders at configurable intervals
- Visual progress indicator with status alerts
- Local storage (no data collection)
- Works offline

## Installation

### Chrome / Chromium-based Browsers (Chrome, Edge, Brave, Vivaldi)

1. **Build the extension:**
   ```bash
   npm install
   npm run build
   ```

2. **Load the extension:**
   - Open `chrome://extensions/` in your browser
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Navigate to `/vercel/share/v0-project/public` and select it
   - The extension will appear in your extensions list

3. **Pin the extension:**
   - Click the puzzle icon in your toolbar
   - Click the pin next to "Touch Some Grass"

### Firefox

1. **Build the extension:**
   ```bash
   npm install
   npm run build
   ```

2. **Load for development:**
   - Open `about:debugging#/runtime/this-firefox` in your browser
   - Click "Load Temporary Add-on"
   - Navigate to `/vercel/share/v0-project/public/manifest.json`
   - The extension will load (temporarily until you restart Firefox)

### Safari

1. For Safari support, you'll need to:
   - Convert the manifest to Safari format
   - Use Xcode to build the extension
   - Details: https://developer.apple.com/documentation/safariservices/safari_web_extensions

## Usage

### Basic Usage
1. Click the "Touch Some Grass" icon in your browser toolbar
2. View your current screen time and daily progress
3. Set your daily goal in Settings
4. Configure break reminder intervals

### Keyboard Shortcut
- **Windows/Linux:** `Ctrl+Shift+G`
- **Mac:** `Cmd+Shift+G`

### Settings
- **Daily Goal:** Choose from 1h, 2h, 3h, 4h, 5h, or 6h
- **Break Reminders:** Get notifications every 15, 30, 45, or 60 minutes of screen time
- Settings are saved automatically to your browser's local storage

## How It Works

### Screen Time Tracking
- The extension monitors when your browser window is active
- Tracks time in 1-minute intervals
- Resets daily at midnight
- All data is stored locally on your device

### Break Notifications
- Desktop notifications appear at your configured intervals
- Status indicator (badge) on the extension icon shows usage percentage
- Color codes: Green (good) → Amber (warning) → Red (exceeded)

### Privacy
- No data is sent to external servers
- All tracking happens locally on your device
- No cookies or tracking pixels
- You can reset data anytime

## Troubleshooting

### Extension not tracking time
- Ensure the browser window is in focus
- Check that the extension has the necessary permissions (granted during installation)
- Try opening the popup and clicking "Reset Screen Time"

### Notifications not appearing
- Check your browser notification settings
- Ensure notifications are enabled in your OS
- Try adjusting the break reminder interval

### Data not saving
- Clear browser cache and try again
- Check if your browser allows local storage for extensions
- Ensure you have sufficient disk space

## FAQ

**Q: Is my data shared?**
A: No, all data stays on your device. Nothing is sent to external servers.

**Q: Can I use it across multiple devices?**
A: Currently, data is device-specific. Each browser installation tracks separately.

**Q: What if I want to pause tracking?**
A: You can manually reset the screen time counter anytime from the popup.

**Q: Does it work on all websites?**
A: It tracks all time your browser is active, regardless of website.

**Q: Can I export my data?**
A: Future versions will include data export. For now, tracking is local-only.

## Support

For issues or feature requests:
1. Check this guide first
2. Verify all extension permissions are granted
3. Try resetting the extension data

## Development

To contribute or modify:

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build
```

Files:
- `manifest.json` - Extension configuration
- `popup.js` - Main UI component
- `background.js` - Service worker for tracking
- `popup.html` - Popup template

## License

MIT License - Feel free to use and modify for personal or commercial use.

---

**Remember:** Balance is key. Take regular breaks and enjoy nature! 🌿
