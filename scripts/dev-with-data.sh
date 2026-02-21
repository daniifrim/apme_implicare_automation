#!/bin/bash

# ABOUTME: Bootstraps local development with Docker Postgres, Prisma, and realistic data.
# ABOUTME: Starts the Next.js dev server and keeps it attached to this terminal session.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${ROOT_DIR}/app"

POSTGRES_CONTAINER="${APME_POSTGRES_CONTAINER:-apme-postgres}"
POSTGRES_IMAGE="${APME_POSTGRES_IMAGE:-postgres:16-alpine}"
POSTGRES_USER="${APME_POSTGRES_USER:-apme}"
POSTGRES_PASSWORD="${APME_POSTGRES_PASSWORD:-apme_password}"
POSTGRES_DB="${APME_POSTGRES_DB:-apme_implicare}"
POSTGRES_PORT="${APME_POSTGRES_PORT:-5432}"

DEV_URL="${APME_DEV_URL:-http://localhost:3000}"
IMPORT_MODE="${APME_IMPORT_MODE:-if-empty}"

DEV_SERVER_PID=""

log() {
  printf "%s\n" "$1"
}

ensure_command() {
  local cmd="$1"

  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "Error: '$cmd' is required but not installed or not in PATH."
    exit 1
  fi
}

ensure_docker_running() {
  if ! docker info >/dev/null 2>&1; then
    log "Error: Docker is not running. Start Docker Desktop and retry."
    exit 1
  fi
}

container_exists() {
  docker ps -a --format '{{.Names}}' | grep -Fxq "$POSTGRES_CONTAINER"
}

container_running() {
  docker ps --format '{{.Names}}' | grep -Fxq "$POSTGRES_CONTAINER"
}

start_postgres_container() {
  if container_exists; then
    if container_running; then
      log "Postgres container '$POSTGRES_CONTAINER' is already running."
    else
      log "Starting existing Postgres container '$POSTGRES_CONTAINER'..."
      docker start "$POSTGRES_CONTAINER" >/dev/null
    fi
    return
  fi

  log "Creating Postgres container '$POSTGRES_CONTAINER'..."
  docker run -d \
    --name "$POSTGRES_CONTAINER" \
    -e "POSTGRES_USER=${POSTGRES_USER}" \
    -e "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
    -e "POSTGRES_DB=${POSTGRES_DB}" \
    -p "${POSTGRES_PORT}:5432" \
    "$POSTGRES_IMAGE" >/dev/null
}

wait_for_postgres() {
  local max_attempts=60

  log "Waiting for Postgres to become ready..."

  for ((attempt = 1; attempt <= max_attempts; attempt++)); do
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
      log "Postgres is ready."
      return
    fi
    sleep 1
  done

  log "Error: Postgres did not become ready in time."
  exit 1
}

run_prisma_setup() {
  log "Running Prisma migrations..."
  pnpm -C "$APP_DIR" db:migrate

  log "Generating Prisma client..."
  pnpm -C "$APP_DIR" db:generate
}

query_count() {
  local table_name="$1"
  local count

  count="$(docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -c "SELECT COUNT(*) FROM ${table_name};" 2>/dev/null || true)"
  count="$(printf "%s" "$count" | tr -d '[:space:]')"

  if [[ "$count" =~ ^[0-9]+$ ]]; then
    printf "%s" "$count"
    return
  fi

  printf "0"
}

should_import_data() {
  case "$IMPORT_MODE" in
    never)
      return 1
      ;;
    always)
      return 0
      ;;
    if-empty)
      local templates_count
      local submissions_count

      templates_count="$(query_count templates)"
      submissions_count="$(query_count submissions)"

      log "Current data: templates=${templates_count}, submissions=${submissions_count}"

      if [ "$templates_count" -eq 0 ] || [ "$submissions_count" -eq 0 ]; then
        return 0
      fi

      return 1
      ;;
    *)
      log "Error: APME_IMPORT_MODE must be one of: if-empty, always, never."
      exit 1
      ;;
  esac
}

start_dev_server() {
  log "Starting Next.js development server..."
  pnpm -C "$APP_DIR" dev &
  DEV_SERVER_PID="$!"
}

wait_for_dev_server() {
  local max_attempts=90

  log "Waiting for dev server at ${DEV_URL}..."

  for ((attempt = 1; attempt <= max_attempts; attempt++)); do
    if curl -fsS "${DEV_URL}/api/health" >/dev/null 2>&1; then
      log "Dev server is healthy."
      return
    fi

    if ! kill -0 "$DEV_SERVER_PID" >/dev/null 2>&1; then
      log "Error: dev server exited before becoming healthy."
      exit 1
    fi

    sleep 1
  done

  log "Error: dev server did not become healthy in time."
  exit 1
}

import_realistic_data() {
  log "Importing templates..."
  curl -fsS -X POST "${DEV_URL}/api/templates/import" >/dev/null

  log "Importing submissions..."
  curl -fsS -X POST "${DEV_URL}/api/submissions/import" >/dev/null

  log "Reconciling legacy email history..."
  node "$APP_DIR/scripts/reconcile-legacy-email-history.js" --apply

  log "Data import and reconciliation complete."
}

cleanup() {
  if [ -n "$DEV_SERVER_PID" ] && kill -0 "$DEV_SERVER_PID" >/dev/null 2>&1; then
    kill "$DEV_SERVER_PID" >/dev/null 2>&1 || true
    wait "$DEV_SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

main() {
  ensure_command docker
  ensure_command pnpm
  ensure_command curl
  ensure_command node

  ensure_docker_running
  start_postgres_container
  wait_for_postgres
  run_prisma_setup

  start_dev_server
  wait_for_dev_server

  if should_import_data; then
    import_realistic_data
  else
    log "Skipping data import (APME_IMPORT_MODE=${IMPORT_MODE})."
  fi

  log "Local dev is ready at ${DEV_URL}"
  wait "$DEV_SERVER_PID"
}

main "$@"
