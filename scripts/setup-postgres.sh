#!/bin/bash

set -e

# Default values
default_host="localhost"
default_port=5432
default_database="n8n_pgvector_test"
default_user="postgres"
default_password="postgres"

echo "🚀 PostgreSQL setup for pgvector"

echo "Enter connection details (press Enter to use default values):"
read -p "Host ($default_host): " PG_HOST
PG_HOST=${PG_HOST:-$default_host}

read -p "Port ($default_port): " PG_PORT
PG_PORT=${PG_PORT:-$default_port}

read -p "Database ($default_database): " PG_DATABASE
PG_DATABASE=${PG_DATABASE:-$default_database}

read -p "User ($default_user): " PG_USER
PG_USER=${PG_USER:-$default_user}

read -s -p "Password ($default_password): " PGPASSWORD
PGPASSWORD=${PGPASSWORD:-$default_password}

echo ""

# Export PGPASSWORD for psql
export PGPASSWORD

echo "Running setup script with the following parameters:"
echo "  Host: $PG_HOST"
echo "  Port: $PG_PORT"
echo "  Database: $PG_DATABASE"
echo "  User: $PG_USER"

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
echo "  1. Configure standard 'Postgres' credentials in n8n"
echo "  2. Add the 'Postgres Vector Store Tool' to your agent workflow"
echo "  3. Test Custom SQL Query or Retrieval with RLS role"
echo ""
