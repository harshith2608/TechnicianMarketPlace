#!/bin/bash
# Script to prepare emulator with test rules

# Store original rules
if [ ! -f firestore.rules.prod ]; then
  cp firestore.rules firestore.rules.prod
fi

# Use test rules
cp firestore.rules.test firestore.rules

echo "✅ Switched to test Firestore rules"
