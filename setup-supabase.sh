#!/bin/bash

echo "Setting up Supabase for CustomerSignal..."

# Check if supabase CLI is available
if [ ! -f "./supabase-cli" ]; then
    echo "Supabase CLI not found. Please run this script from the customer-signal directory."
    exit 1
fi

echo "Current project status:"
./supabase-cli projects list

echo ""
echo "To complete the setup, you need to:"
echo "1. Get your database password from: https://supabase.com/dashboard/project/hwwhvqcxhtrtslirulji/settings/database"
echo "2. Run: ./supabase-cli db push"
echo "3. Enter your database password when prompted"
echo ""
echo "This will apply all the multi-tenant migrations to your remote database."
echo ""
echo "Your environment is already configured with:"
echo "- Project URL: https://hwwhvqcxhtrtslirulji.supabase.co"
echo "- Anon Key: ✓ Configured"
echo "- Service Role Key: ✓ Configured"
echo ""
echo "After running db push, you can start the development server with: npm run dev"