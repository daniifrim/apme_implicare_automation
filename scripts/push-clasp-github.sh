#!/bin/bash

# APME Implicare Automation - Push to Clasp and GitHub
# This script pushes changes to Google Apps Script and then commits to GitHub

set -e  # Exit on any error

echo "🚀 Starting APME deployment process..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "📝 Uncommitted changes detected"
else
    echo "✅ Working directory is clean"
fi

# Push to main project (Google Apps Script)
echo "📤 Pushing to main project (Google Apps Script)..."
cd main-project
if clasp push; then
    echo "✅ Main project pushed successfully to Google Apps Script"
else
    echo "❌ Failed to push main project to Google Apps Script"
    exit 1
fi
cd ..

# Optional: Push wrapper if there are changes
if [ -n "$(git diff --name-only wrapper-project/)" ]; then
    echo "📤 Wrapper project changes detected, pushing..."
    cd wrapper-project
    if clasp push; then
        echo "✅ Wrapper project pushed successfully"
    else
        echo "❌ Failed to push wrapper project"
        exit 1
    fi
    cd ..
fi

# Git operations
echo "📝 Preparing git commit..."

# Add all changes
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "ℹ️  No changes to commit"
else
    # Get commit message from user or use default
    if [ -z "$1" ]; then
        COMMIT_MSG="Update APME automation system

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    else
        COMMIT_MSG="$1

🤖 Generated with Claude Code (https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi

    # Commit changes
    git commit -m "$COMMIT_MSG"
    echo "✅ Changes committed to git"

    # Push to GitHub
    echo "📤 Pushing to GitHub..."
    if git push; then
        echo "✅ Successfully pushed to GitHub"
    else
        echo "❌ Failed to push to GitHub"
        exit 1
    fi
fi

echo "🎉 Deployment complete!"
echo "   📊 Main project: Script ID 14cAHJIREVfcKY5zRtoiAwulqXqVOSHx1mX0hUPFJXqfYQwaS-r0tWDxm"
echo "   📋 Wrapper project: Script ID 1AhAu_f7ob86gVECxGExu9bKqiRTtRrDR06aVF0oosr5s2mgse1-KUQEd"