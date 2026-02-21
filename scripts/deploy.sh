#!/bin/bash
set -e

# ABOUTME: Deploys the application to production VPS using Docker Swarm
# ABOUTME: Handles platform detection, image pulling, and stack deployment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Configuration
STACK_NAME="apme-implicare"
IMAGE="ghcr.io/daniifrim/apme-implicare-web:latest"
COMPOSE_FILE="/System/Volumes/Data/Users/danifrim/Coding Projects/vps-infra/stacks/${STACK_NAME}/compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! docker context ls | grep -q "hetzner"; then
        log_error "Docker context 'hetzner' not found. Run: docker context create hetzner --docker host=ssh://root@88.198.218.71"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    log_info "Prerequisites OK"
}

# Deploy to VPS
deploy() {
    log_info "Deploying stack: $STACK_NAME"
    
    # Pull latest image explicitly to ensure we have the newest version
    log_info "Pulling latest image..."
    docker --context hetzner pull "$IMAGE"
    
    # Deploy the stack
    log_info "Updating swarm service..."
    docker --context hetzner stack deploy \
        --with-registry-auth \
        -c "$COMPOSE_FILE" \
        "$STACK_NAME"
    
    log_info "Deployment initiated. Monitoring rollout..."
}

# Wait for deployment to complete
wait_for_healthy() {
    log_info "Waiting for service to be healthy (timeout: 120s)..."
    
    local timeout=120
    local interval=5
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        # Check if the web service has running tasks
        local running_tasks
        running_tasks=$(docker --context hetzner service ps "${STACK_NAME}_web" --filter "desired-state=running" --format "{{.CurrentState}}" 2>/dev/null | grep -c "Running" || echo "0")
        
        if [ "$running_tasks" -gt 0 ]; then
            # Check health endpoint
            if curl -fsS https://apme-implicare.ifrim.tech/api/health > /dev/null 2>&1; then
                log_info "Service is healthy!"
                return 0
            fi
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done
    
    echo ""
    log_error "Timeout waiting for service to be healthy"
    return 1
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo ""
    docker --context hetzner stack services "$STACK_NAME"
    echo ""
    log_info "Recent tasks:"
    docker --context hetzner service ps "${STACK_NAME}_web" --no-trunc 2>/dev/null | head -5
    echo ""
    log_info "Health check:"
    curl -fsS https://apme-implicare.ifrim.tech/api/health 2>/dev/null || log_error "Health check failed"
}

# Main
main() {
    echo "=========================================="
    echo "APME Implicare - Production Deploy"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    deploy
    
    if wait_for_healthy; then
        echo ""
        log_info "Deployment successful!"
        show_status
    else
        echo ""
        log_error "Deployment may have issues. Check status:"
        show_status
        exit 1
    fi
}

main "$@"
