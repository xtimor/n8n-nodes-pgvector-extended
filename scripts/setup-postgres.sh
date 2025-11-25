#!/bin/bash

# PostgreSQL setup helper script
# This script runs the PostgreSQL setup SQL file

set -e

echo "🐘 PostgreSQL Setup for n8n PGVector Extended"
echo "=============================================="
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ psql (PostgreSQL client) is not installed!"
    echo ""
    echo "Please install PostgreSQL client:"
    echo "  - macOS: brew install postgresql"
    echo "  - Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo ""
    exit 1
fi

echo "✅ psql found"
echo ""

# Get database connection details
echo "Please provide PostgreSQL connection details:"
echo ""

read -p "Host (default: localhost): " PG_HOST
PG_HOST=${PG_HOST:-localhost}

read -p "Port (default: 5432): " PG_PORT
PG_PORT=${PG_PORT:-5432}

read -p "Admin user (default: postgres): " PG_USER
PG_USER=${PG_USER:-postgres}

read -p "Database to create (default: n8n_pgvector_test): " PG_DATABASE
PG_DATABASE=${PG_DATABASE:-n8n_pgvector_test}

echo ""
echo "📋 Configuration:"
echo "  Host: $PG_HOST"
echo "  Port: $PG_PORT"
echo "  User: $PG_USER"
echo "  Database: $PG_DATABASE"
echo ""

read -p "Proceed with setup? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 0
fi

echo ""
echo "🔧 Running setup script..."
echo ""

# Check if database exists, create if not
DB_EXISTS=$(PGPASSWORD=$PGPASSWORD psql -h $PG_HOST -p $PG_PORT -U $PG_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DATABASE'" 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
    echo "⚠️  Database '$PG_DATABASE' already exists"
    read -p "Do you want to continue? This will modify the existing database. (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 0
    fi
else
    echo "📦 Creating database '$PG_DATABASE'..."
    PGPASSWORD=$PGPASSWORD psql -h $PG_HOST -p $PG_PORT -U $PG_USER -c "CREATE DATABASE $PG_DATABASE;"
fi

echo ""
echo "🚀 Running setup SQL script..."
echo ""

# Run the setup script
PGPASSWORD=$PGPASSWORD psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DATABASE -f scripts/setup-postgres.sql

echo ""
echo "✅ PostgreSQL setup complete!"
echo ""
echo "📝 Connection details for n8n:"
echo "  Host: $PG_HOST"
echo "  Port: $PG_PORT"
echo "  Database: $PG_DATABASE"
echo "  User: $PG_USER (or test_user1/test_user2 for RLS testing)"
echo ""
echo "🔐 Test users:"
echo "  - test_user1 / test_password1"
echo "  - test_user2 / test_password2"
echo ""
echo "💡 Next steps:"
echo "  1. Configure 'Postgres Extended' credentials in n8n"
echo "  2. Add the 'Postgres Vector Store Tool' node to a workflow"
echo "  3. Test Custom SQL Query operation"
echo "  4. Test RLS by setting different roles"
echo ""
