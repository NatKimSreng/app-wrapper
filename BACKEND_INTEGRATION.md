# Backend Integration Guide

This guide explains how to integrate the BuildHubKH backend with the mobile app for OAuth and push notifications.

## OAuth Integration

### User Flow

1. **Mobile App Opens BuildHubKH Website**
   - WebView loads `https://buildhubkh.com`
   
2. **User Clicks "Login with Google"**
   - BuildHubKH website detects mobile user
   - Shows Google login button
   
3. **Mobile App Opens System Browser for OAuth**
   - App intercepts navigation to Google
   - Opens system browser instead of WebView
   - User completes Google login in browser
   
4. **Browser Redirects Back to App**
   - After OAuth success, browser redirects to: `buildhubkh://oauth/google/callback?code=...`
   - Mobile app receives deep link
   
5. **WebView Loads BuildHubKH with Session**
   - WebView loads `https://buildhubkh.com`
   - Server recognizes existing user session/cookies
   - User is logged in inside WebView

### Backend Requirements

Your backend needs to:

1. **Recognize Mobile Users**
   ```javascript
   // Detect if request is from mobile app
   const isMobileApp = req.headers['user-agent'].includes('Expo') || 
                       req.headers['x-mobile-app'] === 'true';
   ```

2. **Support OAuth Session Persistence**
   - Use server-side session cookies
   - Sessions must be recognized across requests from:
     - System browser (Google login)
     - WebView (BuildHubKH app)

3. **Optional: Mobile-Specific Endpoints**
   ```bash
   POST /api/mobile/push-token
   POST /api/mobile/auth/google
   GET /api/mobile/user
   ```

## Push Notifications

### Step 1: Store Push Token

When user authenticates, receive and store their push token:

```http
POST /api/mobile/push-token
Content-Type: application/json
Authorization: Bearer {user_auth_token}

{
  "token": "ExponentPushToken[xxxx]",
  "platform": "ios" | "android"
}
```

Response:
```json
{
  "success": true,
  "message": "Push token registered"
}
```

### Step 2: Send Push Notification

Use the Expo push notification service:

```javascript
// Backend example (Node.js)
const fetch = require('node-fetch');

async function sendPushNotification(pushToken, title, body, url) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: {
        url: url, // Must be https://buildhubkh.com/...
      },
      ttl: 86400, // 24 hours
      expiration: Math.floor(Date.now() / 1000) + 86400,
    }),
  });

  return response.json();
}

// Usage
await sendPushNotification(
  'ExponentPushToken[xxxx]',
  'New Project',
  'Check out this new listing!',
  'https://buildhubkh.com/projects/12345'
);
```

### Step 3: Handle Notification Taps

Mobile app will automatically:
1. Receive notification tap
2. Extract `data.url` from notification
3. Navigate to that URL inside WebView

The URL must be:
- Valid HTTPS
- On `buildhubkh.com` domain
- Full URL (e.g., `https://buildhubkh.com/path/page`)

### Notification Payload Reference

```json
{
  "to": "ExponentPushToken[xxxx]",
  "sound": "default",
  "title": "Notification Title",
  "body": "Notification message text",
  "data": {
    "url": "https://buildhubkh.com/projects/123",
    "action": "open_project",
    "projectId": "123"
  },
  "ttl": 86400,
  "priority": "high",
  "badge": 1
}
```

## Deep Linking

### Understanding Deep Links

Deep links allow the mobile app to open specific URLs when:
- User taps a push notification
- Notification payload contains `data.url`
- External link opens the app

### Format

- **iOS**: `buildhubkh://path?param=value`
- **Android**: `buildhubkh://path?param=value` or `https://buildhubkh.com/path`

### Examples

```
buildhubkh://projects/123
buildhubkh://profile/user-id
buildhubkh://messages?thread=456
```

The app will:
1. Parse the deep link
2. Extract the path
3. Navigate to `https://buildhubkh.com{path}` in WebView

## WebView Cookie Management

### Key Points

- Each platform maintains its own cookie jar
- Cookies set in system browser (Google login) are separate from WebView
- BuildHubKH backend must support either:

