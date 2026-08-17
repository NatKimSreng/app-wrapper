# Deployment Guide

Instructions for building and deploying the BuildHubKH mobile app to production.

## Pre-Deployment Checklist

- [ ] All Google OAuth credentials configured
- [ ] EAS project ID set up
- [ ] App version bumped in app.json
- [ ] App icon and splash screen created
- [ ] Privacy policy and terms of service ready
- [ ] Backend ready to receive push tokens
- [ ] Push notification system implemented
- [ ] Bundle IDs finalized (cannot change after store submission)

## Android Deployment

### Step 1: Generate Signing Key

```bash
# One-time: create release key
keytool -genkey -v -keystore ~/release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release

# Remember your passwords!
```

### Step 2: Get SHA-1 Fingerprint

```bash
keytool -list -v -keystore ~/release.keystore -alias release
```

Copy the SHA-1 fingerprint and update your Google OAuth credentials in Google Cloud Console.

### Step 3: Configure EAS

Update `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "keystore": {
          "keystorePath": "release.keystore",
          "keystorePassword": "your_keystore_password",
          "keyAlias": "release",
          "keyPassword": "your_key_password"
        }
      }
    }
  }
}
```

### Step 4: Build APK

```bash
npm run build:android
```

Or with specific profile:

```bash
eas build --platform android --profile production
```

### Step 5: Submit to Google Play

1. Create Google Play developer account (one-time $25)
2. Create app in Google Play Console
3. Fill in app details:
   - Title: BuildHubKH
   - Category: Productivity / Lifestyle
   - Description
   - Screenshots (at least 2)
   - Privacy policy (required)
4. Upload APK/AAB in "Release" section
5. Complete questionnaire
6. Submit for review

**Review typically takes 2-4 hours**

### Google Play Submission Checklist

- [ ] App name and description
- [ ] Minimum 2 screenshots
- [ ] Privacy policy URL
- [ ] Content rating (fill questionnaire)
- [ ] App signing configured
- [ ] Correct permissions listed
- [ ] Version number incremented
- [ ] APK/AAB file uploaded

## iOS Deployment

### Step 1: Get Apple Developer Account

- Create at [developer.apple.com](https://developer.apple.com/)
- Enroll in Apple Developer Program ($99/year)
- Create App ID and provisioning profile

### Step 2: Configure iOS Settings

Update `app.json`:

```json
{
  "ios": {
    "bundleIdentifier": "com.buildhubkh.mobile",
    "buildNumber": "1.0.0",
    "supportsTabletMode": true,
    "infoPlist": {
      "NSLocalNetworkUsageDescription": "Connect to local services",
      "NSBonjourServices": ["_http._tcp", "_https._tcp"]
    }
  }
}
```

### Step 3: Create App Store Connect Record

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com/)
2. Click "My Apps"
3. Click "+"
4. Select "New App"
5. Fill in:
   - Platform: iOS
   - Name: BuildHubKH
   - Primary Language: English
   - Bundle ID: com.buildhubkh.mobile
   - SKU: unique identifier
6. Click "Create"

### Step 4: Fill App Information

1. App Information tab:
   - App icon
   - Description
   - Keywords
   - Support URL
   - Privacy policy URL
   - Category: Productivity

2. Pricing and Availability:
   - Select countries
   - Price tier (usually Free)

3. Build:
   - Add TestFlight beta build first (recommended)
   - Then add for App Store

### Step 5: Build with EAS

```bash
# Build for testing (TestFlight)
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production
```

### Step 6: Submit to App Store

1. Create build on App Store Connect
2. Download and sign locally (if needed)
3. Submit for review

**Review typically takes 24-48 hours**

### App Store Submission Checklist

- [ ] App icon (1024x1024)
- [ ] Screenshots for all devices
- [ ] Description and keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Category selected
- [ ] Content rating completed
- [ ] App review information filled
- [ ] Minimum iOS version set
- [ ] Signing certificates configured

## Version Management

### Updating Version

Update in `app.json`:

```json
{
  "version": "1.0.0"
}
```

Semantic versioning: MAJOR.MINOR.PATCH

- MAJOR: Breaking changes
- MINOR: New features
- PATCH: Bug fixes

### Android Build Numbers

Each build needs unique versionCode (auto-incremented by EAS).

### iOS Build Numbers

Update buildNumber for each submission:

```json
{
  "ios": {
    "buildNumber": "1"  // Increment each build
  }
}
```

## Over-the-Air Updates

Using Expo's EAS Updates (optional):

```bash
# Publish update
eas update --platform android --platform ios

# On your app, users will get update automatically
```

Useful for:
- Hot fixes without app store review
- Deploying updates quickly
- A/B testing

