#!/bin/bash

# Cleanup script - Delete all avatars from Partnership Backend
# Run this after deployment completes

ADMIN_SECRET="${ADMIN_SECRET:-admin}"
API_URL="${API_URL:-https://moneo.up.railway.app/api/partnership/admin/avatars/delete-all}"

echo "🗑️  Deleting all avatars..."
echo "API URL: $API_URL"

RESPONSE=$(curl -s -X DELETE "$API_URL" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Content-Type: application/json")

echo ""
echo "Response:"
echo "$RESPONSE"

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    DELETED_COUNT=$(echo "$RESPONSE" | grep -o '"deletedCount":[0-9]*' | grep -o '[0-9]*')
    echo ""
    echo "✅ Successfully deleted $DELETED_COUNT avatars!"
else
    echo ""
    echo "❌ Failed to delete avatars"
    exit 1
fi
