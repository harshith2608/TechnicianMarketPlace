# Firebase Cloud Functions - Payment Processing

## Overview

This folder contains all Firebase Cloud Functions for the TechnicianMarketPlace payment system. These functions handle payment creation, capture, refunds, and payouts using Razorpay.

---

## File Structure

```
functions/
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
└── src/
    ├── index.js              # Main entry point - exports all functions
    ├── config.js             # Configuration constants and settings
    ├── helpers.js            # Helper functions (calculations, validation)
    ├── notifications.js      # SMS & Push notification service
    ├── payment.js            # Payment processing functions (3 functions)
    └── payout.js             # Refund & payout functions (2 functions)
```

---

## Cloud Functions Available

### 1. **processPayment** ✅
- **What it does:** Creates a Razorpay order for payment
- **Called from:** PaymentScreen (when user initiates payment)
- **Input:**
  ```json
  {
    "amount": 5000,
    "description": "AC Service",
    "customerId": "customer_123",
    "technicianId": "tech_456",
    "bookingId": "booking_789"
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "orderId": "TXN_1705564800000_ABC123",
    "razorpayOrderId": "order_1234567890",
    "amount": 5000,
    "commission": 200,
    "technicianEarnings": 4800
  }
  ```

### 2. **capturePayment** ✅ (Step 2 after OTP)
- **What it does:** Captures payment after OTP verification
- **Called from:** App after successful OTP verification
- **Input:**
  ```json
  {
    "orderId": "TXN_1705564800000_ABC123",
    "razorpayPaymentId": "pay_1234567890",
    "razorpaySignature": "signature_hash_here"
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "paymentId": "TXN_1705564800000_ABC123",
    "status": "completed",
    "amount": 5000,
    "commission": 200,
    "technicianEarnings": 4800
  }
  ```

### 3. **verifyPayment** ✅
- **What it does:** Verify payment status from app
- **Called from:** App to check payment status
- **Input:**
  ```json
  {
    "paymentId": "TXN_1705564800000_ABC123"
  }
  ```

### 4. **processRefund** ✅ (3 retries + notification)
- **What it does:** Process refund with automatic retry logic
- **Called from:** Booking screen when customer cancels
- **Input:**
  ```json
  {
    "paymentId": "TXN_1705564800000_ABC123",
    "reason": "Service cancelled"
  }
  ```
- **Refund Logic:**
  - 0-3 hours: 100% refund to customer
  - 3-4 hours: 80% refund to customer, 20% fee split (50% tech, 50% platform)
  - After service starts: No refund

### 5. **createPayout** ✅ (3 retries + notification)
- **What it does:** Create technician payout via bank or UPI
- **Called from:** PayoutSettingsScreen
- **Input:**
  ```json
  {
    "technicianId": "tech_456",
    "amount": 5000,
    "method": "bank",
    "accountDetails": {
      "accountNumber": "123456789",
      "accountHolderName": "John Doe",
      "ifscCode": "SBIN0001234"
    }
  }
  ```
- **Output:**
  ```json
  {
    "success": true,
    "payoutId": "PAYOUT_1705564800000_XYZ789",
    "amount": 5000,
    "method": "bank",
    "status": "pending",
    "estimatedDate": "01/01/2026"
  }
  ```

---

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd functions
npm install
```

### Step 2: Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
# - Add your Razorpay Key Secret
# - Configure SMS/Push notification settings
```

### Step 3: Deploy to Firebase

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:processPayment

# View logs
firebase functions:log
```

### Step 4: Test in Emulator (Development)

```bash
# Start emulator
firebase emulators:start --only functions

# In another terminal, run tests
npm test
```

---

## How the Payment Flow Works

```
1. User enters amount → PaymentScreen
   ↓
2. App calls: processPayment() ← FUNCTION 1
   → Creates Razorpay order
   → Saves to Firestore
   ↓
3. User enters OTP → OTPDisplayScreen
   ↓
4. App calls: capturePayment() ← FUNCTION 2
   → Verifies signature
   → Captures from Razorpay (3 retries)
   → Updates Firestore
   → Adds commission to technician
   → Sends SMS/Push notification ✓
   ↓
5. Payment Complete → PaymentConfirmationScreen

REFUND PATH (if customer cancels):
6. User cancels booking
   ↓
