# Razorpay Webhook Setup Guide

## Architecture Change: From Direct API to Webhook-Based Refunds

### Problem with Direct Approach
- Cloud Functions credential loading issues
- Synchronous waiting causes timeouts
- Silent "internal" errors

### Solution: Webhook-Based Refunds ✅

**How it works:**
1. **Initiation** (Fast, ~1s): App calls `processRefund` → Initiates refund on Razorpay
2. **Webhook** (Async): Razorpay confirms refund → Calls webhook → Updates booking status
3. **Result**: Booking shows "Refunding" immediately, becomes "Refunded" when Razorpay confirms (usually 30s-5min)

---

## Setup Steps

### Step 1: Get Your Webhook URL

Your webhook URL is:
```
https://us-central1-technicianmarketplace-staging.cloudfunctions.net/razorpayWebhookHandler
```

### Step 2: Add Webhook in Razorpay Dashboard

1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Click **"Add New Webhook"**
3. Fill in:
   - **URL**: `https://us-central1-technicianmarketplace-staging.cloudfunctions.net/razorpayWebhookHandler`
   - **Events**: Select these events:
     - ✅ `payment.authorized`
     - ✅ `payment.failed`
     - ✅ `payment.captured`
     - ✅ `refund.created`
     - ✅ `refund.processed` ← **Most Important**
     - ✅ `payout.initiated`
   - **Active**: Toggle ON
4. Click **Create Webhook**
5. **Save the Webhook Secret** (shown in "View Details")

### Step 3: Update Webhook Secret in Firebase

Run this command and paste the webhook secret:

```bash
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
```

Then paste the secret from Razorpay and press Enter.

### Step 4: Deploy Functions

```bash
cd functions
firebase deploy --only functions:processRefund,functions:razorpayWebhookHandler
```

---

## Test the Flow

1. **Cancel a booking** in the app
2. **Expected behavior:**
   - ✅ Booking shows "Refunding..." immediately
   - ✅ Razorpay webhook fires (check Firebase logs)
   - ✅ Webhook updates payment status to "refunded"
   - ✅ Booking shows "Refunded" after 30s-5min
   - ✅ Refund appears in Razorpay dashboard

### Check Firebase Logs

```bash
firebase functions:log --tail
```

Look for:
- `📤 Initiating refund on Razorpay` ← Function called
- `✅ Refund processed:` ← Webhook fired
- `✓ Payment marked as refunded` ← Status updated

---

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `refund.created` | Marks refund as "initiated" |
| `refund.processed` | **Updates booking to "refunded"** ← THIS COMPLETES THE FLOW |
| `payment.captured` | Marks payment as "completed" |
| `payout.initiated` | Updates payout status |

---

## Config File Updates

The webhook secret is read from environment variable:
```javascript
// functions/src/config.js
razorpay: {
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
}
```

---

## Troubleshooting

**Webhook not firing?**
- Check Firebase logs: `firebase functions:log --tail`
- Verify webhook is active in Razorpay dashboard
- Check webhook URL is accessible

**Refund initiated but not completing?**
- Check if `refund.processed` event is selected in Razorpay webhook
- Test webhook manually: Go to Razorpay webhook details → "Redeliver Events"

**Invalid signature error?**
- Webhook secret is incorrect
- Run `firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET` again

---

## Why This Approach is Better

✅ No credential loading in sync context  
✅ Asynchronous - no timeouts  
✅ Razorpay confirms refund actually succeeded  
✅ More reliable - industry standard  
✅ Better user experience - immediate feedback  

---

## Code Changes Made

### 1. Simplified `processRefund` (functions/src/payout.js)
- **Before**: Waited for full refund completion (caused timeouts)
- **After**: Initiates refund and returns immediately
- Timeout reduced from 45s to 15s

### 2. Added `handleRefundProcessed` (functions/src/webhook.js)
- Listens for `refund.processed` event from Razorpay
- Updates booking status to "refunded"
- Updates payment status to "refunded"

### 3. Updated Booking UI
- Shows "Refunding..." state while webhook processes
- Auto-refreshes when refund completes
- Real-time updates via onSnapshot listeners

---

## What's Next

1. Set up webhook in Razorpay (2 min)
2. Set webhook secret in Firebase (1 min)
3. Deploy functions (2 min)
4. Test with a booking cancellation (1 min)

**Total time: ~6 minutes**

After setup, refunds will work reliably and automatically!
