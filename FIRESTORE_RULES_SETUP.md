# Firestore Security Rules

## Files

### `firestore.rules` - Production Rules
Strict security rules for the production Firebase project. These rules enforce:
- Users can only read/write their own profiles
- Only service owners can manage their services
- Only conversation participants can access messages and bookings
- All operations require proper authentication

**Deploy to Production Firebase Console:**
```bash
firebase deploy --only firestore:rules
```

### `firestore.emulator.rules` - Emulator Testing Rules
⚠️ **DO NOT USE IN PRODUCTION**

Permissive rules for local Firebase Emulator testing. These allow all read/write operations to:
- Simplify test data seeding
- Enable full integration testing without auth complications
- Speed up development/testing cycle

## Switching Rules for Emulator

To use the emulator rules locally:

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Start Firebase Emulator with custom rules:**
   ```bash
   firebase emulators:start --import=emulator-data --rules firestore.emulator.rules
   ```

Or update your `firebase.json` to specify rules:
```json
{
  "emulators": {
    "firestore": {
      "port": 8080,
      "rules": "firestore.emulator.rules"
    }
  }
}
```

3. **Run tests:**
   ```bash
   npm test
   ```

## OTP System & Firestore

The OTP verification system uses the `completion` subcollection under bookings:
```
conversations/{conversationId}/bookings/{bookingId}/completion/{completionId}
```

**Production Rules:** Only conversation participants can read/write completion records

**Emulator Rules:** All operations allowed for testing

## Security Best Practices

✅ **Production:**
- Keep `firestore.rules` strict and restrictive
- Review changes before deployment
- Test permission scenarios locally with emulator rules first

✅ **Development:**
- Use `firestore.emulator.rules` for local testing
- Never commit production rules with test-environment exceptions
- Keep emulator and production rules separate

❌ **Don't:**
- Use permissive rules in production
- Deploy emulator rules to Firebase Console
- Mix emulator and production rule logic
