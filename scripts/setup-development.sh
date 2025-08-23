#!/bin/bash

# CustomerSignal Development Setup Script
set -e

echo "🚀 Setting up CustomerSignal development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20 or later."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version 20 or later is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker found - you can use Docker for local services"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker not found - you'll need to install PostgreSQL and Redis manually"
        DOCKER_AVAILABLE=false
    fi
    
    # Check Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found. Installing..."
        npm install -g supabase
    fi
    
    print_success "Requirements check completed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci
    print_success "Dependencies installed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Copy environment files
    if [ ! -f .env.local ]; then
        cp .env.example .env.local
        print_success "Created .env.local from .env.example"
        print_warning "Please update .env.local with your actual API keys"
    else
        print_warning ".env.local already exists - skipping"
    fi
    
    if [ ! -f .env.test ]; then
        print_success ".env.test already configured for testing"
    fi
}

# Setup local services
setup_services() {
    print_status "Setting up local services..."
    
    if [ "$DOCKER_AVAILABLE" = true ]; then
        print_status "Starting services with Docker..."
        
        # Start PostgreSQL and Redis
        docker-compose up -d postgres redis
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 10
        
        # Check if services are running
        if docker-compose ps postgres | grep -q "Up"; then
            print_success "PostgreSQL is running"
        else
            print_error "Failed to start PostgreSQL"
            exit 1
        fi
        
        if docker-compose ps redis | grep -q "Up"; then
            print_success "Redis is running"
        else
            print_error "Failed to start Redis"
            exit 1
        fi
        
    else
        print_warning "Docker not available. Please install PostgreSQL and Redis manually:"
        echo "  PostgreSQL: https://www.postgresql.org/download/"
        echo "  Redis: https://redis.io/download"
        echo ""
        echo "Or install via package manager:"
        echo "  macOS: brew install postgresql redis"
        echo "  Ubuntu: sudo apt install postgresql redis-server"
    fi
}

# Setup Supabase
setup_supabase() {
    print_status "Setting up Supabase..."
    
    # Initialize Supabase if not already done
    if [ ! -f supabase/config.toml ]; then
        print_status "Initializing Supabase..."
        supabase init
    fi
    
    # Start Supabase local development
    print_status "Starting Supabase local development..."
    supabase start
    
    # Apply migrations
    print_status "Applying database migrations..."
    supabase db push
    
    print_success "Supabase setup completed"
}

# Run initial tests
run_tests() {
    print_status "Running initial tests..."
    
    # Run unit tests
    npm run test:unit
    
    # Run accessibility tests
    npm run test:accessibility
    
    print_success "Initial tests completed"
}

# Setup development tools
setup_dev_tools() {
    print_status "Setting up development tools..."
    
    # Install Playwright browsers
    npx playwright install
    
    print_success "Development tools setup completed"
}

# Main setup function
main() {
    echo "🎯 CustomerSignal Development Setup"
    echo "=================================="
    echo ""
    
    check_requirements
    echo ""
    
    install_dependencies
    echo ""
    
    setup_environment
    echo ""
    
    setup_services
    echo ""
    
    setup_supabase
    echo ""
    
    setup_dev_tools
    echo ""
    
    run_tests
    echo ""
    
    print_success "🎉 Development environment setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Update .env.local with your API keys"
    echo "2. Start the development server: npm run dev"
    echo "3. Open http://localhost:3000 in your browser"
    echo ""
    echo "Useful commands:"
    echo "  npm run dev          - Start development server"
    echo "  npm run test:all     - Run all tests"
    echo "  npm run test:watch   - Run tests in watch mode"
    echo "  supabase status      - Check Supabase services"
    echo "  docker-compose ps    - Check Docker services"
    echo ""
    echo "For more information, see:"
    echo "  - README.md"
    echo "  - SERVER_SETUP.md"
    echo "  - TESTING.md"
}

# Run main function
main "$@"