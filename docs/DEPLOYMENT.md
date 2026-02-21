# Deployment Guide

This guide explains how to deploy the APME Implicare web application to production.

## Overview

The application is deployed using Docker Swarm on a Hetzner VPS. The deployment process has been streamlined to be straightforward and robust.

## Prerequisites

- Docker Desktop installed locally
- Access to the Hetzner VPS (configured as Docker context `hetzner`)
- GitHub Container Registry (GHCR) access

## Quick Deploy

### Option 1: Automatic Deploy (Recommended)

Just push to the `main` branch. The GitHub Action will:
1. Build the AMD64 image
2. Push to GHCR
3. Deploy to production automatically

```bash
git push origin main
```

### Option 2: Local Deploy

Build and deploy from your local machine:

```bash
# Build and push the image
npm run docker:push

# Deploy to production
npm run deploy
```

Or do both in one command:

```bash
npm run deploy:full
```

## Deployment Commands

| Command | Description |
|---------|-------------|
| `npm run docker:build` | Build image locally for testing |
| `npm run docker:push` | Build and push AMD64 image to GHCR |
| `npm run deploy` | Deploy existing image from GHCR to production |
| `npm run deploy:full` | Build, push, and deploy in one step |
| `npm run vps:migrate` | Run database migrations on VPS |

## Configuration

### Environment Variables

Production environment variables are stored in:
- `/opt/stacks/apme-implicare/.env` on the VPS

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `APP_HOST` - Domain name (apme-implicare.ifrim.tech)

### GitHub Action Secrets

For automatic deployment via GitHub Actions, set these secrets:

- `VPS_HOST` - The VPS IP address
- `VPS_USER` - SSH user (root)
- `VPS_SSH_KEY` - SSH private key for deployment

Set them in GitHub: Settings → Secrets and variables → Actions

## Architecture

### Build Process

1. **Dockerfile** at repo root builds the Next.js app
2. **docker-bake.hcl** configures multi-platform builds (linux/amd64 for VPS)
3. Images are tagged and pushed to GHCR
4. Docker Swarm pulls and deploys the new image

### Production Stack

Services running on the VPS:
- **web** - Next.js application (port 3000)
- **postgres** - PostgreSQL database
- **redis** - Redis cache/session store
- **traefik** - Reverse proxy (handles HTTPS)

All services run in a Docker Swarm stack named `apme-implicare`.

## Troubleshooting

### Deployment Fails

1. Check Docker context:
   ```bash
   docker context ls
   # Should show 'hetzner' context
   ```

2. Check service status:
   ```bash
   docker --context hetzner stack services apme-implicare
   ```

3. Check logs:
   ```bash
   docker --context hetzner service logs apme-implicare_web
   ```

### Health Check Fails

The health endpoint is at: `https://apme-implicare.ifrim.tech/api/health`

If you get 503 errors:
1. The container might not be listening on all interfaces
2. Check Traefik logs: `docker --context hetzner service logs traefik`
3. Verify the container is on the public_net

### Database Migrations

After deployment, run migrations:

```bash
npm run vps:migrate
```

Or manually:

```bash
docker --context hetzner exec \
  $(docker --context hetzner ps -q -f name=apme-implicare_web) \
  npx prisma migrate deploy
```

## Files Added/Modified

### New Files
- `/Dockerfile` - Production Docker build (moved from `app/`)
- `/.dockerignore` - Docker ignore patterns
- `/docker-bake.hcl` - Buildx bake configuration
- `/scripts/deploy.sh` - Deployment script
- `/.github/workflows/deploy.yml` - GitHub Action

### Modified Files
- `/package.json` - Added deploy scripts
- `/vps-infra/stacks/apme-implicare/compose.yml` - Added HOSTNAME=0.0.0.0

## Why These Changes?

### Dockerfile at Repo Root
The VPS deployment skill expects `Dockerfile` at the repo root. This makes automated deployment detection work correctly.

### AMD64 Platform
The VPS runs on AMD64 (x86_64), but you may be on Apple Silicon (ARM64). Building with `--platform linux/amd64` ensures the image runs on the VPS.

### HOSTNAME=0.0.0.0
Next.js standalone mode was only binding to one network interface. Setting `HOSTNAME=0.0.0.0` ensures it listens on all interfaces, making it accessible via Traefik.

### Docker Bake
Buildx bake provides:
- Consistent multi-platform builds
- Registry-based caching for faster builds
- Declarative configuration

## Rollback

If deployment fails, Docker Swarm automatically rolls back to the previous version. You can also manually force a rollback:

```bash
docker --context hetzner service update --rollback apme-implicare_web
```
