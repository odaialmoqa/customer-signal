#!/bin/bash

# CustomerSignal Vercel Deployment Script
set -e

echo "🚀 CustomerSignal Vercel Deployment Setup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo ""
echo "📋 Pre-deployment checklist:"
echo "1. ✅ GitHub repository created: https://github.com/odaialmoqa/customer-signal"
echo "2. ✅ You have Supabase account"
echo "3. ✅ You have Vercel account"
echo "4. ✅ You have your Supabase 'customer-signal' project"
echo ""

print_warning "NEXT STEPS:"
echo ""
echo "🔑 Step 1: Get your Supabase keys"
echo "   1. Go to: https://supabase.com/dashboard"
echo "   2. Click on your 'customer-signal' project"
echo "   3. Go to Settings → API"
echo "   4. Copy these values:"
echo "      - Project URL: https://your-project-ref.supabase.co"
echo "      - anon/public key: eyJhbGciOiJIUzI1NiIs..."
echo "      - service_role key: eyJhbGciOiJIUzI1NiIs..."
echo ""

echo "🚀 Step 2: Deploy to Vercel"
echo "   1. Go to: https://vercel.com/dashboard"
echo "   2. Click 'New Project'"
echo "   3. Import from GitHub: https://github.com/odaialmoqa/customer-signal"
echo "   4. Choose Next.js framework preset"
echo "   5. Deploy (it will fail initially - that's expected)"
echo ""

echo "⚙️  Step 3: Add Environment Variables in Vercel"
echo "   Go to Project Settings → Environment Variables and add:"
echo ""
echo "   Essential Variables (Required):"
echo "   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
echo "   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
echo ""

echo "🔄 Step 4: Redeploy"
echo "   Trigger a new deployment in Vercel dashboard"
echo ""

echo "🧪 Step 5: Test Basic Functionality"
echo "   Visit your deployed app and test:"
echo "   - User registration/login"
echo "   - Basic navigation"
echo "   - Dashboard loading"
echo ""

print_success "Your GitHub repository is ready!"
print_status "Repository URL: https://github.com/odaialmoqa/customer-signal"
print_status "Next: Follow the steps above to deploy to Vercel"

echo ""
echo "💰 Expected costs for MVP:"
echo "   - Vercel: Free (Hobby tier)"
echo "   - Supabase: Free tier initially"
echo "   - Total: $0 to start!"
echo ""

echo "🆘 Need help? Check these files:"
echo "   - VERCEL_SUPABASE_SETUP.md - Detailed deployment guide"
echo "   - API_KEYS_GUIDE.md - How to get API keys"
echo "   - DEPLOYMENT.md - Complete deployment documentation"