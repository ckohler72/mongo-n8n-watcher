#!/bin/bash
# Test the collections API

echo "🧪 Testing Collections API"
echo ""

# You need to replace DATABASE_ID with an actual ID from your databases
echo "To test, first get a database ID:"
echo "  curl http://localhost:3330/api/databases"
echo ""
echo "Then test collections endpoint:"
echo "  curl http://localhost:3330/api/databases/DATABASE_ID/collections"
echo ""
echo "Or with a specific database:"
echo "  curl 'http://localhost:3330/api/databases/DATABASE_ID/collections?database=magnus_db'"
