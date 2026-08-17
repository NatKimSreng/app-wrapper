# BuildHubKH Mobile App

A WebView wrapper for [BuildHubKH](https://buildhubkh.com) built with Expo SDK 54, React Native, and TypeScript.

## Architecture

This is a **WebView wrapper** that loads the complete BuildHubKH website inside a native mobile shell. The native layer provides:

- **Google OAuth Login** - OAuth flow using system browser for reliable authentication
- **Push Notifications** - Expo push notifications with deep linking support
- **Platform Integration** - Android back button, iOS swipe gestures, native error handling

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- iOS: Mac with Xcode
- Android: Android Studio

## Setup

### 1. Install Dependencies

```bash
cd app-wrapper
npm install
# or
bun install
```

### 2. Configure Google OAuth

#### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **iOS**: Create OAuth 2.0 Client ID (iOS)
   - **Android**: Create OAuth 2.0 Client ID (Android)

#### Configure Deep Links

For Google OAuth redirect to work, you need to configure deep links:

**iOS** (`app.json`):
```json
{
  "ios": {
    "scheme": "buildhubkh"
  }
}
```

**Android** (`app.json`):
```json
{
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "data": {
          "scheme": "buildhubkh"
        }
      }
    ]
  }
}
```

#### Update Configuration

Update `app.json` with your credentials:

```json
{
  "extra": {
    "googleClientId": {
      "ios": "YOUR_GOOGLE_CLIENT_ID_IOS.apps.googleusercontent.com",
      "android": "YOUR_GOOGLE_CLIENT_ID_ANDROID.apps.googleusercontent.com"
    },
    "eas": {
      "projectId": "YOUR_EAS_PROJECT_ID"
    }
  }
}
```

### 3. Setup EAS (for builds)

```bash
eas init
```

This will prompt you to create an EAS project. Update `eas.json` with your project ID in `app.json`.

### 4. Configure Push Notifications

1. In `app.json`, ensure `eas.projectId` is set
2. The backend should send notifications to this format:

```json
{
  "to": "EXPO_PUSH_TOKEN",
  "sound": "default",
  "title": "Title",
  "body": "Message",
  "data": {
    "url": "https://buildhubkh.com/path/to/page"
  }
}
```

## Development

### Start Dev Server

```bash
npm start
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

### Type Check

```bash
npm run type-check
```

## Building

### Android Build

```bash
npm run build:android
```

### iOS Build

```bash
npm run build:ios
```

## Project Structure

```
app-wrapper/
├── app/
│   ├── _layout.tsx          # Root layout with notification setup
│   └── index.tsx            # Main screen
├── components/
│   └── WebViewScreen.tsx    # WebView component with auth/notifications
├── services/
│   ├── googleAuth.ts        # Google OAuth flow
│   └── notifications.ts     # Push notification handling
├── utils/
│   └── url.ts               # URL validation and security
├── app.json                 # Expo configuration
├── eas.json                 # EAS build configuration
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## Features

### Google Login
- Uses system browser (not WebView) to avoid cookie issues
- OAuth flow with proper token exchange
- Cookies preserved in WebView after login
- Works on both Android and iOS

### Push Notifications
- Requests permission on app start
- Gets Expo push token
- Sends token to backend: `POST /api/mobile/push-token`
- Handles foreground and background notifications
- Deep links to BuildHubKH pages via `data.url`

### WebView Security
- Only allows navigation to `https://buildhubkh.com`
- HTTPS only (blocks HTTP)
- DOM storage and cookies enabled
- JavaScript enabled
- No file access
- Prevents external navigation

### Android Back Button
- Goes back in WebView history if available
- Exits app if no history

### Error Handling
- Shows error message if website fails to load
- Retry button to reload
- Loading indicator during page load

## Environment Variables

Create a `.env` file (optional):

```
EXPO_PUBLIC_BACKEND_URL=https://api.buildhubkh.com
```

Or configure in `app.json` under `extra.backendUrl`.

## Important Notes

### Security

⚠️ **Never expose secrets in the Expo app**:
- Google Client Secret should NOT be in the app
- Backend API secrets should NOT be in the app
- Use proper OAuth flows that don't require client secrets in the app

### WebView Cookies

The WebView maintains its own cookie jar. After Google login:
1. User is authenticated in system browser
2. Browser redirects to deep link
3. WebView loads https://buildhubkh.com
4. Server should recognize the user via existing session/cookies

If this doesn't work, BuildHubKH backend needs to:
- Support token-based authentication, OR
- Use server-side session that works across browsers, OR
- Pass authentication token via deep link to WebView

### Testing Locally

1. Create a test Google OAuth project
2. Add localhost as authorized redirect
3. Run `npm start`
4. Use `expo` app on phone to test

## Troubleshooting

### Google Login Not Working
- Check bundle ID matches Google OAuth config
- Verify deep link scheme is correct
- Check if Google blocks WebView authentication (it does - use system browser)

### Push Notifications Not Working
- Ensure you're on a real device (not simulator)
- Check notification permissions are granted
- Verify EAS project ID is correct
- Check backend is sending to correct token

### WebView Blank/White Screen
- Check network connection
- Verify https://buildhubkh.com is accessible
- Look for CORS issues
- Check console logs in dev tools

## Support

For issues with:
- **Google OAuth**: See [expo-auth-session](https://docs.expo.dev/auth-session/overview/)
- **Notifications**: See [expo-notifications](https://docs.expo.dev/notifications/overview/)
- **WebView**: See [react-native-webview](https://react-native-webview.js.org/)

## License

BuildHubKH Mobile App © 2024
