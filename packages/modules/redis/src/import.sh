#!/usr/bin/env bash
set -e
redis-cli $([[ -n "$1" ]] && echo "-a $1") < "/tmp/import.redis"
echo "Imported"