#!/bin/sh

json-server --watch /app/db.json --port 3001 &
http-server /app/public -p 80 &

wait
