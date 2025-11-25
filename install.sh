#!/bin/bash

# Installation script for n8n-nodes-pgvector-extended
# This script handles the complete installation process

set -e  # Exit on error

echo "🚀 n8n PGVector Extended Node - Installation Script"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "  - Download from: https://nodejs.org/ (LTS version recommended)"
    echo "  - Or using Homebrew: brew install node"
    echo "  - Or using nvm: https://github.com/nvm-sh/nvm"
    echo ""
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required!"
    echo "   Current version: $(node -v)"
    echo "   Please upgrade Node.js"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo "✅ npm $(npm -v) detected"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 2: Build the project
echo "🔨 Step 2: Building the project..."
npm run build
echo "✅ Project built successfully"
echo ""

# Step 3: Link to n8n (optional)
echo "🔗 Step 3: Linking to n8n..."
echo ""
echo "Do you want to link this node to n8n? (y/n)"
read -r LINK_CHOICE

if [ "$LINK_CHOICE" = "y" ] || [ "$LINK_CHOICE" = "Y" ]; then
    echo "Creating npm link..."
    npm link
    
    echo ""
    echo "Now you need to link in your n8n custom folder:"
    echo "  cd ~/.n8n/custom"
    echo "  npm link n8n-nodes-pgvector-extended"
    echo ""
    echo "After linking, restart n8n:"
    echo "  n8n restart"
    echo ""
else
    echo "Skipping npm link. You can do it manually later:"
    echo "  npm link"
    echo "  cd ~/.n8n/custom"
    echo "  npm link n8n-nodes-pgvector-extended"
    echo ""
fi

echo "✅ Installation complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Set up PostgreSQL with pgvector (run ./scripts/setup-postgres.sh)"
echo "  2. Link to n8n if you skipped it"
echo "  3. Restart n8n"
echo "  4. Configure credentials in n8n UI"
echo ""
echo "📖 See README.md for detailed usage instructions"
