#!/bin/sh
echo "[Start] Running migrations..."
node dist/migrate.js
echo "[Start] Starting server..."
node dist/index.js