**Option A: Same-Cookie Session**
- Server-side sessions work across browsers
- After Google login in system browser, redirect to app
- WebView loads site with existing server session

**Option B: Token-Based Auth**
- After Google login, get OAuth token
- Pass token to WebView via URL: `https://buildhubkh.com?token=xxx`
- WebView code sets token in Authorization header or localStorage

**Option C: Re-authenticate in WebView**
- After system browser Google login, user is logged out in WebView
- WebView can pass OAuth token to backend to create new session
- Seamless from user perspective

### Recommended: Option A (Same-Cookie)

```javascript
// Backend session configuration
app.use(session({
  store: new RedisStore(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'Lax', // Important: allows cross-domain cookie sharing
    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
  }
}));

// After Google OAuth, create session
app.post('/auth/google/callback', (req, res) => {
  const googleToken = req.body.token;
  const user = verifyGoogleToken(googleToken);
  
  // Create session
  req.session.userId = user.id;
  
  // Redirect
  res.redirect('buildhubkh://oauth/success');
});
```

## User Agent Detection

Mobile app sends specific User-Agent:

```
Expo/... (BuildHubKH; Platform)
```

Use this to:
- Detect mobile app users
- Serve mobile-optimized responses
- Skip CSRF for trusted mobile clients
- Enable mobile-specific features

```javascript
function isMobileApp(userAgent) {
  return userAgent.includes('Expo');
}
```

## API Rate Limiting

Mobile users may:
- Reconnect frequently
- Have unstable connections
- Retry failed requests

Recommend:
- Higher rate limits for mobile endpoints
- Lenient retry policies
- Connection persistence

## Analytics

Track mobile app usage:

```javascript
// User Analytics
- app_open
- login_method: 'google_mobile'
- notification_received
- notification_tapped
- deep_link_opened
- webview_page_load
- webview_error
```

## Testing

### Test Google OAuth Flow

```bash
# 1. Start mobile app
npm start

# 2. Scan QR with Expo app

# 3. Trigger Google login

# 4. Check backend logs for session creation
```

### Test Push Notifications

```bash
# Get user's push token from database

# Send test notification
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxx]",
    "title": "Test",
    "body": "Testing push",
    "data": {"url": "https://buildhubkh.com/"}
  }'

# Check mobile app receives notification
```

### Test Deep Linking

```bash
# Simulate deep link on device
adb shell am start -a android.intent.action.VIEW -d "buildhubkh://projects/123" com.buildhubkh.mobile

# iOS
xcrun simctl openurl booted "buildhubkh://projects/123"
```

## Security Checklist

- [ ] Only accept HTTPS URLs in push notifications
- [ ] Validate URLs are on buildhubkh.com domain
- [ ] Never include sensitive data in push notification payloads
- [ ] Use secure session cookies (httpOnly, secure, sameSite)
- [ ] Validate push tokens before storing
- [ ] Implement rate limiting on mobile endpoints
- [ ] Verify Google OAuth tokens server-side
- [ ] Don't expose backend secrets in mobile app config

## Troubleshooting

### Push Token Not Received
- Check user is authenticated before sending notification
- Verify token format starts with `ExponentPushToken[`
- Confirm platform (iOS/Android) matches token

### User Not Logged In After OAuth
- Check session configuration (sameSite cookie policy)
- Verify backend creates session after OAuth
- Test with browser directly to isolate issue
- Check WebView has cookies enabled in app

### Notifications Not Appearing
- Ensure user granted notification permission
- Check push token is still valid
- Verify Expo push service is accessible
- Check TTL hasn't expired

### Deep Link Not Working
- Verify URL is valid HTTPS on buildhubkh.com
- Check deep link format is correct
- Test with `adb shell am start` or `xcrun simctl openurl`

## Related Documentation

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo Auth Session](https://docs.expo.dev/auth-session/overview/)
- [Deep Linking Guide](https://docs.expo.dev/guides/linking/)
- [React Native WebView](https://react-native-webview.js.org/)
