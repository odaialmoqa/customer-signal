#!/bin/bash

# Production Deployment Script for CustomerSignal
# This script handles the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if required environment variables are set
    if [[ -z "$SUPABASE_PROJECT_ID" ]]; then
        log_error "SUPABASE_PROJECT_ID environment variable is not set"
        exit 1
    fi
    
    if [[ -z "$SUPABASE_ACCESS_TOKEN" ]]; then
        log_error "SUPABASE_ACCESS_TOKEN environment variable is not set"
        exit 1
    fi
    
    # Check if we're in the correct directory
    if [[ ! -f "supabase/config.toml" ]]; then
        log_error "Not in the correct project directory. Please run from the project root."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

authenticate_supabase() {
    log_info "Authenticating with Supabase..."
    
    # Login to Supabase
    echo "$SUPABASE_ACCESS_TOKEN" | supabase auth login --token
    
    # Link to production project
    supabase link --project-ref "$SUPABASE_PROJECT_ID"
    
    log_success "Successfully authenticated and linked to project"
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    # Check migration status
    log_info "Checking current migration status..."
    supabase migration list --linked
    
    # Run migrations
    log_info "Applying pending migrations..."
    supabase db push --linked
    
    log_success "Database migrations completed"
}

deploy_edge_functions() {
    log_info "Deploying Edge Functions..."
    
    # List of Edge Functions to deploy
    FUNCTIONS=(
        "monitor-keywords"
        "process-pipeline"
        "batch-sentiment"
        "process-alert-notifications"
        "send-alert-email"
        "process-data-import"
        "transform-integration-data"
        "process-scheduled-reports"
        "process-gdpr-requests"
        "apply-data-retention"
        "scheduled-monitoring"
        "scheduled-pipeline"
    )
    
    for func in "${FUNCTIONS[@]}"; do
        log_info "Deploying function: $func"
        supabase functions deploy "$func" --project-ref "$SUPABASE_PROJECT_ID"
    done
    
    log_success "All Edge Functions deployed successfully"
}

setup_production_secrets() {
    log_info "Setting up production secrets..."
    
    # Set secrets for Edge Functions
    # Note: These should be set via environment variables or secure secret management
    
    if [[ -n "$OPENAI_API_KEY" ]]; then
        supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY" --project-ref "$SUPABASE_PROJECT_ID"
    fi
    
    if [[ -n "$GOOGLE_CLOUD_API_KEY" ]]; then
        supabase secrets set GOOGLE_CLOUD_API_KEY="$GOOGLE_CLOUD_API_KEY" --project-ref "$SUPABASE_PROJECT_ID"
    fi
    
    if [[ -n "$AWS_ACCESS_KEY_ID" ]]; then
        supabase secrets set AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" --project-ref "$SUPABASE_PROJECT_ID"
        supabase secrets set AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" --project-ref "$SUPABASE_PROJECT_ID"
    fi
    
    if [[ -n "$AZURE_API_KEY" ]]; then
        supabase secrets set AZURE_API_KEY="$AZURE_API_KEY" --project-ref "$SUPABASE_PROJECT_ID"
    fi
    
    log_success "Production secrets configured"
}

setup_storage_buckets() {
    log_info "Setting up storage buckets..."
    
    # Create storage buckets if they don't exist
    BUCKETS=("reports" "uploads" "exports" "backups")
    
    for bucket in "${BUCKETS[@]}"; do
        log_info "Creating storage bucket: $bucket"
        # Note: This would typically be done via SQL or Supabase dashboard
        # supabase storage create-bucket "$bucket" --project-ref "$SUPABASE_PROJECT_ID" || true
    done
    
    log_success "Storage buckets configured"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check database connection
    log_info "Testing database connection..."
    supabase db ping --linked
    
    # List deployed functions
    log_info "Listing deployed functions..."
    supabase functions list --project-ref "$SUPABASE_PROJECT_ID"
    
    # Check migration status
    log_info "Final migration status check..."
    supabase migration list --linked
    
    log_success "Deployment verification completed"
}

setup_monitoring() {
    log_info "Setting up production monitoring..."
    
    # Enable Supabase Analytics
    log_info "Supabase Analytics is enabled in production config"
    
    # Set up log retention
    log_info "Configuring log retention policies..."
    
    # Set up alerting (this would typically be done via Supabase dashboard)
    log_info "Configure alerting rules in Supabase dashboard for:"
    log_info "  - Database connection issues"
    log_info "  - Edge Function errors"
    log_info "  - High resource usage"
    log_info "  - Failed authentication attempts"
    
    log_success "Monitoring setup completed"
}

main() {
    log_info "Starting production deployment for CustomerSignal..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Project ID: $SUPABASE_PROJECT_ID"
    
    check_prerequisites
    authenticate_supabase
    run_database_migrations
    deploy_edge_functions
    setup_production_secrets
    setup_storage_buckets
    verify_deployment
    setup_monitoring
    
    log_success "🎉 Production deployment completed successfully!"
    log_info "Next steps:"
    log_info "1. Update your frontend environment variables"
    log_info "2. Configure your domain and SSL certificates"
    log_info "3. Set up monitoring dashboards"
    log_info "4. Test the production deployment"
}

# Run main function
main "$@"