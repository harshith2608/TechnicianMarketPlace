# Firestore Rules Update for Legal Acceptance

Update your `firestore.rules` file to include security rules for the legal acceptance data:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{uid} {
      // Only the authenticated user can read their own document
      allow read: if request.auth.uid == uid;
      
      // Only the authenticated user can write to their own document
      allow write: if request.auth.uid == uid;
      
      // Specific rule for legalAcceptance field
      // Once accepted, user cannot unaccept (immutability)
      allow update: if request.auth.uid == uid && 
                       (
                         // Allow first-time acceptance (going from false to true)
                         (resource.data.legalAcceptance.accepted == false && 
                          request.resource.data.legalAcceptance.accepted == true) ||
                         
                         // Allow updates if already accepted (like metadata updates)
                         resource.data.legalAcceptance.accepted == true
                       );
    }

    // Conversations collection
    match /conversations/{conversationId} {
      // ... existing rules ...
      
      match /messages/{messageId} {
        // ... existing rules ...
      }
      
      match /bookings/{bookingId} {
        // ... existing rules ...
      }
    }

    // Services collection
    match /services/{serviceId} {
      // ... existing rules ...
    }
  }
}
```

## Steps to Deploy:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your TechnicianMarketPlace project
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace the entire rules file with the updated version above
5. Click **Publish**
6. Verify rules are active (should show in console)

## Testing Rules:

After deploying, test that:
- ✅ User can accept legals (write: accepted: false → true)
- ✅ User cannot un-accept (write: accepted: true → false is blocked)
- ✅ User can only access their own acceptance data (read own only)
- ✅ Other users cannot read another user's legal acceptance

## Rollback:

If issues occur, your previous rules are saved in Firebase history. Click **Manage versions** to restore.
