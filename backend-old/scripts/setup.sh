#!/bin/bash

# Create necessary directories
mkdir -p public

# Copy favicon if it doesn't exist
if [ ! -f public/favicon_grey.ico ]; then
  cp ../frontend/public/favicon_grey.ico public/
fi

# Ensure proper permissions
chmod 644 public/favicon_grey.ico 