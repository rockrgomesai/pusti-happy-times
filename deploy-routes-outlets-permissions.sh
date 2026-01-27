#!/bin/bash

# ========================================
# Routes & Outlets Permissions - Production Deployment Script
# ========================================
# This script deploys Routes & Outlets API permissions to production MongoDB
# 
# Usage on production server:
#   chmod +x deploy-routes-outlets-permissions.sh
#   ./deploy-routes-outlets-permissions.sh
# ========================================

echo "========================================"
echo "Routes & Outlets - Production Deployment"
echo "========================================"
echo ""

# MongoDB connection details (update these for your production setup)
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-pusti_happy_times}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASS="${MONGO_PASS:-your_production_password}"

# Script location
SCRIPT_PATH="backend/scripts/add-routes-outlets-permissions.js"

echo "📋 Deployment Details:"
echo "  Database: $MONGO_DB"
echo "  Host: $MONGO_HOST:$MONGO_PORT"
echo "  User: $MONGO_USER"
echo ""
read -p "Continue with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Deploying permissions..."
echo ""

# Run the permissions script
mongosh "mongodb://$MONGO_USER:$MONGO_PASS@$MONGO_HOST:$MONGO_PORT/$MONGO_DB?authSource=admin" \
    --file "$SCRIPT_PATH"

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "========================================"
    echo "✅ Deployment completed successfully!"
    echo "========================================"
    echo ""
    echo "Next steps:"
    echo "  1. Test the Routes & Outlets modules"
    echo "  2. Verify permissions for all roles"
    echo ""
else
    echo "========================================"
    echo "❌ Deployment failed with exit code: $EXIT_CODE"
    echo "========================================"
    exit $EXIT_CODE
fi
