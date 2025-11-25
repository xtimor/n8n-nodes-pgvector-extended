-- PostgreSQL Setup Script for n8n PGVector Extended Node
-- This script sets up a test database with pgvector and RLS

-- ============================================
-- Part 1: Database and Extension Setup
-- ============================================

-- Create test database (run this as postgres superuser)
-- If database exists, connect to it instead
CREATE DATABASE n8n_pgvector_test;

-- Connect to the database
\c n8n_pgvector_test;

-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- ============================================
-- Part 2: Create Tables
-- ============================================

-- Create main vectors table
CREATE TABLE IF NOT EXISTS n8n_vectors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    embedding vector(1536),  -- Adjust dimensions based on your embedding model
    text text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS n8n_vectors_embedding_idx 
ON n8n_vectors 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS n8n_vectors_metadata_idx 
ON n8n_vectors 
USING gin (metadata);

-- ============================================
-- Part 3: Row Level Security (RLS) Setup
-- ============================================

-- Enable RLS on the table
ALTER TABLE n8n_vectors ENABLE ROW LEVEL SECURITY;

-- Create test users/roles
CREATE ROLE test_user1 LOGIN PASSWORD 'test_password1';
CREATE ROLE test_user2 LOGIN PASSWORD 'test_password2';
CREATE ROLE app_role NOLOGIN;  -- Generic application role

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO test_user1, test_user2, app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON n8n_vectors TO test_user1, test_user2, app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO test_user1, test_user2, app_role;

-- ============================================
-- Part 4: RLS Policies
-- ============================================

-- Policy for test_user1: can only see documents where metadata.owner = 'user1'
CREATE POLICY user1_select_policy ON n8n_vectors
    FOR SELECT
    TO test_user1
    USING (metadata->>'owner' = 'user1');

CREATE POLICY user1_insert_policy ON n8n_vectors
    FOR INSERT
    TO test_user1
    WITH CHECK (metadata->>'owner' = 'user1');

CREATE POLICY user1_update_policy ON n8n_vectors
    FOR UPDATE
    TO test_user1
    USING (metadata->>'owner' = 'user1')
    WITH CHECK (metadata->>'owner' = 'user1');

CREATE POLICY user1_delete_policy ON n8n_vectors
    FOR DELETE
    TO test_user1
    USING (metadata->>'owner' = 'user1');

-- Policy for test_user2: can only see documents where metadata.owner = 'user2'
CREATE POLICY user2_select_policy ON n8n_vectors
    FOR SELECT
    TO test_user2
    USING (metadata->>'owner' = 'user2');

CREATE POLICY user2_insert_policy ON n8n_vectors
    FOR INSERT
    TO test_user2
    WITH CHECK (metadata->>'owner' = 'user2');

CREATE POLICY user2_update_policy ON n8n_vectors
    FOR UPDATE
    TO test_user2
    USING (metadata->>'owner' = 'user2')
    WITH CHECK (metadata->>'owner' = 'user2');

CREATE POLICY user2_delete_policy ON n8n_vectors
    FOR DELETE
    TO test_user2
    USING (metadata->>'owner' = 'user2');

-- Generic app_role policy using runtime parameter
CREATE POLICY app_role_policy ON n8n_vectors
    FOR ALL
    TO app_role
    USING (
        metadata->>'tenant_id' = current_setting('app.current_tenant', true)
        OR current_setting('app.current_tenant', true) IS NULL
    );

-- ============================================
-- Part 5: Insert Test Data
-- ============================================

-- Insert test data for user1
INSERT INTO n8n_vectors (text, metadata) VALUES
    ('Document 1 for user1', '{"owner": "user1", "category": "test"}'),
    ('Document 2 for user1', '{"owner": "user1", "category": "demo"}'),
    ('Document 3 for user1', '{"owner": "user1", "category": "test"}');

-- Insert test data for user2
INSERT INTO n8n_vectors (text, metadata) VALUES
    ('Document 1 for user2', '{"owner": "user2", "category": "test"}'),
    ('Document 2 for user2', '{"owner": "user2", "category": "production"}');

-- Insert shared data (will not be visible to test_user1 or test_user2 due to RLS)
INSERT INTO n8n_vectors (text, metadata) VALUES
    ('Shared document', '{"owner": "admin", "category": "shared"}');

-- ============================================
-- Part 6: Verification Queries
-- ============================================

-- Check total records (as superuser)
SELECT COUNT(*) as total_records FROM n8n_vectors;

-- Test RLS (you would run these from a connection as test_user1)
-- SET ROLE test_user1;
-- SELECT * FROM n8n_vectors;  -- Should only see 3 documents
-- RESET ROLE;

-- ============================================
-- Part 7: Helper Functions
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_n8n_vectors_updated_at 
    BEFORE UPDATE ON n8n_vectors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Setup Complete!
-- ============================================

\echo ''
\echo '✅ PostgreSQL setup complete!'
\echo ''
\echo 'Database: n8n_pgvector_test'
\echo 'Table: n8n_vectors'
\echo ''
\echo 'Test users created:'
\echo '  - test_user1 / test_password1 (can only see owner=user1)'
\echo '  - test_user2 / test_password2 (can only see owner=user2)'
\echo ''
\echo 'Sample data inserted:'
\echo '  - 3 documents for user1'
\echo '  - 2 documents for user2'
\echo '  - 1 shared document (not visible to test users)'
\echo ''
\echo 'Next steps:'
\echo '  1. Configure n8n credentials with this database'
\echo '  2. Test RLS by setting "RLS Role" to test_user1 or test_user2'
\echo '  3. Try custom SQL queries'
\echo ''
