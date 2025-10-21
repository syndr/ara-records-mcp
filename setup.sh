#!/usr/bin/env bash
# Ara MCP Server Setup Script
# Automated dependency installation for MCP server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Initializing Ara MCP server setup..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Requires Node.js >= 18.0.0"
    echo "Please install Node.js before proceeding."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js version $NODE_VERSION detected. Requires >= 18.0.0"
    exit 1
fi

echo "✓ Node.js $(node --version) detected"
echo

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed"
    exit 1
fi

echo "✓ npm $(npm --version) detected"
echo

# Install dependencies
echo "Installing MCP server dependencies..."
cd "$SCRIPT_DIR"

if [ -f "package-lock.json" ]; then
    echo "Using package-lock.json for reproducible builds"
    npm ci
else
    echo "No package-lock.json found. Running standard install"
    npm install
fi

echo
echo "MCP server dependencies installed successfully"
echo

# Verify installation
if [ -d "node_modules/@modelcontextprotocol" ]; then
    echo "✓ @modelcontextprotocol/sdk installed correctly"
else
    echo "WARNING: MCP SDK not found in node_modules. Installation may have failed."
    exit 1
fi

echo
echo "Setup complete."
echo
echo "To verify the server works:"
echo "  node $SCRIPT_DIR/index.js"
echo
