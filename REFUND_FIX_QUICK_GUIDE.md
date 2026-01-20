# Refund Processing Issue - RESOLUTION STEPS

## 🔴 The Issue
When you decline a service booking from the technician side:
- App shows: "Refunding... Booking cancelled"
- Reality: **No refund reaches Razorpay dashboard**
- Result: Customers don't get their money back!

## 🔍 Root Cause
Your Cloud Functions environment is missing the Razorpay API secret key.

Think of it like this:
```
App → "Please refund this payment" 
    → Cloud Function → 
    → Tries to call Razorpay API → 
    → ❌ "I don't have the secret key! Can't authenticate!"
    → Refund FAILS SILENTLY
    → Database still marks it as "refunded" (LIE)
    → Customer never gets refunded
```

## ✅ How to Fix (4 Steps)

### Step 1: Get Your Razorpay Credentials
```
Go to: https://dashboard.razorpay.com/settings/api-keys

Copy:
- Key ID: rzp_test_xxxxx (or rzp_live_ for production)
- Key Secret: (long alphanumeric string)

⚠️ Keep the Key Secret PRIVATE!
```

### Step 2: Set in Firebase Functions

Run this ONCE:

```bash
# Replace XXXXX and secret_key_here with your actual values
firebase functions:config:set \
  razorpay.keyid="rzp_test_XXXXX" \
  razorpay.keysecret="your_secret_key_here"
```

Example:
```bash
firebase functions:config:set \
  razorpay.keyid="rzp_test_S5Qwfrbq71Ub9s" \
  razorpay.keysecret="abcDefGhijKlmNopQrsTuVwXyz"
```

### Step 3: Deploy Functions

```bash
firebase deploy --only functions
```

This deploys your Cloud Functions with the new credentials.

### Step 4: Test the Fix

1. In the app, book a service
2. As a technician, decline the booking
3. Check Razorpay Dashboard → Refunds
4. You should see a new refund processing!

## 📋 Verification Checklist

After following steps above:

- [ ] Ran `firebase functions:config:set ...` command
- [ ] Ran `firebase deploy --only functions`
- [ ] Deployment completed successfully
- [ ] Created a test booking and declined it
- [ ] Checked Razorpay dashboard for refund transaction
- [ ] Refund shows as "Processing" → "Processed"

## 🆘 Troubleshooting

### "Command not found: firebase"
- Install Firebase CLI: `npm install -g firebase-tools`
- Then try again

### "Razorpay credentials missing" error in logs
- Check you ran step 2 correctly
- Check API keys are not swapped (ID vs Secret)
- Try running the command again

### Refund still not showing in Razorpay
- Check Firebase Functions logs: `firebase functions:log --only processRefund`
- Look for error messages
- Verify credentials are correct in Razorpay dashboard

### "Authentication failed" error  
- Your Razorpay credentials are wrong
- Go back to step 1, copy credentials again
- Make sure you copied the KEY SECRET, not just the Key ID

## 📊 After Fix - What to Expect

✅ Booking declined by technician
✅ App shows: "Booking cancelled. Refund processing..."
✅ Razorpay dashboard shows: New refund transaction
✅ Refund status progresses: "Processing" → "Processed" 
✅ Customer receives refund in 3-5 business days

## 🔐 Security Reminders

✅ DO:
- Use Firebase environment config (not hardcode)
- Keep Key Secret private
- Use test keys (rzp_test_) for development
- Use production keys (rzp_live_) only for production

✗ DON'T:
- Commit keys to Git
- Share keys via chat/email
- Hardcode keys in code
- Use test keys for real payments

---

**Last Updated:** January 20, 2026  
**Status:** Critical Issue Identified & Fixed  
**Action Required:** Follow 4 steps above to activate refunds
