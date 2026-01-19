# Firestore Rules Update - Visual Guide

## The Issue ❌
When you try to create a service, you get:
```
Missing or insufficient permissions
```

This happens because Firestore's default security rules deny all write operations.

## The Solution ✅
Update the security rules to allow authenticated users to create services.

## Step-by-Step Visual Guide

### 1. Open Firebase Console
Go to: https://console.firebase.google.com/
- Sign in with your Google account
- Select your project: **techsavy-cc539**

### 2. Navigate to Firestore Rules
```
Firebase Console
  ├── Firestore Database
  │   └── Rules (tab at top)
```

### 3. Replace Existing Rules
You'll see a code editor with existing rules. Delete all content and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth != null;
    }

    match /services/{serviceId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.title is string &&
                       request.resource.data.description is string &&
                       request.resource.data.category is string &&
                       request.resource.data.price is number &&
                       request.resource.data.price > 0;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }

    match /reviews/{reviewId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null &&
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.serviceId is string &&
                       request.resource.data.rating is number &&
                       request.resource.data.rating >= 1 &&
                       request.resource.data.rating <= 5;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. Click Publish
Look for the **Publish** button (usually in the top right)
Click it and confirm the changes.

⏳ **Wait 1-2 minutes** for the rules to take effect.

### 5. Test in Your App
1. Go back to your iOS simulator
2. Tap the **Services** button on home screen
3. Tap **+ Create** (if you're a technician)
4. Fill in the form and create a service
5. It should work now! ✅

## What Each Rule Does

### Users Collection
```
/users/{userId}
- Users can read and write their own profile
- Any authenticated user can read all user profiles
```

### Services Collection
```
/services/{serviceId}
- Any authenticated user can read all services (for browsing)
- Only authenticated users can CREATE services
- Users can only UPDATE/DELETE their own services
```

### Validation on Create
- User must be authenticated
- Service must belong to the authenticated user (userId == request.auth.uid)
- Must have title (string)
- Must have description (string)
- Must have category (string)
- Must have price (number > 0)

## Security Benefits ✅

✅ Only authenticated users can create services  
✅ Users can't create services for other people  
✅ Users can't modify other people's services  
✅ All users can browse all services  
✅ Price must be positive  
✅ All required fields must be present

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Still getting "Missing permissions" | Wait 2 minutes for rules to propagate, then restart app |
| Can't see the Rules tab | Make sure you're in Firestore Database, not Realtime Database |
| Syntax error in rules | Copy the exact code above, don't modify it |
| Changes not taking effect | Refresh the simulator or hard-restart the app |

## Need Help?

Check the console error message - it usually tells you what permission is missing.