Note: Only JavaScript code and assets can be updated. Native code changes require new app store build.

## Testing Before Release

### TestFlight (iOS)

1. Build with `--profile preview`
2. Upload to App Store Connect
3. Add internal and external testers
4. Share link with team
5. Testers install and test

### Google Play Beta

1. Build APK with `--profile preview`
2. Upload to Google Play Console
3. Create beta release channel
4. Add testers via email
5. Testers install via Play Store

### Local Testing

```bash
# Build locally for testing
npm run android  # Installs and runs on connected device
npm run ios      # Installs and runs on simulator

# Test Google login, notifications, etc.
```

## Release Process

### 1. Prepare Release

```bash
# Update version
# Update CHANGELOG.md
# Create release branch
git checkout -b release/1.0.0
```

### 2. Build

```bash
npm run build:android
npm run build:ios
```

### 3. Test

Test on real devices via TestFlight / Google Play beta

### 4. Submit

Submit to app stores

### 5. Monitor

- Monitor crash reports
- Monitor user feedback
- Be ready to hotfix

### 6. Release Notes

When submitting:

```
Version 1.0.0 - Initial Release

New:
- Google login with OAuth
- Push notifications
- WebView wrapper for BuildHubKH

Improvements:
- Android back button support
- Loading indicators
- Error handling and retry

Fixes:
- URL validation and security
```

## Production Monitoring

### Crash Reports

Enable in app.json:

```json
{
  "extra": {
    "sentry": {
      "dsn": "YOUR_SENTRY_DSN"
    }
  }
}
```

### Analytics

Track in services/notifications.ts and components/WebViewScreen.tsx:

```typescript
analytics.track('notification_received', {
  title: notification.request.content.title,
  platform: Platform.OS,
});
```

### Error Tracking

Monitor:
- WebView errors
- OAuth failures
- Push token generation failures
- Network errors

## Hotfixing Production Issues

### For JavaScript Issues

Use EAS Updates for fast deployment:

```bash
git checkout -b hotfix/issue-123
# Fix issue
npm run type-check
eas update
```

### For Native Issues

Build new version:

```bash
# Bump patch version
npm run build:android
npm run build:ios
# Submit to stores
```

## Rollback Procedure

If issues found after release:

1. **JavaScript Issue**:
   ```bash
   eas update --clear
   ```

2. **Native Issue**:
   - Remove from app store
   - Re-list old version if available
   - Build hotfix

## Backup and Secrets

### Protect Your Secrets

1. **Keystore file** (Android):
   ```bash
   # Store securely
   git ignore "release.keystore"
   # Backup to secure location
   ```

2. **Google OAuth credentials**:
   - Store in secure credential manager
   - Never commit to git
   - Use environment variables

3. **EAS credentials**:
   ```bash
   eas credentials
   ```

### Account Recovery

If you lose credentials:

1. **Android keystore**: Generate new key, contact Google Play support
2. **iOS certificates**: Revoke and create new in Apple Developer
3. **Google OAuth**: Regenerate in Google Cloud Console

## Compliance

### Privacy Policy

Required for:
- Data collection (analytics)
- Push notifications
- User authentication

Include in app and on website.

### COPPA Compliance

If app targets children under 13:
- Additional parental consent needed
- Follow COPPA rules in privacy policy

### Regional Compliance

Varies by country:
- GDPR (Europe)
- CCPA (California)
- PIPEDA (Canada)
- Others

Include language in privacy policy.

## Troubleshooting

### "App rejected by Google Play"

Common reasons:
- Privacy policy missing or incomplete
- Suspicious permissions (ask why you need each one)
- Crash on startup (test more thoroughly)
- Plagiarism/copyright issues

### "Build failed on EAS"

Check:
- TypeScript errors: `npm run type-check`
- Dependencies: `npm install`
- Logs from `eas build` command

### "Users can't download after release"

- Check app is published (not just uploaded)
- Verify targeting correct regions
- Check price tier and availability

## Timeline

- **Pre-submission**: 2-3 days (screenshots, testing)
- **Build time**: 10-20 minutes (EAS)
- **iOS review**: 24-48 hours
- **Android review**: 2-4 hours
- **Total**: 1-3 days from submission

## Post-Release

### Day 1-7
- Monitor crash reports
- Check user reviews
- Fix any critical bugs

### Week 1-2
- Gather user feedback
- Plan next features
- Monitor retention

### Ongoing
- Regular updates with new features
- Security patches
- Performance improvements

## Related Documentation

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/eas-submit/introduction/)
- [Google Play Developer Docs](https://developer.android.com/distribute)
- [App Store Developer Docs](https://developer.apple.com/app-store/)
