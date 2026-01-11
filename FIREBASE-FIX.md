# Firebase Configuration Fix for cPanel Deployment

## Problem
The error "Failed to parse private key: Error: Invalid PEM formatted message" occurs when the Firebase Admin SDK private key is not properly formatted in the environment variables.

## Root Cause
When environment variables are set in different environments (especially cPanel), newlines in the private key are often escaped as `\\n` instead of actual newlines `\n`. The Firebase Admin SDK expects actual newlines in the PEM formatted private key.

## Solution
We've updated all Firebase configuration files to properly handle the private key formatting by replacing escaped newlines with actual newlines.

## Files Updated
1. `scripts/firebase-config.js`
2. `scripts/check-admin.js`
3. `scripts/init-admin.js`
4. `scripts/init-departments.js`
5. `lib/firebase-admin-config.ts` (new utility)

## How It Works
The fix uses a regex replacement to convert escaped newlines:
```javascript
private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\n')
```

This converts `\\n` (escaped newline) to `\n` (actual newline) which is what the PEM format requires.

## Environment Variable Setup
When setting your Firebase private key in cPanel environment variables, make sure it's properly escaped:

Correct format:
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ...\n...\n-----END PRIVATE KEY-----\n"
```

## Testing
Run the test script to verify your Firebase configuration:
```bash
npm run test:firebase
```

## Additional Notes
1. Make sure all environment variables are set in cPanel's Application Manager
2. The private key should maintain its PEM format with proper headers and footers
3. If you continue to have issues, try copying the private key directly from your service account JSON file and ensure it's properly escaped for your environment