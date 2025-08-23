-- Cleanup script - ONLY run this if you want to start completely fresh
-- WARNING: This will delete all existing data

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS keywords CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS alert_priority CASCADE;
DROP TYPE IF EXISTS integration_status CASCADE;
DROP TYPE IF EXISTS integration_type CASCADE;
DROP TYPE IF EXISTS sentiment_type CASCADE;
DROP TYPE IF EXISTS platform_type CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;