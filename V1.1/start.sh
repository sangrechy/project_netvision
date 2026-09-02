#!/bin/bash

BASE="$(cd "$(dirname "$0")" && pwd)"

cd "$BASE/backend"
npm run dev &

sleep 3

cd "$BASE/frontend"
npm run dev &

wait
