#!/bin/bash

# APME Implicare Automation - Push to Clasp Only
# This script pushes changes to Google Apps Script without GitHub operations

set -e  # Exit on any error

echo "🚀 Pushing to Google Apps Script projects..."

# Check authentication status
echo "🔐 Checking clasp authentication..."
if ! clasp list > /dev/null 2>&1; then
    echo "❌ Not authenticated. Running clasp login..."
    clasp login
    echo "✅ Authentication successful"
else
    echo "✅ Already authenticated"
fi

# Push to main project
echo "📤 Pushing main project..."
cd main-project
if clasp push; then
    echo "✅ Main project pushed successfully"
else
    echo "❌ Failed to push main project"
    exit 1
fi
cd ..

# Push to wrapper project
echo "📤 Pushing wrapper project..."
cd wrapper-project
if clasp push; then
    echo "✅ Wrapper project pushed successfully"
else
    echo "❌ Failed to push wrapper project"
    exit 1
fi
cd ..

echo "🎉 Both projects pushed to Google Apps Script!"
echo "   📊 Main project: Script ID 14cAHJIREVfcKY5zRtoiAwulqXqVOSHx1mX0hUPFJXqfYQwaS-r0tWDxm"
echo "   📋 Wrapper project: Script ID 1AhAu_f7ob86gVECxGExu9bKqiRTtRrDR06aVF0oosr5s2mgse1-KUQEd"