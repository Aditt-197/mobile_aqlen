# 📱 Aqlen Inspection App

A React Native mobile application for conducting inspections with synchronized audio recording and photo capture. Built with Expo for cross-platform compatibility.

## 🚀 Features

- **Audio Recording**: Automatic audio recording during inspections
- **Photo Capture**: Take photos with timestamps synchronized to audio
- **Review System**: Playback audio and view photos with timeline sync
- **Local Storage**: All data stored locally using SQLite database
- **Cross-Platform**: Works on both iOS and Android

## 📋 Prerequisites

Before running this app, make sure you have the following installed:

### Required Software
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Expo CLI** - Install globally with: `npm install -g @expo/cli`

### Mobile Device Setup
- **iOS**: iPhone with iOS 13 or higher
- **Android**: Android device with Android 6.0 (API level 23) or higher
- **Expo Go App**: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mobile_aqlen/apps/mobile
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm start
```

This will start the Expo development server and show a QR code in your terminal.

## 📱 Running on Your Phone

### Option 1: Using Expo Go App (Recommended for Testing)

1. **Install Expo Go** on your phone from the App Store or Google Play
2. **Open Expo Go** on your phone
3. **Scan the QR code** that appears in your terminal
4. **Wait for the app to load** (this may take a few minutes on first run)

### Option 2: Using Expo CLI Commands

#### For iOS (requires macOS and Xcode):
```bash
npm run ios
```

#### For Android (requires Android Studio and emulator):
```bash
npm run android
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Starts the Expo development server |
| `npm run ios` | Opens the app in iOS simulator |
| `npm run android` | Opens the app in Android emulator |
| `npm run web` | Opens the app in web browser |
| `npm test` | Runs the test suite |
| `npm run test:watch` | Runs tests in watch mode |
| `npm run test:coverage` | Runs tests with coverage report |

## 📱 App Usage Guide

### 1. Starting an Inspection
- Tap **"Start New Inspection"** on the home screen
- Audio recording begins automatically
- You'll be taken to the camera screen

### 2. Taking Photos
- Use the **camera button** (white circle) to take photos
- Each photo is automatically timestamped with the audio position
- Photos are saved locally and synced with the audio timeline

### 3. Stopping the Inspection
- Tap **"Stop Inspection"** to end the recording
- You'll be taken to the review screen

### 4. Reviewing Your Inspection
- **Play Audio**: Tap the play button to listen to the recording
- **View Photos**: Scroll through captured photos
- **Photo-Audio Sync**: Tap any photo to jump to that moment in the audio
- **Timeline Navigation**: Photos highlight when their timestamp is reached

## 🔐 Permissions Required

The app requires the following permissions:

- **Camera**: To take inspection photos
- **Microphone**: To record audio during inspections
- **Storage**: To save photos and audio files locally

Permissions will be requested automatically when you first use these features.

## 🏗️ Project Structure

```
apps/mobile/
├── App.tsx                 # Main app component
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── src/
    ├── contexts/          # React Context for state management
    │   └── RecordingContext.tsx
    ├── database/          # SQLite database operations
    │   └── index.ts
    ├── screens/           # Main app screens
    │   ├── CameraScreen.tsx
    │   └── ReviewScreen.tsx
    ├── types/             # TypeScript type definitions
    │   └── index.ts
    └── utils/             # Utility functions
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Metro bundler" not starting
```bash
# Clear Metro cache
npx expo start --clear
```

#### 2. App not loading on phone
- Make sure your phone and computer are on the same WiFi network
- Try switching between WiFi and mobile data
- Restart the Expo Go app

#### 3. Camera not working
- Check camera permissions in your phone's settings
- Make sure the Expo Go app has camera access

#### 4. Audio recording issues
- Check microphone permissions
- Make sure your phone's volume is not muted
- Try restarting the app

#### 5. Photos not saving
- Check storage permissions
- Make sure you have enough storage space on your device

### Development Issues

#### Clear all caches:
```bash
npx expo start --clear
npm start -- --reset-cache
```

#### Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

## 📊 Technical Details

### Dependencies
- **React Native**: 0.79.5
- **Expo**: 53.0.17
- **React**: 19.0.0
- **TypeScript**: 5.8.3

### Key Libraries
- **expo-av**: Audio recording and playback
- **expo-camera**: Camera functionality
- **expo-sqlite**: Local database storage
- **expo-file-system**: File management
- **expo-audio**: Audio processing

### Database Schema
The app uses SQLite to store:
- Inspection details (client, address, claim number, etc.)
- Photo metadata (URI, timestamp, audio timestamp)
- Audio file paths

## 🚀 Building for Production

### For iOS App Store:
```bash
npx expo build:ios
```

### For Google Play Store:
```bash
npx expo build:android
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the Expo documentation: [docs.expo.dev](https://docs.expo.dev)
3. Check React Native documentation: [reactnative.dev](https://reactnative.dev)

---
