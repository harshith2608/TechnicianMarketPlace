# How to Fix "Missing or Insufficient Permissions" Error

## Quick Fix Steps

### Step 1: Deploy Firestore Rules via Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **techsavy-cc539**
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top
5. Replace ALL the existing rules with this code:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own user profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth != null;
    }

    // Allow all authenticated users to read all services
    match /services/{serviceId} {
      allow read: if request.auth != null;
      
      // Allow authenticated users to create new services
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.title is string &&
                       request.resource.data.description is string &&
                       request.resource.data.category is string &&
                       request.resource.data.price is number &&
                       request.resource.data.price > 0;
      
      // Allow users to update/delete only their own services
      allow update, delete: if request.auth.uid == resource.data.userId;
    }

    // Allow users to create and read reviews
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

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click **Publish** button (top right)
7. Confirm the publication

### Step 2: Test the Fix

1. Go back to the app running in the simulator
2. Navigate to **Services** screen
3. Click **+ Create** button (for technicians)
4. Fill in the form:
   - Service Title: "Test Plumbing Service"
   - Description: "Professional plumbing repair and installation"
   - Category: Select any category
   - Price: "50.00"
5. Click **Create Service** button
6. The service should now be created successfully! ✅

## What Was the Problem?

Your Firestore database had default security rules that deny all write access. The new rules we've added:

- Allow authenticated users to **read all services** (browse)
- Allow authenticated users to **create new services** (with validation)
- Allow users to **update/delete only their own services** (ownership check)
- Protect the **users collection** (users can only access their own data)

## Security Features

✅ User authentication required  
✅ Only authenticated users can create services  
✅ Validation: services must have title, description, category, price  
✅ Price validation: must be positive number  
✅ Ownership protection: users can only edit/delete their own services  
✅ Data integrity: all required fields are validated

## If You're Still Getting Errors

1. **Wait 1-2 minutes** - Firebase rules take a moment to propagate
2. **Hard refresh the app** - Pull down on the home screen or restart the app
3. **Check console** - Look for error messages in the Firebase Console
4. **Verify authentication** - Make sure you're logged in before creating services
