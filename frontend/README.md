# Touch Some Grass 🌿

A lightweight, privacy-first browser extension that monitors your screen time and encourages healthy digital habits through intelligent break reminders and nature-inspired design.

## Features

✨ **Real-Time Tracking** - Monitor screen time as you browse  
⏰ **Smart Reminders** - Customizable break notifications  
🎯 **Daily Goals** - Set targets from 1-6 hours  
🌱 **Nature-Inspired Design** - Beautiful glassmorphism UI  
🔒 **Privacy First** - All data stays on your device  
⚡ **Lightweight** - Minimal performance impact  
🎨 **Visual Feedback** - Color-coded progress indicators  

## Quick Start

### For Users
1. Clone or download this repository
2. Follow the [Installation Guide](INSTALLATION.md) for your browser
3. Click the extension icon and set your daily goal
4. Start getting reminders to touch some grass!

### For Developers
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview the build
npm run preview
```

## Project Structure

```
├── public/
│   ├── manifest.json          # Extension configuration
│   ├── popup.html             # Popup UI template
│   ├── popup.js               # React popup component
│   ├── background.js          # Service worker for tracking
│   └── icons/                 # Extension icons (16, 48, 128px)
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Main app component
│   ├── index.css             # Global styles
│   └── components/           # React components
├── vite.config.ts            # Vite configuration
├── tailwind.config.ts        # Tailwind configuration
├── INSTALLATION.md           # Detailed installation guide
└── README.md                 # This file
```

## Browser Support

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Brave
- ✅ Vivaldi
- ✅ Firefox 109+
- ⚠️ Safari (requires additional setup)

## Technology Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Chrome Extensions API** - Extension functionality

## How It Works

### Tracking
The extension monitors your browser's active state and:
- Increments screen time every minute when the window is focused
- Resets daily at midnight
- Stores all data locally using Chrome's storage API

### Notifications
- Desktop notifications remind you to take breaks at configured intervals
- Badge on the extension icon shows usage percentage
- Status colors: Green (0-59%) → Amber (60-99%) → Red (100%+)

### Settings
- Daily goal: 1-6 hours
- Break intervals: 15, 30, 45, or 60 minutes
- Automatic data reset each day
- Manual reset option available

## Privacy & Security

🔐 **No Data Collection** - Your usage data never leaves your device  
🔐 **No Tracking** - No external connections for analytics  
🔐 **Local Storage Only** - Uses browser's local storage API  
🔐 **Open Source** - Review the code anytime  

## Customization

### Daily Goals
Choose from preset options or modify in settings:
- 1 hour (Light browsing)
- 2 hours (Moderate use)
- 3 hours (Standard)
- 4 hours (Heavy use)
- 5 hours (Very heavy)
- 6 hours (All-day)

### Break Reminders
Get reminders every:
- 15 minutes (Strict mode)
- 30 minutes (Balanced)
- 45 minutes (Relaxed)
- 60 minutes (Minimal)

## Keyboard Shortcuts

| OS | Shortcut |
|---|---|
| Windows | `Ctrl + Shift + G` |
| Mac | `Cmd + Shift + G` |
| Linux | `Ctrl + Shift + G` |

## FAQs

**Q: Will this slow down my browser?**  
A: No, it's extremely lightweight and uses less than 1MB memory.

**Q: Can I sync data across devices?**  
A: Currently, data is stored per-device. Future versions may add cloud sync.

**Q: Does it work in private/incognito mode?**  
A: Yes, but data won't persist across sessions in incognito.

**Q: Can I disable tracking temporarily?**  
A: Yes, click "Reset Screen Time" to start fresh anytime.

**Q: What if I want to share my usage data?**  
A: Future versions will include export functionality.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See LICENSE file for details.

## Credits

- Logo design: Tech-meets-nature glassmorphism aesthetic
- Icons: Lucide React
- Built with: React, Vite, Tailwind CSS

## Support

Having issues? Check the [Installation Guide](INSTALLATION.md) or:
- Review browser permissions
- Ensure local storage is enabled
- Try resetting the extension data
- Clear browser cache

---

**Remember:** Balance is key. Take regular breaks and enjoy nature! 🌿

Last updated: 2024
