# 🧪 Developer Testing Dashboard

## Overview
A complete testing dashboard has been added to simplify testing the earnings and payout functionality across customer and technician accounts.

## How to Access
1. Go to **Login Screen**
2. Click the **"🧪 Developer Testing"** button at the bottom
3. You're now in the Dev Dashboard

## Features

### 📱 Quick Actions
- **Create Test Booking**: Manually create a booking between two test accounts
- **Auto-Complete Workflow**: Instantly complete an entire booking → OTP → Payment cycle
- **Reset Test Data**: Delete all test bookings for cleanup

### 👥 Switch Account
Instantly login as:
- **Customer** - Pre-configured test customer account
- **Technician** - Pre-configured test technician account  
- **Logout** - Sign out from current account

### 🔑 Test Credentials
View pre-configured test accounts:
```
Customer:
  Email: customer@test.com
  Password: test1234

Technician:
  Email: technician@test.com
  Password: test1234
```

## Workflow Example

### Testing Complete Booking-to-Payment Cycle
1. Open Dev Dashboard
2. Click **"Login as Customer"** → Login
3. Navigate to Services and create a booking
4. Go back to Dev Dashboard
5. Click **"Login as Technician"** → Login
6. Accept the booking
7. Go back to Dev Dashboard
8. Click **"Login as Customer"** → Login
9. Mark work as completed
10. Share OTP with technician
11. Go back to Dev Dashboard
12. Click **"Login as Technician"** → Login
13. Enter OTP
14. Payment verified! ✅

### Using Auto-Complete Workflow (Faster)
1. Get both test account UIDs
2. Open Dev Dashboard
3. Click **"Auto-Complete Workflow"**
4. Enter both UIDs
5. Entire workflow completes in seconds ✅

### Creating Custom Test Data
1. Open Dev Dashboard
2. Click **"Create Test Booking"**
3. Enter customer and technician UIDs
4. Booking created instantly
5. Test specific scenarios

## Finding User UIDs
When logged in, the current user's UID is visible at the top of the Dev Dashboard under "Current User" section.

## Cleanup
When you're done testing:
1. Go to Dev Dashboard
2. Click **"Reset Test Data"**
3. Enter the test account UIDs
4. All test bookings are deleted

## Removal
To remove the Dev Dashboard button from production:
1. Open `src/screens/LoginScreen.js`
2. Find the section marked: `{/* Developer Testing Mode Button */}`
3. Delete the entire `<TouchableOpacity>` block
4. Delete the `devButton` and `devButtonText` styles from `StyleSheet.create()`
5. The button disappears completely

## Files Modified
- `src/screens/LoginScreen.js` - Added Dev Dashboard button
- `src/screens/DevDashboardScreen.js` - New dev dashboard (delete when done)
- `src/utils/devUtils.js` - Test helper functions (delete when done)
- `src/navigation/RootNavigator.js` - Added DevDashboard route

## Notes
- Test accounts are automatically created on first use
- All test data is separate from production data
- Safe to use anytime during development
- Can be completely removed in 30 seconds
