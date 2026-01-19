# Technician Marketplace

A React Native Expo application with Firebase authentication and Firestore database integration.

## Features

- **Login Screen** - Authenticate with email and password
- **Register Screen** - Create new user accounts
- **Home Screen** - Welcome screen after successful login
- **Firebase Integration** - Secure authentication and user data storage

## Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Email/Password authentication in Auth section
4. Create a Firestore Database

### 2. Get Firebase Credentials

Get your credentials from Firebase Console > Project Settings

### 3. Configure Environment Variables

Create `.env.local` file in the root directory:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Install Firebase

```bash
npm install firebase
```

### 5. Start the App

```bash
npm start
```

Then press:
- `w` for web at http://localhost:8081
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code with Expo Go

## Project Structure

```
src/
├── config/firebase.js
├── context/AuthContext.js
├── screens/
│   ├── LoginScreen.js
│   ├── RegisterScreen.js
│   └── HomeScreen.js
└── navigation/RootNavigator.js
```

## Firestore Security Rules

Set these rules in Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```
