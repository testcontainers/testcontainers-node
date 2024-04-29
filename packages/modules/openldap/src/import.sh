#!/usr/bin/env bash
set -e
# shellcheck disable=SC2046
ldapadd -x $([[ -n "$1" ]] && echo "-D $1") $([[ -n "$2" ]] && echo "-w $2") -f /tmp/import.ldif
echo "Imported"