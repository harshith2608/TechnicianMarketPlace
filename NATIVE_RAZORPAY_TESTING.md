# iOS Native Razorpay Testing Guide

This guide explains how to set up and test real Razorpay payments using native iOS builds instead of Expo Go simulator.

## Why Native Testing?

- ✅ Real Razorpay API calls (not mocked)
- ✅ Actual payment UI from Razorpay
- ✅ Test with real test card numbers
- ✅ Better debugging and error handling
- ✅ Realistic production-like testing

## Prerequisites

- **Mac with Xcode** (required for iOS development)
- Xcode Command Line Tools
- Node.js and npm
- Expo CLI

Check prerequisites:
```bash
which xcode-select
which npm
which node
```

## Step 1: Install Xcode Command Line Tools

```bash
xcode-select --install
```

Or if already installed, ensure it's up to date:
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

## Step 2: Generate Native iOS Folder

This creates the native iOS project:

```bash
cd /Users/harshithpola/Documents/TechnicianMarketPlace

# Clean previous builds if any
npx expo prebuild --clean

# Or just prebuild if first time
npx expo prebuild --platform ios
```

**What happens:**
- Generates `ios/` folder with Xcode project
- Installs all native dependencies
- Configures CocoaPods

## Step 3: Install Pod Dependencies

```bash
cd ios
pod install
cd ..
```

## Step 4: Run on iOS Simulator

```bash
npx expo run:ios
```

**First time:** This builds and launches the simulator (~2-5 min)
**Subsequent times:** Just rebuilds the changed code (~30-60 sec)

## Step 5: Test Real Razorpay Payments

Once the app is running:

1. **Navigate to:** Service Detail Screen → Payment Screen
2. **Payment will show:** Real Razorpay checkout modal
3. **Use test card:** 
   - Card: `4111111111111111`
   - Expiry: `12/25`
   - CVV: `123`
4. **Check console logs** for payment confirmation

## Test Card Numbers

### Successful Payment
```
Card Number: 4111111111111111
Expiry: 12/25
CVV: 123
```

### Failed Payment (for testing failure flow)
```
Card Number: 4000000000000002
Expiry: 12/25
CVV: 123
```

## Monitoring Payments

### In App Console
Watch for logs like:
```
✅ Payment initialized
✓ Mock Razorpay Payment Successful (only in Expo Go)
✅ Payment captured & booking created: { bookingId, paymentId }
```

### In Razorpay Dashboard
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Log in with test account credentials
3. Navigate to **Payments**
4. You should see your test payments appear with:
   - Payment status: **Captured**
   - Payment ID: Real ID (not mock `pay_` format)
   - Notes: Will include bookingId after capture

### In Firebase Firestore
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select **technicianmarketplace-staging** project
3. Navigate to **Firestore Database**
4. Check:
   - `payments/{tempBookingId}` - Payment record with bookingId
   - `conversations/{conversationId}/bookings/{bookingId}` - Actual booking

## Troubleshooting

### Issue: "react-native-razorpay not found"
**Solution:** The fallback to mock will activate. Make sure you're in native build, not Expo Go.

### Issue: Pod install fails
**Solution:**
```bash
cd ios
pod repo update
pod install
cd ..
```

### Issue: Simulator won't start
**Solution:**
```bash
# Kill and restart simulator
xcrun simctl erase all
open -a Simulator
```

### Issue: Payment doesn't go through
**Solution:**
- Check you have correct test card number
- Verify Razorpay credentials in `.env.staging`
- Check console for specific error messages
- Ensure Firebase is initialized properly

## Key Code Changes for Native

**PaymentScreen.js:**
- Automatically detects native vs Expo Go
- Uses real `react-native-razorpay` if available
- Falls back to mock if not available

**paymentService.js:**
- Detects mock payments: `pay_` + short ID
- Real payments get full Razorpay payment IDs
- Makes real API calls for real payments
- Skips API calls for mock payments

## Next Steps

1. ✅ Run the app with `npx expo run:ios`
2. ✅ Navigate to payment screen
3. ✅ Enter test card details
4. ✅ Verify payment in Razorpay dashboard
5. ✅ Check booking in Firestore
6. ✅ Test failure flow with failed card

## Switching Back to Expo Go

If you need to go back to Expo Go simulator:
```bash
npx expo start
# Then press 'i' for iOS simulator
```

## Build for Production

When ready to build for App Store:
```bash
eas build --platform ios --auto-submit
```

---

**Branch:** `feature/ios-native-razorpay-testing`
**Status:** Ready for real payment testing