7. App calls: processRefund() ← FUNCTION 4
   → Calculates refund (time-based)
   → Processes with Razorpay (3 retries)
   → Updates technician earnings
   → Sends notification ✓

PAYOUT PATH (for technician):
8. Technician requests payout
   ↓
9. App calls: createPayout() ← FUNCTION 5
   → Validates minimum threshold
   → Creates payout with Razorpay (3 retries)
   → Deducts from pending payout
   → Sends notification ✓
```

---

## Configuration Details

### Commission Calculation
- **Rate:** 10% of service amount
- **Cap:** Maximum ₹200 per transaction
- **Formula:** `min(amount * 0.10, 200)`
- **Example:** 
  - Service ₹1000 → Commission ₹100 (10%)
  - Service ₹5000 → Commission ₹200 (capped)

### Refund Policy
- **0-3 hours:** 100% refund
- **3-4 hours:** 80% refund (20% fee split: 50% tech, 50% platform)
- **After service starts:** No refund

### Payout Rules
- **Minimum:** ₹500
- **Frequency:** Weekly
- **Methods:** Bank transfer or UPI
- **Retry:** 3 attempts with exponential backoff

### Notifications Sent
- ✓ Payment success SMS + Push
- ✓ Payment failure SMS + Push + Alert
- ✓ Refund initiated SMS + Push
- ✓ Payout processed SMS + Push

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `RAZORPAY_KEY_ID` | Razorpay API Key | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret | `secret_key` |
| `ENABLE_SMS` | Enable SMS notifications | `false` |
| `ENABLE_PUSH` | Enable Push notifications | `true` |
| `TWILIO_ACCOUNT_SID` | Twilio SMS account | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio token | `auth_token` |

---

## Error Handling & Retries

All payment functions include **automatic retry logic** with exponential backoff:
- **Max Attempts:** 3
- **Initial Delay:** 1000ms
- **Backoff:** 2x multiplier (1s, 2s, 4s)

Example retry flow:
```
Attempt 1 (fails) → Wait 1s
Attempt 2 (fails) → Wait 2s
Attempt 3 (succeeds) → Return result ✓
```

---

## Firestore Collections

Functions interact with these Firestore collections:

```
firestore/
├── payments/           # All payment transactions
├── refunds/            # All refund transactions
├── payouts/            # All payout requests
├── bookings/           # Updated with payment status
├── users/              # Technician earnings & payouts
├── transactions/       # Audit log
└── notifications/      # User notifications
```

---

## Testing

### Test Payment Flow (Development)

1. In Firebase Console:
   - Create test user
   - Create test booking

2. Call from app:
   ```javascript
   const functions = firebase.functions();
   const processPayment = functions.httpsCallable('processPayment');
   
   const result = await processPayment({
     amount: 500,
     description: 'Test Service',
     customerId: 'test_customer',
     technicianId: 'test_tech',
     bookingId: 'test_booking'
   });
   ```

3. Verify in Firestore:
   - Check `payments/` collection
   - Verify commission calculation
   - Check technician earnings updated

---

## Deployment Checklist

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in Razorpay credentials
- [ ] Test in emulator: `firebase emulators:start`
- [ ] Run manual tests for all 5 functions
- [ ] Deploy: `firebase deploy --only functions`
- [ ] Verify functions in Firebase Console
- [ ] Test from app with test payment
- [ ] Monitor logs: `firebase functions:log`
- [ ] Switch Razorpay to live keys when ready

---

## Common Issues

### Issue: "Function not found"
- **Solution:** Make sure you've deployed functions: `firebase deploy --only functions`

### Issue: "RAZORPAY_KEY_SECRET is undefined"
- **Solution:** Add credentials to `.env` file in functions folder

### Issue: "Payment capture failed after 3 retries"
- **Solution:** Check Razorpay dashboard for order status, verify amount format

### Issue: "Technician earnings not updating"
- **Solution:** Verify Firestore security rules allow write access to users collection

---

## Next Steps

After deploying Phase 3 Cloud Functions:

1. **Phase 4:** Update Firestore collections & security rules
2. **Phase 5:** Add automated testing & monitoring
3. **Production:** Switch to live Razorpay keys

---

## Support

For issues or questions:
1. Check Razorpay docs: https://razorpay.com/docs/
2. Check Firebase docs: https://firebase.google.com/docs/
3. Review function logs in Firebase Console
