# 🚨 CRITICAL: Razorpay Refund Configuration Issue

## Problem
When technicians decline service bookings, the app says **"Refunding..."** but **NO refunds are actually processed in Razorpay**.

## Root Cause
The Cloud Functions don't have the `RAZORPAY_KEY_SECRET` environment variable properly configured. Without this:
- ✗ Refund API calls fail silently
- ✗ No refunds reach customers
- ✗ Payments remain marked as "refunding" in database
- ✗ Customers don't receive their money back

## Solution Required

### Step 1: Identify Your Razorpay Credentials

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/settings/api-keys)
2. Note your:
   - **API Key ID** (looks like: `rzp_test_XXXXX` or `rzp_live_XXXXX`)
   - **API Key Secret** (long string, keep this SECRET!)

### Step 2: Set Environment Variables for Cloud Functions

You have **TWO options** depending on where you're deploying:

#### Option A: Deploy to Firebase (PRODUCTION)

```bash
# Use Firebase CLI to set environment variables
firebase functions:config:set razorpay.keyid="rzp_test_XXXXX" razorpay.keysecret="your_secret_key_here"

# Then deploy functions
firebase deploy --only functions
```

#### Option B: Create .env file in functions directory (LOCAL TESTING)

1. In `/functions` directory, create `.env` file:

```bash
cd functions
touch .env
```

2. Add your credentials to `/functions/.env`:

```dotenv
RAZORPAY_KEY_ID=rzp_test_XXXXX
RAZORPAY_KEY_SECRET=your_secret_key_here
```

3. The functions will read these on startup

### Step 3: Verify Configuration

After setting credentials, run this to confirm:

```bash
# Check if config is readable
firebase functions:config:get

# Output should show razorpay config is set
```

### Step 4: Redeploy Functions

```bash
# Redeploy with new config
firebase deploy --only functions

# Watch the deployment logs for confirmation
```

## Testing the Fix

1. **Technician declines a booking** in the app
2. Check Razorpay Dashboard → Refunds section
3. You should see a new refund entry with status "Processing" → "Processed"
4. Customer's payment method will receive the refund within 3-5 business days

## How to Verify Refunds are Working

### Check Firebase Functions Logs

```bash
firebase functions:log --only processRefund
```

Look for messages like:
- ✓ `🔑 Razorpay credentials validated` - Good!
- ✓ `📤 Calling Razorpay refund API...` - API call initiated
- ✓ `Razorpay refund response:` - Success!
- ✗ `❌ Razorpay credentials missing` - **Problem!**

### Check Razorpay Dashboard

1. Go to **Payments** section
2. Find the payment that was "refunded"
3. Click the payment → scroll down to **Refunds** section
4. You should see the refund transaction with ID and status

## What Each Message Means

| Message | Status | Action |
|---------|--------|--------|
| `keyId: SET, keySecret: SET` | ✓ Ready | Refunds will work |
| `keyId: MISSING` or `keySecret: MISSING` | ✗ Problem | Set environment variables |
| `Cannot refund payment with status: X` | ℹ Info | Policy doesn't allow refund (too late) |
| `Razorpay refund failed: Authentication failed` | ✗ Credentials wrong | Check API keys |
| `Razorpay refund failed: Invalid payment_id` | ✗ Data error | Payment doesn't exist in Razorpay |

## Security Notes

⚠️ **NEVER commit your Razorpay secret key to Git!**

- ✓ Use `.env` files (add to `.gitignore`)
- ✓ Use Firebase environment configuration for production
- ✓ Use secrets manager for production deployments
- ✗ Don't hardcode keys in code
- ✗ Don't share keys via chat/email

## After Fixing

1. ✅ Technicians can decline bookings
2. ✅ Customers receive refunds within 3-5 days
3. ✅ Razorpay dashboard shows all refund transactions
4. ✅ Firestore payment records update with refund status

## Need Help?

1. Check Cloud Functions logs: `firebase functions:log`
2. Check Razorpay API status: https://status.razorpay.com
3. Verify API credentials at: https://dashboard.razorpay.com/settings/api-keys
4. Enable detailed logging in payout.js for more debugging info

---

**Created:** January 20, 2026  
**Status:** Critical - Blocks refund functionality  
**Updated logs added to:** functions/src/payout.js
