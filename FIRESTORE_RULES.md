# Firestore Security Rules Deployment

## To update Firestore Security Rules

You have two options:

### Option 1: Using Firebase CLI (Recommended)

1. Install Firebase CLI globally:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project (if not already done):
```bash
firebase init firestore
```

4. Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

### Option 2: Manual Update via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **techsavy-cc539**
3. Navigate to **Firestore Database** → **Rules**
4. Replace the entire rules content with the code from `firestore.rules` file in this project
5. Click **Publish**

## Current Rules Structure

The `firestore.rules` file contains:

- **users/{userId}**: Users can read/write their own profiles
- **services/{serviceId}**: 
  - All authenticated users can read all services
  - Authenticated users can create new services (with validation)
  - Users can only update/delete their own services
- **reviews/{reviewId}**: Similar structure for reviews (future feature)

## Validation Rules Enforced

When creating a service, the following validations are enforced:
- User must be authenticated
- Service must belong to the authenticated user
- Service must have: title, description, category, and price
- Price must be a positive number

## Testing the Rules

After deploying the rules, try creating a new service from the app. The "Missing or insufficient permissions" error should be resolved.
