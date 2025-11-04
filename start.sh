#!/bin/sh

# Start nginx in background
nginx

# Start json-server
json-server --watch /usr/src/app/db.json --host 0.0.0.0 --port 3001
