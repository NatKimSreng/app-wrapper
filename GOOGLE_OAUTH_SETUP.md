# Google OAuth Setup Guide

This guide walks through setting up Google OAuth for the BuildHubKH mobile app.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name: `BuildHubKH Mobile`
5. Click "CREATE"
6. Wait for project to be created

## Step 2: Enable Google+ API

1. In the Cloud Console, go to APIs & Services → Library
2. Search for "Google+ API"
3. Click on it
4. Click "ENABLE"

## Step 3: Create OAuth Consent Screen

1. Go to APIs & Services → OAuth consent screen
2. Select "External" user type
3. Click "CREATE"
4. Fill in the form:
   - **App name**: BuildHubKH
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
5. Click "SAVE AND CONTINUE"
6. On Scopes page, click "ADD OR REMOVE SCOPES"
7. Add these scopes:
   - `openid`
   - `email`
   - `profile`
8. Click "UPDATE"
9. Click "SAVE AND CONTINUE"
10. Review and click "BACK TO DASHBOARD"

## Step 4: Create iOS OAuth Credentials

1. Go to APIs & Services → Credentials
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. Select "iOS"
4. Fill in:
   - **Name**: BuildHubKH iOS
   - **Bundle ID**: `com.buildhubkh.mobile` (from app.json)
   - **Team ID**: [Get from Apple Developer Account]
5. Note the **Client ID** (format: `xxx.apps.googleusercontent.com`)
6. Click "CREATE"

### Get iOS Team ID

1. Go to [Apple Developer Account](https://developer.apple.com/)
2. Go to Account → Team ID
3. Copy your Team ID

## Step 5: Create Android OAuth Credentials

1. Go to APIs & Services → Credentials
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. Select "Android"
4. Fill in:
   - **Name**: BuildHubKH Android
   - **Package name**: `com.buildhubkh.mobile` (from app.json)
   - **SHA-1 certificate fingerprint**: [See below]
5. Note the **Client ID**
6. Click "CREATE"

### Get Android SHA-1 Fingerprint

Build the app first and get the certificate fingerprint:

```bash
# Development build
expo prebuild --platform android

# Get SHA-1 from keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Or use a temporary certificate for testing:

```bash
# Generate a test key
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias release

# View the key
keytool -list -v -keystore release.keystore -alias release
```

For production, use your actual signing key certificate fingerprint.

## Step 6: Configure the App

Update `app.json`:

```json
{
  "expo": {
    "extra": {
      "googleClientId": {
        "ios": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
        "android": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com"
      },
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    },
    "ios": {
      "bundleIdentifier": "com.buildhubkh.mobile"
    },
    "android": {
      "package": "com.buildhubkh.mobile"
    }
  }
}
```

## Step 7: Configure Deep Links

Deep links are required for OAuth redirect to work.

### iOS Deep Links

Add to `app.json`:

```json
{
  "ios": {
    "scheme": "buildhubkh"
  }
}
```

### Android Deep Links

Add to `app.json`:

```json
{
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": {
          "scheme": "https",
          "host": "buildhubkh.com"
        }
      },
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

## Step 8: Test Google Login

### On Development Device

1. Start dev server: `npm start`
2. Open Expo app on your phone
3. Scan QR code
4. App should load
5. Trigger Google login (usually through BuildHubKH website)
6. System browser should open with Google login
7. After successful login, should redirect back to app

### Debug Tips

- Check console logs: `npm start` will show logs
- Check browser console: System browser will show JS errors
- Verify redirect URL is correct in `services/googleAuth.ts`
- Ensure bundle IDs match app.json exactly

## Step 9: Configure for Production Builds

### iOS

1. Create App Store Connect app
2. Get real Team ID from Apple Developer
3. Get production signing certificate
4. Update app.json with real bundle ID
5. Rebuild OAuth credentials with real bundle ID and team ID

### Android

1. Generate production signing key:
```bash
keytool -genkey -v -keystore ~/release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release
```

2. Get SHA-1 fingerprint:
```bash
keytool -list -v -keystore ~/release.keystore -alias release
```

3. Create OAuth credentials with production SHA-1
4. Configure in eas.json:

```json
{
  "build": {
    "production": {
      "android": {
        "keystore": {
          "keystorePath": "~/release.keystore",
          "keystorePassword": "YOUR_PASSWORD",
          "keyAlias": "release",
          "keyPassword": "YOUR_PASSWORD"
        }
      }
    }
  }
}
```

## Troubleshooting

### "Invalid OAuth Redirect URI"
- Ensure redirect scheme matches app.json
- Verify bundle ID and package name match exactly
- Check certificate fingerprints (Android)

### "Access Blocked: This app isn't verified"
- This is expected in development
- Click "Advanced" → "Go to BuildHubKH Mobile (unsafe)"
- Or configure OAuth consent screen as "Internal" for testing

### Google Login Not Working in WebView
- This is expected! Google blocks auth inside WebView
- Using system browser is the correct approach
- See `services/googleAuth.ts`

### "Authorization Failed"
- Check internet connection
- Verify Google OAuth is enabled in Google Cloud
- Check OAuth consent screen is published
- Verify scopes are correct

## BuildHubKH Backend Integration

The backend needs to support token-based auth or server-side sessions:

### Option 1: Token-Based Auth

1. Mobile app gets OAuth token from Google
2. Sends token to BuildHubKH backend
3. Backend validates with Google and creates session
4. Returns session cookie/token to mobile app
5. Mobile app sets cookie in WebView

### Option 2: Server-Side Session

1. Mobile app completes OAuth with Google
2. Browser (system browser) sets Google session cookies
3. Browser redirects to deep link
4. Mobile app loads BuildHubKH
5. Server recognizes user from existing session

Current implementation assumes **Option 2** - the backend recognizes the user via existing session cookies after redirect from Google authentication.

## More Information

- [Expo Auth Session Docs](https://docs.expo.dev/auth-session/overview/)
- [Expo Web Browser Docs](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [React Native WebView](https://react-native-webview.js.org/)
