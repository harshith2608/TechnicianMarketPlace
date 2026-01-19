# Firestore Permission Errors - Quick Reference

## Current Error You're Seeing ❌

```
Missing or insufficient permissions
```

### Root Cause
Your Firestore security rules don't allow creating services.

### Fix
Update the rules in Firebase Console following the **SETUP_INSTRUCTIONS.md** file.

---

## Other Common Firestore Errors

### 1. "Permission denied" on Read Operations
**Error Message:**
```
Missing or insufficient permissions
```

**Cause:** Users don't have permission to read a collection/document

**Fix:** Add `allow read: if request.auth != null;` to the matching rule

---

### 2. "User does not have permission to access..."
**Error Message:**
```
User does not have permission to access 'projects/{project}/databases/(default)/documents/{path}'
```

**Cause:** Trying to access a path that's not allowed

**Fix:** 
- Make sure the rule path matches your collection structure
- Verify you have `match /path/{documentId}` rules

---

### 3. "Field validation failed"
**Error Message:**
```
Field validation failed
```

**Cause:** Data doesn't match the validation rules (e.g., price is string instead of number)

**Fix:** In serviceSlice.js, ensure:
```javascript
price: parseFloat(price),  // Convert to number
```

---

### 4. "Request from unauthorized client"
**Error Message:**
```
Request from unauthorized client [...]
```

**Cause:** User is not authenticated

**Fix:**
- Make sure user is logged in
- Check that Firebase authentication is working
- Verify `request.auth != null` conditions in rules

---

### 5. "Document doesn't exist"
**Error Message:**
```
No document to read at [collection/document]
```

**Cause:** Trying to read a document that doesn't exist

**Fix:** Use `getDocs()` with `where` clause, or check if document exists before reading

---

## Debug Checklist ✅

Before applying the fix:

- [ ] You're logged in to the app
- [ ] You're trying to create a service (not register, not login)
- [ ] You've filled in all required fields (title, description, category, price)
- [ ] You're using a technician account (if your app requires it)

After applying the fix:

- [ ] Rules have been published in Firebase Console
- [ ] Waited 1-2 minutes for propagation
- [ ] Restarted the app
- [ ] Cleared app cache (iOS: Settings > General > iPhone Storage > TechnicianMarketPlace > Offload App)
- [ ] Re-installed the app (delete and run `npm start -- --ios` again)

---

## Where to Look for Detailed Errors

### In Firebase Console
1. Go to **Firestore Database**
2. Click the **Logs** tab
3. Look for errors with timestamp matching when you created the service
4. The error details will tell you exactly what rule failed

### In App Console
1. Run the app with `npm start -- --ios`
2. Open Chrome DevTools at http://localhost:8081/debugger-ui
3. Look for red errors when you create a service
4. Copy the full error message

---

## Complete Rule Set That Works

Copy this exact code to Firebase Console > Firestore > Rules:

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

Then click **Publish** and wait 1-2 minutes.

---

## Still Not Working?

1. **Check the error message** - Copy it exactly
2. **Verify authentication** - Are you logged in?
3. **Check data types** - Is price a number, not string?
4. **Review rule syntax** - Paste the rules from this file exactly
5. **Clear cache** - Restart app completely
6. **Check Firebase project** - Make sure you're updating the right project (techsavy-cc539)

If you're still stuck, check the Firestore Logs for detailed error information!
