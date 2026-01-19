# Firebase Console - Step by Step Screenshots Guide

## Navigate to Firebase Console

### Step 1: Open Firebase Console
**URL:** https://console.firebase.google.com/

You should see a list of your Firebase projects.

### Step 2: Select Your Project
Click on: **techsavy-cc539**

### Step 3: Select Firestore Database
In the left sidebar, find and click: **Firestore Database**

(Not "Realtime Database" - make sure it's "Firestore Database")

---

## Update the Rules

### Step 4: Click the Rules Tab
At the top of the Firestore page, you'll see several tabs:
- **Data**
- **Rules** ← Click this one
- **Indexes**
- **Backups**

### Step 5: You'll See the Code Editor
The current rules are displayed in a large text editor. 
You'll see something like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 6: Select All and Delete
- Click in the code editor
- Press `Ctrl+A` (or `Cmd+A` on Mac) to select all
- Press `Delete` to clear everything

### Step 7: Paste New Rules
Copy the complete rules from below and paste them:

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

### Step 8: Click Publish
Look for a blue **Publish** button in the top-right corner of the rules editor.
Click it!

### Step 9: Confirm Changes
You might see a confirmation dialog asking "Publish rules?"
Click: **Publish** (or **OK**)

### Step 10: Wait for Propagation
You'll see a message saying "Publishing..." 
Wait until it shows "Published" (usually takes 5-30 seconds)

---

## Test Your Changes

### Step 11: Go Back to Your App
Return to your iOS simulator running the app.

### Step 12: Test Service Creation
1. Tap the green **Services** button on the home screen
2. Tap the **+ Create** button (appears if you're a technician)
3. Fill in the form:
   - **Service Title:** "Test Plumbing Service"
   - **Description:** "Professional plumbing repair and maintenance services"
   - **Category:** Select "Plumbing" (or any category)
   - **Price:** "50.00"
4. Tap **Create Service**

### Expected Result ✅
The service is created successfully! No error message.

---

## Troubleshooting

### Still See "Missing or insufficient permissions"?

**Possible Reasons:**

1. **Rules haven't propagated yet**
   - Wait 2-3 minutes
   - Restart the app: Pull down on home screen

2. **Didn't click Publish**
   - Go back to Rules tab
   - Check if there's a blue **Publish** button
   - Click it if it's there

3. **Rules have a typo**
   - Delete everything
   - Copy-paste the exact rules from this guide again
   - Make sure there are no extra spaces

4. **Updated wrong project**
   - Check top-left corner shows "techsavy-cc539"
   - You might have multiple Firebase projects

5. **Not logged in to the app**
   - Make sure you're logged in with a user account
   - Logout and login again

### Still Need Help?

1. **Check Firebase Logs:**
   - In Firestore Database page, click the **Logs** tab
   - Find the error with your timestamp
   - It will tell you exactly what rule failed

2. **Check Browser Console:**
   - Open Chrome DevTools: http://localhost:8081/debugger-ui
   - Look for red error messages when you create a service
   - Share the full error message in your logs

---

## Security Rules Explained

### What These Rules Do:

**Users Collection:**
```
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
  allow read: if request.auth != null;
}
```
- Users can read/write their own profile
- Anyone authenticated can read all user profiles

**Services Collection - Read:**
```
allow read: if request.auth != null;
```
- Any authenticated user can see all services (browsing)

**Services Collection - Create:**
```
allow create: if request.auth != null && 
               request.resource.data.userId == request.auth.uid &&
               request.resource.data.title is string &&
               request.resource.data.description is string &&
               request.resource.data.category is string &&
               request.resource.data.price is number &&
               request.resource.data.price > 0;
```
- Must be authenticated
- userId must match the user creating it (can't create for others)
- Title must be a string
- Description must be a string
- Category must be a string
- Price must be a number > 0

**Services Collection - Update/Delete:**
```
allow update, delete: if request.auth.uid == resource.data.userId;
```
- Only the user who created the service can edit/delete it

---

## All Set! ✅

Once the rules are published and propagated:
- ✅ Users can browse services
- ✅ Technicians can create services
- ✅ Users can edit/delete their own services
- ✅ Data is validated for integrity
- ✅ Security is enforced

Happy building! 🚀
