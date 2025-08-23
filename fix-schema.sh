#!/bin/bash

echo "🔧 Fixing Supabase schema conflicts..."

# Apply only the fix migration
echo "Applying schema fixes..."
./supabase-cli db push --include-all=false --include-seed=false

echo ""
echo "✅ Schema fixes applied!"
echo ""
echo "Next steps:"
echo "1. Check your Supabase dashboard to verify the changes"
echo "2. Run 'npm run dev' to start the application"
echo "3. Test the multi-tenant functionality"