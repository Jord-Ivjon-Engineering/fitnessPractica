# Deployment Troubleshooting Guide

## Common Git Merge Conflicts on Server

### Error: "Your local changes would be overwritten by merge"

This happens when you have uncommitted changes on the server that conflict with incoming changes.

#### Quick Fix (Recommended for Production)

Since you just pushed optimizations from your local machine, discard any local server changes and use the remote version:

```bash
cd /var/www/fitness-practica

# Discard local changes and use remote version
git reset --hard origin/main

# Now pull again
git pull origin main

# Continue with deployment
sudo ./deploy.sh
```

#### Alternative: Stash Local Changes

If you want to keep local changes for later:

```bash
cd /var/www/fitness-practica

# Save local changes temporarily
git stash

# Pull latest changes
git pull origin main

# If you need the stashed changes later:
# git stash pop

# Continue with deployment
sudo ./deploy.sh
```

#### Check What Changed First

If you want to see what local changes exist:

```bash
cd /var/www/fitness-practica

# See what files changed
git status

# See the actual differences
git diff

# Then decide: stash, commit, or reset
```

## Why This Happens

This typically occurs when:
1. You manually edited files on the server
2. A previous deployment was interrupted
3. Environment-specific changes were made directly on the server

## Best Practice

**Always make changes locally, commit, push, then deploy.** Avoid editing files directly on the production server.

## Complete Deployment Workflow

```bash
# 1. On your local machine
git add .
git commit -m "Your changes"
git push origin main

# 2. On production server
cd /var/www/fitness-practica

# 3. If you get merge conflicts, reset to remote
git reset --hard origin/main

# 4. Pull and deploy
git pull origin main
sudo ./deploy.sh
```

