# Legal Acceptance - Quick Reference Card

**For:** Developers implementing or testing the legal acceptance flow  
**Created:** January 17, 2026

---

## ⚡ 60-Second Overview

Users must accept 5 legal documents before using the app. Acceptance is tracked in Firestore. It's a one-time gate that appears on first login and never again (unless user logs in on new device or legal version changes).

---

## 🎬 Flow Diagram

```
Login → Redux fetches user → Check legalAcceptance.accepted
   ↓
   FALSE → Show LegalAcceptanceScreen (BLOCKING)
   ↓
   User reviews docs (5 tabs)
   ↓
   User checks 5 boxes
   ↓
   Dispatch acceptLegalTerms()
   ↓
   Firestore updates: accepted = true, acceptedAt = NOW
   ↓
   Redux updates state
   ↓
   RootNavigator detects accepted = true
   ↓
   Show Home screen
   
---

   TRUE → Skip gate, show Home directly
```

---

## 🗂️ File Changes At-A-Glance

| File | Change | Lines |
|------|--------|-------|
| `src/screens/LegalAcceptanceScreen.js` | NEW | 324 |
| `src/redux/authSlice.js` | Modified | +78 |
| `src/navigation/RootNavigator.js` | Modified | +20 |

---

## 📍 Key Code Locations

### 1. Check if Legal Accepted
**File:** [src/navigation/RootNavigator.js](../../src/navigation/RootNavigator.js)
```javascript
const legalAccepted = user?.legalAcceptance?.accepted;

{!legalAccepted ? (
  <Stack.Screen name="LegalAcceptance" component={LegalAcceptanceScreen} />
) : (
  // Main app
)}
```

### 2. Accept Legal Terms
**File:** [src/redux/authSlice.js](../../src/redux/authSlice.js)
```javascript
export const acceptLegalTerms = createAsyncThunk(
  'auth/acceptLegalTerms',
  async ({ userId }, { rejectWithValue }) => {
    // Updates: /users/{uid}/legalAcceptance
    // Sets: accepted = true, acceptedAt = NOW
  }
);
```

### 3. UI Component
**File:** [src/screens/LegalAcceptanceScreen.js](../../src/screens/LegalAcceptanceScreen.js)
```javascript
// 5 tabs: Terms, Warranty, Cancellation, Privacy, Disclaimer
// 5 checkboxes (all must be checked)
// Accept button (disabled until all checked)
// Dispatch acceptLegalTerms on click
```

---

## 🧪 Quick Test

```bash
# 1. Run app
npm start -- --clear

# 2. Create new account
# → Should see legal screen

# 3. Try clicking Accept without checkboxes
# → Button should be DISABLED (gray)

# 4. Check all 5 checkboxes
# → Button should ENABLE (blue)

# 5. Click Accept
# → Loading spinner appears
# → After success → Auto-routes to Home

# 6. Log out, log back in
# → Legal screen should NOT appear
# → Should go directly to Home
```

---

## 📊 Data Structure

```javascript
user.legalAcceptance = {
  accepted: boolean,           // Main flag
  acceptedAt: Timestamp,       // When accepted
  version: '1.0',             // Legal version
  acceptedTerms: [            // Which docs accepted
    'terms_of_service',
    'warranty_policy',
    'cancellation_policy',
    'privacy_policy',
    'platform_disclaimer'
  ]
}
```

**Storage:** Firestore at `/users/{uid}/legalAcceptance`

---

## 🔒 Access Control

**RootNavigator checks:**
```javascript
legalAccepted = user?.legalAcceptance?.accepted
```

**If FALSE** → Show LegalAcceptanceScreen (blocking)  
**If TRUE** → Show Home screen (gate passes)  
**If NULL/UNDEFINED** → Treated as FALSE (show gate)

---

## ⚠️ Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Legal screen appears in infinite loop | `acceptLegalTerms` not updating Redux | Check `acceptLegalTerms.fulfilled` reducer |
| Accept button always disabled | Checkboxes not being set | Log `acceptedTerms` state |
| User can navigate back from legal | No `headerLeft: () => null` | Add to navigation options |
| Network error on accept | Firestore connection failed | Show alert + retry button |
| Legal screen not appearing on new account | `legalAcceptance` not in user doc | Check `registerUser` initializes it |

---

## 🚀 Deployment Checklist

- [ ] Deploy code (LegalAcceptanceScreen.js, authSlice changes, RootNavigator changes)
- [ ] Update Firestore rules (see docs/FIRESTORE_RULES_LEGAL.md)
- [ ] Test: New user registration → Legal gate appears
- [ ] Test: Accept legals → Routes to Home
- [ ] Test: Log back in → Skips legal gate
- [ ] Monitor: % of users accepting (target: 95%+)
- [ ] Go live ✅

---

## 📱 UI Layout

```
┌─────────────────────────┐
│ Legal Agreements        │
│ Review and accept       │
└─────────────────────────┘
┌─────────────────────────┐
│ [Terms] [Warranty]...   │  ← Tabs
└─────────────────────────┘
┌─────────────────────────┐
│ Terms of Service        │
│                         │
│ [Scrollable Content]    │  ← Document
│                         │
└─────────────────────────┘
┌─────────────────────────┐
│ ☐ Terms of Service      │
│ ☐ Warranty Policy       │  ← Checkboxes
│ ☐ Cancellation Policy   │
│ ☐ Privacy Policy        │
│ ☐ Platform Disclaimer   │
└─────────────────────────┘
┌─────────────────────────┐
│ [Accept All & Continue] │  ← Button
└─────────────────────────┘
```

---

## 🔗 Related Docs

- Full implementation guide: [LEGAL_ACCEPTANCE_IMPLEMENTATION.md](LEGAL_ACCEPTANCE_IMPLEMENTATION.md)
- Firestore rules & deployment: [FIRESTORE_RULES_LEGAL.md](FIRESTORE_RULES_LEGAL.md)
- Complete summary: [LEGAL_ACCEPTANCE_SUMMARY.md](LEGAL_ACCEPTANCE_SUMMARY.md)
- Terms of Service: [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md)
- Warranty Policy: [WARRANTY_POLICY.md](WARRANTY_POLICY.md)
- Cancellation Policy: [CANCELLATION_POLICY.md](CANCELLATION_POLICY.md)
- Privacy Policy: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)
- Platform Disclaimer: [PLATFORM_DISCLAIMER.md](PLATFORM_DISCLAIMER.md)

---

## 💬 Redux Dispatch

```javascript
// Dispatch legal acceptance
const dispatch = useDispatch();
const user = useSelector(state => state.auth.user);

await dispatch(acceptLegalTerms({ userId: user.id })).unwrap();
// ↑ This is already done in LegalAcceptanceScreen.js
```

---

## 🎯 Success Criteria

- [x] Users cannot access app without accepting legals
- [x] Acceptance is one-time (never shown again if accepted)
- [x] Firestore tracks acceptance with timestamp
- [x] All 5 documents must be accepted (no partial)
- [x] Returning users skip gate (no re-acceptance)
- [x] Different users have independent acceptance status
- [x] No way to bypass gate without accepting

---

**Status:** ✅ Ready to Deploy  
**Last Updated:** January 17, 2026
