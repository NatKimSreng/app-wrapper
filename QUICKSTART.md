# Quick Start Guide

Get the BuildHubKH mobile app running in 5 minutes.

## 1. Install Dependencies

```bash
cd app-wrapper
npm install
```

Or with Bun:
```bash
bun install
```

## 2. Get Google OAuth Credentials

See `GOOGLE_OAUTH_SETUP.md` for detailed steps. You need:

- **iOS Client ID**: `your_ios_client_id.apps.googleusercontent.com`
- **Android Client ID**: `your_android_client_id.apps.googleusercontent.com`

## 3. Update Configuration

Edit `app.json` and update:

```json
{
  "extra": {
    "googleClientId": {
      "ios": "PASTE_IOS_CLIENT_ID",
      "android": "PASTE_ANDROID_CLIENT_ID"
    },
    "eas": {
      "projectId": "PASTE_EAS_PROJECT_ID"
    }
  }
}
```

## 4. Start Development Server

```bash
npm start
```

You'll see a QR code in the terminal.

## 5. Test on Device

### Using Expo Go App

1. Download "Expo Go" app on your phone
2. Scan the QR code from terminal
3. App will load
4. Test by opening WebView

### Using Development Build

For better testing of Google OAuth:

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## 6. Test Google Login

1. Open BuildHubKH website inside app
2. Click "Login with Google"
3. System browser should open
4. Complete Google login
5. Redirect back to app
6. Should be logged in inside WebView

## 7. Setup Push Notifications (Optional)

1. Get your EAS project ID from `eas.json`
2. Send your push token to backend
3. Backend can then send notifications

See `BACKEND_INTEGRATION.md` for push notification setup.

## Next Steps

- Read `README.md` for full feature list
- Read `BACKEND_INTEGRATION.md` for backend integration
- See `GOOGLE_OAUTH_SETUP.md` for detailed OAuth setup
- Check `DEPLOYMENT.md` for production builds

## Troubleshooting

**App won't load:**
- Check internet connection
- Verify `https://buildhubkh.com` is accessible
- Check console logs: `npm start` shows all logs

**Google Login shows blank screen:**
- This is normal! The system browser opens (you might not see it immediately)
- Look for browser window/tab
- Or check your phone's open apps

**Push notifications not working:**
- Test on real device (not simulator)
- Confirm notifications permission is granted
- Verify backend is sending to correct token

## Common Commands

```bash
# Start dev server
npm start

# Type check
npm run type-check

# Run on Android
npm run android

# Run on iOS
npm run ios

# Build for production
npm run build:android
npm run build:ios

# Preview build on device
npm run preview:android
npm run preview:ios
```

## File Structure Overview

```
app-wrapper/
├── app/                           # App navigation & layouts
│   ├── _layout.tsx               # Root layout, notification setup
│   └── index.tsx                 # Main screen
├── components/
│   └── WebViewScreen.tsx         # WebView with Google auth
├── services/
│   ├── googleAuth.ts             # Google OAuth flow
│   └── notifications.ts          # Push notifications
├── utils/
│   └── url.ts                    # URL validation
├── README.md                      # Full documentation
├── GOOGLE_OAUTH_SETUP.md         # Google OAuth guide
├── BACKEND_INTEGRATION.md        # Backend integration
└── DEPLOYMENT.md                 # Deployment guide
```

## Key Features

✅ WebView wrapper for BuildHubKH  
✅ Google login with OAuth  
✅ Push notifications  
✅ Android back button support  
✅ Error handling & retry  
✅ TypeScript support  
✅ EAS builds ready  

## Support

See README.md for detailed documentation and troubleshooting guides.
