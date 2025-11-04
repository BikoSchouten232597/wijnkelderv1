#!/bin/sh

json-server --watch /app/db.json --host 0.0.0.0 --port 3001

wait
