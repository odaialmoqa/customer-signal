#!/bin/bash

# Edge Functions Deployment Script
# Deploys all Supabase Edge Functions to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_REF="${SUPABASE_PROJECT_ID:-}"

if [[ -z "$PROJECT_REF" ]]; then
    log_error "SUPABASE_PROJECT_ID environment variable is required"
    exit 1
fi

# Edge Functions to deploy
declare -A FUNCTIONS=(
    ["monitor-keywords"]="Monitors keywords across platforms"
    ["process-pipeline"]="Processes data pipeline jobs"
    ["batch-sentiment"]="Batch sentiment analysis processing"
    ["process-alert-notifications"]="Processes and sends alert notifications"
    ["send-alert-email"]="Sends email alerts to users"
    ["process-data-import"]="Processes imported data files"
    ["transform-integration-data"]="Transforms data from integrations"
    ["process-scheduled-reports"]="Generates and sends scheduled reports"
    ["process-gdpr-requests"]="Handles GDPR data requests"
    ["apply-data-retention"]="Applies data retention policies"
    ["scheduled-monitoring"]="Scheduled monitoring tasks"
    ["scheduled-pipeline"]="Scheduled pipeline execution"
)

deploy_function() {
    local func_name=$1
    local description=$2
    
    log_info "Deploying function: $func_name"
    log_info "Description: $description"
    
    if supabase functions deploy "$func_name" --project-ref "$PROJECT_REF"; then
        log_success "✅ $func_name deployed successfully"
    else
        log_error "❌ Failed to deploy $func_name"
        return 1
    fi
}

verify_functions() {
    log_info "Verifying deployed functions..."
    
    if supabase functions list --project-ref "$PROJECT_REF"; then
        log_success "Function verification completed"
    else
        log_error "Failed to verify functions"
        return 1
    fi
}

main() {
    log_info "Starting Edge Functions deployment..."
    log_info "Project: $PROJECT_REF"
    log_info "Total functions to deploy: ${#FUNCTIONS[@]}"
    
    local failed_functions=()
    
    # Deploy each function
    for func_name in "${!FUNCTIONS[@]}"; do
        if ! deploy_function "$func_name" "${FUNCTIONS[$func_name]}"; then
            failed_functions+=("$func_name")
        fi
        echo  # Add spacing between functions
    done
    
    # Report results
    if [[ ${#failed_functions[@]} -eq 0 ]]; then
        log_success "🎉 All Edge Functions deployed successfully!"
        verify_functions
    else
        log_error "❌ Some functions failed to deploy:"
        for func in "${failed_functions[@]}"; do
            log_error "  - $func"
        done
        exit 1
    fi
}

# Run main function
main "$@"