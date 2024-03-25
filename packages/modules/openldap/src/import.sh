#!/usr/bin/env bash
set -e
ldapadd $([[ -n "$1" ]] && echo "-a $1") < "/tmp/import.ldif"
echo "Imported"