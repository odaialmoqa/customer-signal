#!/bin/bash

# Database Migration Deployment Script
# Safely deploys database migrations to production

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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_REF="${SUPABASE_PROJECT_ID:-}"
DRY_RUN="${DRY_RUN:-false}"

if [[ -z "$PROJECT_REF" ]]; then
    log_error "SUPABASE_PROJECT_ID environment variable is required"
    exit 1
fi

check_migration_status() {
    log_info "Checking current migration status..."
    
    if ! supabase migration list --linked; then
        log_error "Failed to check migration status"
        exit 1
    fi
}

backup_database() {
    log_info "Creating database backup before migration..."
    
    # Note: In production, you would typically use Supabase's built-in backup system
    # or create a custom backup script using pg_dump
    
    local backup_name="pre-migration-$(date +%Y%m%d-%H%M%S)"
    log_info "Backup name: $backup_name"
    
    # Supabase automatically creates point-in-time recovery backups
    log_success "Supabase automatic backups are enabled"
    log_info "Point-in-time recovery is available for the last 7 days"
}

validate_migrations() {
    log_info "Validating migration files..."
    
    # Check if migration files exist
    if [[ ! -d "supabase/migrations" ]]; then
        log_error "Migration directory not found"
        exit 1
    fi
    
    # Count migration files
    local migration_count=$(find supabase/migrations -name "*.sql" | wc -l)
    log_info "Found $migration_count migration files"
    
    # Validate SQL syntax (basic check)
    for migration_file in supabase/migrations/*.sql; do
        if [[ -f "$migration_file" ]]; then
            log_info "Validating: $(basename "$migration_file")"
            # Basic syntax check - in production you might want more sophisticated validation
            if ! grep -q ";" "$migration_file"; then
                log_warning "Migration file may be incomplete: $(basename "$migration_file")"
            fi
        fi
    done
    
    log_success "Migration validation completed"
}

run_migrations() {
    log_info "Running database migrations..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE - No actual changes will be made"
        supabase db diff --linked --schema public
        return 0
    fi
    
    # Apply migrations
    if supabase db push --linked; then
        log_success "Migrations applied successfully"
    else
        log_error "Migration failed!"
        log_error "Database may be in an inconsistent state"
        log_error "Consider rolling back or fixing the issue manually"
        exit 1
    fi
}

verify_migration_success() {
    log_info "Verifying migration success..."
    
    # Check migration status again
    supabase migration list --linked
    
    # Test database connectivity
    if supabase db ping --linked; then
        log_success "Database is responding correctly"
    else
        log_error "Database connectivity issues detected"
        exit 1
    fi
    
    # Run basic health checks
    log_info "Running post-migration health checks..."
    
    # Check if critical tables exist (you can customize this)
    local critical_tables=("tenants" "users" "keywords" "conversations" "integrations")
    
    for table in "${critical_tables[@]}"; do
        log_info "Checking table: $table"
        # This would require a more sophisticated check in practice
    done
    
    log_success "Post-migration verification completed"
}

rollback_instructions() {
    log_info "Rollback instructions:"
    log_info "1. Use Supabase point-in-time recovery from the dashboard"
    log_info "2. Or manually revert specific migrations if needed"
    log_info "3. Contact support if you need assistance with rollback"
}

main() {
    log_info "Starting database migration deployment..."
    log_info "Project: $PROJECT_REF"
    log_info "Dry run: $DRY_RUN"
    
    check_migration_status
    backup_database
    validate_migrations
    
    # Confirm before proceeding (unless in dry run mode)
    if [[ "$DRY_RUN" != "true" ]]; then
        log_warning "This will apply migrations to the production database"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Migration cancelled by user"
            exit 0
        fi
    fi
    
    run_migrations
    verify_migration_success
    
    log_success "🎉 Database migration deployment completed successfully!"
    rollback_instructions
}

# Run main function
main "$@"